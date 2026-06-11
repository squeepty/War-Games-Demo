import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import { colorFor, drawDashedLine, glowFillText, glowStroke, strokePanel, type Phosphor } from "../rendering/vector";
import type { Scene } from "../runtime/Scene";
import { clamp, pulse, wrap } from "../utils/math";

type Point = {
  x: number;
  y: number;
};

type RadarReturn = {
  id: string;
  bearing: number;
  range: number;
  velocity: number;
  tone: Phosphor;
  strength: number;
};

type CityNode = {
  label: string;
  x: number;
  y: number;
  size: number;
};

type Sector = {
  id: string;
  points: Point[];
  phase: number;
};

type Message = {
  text: string;
  age: number;
};

const mapBounds = { x: 60, y: 100, width: 1085, height: 595 };
const rightPanel = { x: 1188, y: 100, width: 352, height: 595 };
const messagePanel = { x: 60, y: 725, width: 1480, height: 122 };
const MAX_VISIBLE_MESSAGES = 4;

const continent: Point[] = [
  { x: 0.09, y: 0.43 },
  { x: 0.12, y: 0.33 },
  { x: 0.18, y: 0.24 },
  { x: 0.29, y: 0.17 },
  { x: 0.41, y: 0.14 },
  { x: 0.56, y: 0.18 },
  { x: 0.71, y: 0.17 },
  { x: 0.83, y: 0.24 },
  { x: 0.91, y: 0.37 },
  { x: 0.88, y: 0.48 },
  { x: 0.79, y: 0.55 },
  { x: 0.72, y: 0.66 },
  { x: 0.61, y: 0.73 },
  { x: 0.49, y: 0.77 },
  { x: 0.37, y: 0.71 },
  { x: 0.29, y: 0.62 },
  { x: 0.18, y: 0.57 },
  { x: 0.11, y: 0.50 },
];

const cityNodes: CityNode[] = [
  { label: "SEA", x: 0.21, y: 0.31, size: 4 },
  { label: "SFO", x: 0.18, y: 0.48, size: 4 },
  { label: "LAX", x: 0.22, y: 0.55, size: 5 },
  { label: "DEN", x: 0.43, y: 0.44, size: 5 },
  { label: "OMA", x: 0.51, y: 0.39, size: 3 },
  { label: "CHI", x: 0.62, y: 0.38, size: 5 },
  { label: "WDC", x: 0.76, y: 0.49, size: 5 },
  { label: "NYC", x: 0.78, y: 0.39, size: 5 },
  { label: "MIA", x: 0.71, y: 0.72, size: 4 },
  { label: "DFW", x: 0.51, y: 0.59, size: 4 },
  { label: "SAC", x: 0.34, y: 0.51, size: 3 },
  { label: "NOR", x: 0.47, y: 0.47, size: 7 },
];

const sectors: Sector[] = [
  {
    id: "NORPAC",
    phase: 0.4,
    points: [
      { x: 0.07, y: 0.21 },
      { x: 0.35, y: 0.16 },
      { x: 0.44, y: 0.43 },
      { x: 0.18, y: 0.58 },
    ],
  },
  {
    id: "MIDCON",
    phase: 1.7,
    points: [
      { x: 0.36, y: 0.18 },
      { x: 0.64, y: 0.22 },
      { x: 0.62, y: 0.65 },
      { x: 0.40, y: 0.70 },
      { x: 0.44, y: 0.43 },
    ],
  },
  {
    id: "ATLANTIC",
    phase: 2.8,
    points: [
      { x: 0.65, y: 0.22 },
      { x: 0.93, y: 0.34 },
      { x: 0.78, y: 0.66 },
      { x: 0.62, y: 0.65 },
    ],
  },
  {
    id: "SOUTHCOM",
    phase: 3.9,
    points: [
      { x: 0.24, y: 0.58 },
      { x: 0.42, y: 0.72 },
      { x: 0.71, y: 0.74 },
      { x: 0.62, y: 0.65 },
      { x: 0.40, y: 0.70 },
    ],
  },
];

const messageBank = [
  "NORAD SYS/OPS   TRACK FILE OPEN",
  "DSP RELAY ACQUIRED",
  "SECTOR B7 RETURN VERIFIED",
  "TRAJECTORY MODEL PENDING",
  "SAC-NET HANDSHAKE COMPLETE",
  "LAUNCH PROBABILITY: INSUFFICIENT DATA",
  "AIRSPACE GRID 04 STATUS CLEAR",
  "ORBITAL SENSOR DSP-19 HANDOFF",
  "RADAR GROUP ALPHA SWEEP NOMINAL",
  "MISSILE WARNING SAMPLE MODE",
  "CRYPTO BUS LATENCY 030MS",
  "SIMULATION CHANNEL ARMED",
  "TRACK QUALITY INDEX 87.4",
  "EVALUATION ROUTINE CONTINUING",
];

export class NoradScene implements Scene {
  private time = 0;
  private sweepAngle = -Math.PI / 2;
  private messageClock = 0;
  private messageIndex = 0;
  private readonly messages: Message[] = [];

  private readonly radarReturns: RadarReturn[] = [
    { id: "A14", bearing: 0.2, range: 0.42, velocity: 0.08, tone: "primary", strength: 0 },
    { id: "K27", bearing: 1.4, range: 0.72, velocity: -0.04, tone: "cyan", strength: 0 },
    { id: "B09", bearing: 2.35, range: 0.58, velocity: 0.06, tone: "primary", strength: 0 },
    { id: "X31", bearing: 3.5, range: 0.3, velocity: 0.03, tone: "amber", strength: 0 },
    { id: "P88", bearing: 4.55, range: 0.84, velocity: -0.05, tone: "primary", strength: 0 },
    { id: "R16", bearing: 5.2, range: 0.64, velocity: 0.04, tone: "amber", strength: 0 },
  ];

  enter(): void {
    this.time = 0;
    this.sweepAngle = -Math.PI / 2;
    this.messageClock = 0;
    this.messageIndex = 0;
    this.messages.length = 0;

    for (let index = 0; index < 6; index += 1) {
      this.pushMessage();
    }
  }

  update(deltaSeconds: number, elapsedSeconds: number): void {
    this.time = elapsedSeconds;
    this.sweepAngle = wrap(this.sweepAngle + deltaSeconds * 1.35, Math.PI * 2);
    this.messageClock += deltaSeconds;

    if (this.messageClock > 1.16) {
      this.messageClock = 0;
      this.pushMessage();
    }

    for (const message of this.messages) {
      message.age += deltaSeconds;
    }

    for (const radarReturn of this.radarReturns) {
      radarReturn.bearing = wrap(radarReturn.bearing + radarReturn.velocity * deltaSeconds, Math.PI * 2);
      radarReturn.strength = Math.max(0, radarReturn.strength - deltaSeconds * 0.92);

      const delta = Math.abs(Math.atan2(Math.sin(this.sweepAngle - radarReturn.bearing), Math.cos(this.sweepAngle - radarReturn.bearing)));
      if (delta < 0.055) {
        radarReturn.strength = 1;
      }
    }
  }

  render(renderer: CanvasRenderer): void {
    const ctx = renderer.prepareFrame(0.2);
    this.drawBackground(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawHeader(ctx);
    this.drawMap(ctx);
    this.drawRadar(ctx);
    this.drawRightTelemetry(ctx);
    this.drawMessageLog(ctx);
    this.drawFooterNoise(ctx, renderer.logicalWidth, renderer.logicalHeight);
  }

  private pushMessage(): void {
    const minutes = Math.floor(this.time / 60) % 60;
    const seconds = Math.floor(this.time) % 60;
    const centis = Math.floor((this.time % 1) * 100);
    const stamp = `04:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
    const text = `${stamp}  ${messageBank[this.messageIndex % messageBank.length]}`;
    this.messageIndex += 1;
    this.messages.unshift({ text, age: 0 });

    if (this.messages.length > MAX_VISIBLE_MESSAGES) {
      this.messages.pop();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.5, 80, width * 0.5, height * 0.5, width * 0.62);
    gradient.addColorStop(0, "rgba(20, 88, 48, 0.18)");
    gradient.addColorStop(0.54, "rgba(5, 22, 14, 0.1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#154a2d";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = "20px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    strokePanel(ctx, 60, 46, 1480, 38, "dim", 0.82);
    glowFillText(ctx, "NORAD / CHEYENNE MOUNTAIN COMPLEX", 80, 66, "primary", 0.95);
    glowFillText(ctx, "MODE: EVALUATION", 500, 66, "amber", 0.82);
    glowFillText(ctx, `CLOCK 04:17:${String(Math.floor(this.time) % 60).padStart(2, "0")}`, 760, 66, "primary", 0.86);
    glowFillText(ctx, "CHANNEL: WOPR-LINK", 1010, 66, "cyan", 0.8);

    const alertPulse = pulse(this.time, 1.2, 0.42, 1);
    glowFillText(ctx, "READINESS HOLD", 1310, 66, "amber", alertPulse);
    ctx.restore();
  }

  private drawMap(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = mapBounds;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "primary", 0.76);
    ctx.font = "16px 'Courier New', monospace";
    ctx.textBaseline = "top";
    glowFillText(ctx, "CONTINENTAL AIR DEFENSE VECTOR MAP", x + 18, y + 16, "primary", 0.9);

    this.drawMapGrid(ctx);
    this.drawSectors(ctx);
    this.drawContinent(ctx);
    this.drawCityNodes(ctx);
    this.drawTrajectoryPreview(ctx);
    this.drawScanBars(ctx);
    ctx.restore();
  }

  private drawMapGrid(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = mapBounds;

    ctx.save();
    ctx.strokeStyle = colorFor("dim");
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.45;

    for (let col = 1; col < 12; col += 1) {
      const gx = x + (width / 12) * col;
      ctx.beginPath();
      ctx.moveTo(gx, y + 48);
      ctx.lineTo(gx, y + height - 28);
      ctx.stroke();
    }

    for (let row = 1; row < 8; row += 1) {
      const gy = y + 48 + ((height - 76) / 8) * row;
      ctx.beginPath();
      ctx.moveTo(x + 20, gy);
      ctx.lineTo(x + width - 20, gy);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.7;
    ctx.font = "13px 'Courier New', monospace";
    for (let col = 0; col <= 12; col += 2) {
      glowFillText(ctx, `${110 - col * 5}W`, x + (width / 12) * col + 8, y + height - 22, "dim", 0.68);
    }
    for (let row = 0; row <= 6; row += 1) {
      glowFillText(ctx, `${55 - row * 5}N`, x + 24, y + 65 + row * 68, "dim", 0.62);
    }
    ctx.restore();
  }

  private drawSectors(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = mapBounds;

    for (const sector of sectors) {
      const activity = pulse(this.time + sector.phase, 0.08, 0.18, 0.48);
      const active = pulse(this.time + sector.phase, 0.33, 0, 1) > 0.72;
      const tone: Phosphor = active ? "amber" : "dim";

      ctx.save();
      ctx.beginPath();
      sector.points.forEach((point, index) => {
        const px = x + point.x * width;
        const py = y + 48 + point.y * (height - 92);
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.closePath();
      ctx.fillStyle = active ? "rgba(255, 215, 106, 0.035)" : "rgba(124, 255, 154, 0.018)";
      ctx.fill();
      glowStroke(ctx, () => ctx.stroke(), tone, 1, activity);

      const center = sector.points.reduce(
        (acc, point) => ({ x: acc.x + point.x / sector.points.length, y: acc.y + point.y / sector.points.length }),
        { x: 0, y: 0 },
      );
      ctx.font = "15px 'Courier New', monospace";
      glowFillText(ctx, `${sector.id} ${active ? "VERIFY" : "CLEAR"}`, x + center.x * width - 45, y + 48 + center.y * (height - 92), tone, active ? 0.86 : 0.48);
      ctx.restore();
    }
  }

  private drawContinent(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = mapBounds;

    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        continent.forEach((point, index) => {
          const px = x + point.x * width;
          const py = y + 48 + point.y * (height - 92);
          if (index === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        });
        ctx.closePath();
        ctx.stroke();
      },
      "primary",
      2,
      0.92,
    );

    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(x + width * 0.25, y + height * 0.48);
        ctx.bezierCurveTo(x + width * 0.43, y + height * 0.4, x + width * 0.58, y + height * 0.41, x + width * 0.83, y + height * 0.35);
        ctx.moveTo(x + width * 0.4, y + height * 0.22);
        ctx.bezierCurveTo(x + width * 0.46, y + height * 0.38, x + width * 0.5, y + height * 0.56, x + width * 0.55, y + height * 0.76);
        ctx.stroke();
      },
      "dim",
      1,
      0.62,
    );
  }

  private drawCityNodes(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = mapBounds;

    for (const city of cityNodes) {
      const px = x + city.x * width;
      const py = y + 48 + city.y * (height - 92);
      const cityPulse = city.label === "NOR" ? pulse(this.time, 0.75, 0.7, 1) : pulse(this.time + city.x * 4, 0.28, 0.35, 0.86);
      const tone: Phosphor = city.label === "NOR" ? "amber" : "primary";

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(px, py, city.size, 0, Math.PI * 2);
          ctx.stroke();
          ctx.moveTo(px - city.size * 2.4, py);
          ctx.lineTo(px + city.size * 2.4, py);
          ctx.moveTo(px, py - city.size * 2.4);
          ctx.lineTo(px, py + city.size * 2.4);
          ctx.stroke();
        },
        tone,
        1,
        cityPulse,
      );

      ctx.font = city.label === "NOR" ? "16px 'Courier New', monospace" : "12px 'Courier New', monospace";
      glowFillText(ctx, city.label, px + 9, py - 12, tone, cityPulse);
    }
  }

  private drawTrajectoryPreview(ctx: CanvasRenderingContext2D): void {
    const activeAmount = clamp((this.time - 8) / 5.3, 0, 1);
    if (activeAmount <= 0) {
      return;
    }

    const arcs = [
      { start: { x: 1004, y: 205 }, end: { x: 695, y: 390 }, lift: -210, delay: 0, id: "T-042" },
      { start: { x: 942, y: 292 }, end: { x: 520, y: 452 }, lift: -155, delay: 0.22, id: "T-117" },
      { start: { x: 1030, y: 420 }, end: { x: 800, y: 590 }, lift: -115, delay: 0.48, id: "T-203" },
    ];

    ctx.save();
    ctx.font = "13px 'Courier New', monospace";

    for (const arc of arcs) {
      const progress = clamp(activeAmount - arc.delay, 0, 1);
      if (progress <= 0) {
        continue;
      }

      const tone: Phosphor = progress > 0.82 ? "red" : "amber";
      const alpha = progress * pulse(this.time + arc.delay, 0.9, 0.45, 1);
      const control = {
        x: (arc.start.x + arc.end.x) / 2,
        y: (arc.start.y + arc.end.y) / 2 + arc.lift,
      };

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(arc.start.x, arc.start.y);
          ctx.quadraticCurveTo(control.x, control.y, arc.end.x, arc.end.y);
          ctx.stroke();
        },
        tone,
        1,
        alpha * 0.88,
      );

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(arc.end.x, arc.end.y, 12 + progress * 6, 0, Math.PI * 2);
          ctx.stroke();
        },
        tone,
        1,
        alpha,
      );

      glowFillText(ctx, `${arc.id}  TTI ${String(13 - Math.floor(this.time % 9)).padStart(2, "0")}:00`, arc.end.x + 18, arc.end.y - 4, tone, alpha);
    }

    ctx.restore();
  }

  private drawScanBars(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = mapBounds;
    const scanY = y + 58 + wrap(this.time * 55, height - 110);

    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(x + 22, scanY);
        ctx.lineTo(x + width - 22, scanY);
        ctx.stroke();
      },
      "cyan",
      1,
      0.22,
    );
  }

  private drawRadar(ctx: CanvasRenderingContext2D): void {
    const cx = rightPanel.x + rightPanel.width / 2;
    const cy = rightPanel.y + 142;
    const radius = 82;

    ctx.save();
    ctx.font = "12px 'Courier New', monospace";
    glowFillText(ctx, "RADAR GROUP ALPHA", cx - radius, cy - radius - 12, "primary", 0.86);

    for (let ring = 1; ring <= 4; ring += 1) {
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(cx, cy, (radius / 4) * ring, 0, Math.PI * 2);
          ctx.stroke();
        },
        "dim",
        1,
        ring === 4 ? 0.78 : 0.42,
      );
    }

    for (let spoke = 0; spoke < 24; spoke += 1) {
      const angle = (Math.PI * 2 * spoke) / 24;
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
          ctx.stroke();
        },
        "dim",
        1,
        spoke % 3 === 0 ? 0.44 : 0.17,
      );
    }

    ctx.save();
    ctx.fillStyle = "rgba(124, 255, 154, 0.08)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, this.sweepAngle - 0.18, this.sweepAngle, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(this.sweepAngle) * radius, cy + Math.sin(this.sweepAngle) * radius);
        ctx.stroke();
      },
      "primary",
      2,
      0.92,
    );

    for (const radarReturn of this.radarReturns) {
      const px = cx + Math.cos(radarReturn.bearing) * radius * radarReturn.range;
      const py = cy + Math.sin(radarReturn.bearing) * radius * radarReturn.range;
      const alpha = clamp(0.24 + radarReturn.strength * 0.76 + pulse(this.time + radarReturn.range, 1.8, 0, 0.2), 0, 1);

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(px, py, 4 + radarReturn.strength * 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.moveTo(px - 10, py);
          ctx.lineTo(px + 10, py);
          ctx.moveTo(px, py - 10);
          ctx.lineTo(px, py + 10);
          ctx.stroke();
        },
        radarReturn.tone,
        1,
        alpha,
      );

      if (radarReturn.strength > 0.35) {
        glowFillText(ctx, radarReturn.id, px + 12, py - 11, radarReturn.tone, alpha);
      }
    }

    ctx.restore();
  }

  private drawRightTelemetry(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = rightPanel;
    strokePanel(ctx, x, y, width, height, "primary", 0.76);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, width - 4, height - 4);
    ctx.clip();
    ctx.font = "16px 'Courier New', monospace";
    glowFillText(ctx, "COMMAND TELEMETRY", x + 18, y + 18, "primary", 0.88);
    this.drawDefcon(ctx, x + 18, y + 242, width - 36, 58);
    this.drawSatelliteList(ctx, x + 18, y + 322);
    this.drawOscilloscope(ctx, x + 18, y + 422, 150, 62, "RADAR");
    this.drawOscilloscope(ctx, x + 184, y + 422, 150, 62, "UPLINK");
    this.drawWireframeGlobe(ctx, x + width / 2, y + 542, 44);
    ctx.restore();
  }

  private drawDefcon(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const escalated = this.time > 14.2;
    const tone: Phosphor = escalated ? "amber" : "primary";
    const activePulse = escalated ? pulse(this.time, 1.4, 0.45, 1) : 0.82;

    strokePanel(ctx, x, y, width, height, tone, activePulse);
    ctx.font = "12px 'Courier New', monospace";
    glowFillText(ctx, "READINESS CONDITION", x + 12, y + 14, tone, activePulse);
    ctx.font = "28px 'Courier New', monospace";
    glowFillText(ctx, `DEFCON ${escalated ? "3" : "4"}`, x + 12, y + 46, tone, activePulse);
    ctx.font = "11px 'Courier New', monospace";
    glowFillText(ctx, escalated ? "EVALUATION ESCALATED" : "EXERCISE CHANNEL", x + 184, y + 43, tone, activePulse * 0.86);
  }

  private drawSatelliteList(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const rows = [
      ["DSP-19", "ACQ", "082.4"],
      ["SAT-04", "TRK", "117.9"],
      ["ORB-7", "LOS", "301.2"],
      ["MIL-2", "SYNC", "044.8"],
    ];

    ctx.font = "12px 'Courier New', monospace";
    glowFillText(ctx, "ORBITAL TRACKING", x, y, "cyan", 0.78);

    rows.forEach((row, index) => {
      const rowY = y + 20 + index * 17;
      const active = pulse(this.time + index, 0.55, 0.48, 1);
      const tone: Phosphor = row[1] === "LOS" ? "amber" : "primary";
      glowFillText(ctx, row[0], x, rowY, tone, active);
      glowFillText(ctx, row[1], x + 82, rowY, tone, active);
      glowFillText(ctx, `${row[2]} DEG`, x + 154, rowY, tone, active);
    });

    glowStroke(
      ctx,
      () => {
        drawDashedLine(ctx, x, y + 94, x + 316, y + 94, 5, 7);
        ctx.stroke();
      },
      "dim",
      1,
      0.54,
    );
  }

  private drawOscilloscope(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string): void {
    strokePanel(ctx, x, y, width, height, "dim", 0.64);
    ctx.font = "12px 'Courier New', monospace";
    glowFillText(ctx, `${label} BUS`, x + 10, y + 14, "primary", 0.72);

    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        for (let i = 0; i < width - 22; i += 3) {
          const t = this.time * (label === "RADAR" ? 4.2 : 3.1) + i * 0.045;
          const jitter = Math.sin(t * 2.7) * 3 + Math.sin(t * 0.71) * 7;
          const spike = Math.sin(t * 0.23) > 0.96 ? Math.sin(t * 10) * 18 : 0;
          const px = x + 11 + i;
          const py = y + height / 2 + jitter + spike;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      },
      label === "RADAR" ? "primary" : "cyan",
      1,
      0.78,
    );
  }

  private drawWireframeGlobe(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.font = "11px 'Courier New', monospace";
    glowFillText(ctx, "GLOBAL TRACK", cx - radius, cy - radius - 8, "cyan", 0.75);

    for (let lat = -60; lat <= 60; lat += 30) {
      const y = cy + Math.sin((lat * Math.PI) / 180) * radius * 0.78;
      const rx = Math.cos((lat * Math.PI) / 180) * radius;
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.ellipse(cx, y, rx, radius * 0.17, 0, 0, Math.PI * 2);
          ctx.stroke();
        },
        "dim",
        1,
        0.45,
      );
    }

    for (let lon = 0; lon < 180; lon += 30) {
      const rot = this.time * 0.38 + (lon * Math.PI) / 180;
      const rx = Math.abs(Math.cos(rot)) * radius;
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, radius, 0, 0, Math.PI * 2);
          ctx.stroke();
        },
        "dim",
        1,
        0.34,
      );
    }

    glowStroke(
      ctx,
      () => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      },
      "cyan",
      1,
      0.76,
    );

    for (let index = 0; index < 5; index += 1) {
      const angle = this.time * 0.58 + index * 1.21;
      const px = cx + Math.cos(angle) * radius * Math.cos(index * 0.54);
      const py = cy + Math.sin(index * 0.9) * radius * 0.55;
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.stroke();
        },
        index % 2 === 0 ? "amber" : "primary",
        1,
        pulse(this.time + index, 1.1, 0.35, 0.95),
      );
    }
  }

  private drawMessageLog(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = messagePanel;
    strokePanel(ctx, x, y, width, height, "primary", 0.72);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, width - 4, height - 4);
    ctx.clip();
    ctx.font = "15px 'Courier New', monospace";
    glowFillText(ctx, "SYSTEM MESSAGE BUFFER", x + 16, y + 16, "primary", 0.86);
    glowFillText(ctx, "SOURCE: NORAD SYS/OPS", x + width - 260, y + 16, "cyan", 0.7);

    this.messages.forEach((message, index) => {
      const alpha = clamp(1 - index * 0.09, 0.32, 1);
      const rowY = y + 42 + index * 18;
      const reveal = clamp(message.age * 42, 0, message.text.length);
      const text = message.text.slice(0, Math.floor(reveal));
      glowFillText(ctx, text, x + 16, rowY, index < 2 ? "primary" : "dim", alpha);
    });
    ctx.restore();
  }

  private drawFooterNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = 0.12 + pulse(this.time, 13, 0, 0.05);
    ctx.fillStyle = colorFor("primary");
    const scanY = wrap(this.time * 91, height);
    ctx.fillRect(0, scanY, width, 2);

    ctx.globalAlpha = 0.07;
    for (let index = 0; index < 26; index += 1) {
      const y = wrap(index * 73 + this.time * 17, height);
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }
}
