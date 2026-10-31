import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_WAVES, PATH, PATH_LENGTH, PADS, SANCTUM_PADS, ENEMY_TYPES,
  TOWERS, ECONOMY, BUILD_TYPES, WAVES, BOONS,
  pointAtDistance, hpScale, waveReward, xpForLevel, damageAfterArmor,
  towerStats, towerUpgradeCost, towerInvested,
  economyIncome, economyUpgradeCost, economyInvested,
  buildSpawnQueue, waveEnemySummary, roman, defaultStats, randomBoonChoices
} from '../src/logic.js';

test('the campaign has twenty authored waves and nine mythic foes', () => {
  assert.equal(TOTAL_WAVES, 20);
  assert.equal(WAVES.length, TOTAL_WAVES);
  assert.equal(Object.keys(ENEMY_TYPES).length, 9);
  for (const wave of WAVES) {
    assert.ok(wave.name.length > 0);
    assert.ok(wave.groups.length > 0);
    for (const group of wave.groups) assert.ok(ENEMY_TYPES[group.type], `unknown enemy ${group.type}`);
  }
});

test('boss waves are spaced through the campaign and end with Abaddon', () => {
  const bosses = WAVES.filter(w => w.boss).map(w => w.boss);
  assert.deepEqual(bosses, ['goliath', 'leviathan', 'goliath', 'behemoth', 'abaddon']);
  assert.equal(WAVES[19].boss, 'abaddon');
  assert.ok(WAVES.filter(w => w.boss).length >= 4);
});

test('path helpers stay on the road and clamp at both ends', () => {
  const start = pointAtDistance(-100);
  const end = pointAtDistance(PATH_LENGTH + 100);
  assert.deepEqual({ x: start.x, y: start.y }, { x: PATH[0].x, y: PATH[0].y });
  assert.deepEqual({ x: end.x, y: end.y }, { x: PATH.at(-1).x, y: PATH.at(-1).y });
  for (let d = 10; d < PATH_LENGTH; d += 90) {
    const p = pointAtDistance(d);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(Math.abs(Math.hypot(p.dx, p.dy) - 1) < 1e-9);
  }
});

test('runes and sanctum courts are placed clear of the road', () => {
  const distanceToRoad = (x, y) => {
    let best = Infinity;
    for (let d = 0; d <= PATH_LENGTH; d += 5) {
      const p = pointAtDistance(d);
      best = Math.min(best, Math.hypot(x - p.x, y - p.y));
    }
    return best;
  };
  for (const pad of PADS) assert.ok(distanceToRoad(pad.x, pad.y) > 44, `pad ${pad.x},${pad.y}`);
  for (const pad of SANCTUM_PADS) assert.ok(distanceToRoad(pad.x, pad.y) > 44, `court ${pad.x},${pad.y}`);
  assert.equal(new Set([...PADS, ...SANCTUM_PADS].map(p => `${p.x},${p.y}`)).size, PADS.length + SANCTUM_PADS.length);
});

test('difficulty scales smoothly and rewards increase with the wave', () => {
  assert.equal(hpScale(1), 1);
  assert.ok(hpScale(20) > hpScale(10));
  assert.equal(waveReward(1), 50);
  assert.ok(waveReward(20) > waveReward(1));
  assert.ok(xpForLevel(2) > xpForLevel(1));
  assert.ok(xpForLevel(10) > xpForLevel(5));
});

test('armour pierce is bounded and never fully negates damage', () => {
  assert.equal(damageAfterArmor(100, 20, 0), 80);
  assert.equal(damageAfterArmor(100, 20, 15), 95);
  assert.equal(damageAfterArmor(100, 20, 40), 100);
  assert.equal(damageAfterArmor(10, 999, 0), 1.5);
});

test('every guardian and sanctum has four levels and known build types', () => {
  for (const [id, def] of Object.entries(TOWERS)) {
    assert.equal(def.levels.length, 4, id);
    assert.equal(def.upgrades.length, 3, id);
    assert.equal(BUILD_TYPES[id], def);
    for (let level = 1; level <= 4; level++) {
      assert.ok(towerStats(id, level));
      assert.equal(towerInvested(id, level), level === 1 ? def.cost : towerInvested(id, level - 1) + towerUpgradeCost(id, level - 1));
    }
    assert.equal(towerUpgradeCost(id, 4), null);
  }
  for (const [id, def] of Object.entries(ECONOMY)) {
    assert.equal(def.levels.length, 4, id);
    assert.equal(def.upgrades.length, 3, id);
    assert.equal(BUILD_TYPES[id], def);
    assert.equal(economyIncome(id, 1), def.levels[0]);
    assert.equal(economyInvested(id, 1), def.cost);
    assert.equal(economyUpgradeCost(id, 4), null);
  }
});

test('guardians gain damage and range with every upgrade', () => {
  for (const id of Object.keys(TOWERS)) {
    for (let level = 2; level <= 4; level++) {
      const prev = towerStats(id, level - 1);
      const next = towerStats(id, level);
      assert.ok(next.damage >= prev.damage, `${id} damage lvl ${level}`);
      assert.ok(next.range >= prev.range, `${id} range lvl ${level}`);
    }
  }
});

test('spawn queues preserve every group and are sorted by arrival time', () => {
  for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
    const queue = buildSpawnQueue(wave);
    const expected = WAVES[wave - 1].groups.reduce((n, g) => n + g.count, 0);
    assert.equal(queue.length, expected);
    for (let i = 1; i < queue.length; i++) assert.ok(queue[i].at >= queue[i - 1].at);
    const summary = waveEnemySummary(wave);
    assert.equal(summary.reduce((n, g) => n + g.count, 0), expected);
  }
});

test('boon rolls are unique, valid, and deterministic when seeded', () => {
  const values = [0.1, 0.7, 0.35, 0.9, 0.05];
  let i = 0;
  const choices = randomBoonChoices(3, () => values[i++ % values.length]);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices.map(c => c.id)).size, 3);
  for (const choice of choices) assert.ok(BOONS.includes(choice));
  assert.equal(randomBoonChoices(999).length, BOONS.length);
});

test('roman numerals and default stats match the interface', () => {
  assert.equal(roman(1), 'I');
  assert.equal(roman(4), 'IV');
  assert.equal(roman(9), 'IX');
  assert.equal(roman(14), 'XIV');
  assert.equal(roman(20), 'XX');
  assert.equal(roman(0), '');
  const stats = defaultStats();
  assert.equal(stats.towerDamage, 1);
  assert.equal(stats.heroSpeed, 1);
  assert.ok(stats.crit > 0 && stats.crit < 1);
});
