import Foundation

/// No secrets belong in this configuration; sessions will use Keychain.
enum AppConfiguration {
    static func serverURL(bundle: Bundle = .main) -> URL? {
        validatedServerURL(bundle.object(forInfoDictionaryKey: "NexooServerURL") as? String)
    }

    static func validatedServerURL(_ value: String?) -> URL? {
        guard let value, let url = URL(string: value),
              url.scheme == "https", let host = url.host, !host.isEmpty,
              url.user == nil, url.password == nil,
              url.query == nil, url.fragment == nil else { return nil }
        return url
    }
}
