import type { CanvasRenderer } from "../rendering/CanvasRenderer";
import { colorFor, glowFillText, glowStroke, strokePanel, type Phosphor } from "../rendering/vector";
import type { Scene } from "../runtime/Scene";
import { clamp, pulse, wrap } from "../utils/math";

type Mark = "X" | "O";

type Move = {
  cell: number;
  mark: Mark;
};

type ScheduledGame = {
  start: number;
  duration: number;
  name: string;
  moves: Move[];
};

const GAME_START = 0.4;
const SEARCH_END = 14.3;
const LESSON_START = 14.6;
const INVITATION_START = 20.2;
const OPENING_NAMES = ["CENTER CONTROL", "CORNER OPENING", "EDGE VARIATION", "REVERSE FORK", "BLOCK MATRIX", "PERFECT DEFENSE"];

// Every sequence fills the board without creating a winning line.
const DRAW_SEQUENCES = [
  [0, 4, 8, 1, 7, 6, 2, 5, 3],
  [0, 4, 8, 2, 6, 3, 1, 7, 5],
  [1, 4, 8, 0, 2, 5, 3, 7, 6],
];

function transformCell(cell: number, variant: number): number {
  let row = Math.floor(cell / 3);
  let col = cell % 3;

  if (variant >= 4) {
    col = 2 - col;
  }

  for (let turn = 0; turn < variant % 4; turn += 1) {
    [row, col] = [col, 2 - row];
  }

  return row * 3 + col;
}

function buildSchedule(): ScheduledGame[] {
  const schedule: ScheduledGame[] = [];
  let start = GAME_START;
  let index = 0;

  while (start < SEARCH_END) {
    const duration = Math.max(0.1, 2.13 * 0.78 ** index);
    const sequence = DRAW_SEQUENCES[index % DRAW_SEQUENCES.length];
    const variant = index % 8;

    schedule.push({
      start,
      duration,
      name: OPENING_NAMES[index % OPENING_NAMES.length],
      moves: sequence.map((cell, moveIndex) => ({
        cell: transformCell(cell, variant),
        mark: moveIndex % 2 === 0 ? "X" : "O",
      })),
    });

    start += duration;
    index += 1;
  }

  return schedule;
}

const games = buildSchedule();

export class StrangeGameScene implements Scene {
  private time = 0;
  private currentGameIndex = 0;
  private visibleMoveCount = 0;
  private readonly board: Array<Mark | null> = Array(9).fill(null);

  enter(renderer: CanvasRenderer): void {
    renderer.clear();
    this.time = 0;
    this.currentGameIndex = 0;
    this.visibleMoveCount = 0;
    this.board.fill(null);
  }

  update(_deltaSeconds: number, elapsedSeconds: number): void {
    this.time = elapsedSeconds;
    this.rebuildBoard();
  }

  render(renderer: CanvasRenderer): void {
    const ctx = renderer.prepareFrame(0.24);
    this.drawBackground(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawHeader(ctx);
    this.drawBoard(ctx);
    this.drawAnalysis(ctx);
    this.drawHistory(ctx);
    this.drawLesson(ctx);
    this.drawScanNoise(ctx, renderer.logicalWidth, renderer.logicalHeight);
    this.drawInvitation(ctx, renderer.logicalWidth, renderer.logicalHeight);
  }

  private rebuildBoard(): void {
    let activeIndex = 0;
    for (let index = 1; index < games.length; index += 1) {
      if (this.time < games[index].start) {
        break;
      }
      activeIndex = index;
    }
    this.currentGameIndex = Math.max(0, activeIndex);

    const game = games[this.currentGameIndex];
    const progress = clamp((this.time - game.start) / game.duration, 0, 1);
    this.visibleMoveCount = Math.min(9, Math.floor(progress * 10));
    this.board.fill(null);

    for (let index = 0; index < this.visibleMoveCount; index += 1) {
      const move = game.moves[index];
      this.board[move.cell] = move.mark;
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.46, 70, width * 0.5, height * 0.46, width * 0.62);
    gradient.addColorStop(0, "rgba(128, 255, 154, 0.11)");
    gradient.addColorStop(0.48, "rgba(14, 58, 31, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = colorFor("dim");
    for (let x = 120; x < width - 120; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 106);
      ctx.lineTo(x, height - 90);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawHeader(ctx: CanvasRenderingContext2D): void {
    const gamesPerSecond = 1 / games[this.currentGameIndex].duration;
    const searchComplete = this.time >= SEARCH_END;

    ctx.save();
    strokePanel(ctx, 70, 48, 1460, 44, "primary", 0.62);
    ctx.font = "18px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    glowFillText(ctx, "WOPR GAME THEORY MODULE", 92, 71, "primary", 0.86);
    glowFillText(ctx, "SUBJECT: TIC-TAC-TOE", 430, 71, "cyan", 0.78);
    glowFillText(ctx, `GAME ${String(this.currentGameIndex + 1).padStart(4, "0")}`, 704, 71, "primary", 0.72);
    glowFillText(
      ctx,
      searchComplete ? "OUTCOME SEARCH: COMPLETE" : `RATE: ${gamesPerSecond.toFixed(gamesPerSecond < 10 ? 1 : 0)} GAMES/SEC`,
      900,
      71,
      searchComplete ? "amber" : "dim",
      searchComplete ? pulse(this.time, 0.8, 0.56, 0.92) : 0.72,
    );
    glowFillText(ctx, "VICTORY PATHS: 000", 1240, 71, "red", pulse(this.time, 1.1, 0.5, 0.96));
    ctx.restore();
  }

  private drawBoard(ctx: CanvasRenderingContext2D): void {
    const x = 520;
    const y = 160;
    const size = 480;
    const cell = size / 3;
    const game = games[this.currentGameIndex];

    ctx.save();
    strokePanel(ctx, x - 42, y - 42, size + 84, size + 84, "dim", 0.58);
    ctx.font = "14px 'Courier New', monospace";
    glowFillText(ctx, `${game.name} / ITERATION ${String(this.currentGameIndex + 1).padStart(4, "0")}`, x - 18, y - 18, "primary", 0.82);

    for (let index = 1; index < 3; index += 1) {
      glowStroke(
        ctx,
        () => {
          ctx.beginPath();
          ctx.moveTo(x + index * cell, y);
          ctx.lineTo(x + index * cell, y + size);
          ctx.moveTo(x, y + index * cell);
          ctx.lineTo(x + size, y + index * cell);
          ctx.stroke();
        },
        "primary",
        2,
        0.82,
      );
    }

    this.board.forEach((mark, index) => {
      if (!mark) {
        return;
      }

      const col = index % 3;
      const row = Math.floor(index / 3);
      const cx = x + col * cell + cell / 2;
      const cy = y + row * cell + cell / 2;
      const tone: Phosphor = mark === "X" ? "primary" : "cyan";
      const alpha = pulse(this.time + index, 0.42, 0.72, 1);

      if (mark === "X") {
        glowStroke(
          ctx,
          () => {
            ctx.beginPath();
            ctx.moveTo(cx - 48, cy - 48);
            ctx.lineTo(cx + 48, cy + 48);
            ctx.moveTo(cx + 48, cy - 48);
            ctx.lineTo(cx - 48, cy + 48);
            ctx.stroke();
          },
          tone,
          4,
          alpha,
        );
      } else {
        glowStroke(
          ctx,
          () => {
            ctx.beginPath();
            ctx.arc(cx, cy, 58, 0, Math.PI * 2);
            ctx.stroke();
          },
          tone,
          4,
          alpha,
        );
      }
    });

    if (this.visibleMoveCount === 9) {
      glowStroke(
        ctx,
        () => {
          ctx.strokeRect(x - 18, y - 18, size + 36, size + 36);
        },
        "amber",
        2,
        pulse(this.time, 3, 0.32, 0.82),
      );
    }
    ctx.restore();
  }

  private drawAnalysis(ctx: CanvasRenderingContext2D): void {
    const x = 92;
    const y = 160;
    const width = 342;
    const height = 544;
    const learned = clamp(this.currentGameIndex / Math.max(1, games.length - 1), 0, 1);

    ctx.save();
    strokePanel(ctx, x, y, width, height, "primary", 0.56);
    ctx.font = "15px 'Courier New', monospace";
    glowFillText(ctx, "MOVE ANALYSIS", x + 22, y + 28, "primary", 0.82);

    const labels = ["WIN", "LOSS", "DRAW", "FORK", "BLOCK", "CENTER", "CORNER", "EDGE"];
    labels.forEach((label, index) => {
      const rowY = y + 72 + index * 48;
      const value = label === "DRAW" ? clamp(0.18 + learned * 0.82, 0, 1) : Math.max(0, 0.72 - learned * 0.68 - index * 0.035);
      const tone: Phosphor = label === "DRAW" ? "primary" : value < 0.08 ? "red" : "dim";
      glowFillText(ctx, label, x + 22, rowY + 15, tone, 0.74);
      glowStroke(
        ctx,
        () => {
          ctx.strokeRect(x + 116, rowY, 184, 18);
          ctx.beginPath();
          ctx.moveTo(x + 118, rowY + 9);
          ctx.lineTo(x + 118 + value * 180, rowY + 9);
          ctx.stroke();
        },
        tone,
        1,
        label === "DRAW" ? pulse(this.time, 0.9, 0.52, 0.92) : 0.52,
      );
    });
    ctx.restore();
  }

  private drawHistory(ctx: CanvasRenderingContext2D): void {
    const x = 1084;
    const y = 160;
    const width = 424;
    const height = 544;
    const firstResult = Math.max(0, this.currentGameIndex - 9);

    ctx.save();
    strokePanel(ctx, x, y, width, height, "dim", 0.62);
    ctx.font = "15px 'Courier New', monospace";
    glowFillText(ctx, "GAME HISTORY", x + 22, y + 28, "primary", 0.82);

    for (let gameIndex = this.currentGameIndex - 1; gameIndex >= firstResult; gameIndex -= 1) {
      const row = this.currentGameIndex - 1 - gameIndex;
      const game = games[gameIndex];
      glowFillText(
        ctx,
        `${String(gameIndex + 1).padStart(4, "0")} ${game.name.slice(0, 15).padEnd(15, " ")} DRAW`,
        x + 22,
        y + 68 + row * 27,
        row < 2 ? "amber" : "dim",
        Math.max(0.3, 0.9 - row * 0.07),
      );
    }

    const game = games[this.currentGameIndex];
    ctx.font = "13px 'Courier New', monospace";
    glowFillText(ctx, "CURRENT MOVES", x + 22, y + 344, "dim", 0.72);
    game.moves.forEach((move, index) => {
      const active = index < this.visibleMoveCount;
      const rowY = y + 376 + index * 17;
      glowFillText(ctx, `${index + 1}. ${move.mark} -> CELL ${move.cell + 1}`, x + 22, rowY, active ? (move.mark === "X" ? "primary" : "cyan") : "dim", active ? 0.78 : 0.24);
    });
    ctx.restore();
  }

  private drawLesson(ctx: CanvasRenderingContext2D): void {
    const firstAmount = clamp((this.time - LESSON_START) / 1.1, 0, 1);
    const secondAmount = clamp((this.time - LESSON_START - 1.4) / 1.2, 0, 1);

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "38px 'Courier New', monospace";
    glowFillText(ctx, "A STRANGE GAME.", 800, 782, "primary", firstAmount * pulse(this.time, 0.75, 0.72, 1));
    ctx.font = "30px 'Courier New', monospace";
    glowFillText(ctx, "THE ONLY WINNING MOVE IS NOT TO PLAY.", 800, 832, "amber", secondAmount * pulse(this.time, 0.72, 0.74, 1));
    ctx.restore();
  }

  private drawScanNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = 0.08 + pulse(this.time, 10, 0, 0.05);
    ctx.fillStyle = colorFor("primary");
    ctx.fillRect(0, wrap(this.time * (96 + this.currentGameIndex * 0.8), height), width, 2);

    ctx.globalAlpha = 0.04;
    for (let index = 0; index < 22; index += 1) {
      const y = wrap(index * 71 + this.time * 19, height);
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  private drawInvitation(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const amount = clamp((this.time - INVITATION_START) / 1.15, 0, 1);

    if (amount <= 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = amount * 0.76;
    ctx.fillStyle = "#010504";
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "36px 'Courier New', monospace";
    glowFillText(
      ctx,
      "SHALL WE PLAY A NICE GAME OF CHESS?",
      width / 2,
      height / 2,
      "cyan",
      amount * pulse(this.time, 0.65, 0.78, 1),
    );
    ctx.restore();
  }
}
