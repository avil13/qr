/**
 * QR Code Decoder Classes
 */

import type { BitMatrix } from './extraction';

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
