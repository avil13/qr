/**
 * Image Processing Classes
 */

export class QRImageData {
  private grayscale: Uint8Array;
  private _threshold: number = 127;

  constructor(
    public width: number,
    public height: number,
    public data: Uint8ClampedArray
  ) {
    // Pre-compute grayscale values
    this.grayscale = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;
      // Use luminance formula for better grayscale
      this.grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    // Compute optimal threshold using Otsu's method
    this._threshold = this.computeOtsuThreshold();
  }

  private computeOtsuThreshold(): number {
    const histogram = Array.from({ length: 256 }, () => 0);
    for (let i = 0; i < this.grayscale.length; i++) {
      const val = this.grayscale[i]!;
      histogram[val]!++;
    }

    const total = this.grayscale.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i]!;
    }

    let sumB = 0;
    let wB = 0;
    let maxVariance = 0;
    let threshold = 127;

    for (let i = 0; i < 256; i++) {
      wB += histogram[i]!;
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;

      sumB += i * histogram[i]!;
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = i;
      }
    }

    return threshold;
  }

  get threshold(): number {
    return this._threshold;
  }

  setThreshold(value: number): void {
    this._threshold = value;
  }

  getPixel(x: number, y: number): number {
    return this.grayscale[y * this.width + x] ?? 0;
  }

  isBlack(x: number, y: number, threshold?: number): boolean {
    return this.getPixel(x, y) < (threshold ?? this._threshold);
  }
}

export class ImageLoader {
  static async loadFromFile(file: File): Promise<QRImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          resolve(new QRImageData(img.width, img.height, imageData.data));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
