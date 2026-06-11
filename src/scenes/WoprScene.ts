import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import { colorFor, glowFillText, glowStroke, strokePanel, type Phosphor } from "../rendering/vector";
import type { Scene } from "../runtime/Scene";
import { clamp, pulse, wrap } from "../utils/math";

type BootLine = {
  at: number;
  text: string;
  tone: Phosphor;
};

type VisibleBootLine = {
  text: string;
  tone: Phosphor;
  bornAt: number;
};

const bootLines: BootLine[] = [
  { at: 0.38, text: "WOPR EXECUTIVE MONITOR", tone: "dim" },
  { at: 0.86, text: "REMOTE VECTOR DISPLAY ATTACHED", tone: "cyan" },
  { at: 1.35, text: "PROCESSING...", tone: "primary" },
  { at: 2.16, text: "STRATEGIC DATASET LOADED", tone: "primary" },
  { at: 2.81, text: "WAR PLAN MATRIX: ONLINE", tone: "amber" },
  { at: 3.68, text: "MISSILE WARNING SAMPLE ACCEPTED", tone: "primary" },
  { at: 4.38, text: "GAME TREE ALLOCATION: 94%", tone: "cyan" },
  { at: 5.24, text: "SIMULATION READY", tone: "primary" },
  { at: 6.16, text: "AWAITING FIRST MOVE", tone: "dim" },
];

const memoryLabels = [
  "TACTICAL",
  "SAC",
  "NORAD",
  "CIPHER",
  "LAUNCH",
  "TARGET",
  "WARGAME",
  "FALKEN",
  "GRID",
  "EVAL",
  "VOICE",
  "REMOTE",
];

export class WoprScene implements Scene {
  private time = 0;
  private nextLineIndex = 0;
  private readonly lines: VisibleBootLine[] = [];

  enter(renderer: CanvasRenderer): void {
    renderer.clear();
    this.time = 0;
    this.nextLineIndex = 0;
    this.lines.length = 0;
  }

  update(_deltaSeconds: number, elapsedSeconds: number): void {
    this.time = elapsedSeconds;

    while (this.nextLineIndex < bootLines.length && this.time >= bootLines[this.nextLineIndex].at) {
      const line = bootLines[this.nextLineIndex];
      this.lines.push({ text: line.text, tone: line.tone, bornAt: this.time });
      this.nextLineIndex += 1;
    }
  }

  render(renderer: CanvasRenderer): void {
    const ctx = renderer.prepareFrame(0.22);
    this.drawBackground(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawHeader(ctx);
    this.drawCore(ctx);
    this.drawMemoryBanks(ctx);
    this.drawBootConsole(ctx);
    this.drawQuestion(ctx);
    this.drawSignalNoise(ctx, renderer.logicalWidth, renderer.logicalHeight);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.43, 60, width * 0.5, height * 0.43, width * 0.65);
    gradient.addColorStop(0, "rgba(96, 255, 142, 0.16)");
    gradient.addColorStop(0.4, "rgba(22, 70, 38, 0.09)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = colorFor("dim");
    ctx.lineWidth = 1;
    for (let x = 120; x <= width - 120; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 96);
      ctx.lineTo(x, height - 96);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    strokePanel(ctx, 70, 48, 1460, 44, "primary", 0.64);
    ctx.font = "18px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    glowFillText(ctx, "WAR OPERATION PLAN RESPONSE", 92, 71, "primary", 0.9);
    glowFillText(ctx, "HOST: WOPR", 480, 71, "cyan", 0.74);
    glowFillText(ctx, "MODE: INTERACTIVE SIMULATION", 668, 71, "amber", pulse(this.time, 0.7, 0.54, 0.9));
    glowFillText(ctx, `CPU LOAD ${String(Math.floor(61 + pulse(this.time, 0.42, 0, 35))).padStart(2, "0")}%`, 1055, 71, "primary", 0.74);
    glowFillText(ctx, "SECURE CHANNEL OPEN", 1272, 71, "dim", 0.68);
    ctx.restore();
  }

  private drawCore(ctx: CanvasRenderingContext2D): void {
    const cx = 800;
    const cy = 370;

    ctx.save();
    ctx.font = "17px 'Courier New', monospace";
    glowFillText(ctx, "NEURAL STRATEGY CORE", cx - 114, cy - 216, "primary", 0.82);

    for (let ring = 0; ring < 7; ring += 1) {
      const radius = 54 + ring * 33 + pulse(this.time + ring, 0.18, -4, 4);
      const tone: Phosphor = ring % 3 === 0 ? "cyan" : ring % 2 === 0 ? "primary" : "dim";
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();
        },
        tone,
        ring === 0 ? 2 : 1,
        clamp(0.72 - ring * 0.07, 0.22, 0.72),
      );
    }

    for (let spoke = 0; spoke < 36; spoke += 1) {
      const angle = (Math.PI * 2 * spoke) / 36 + this.time * 0.06;
      const inner = 42 + pulse(this.time + spoke, 0.33, 0, 16);
      const outer = 252 + (spoke % 4) * 10;
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
          ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
          ctx.stroke();
        },
        spoke % 7 === 0 ? "amber" : "dim",
        1,
        spoke % 7 === 0 ? pulse(this.time + spoke, 1.2, 0.25, 0.74) : 0.22,
      );
    }

    const scanAngle = this.time * 0.74;
    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(scanAngle) * 280, cy + Math.sin(scanAngle) * 280);
        ctx.stroke();
      },
      "primary",
      2,
      0.76,
    );

    ctx.font = "44px 'Courier New', monospace";
    glowFillText(ctx, "WOPR", cx - 54, cy + 14, "primary", pulse(this.time, 0.65, 0.72, 1));
    ctx.font = "14px 'Courier New', monospace";
    glowFillText(ctx, "LEARNING SYSTEM ACTIVE", cx - 91, cy + 44, "cyan", 0.68);
    ctx.restore();
  }

  private drawMemoryBanks(ctx: CanvasRenderingContext2D): void {
    const x = 94;
    const y = 142;
    const width = 362;
    const height = 578;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "dim", 0.68);
    ctx.font = "16px 'Courier New', monospace";
    glowFillText(ctx, "MEMORY BANKS", x + 22, y + 28, "primary", 0.82);

    memoryLabels.forEach((label, index) => {
      const rowY = y + 66 + index * 40;
      const active = this.time > 1.08 + index * 0.24;
      const fill = active ? clamp((this.time - 1.08 - index * 0.24) / 1.19, 0, 1) : 0;
      const tone: Phosphor = label === "WARGAME" || label === "LAUNCH" ? "amber" : "primary";

      glowFillText(ctx, label, x + 22, rowY + 14, active ? tone : "dim", active ? 0.82 : 0.28);
      glowStroke(
        ctx,
        () => {
          ctx.strokeRect(x + 138, rowY, 188, 20);
          ctx.beginPath();
          ctx.rect(x + 140, rowY + 2, 184 * fill, 16);
          ctx.stroke();
        },
        active ? tone : "dim",
        1,
        active ? 0.74 : 0.24,
      );
    });
    ctx.restore();
  }

  private drawBootConsole(ctx: CanvasRenderingContext2D): void {
    const x = 1110;
    const y = 142;
    const width = 396;
    const height = 578;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "primary", 0.64);
    ctx.font = "16px 'Courier New', monospace";
    glowFillText(ctx, "EXECUTIVE CONSOLE", x + 22, y + 28, "primary", 0.82);

    this.lines.forEach((line, index) => {
      const age = this.time - line.bornAt;
      const reveal = clamp(age * 28, 0, line.text.length);
      const text = line.text.slice(0, Math.floor(reveal));
      glowFillText(ctx, text, x + 22, y + 72 + index * 34, line.tone, 0.92 - index * 0.035);
    });

    this.drawProcessingBars(ctx, x + 22, y + 410);
    ctx.restore();
  }

  private drawProcessingBars(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.font = "13px 'Courier New', monospace";
    glowFillText(ctx, "SIMULATION THREADS", x, y, "dim", 0.72);

    for (let row = 0; row < 5; row += 1) {
      const amount = pulse(this.time + row * 0.41, 0.28 + row * 0.04, 0.14, 0.96);
      const tone: Phosphor = row === 3 ? "amber" : row === 1 ? "cyan" : "primary";
      glowStroke(
        ctx,
        () => {
          ctx.strokeRect(x, y + 28 + row * 24, 282, 12);
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 34 + row * 24);
          ctx.lineTo(x + 3 + 276 * amount, y + 34 + row * 24);
          ctx.stroke();
        },
        tone,
        1,
        0.72,
      );
    }
  }

  private drawQuestion(ctx: CanvasRenderingContext2D): void {
    const amount = clamp((this.time - 6.76) / 1.51, 0, 1);

    ctx.save();
    ctx.font = "38px 'Courier New', monospace";
    ctx.textAlign = "center";
    glowFillText(ctx, "SHALL WE PLAY A GAME?", 800, 800, "primary", amount * pulse(this.time, 0.9, 0.72, 1));

    if (amount > 0.9) {
      ctx.font = "24px 'Courier New', monospace";
      glowFillText(ctx, "_", 1080, 800, "primary", pulse(this.time, 1.8, 0.05, 0.95));
    }

    ctx.restore();
  }

  private drawSignalNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = 0.08 + pulse(this.time, 12, 0, 0.06);
    ctx.fillStyle = colorFor("primary");
    ctx.fillRect(0, wrap(this.time * 77, height), width, 2);

    ctx.globalAlpha = 0.05;
    for (let index = 0; index < 20; index += 1) {
      const y = wrap(index * 83 + this.time * 19, height);
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }
}
