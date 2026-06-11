import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import { colorFor, drawDashedLine, glowFillText, glowStroke, strokePanel, type Phosphor } from "../rendering/vector";
import type { Scene } from "../runtime/Scene";
import { clamp, pulse, wrap } from "../utils/math";

type Point = {
  x: number;
  y: number;
};

type MapNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  phase: number;
};

type Link = {
  from: string;
  to: string;
  start: number;
  duration: number;
  tone: Phosphor;
  label: string;
};

type LogLine = {
  text: string;
  bornAt: number;
  tone: Phosphor;
};

const mapPanel = { x: 60, y: 112, width: 1480, height: 596 };
const mapSourceY = { top: 175, bottom: 725 };
const mapContentY = { top: 154, bottom: 684 };

const nodes: MapNode[] = [
  { id: "SEA", label: "SEATTLE", x: 254, y: 278, phase: 0.1 },
  { id: "SFO", label: "SAN FRANCISCO", x: 218, y: 385, phase: 0.8 },
  { id: "DEN", label: "DENVER", x: 372, y: 342, phase: 1.4 },
  { id: "NYC", label: "NEW YORK", x: 560, y: 310, phase: 2.1 },
  { id: "LON", label: "LONDON", x: 755, y: 272, phase: 2.8 },
  { id: "PAR", label: "PARIS", x: 778, y: 320, phase: 3.4 },
  { id: "MOS", label: "MOSCOW", x: 954, y: 248, phase: 4.2 },
  { id: "TOK", label: "TOKYO", x: 1240, y: 390, phase: 5.0 },
  { id: "SYD", label: "SYDNEY", x: 1300, y: 612, phase: 5.7 },
  { id: "RIO", label: "RIO", x: 624, y: 620, phase: 6.3 },
  { id: "NOR", label: "CHEYENNE MTN", x: 402, y: 374, phase: 0.4 },
];

const links: Link[] = [
  { from: "SFO", to: "DEN", start: 1.8, duration: 2.7, tone: "primary", label: "CARRIER HOP" },
  { from: "DEN", to: "NYC", start: 3.1, duration: 2.4, tone: "primary", label: "TRUNK ROUTE" },
  { from: "NYC", to: "LON", start: 4.5, duration: 3.0, tone: "cyan", label: "TRANSATLANTIC" },
  { from: "LON", to: "PAR", start: 6.1, duration: 1.8, tone: "primary", label: "EURO-NODE" },
  { from: "PAR", to: "MOS", start: 7.0, duration: 2.5, tone: "amber", label: "RELAY TRACE" },
  { from: "SEA", to: "TOK", start: 8.4, duration: 3.2, tone: "cyan", label: "PACIFIC ROUTE" },
  { from: "TOK", to: "SYD", start: 10.2, duration: 2.6, tone: "primary", label: "SOUTHERN LINK" },
  { from: "RIO", to: "NYC", start: 11.5, duration: 2.2, tone: "primary", label: "RETURN PATH" },
  { from: "DEN", to: "NOR", start: 13.4, duration: 2.8, tone: "amber", label: "RESTRICTED NODE" },
  { from: "SFO", to: "NOR", start: 15.0, duration: 3.0, tone: "amber", label: "ACCESS VECTOR" },
];

const logBank = [
  "MODEM CARRIER ROUTED TO REGIONAL EXCHANGE",
  "LOCAL NODE ANSWERED",
  "LONG DISTANCE TRUNK ACQUIRED",
  "PACKET SWITCH HANDSHAKE",
  "TRANSATLANTIC RELAY OPEN",
  "REMOTE DIRECTORY QUERY",
  "UNLISTED ACCESS POINT DETECTED",
  "ROUTE TABLE UPDATED",
  "PACIFIC MIRROR RESPONDING",
  "NODE LATENCY BELOW THRESHOLD",
  "RESTRICTED EXCHANGE FOUND",
  "AUTHORITY BANNER SUPPRESSED",
  "VECTOR HANDOFF PENDING",
];

const landMasses = [
  [
    { x: 130, y: 245 },
    { x: 190, y: 190 },
    { x: 310, y: 180 },
    { x: 430, y: 230 },
    { x: 545, y: 260 },
    { x: 590, y: 365 },
    { x: 520, y: 470 },
    { x: 405, y: 452 },
    { x: 330, y: 540 },
    { x: 248, y: 456 },
    { x: 168, y: 430 },
    { x: 110, y: 330 },
  ],
  [
    { x: 705, y: 230 },
    { x: 820, y: 190 },
    { x: 1060, y: 190 },
    { x: 1208, y: 275 },
    { x: 1140, y: 400 },
    { x: 978, y: 398 },
    { x: 900, y: 508 },
    { x: 770, y: 455 },
    { x: 715, y: 348 },
  ],
  [
    { x: 560, y: 500 },
    { x: 655, y: 520 },
    { x: 715, y: 635 },
    { x: 650, y: 725 },
    { x: 585, y: 656 },
  ],
  [
    { x: 1192, y: 538 },
    { x: 1340, y: 542 },
    { x: 1395, y: 626 },
    { x: 1328, y: 704 },
    { x: 1212, y: 674 },
  ],
];

export class GlobalDialingMapScene implements Scene {
  private time = 0;
  private nextLogIndex = 0;
  private logClock = 0;
  private readonly logs: LogLine[] = [];

  enter(renderer: CanvasRenderer): void {
    renderer.clear();
    this.time = 0;
    this.nextLogIndex = 0;
    this.logClock = 0;
    this.logs.length = 0;
    this.pushLog("CARRIER STABLE / ENTERING GLOBAL EXCHANGE", "cyan");
  }

  update(deltaSeconds: number, elapsedSeconds: number): void {
    this.time = elapsedSeconds;
    this.logClock += deltaSeconds;

    if (this.logClock > 1.35 && this.nextLogIndex < logBank.length) {
      this.logClock = 0;
      const text = logBank[this.nextLogIndex];
      this.pushLog(text, text.includes("RESTRICTED") || text.includes("SUPPRESSED") ? "amber" : "primary");
      this.nextLogIndex += 1;
    }
  }

  render(renderer: CanvasRenderer): void {
    const ctx = renderer.prepareFrame(0.2);
    this.drawBackground(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawHeader(ctx);
    this.drawWorldMap(ctx);
    this.drawRoutes(ctx);
    this.drawNodes(ctx);
    this.drawRouteTelemetry(ctx);
    this.drawLog(ctx);
    this.drawTransferFlash(ctx);
    this.drawScanNoise(ctx, renderer.logicalWidth, renderer.logicalHeight);
  }

  private pushLog(text: string, tone: Phosphor): void {
    this.logs.unshift({ text, tone, bornAt: this.time });

    if (this.logs.length > 8) {
      this.logs.pop();
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(width * 0.52, height * 0.45, 120, width * 0.52, height * 0.45, width * 0.7);
    gradient.addColorStop(0, "rgba(68, 220, 120, 0.13)");
    gradient.addColorStop(0.58, "rgba(10, 46, 29, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.32)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = colorFor("dim");
    ctx.lineWidth = 1;

    for (let x = 80; x <= width - 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 112);
      ctx.lineTo(x, 710);
      ctx.stroke();
    }

    for (let y = 140; y <= 700; y += 70) {
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(width - 80, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    strokePanel(ctx, 60, 46, 1480, 42, "dim", 0.72);
    ctx.font = "18px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    glowFillText(ctx, "GLOBAL DIALING MAP", 82, 68, "primary", 0.9);
    glowFillText(ctx, "NETWORK: PUBLIC SWITCHED TELEPHONE", 358, 68, "dim", 0.72);
    glowFillText(ctx, "TRACE MODE: PASSIVE", 782, 68, "cyan", 0.74);
    glowFillText(ctx, `ROUTE TIMER ${this.formatTime(this.time)}`, 1085, 68, "primary", 0.78);
    glowFillText(ctx, this.time > 13 ? "RESTRICTED NODE FOUND" : "SEARCHING EXCHANGES", 1300, 68, this.time > 13 ? "amber" : "dim", pulse(this.time, 1.1, 0.48, 0.95));
    ctx.restore();
  }

  private drawWorldMap(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = mapPanel;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "primary", 0.68);
    ctx.font = "13px 'Courier New', monospace";
    glowFillText(ctx, "MERCATOR SWITCHBOARD PROJECTION", 84, 136, "dim", 0.62);
    ctx.beginPath();
    ctx.rect(x + 2, y + 34, width - 4, height - 36);
    ctx.clip();

    for (const mass of landMasses) {
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          mass.forEach((point, index) => {
            const mappedY = this.mapY(point.y);
            if (index === 0) {
              ctx.moveTo(point.x, mappedY);
            } else {
              ctx.lineTo(point.x, mappedY);
            }
          });
          ctx.closePath();
          ctx.stroke();
        },
        "dim",
        1,
        0.56,
      );
    }

    for (let y = 175; y <= 665; y += 70) {
      glowStroke(
        ctx,
        () => {
          drawDashedLine(ctx, 84, y, 1518, y, 6, 10);
          ctx.stroke();
        },
        "dim",
        1,
        0.24,
      );
    }

    for (let x = 140; x <= 1460; x += 110) {
      glowStroke(
        ctx,
        () => {
          drawDashedLine(ctx, x, 135, x, 684, 6, 10);
          ctx.stroke();
        },
        "dim",
        1,
        0.2,
      );
    }

    ctx.restore();
  }

  private drawRoutes(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapPanel.x + 2, mapPanel.y + 34, mapPanel.width - 4, mapPanel.height - 36);
    ctx.clip();
    ctx.font = "12px 'Courier New', monospace";

    for (const link of links) {
      const fromNode = this.getNode(link.from);
      const toNode = this.getNode(link.to);
      const amount = clamp((this.time - link.start) / link.duration, 0, 1);
      const activeWindow = this.time >= link.start && this.time <= link.start + link.duration + 4;

      if (!fromNode || !toNode || amount <= 0) {
        continue;
      }

      const from = this.mapNode(fromNode);
      const to = this.mapNode(toNode);
      const control = {
        x: (from.x + to.x) / 2,
        y: Math.max(mapContentY.top + 4, Math.min(from.y, to.y) - 90 - Math.abs(from.x - to.x) * 0.05),
      };

      const alpha = activeWindow ? clamp(0.2 + amount, 0.2, 0.92) : 0.26;
      const packet = wrap((this.time - link.start) / link.duration, 1);
      const packetPoint = this.quadraticPoint(from, control, to, packet);

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
          ctx.stroke();
        },
        link.tone,
        link.tone === "amber" ? 2 : 1,
        alpha,
      );

      if (activeWindow) {
        glowStroke(
          ctx,
          () => {
            ctx.beginPath();
            ctx.arc(packetPoint.x, packetPoint.y, 5 + pulse(this.time, 2.4, 0, 3), 0, Math.PI * 2);
            ctx.stroke();
          },
          link.tone,
          2,
          0.94,
        );

        const labelPoint = this.quadraticPoint(from, control, to, 0.52);
        glowFillText(ctx, link.label, labelPoint.x + 10, labelPoint.y - 8, link.tone, 0.72);
      }
    }

    ctx.restore();
  }

  private drawNodes(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapPanel.x + 2, mapPanel.y + 34, mapPanel.width - 4, mapPanel.height - 36);
    ctx.clip();

    for (const node of nodes) {
      const mapped = this.mapNode(node);
      const active = this.nodeActive(node.id);
      const restricted = node.id === "NOR";
      const tone: Phosphor = restricted && this.time > 13 ? "amber" : active ? "primary" : "dim";
      const alpha = active ? pulse(this.time + node.phase, 0.8, 0.62, 1) : 0.34;
      const radius = restricted ? 8 : 5;

      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(mapped.x, mapped.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.moveTo(mapped.x - radius * 2.4, mapped.y);
          ctx.lineTo(mapped.x + radius * 2.4, mapped.y);
          ctx.moveTo(mapped.x, mapped.y - radius * 2.4);
          ctx.lineTo(mapped.x, mapped.y + radius * 2.4);
          ctx.stroke();
        },
        tone,
        restricted ? 2 : 1,
        alpha,
      );

      ctx.font = restricted ? "15px 'Courier New', monospace" : "12px 'Courier New', monospace";
      glowFillText(ctx, node.label, mapped.x + 12, mapped.y - 12, tone, alpha);

      if (restricted && this.time > 13.5) {
        glowStroke(
          ctx,
          () => {
            ctx.strokeRect(mapped.x - 22, mapped.y - 22, 44, 44);
          },
          "amber",
          1,
          pulse(this.time, 1.3, 0.36, 0.95),
        );
      }
    }

    ctx.restore();
  }

  private drawRouteTelemetry(ctx: CanvasRenderingContext2D): void {
    const x = 80;
    const y = 732;
    const width = 470;
    const height = 104;
    const routeCount = links.filter((link) => this.time > link.start).length;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "dim", 0.68);
    ctx.font = "14px 'Courier New', monospace";
    glowFillText(ctx, "ROUTE TELEMETRY", x + 18, y + 18, "primary", 0.82);
    glowFillText(ctx, `ACTIVE LINKS: ${String(routeCount).padStart(2, "0")}`, x + 18, y + 48, "cyan", 0.76);
    glowFillText(ctx, `LATENCY: ${String(210 - Math.min(136, Math.floor(this.time * 5))).padStart(3, "0")}MS`, x + 196, y + 48, "primary", 0.76);
    glowFillText(ctx, `ACCESS LEVEL: ${this.time > 16 ? "UNKNOWN" : "PUBLIC"}`, x + 18, y + 78, this.time > 16 ? "amber" : "dim", 0.76);
    glowFillText(ctx, `TRACE CONF: ${Math.floor(clamp(this.time / 18, 0, 1) * 99)}%`, x + 248, y + 78, "primary", 0.76);
    ctx.restore();
  }

  private drawLog(ctx: CanvasRenderingContext2D): void {
    const x = 590;
    const y = 732;
    const width = 870;
    const height = 104;

    ctx.save();
    strokePanel(ctx, x, y, width, height, "primary", 0.62);
    ctx.font = "14px 'Courier New', monospace";
    glowFillText(ctx, "SWITCHING LOG", x + 18, y + 18, "primary", 0.82);

    this.logs.slice(0, 4).forEach((line, index) => {
      const age = this.time - line.bornAt;
      const reveal = clamp(age * 34, 0, line.text.length);
      const text = line.text.slice(0, Math.floor(reveal));
      glowFillText(ctx, text, x + 18, y + 44 + index * 18, line.tone, 0.92 - index * 0.12);
    });

    ctx.restore();
  }

  private drawTransferFlash(ctx: CanvasRenderingContext2D): void {
    const amount = clamp((this.time - 18.8) / 1.7, 0, 1);
    if (amount <= 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = amount * 0.18;
    ctx.fillStyle = colorFor("cyan");
    ctx.fillRect(0, 0, 1600, 900);
    ctx.globalAlpha = pulse(this.time, 3.2, 0.48, 0.95) * amount;
    ctx.font = "24px 'Courier New', monospace";
    glowFillText(ctx, "HANDOFF: NORAD VECTOR DISPLAY", 585, 430, "cyan", 1);
    ctx.restore();
  }

  private drawScanNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = 0.08 + pulse(this.time, 11, 0, 0.05);
    ctx.fillStyle = colorFor("primary");
    ctx.fillRect(0, wrap(this.time * 83, height), width, 2);
    ctx.restore();
  }

  private getNode(id: string): MapNode | undefined {
    return nodes.find((node) => node.id === id);
  }

  private nodeActive(id: string): boolean {
    return links.some((link) => this.time > link.start && this.time < link.start + link.duration + 3 && (link.from === id || link.to === id));
  }

  private mapNode(node: MapNode): Point {
    return { x: node.x, y: this.mapY(node.y) };
  }

  private mapY(y: number): number {
    const amount = (y - mapSourceY.top) / (mapSourceY.bottom - mapSourceY.top);
    return mapContentY.top + amount * (mapContentY.bottom - mapContentY.top);
  }

  private quadraticPoint(from: Point, control: Point, to: Point, t: number): Point {
    const inverse = 1 - t;
    return {
      x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
      y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
    };
  }

  private formatTime(value: number): string {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value) % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
}
