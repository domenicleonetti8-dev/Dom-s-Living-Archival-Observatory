import SwiftUI
import RealityKit
import ARKit
import UIKit
import Combine

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
        coordinator.stopAnimation()
        uiView.session.pause()
    }

    final class Coordinator {
        private struct LightProfile {
            let id: String
            let color: UIColor
            let animated: Bool
            let period: TimeInterval
            let scaleMin: Float
            let scaleMax: Float
            let dimmed: Bool
        }

        private struct LiveMarker {
            let entity: Entity
            let expiresAt: Date?
            let observationStatus: String
            let profile: LightProfile
        }

        private let radius: Float = 0.18
        private let anchor = AnchorEntity(world: SIMD3<Float>(0, 0, -0.65))
        private let globe = ModelEntity(mesh: .generateSphere(radius: 0.18), materials: [SimpleMaterial(color: UIColor(red: 0.03, green: 0.16, blue: 0.31, alpha: 0.88), roughness: 0.72, isMetallic: false)])
        private let markerRoot = Entity()
        private var renderedVersion = -1
        private var liveMarkers: [LiveMarker] = []
        private var updateSubscription: Cancellable?

        func install(in view: ARView) {
            globe.name = "DOM Earth"
            globe.generateCollisionShapes(recursive: false)
            globe.addChild(markerRoot)
            anchor.addChild(globe)
            view.scene.addAnchor(anchor)
            view.installGestures([.rotation, .scale, .translation], for: globe)
            updateSubscription = view.scene.subscribe(to: SceneEvents.Update.self) { [weak self] _ in
                self?.animate(now: Date())
            }
        }

        func stopAnimation() {
            updateSubscription?.cancel()
            updateSubscription = nil
        }

        func update(state: DOMARState?) {
            guard let state, state.version != renderedVersion else { return }
            renderedVersion = state.version
            markerRoot.children.removeAll()
            liveMarkers.removeAll(keepingCapacity: true)
            for object in state.objects.filter(\.isLocated).prefix(8000) {
                guard let lat = object.lat, let lon = object.lon else { continue }
                let profile = lightProfile(for: object, now: Date())
                let marker = makeMarker(for: object, profile: profile)
                marker.position = spherePosition(lat: lat, lon: lon, radius: radius + markerAltitude(for: object))
                markerRoot.addChild(marker)
                liveMarkers.append(LiveMarker(entity: marker, expiresAt: parseDate(object.expiresAt), observationStatus: object.observationStatus, profile: profile))
            }
        }

        private func markerAltitude(for object: DOMARObject) -> Float {
            if let elevation = object.elevationM, elevation > 0 { return min(0.018, Float(elevation / 10_000_000.0)) }
            if object.role == "satellite-observation" { return 0.022 }
            return 0.004
        }

        private func makeMarker(for object: DOMARObject, profile: LightProfile) -> Entity {
            let root = Entity()
            let markerRadius: Float = object.role == "event" ? (object.officialAlert ? 0.0044 : 0.0037) : object.role == "satellite-observation" ? 0.0032 : 0.0025
            let alpha: CGFloat = profile.dimmed ? 0.22 : 0.96
            let markerColor = profile.color.withAlphaComponent(alpha)
            let material = SimpleMaterial(color: markerColor, roughness: 0.30, isMetallic: true)
            let core = ModelEntity(mesh: .generateSphere(radius: markerRadius), materials: [material])
            core.name = "core|\(object.role)|\(object.id)|\(object.title)"
            core.generateCollisionShapes(recursive: false)
            root.addChild(core)

            if !profile.dimmed {
                let haloAlpha: CGFloat = profile.id == "high" ? 0.18 : profile.id == "medium" ? 0.13 : 0.07
                let haloMaterial = SimpleMaterial(color: profile.color.withAlphaComponent(haloAlpha), roughness: 0.85, isMetallic: false)
                let haloRadius = markerRadius * (profile.id == "high" ? 2.7 : profile.id == "medium" ? 2.2 : 1.65)
                let halo = ModelEntity(mesh: .generateSphere(radius: haloRadius), materials: [haloMaterial])
                halo.name = "halo"
                root.addChild(halo)
            }
            root.name = "risk|\(profile.id)|\(object.role)|\(object.id)"
            return root
        }

        private func animate(now: Date) {
            let t = now.timeIntervalSince1970
            for marker in liveMarkers {
                let active = isLive(status: marker.observationStatus, expiresAt: marker.expiresAt, now: now)
                guard active else {
                    marker.entity.scale = SIMD3<Float>(repeating: 0.72)
                    marker.entity.isEnabled = false
                    continue
                }
                marker.entity.isEnabled = true
                guard marker.profile.animated, marker.profile.period > 0, !UIAccessibility.isReduceMotionEnabled else {
                    marker.entity.scale = SIMD3<Float>(repeating: 1)
                    continue
                }
                let phase = (sin((t / marker.profile.period) * .pi * 2 - .pi / 2) + 1) / 2
                let scale = marker.profile.scaleMin + (marker.profile.scaleMax - marker.profile.scaleMin) * Float(phase)
                marker.entity.scale = SIMD3<Float>(repeating: scale)
            }
        }

        private func lightProfile(for object: DOMARObject, now: Date) -> LightProfile {
            guard isLive(status: object.observationStatus, expiresAt: parseDate(object.expiresAt), now: now) else {
                return LightProfile(id: "off", color: .systemGray, animated: false, period: 0, scaleMin: 1, scaleMax: 1, dimmed: true)
            }
            if isStale(status: object.observationStatus) {
                return LightProfile(id: "unknown", color: UIColor(red: 0.44, green: 0.52, blue: 0.58, alpha: 1), animated: false, period: 0, scaleMin: 1, scaleMax: 1, dimmed: true)
            }
            let activation = object.activation.id.lowercased()
            let animateAllowed = !UIAccessibility.isReduceMotionEnabled
            let severeOfficial = object.officialAlert && (object.severityText.lowercased().contains("extreme") || object.severityText.lowercased().contains("severe"))
            if severeOfficial || activation == "critical" || activation == "heavy" {
                return LightProfile(id: "high", color: activation == "heavy" ? .systemOrange : .systemRed, animated: animateAllowed, period: 1.05, scaleMin: 0.78, scaleMax: 1.34, dimmed: false)
            }
            if activation == "elevated" {
                return LightProfile(id: "medium", color: .systemYellow, animated: animateAllowed, period: 1.8, scaleMin: 0.88, scaleMax: 1.20, dimmed: false)
            }
            if activation == "active" {
                return LightProfile(id: "low", color: .systemGreen, animated: false, period: 0, scaleMin: 1, scaleMax: 1, dimmed: false)
            }
            if activation == "watching" {
                return LightProfile(id: "steady", color: .systemCyan, animated: false, period: 0, scaleMin: 1, scaleMax: 1, dimmed: false)
            }
            return LightProfile(id: "steady", color: markerColor(for: object), animated: false, period: 0, scaleMin: 1, scaleMax: 1, dimmed: activation == "idle")
        }

        private func isStale(status: String) -> Bool {
            status.range(of: "stale", options: .caseInsensitive) != nil ||
            status.range(of: "unknown", options: .caseInsensitive) != nil ||
            status.range(of: "unavailable", options: .caseInsensitive) != nil
        }

        private func isLive(status: String, expiresAt: Date?, now: Date) -> Bool {
            let stopped = status.range(of: "cancel", options: .caseInsensitive) != nil ||
                status.range(of: "ended", options: .caseInsensitive) != nil ||
                status.range(of: "expired", options: .caseInsensitive) != nil ||
                status.range(of: "inactive", options: .caseInsensitive) != nil ||
                status.range(of: "closed", options: .caseInsensitive) != nil ||
                status.range(of: "resolved", options: .caseInsensitive) != nil ||
                status.range(of: "cleared", options: .caseInsensitive) != nil
            if stopped { return false }
            if let expiresAt, expiresAt <= now { return false }
            return true
        }

        private func parseDate(_ value: String?) -> Date? {
            guard let value, !value.isEmpty else { return nil }
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let d = f.date(from: value) { return d }
            f.formatOptions = [.withInternetDateTime]
            return f.date(from: value)
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
