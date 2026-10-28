import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let assets = root.appendingPathComponent("assets", isDirectory: true)
let output = assets.appendingPathComponent("demo.gif")
let frameURLs = (1...4).map { index in
    assets.appendingPathComponent(String(format: "demo-frame-%02d.png", index))
}

let targetWidth = 1280
let targetHeight = 840
let frameDelay = 1.4

func loadFrame(from url: URL) -> CGImage? {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(source, 0, nil)
}

func cropAndResize(_ image: CGImage) -> CGImage? {
    let cropWidth = min(image.width, 1584)
    let cropHeight = min(image.height, 1040)
    guard let cropped = image.cropping(to: CGRect(x: 0, y: 0, width: cropWidth, height: cropHeight)) else { return nil }

    guard let context = CGContext(
        data: nil,
        width: targetWidth,
        height: targetHeight,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }

    context.interpolationQuality = .high
    context.draw(cropped, in: CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
    return context.makeImage()
}

let gifProperties: [CFString: Any] = [
    kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]
]

guard let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.gif.identifier as CFString, frameURLs.count, nil) else {
    fatalError("Could not create the demo GIF")
}
CGImageDestinationSetProperties(destination, gifProperties as CFDictionary)

for frameURL in frameURLs {
    guard let source = loadFrame(from: frameURL), let frame = cropAndResize(source) else {
        fatalError("Could not process demo frame: \(frameURL.lastPathComponent)")
    }
    let frameProperties: [CFString: Any] = [
        kCGImagePropertyGIFDictionary: [
            kCGImagePropertyGIFDelayTime: frameDelay,
            kCGImagePropertyGIFUnclampedDelayTime: frameDelay
        ]
    ]
    CGImageDestinationAddImage(destination, frame, frameProperties as CFDictionary)
}

guard CGImageDestinationFinalize(destination) else {
    fatalError("Could not finish the demo GIF")
}

print("Wrote \(output.path)")