export interface ModSong {
  samples: ModSample[];
  songLength: number;
  patternOrder: number[];
  channelCount: number;
  patterns: ModPattern[];
  sampleData: Int8Array[];
}

export interface ModSample {
  lengthBytes: number;
  volume: number;
  repeatOffsetBytes: number;
  repeatLengthBytes: number;
}

export interface ModPattern {
  rows: ModRow[];
}

export interface ModRow {
  channels: ModEvent[];
}

export interface ModEvent {
  period: number;
  sampleNumber: number;
  effectCommand: number;
  effectParameter: number;
}
