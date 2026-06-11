export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function pulse(time: number, speed = 1, floor = 0, ceiling = 1): number {
  const value = (Math.sin(time * speed * Math.PI * 2) + 1) / 2;
  return lerp(floor, ceiling, value);
}

export function wrap(value: number, max: number): number {
  return ((value % max) + max) % max;
}
