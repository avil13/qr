/**
 * QR Code Detection Classes
 */

import type { QRImageData } from './image-processing';

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
