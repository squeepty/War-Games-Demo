export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private volume = 0.62;

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.sfxBus = this.context.createGain();
      this.sfxBus.gain.value = 0.72;
      this.sfxBus.connect(this.master);
      this.master.connect(this.context.destination);
      this.applyMasterVolume();
    }

    await this.context.resume();
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.applyMasterVolume();
  }

  playTerminalBeep(frequency = 880, duration = 0.08, volume = 0.13): void {
    this.playTone(frequency, duration, volume, "square", 0);
  }

  playDialSequence(number: string): void {
    if (!this.context) {
      return;
    }

    const dtmf: Record<string, [number, number]> = {
      "1": [697, 1209],
      "2": [697, 1336],
      "3": [697, 1477],
      "4": [770, 1209],
      "5": [770, 1336],
      "6": [770, 1477],
      "7": [852, 1209],
      "8": [852, 1336],
      "9": [852, 1477],
      "0": [941, 1336],
    };
    const now = this.context.currentTime;

    // North American dial tone, followed by modem-paced DTMF digits.
    this.scheduleDualTone(350, 440, 0.32, 0.052, now);
    [...number].forEach((digit, index) => {
      const frequencies = dtmf[digit];
      if (!frequencies) {
        return;
      }
      this.scheduleDualTone(frequencies[0], frequencies[1], 0.082, 0.075, now + 0.4 + index * 0.125);
    });
  }

  playBusySignal(): void {
    if (!this.context) {
      return;
    }
    const now = this.context.currentTime;
    for (let index = 0; index < 2; index += 1) {
      this.scheduleDualTone(480, 620, 0.46, 0.085, now + index);
    }
  }

  playRingback(): void {
    if (!this.context) {
      return;
    }
    this.scheduleDualTone(440, 480, 1.4, 0.075, this.context.currentTime);
  }

  playCarrierHandshake(): void {
    if (!this.context || !this.sfxBus) {
      return;
    }

    const now = this.context.currentTime;

    // Answer carrier with phase-reversal ticks, typical of an answering modem.
    this.scheduleModemTone(2100, 0.72, 0.18, now, 2100);
    for (let index = 0; index < 8; index += 1) {
      const at = now + 0.09 + index * 0.075;
      this.scheduleModemTone(index % 2 === 0 ? 2100 : 1950, 0.035, 0.09, at, 2250);
    }

    // Calling and answering modem channel probes.
    const probes = [1200, 2400, 980, 2225, 1270, 2450, 1650, 2050, 1100, 2700, 1850, 2250];
    probes.forEach((frequency, index) => {
      const at = now + 0.68 + index * 0.09;
      this.scheduleModemTone(frequency, 0.082, 0.145, at, index % 2 === 0 ? frequency * 1.14 : frequency * 0.86);
    });

    // Rapid training chatter and equalizer negotiation.
    for (let index = 0; index < 48; index += 1) {
      const at = now + 1.72 + index * 0.034;
      const bank = [720, 900, 1080, 1240, 1450, 1680, 1920, 2160, 2420, 2680, 2920];
      const frequency = bank[(index * 5 + (index % 3) * 2) % bank.length];
      const endFrequency = bank[(index * 7 + 3) % bank.length];
      this.scheduleModemTone(frequency, 0.031, index % 4 === 0 ? 0.12 : 0.082, at, endFrequency);
    }

    this.playNoise(now + 0.62, 2.9, 0.066, 2100);
    this.playNoise(now + 1.65, 1.9, 0.048, 950);

    // Carrier lock resolves the negotiation into a stable data channel.
    this.scheduleModemTone(1800, 0.64, 0.16, now + 3.25, 1800);
    this.scheduleModemTone(600, 0.58, 0.058, now + 3.27, 600);
  }

  private playTone(frequency: number, duration: number, volume: number, shape: OscillatorType, delay: number, endFrequency?: number): void {
    if (!this.context || !this.sfxBus) {
      return;
    }
    const at = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(frequency, at);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    }
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);
    gain.connect(this.sfxBus);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }

  private scheduleDualTone(
    lowFrequency: number,
    highFrequency: number,
    duration: number,
    volume: number,
    at: number,
  ): void {
    if (!this.context || !this.sfxBus) {
      return;
    }

    for (const frequency of [lowFrequency, highFrequency]) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(volume, at + 0.006);
      gain.gain.setValueAtTime(volume, Math.max(at + 0.007, at + duration - 0.012));
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain);
      gain.connect(this.sfxBus);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.015);
    }
  }

  private scheduleModemTone(frequency: number, duration: number, volume: number, at: number, endFrequency: number): void {
    if (!this.context || !this.sfxBus) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    filter.type = "bandpass";
    filter.frequency.value = Math.max(frequency, endFrequency);
    filter.Q.value = 0.72;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.004);
    gain.gain.setValueAtTime(volume * 0.88, Math.max(at + 0.005, at + duration - 0.008));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.015);
  }

  private playNoise(at: number, duration: number, volume: number, frequency: number): void {
    if (!this.context || !this.sfxBus) {
      return;
    }
    const frames = Math.ceil(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 1.8;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    source.start(at);
  }

  private applyMasterVolume(): void {
    if (!this.context || !this.master) {
      return;
    }
    const target = Math.max(0.0001, this.volume);
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.025);
  }
}
