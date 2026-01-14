/**
 * QR Code Decoder - A zero-dependency TypeScript implementation
 * Adapted for browser usage with Vue 3
 */

// ===========================
// Image Processing Classes
// ===========================

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

// ===========================
// QR Code Detection Classes
// ===========================

export class Point {
  constructor(public x: number, public y: number) {}

  distanceTo(other: Point): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }
}

export class FinderPattern {
  constructor(
    public center: Point,
    public size: number
  ) {}
}

export class FinderPatternDetector {
  private stateCount: number[] = [0, 0, 0, 0, 0];
  private currentState: number = 0;

  findPatterns(image: QRImageData): FinderPattern[] {
    const patterns: FinderPattern[] = [];
    const maxI = image.height;
    const maxJ = image.width;

    // Scan every row for better detection
    const skipRows = 1;

    for (let i = 0; i < maxI; i += skipRows) {
      this.clearCounts();
      this.currentState = 0;
      let lastWasBlack = false;

      for (let j = 0; j < maxJ; j++) {
        const isBlack = image.isBlack(j, i);

        if (isBlack === lastWasBlack) {
          // Same color, increment current state
          this.stateCount[this.currentState]!++;
        } else {
          // Color changed
          if (isBlack) {
            // White to black transition
            if (this.currentState === 4) {
              // We completed a potential pattern, check it
              if (this.checkRatio()) {
                const centerJ = this.getCenterFromEnd(j);
                if (this.checkVertical(image, i, Math.round(centerJ))) {
                  const size = this.stateCount.reduce((a, b) => a + b, 0) / 7;
                  patterns.push(new FinderPattern(new Point(centerJ, i), size));
                }
              }
              // Shift counts and continue
              this.shiftCounts();
              this.stateCount[this.currentState]!++;
            } else {
              // Move to next black state
              this.currentState++;
              this.stateCount[this.currentState]!++;
            }
          } else {
            // Black to white transition
            if (this.currentState < 4) {
              this.currentState++;
              this.stateCount[this.currentState]!++;
            }
          }
        }
        lastWasBlack = isBlack;
      }

      // Check at end of row
      if (this.currentState === 4 && this.checkRatio()) {
        const centerJ = this.getCenterFromEnd(maxJ);
        if (this.checkVertical(image, i, Math.round(centerJ))) {
          const size = this.stateCount.reduce((a, b) => a + b, 0) / 7;
          patterns.push(new FinderPattern(new Point(centerJ, i), size));
        }
      }
    }

    return this.filterPatterns(patterns);
  }

  private getCenterFromEnd(end: number): number {
    return end - this.stateCount[4]! - this.stateCount[3]! - this.stateCount[2]! / 2;
  }

  private clearCounts(): void {
    this.stateCount = [0, 0, 0, 0, 0];
  }

  private shiftCounts(): void {
    this.stateCount[0] = this.stateCount[2]!;
    this.stateCount[1] = this.stateCount[3]!;
    this.stateCount[2] = this.stateCount[4]!;
    this.stateCount[3] = 0;
    this.stateCount[4] = 0;
    this.currentState = 2;
  }

  private checkRatio(): boolean {
    const total = this.stateCount.reduce((a, b) => a + b, 0);
    if (total < 7) return false;

    const moduleSize = total / 7;
    const maxVariance = moduleSize * 0.7; // Allow more variance

    return (
      Math.abs(moduleSize - this.stateCount[0]!) < maxVariance &&
      Math.abs(moduleSize - this.stateCount[1]!) < maxVariance &&
      Math.abs(3 * moduleSize - this.stateCount[2]!) < 3 * maxVariance &&
      Math.abs(moduleSize - this.stateCount[3]!) < maxVariance &&
      Math.abs(moduleSize - this.stateCount[4]!) < maxVariance
    );
  }

  private checkVertical(image: QRImageData, centerRow: number, centerCol: number): boolean {
    const stateCount: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    let row = centerRow;

    // Count center black going up
    while (row >= 0 && image.isBlack(centerCol, row)) {
      stateCount[2]++;
      row--;
    }
    if (row < 0) return false;

    // Count white going up
    while (row >= 0 && !image.isBlack(centerCol, row)) {
      stateCount[1]++;
      row--;
    }
    if (row < 0) return false;

    // Count black going up
    while (row >= 0 && image.isBlack(centerCol, row)) {
      stateCount[0]++;
      row--;
    }

    // Now go down from center
    row = centerRow + 1;

    // Continue counting center black going down
    while (row < image.height && image.isBlack(centerCol, row)) {
      stateCount[2]++;
      row++;
    }
    if (row >= image.height) return false;

    // Count white going down
    while (row < image.height && !image.isBlack(centerCol, row)) {
      stateCount[3]++;
      row++;
    }
    if (row >= image.height) return false;

    // Count black going down
    while (row < image.height && image.isBlack(centerCol, row)) {
      stateCount[4]++;
      row++;
    }

    // Check the vertical ratio
    const total = stateCount.reduce((a, b) => a + b, 0);
    if (total < 7) return false;

    const moduleSize = total / 7;
    const maxVariance = moduleSize * 0.7;

    return (
      Math.abs(moduleSize - stateCount[0]!) < maxVariance &&
      Math.abs(moduleSize - stateCount[1]!) < maxVariance &&
      Math.abs(3 * moduleSize - stateCount[2]!) < 3 * maxVariance &&
      Math.abs(moduleSize - stateCount[3]!) < maxVariance &&
      Math.abs(moduleSize - stateCount[4]!) < maxVariance
    );
  }

  private filterPatterns(patterns: FinderPattern[]): FinderPattern[] {
    if (patterns.length < 3) return patterns;

    // Group nearby patterns and average their positions
    const groups: FinderPattern[][] = [];
    const minDistance = 20;

    for (const pattern of patterns) {
      let addedToGroup = false;
      for (const group of groups) {
        if (pattern.center.distanceTo(group[0]!.center) < minDistance) {
          group.push(pattern);
          addedToGroup = true;
          break;
        }
      }
      if (!addedToGroup) {
        groups.push([pattern]);
      }
    }

    // Average each group
    const averaged: FinderPattern[] = groups.map(group => {
      const avgX = group.reduce((sum, p) => sum + p.center.x, 0) / group.length;
      const avgY = group.reduce((sum, p) => sum + p.center.y, 0) / group.length;
      const avgSize = group.reduce((sum, p) => sum + p.size, 0) / group.length;
      return new FinderPattern(new Point(avgX, avgY), avgSize);
    });

    // Sort by confidence (larger groups = more confident)
    averaged.sort((a, b) => {
      const groupA = groups.find(g => g[0]!.center.distanceTo(a.center) < 1);
      const groupB = groups.find(g => g[0]!.center.distanceTo(b.center) < 1);
      return (groupB?.length ?? 0) - (groupA?.length ?? 0);
    });

    return averaged.slice(0, 3);
  }
}

// ===========================
// QR Code Extraction Classes
// ===========================

export class BitMatrix {
  private bits: boolean[][];

  constructor(public size: number) {
    this.bits = Array(size).fill(null).map(() => Array(size).fill(false));
  }

  get(x: number, y: number): boolean {
    return this.bits[y]?.[x] || false;
  }

  set(x: number, y: number, value: boolean): void {
    if (this.bits[y]) {
      this.bits[y][x] = value;
    }
  }
}

export class QRSampler {
  sample(image: QRImageData, patterns: FinderPattern[]): BitMatrix {
    if (patterns.length < 3) {
      throw new Error('Need 3 finder patterns');
    }

    const [topLeft, topRight, bottomLeft] = this.orderPatterns(patterns);
    const moduleSize = this.estimateModuleSize(topLeft, topRight, bottomLeft);
    const dimension = this.computeDimension(topLeft, topRight, bottomLeft, moduleSize);

    const matrix = new BitMatrix(dimension);

    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const px = topLeft.center.x + (x * moduleSize);
        const py = topLeft.center.y + (y * moduleSize);

        if (px >= 0 && px < image.width && py >= 0 && py < image.height) {
          matrix.set(x, y, image.isBlack(Math.round(px), Math.round(py)));
        }
      }
    }

    return matrix;
  }

  private orderPatterns(patterns: FinderPattern[]): [FinderPattern, FinderPattern, FinderPattern] {
    const sorted = [...patterns].sort((a, b) => a.center.y - b.center.y);
    const topLeft = sorted[0]!;
    const others = sorted.slice(1);

    others.sort((a, b) => a.center.x - b.center.x);
    return [topLeft, others[1]!, others[0]!];
  }

  private estimateModuleSize(tl: FinderPattern, tr: FinderPattern, bl: FinderPattern): number {
    return (tl.size + tr.size + bl.size) / 3;
  }

  private computeDimension(tl: FinderPattern, tr: FinderPattern, bl: FinderPattern, moduleSize: number): number {
    const tlToTR = tl.center.distanceTo(tr.center);
    const tlToBL = tl.center.distanceTo(bl.center);
    const avgDistance = (tlToTR + tlToBL) / 2;
    const dimension = Math.round(avgDistance / moduleSize) + 7;

    if (dimension % 4 === 1) return dimension;
    return Math.round(dimension / 4) * 4 + 1;
  }
}

// ===========================
// QR Code Decoder Classes
// ===========================

export class QRDataDecoder {
  decode(matrix: BitMatrix): string {
    const version = this.readVersion(matrix);
    const formatInfo = this.readFormatInfo(matrix);
    const data = this.readData(matrix, version);

    // Suppress unused variable warning
    void formatInfo;

    return this.decodeData(data);
  }

  private readVersion(matrix: BitMatrix): number {
    return Math.floor((matrix.size - 17) / 4);
  }

  private readFormatInfo(matrix: BitMatrix): number {
    let format = 0;
    for (let i = 0; i < 6; i++) {
      format = (format << 1) | (matrix.get(8, i) ? 1 : 0);
    }
    return format;
  }

  private readData(matrix: BitMatrix, _version: number): boolean[] {
    const data: boolean[] = [];
    let col = matrix.size - 1;
    let direction = -1;

    while (col > 0) {
      if (col === 6) col--;

      for (let count = 0; count < matrix.size; count++) {
        const row = direction === -1 ? matrix.size - 1 - count : count;

        for (let c = 0; c < 2; c++) {
          const x = col - c;
          if (!this.isReserved(x, row, matrix.size)) {
            data.push(matrix.get(x, row));
          }
        }
      }

      col -= 2;
      direction *= -1;
    }

    return data;
  }

  private isReserved(x: number, y: number, size: number): boolean {
    if (x < 9 && y < 9) return true;
    if (x < 9 && y >= size - 8) return true;
    if (x >= size - 8 && y < 9) return true;
    if (x === 6 || y === 6) return true;
    return false;
  }

  private decodeData(bits: boolean[]): string {
    if (bits.length < 8) return '';

    const mode = this.bitsToInt(bits.slice(0, 4));

    if (mode === 4) { // Byte mode
      const length = this.bitsToInt(bits.slice(4, 12));
      const dataBytes: number[] = [];

      for (let i = 0; i < length && (12 + i * 8 + 8) <= bits.length; i++) {
        const byte = this.bitsToInt(bits.slice(12 + i * 8, 12 + i * 8 + 8));
        dataBytes.push(byte);
      }

      return String.fromCharCode(...dataBytes);
    } else if (mode === 1) { // Numeric mode
      const length = this.bitsToInt(bits.slice(4, 14));
      return this.decodeNumeric(bits.slice(14), length);
    } else if (mode === 2) { // Alphanumeric mode
      const length = this.bitsToInt(bits.slice(4, 13));
      return this.decodeAlphanumeric(bits.slice(13), length);
    }

    return 'Unsupported QR mode';
  }

  private decodeNumeric(bits: boolean[], length: number): string {
    let result = '';
    for (let i = 0; i < length; i += 3) {
      const count = Math.min(3, length - i);
      const value = this.bitsToInt(bits.slice(i * 3, i * 3 + count * 3 + (count - 1)));
      result += value.toString().padStart(count, '0');
    }
    return result;
  }

  private decodeAlphanumeric(bits: boolean[], length: number): string {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
    let result = '';
    for (let i = 0; i < length; i += 2) {
      if (i + 1 < length) {
        const value = this.bitsToInt(bits.slice(i * 11 / 2, i * 11 / 2 + 11));
        result += (charset[Math.floor(value / 45)] ?? '') + (charset[value % 45] ?? '');
      } else {
        const value = this.bitsToInt(bits.slice(i * 11 / 2, i * 11 / 2 + 6));
        result += charset[value] ?? '';
      }
    }
    return result;
  }

  private bitsToInt(bits: boolean[]): number {
    let result = 0;
    for (const bit of bits) {
      result = (result << 1) | (bit ? 1 : 0);
    }
    return result;
  }
}

// ===========================
// Main QR Code Reader Class
// ===========================

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

// Default export for convenience
export default QRCodeReader;
