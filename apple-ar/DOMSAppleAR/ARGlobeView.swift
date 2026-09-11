import SwiftUI
import RealityKit
import ARKit
import UIKit

struct ARGlobeView: UIViewRepresentable {
    let state: DOMARState?
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> ARView {
        let view = ARView(frame: .zero)
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]
        config.environmentTexturing = .automatic
        view.session.run(config)
        context.coordinator.install(in: view)
        return view
    }

    func updateUIView(_ view: ARView, context: Context) { context.coordinator.update(state: state) }
    static func dismantleUIView(_ uiView: ARView, coordinator: Coordinator) {
        coordinator.stopAnimating()
        uiView.session.pause()
    }

    final class Coordinator {
        private enum PulseMode {
            case high, medium, low, steady

            var period: TimeInterval {
                switch self {
                case .high: return 0.62
                case .medium: return 1.15
                case .low: return 2.0
                case .steady: return 1.0
                }
            }

            var amplitude: Float {
                switch self {
                case .high: return 0.95
                case .medium: return 0.58
                case .low: return 0.28
                case .steady: return 0.10
                }
            }

            var minimumGlow: Float {
                switch self {
                case .high: return 1.25
                case .medium: return 1.18
                case .low: return 1.12
                case .steady: return 1.10
                }
            }
        }

        private struct PulseNode {
            let root: Entity
            let halo: ModelEntity
            let mode: PulseMode
            let expiresAt: Date?
            let status: String
        }

        private let radius: Float = 0.18
        private let anchor = AnchorEntity(world: SIMD3<Float>(0, 0, -0.65))
        private let globe = ModelEntity(mesh: .generateSphere(radius: 0.18), materials: [SimpleMaterial(color: UIColor(red: 0.03, green: 0.16, blue: 0.31, alpha: 0.88), roughness: 0.72, isMetallic: false)])
        private let markerRoot = Entity()
        private var renderedVersion = -1
        private var pulseNodes: [PulseNode] = []
        private var timer: Timer?
        private let iso = ISO8601DateFormatter()
        private let inactiveStatuses: Set<String> = ["cancelled", "canceled", "expired", "ended", "inactive", "closed", "resolved"]

        func install(in view: ARView) {
            globe.name = "DOM Earth"
            globe.generateCollisionShapes(recursive: false)
            globe.addChild(markerRoot)
            anchor.addChild(globe)
            view.scene.addAnchor(anchor)
            view.installGestures([.rotation, .scale, .translation], for: globe)
            startAnimating()
        }

        func stopAnimating() {
            timer?.invalidate()
            timer = nil
        }

        private func startAnimating() {
            guard timer == nil else { return }
            timer = Timer.scheduledTimer(withTimeInterval: 1.0 / 20.0, repeats: true) { [weak self] _ in
                self?.animateRiskField()
            }
            RunLoop.main.add(timer!, forMode: .common)
        }

        func update(state: DOMARState?) {
            guard let state, state.version != renderedVersion else { return }
            renderedVersion = state.version
            markerRoot.children.removeAll()
            pulseNodes.removeAll(keepingCapacity: true)

            for object in state.objects.filter(\.isLocated).prefix(8000) {
                guard let lat = object.lat, let lon = object.lon else { continue }
                let marker = makeMarker(for: object)
                marker.root.position = spherePosition(lat: lat, lon: lon, radius: radius + markerAltitude(for: object))
                markerRoot.addChild(marker.root)
                pulseNodes.append(marker.node)
            }
        }

        private func markerAltitude(for object: DOMARObject) -> Float {
            if let elevation = object.elevationM, elevation > 0 { return min(0.018, Float(elevation / 10_000_000.0)) }
            if object.role == "satellite-observation" { return 0.022 }
            return 0.004
        }

        private func makeMarker(for object: DOMARObject) -> (root: Entity, node: PulseNode) {
            let root = Entity()
            let markerRadius: Float = object.role == "event" ? (object.officialAlert ? 0.0044 : 0.0037) : object.role == "satellite-observation" ? 0.0032 : 0.0025
            let color = markerColor(for: object)

            let core = ModelEntity(mesh: .generateSphere(radius: markerRadius), materials: [SimpleMaterial(color: color, roughness: 0.30, isMetallic: true)])
            let haloColor = color.withAlphaComponent(object.officialAlert ? 0.52 : 0.34)
            let halo = ModelEntity(mesh: .generateSphere(radius: markerRadius * 1.75), materials: [UnlitMaterial(color: haloColor)])
            halo.scale = SIMD3<Float>(repeating: 1.10)

            root.name = "\(object.role)|\(object.id)|\(object.title)"
            root.addChild(halo)
            root.addChild(core)
            root.generateCollisionShapes(recursive: false)

            let node = PulseNode(
                root: root,
                halo: halo,
                mode: pulseMode(for: object),
                expiresAt: parseDate(object.expiresAt),
                status: object.observationStatus.lowercased()
            )
            return (root, node)
        }

        private func pulseMode(for object: DOMARObject) -> PulseMode {
            if object.officialAlert { return .high }
            switch object.activation.id {
            case "critical", "heavy": return .high
            case "elevated": return .medium
            case "active", "watching": return .low
            default: return .steady
            }
        }

        private func animateRiskField() {
            let now = Date()
            let t = now.timeIntervalSinceReferenceDate
            for node in pulseNodes {
                let live = isLive(node, at: now)
                node.root.isEnabled = live
                guard live else { continue }

                let scale: Float
                if node.mode == .steady {
                    scale = node.mode.minimumGlow
                } else {
                    let phase = Float((t.truncatingRemainder(dividingBy: node.mode.period)) / node.mode.period)
                    let wave = (sin(phase * 2 * .pi) + 1) / 2
                    scale = node.mode.minimumGlow + node.mode.amplitude * wave
                }
                node.halo.scale = SIMD3<Float>(repeating: scale)
            }
        }

        private func isLive(_ node: PulseNode, at now: Date) -> Bool {
            if inactiveStatuses.contains(node.status) { return false }
            if let expiresAt = node.expiresAt, expiresAt <= now { return false }
            return true
        }

        private func parseDate(_ raw: String?) -> Date? {
            guard let raw, !raw.isEmpty else { return nil }
            return iso.date(from: raw)
        }

        private func markerColor(for object: DOMARObject) -> UIColor {
            if object.officialAlert { return .systemRed }
            if object.role == "satellite-observation" { return .systemPurple }
            if object.role == "event" { return .systemOrange }
            switch object.activation.id {
            case "critical": return .systemRed
            case "heavy": return .systemOrange
            case "elevated": return .systemYellow
            case "active": return .systemGreen
            case "watching": return .systemCyan
            default: return .systemGray
            }
        }

        private func spherePosition(lat: Double, lon: Double, radius: Float) -> SIMD3<Float> {
            let phi = Float(lat * .pi / 180), theta = Float(lon * .pi / 180)
            return SIMD3<Float>(radius * cos(phi) * sin(theta), radius * sin(phi), radius * cos(phi) * cos(theta))
        }
    }
}
