export const COUNTDOWN = 12;
export const MAX_SPEED = 80 / 3.6;
export const COLORS = ['#f5f3e9', '#303b48', '#f46057', '#4298f2', '#f6ce4c', '#42bf91'];
export type Game = { course: number; elapsed: number; position: number; speed: number; st: number | null; rivals: number[] };

export function classify(st: number) { return st < 0 ? 'F' : st >= 1 ? 'L' : 'OK'; }
export function distance(course: number) { return 140 + (course - 1) * 6; }
export function createGame(random = Math.random): Game {
  const course = 1 + Math.floor(random() * 6);
  return { course, elapsed: 0, position: -distance(course), speed: 0, st: null, rivals: Array.from({ length: 6 }, () => .06 + random() * .23) };
}
export function motion(speed: number, dt: number, throttle: boolean) {
  const acceleration = throttle ? 6 : -2.4;
  const next = Math.max(0, Math.min(MAX_SPEED, speed + acceleration * dt));
  const accelerating = (next - speed) / acceleration;
  return { speed: next, travel: speed * accelerating + acceleration * accelerating ** 2 / 2 + next * (dt - accelerating) };
}
export function advance(game: Game, dt: number, throttle: boolean): Game {
  if (game.st !== null || dt <= 0) return game;
  dt = Math.min(dt, COUNTDOWN + 1 - game.elapsed);
  const next = motion(game.speed, dt, throttle);
  if (game.position + next.travel >= 0) {
    let lo = 0, hi = dt;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (game.position + motion(game.speed, mid, throttle).travel < 0) lo = mid;
      else hi = mid;
    }
    const elapsed = game.elapsed + (lo + hi) / 2;
    return { ...game, elapsed, position: 0, speed: motion(game.speed, (lo + hi) / 2, throttle).speed, st: elapsed - COUNTDOWN };
  }
  const elapsed = game.elapsed + dt;
  return { ...game, elapsed, position: game.position + next.travel, speed: next.speed, st: elapsed >= COUNTDOWN + 1 ? 1 : null };
}
export function rivalPosition(course: number, elapsed: number, st: number) {
  const delay = COUNTDOWN + st - (distance(course) / MAX_SPEED + MAX_SPEED / 12);
  return -distance(course) + motion(0, Math.max(0, elapsed - delay), true).travel;
}
