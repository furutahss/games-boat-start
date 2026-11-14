import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance, classify, motion, rivalPosition, distance, COUNTDOWN, MAX_SPEED } from './game.ts';

test('0秒未満はF、0秒から1秒未満は成功、1秒以上はL', () => {
  assert.equal(classify(-0.00001), 'F');
  assert.equal(classify(0), 'OK');
  assert.equal(classify(.99999), 'OK');
  assert.equal(classify(1), 'L');
});
test('全6コースを抽選し、助走距離が異なる', () => {
  const games = Array.from({length: 6}, (_, i) => createGame(() => (i + .5) / 6));
  assert.deepEqual(games.map(g => g.course), [1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(games.map(g => g.position)).size, 6);
});
test('アクセルで加速し、離すと惰性で進み、最高速を超えない', () => {
  const game = createGame(() => 0);
  const fast = advance(game, 1, true);
  const coast = advance(fast, .5, false);
  assert.ok(fast.speed > 0);
  assert.ok(coast.speed < fast.speed && coast.speed > 0);
  assert.ok(coast.position > fast.position);
  assert.equal(motion(0, 100, true).speed, MAX_SPEED);
  assert.equal(motion(2, 100, false).speed, 0);
  assert.equal(game.speed, 0);
});
test('フレーム間で通過した正確な時刻を判定し、終了後は動かない', () => {
  const game = { ...createGame(() => 0), elapsed: COUNTDOWN - .05, position: -1, speed: 20 };
  const next = advance(game, .1, false);
  assert.ok(Math.abs(next.st! - .000151) < .00001);
  assert.equal(classify(next.st!), 'OK');
  assert.deepEqual(advance(next, 2, true), next);
});
test('加速の積分はフレームレートに依存しない', () => {
  const initial = createGame(() => .5);
  const single = advance(initial, 4, true);
  let many = initial;
  for (let i = 0; i < 480; i++) many = advance(many, 1 / 120, true);
  assert.ok(Math.abs(single.position - many.position) < 1e-8);
  assert.ok(Math.abs(single.speed - many.speed) < 1e-8);
});
test('操作しない場合は1秒の出遅れで終了する', () => {
  const next = advance(createGame(() => 0), COUNTDOWN + 2, false);
  assert.equal(next.st, 1);
  assert.equal(next.elapsed, COUNTDOWN + 1);
});
test('全コースで0秒を狙え、他艇も予定した時刻にラインを通過する', () => {
  for (let course = 1; course <= 6; course++) {
    const game = createGame(() => (course - .5) / 6);
    const duration = distance(course) / MAX_SPEED + MAX_SPEED / 12;
    const waiting = advance(game, COUNTDOWN + .005 - duration, false);
    const crossed = advance(waiting, duration + .01, true);
    assert.ok(Math.abs(crossed.st! - .005) < 1e-9);
    assert.equal(classify(crossed.st!), 'OK');
    assert.ok(Math.abs(rivalPosition(course, COUNTDOWN + .15, .15)) < 1e-9);
  }
});
