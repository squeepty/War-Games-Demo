import type { ModEvent, ModPattern, ModSample, ModSong } from "./ModTypes";

const TITLE_LENGTH = 20;
const SAMPLE_COUNT = 31;
const SAMPLE_HEADER_LENGTH = 30;
const SONG_LENGTH_OFFSET = 950;
const ORDER_TABLE_OFFSET = 952;
const ORDER_TABLE_LENGTH = 128;
const SIGNATURE_OFFSET = 1080;
const PATTERN_DATA_OFFSET = 1084;
const ROWS_PER_PATTERN = 64;
const EVENT_BYTE_LENGTH = 4;

const SIGNATURE_CHANNEL_COUNTS = new Map<string, number>([
  ["M.K.", 4],
  ["M!K!", 4],
  ["M&K!", 4],
  ["N.T.", 4],
  ["FLT4", 4],
  ["4CHN", 4],
  ["6CHN", 6],
  ["8CHN", 8],
]);

export class ModParser {
  parse(buffer: ArrayBuffer): ModSong {
    if (buffer.byteLength < PATTERN_DATA_OFFSET) {
      throw new Error("MOD file is too small to contain a ProTracker header.");
    }

    const bytes = new Uint8Array(buffer);
    const samples = this.parseSamples(bytes);
    const songLength = bytes[SONG_LENGTH_OFFSET];
    const patternOrder = Array.from(bytes.slice(ORDER_TABLE_OFFSET, ORDER_TABLE_OFFSET + ORDER_TABLE_LENGTH));
    const signature = readAscii(bytes, SIGNATURE_OFFSET, 4);
    const channelCount = SIGNATURE_CHANNEL_COUNTS.get(signature) ?? 4;
    const usedOrder = patternOrder.slice(0, songLength);
    const patternCount = usedOrder.length > 0 ? Math.max(...usedOrder) + 1 : 0;
    const patterns = this.parsePatterns(bytes, patternCount, channelCount);
    const sampleData = this.parseSampleData(bytes, samples, patternCount, channelCount);

    return {
      samples,
      songLength,
      patternOrder,
      channelCount,
      patterns,
      sampleData,
    };
  }

  private parseSamples(bytes: Uint8Array): ModSample[] {
    const samples: ModSample[] = [];

    for (let sampleIndex = 0; sampleIndex < SAMPLE_COUNT; sampleIndex += 1) {
      const offset = TITLE_LENGTH + sampleIndex * SAMPLE_HEADER_LENGTH;
      samples.push({
        lengthBytes: readWord(bytes, offset + 22) * 2,
        volume: bytes[offset + 25],
        repeatOffsetBytes: readWord(bytes, offset + 26) * 2,
        repeatLengthBytes: readWord(bytes, offset + 28) * 2,
      });
    }

    return samples;
  }

  private parsePatterns(bytes: Uint8Array, patternCount: number, channelCount: number): ModPattern[] {
    const patterns: ModPattern[] = [];
    const rowByteLength = channelCount * EVENT_BYTE_LENGTH;
    const patternByteLength = ROWS_PER_PATTERN * rowByteLength;

    for (let patternIndex = 0; patternIndex < patternCount; patternIndex += 1) {
      const patternOffset = PATTERN_DATA_OFFSET + patternIndex * patternByteLength;

      if (patternOffset + patternByteLength > bytes.byteLength) {
        break;
      }

      patterns.push({
        rows: Array.from({ length: ROWS_PER_PATTERN }, (_, rowIndex) => ({
          channels: Array.from({ length: channelCount }, (_, channelIndex) => {
            const eventOffset = patternOffset + rowIndex * rowByteLength + channelIndex * EVENT_BYTE_LENGTH;
            return decodeEvent(bytes, eventOffset);
          }),
        })),
      });
    }

    return patterns;
  }

  private parseSampleData(bytes: Uint8Array, samples: ModSample[], patternCount: number, channelCount: number): Int8Array[] {
    const patternByteLength = ROWS_PER_PATTERN * channelCount * EVENT_BYTE_LENGTH;
    let sampleOffset = PATTERN_DATA_OFFSET + patternCount * patternByteLength;

    return samples.map((sample) => {
      const endOffset = Math.min(bytes.byteLength, sampleOffset + sample.lengthBytes);
      const data = new Int8Array(endOffset - sampleOffset);

      for (let index = 0; index < data.length; index += 1) {
        data[index] = (bytes[sampleOffset + index] << 24) >> 24;
      }

      sampleOffset += sample.lengthBytes;
      return data;
    });
  }
}

function decodeEvent(bytes: Uint8Array, offset: number): ModEvent {
  const byte0 = bytes[offset];
  const byte1 = bytes[offset + 1];
  const byte2 = bytes[offset + 2];
  const byte3 = bytes[offset + 3];

  return {
    period: ((byte0 & 0x0f) << 8) | byte1,
    sampleNumber: (byte0 & 0xf0) | (byte2 >> 4),
    effectCommand: byte2 & 0x0f,
    effectParameter: byte3,
  };
}

function readWord(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    const code = bytes[offset + index];
    if (code !== 0) {
      value += String.fromCharCode(code);
    }
  }

  return value.trim();
}
