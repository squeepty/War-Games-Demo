import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import { colorFor, glowFillText, glowStroke, strokePanel, type Phosphor } from "../rendering/vector";
import type { Scene } from "../runtime/Scene";
import { clamp, pulse, wrap } from "../utils/math";

type Point = {
  x: number;
  y: number;
};

type Strike = {
  id: string;
  from: Point;
  to: Point;
  start: number;
  duration: number;
  yieldMt: number;
  target: string;
};

type AlertLine = {
  text: string;
  bornAt: number;
  tone: Phosphor;
};

const mapPanel = { x: 60, y: 112, width: 1048, height: 596 };
const mapSource = { x: 80, y: 160, width: 1340, height: 565 };
const mapContent = { x: 82, y: 154, width: 1004, height: 532 };

const landMasses: Point[][] = [
  [
    { x: 118, y: 235 },
    { x: 190, y: 178 },
    { x: 336, y: 188 },
    { x: 498, y: 250 },
    { x: 588, y: 352 },
    { x: 506, y: 460 },
    { x: 402, y: 444 },
    { x: 326, y: 538 },
    { x: 235, y: 468 },
    { x: 145, y: 410 },
    { x: 94, y: 320 },
  ],
  [
    { x: 692, y: 226 },
    { x: 826, y: 178 },
    { x: 1075, y: 188 },
    { x: 1224, y: 292 },
    { x: 1150, y: 414 },
    { x: 992, y: 396 },
    { x: 904, y: 520 },
    { x: 772, y: 462 },
    { x: 704, y: 350 },
  ],
  [
    { x: 552, y: 498 },
    { x: 650, y: 526 },
    { x: 718, y: 642 },
    { x: 652, y: 725 },
    { x: 580, y: 656 },
  ],
  [
    { x: 1190, y: 540 },
    { x: 1344, y: 548 },
    { x: 1406, y: 626 },
    { x: 1325, y: 710 },
    { x: 1212, y: 676 },
  ],
];

const strikes: Strike[] = [
  { id: "ICBM-041", from: { x: 1018, y: 246 }, to: { x: 414, y: 376 }, start: 2.0, duration: 8.2, yieldMt: 1.8, target: "DENVER" },
  { id: "SLBM-118", from: { x: 1240, y: 440 }, to: { x: 566, y: 316 }, start: 3.6, duration: 7.4, yieldMt: 2.2, target: "NEW YORK" },
  { id: "ICBM-203", from: { x: 964, y: 258 }, to: { x: 236, y: 386 }, start: 5.1, duration: 8.8, yieldMt: 1.2, target: "SAN FRANCISCO" },
  { id: "SLBM-077", from: { x: 720, y: 630 }, to: { x: 512, y: 596 }, start: 6.6, duration: 5.8, yieldMt: 0.9, target: "DALLAS" },
  { id: "ICBM-314", from: { x: 1050, y: 228 }, to: { x: 792, y: 322 }, start: 8.3, duration: 6.4, yieldMt: 1.6, target: "PARIS" },
  { id: "SLBM-266", from: { x: 1322, y: 392 }, to: { x: 256, y: 278 }, start: 10.0, duration: 7.1, yieldMt: 2.8, target: "SEATTLE" },
  { id: "ICBM-502", from: { x: 382, y: 354 }, to: { x: 960, y: 250 }, start: 11.7, duration: 6.9, yieldMt: 1.4, target: "MOSCOW" },
  { id: "SLBM-609", from: { x: 220, y: 500 }, to: { x: 1240, y: 390 }, start: 13.4, duration: 7.6, yieldMt: 1.1, target: "TOKYO" },
];

const warningLines = [
  "MISSILE WARNING: CONFIDENCE RISING",
  "LAUNCH POINTS CORRELATING",
  "TRAJECTORY SOLUTION UPDATED",
  "IMPACT MODEL ACCEPTED",
  "CIVIL DEFENSE CHANNEL SATURATED",
  "RETALIATORY OPTION TABLE OPEN",
  "TARGET PACKAGE DELTA REQUESTED",
  "GLOBAL CASUALTY MODEL DEFERRED",
  "ESCALATION LADDER COLLAPSE",
  "COMMAND AUTHORITY QUERY",
  "WOPR SIMULATION CHANNEL ACTIVE",
];

export class ThermonuclearWarScene implements Scene {
  private time = 0;
  private nextWarningIndex = 0;
  private warningClock = 0;
  private readonly alerts: AlertLine[] = [];

  enter(renderer: CanvasRenderer): void {
    renderer.clear();
    this.time = 0;
    this.nextWarningIndex = 0;
    this.warningClock = 0;
    this.alerts.length = 0;
    this.pushAlert("GLOBAL THERMONUCLEAR WAR", "red");
  }

  update(deltaSeconds: number, elapsedSeconds: number): void {
    this.time = elapsedSeconds;
    this.warningClock += deltaSeconds;

    if (this.warningClock > Math.max(0.42, 1.2 - this.time * 0.025)) {
      this.warningClock = 0;
      const text = warningLines[this.nextWarningIndex % warningLines.length];
      this.pushAlert(text, text.includes("WOPR") ? "cyan" : text.includes("COLLAPSE") ? "red" : "amber");
      this.nextWarningIndex += 1;
    }
  }

  render(renderer: CanvasRenderer): void {
    const ctx = renderer.prepareFrame(0.17);
    this.drawBackground(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawHeader(ctx);
    this.drawWorldMap(ctx);
    this.drawStrikePaths(ctx);
    this.drawStatusPanels(ctx);
    this.drawWarningLog(ctx);
    this.drawChaosOverlay(ctx, renderer.logicalWidth, renderer.logicalHeight);
  }

  private pushAlert(text: string, tone: Phosphor): void {
    this.alerts.unshift({ text, tone, bornAt: this.time });

    if (this.alerts.length > 8) {
      this.alerts.pop();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.43, 90, width * 0.5, height * 0.43, width * 0.72);
    gradient.addColorStop(0, "rgba(255, 70, 64, 0.13)");
    gradient.addColorStop(0.35, "rgba(90, 42, 18, 0.08)");
    gradient.addColorStop(0.78, "rgba(12, 35, 20, 0.1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = colorFor("dim");
    for (let x = 80; x <= width - 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 110);
      ctx.lineTo(x, 700);
      ctx.stroke();
    }
    for (let y = 140; y <= 700; y += 70) {
      ctx.beginPath();
      ctx.moveTo(70, y);
      ctx.lineTo(width - 70, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    strokePanel(ctx, 60, 46, 1480, 42, "red", pulse(this.time, 1.7, 0.45, 0.92));
    ctx.font = "18px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    glowFillText(ctx, "GLOBAL THERMONUCLEAR WAR", 82, 68, "red", pulse(this.time, 1.4, 0.74, 1));
    glowFillText(ctx, "WOPR SIMULATION: ACTIVE", 430, 68, "amber", 0.86);
    glowFillText(ctx, `SCENARIO ${String(1 + Math.floor(this.time * 3)).padStart(6, "0")}`, 744, 68, "primary", 0.78);
    glowFillText(ctx, `TIME TO IMPACT ${String(Math.max(0, 29 - Math.floor(this.time))).padStart(2, "0")}:00`, 1012, 68, "red", pulse(this.time, 1.1, 0.52, 1));
    glowFillText(ctx, `TRACKS ${String(this.activeStrikeCount()).padStart(2, "0")}`, 1325, 68, "amber", 0.84);
    ctx.restore();
  }

  private drawWorldMap(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = mapPanel;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "primary", 0.56);
    ctx.font = "13px 'Courier New', monospace";
    glowFillText(ctx, "GLOBAL STRIKE PROJECTION", x + 26, y + 24, "dim", 0.7);

    ctx.beginPath();
    ctx.rect(x + 2, y + 34, width - 4, height - 36);
    ctx.clip();

    for (const mass of landMasses) {
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          mass.forEach((point, index) => {
            const mapped = this.mapPoint(point);
            if (index === 0) {
              ctx.moveTo(mapped.x, mapped.y);
            } else {
              ctx.lineTo(mapped.x, mapped.y);
            }
          });
          ctx.closePath();
          ctx.stroke();
        },
        "dim",
        1,
        0.42,
      );
    }

    for (let index = 0; index < 7; index += 1) {
      const labelX = mapContent.x + 42 + index * 145;
      glowFillText(ctx, `${150 - index * 30}W`, labelX, mapContent.y + mapContent.height - 2, "dim", 0.42);
    }
    ctx.restore();
  }

  private drawStrikePaths(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapPanel.x + 2, mapPanel.y + 34, mapPanel.width - 4, mapPanel.height - 36);
    ctx.clip();
    ctx.font = "12px 'Courier New', monospace";

    for (const strike of strikes) {
      const progress = clamp((this.time - strike.start) / strike.duration, 0, 1);
      if (progress <= 0) {
        continue;
      }

      const from = this.mapPoint(strike.from);
      const to = this.mapPoint(strike.to);
      const control = {
        x: (from.x + to.x) / 2,
        y: Math.max(mapContent.y + 4, Math.min(from.y, to.y) - 105 - Math.abs(from.x - to.x) * 0.04),
      };
      const moving = this.quadraticPoint(from, control, to, progress);
      const arrived = progress >= 1;
      const tone: Phosphor = arrived ? "red" : progress > 0.68 ? "amber" : "primary";
      const alpha = arrived ? pulse(this.time + strike.start, 1.4, 0.62, 1) : 0.82;

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
          ctx.stroke();
        },
        tone,
        progress > 0.68 ? 2 : 1,
        alpha,
      );

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(moving.x, moving.y, 4 + pulse(this.time, 2.4, 0, 3), 0, Math.PI * 2);
          ctx.stroke();
        },
        tone,
        2,
        0.94,
      );

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(to.x, to.y, arrived ? 18 + pulse(this.time + strike.start, 1.8, 0, 14) : 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.moveTo(to.x - 22, to.y);
          ctx.lineTo(to.x + 22, to.y);
          ctx.moveTo(to.x, to.y - 22);
          ctx.lineTo(to.x, to.y + 22);
          ctx.stroke();
        },
        arrived ? "red" : "amber",
        arrived ? 2 : 1,
        arrived ? 0.96 : 0.54,
      );

      glowFillText(ctx, `${strike.id} ${strike.target}`, moving.x + 10, moving.y - 8, tone, 0.78);
    }

    ctx.restore();
  }

  private drawStatusPanels(ctx: CanvasRenderingContext2D): void {
    const x = 1140;
    const y = 112;

    ctx.save();
    strokePanel(ctx, x, y, 400, 596, "red", 0.62);
    ctx.font = "16px 'Courier New', monospace";
    glowFillText(ctx, "STRIKE STATUS", x + 22, y + 28, "red", 0.9);
    this.drawDefcon(ctx, x + 22, y + 62);
    this.drawStrikeTable(ctx, x + 22, y + 170);
    this.drawCasualtyModel(ctx, x + 22, y + 462);
    ctx.restore();
  }

  private drawDefcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const defcon = this.time > 14 ? 1 : this.time > 8 ? 2 : 3;
    const tone: Phosphor = defcon === 1 ? "red" : "amber";
    strokePanel(ctx, x, y, 356, 78, tone, pulse(this.time, 1.5, 0.48, 0.96));
    ctx.font = "15px 'Courier New', monospace";
    glowFillText(ctx, "READINESS CONDITION", x + 16, y + 18, tone, 0.82);
    ctx.font = "38px 'Courier New', monospace";
    glowFillText(ctx, `DEFCON ${defcon}`, x + 16, y + 60, tone, pulse(this.time, 1.1, 0.66, 1));
    ctx.font = "13px 'Courier New', monospace";
    glowFillText(ctx, defcon === 1 ? "MAXIMUM READINESS" : "ESCALATING", x + 220, y + 56, tone, 0.78);
  }

  private drawStrikeTable(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.font = "13px 'Courier New', monospace";
    glowFillText(ctx, "TRACK      TARGET       YIELD   STATE", x, y, "dim", 0.72);

    strikes.slice(0, 7).forEach((strike, index) => {
      const progress = clamp((this.time - strike.start) / strike.duration, 0, 1);
      const rowY = y + 28 + index * 32;
      const active = progress > 0;
      const state = progress >= 1 ? "IMPACT" : active ? "INFLT" : "PEND";
      const tone: Phosphor = progress >= 1 ? "red" : active ? "amber" : "dim";
      glowFillText(ctx, strike.id, x, rowY, tone, active ? 0.86 : 0.34);
      glowFillText(ctx, strike.target.slice(0, 10).padEnd(10, " "), x + 88, rowY, tone, active ? 0.86 : 0.34);
      glowFillText(ctx, `${strike.yieldMt.toFixed(1)}MT`, x + 190, rowY, tone, active ? 0.86 : 0.34);
      glowFillText(ctx, state, x + 268, rowY, tone, active ? pulse(this.time + index, 1, 0.54, 1) : 0.34);
    });
  }

  private drawCasualtyModel(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const model = clamp((this.time - 6) / 14, 0, 1);

    ctx.font = "13px 'Courier New', monospace";
    glowFillText(ctx, "SIMULATED OUTCOME MODEL", x, y, "amber", 0.8);
    glowFillText(ctx, `EXCHANGE COMPLETION ${Math.floor(model * 100)}%`, x, y + 30, "red", pulse(this.time, 0.9, 0.56, 0.96));
    glowFillText(ctx, `SURVIVAL INDEX ${Math.max(0, 84 - Math.floor(model * 84))}`, x, y + 58, "amber", 0.78);

    glowStroke(
      ctx,
      () => {
        ctx.strokeRect(x, y + 82, 330, 18);
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 91);
        ctx.lineTo(x + 2 + 326 * model, y + 91);
        ctx.stroke();
      },
      "red",
      2,
      0.82,
    );
  }

  private drawWarningLog(ctx: CanvasRenderingContext2D): void {
    const x = 60;
    const y = 736;
    const width = 1480;
    const height = 110;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "red", pulse(this.time, 1.3, 0.38, 0.76));
    ctx.font = "15px 'Courier New', monospace";
    glowFillText(ctx, "WARNING BUFFER", x + 18, y + 18, "red", 0.86);

    this.alerts.slice(0, 4).forEach((alert, index) => {
      const age = this.time - alert.bornAt;
      const reveal = clamp(age * 42, 0, alert.text.length);
      glowFillText(ctx, alert.text.slice(0, Math.floor(reveal)), x + 18, y + 46 + index * 18, alert.tone, 0.94 - index * 0.12);
    });

    glowFillText(ctx, "THIS IS A SIMULATION", x + width - 270, y + 18, "cyan", pulse(this.time, 0.7, 0.42, 0.82));
    ctx.restore();
  }

  private drawChaosOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const intensity = clamp(this.time / 18, 0, 1);
    ctx.globalAlpha = 0.08 + intensity * 0.12;
    ctx.fillStyle = colorFor(this.time > 12 ? "red" : "amber");
    ctx.fillRect(0, wrap(this.time * 164, height), width, 2 + intensity * 2);

    ctx.globalAlpha = 0.04 + intensity * 0.05;
    for (let index = 0; index < 28; index += 1) {
      const y = wrap(index * 61 + this.time * (28 + intensity * 36), height);
      ctx.fillRect(0, y, width, 1);
    }

    const flashEscalation = clamp((this.time - 2) / 20, 0, 1);
    const flashSpeed = 0.42 + flashEscalation * 1.9;
    const flashWave = pulse(this.time, flashSpeed, 0, 1);
    const flashThreshold = 0.96 - flashEscalation * 0.38;
    const flashAmount = clamp((flashWave - flashThreshold) / (1 - flashThreshold), 0, 1);

    if (flashAmount > 0) {
      ctx.globalAlpha = flashAmount * (0.025 + flashEscalation * 0.15);
      ctx.fillStyle = colorFor("red");
      ctx.fillRect(mapPanel.x + 2, mapPanel.y + 2, mapPanel.width - 4, mapPanel.height - 4);
    }
    ctx.restore();
  }

  private activeStrikeCount(): number {
    return strikes.filter((strike) => this.time > strike.start).length;
  }

  private quadraticPoint(from: Point, control: Point, to: Point, t: number): Point {
    const inverse = 1 - t;
    return {
      x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
      y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
    };
  }

  private mapPoint(point: Point): Point {
    return {
      x: mapContent.x + ((point.x - mapSource.x) / mapSource.width) * mapContent.width,
      y: mapContent.y + ((point.y - mapSource.y) / mapSource.height) * mapContent.height,
    };
  }
}
