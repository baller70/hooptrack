import AVFoundation
import Foundation

enum VideoExport {
    static func mp4(from sourceURL: URL) async throws -> URL {
        let asset = AVURLAsset(url: sourceURL)
        guard let export = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
            throw APIError.invalidResponse
        }
        let outputURL = FileManager.default.temporaryDirectory
            .appending(path: "hooptrack-\(UUID().uuidString)")
            .appendingPathExtension("mp4")
        export.outputURL = outputURL
        export.outputFileType = .mp4
        export.shouldOptimizeForNetworkUse = true

        await withCheckedContinuation { continuation in
            export.exportAsynchronously {
                continuation.resume()
            }
        }
        if export.status == .completed {
            return outputURL
        }
        throw export.error ?? APIError.invalidResponse
    }

    static func durationSeconds(for sourceURL: URL) async -> Int {
        let asset = AVURLAsset(url: sourceURL)
        let duration = try? await asset.load(.duration)
        return max(0, Int(CMTimeGetSeconds(duration ?? .zero).rounded()))
    }
}
