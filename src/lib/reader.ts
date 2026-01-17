/**
 * Main QR Code Reader Class
 */

import { readBarcodes, type ReaderOptions } from "zxing-wasm/reader";

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
    const detector = new window.BarcodeDetector!({ formats: ["qr_code"] });
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

  private async fileToImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };

      img.src = url;
    });
  }

  private async readWithCustomDecoder(file: File): Promise<string> {
    const options: ReaderOptions = {
      formats: ["QRCode"],
      tryHarder: true,
    };

    // Convert File to ImageData for more reliable processing
    const imageData = await this.fileToImageData(file);
    const results = await readBarcodes(imageData, options);
    const item = results[0];

    if (item?.isValid) {
      return item.text;
    }

    throw new Error(item?.error || "Could not find QR code in image");
  }
}
