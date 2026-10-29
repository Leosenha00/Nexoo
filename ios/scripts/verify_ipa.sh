#!/bin/bash
set -euo pipefail
IPA=$(find "$SIGNING_DIR/export" -maxdepth 1 -name '*.ipa' -print -quit)
test -n "$IPA" || { echo '::error::No IPA exported'; exit 1; }
mkdir -p "$SIGNING_DIR/verify"
unzip -q "$IPA" -d "$SIGNING_DIR/verify"
APP="$SIGNING_DIR/verify/Payload/Nexoo.app"
EXT="$APP/PlugIns/NexooBroadcast.appex"
for target in "$APP" "$EXT"; do
  test -d "$target"
  codesign --verify --deep --strict --verbose=2 "$target"
  codesign -d --entitlements :- "$target" > "$SIGNING_DIR/actual-entitlements.plist" 2>/dev/null
  security cms -D -i "$target/embedded.mobileprovision" > "$SIGNING_DIR/embedded.plist"
  TARGET_PATH="$target" python3 - <<'PY'
import datetime, os, plistlib
from pathlib import Path
root = Path(os.environ['SIGNING_DIR'])
target = Path(os.environ['TARGET_PATH'])
info = plistlib.loads((target / 'Info.plist').read_bytes())
actual = plistlib.loads((root / 'actual-entitlements.plist').read_bytes())
profile = plistlib.loads((root / 'embedded.plist').read_bytes())
team = os.environ['APPLE_TEAM_ID']
bundle = os.environ['NEXOO_BUNDLE_ID'] + ('.broadcast' if target.suffix == '.appex' else '')
assert info['CFBundleIdentifier'] == bundle, 'Signed Bundle ID mismatch'
assert actual['application-identifier'] == team + '.' + bundle, 'Signature application ID mismatch'
assert actual['com.apple.developer.team-identifier'] == team, 'Signature team mismatch'
assert profile['ExpirationDate'] > datetime.datetime.utcnow(), 'Embedded profile expired'
for entitlement in ('com.apple.security.application-groups', 'keychain-access-groups'):
    for value in actual.get(entitlement, []):
        allowed = profile['Entitlements'].get(entitlement, [])
        assert value in allowed or any(v.endswith('*') and value.startswith(v[:-1]) for v in allowed), 'Unauthorized entitlement'
PY
done
mkdir -p ios/signed-output
cp "$IPA" ios/signed-output/
echo 'Signature and embedded profiles verified for app and ReplayKit extension. Physical installation is not tested.'
