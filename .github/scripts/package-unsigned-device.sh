#!/bin/bash
set -euo pipefail
APP="$RUNNER_TEMP/NexooDevice/Build/Products/Release-iphoneos/Nexoo.app"
STAGING="$RUNNER_TEMP/NexooUnsignedPackage"
mkdir -p "$STAGING/Payload" "$GITHUB_WORKSPACE/unsigned-output"
cp -R "$APP" "$STAGING/Payload/"
APP="$STAGING/Payload/Nexoo.app"
EXT="$APP/PlugIns/NexooBroadcast.appex"
for bundle in "$APP" "$EXT"; do
  test -d "$bundle"
  EXECUTABLE=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$bundle/Info.plist")
  PLATFORM=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleSupportedPlatforms:0' "$bundle/Info.plist")
  test "$PLATFORM" = iPhoneOS
  test -x "$bundle/$EXECUTABLE"
  xcrun lipo -archs "$bundle/$EXECUTABLE" | tee -a unsigned-output/device-validation.log
  xcrun lipo -verify_arch arm64 "$bundle/$EXECUTABLE"
  xcrun vtool -show-build "$bundle/$EXECUTABLE" > "$RUNNER_TEMP/nexoo-mach-o-platform.txt"
  cat "$RUNNER_TEMP/nexoo-mach-o-platform.txt" >> unsigned-output/device-validation.log
  python3 - "$RUNNER_TEMP/nexoo-mach-o-platform.txt" <<'PY'
import pathlib, re, sys
text = pathlib.Path(sys.argv[1]).read_text()
assert re.search(r'^\s*platform IOS\s*$', text, re.MULTILINE), 'Binary is not an iOS device binary'
assert 'IOSSIMULATOR' not in text, 'Simulator binary must not be packaged as an iPhone IPA'
PY
done
# External signing tools must sign all executable bundles, including the extension/frameworks.
while IFS= read -r -d '' bundle; do
  if codesign -d "$bundle" >/dev/null 2>&1; then
    codesign --remove-signature "$bundle"
  fi
done < <(find "$APP" -depth -type d \( -name '*.framework' -o -name '*.appex' -o -name '*.app' \) -print0)
find "$APP" -name embedded.mobileprovision -delete
(
  cd "$STAGING"
  ditto -c -k --keepParent Payload "$GITHUB_WORKSPACE/unsigned-output/Nexoo-resign-required.ipa"
)
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile
p = Path('unsigned-output/Nexoo-resign-required.ipa')
with ZipFile(p) as archive:
    assert archive.testzip() is None, 'Corrupt IPA ZIP'
    names = archive.namelist()
    for file in ('Payload/Nexoo.app/Nexoo', 'Payload/Nexoo.app/PlugIns/NexooBroadcast.appex/NexooBroadcast'):
        assert file in names, f'Missing executable: {file}'
    assert not any(n.endswith('embedded.mobileprovision') for n in names), 'Unexpected provisioning profile'
print('Device IPA structure validated; Apple signing and physical installation NOT validated.')
PY
cat > unsigned-output/READ-ME.txt <<'NOTE'
NEXOO — IPA DE IPHONE PARA ASSINAR DEPOIS

Este pacote contém binários Release iphoneos/arm64 reais, incluindo a extensão.
NÃO está assinado e NÃO é diretamente instalável no iPhone.
Importe em uma ferramenta de assinatura já instalada e configurada (por exemplo,
SideStore/AltStore Classic, quando compatíveis com sua conta/dispositivo).
A ferramenta precisa assinar o app, a extensão ReplayKit e frameworks e obter
perfis válidos para os IDs e capabilities utilizados. O Safari não faz isso.
A instalação/compatibilidade com essas ferramentas ainda NÃO foi testada.
ReplayKit publishing continua indisponível nesta versão; o IPA não resolve isso.
Consulte docs/IOS_INSTALLATION.md e ios/VALIDATION.md no repositório.
NOTE
(cd unsigned-output && shasum -a 256 Nexoo-resign-required.ipa > SHA256.txt)
