import Foundation

@MainActor
final class DOMARClient: ObservableObject {
    @Published private(set) var state: DOMARState?
    @Published private(set) var connectionState = "DISCONNECTED"
    @Published private(set) var lastError: String?

    private var streamTask: Task<Void, Never>?
    private var baseURL: URL?

    func configure(baseURLString: String) throws {
        guard let url = URL(string: baseURLString), let scheme = url.scheme?.lowercased() else {
            throw URLError(.badURL)
        }
        let isLocal = url.host == "localhost" || url.host == "127.0.0.1"
        guard scheme == "https" || (scheme == "http" && isLocal) else {
            throw URLError(.secureConnectionFailed)
        }
        baseURL = url
    }

    func start() {
        stop()
        guard let baseURL else {
            connectionState = "BROKER NOT CONFIGURED"
            return
        }
        streamTask = Task { [weak self] in
            guard let self else { return }
            await self.loadSnapshot(baseURL: baseURL)
            while !Task.isCancelled {
                await self.consumeStream(baseURL: baseURL)
                if Task.isCancelled { break }
                self.connectionState = "RECONNECTING"
                try? await Task.sleep(nanoseconds: 2_000_000_000)
            }
        }
    }

    func stop() {
        streamTask?.cancel()
        streamTask = nil
        connectionState = "DISCONNECTED"
    }

    private func loadSnapshot(baseURL: URL) async {
        do {
            let url = baseURL.appendingPathComponent("v1/ar/state")
            var request = URLRequest(url: url)
            request.cachePolicy = .reloadIgnoringLocalCacheData
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw URLError(.badServerResponse)
            }
            let decoded = try JSONDecoder().decode(DOMARState.self, from: data)
            guard decoded.schema == "dom.apple-ar.state.v1" else { throw URLError(.cannotParseResponse) }
            state = decoded
            connectionState = "LIVE"
            lastError = nil
        } catch {
            connectionState = "SNAPSHOT ERROR"
            lastError = error.localizedDescription
        }
    }

    private func consumeStream(baseURL: URL) async {
        do {
            let url = baseURL.appendingPathComponent("v1/ar/stream")
            var request = URLRequest(url: url)
            request.cachePolicy = .reloadIgnoringLocalCacheData
            request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
            let (bytes, response) = try await URLSession.shared.bytes(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw URLError(.badServerResponse)
            }
            connectionState = "LIVE"
            var dataLines: [String] = []
            for try await line in bytes.lines {
                if Task.isCancelled { return }
                if line.isEmpty {
                    if !dataLines.isEmpty {
                        let payload = dataLines.joined(separator: "\n")
                        if let data = payload.data(using: .utf8),
                           let decoded = try? JSONDecoder().decode(DOMARState.self, from: data),
                           decoded.schema == "dom.apple-ar.state.v1",
                           decoded.version >= (state?.version ?? -1) {
                            state = decoded
                            connectionState = "LIVE"
                            lastError = nil
                        }
                    }
                    dataLines.removeAll(keepingCapacity: true)
                    continue
                }
                if line.hasPrefix("data:") {
                    dataLines.append(String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces))
                }
            }
        } catch {
            if Task.isCancelled { return }
            connectionState = "STREAM ERROR"
            lastError = error.localizedDescription
        }
    }
}
