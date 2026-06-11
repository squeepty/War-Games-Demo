export type Phosphor = "primary" | "dim" | "amber" | "red" | "cyan";

const colors: Record<Phosphor, string> = {
  primary: "#7cff9a",
  dim: "#2ea761",
  amber: "#ffd76a",
  red: "#ff4e4e",
  cyan: "#8df6ff",
};

export function colorFor(tone: Phosphor): string {
  return colors[tone];
}

export function glowStroke(
  ctx: CanvasRenderingContext2D,
  stroke: () => void,
  tone: Phosphor = "primary",
  width = 1,
  alpha = 1,
): void {
  ctx.save();
  ctx.strokeStyle = colors[tone];
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha * 0.34;
  ctx.shadowColor = colors[tone];
  ctx.shadowBlur = 12;
  stroke();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 0;
  stroke();
  ctx.restore();
}

export function glowFillText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tone: Phosphor = "primary",
  alpha = 1,
): void {
  ctx.save();
  ctx.fillStyle = colors[tone];
  ctx.globalAlpha = alpha * 0.36;
  ctx.shadowColor = colors[tone];
  ctx.shadowBlur = 10;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 0;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function strokePanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  tone: Phosphor = "dim",
  alpha = 0.72,
): void {
  glowStroke(
    ctx,
    () => {
      ctx.strokeRect(x, y, width, height);
    },
    tone,
    1,
    alpha,
  );
}

export function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash = 8,
  gap = 8,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  const steps = Math.floor(distance / (dash + gap));
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();

  for (let index = 0; index <= steps; index += 1) {
    const start = index * (dash + gap);
    const end = Math.min(start + dash, distance);
    ctx.moveTo(x1 + Math.cos(angle) * start, y1 + Math.sin(angle) * start);
    ctx.lineTo(x1 + Math.cos(angle) * end, y1 + Math.sin(angle) * end);
  }
}
