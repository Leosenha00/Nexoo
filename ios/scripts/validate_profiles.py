"""Validate decoded Apple profiles against the installed signing identity.

Usage: validate_profiles.py DIRECTORY BUNDLE_ID TEAM_ID SHA1 EXPORT_METHOD
Never print profile contents, device identifiers, certificates or private keys.
"""
import datetime
import hashlib
import plistlib
import re
import sys
from pathlib import Path


def validate(profile, bundle, team, identity, method, now):
    entitlements = profile.get('Entitlements', {})
    if profile.get('ExpirationDate', datetime.datetime.min) <= now:
        raise ValueError('Provisioning profile expired')
    if profile.get('TeamIdentifier') != [team]:
        raise ValueError('Profile team does not match selected team')
    # Explicit IDs only: extension and app must each have their own profile.
    if entitlements.get('application-identifier') != f'{team}.{bundle}':
        raise ValueError('Profile application-identifier does not match Bundle ID')
    if entitlements.get('com.apple.developer.team-identifier') != team:
        raise ValueError('Profile entitlement team mismatch')
    certificates = profile.get('DeveloperCertificates', [])
    if not any(hashlib.sha1(c).hexdigest().upper() == identity.upper() for c in certificates):
        raise ValueError('Profile does not authorize the installed signing certificate')
    development = entitlements.get('get-task-allow', False)
    if method == 'debugging' and not development:
        raise ValueError('Debugging export requires a development profile')
    if method == 'release-testing' and development:
        raise ValueError('Release-testing export requires a distribution profile')
    if not profile.get('ProvisionedDevices'):
        raise ValueError('Device export requires registered device IDs in both profiles')
    if not profile.get('UUID') or not profile.get('Name'):
        raise ValueError('Profile UUID/Name missing')


def main():
    directory, bundle, team, identity, method = sys.argv[1:]
    if not re.fullmatch(r"[A-Za-z0-9.-]+", bundle) or not re.fullmatch(r"[A-Z0-9]{10}", team):
        raise ValueError("Invalid bundle/team identifier format")
    root = Path(directory)
    profiles = []
    for filename, identifier in [('app', bundle), ('broadcast', bundle + '.broadcast')]:
        profile = plistlib.loads((root / f'{filename}.plist').read_bytes())
        validate(profile, identifier, team, identity, method, datetime.datetime.utcnow())
        profiles.append(profile)
    if set(profiles[0]['ProvisionedDevices']) != set(profiles[1]['ProvisionedDevices']):
        raise ValueError('App and extension profiles must authorize the same devices')
    mappings = {bundle: profiles[0]['UUID'], bundle + '.broadcast': profiles[1]['UUID']}
    # xcconfig supports distinct profiles per target via target-specific build settings.
    (root / 'Signing.xcconfig').write_text(
        f'DEVELOPMENT_TEAM = {team}\nCODE_SIGN_STYLE = Manual\n'
        f'CODE_SIGN_IDENTITY = {identity}\n'
        f'NEXOO_APP_PROFILE = {profiles[0]["UUID"]}\n'
        f'NEXOO_BROADCAST_PROFILE = {profiles[1]["UUID"]}\n'
    )
    with (root / 'ExportOptions.plist').open('wb') as output:
        plistlib.dump({'method': method, 'teamID': team, 'signingStyle': 'manual',
                      'signingCertificate': identity, 'provisioningProfiles': mappings}, output)
    print('Validated app and broadcast profiles: team, explicit IDs, certificate, expiry and device coverage.')


if __name__ == '__main__':
    main()
