/**
 * Main QR Code Reader Class
 */

import { ImageLoader } from './image-processing';
import { FinderPatternDetector } from './detection';
import { QRSampler } from './extraction';
import { QRDataDecoder } from './decoder';

// Check for native BarcodeDetector support
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
    };
  }
}

export class QRCodeReader {
  async read(file: File): Promise<string> {
    // Try native BarcodeDetector first (more reliable)
    if (window.BarcodeDetector) {
      try {
        const result = await this.readWithNativeDetector(file);
        if (result) return result;
      } catch {
        // Fall through to custom implementation
      }
    }

    // Fall back to custom implementation
    return this.readWithCustomDecoder(file);
  }

  private async readWithNativeDetector(file: File): Promise<string | null> {
    const detector = new window.BarcodeDetector!({ formats: ['qr_code'] });
    const imageBitmap = await createImageBitmap(file);

    try {
      const results = await detector.detect(imageBitmap);
      if (results.length > 0 && results[0]?.rawValue) {
        return results[0].rawValue;
      }
    } finally {
      imageBitmap.close();
    }

    return null;
  }

  private async readWithCustomDecoder(file: File): Promise<string> {
    const image = await ImageLoader.loadFromFile(file);

    // Try with multiple threshold values
    const thresholds = [
      image.threshold, // Otsu's threshold
      image.threshold - 20,
      image.threshold + 20,
      100,
      127,
      150,
    ];

    for (const threshold of thresholds) {
      image.setThreshold(threshold);
      const detector = new FinderPatternDetector();
      const patterns = detector.findPatterns(image);

      if (patterns.length >= 3) {
        try {
          const sampler = new QRSampler();
          const matrix = sampler.sample(image, patterns);

          const decoder = new QRDataDecoder();
          const result = decoder.decode(matrix);
          if (result && result !== 'Unsupported QR mode' && result.length > 0) {
            return result;
          }
        } catch {
          // Try next threshold
        }
      }
    }

    throw new Error('Could not find QR code in image');
  }
}
