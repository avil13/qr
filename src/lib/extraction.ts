/**
 * QR Code Extraction Classes
 */

import type { QRImageData } from './image-processing';
import type { FinderPattern } from './detection';

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
