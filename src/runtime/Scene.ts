import type { CanvasRenderer } from "../rendering/CanvasRenderer";

export interface Scene {
  enter?(renderer: CanvasRenderer): void;
  update(deltaSeconds: number, elapsedSeconds: number): void;
  render(renderer: CanvasRenderer): void;
}
