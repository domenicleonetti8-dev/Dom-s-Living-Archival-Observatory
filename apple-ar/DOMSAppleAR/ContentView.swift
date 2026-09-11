import SwiftUI

struct ContentView: View {
    @StateObject private var client = DOMARClient()
    @AppStorage("domBrokerURL") private var brokerURL = ""
    @State private var showSources = false

    var body: some View {
        ZStack(alignment: .top) {
            ARGlobeView(state: client.state)
                .ignoresSafeArea()

            VStack(spacing: 10) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("D.O.M. APPLE AR")
                            .font(.caption.bold())
                        Text(client.connectionState)
                            .font(.caption2.monospaced())
                    }
                    Spacer()
                    if let coverage = client.state?.coverage {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(coverage.locatedRecords) LOCATED")
                            Text("\(coverage.activeSourceFamilies)/\(coverage.registeredSourceFamilies) SOURCES LIVE")
                        }
                        .font(.caption2.monospaced())
                    }
                }

                HStack(spacing: 8) {
                    TextField("https://your-dom-broker.example", text: $brokerURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .font(.caption.monospaced())
                        .padding(9)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                    Button("Connect") { connect() }
                        .buttonStyle(.borderedProminent)
                }

                if let error = client.lastError, !error.isEmpty {
                    Text(error)
                        .font(.caption2)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if let state = client.state {
                    HStack(spacing: 12) {
                        metric("OBJECTS", state.coverage.records)
                        metric("UNLOCATED", state.coverage.unlocatedRecords)
                        metric("STALE", state.coverage.staleSourceFamilies)
                        metric("SAT LAYERS", state.coverage.satelliteLayerFamilies)
                    }
                    Button(showSources ? "Hide network truth" : "Show network truth") {
                        showSources.toggle()
                    }
                    .font(.caption)

                    if showSources {
                        ScrollView {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(state.truth.allSensorsMeaning).font(.caption2)
                                Divider()
                                ForEach(state.sourceHealth) { source in
                                    HStack {
                                        Text(source.id).font(.caption2.monospaced())
                                        Spacer()
                                        Text(source.status.uppercased())
                                            .font(.caption2.bold())
                                            .foregroundStyle(source.status == "active" ? .green : source.status == "error" ? .red : .secondary)
                                    }
                                }
                                Divider()
                                Text("Satellite / EO evidence layers").font(.caption.bold())
                                ForEach(state.satelliteLayers) { layer in
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(layer.name).font(.caption2.bold())
                                        Text("\(layer.agency) · \(layer.coverage) · \(layer.timeClass)")
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                        .frame(maxHeight: 250)
                    }
                }
            }
            .padding(12)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18))
            .padding(.horizontal, 10)
            .padding(.top, 8)
        }
        .onAppear {
            if !brokerURL.isEmpty { connect() }
        }
        .onDisappear { client.stop() }
    }

    private func metric(_ label: String, _ value: Int) -> some View {
        VStack(spacing: 1) {
            Text("\(value)").font(.caption.bold().monospacedDigit())
            Text(label).font(.system(size: 8, weight: .medium, design: .monospaced))
        }
        .frame(maxWidth: .infinity)
    }

    private func connect() {
        do {
            try client.configure(baseURLString: brokerURL.trimmingCharacters(in: .whitespacesAndNewlines))
            client.start()
        } catch {
            client.stop()
        }
    }
}
