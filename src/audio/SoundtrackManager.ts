import { AudioEngine } from "./AudioEngine";
import { ModulePlayer } from "./ModulePlayer";

const SOUNDTRACK_URL = `${import.meta.env.BASE_URL}audio/Eclipse_Matthew_Simmonds.mod`;
const MUSIC_ENABLED = true;
const FIRST_SCREEN_SFX_GAIN = 1.5625;

export class SoundtrackManager {
  private readonly engine = new AudioEngine();
  private readonly modulePlayer = new ModulePlayer();
  private readonly timers: number[] = [];
  private volume = 0.62;
  private musicLevel = 1;
  private fallbackStartedAt = 0;

  async unlock(): Promise<void> {
    await Promise.all([this.engine.unlock(), this.modulePlayer.unlock()]);
    this.engine.setVolume(Math.min(1, this.volume * FIRST_SCREEN_SFX_GAIN));
    this.applyMusicVolume();

    try {
      await this.modulePlayer.load(SOUNDTRACK_URL);
      await this.modulePlayer.play();
    } catch (error) {
      console.warn("Unable to start MOD soundtrack.", error);
    }

    this.fallbackStartedAt = performance.now() / 1000;
  }

  getPlaybackTime(): number {
    return this.modulePlayer.getPlaybackTime() ?? Math.max(0, performance.now() / 1000 - this.fallbackStartedAt);
  }

  playForScene(sceneId: string): void {
    this.clearTimers();
    this.musicLevel = 1;
    this.applyMusicVolume();
    this.playSceneSfx(sceneId);
  }

  setMusicLevel(value: number): void {
    this.musicLevel = Math.max(0, Math.min(1, value));
    this.applyMusicVolume();
  }

  private playSceneSfx(sceneId: string): void {
    if (sceneId !== "autodialer") {
      return;
    }

    this.timers.push(window.setTimeout(() => this.engine.playDialSequence("5550137"), 3750));
    this.timers.push(window.setTimeout(() => this.engine.playBusySignal(), 5150));
    this.timers.push(window.setTimeout(() => this.engine.playDialSequence("5550198"), 7200));
    this.timers.push(window.setTimeout(() => this.engine.playDialSequence("5552368"), 11150));
    this.timers.push(window.setTimeout(() => this.engine.playRingback(), 12500));
    this.timers.push(window.setTimeout(() => this.engine.playCarrierHandshake(), 14000));
    this.timers.push(window.setTimeout(() => this.engine.playTerminalBeep(1040, 0.12, 0.16), 18000));
  }

  private clearTimers(): void {
    for (const timer of this.timers) {
      window.clearTimeout(timer);
      window.clearInterval(timer);
    }
    this.timers.length = 0;
  }

  private applyMusicVolume(): void {
    this.modulePlayer.setVolume(MUSIC_ENABLED ? this.volume * this.musicLevel : 0);
  }
}
