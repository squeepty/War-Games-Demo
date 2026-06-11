import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import type { Scene } from "./Scene";

export class SceneManager {
  private currentScene: Scene | null = null;
  private lastTimelineTime: number | null = null;
  private sceneChanged = false;

  constructor(private readonly renderer: CanvasRenderer) {}

  setScene(scene: Scene): void {
    this.currentScene = scene;
    this.sceneChanged = true;
    scene.enter?.(this.renderer);
  }

  start(clock: () => number, synchronizeScene: (timelineTime: number) => number): void {
    const tick = () => {
      const timelineTime = clock();
      const sceneElapsed = synchronizeScene(timelineTime);
      const delta =
        this.lastTimelineTime === null || this.sceneChanged
          ? 0
          : Math.min(Math.max(0, timelineTime - this.lastTimelineTime), 0.05);
      this.lastTimelineTime = timelineTime;
      this.sceneChanged = false;

      this.renderer.resizeIfNeeded();

      if (this.currentScene) {
        this.currentScene.update(delta, sceneElapsed);
        this.currentScene.render(this.renderer);
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}
