type RendererOptions = {
  logicalWidth: number;
  logicalHeight: number;
};

export class CanvasRenderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly logicalWidth: number;
  readonly logicalHeight: number;

  private viewportWidth = 0;
  private viewportHeight = 0;
  private pixelRatio = 1;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: RendererOptions,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    this.ctx = ctx;
    this.logicalWidth = options.logicalWidth;
    this.logicalHeight = options.logicalHeight;
    this.resizeIfNeeded(true);
  }

  resizeIfNeeded(force = false): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (!force && width === this.viewportWidth && height === this.viewportHeight && dpr === this.pixelRatio) {
      return;
    }

    this.viewportWidth = width;
    this.viewportHeight = height;
    this.pixelRatio = dpr;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.scale = Math.min(width / this.logicalWidth, height / this.logicalHeight);
    this.offsetX = (width - this.logicalWidth * this.scale) / 2;
    this.offsetY = (height - this.logicalHeight * this.scale) / 2;

    this.ctx.imageSmoothingEnabled = true;
  }

  prepareFrame(fadeAlpha = 0.18): CanvasRenderingContext2D {
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = `rgba(1, 5, 4, ${fadeAlpha})`;
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.applyLogicalTransform();
    return this.ctx;
  }

  clear(): void {
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = "#010504";
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.applyLogicalTransform();
  }

  applyLogicalTransform(): void {
    const transformScale = this.pixelRatio * this.scale;
    this.ctx.setTransform(
      transformScale,
      0,
      0,
      transformScale,
      this.offsetX * this.pixelRatio,
      this.offsetY * this.pixelRatio,
    );
  }
}
