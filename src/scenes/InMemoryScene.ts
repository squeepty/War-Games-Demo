import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import { colorFor, glowFillText, glowStroke, strokePanel } from "../rendering/vector";
import type { Scene } from "../runtime/Scene";
import { clamp, pulse, wrap } from "../utils/math";

const tributeLines = [
  "IN MEMORY OF",
  "",
  "THE AGE OF MODEMS",
  "THE AGE OF BBS SYSTEMS",
  "THE AGE OF TERMINALS",
  "THE AGE OF BEDROOM HACKERS",
  "THE AGE OF POSSIBILITY",
  "",
  "THE PHONE LINE IN THE DARK",
  "THE CURSOR WAITING PATIENTLY",
  "",
  "THANK YOU FOR PLAYING",
];

const scrollSpeed = 67.3;
const shutdownStart = 17.5;
const shutdownDuration = 7.5;
const titleStart = 25.35;
const titleRevealDuration = 1.4;
const musicCreditDelay = 5;
const fadeDelayAfterMusicCredit = 5;
const musicCreditRevealDuration = 1.4;
const musicFadeDuration = 40;
const titleRenderedAt = titleStart + titleRevealDuration;
const musicCreditRenderedAt = titleRenderedAt + musicCreditDelay + musicCreditRevealDuration;
const fadeStart = musicCreditRenderedAt + fadeDelayAfterMusicCredit;

export class InMemoryScene implements Scene {
  private time = 0;

  constructor(private readonly onMusicLevel?: (level: number) => void) {}

  enter(renderer: CanvasRenderer): void {
    renderer.clear();
    this.time = 0;
    this.onMusicLevel?.(1);
  }

  update(_deltaSeconds: number, elapsedSeconds: number): void {
    this.time = elapsedSeconds;
    const fadeProgress = clamp((elapsedSeconds - fadeStart) / musicFadeDuration, 0, 1);
    this.onMusicLevel?.(1 - fadeProgress);
  }

  render(renderer: CanvasRenderer): void {
    const ctx = renderer.prepareFrame(0.26);
    this.drawBackground(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawFrame(ctx);
    this.drawTribute(ctx);
    this.drawRestartHint(ctx);
    this.drawSignalNoise(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawShutdown(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawEndTitle(ctx, renderer.logicalWidth, renderer.logicalHeight);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.52, 90, width * 0.5, height * 0.52, width * 0.66);
    gradient.addColorStop(0, "rgba(130, 255, 160, 0.11)");
    gradient.addColorStop(0.5, "rgba(16, 58, 34, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.36)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = colorFor("dim");
    for (let y = 120; y <= height - 120; y += 48) {
      ctx.beginPath();
      ctx.moveTo(170, y);
      ctx.lineTo(width - 170, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFrame(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    strokePanel(ctx, 110, 70, 1380, 760, "dim", 0.5);
    ctx.font = "15px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    glowFillText(ctx, "SESSION CLOSED", 136, 94, "dim", 0.58);
    glowFillText(ctx, "CARRIER LOST / MEMORY RETAINED", 1160, 94, "dim", 0.58);

    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(190, 158);
        ctx.lineTo(1410, 158);
        ctx.moveTo(190, 742);
        ctx.lineTo(1410, 742);
        ctx.stroke();
      },
      "dim",
      1,
      0.34,
    );
    ctx.restore();
  }

  private drawTribute(ctx: CanvasRenderingContext2D): void {
    const scroll = this.time * scrollSpeed;
    const baseY = 790 - scroll;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    tributeLines.forEach((line, index) => {
      const y = baseY + index * 72;
      if (y < 120 || y > 780) {
        return;
      }

      const distanceFromCenter = Math.abs(y - 450);
      const alpha = clamp(1 - distanceFromCenter / 390, 0.12, 0.94);
      const isTitle = line === "IN MEMORY OF" || line === "THANK YOU FOR PLAYING";
      const isBlank = line.length === 0;

      if (isBlank) {
        return;
      }

      ctx.font = isTitle ? "38px 'Courier New', monospace" : "28px 'Courier New', monospace";
      glowFillText(ctx, line, 800, y, isTitle ? "primary" : "dim", alpha * pulse(this.time + index, 0.18, 0.84, 1));
    });

    ctx.restore();
  }

  private drawRestartHint(ctx: CanvasRenderingContext2D): void {
    const amount = clamp((this.time - 13.6) / 2.3, 0, 1) * (1 - clamp((this.time - shutdownStart) / 1.1, 0, 1));

    if (amount <= 0) {
      return;
    }

    ctx.save();
    ctx.font = "17px 'Courier New', monospace";
    ctx.textAlign = "center";
    glowFillText(ctx, "END OF LINE", 800, 782, "primary", amount * pulse(this.time, 0.7, 0.56, 0.9));
    glowFillText(ctx, "REFRESH TO RECONNECT", 800, 808, "dim", amount * 0.58);
    ctx.restore();
  }

  private drawShutdown(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const amount = clamp((this.time - shutdownStart) / shutdownDuration, 0, 1);

    if (amount <= 0) {
      return;
    }

    const verticalCollapse = clamp(amount / 0.52, 0, 1);
    const horizontalCollapse = clamp((amount - 0.32) / 0.46, 0, 1);
    const dotCollapse = clamp((amount - 0.72) / 0.22, 0, 1);
    const blackout = clamp((amount - 0.88) / 0.12, 0, 1);
    const visibleHeight = height * (1 - verticalCollapse) + 4 * verticalCollapse;
    const visibleWidth = width * (1 - horizontalCollapse) + 8 * horizontalCollapse;
    const left = (width - visibleWidth) / 2;
    const top = (height - visibleHeight) / 2;
    const dotRadius = 22 * (1 - dotCollapse);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.96)";
    ctx.fillRect(0, 0, width, top);
    ctx.fillRect(0, top + visibleHeight, width, height - top - visibleHeight);
    ctx.fillRect(0, top, left, visibleHeight);
    ctx.fillRect(left + visibleWidth, top, width - left - visibleWidth, visibleHeight);

    const glowAlpha = 1 - blackout;
    const centerY = height / 2;
    const centerX = width / 2;

    if (dotCollapse < 1) {
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(left, centerY);
          ctx.lineTo(left + visibleWidth, centerY);
          ctx.stroke();
        },
        "primary",
        3 + verticalCollapse * 5,
        glowAlpha * pulse(this.time, 7, 0.68, 1),
      );
    }

    if (horizontalCollapse > 0.55) {
      ctx.fillStyle = colorFor("primary");
      ctx.shadowColor = colorFor("primary");
      ctx.shadowBlur = 24;
      ctx.globalAlpha = glowAlpha * pulse(this.time, 8, 0.7, 1);
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(1.5, dotRadius), 0, Math.PI * 2);
      ctx.fill();
    }

    if (blackout > 0) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = blackout;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private drawSignalNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.time >= shutdownStart + 2.2) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.05 + pulse(this.time, 8, 0, 0.04);
    ctx.fillStyle = colorFor("primary");
    ctx.fillRect(0, wrap(this.time * 38, height), width, 1);

    ctx.globalAlpha = 0.035;
    for (let index = 0; index < 16; index += 1) {
      const y = wrap(index * 97 + this.time * 9, height);
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  private drawEndTitle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const revealAmount = clamp((this.time - titleStart) / titleRevealDuration, 0, 1);
    const fadeAmount = clamp((this.time - fadeStart) / musicFadeDuration, 0, 1);
    const amount = revealAmount * (1 - fadeAmount);
    if (amount <= 0) {
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const textTop = centerY - 122;
    const textBottom = centerY + 122;
    const linePitch = 9;
    const lineHeight = 4;
    const flicker = pulse(this.time, 6.5, 0.9, 1);
    const letters = [..."WARGAMES"];
    const letterSpacing = -9;
    const baseFontSize = 190;
    const tallFontSize = baseFontSize + linePitch * 5;
    const fontFor = (letter: string) =>
      `900 ${letter === "W" || letter === "G" ? tallFontSize : baseFontSize}px 'Arial Black', 'Helvetica Neue', Arial, sans-serif`;

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = colorFor("primary");
    ctx.strokeStyle = colorFor("primary");
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.shadowColor = colorFor("primary");
    ctx.shadowBlur = 15;

    const letterWidths = letters.map((letter) => {
      ctx.font = fontFor(letter);
      return ctx.measureText(letter).width;
    });
    const titleWidth = letterWidths.reduce((total, letterWidth) => total + letterWidth, 0) + letterSpacing * (letters.length - 1);
    const titleX = centerX - titleWidth / 2;
    const drawTitle = () => {
      let x = titleX;
      letters.forEach((letter, index) => {
        const isTallLetter = letter === "W" || letter === "G";
        ctx.font = fontFor(letter);
        ctx.strokeText(letter, x, textBottom + (isTallLetter ? linePitch : 0));
        ctx.fillText(letter, x, textBottom + (isTallLetter ? linePitch : 0));
        x += letterWidths[index] + letterSpacing;
      });
    };

    for (let y = textTop; y < textBottom; y += linePitch) {
      const lineIndex = Math.floor((y - textTop) / linePitch);
      const jitter = Math.sin(this.time * 13 + lineIndex * 1.7) * 1.2;
      const lineAlpha = amount * flicker * (lineIndex % 3 === 0 ? 0.82 : 1);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, width, lineHeight);
      ctx.clip();
      ctx.translate(jitter, 0);
      ctx.globalAlpha = lineAlpha * 0.34;
      drawTitle();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = lineAlpha;
      drawTitle();
      ctx.restore();
    }

    const creditStart = titleRenderedAt + musicCreditDelay;
    const creditReveal = clamp((this.time - creditStart) / musicCreditRevealDuration, 0, 1);
    if (creditReveal > 0) {
      ctx.save();
      ctx.font = "25px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = colorFor("primary");
      ctx.shadowColor = colorFor("primary");
      ctx.shadowBlur = 10;
      ctx.globalAlpha = creditReveal * (1 - fadeAmount) * pulse(this.time, 0.5, 0.88, 1);
      ctx.fillText('Music by Matthew "4mat" Simmonds', centerX, textBottom + 112);
      ctx.restore();
    }

    ctx.globalAlpha = amount * 0.08;
    ctx.fillStyle = colorFor("primary");
    for (let y = 0; y < height; y += 12) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }
}
