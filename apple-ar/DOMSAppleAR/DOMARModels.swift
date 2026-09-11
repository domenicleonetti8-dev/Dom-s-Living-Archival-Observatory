import Foundation

struct DOMARState: Codable {
    let schema: String
    let version: Int
    let generatedAt: String
    let objects: [DOMARObject]
    let satelliteLayers: [DOMSatelliteLayer]
    let sourceHealth: [DOMSourceHealth]
    let coverage: DOMARCoverage
    let truth: DOMARTruth
}

struct DOMARObject: Codable, Identifiable {
    let id: String
    let schema: String
    let role: String
    let kind: String
    let modality: String
    let agency: String
    let network: String
    let lineageId: String
    let lat: Double?
    let lon: Double?
    let elevationM: Double?
    let depthKm: Double?
    let locationPrecision: String
    let observedAt: String?
    let receivedAt: String?
    let expiresAt: String?
    let observationStatus: String
    let authoritative: Bool
    let officialAlert: Bool
    let quality: Double?
    let freshness: Double?
    let anomaly: Double?
    let anomalyZ: Double?
    let persistence: Double?
    let corroboration: Double?
    let hazardCoupling: Double?
    let severityText: String
    let certaintyText: String
    let urgencyText: String
    let title: String
    let sourceUrl: String?

    var isLocated: Bool {
        guard let lat, let lon else { return false }
        return (-90...90).contains(lat) && (-180...180).contains(lon)
    }
}

struct DOMSatelliteLayer: Codable, Identifiable {
    let id: String
    let agency: String
    let name: String
    let domains: [String]
    let coverage: String
    let timeClass: String
    let sourceUrl: String
    let requiresCredential: Bool
}

struct DOMSourceHealth: Codable, Identifiable {
    let id: String
    let status: String
    let lastSuccess: String?
    let lastError: String?
    let lastDurationMs: Int?
    let recordCount: Int
    let consecutiveFailures: Int
    let staleAfterSeconds: Int?

    enum CodingKeys: String, CodingKey {
        case id, status
        case lastSuccess = "last_success"
        case lastError = "last_error"
        case lastDurationMs = "last_duration_ms"
        case recordCount = "record_count"
        case consecutiveFailures = "consecutive_failures"
        case staleAfterSeconds = "stale_after_seconds"
    }
}

struct DOMARCoverage: Codable {
    let records: Int
    let locatedRecords: Int
    let unlocatedRecords: Int
    let registeredSourceFamilies: Int
    let activeSourceFamilies: Int
    let staleSourceFamilies: Int
    let notIngestingSourceFamilies: Int
    let satelliteLayerFamilies: Int
}

struct DOMARTruth: Codable {
    let allSensorsMeaning: String
    let missingFeedMeaning: String
    let imageryMeaning: String
}
