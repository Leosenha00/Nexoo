#!/bin/bash
set -euo pipefail
# Secrets are environment values, never shell command text or repository files.
for required in APPLE_CERTIFICATE_P12_BASE64 APPLE_CERTIFICATE_PASSWORD APPLE_APP_PROFILE_BASE64 APPLE_BROADCAST_PROFILE_BASE64; do
  if [[ -z "${!required:-}" ]]; then
    echo "::error::Missing signing secret: $required. No signed IPA can be produced."
    exit 1
  fi
done
mkdir -p "$SIGNING_DIR"
python3 - <<'PY'
import base64, os
from pathlib import Path
root = Path(os.environ['SIGNING_DIR'])
for variable, filename in [('APPLE_CERTIFICATE_P12_BASE64','certificate.p12'),('APPLE_APP_PROFILE_BASE64','app.mobileprovision'),('APPLE_BROADCAST_PROFILE_BASE64','broadcast.mobileprovision')]:
    (root / filename).write_bytes(base64.b64decode(os.environ[variable], validate=True))
PY
KEYCHAIN_PASSWORD=$(openssl rand -hex 24)
security create-keychain -p "$KEYCHAIN_PASSWORD" "$SIGNING_DIR/signing.keychain-db"
security set-keychain-settings -lut 21600 "$SIGNING_DIR/signing.keychain-db"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$SIGNING_DIR/signing.keychain-db"
security import "$SIGNING_DIR/certificate.p12" -P "$APPLE_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k "$SIGNING_DIR/signing.keychain-db" >/dev/null
security set-key-partition-list -S apple-tool:,apple: -k "$KEYCHAIN_PASSWORD" "$SIGNING_DIR/signing.keychain-db" >/dev/null
security list-keychains -d user -s "$SIGNING_DIR/signing.keychain-db" login.keychain-db
IDENTITY=$(security find-identity -v -p codesigning "$SIGNING_DIR/signing.keychain-db" | sed -nE 's/.* ([A-F0-9]{40}) .*/\1/p' | head -1)
if [[ -z "$IDENTITY" ]]; then
  echo '::error::No valid Apple codesigning identity with a private key was found.'
  exit 1
fi
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
for target in app broadcast; do
  security cms -D -i "$SIGNING_DIR/$target.mobileprovision" > "$SIGNING_DIR/$target.plist"
done
python3 ios/scripts/validate_profiles.py "$SIGNING_DIR" "$NEXOO_BUNDLE_ID" "$APPLE_TEAM_ID" "$IDENTITY" "$EXPORT_METHOD"
python3 - <<'PY'
import os, plistlib, shutil
from pathlib import Path
root = Path(os.environ['SIGNING_DIR'])
for target in ('app', 'broadcast'):
    p = plistlib.loads((root / f'{target}.plist').read_bytes())
    shutil.copy(root / f'{target}.mobileprovision', Path.home() / 'Library/MobileDevice/Provisioning Profiles' / (p['UUID'] + '.mobileprovision'))
PY
