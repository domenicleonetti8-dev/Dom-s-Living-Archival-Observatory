import SwiftUI
import RealityKit
import ARKit

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

    func updateUIView(_ view: ARView, context: Context) {
        context.coordinator.update(state: state, in: view)
    }

    static func dismantleUIView(_ uiView: ARView, coordinator: Coordinator) {
        uiView.session.pause()
    }

    final class Coordinator {
        private let radius: Float = 0.18
        private let anchor = AnchorEntity(world: SIMD3<Float>(0, 0, -0.65))
        private let globe = ModelEntity(
            mesh: .generateSphere(radius: 0.18),
            materials: [SimpleMaterial(color: .init(red: 0.03, green: 0.16, blue: 0.31, alpha: 0.88), roughness: 0.72, isMetallic: false)]
        )
        private let markerRoot = Entity()
        private var renderedVersion = -1

        func install(in view: ARView) {
            globe.name = "DOM Earth"
            globe.generateCollisionShapes(recursive: false)
            globe.addChild(markerRoot)
            anchor.addChild(globe)
            view.scene.addAnchor(anchor)
            view.installGestures([.rotation, .scale, .translation], for: globe)
        }

        func update(state: DOMARState?, in view: ARView) {
            guard let state, state.version != renderedVersion else { return }
            renderedVersion = state.version
            markerRoot.children.removeAll()

            let located = state.objects.filter(\.isLocated)
            let maximum = min(located.count, 8000)
            for object in located.prefix(maximum) {
                guard let lat = object.lat, let lon = object.lon else { continue }
                let marker = makeMarker(for: object)
                marker.position = spherePosition(lat: lat, lon: lon, radius: radius + markerAltitude(for: object))
                marker.look(at: marker.position * 2, from: marker.position, relativeTo: globe)
                markerRoot.addChild(marker)
            }
        }

        private func markerAltitude(for object: DOMARObject) -> Float {
            if let elevation = object.elevationM, elevation > 0 {
                return min(0.018, Float(elevation / 10_000_000.0))
            }
            if object.role == "satellite-observation" { return 0.022 }
            return 0.004
        }

        private func makeMarker(for object: DOMARObject) -> ModelEntity {
            let radius: Float
            switch object.role {
            case "event": radius = object.officialAlert ? 0.0044 : 0.0037
            case "satellite-observation": radius = 0.0032
            default: radius = 0.0025
            }
            let material = SimpleMaterial(color: markerColor(for: object), roughness: 0.35, isMetallic: true)
            let entity = ModelEntity(mesh: .generateSphere(radius: radius), materials: [material])
            entity.name = "\(object.role)|\(object.id)|\(object.title)"
            entity.generateCollisionShapes(recursive: false)
            return entity
        }

        private func markerColor(for object: DOMARObject) -> UIColor {
            if object.officialAlert { return .systemRed }
            if object.role == "satellite-observation" { return .systemPurple }
            if object.role == "event" { return .systemOrange }
            let activation = max(object.anomaly ?? 0, object.hazardCoupling ?? 0)
            if activation >= 0.90 { return .systemRed }
            if activation >= 0.72 { return .systemOrange }
            if activation >= 0.52 { return .systemYellow }
            if activation >= 0.30 { return .systemGreen }
            return .systemCyan
        }

        private func spherePosition(lat: Double, lon: Double, radius: Float) -> SIMD3<Float> {
            let phi = Float(lat * .pi / 180)
            let theta = Float(lon * .pi / 180)
            let x = radius * cos(phi) * sin(theta)
            let y = radius * sin(phi)
            let z = radius * cos(phi) * cos(theta)
            return SIMD3<Float>(x, y, z)
        }
    }
}
