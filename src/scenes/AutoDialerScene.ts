import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import { colorFor, glowFillText, glowStroke, strokePanel, type Phosphor } from "../rendering/vector";
import type { Scene } from "../runtime/Scene";
import { clamp, pulse, wrap } from "../utils/math";

type DialEvent = {
  at: number;
  text: string;
  tone: Phosphor;
  hold?: number;
};

type VisibleLine = {
  text: string;
  tone: Phosphor;
  bornAt: number;
};

const MAX_TERMINAL_LINES = 12;

const dialEvents: DialEvent[] = [
  { at: 0.5, text: "WOPR ACCESS GATEWAY", tone: "dim" },
  { at: 1.5, text: "MODEM INITIALIZED", tone: "primary" },
  { at: 2.25, text: "ATZ", tone: "primary" },
  { at: 3.0, text: "OK", tone: "dim" },
  { at: 3.75, text: "ATDT 555-0137", tone: "primary" },
  { at: 5.15, text: "BUSY", tone: "amber" },
  { at: 6.2, text: "REDIALING...", tone: "dim" },
  { at: 7.2, text: "ATDT 555-0198", tone: "primary" },
  { at: 8.9, text: "NO CARRIER", tone: "amber" },
  { at: 10.1, text: "REDIALING...", tone: "dim" },
  { at: 11.15, text: "ATDT 555-2368", tone: "primary" },
  { at: 12.7, text: "RING", tone: "dim" },
  { at: 13.25, text: "RING", tone: "dim" },
  { at: 14.0, text: "CARRIER DETECTED", tone: "cyan" },
  { at: 14.85, text: "CONNECT 300 BAUD", tone: "primary", hold: 1.3 },
  { at: 16.45, text: "HANDSHAKE COMPLETE", tone: "cyan" },
  { at: 17.25, text: "REMOTE SYSTEM: WOPR", tone: "amber" },
  { at: 21.1, text: "OPENING VECTOR DISPLAY...", tone: "primary" },
];

export class AutoDialerScene implements Scene {
  private time = 0;
  private nextEventIndex = 0;
  private readonly lines: VisibleLine[] = [];

  enter(renderer: CanvasRenderer): void {
    renderer.clear();
    this.time = 0;
    this.nextEventIndex = 0;
    this.lines.length = 0;
  }

  update(_deltaSeconds: number, elapsedSeconds: number): void {
    this.time = elapsedSeconds;

    while (this.nextEventIndex < dialEvents.length && this.time >= dialEvents[this.nextEventIndex].at) {
      const event = dialEvents[this.nextEventIndex];
      this.lines.push({ text: event.text, tone: event.tone, bornAt: this.time });
      this.nextEventIndex += 1;

      if (this.lines.length > MAX_TERMINAL_LINES) {
        this.lines.shift();
      }
    }
  }

  render(renderer: CanvasRenderer): void {
    const ctx = renderer.prepareFrame(0.28);
    this.drawTerminalGlow(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawHeader(ctx);
    this.drawTerminalLines(ctx);
    this.drawDialerStatus(ctx);
    this.drawModemPanel(ctx);
    this.drawCarrierTrace(ctx);
    this.drawGreeting(ctx);
    this.drawConnectionBurst(ctx);
    this.drawScanNoise(ctx, renderer.logicalWidth, renderer.logicalHeight);
  }

  private drawTerminalGlow(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(width * 0.28, height * 0.45, 40, width * 0.28, height * 0.45, width * 0.72);
    gradient.addColorStop(0, "rgba(88, 255, 135, 0.13)");
    gradient.addColorStop(0.48, "rgba(14, 64, 35, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = colorFor("dim");
    ctx.lineWidth = 1;
    for (let x = 80; x < width - 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 66);
      ctx.lineTo(x, height - 72);
      ctx.stroke();
    }
    for (let y = 80; y < height - 60; y += 40) {
      ctx.beginPath();
      ctx.moveTo(72, y);
      ctx.lineTo(width - 72, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    strokePanel(ctx, 68, 52, 1464, 44, "dim", 0.66);
    ctx.font = "18px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    glowFillText(ctx, "AUTOMATED DIALING SEQUENCE", 90, 75, "primary", 0.84);
    glowFillText(ctx, "MODEM: HAYES COMPATIBLE", 456, 75, "dim", 0.68);
    glowFillText(ctx, "BAUD: 300", 760, 75, "dim", 0.68);
    glowFillText(ctx, "LINE: UNSECURED", 940, 75, "amber", pulse(this.time, 0.9, 0.48, 0.88));
    glowFillText(ctx, `ELAPSED ${this.formatTime(this.time)}`, 1228, 75, "cyan", 0.76);
    ctx.restore();
  }

  private drawTerminalLines(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(100, 124, 870, 526);
    ctx.clip();
    ctx.font = "30px 'Courier New', monospace";
    ctx.textBaseline = "top";

    const startX = 126;
    const startY = 150;
    const lineHeight = 39;

    this.lines.forEach((line, index) => {
      const event = dialEvents.find((candidate) => candidate.text === line.text && Math.abs(candidate.at - line.bornAt) < 2);
      const age = this.time - line.bornAt;
      const revealSpeed = line.text.length > 18 ? 20 : 14;
      const hold = event?.hold ?? 0;
      const reveal = clamp(age * revealSpeed, 0, line.text.length);
      const text = line.text.slice(0, Math.floor(reveal));
      const y = startY + index * lineHeight;
      const alpha = clamp(1 - Math.max(0, this.lines.length - index - 13) * 0.11, 0.32, 1);
      const flicker = line.tone === "amber" ? pulse(this.time + index, 2.6, 0.62, 1) : 1;

      glowFillText(ctx, text, startX, y, line.tone, alpha * flicker);

      if (hold > 0 && age > 0.8) {
        glowStroke(
          ctx,
          () => {
            ctx.beginPath();
            ctx.moveTo(startX, y + 35);
            ctx.lineTo(startX + clamp((age / hold) * 360, 0, 360), y + 35);
            ctx.stroke();
          },
          line.tone,
          2,
          0.64,
        );
      }
    });

    const cursorY = startY + this.lines.length * lineHeight;
    const cursorAlpha = pulse(this.time, 1.8, 0.05, 0.95);
    glowFillText(ctx, "_", startX, cursorY, "primary", cursorAlpha);
    ctx.restore();
  }

  private drawDialerStatus(ctx: CanvasRenderingContext2D): void {
    const attempts = Math.min(3, Math.max(0, Math.floor((this.time - 3.5) / 3.5) + 1));
    const connected = this.time > 14.6;
    const x = 1015;
    const y = 154;

    ctx.save();
    strokePanel(ctx, x, y, 440, 210, connected ? "primary" : "dim", connected ? 0.84 : 0.62);
    ctx.font = "17px 'Courier New', monospace";
    glowFillText(ctx, "DIALER CONTROL", x + 24, y + 28, "primary", 0.82);
    glowFillText(ctx, `ATTEMPTS: ${attempts}/3`, x + 24, y + 68, "dim", 0.78);
    glowFillText(ctx, `STATUS: ${connected ? "CONNECTED" : this.currentStatus()}`, x + 24, y + 102, connected ? "primary" : "amber", connected ? 0.9 : pulse(this.time, 1.2, 0.5, 0.92));
    glowFillText(ctx, `CARRIER: ${connected ? "LOCKED" : "SEARCH"}`, x + 24, y + 136, connected ? "cyan" : "dim", 0.78);
    glowFillText(ctx, `REMOTE ID: ${this.time > 16.8 ? "WOPR" : "---------"}`, x + 24, y + 170, this.time > 16.8 ? "amber" : "dim", 0.78);

    for (let index = 0; index < 3; index += 1) {
      const bx = x + 315 + index * 32;
      const alpha = index < attempts ? pulse(this.time + index, 0.65, 0.5, 1) : 0.18;
      glowStroke(
        ctx,
        () => {
          ctx.strokeRect(bx, y + 60, 18, 118);
        },
        index < attempts ? (connected ? "primary" : "amber") : "dim",
        1,
        alpha,
      );
    }
    ctx.restore();
  }

  private drawModemPanel(ctx: CanvasRenderingContext2D): void {
    const x = 1015;
    const y = 396;
    const width = 440;
    const height = 206;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "dim", 0.66);
    ctx.font = "15px 'Courier New', monospace";
    glowFillText(ctx, "ACOUSTIC MODEM MONITOR", x + 22, y + 24, "primary", 0.78);

    const labels = ["AA", "CD", "RD", "SD", "TR", "OH"];
    labels.forEach((label, index) => {
      const ledX = x + 34 + index * 64;
      const active = this.ledActive(index);
      glowFillText(ctx, label, ledX - 10, y + 72, active ? "primary" : "dim", active ? pulse(this.time + index, 1.4, 0.55, 1) : 0.22);
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(ledX, y + 104, 9, 0, Math.PI * 2);
          ctx.stroke();
        },
        active ? "primary" : "dim",
        2,
        active ? pulse(this.time + index, 1.6, 0.55, 1) : 0.2,
      );
    });

    glowFillText(ctx, `SIGNAL ${this.time > 14.2 ? "27.8 DB" : "--.- DB"}`, x + 22, y + 158, this.time > 14.2 ? "cyan" : "dim", 0.72);
    glowFillText(ctx, `LINE NOISE ${this.time > 14.2 ? "LOW" : "HIGH"}`, x + 220, y + 158, this.time > 14.2 ? "primary" : "amber", 0.72);
    ctx.restore();
  }

  private drawCarrierTrace(ctx: CanvasRenderingContext2D): void {
    const x = 126;
    const y = 670;
    const width = 1328;
    const height = 92;
    const connected = this.time > 14.2;

    ctx.save();
    strokePanel(ctx, x, y, width, height, connected ? "cyan" : "dim", connected ? 0.72 : 0.58);
    ctx.font = "14px 'Courier New', monospace";
    glowFillText(ctx, "CARRIER TRACE", x + 18, y + 18, connected ? "cyan" : "dim", 0.76);

    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        for (let i = 0; i < width - 44; i += 4) {
          const t = this.time * (connected ? 8.5 : 5.4) + i * 0.035;
          const carrier = Math.sin(t) * (connected ? 16 : 8);
          const hiss = Math.sin(t * 3.17) * (connected ? 3 : 13);
          const dropout = !connected && Math.sin(t * 0.11) > 0.86 ? Math.sin(t * 9) * 18 : 0;
          const px = x + 22 + i;
          const py = y + height / 2 + carrier + hiss + dropout;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      },
      connected ? "cyan" : "primary",
      1,
      connected ? 0.84 : 0.55,
    );

    ctx.restore();
  }

  private drawConnectionBurst(ctx: CanvasRenderingContext2D): void {
    const amount = clamp((this.time - 21.25) / 1.8, 0, 1);
    if (amount <= 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = amount * 0.26;
    ctx.fillStyle = colorFor("primary");
    ctx.fillRect(0, 0, 1600, 900);
    ctx.globalAlpha = amount;
    ctx.font = "24px 'Courier New', monospace";
    glowFillText(ctx, "VECTOR DISPLAY TRANSFER", 626, 432, "primary", pulse(this.time, 3, 0.55, 1));
    ctx.restore();
  }

  private drawGreeting(ctx: CanvasRenderingContext2D): void {
    const revealAmount = clamp((this.time - 18.05) * 15, 0, 27);
    const fadeAmount = 1 - clamp((this.time - 21) / 0.35, 0, 1);

    if (revealAmount <= 0 || fadeAmount <= 0) {
      return;
    }

    const greeting = "GREETINGS PROFESSOR FALKEN.";

    ctx.save();
    ctx.fillStyle = "rgba(1, 5, 4, 0.9)";
    ctx.fillRect(350, 326, 900, 190);
    strokePanel(ctx, 350, 326, 900, 190, "primary", 0.82 * fadeAmount);
    ctx.textAlign = "center";
    ctx.font = "38px 'Courier New', monospace";
    glowFillText(
      ctx,
      greeting.slice(0, Math.floor(revealAmount)),
      800,
      414,
      "primary",
      fadeAmount * pulse(this.time, 0.7, 0.82, 1),
    );
    ctx.font = "18px 'Courier New', monospace";
    glowFillText(ctx, "WOPR SESSION ESTABLISHED", 800, 466, "cyan", fadeAmount * 0.76);
    ctx.restore();
  }

  private drawScanNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = 0.09 + pulse(this.time, 9.5, 0, 0.08);
    ctx.fillStyle = colorFor("primary");
    ctx.fillRect(0, wrap(this.time * 118, height), width, 2);

    ctx.globalAlpha = 0.07;
    for (let index = 0; index < 16; index += 1) {
      const y = wrap(index * 97 + this.time * 21, height);
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  private ledActive(index: number): boolean {
    if (index === 0 || index === 5) {
      return this.time > 2.4;
    }

    if (index === 1) {
      return this.time > 14.2;
    }

    return Math.sin(this.time * (index + 3.4)) > (this.time > 14.2 ? -0.3 : 0.25);
  }

  private currentStatus(): string {
    if (this.time < 4.8) {
      return "DIALING";
    }

    if (this.time < 6.2) {
      return "BUSY";
    }

    if (this.time < 8.7) {
      return "DIALING";
    }

    if (this.time < 10.0) {
      return "NO CARRIER";
    }

    if (this.time < 14.2) {
      return "DIALING";
    }

    return "CARRIER";
  }

  private formatTime(value: number): string {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value) % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
}
