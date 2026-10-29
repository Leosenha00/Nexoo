import datetime
import hashlib
import unittest
from validate_profiles import validate

class ProfileValidationTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime.datetime(2026, 10, 29)
        self.identity = hashlib.sha1(b'fixture-certificate').hexdigest()
        self.profile = {
            'UUID': 'fixture', 'Name': 'fixture', 'TeamIdentifier': ['TEAM'],
            'ExpirationDate': self.now + datetime.timedelta(days=1),
            'DeveloperCertificates': [b'fixture-certificate'],
            'ProvisionedDevices': ['fixture-device'],
            'Entitlements': {'application-identifier': 'TEAM.com.example.app',
                             'com.apple.developer.team-identifier': 'TEAM', 'get-task-allow': True}
        }
    def check_profile(self):
        validate(self.profile, 'com.example.app', 'TEAM', self.identity, 'debugging', self.now)
    def test_accepts_matching_profile(self): self.check_profile()
    def test_rejects_expired_profile(self):
        self.profile['ExpirationDate'] = self.now
        with self.assertRaisesRegex(ValueError, 'expired'): self.check_profile()
    def test_rejects_wrong_extension_bundle(self):
        self.profile['Entitlements']['application-identifier'] += '.broadcast'
        with self.assertRaisesRegex(ValueError, 'Bundle ID'): self.check_profile()
    def test_rejects_wrong_certificate(self):
        self.profile['DeveloperCertificates'] = [b'other']
        with self.assertRaisesRegex(ValueError, 'certificate'): self.check_profile()
    def test_rejects_profile_without_device(self):
        self.profile.pop('ProvisionedDevices')
        with self.assertRaisesRegex(ValueError, 'registered device'): self.check_profile()
    def test_rejects_wrong_export_method(self):
        self.profile['Entitlements']['get-task-allow'] = False
        with self.assertRaisesRegex(ValueError, 'development profile'): self.check_profile()

if __name__ == '__main__': unittest.main()
