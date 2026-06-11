import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import { colorFor, glowFillText, glowStroke, strokePanel, type Phosphor } from "../rendering/vector";
import type { Scene } from "../runtime/Scene";
import { clamp, pulse, wrap } from "../utils/math";

type ScenarioRow = {
  id: number;
  name: string;
  bornAt: number;
  losses: number;
};

const scenarioNames = [
  "US FIRST STRIKE",
  "USSR FIRST STRIKE",
  "NATO THEATER ESCALATION",
  "EUROPEAN COUNTERFORCE",
  "PACIFIC EXCHANGE",
  "LAUNCH ON WARNING",
  "MINIMUM DETERRENT",
  "DECAPITATION ATTEMPT",
  "COUNTERVALUE RESPONSE",
  "SUBMARINE ESCALATION",
  "ACCIDENTAL LAUNCH",
  "FULL RETALIATION",
];

const conclusionLines = [
  "NO VICTORY",
  "UNACCEPTABLE LOSSES",
  "SECOND STRIKE SURVIVES",
  "ESCALATION UNCONTAINED",
  "COMMAND FAILURE",
  "CIVILIZATION COLLAPSE",
];

const TIME_SCALE = 2.5;

export class SimulationScene implements Scene {
  private time = 0;
  private scenarioId = 1;
  private rowClock = 0;
  private readonly rows: ScenarioRow[] = [];

  enter(renderer: CanvasRenderer): void {
    renderer.clear();
    this.time = 0;
    this.scenarioId = 1;
    this.rowClock = 0;
    this.rows.length = 0;

    for (let index = 0; index < 8; index += 1) {
      this.pushScenario(index * 0.12);
    }
  }

  update(deltaSeconds: number, elapsedSeconds: number): void {
    this.time = elapsedSeconds * TIME_SCALE;
    this.rowClock += deltaSeconds * TIME_SCALE;

    const cadence = Math.max(0.08, 0.42 - this.time * 0.014);
    while (this.rowClock > cadence) {
      this.rowClock -= cadence;
      this.pushScenario(0);
    }
  }

  render(renderer: CanvasRenderer): void {
    const ctx = renderer.prepareFrame(0.2);
    this.drawBackground(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawHeader(ctx);
    this.drawScenarioTable(ctx);
    this.drawMatrix(ctx);
    this.drawOutcomePanel(ctx);
    this.drawProbabilityTraces(ctx);
    this.drawFinalConclusion(ctx);
    this.drawScanNoise(ctx, renderer.logicalWidth, renderer.logicalHeight);
  }

  private pushScenario(ageOffset: number): void {
    const id = this.scenarioId;
    const name = scenarioNames[id % scenarioNames.length];
    const losses = 48 + ((id * 17) % 52);
    this.rows.unshift({
      id,
      name,
      bornAt: this.time - ageOffset,
      losses,
    });
    this.scenarioId += 1;

    if (this.rows.length > 15) {
      this.rows.pop();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.44, 90, width * 0.5, height * 0.44, width * 0.72);
    gradient.addColorStop(0, "rgba(115, 255, 150, 0.12)");
    gradient.addColorStop(0.42, "rgba(38, 70, 34, 0.08)");
    gradient.addColorStop(0.74, "rgba(68, 28, 18, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = colorFor("dim");
    for (let x = 80; x < width - 80; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 110);
      ctx.lineTo(x, height - 80);
      ctx.stroke();
    }
    for (let y = 120; y < height - 70; y += 32) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(width - 60, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    strokePanel(ctx, 60, 46, 1480, 42, "primary", 0.68);
    ctx.font = "18px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    glowFillText(ctx, "WOPR STRATEGIC SIMULATION ENGINE", 82, 68, "primary", 0.88);
    glowFillText(ctx, `SIMULATION ${String(this.scenarioId).padStart(6, "0")}`, 520, 68, "cyan", 0.82);
    glowFillText(ctx, "OBJECTIVE: FIND WINNING STRATEGY", 804, 68, "amber", pulse(this.time, 0.7, 0.48, 0.88));
    glowFillText(ctx, `RATE ${String(Math.floor(8 + this.time * 5)).padStart(3, "0")}/SEC`, 1196, 68, "primary", 0.76);
    glowFillText(ctx, "RESULT: NONE", 1370, 68, "red", pulse(this.time, 1.2, 0.52, 1));
    ctx.restore();
  }

  private drawScenarioTable(ctx: CanvasRenderingContext2D): void {
    const x = 82;
    const y = 122;
    const width = 872;
    const height = 610;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "primary", 0.64);
    ctx.font = "15px 'Courier New', monospace";
    glowFillText(ctx, "SCENARIO QUEUE", x + 20, y + 26, "primary", 0.82);
    glowFillText(ctx, "ID       PLAN                         LOSSES   RESULT", x + 20, y + 62, "dim", 0.72);

    this.rows.forEach((row, index) => {
      const rowY = y + 94 + index * 32;
      const age = this.time - row.bornAt;
      const alpha = clamp(1 - index * 0.045, 0.34, 1);
      const conclusion = conclusionLines[row.id % conclusionLines.length];
      const tone: Phosphor = index < 2 ? "amber" : index < 6 ? "primary" : "dim";
      const reveal = clamp(age * 52, 0, conclusion.length);

      glowFillText(ctx, String(row.id).padStart(6, "0"), x + 20, rowY, tone, alpha);
      glowFillText(ctx, row.name.padEnd(28, " "), x + 112, rowY, tone, alpha);
      glowFillText(ctx, `${row.losses}%`, x + 430, rowY, row.losses > 78 ? "red" : "amber", alpha);
      glowFillText(ctx, conclusion.slice(0, Math.floor(reveal)), x + 520, rowY, "red", alpha * pulse(this.time + index, 1.1, 0.64, 1));
    });

    ctx.restore();
  }

  private drawMatrix(ctx: CanvasRenderingContext2D): void {
    const x = 990;
    const y = 122;
    const size = 290;

    ctx.save();
    strokePanel(ctx, x, y, size, size, "dim", 0.66);
    ctx.font = "14px 'Courier New', monospace";
    glowFillText(ctx, "OUTCOME MATRIX", x + 18, y + 24, "primary", 0.8);

    const cell = 22;
    const gridX = x + 26;
    const gridY = y + 58;
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        const value = Math.sin(this.time * 2.2 + row * 1.7 + col * 0.9);
        const hot = value > 0.65;
        const dead = value < -0.72;
        const tone: Phosphor = dead ? "red" : hot ? "amber" : "dim";
        const alpha = dead || hot ? pulse(this.time + row + col, 1.5, 0.42, 0.96) : 0.24;
        glowStroke(
          ctx,
          () => {
            ctx.strokeRect(gridX + col * cell, gridY + row * cell, 14, 14);
          },
          tone,
          1,
          alpha,
        );
      }
    }
    ctx.restore();
  }

  private drawOutcomePanel(ctx: CanvasRenderingContext2D): void {
    const x = 1310;
    const y = 122;
    const width = 230;
    const height = 290;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "red", pulse(this.time, 0.9, 0.4, 0.78));
    ctx.font = "14px 'Courier New', monospace";
    glowFillText(ctx, "STRATEGY SCORE", x + 18, y + 24, "red", 0.86);

    const labels = ["VICTORY", "SURVIVAL", "CONTROL", "STABILITY", "MORALE", "FUTURE"];
    labels.forEach((label, index) => {
      const rowY = y + 66 + index * 32;
      const value = Math.max(0, 22 - index * 3 - Math.floor(this.time * 1.2 + pulse(this.time + index, 0.4, 0, 10)));
      glowFillText(ctx, label, x + 18, rowY, index === 0 ? "red" : "amber", 0.8);
      glowFillText(ctx, String(value).padStart(2, "0"), x + 164, rowY, value === 0 ? "red" : "primary", value === 0 ? pulse(this.time, 1.4, 0.5, 1) : 0.7);
    });

    ctx.restore();
  }

  private drawProbabilityTraces(ctx: CanvasRenderingContext2D): void {
    const panels = [
      { x: 990, y: 440, width: 550, height: 120, label: "BRANCHING FACTOR", tone: "cyan" as Phosphor },
      { x: 990, y: 590, width: 550, height: 142, label: "EXTINCTION INDEX", tone: "red" as Phosphor },
    ];

    ctx.save();
    for (const panel of panels) {
      strokePanel(ctx, panel.x, panel.y, panel.width, panel.height, "dim", 0.62);
      ctx.font = "13px 'Courier New', monospace";
      glowFillText(ctx, panel.label, panel.x + 16, panel.y + 20, panel.tone, 0.78);
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          for (let i = 0; i < panel.width - 34; i += 4) {
            const t = this.time * (panel.tone === "red" ? 4.1 : 2.8) + i * 0.028;
            const slope = panel.tone === "red" ? i * 0.045 : -i * 0.018;
            const jitter = Math.sin(t) * 14 + Math.sin(t * 2.4) * 6;
            const py = panel.y + panel.height * 0.62 + jitter - slope;
            const px = panel.x + 17 + i;
            if (i === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
        },
        panel.tone,
        1,
        0.78,
      );
    }
    ctx.restore();
  }

  private drawFinalConclusion(ctx: CanvasRenderingContext2D): void {
    const amount = clamp((this.time - 14.2) / 3.75, 0, 1);
    if (amount <= 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = amount * 0.08;
    ctx.fillStyle = colorFor("primary");
    ctx.fillRect(0, 0, 1600, 900);
    ctx.font = "42px 'Courier New', monospace";
    ctx.textAlign = "center";
    glowFillText(ctx, "NO WINNING SCENARIO FOUND", 800, 810, "red", amount * pulse(this.time, 0.8, 0.7, 1));
    ctx.font = "20px 'Courier New', monospace";
    glowFillText(ctx, "CONTINUING SEARCH...", 800, 842, "dim", amount * 0.72);
    ctx.restore();
  }

  private drawScanNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = 0.08 + pulse(this.time, 12, 0, 0.08);
    ctx.fillStyle = colorFor(this.time > 12.5 ? "red" : "primary");
    ctx.fillRect(0, wrap(this.time * 142, height), width, 2);

    ctx.globalAlpha = 0.05;
    for (let index = 0; index < 30; index += 1) {
      const y = wrap(index * 53 + this.time * 31, height);
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }
}
