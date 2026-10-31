// ---------------------------------------------------------------------------
// Update loop

function updatePlay(dt) {
  state.time += dt;

  if (state.phase === 'wave') {
    state.elapsed += dt;
    while (state.spawnIndex < state.spawnQueue.length && state.elapsed >= state.spawnQueue[state.spawnIndex].at) {
      spawnEnemy(state.spawnQueue[state.spawnIndex].type);
      state.spawnIndex++;
    }
  }

  updateHero(dt);

  if (state.phase === 'wave') {
    updateEnemies(dt);
    if (state.phase === 'wave') updateTowers(dt);
  }

  updateProjectiles(dt);
  updatePools(dt);
  updateEffects(dt);
  updateParticles(dt);
  updateFloaters(dt);

  if (state.gateFlash > 0) state.gateFlash = Math.max(0, state.gateFlash - dt * 1.6);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);

  if (state.phase === 'wave' && state.spawnIndex >= state.spawnQueue.length && state.enemies.length === 0) {
    completeWave();
  }
}

function updateHero(dt) {
  const h = state.hero;
  h.hurtFlash = Math.max(0, h.hurtFlash - dt * 1.5);
  h.cast = Math.max(0, h.cast - dt * 2.2);
  h.atkCd -= dt;
  for (const k of Object.keys(h.cooldowns)) h.cooldowns[k] = Math.max(0, h.cooldowns[k] - dt);
  if (h.shieldT > 0) {
    h.shieldT -= dt;
    if (h.shieldT <= 0) h.shield = 0;
  }

  h.mana = Math.min(h.maxMana, h.mana + dt * 5 * state.stats.manaRegen);

  if (h.dead) {
    h.respawn -= dt;
    if (h.respawn <= 0) {
      h.dead = false;
      h.hp = Math.round(h.maxHp * 0.55);
      h.mana = h.maxMana * 0.5;
      h.x = HERO_START.x;
      h.y = HERO_START.y;
      h.moveTarget = null;
      h.shield = 0;
      ringFx(h.x, h.y, 12, 90, 'rgba(126, 232, 210, ALPHA)', 0.9);
      showToast('The Bearer returns to the Gate.', 'teal');
    }
    return;
  }

  let vx = 0;
  let vy = 0;
  if (keys.has('w') || keys.has('arrowup')) vy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) vy += 1;
  if (keys.has('a') || keys.has('arrowleft')) vx -= 1;
  if (keys.has('d') || keys.has('arrowright')) vx += 1;

  if (vx || vy) {
    h.moveTarget = null;
    const len = Math.hypot(vx, vy) || 1;
    const speed = 232 * state.stats.heroSpeed;
    h.x += (vx / len) * speed * dt;
    h.y += (vy / len) * speed * dt;
    h.moving = true;
    h.walk += dt;
    if (vx) h.facing = Math.sign(vx);
  } else if (h.moveTarget) {
    const dx = h.moveTarget.x - h.x;
    const dy = h.moveTarget.y - h.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      h.moveTarget = null;
      h.moving = false;
    } else {
      const speed = 232 * state.stats.heroSpeed;
      h.x += (dx / d) * speed * dt;
      h.y += (dy / d) * speed * dt;
      h.moving = true;
      h.walk += dt;
      if (Math.abs(dx) > 2) h.facing = Math.sign(dx);
    }
  } else {
    h.moving = false;
  }

  h.x = clamp(h.x, 70, 1230);
  h.y = clamp(h.y, 72, 820);

  if (!h.moving && state.phase === 'wave') {
    const target = nearestEnemy(h.x, h.y, 280);
    if (target) h.facing = target.x < h.x ? -1 : 1;
  }

  if (h.atkCd <= 0 && state.phase === 'wave') {
    const target = nearestEnemy(h.x, h.y, 238);
    if (target) {
      const damage = (h.baseAtk + (h.level - 1) * 4) * state.stats.heroDamage;
      state.projectiles.push({
        kind: 'bolt', x: h.x, y: h.y - 38, target,
        speed: 720, damage, pierce: 5, color: 'teal',
        critChance: state.stats.crit, critMult: state.stats.critMult,
        trail: [], ttl: 2.4
      });
      h.atkCd = 1 / h.atkRate;
      h.cast = 0.35;
      audio.sfx('bolt');
      for (let i = 0; i < 3; i++) {
        addParticle(h.x - h.facing * 12, h.y - 40, {
          vx: rand(-20, 20) - h.facing * 30, vy: rand(-26, 4),
          life: rand(0.2, 0.45), size: rand(1, 2), color: 'rgba(170, 255, 230, 0.8)', additive: true
        });
      }
    }
  }
}

function nearestEnemy(x, y, range) {
  let best = null;
  let bestD = range;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d = dist(x, y, e.x, e.y) - e.radius;
    if (d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

function enemiesInRange(x, y, range) {
  return state.enemies.filter(e => !e.dead && dist(x, y, e.x, e.y) <= range + e.radius);
}

/* ----------------------------------------------------------------- Enemies */

function spawnEnemy(type, opts = {}) {
  const def = ENEMY_TYPES[type];
  if (!def) return null;
  const scale = opts.scale ?? (def.boss ? 1 : hpScale(state.wave));
  const maxHp = Math.round(def.hp * scale);
  const startDist = opts.dist ?? 0;
  const p = pointAtDistance(startDist);
  const e = {
    id: nextId++,
    type,
    name: def.name,
    x: p.x,
    y: p.y,
    dist: startDist,
    angle: p.angle,
    hp: maxHp,
    maxHp,
    speed: def.speed,
    armor: def.armor || 0,
    bounty: def.bounty,
    xp: def.xp,
    gateDamage: def.gateDamage || 1,
    radius: def.radius,
    flying: !!def.flying,
    boss: !!def.boss,
    color: def.color,
    seed: Math.random() * 10,
    slow: 0,
    slowT: 0,
    stun: 0,
    poison: 0,
    poisonT: 0,
    burn: 0,
    burnT: 0,
    flash: 0,
    meleeCd: rand(0.4, 1.2),
    specialCd: def.boss ? 5.5 : 0,
    healCd: 0,
    adds: 0,
    dead: false
  };
  state.enemies.push(e);
  ringFx(e.x, e.y, 6, 34, 'rgba(232, 201, 122, ALPHA)', 0.55);
  burst(e.x, e.y, 6, def.color, 1.4, 0.5);

  if (def.boss && !opts.add) {
    audio.sfx('boss');
    state.shake = Math.max(state.shake, 9);
    showToast(`${def.name.toUpperCase()} has entered the road.`, 'bad', 4600);
  }
  return e;
}

function updateEnemies(dt) {
  const h = state.hero;
  for (const e of state.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt * 5);

    if (e.slowT > 0) {
      e.slowT -= dt;
      if (e.slowT <= 0) e.slow = 0;
    }

    if (e.poisonT > 0) {
      e.poisonT -= dt;
      if (e.poisonT <= 0) e.poison = 0;
      else {
        damageEnemy(e, e.poison * dt, { silent: true, pierce: 999, color: '#8edf8a' });
        if (Math.random() < dt * 5) {
          addParticle(e.x + rand(-8, 8), e.y - rand(2, 16), {
            vx: rand(-6, 6), vy: rand(-20, -6), life: rand(0.4, 0.9),
            size: rand(1, 2.2), color: 'rgba(130, 235, 140, 0.7)', additive: true
          });
        }
      }
    }

    if (e.burnT > 0) {
      e.burnT -= dt;
      if (e.burnT <= 0) e.burn = 0;
      else {
        damageEnemy(e, e.burn * dt, { silent: true, pierce: 999, color: '#ffb064' });
        if (Math.random() < dt * 6) {
          addParticle(e.x + rand(-7, 7), e.y - rand(2, 18), {
            vx: rand(-10, 10), vy: rand(-30, -10), life: rand(0.3, 0.7),
            size: rand(1, 2.4), color: 'rgba(255, 170, 90, 0.8)', additive: true
          });
        }
      }
    }

    if (e.dead) continue;

    if (e.stun > 0) {
      e.stun -= dt;
      continue;
    }

    const speedMul = 1 - e.slow;
    e.dist += e.speed * speedMul * dt;
    const p = pointAtDistance(e.dist);
    e.x = p.x;
    e.y = p.y;
    e.angle = p.angle;

    if (e.dist >= PATH_LENGTH) {
      hitGate(e);
      continue;
    }

    if (e.type === 'plaguebearer') {
      e.healCd -= dt;
      if (e.healCd <= 0) {
        e.healCd = 1;
        for (const other of state.enemies) {
          if (other.dead || other === e) continue;
          if (dist(e.x, e.y, other.x, other.y) < 105 && other.hp < other.maxHp) {
            other.hp = Math.min(other.maxHp, other.hp + (e.boss ? 20 : 9) * (1 + state.wave * 0.04));
            addParticle(other.x + rand(-8, 8), other.y - rand(4, 18), {
              vx: rand(-4, 4), vy: rand(-12, -2), life: rand(0.4, 0.8),
              size: rand(1, 2), color: 'rgba(140, 230, 140, 0.45)', additive: true
            });
          }
        }
      }
    }

    e.meleeCd -= dt;
    if (!h.dead && e.meleeCd <= 0 && dist(e.x, e.y, h.x, h.y) < e.radius + 22) {
      e.meleeCd = e.boss ? 1.2 : 1.5;
      const dmg = e.boss ? 14 + state.wave * 0.8 : 5 + state.wave * 0.35;
      damageHero(dmg);
      addParticle(h.x, h.y - 20, {
        vx: rand(-30, 30), vy: rand(-30, 10), life: 0.4,
        size: 2, color: 'rgba(255, 120, 90, 0.7)', additive: true
      });
    }

    if (e.boss) updateBoss(e, dt);
    if (e.dead) continue;
  }

  state.enemies = state.enemies.filter(e => !e.dead);
}

function updateBoss(e, dt) {
  e.specialCd -= dt;
  if (e.specialCd > 0) return;

  const def = ENEMY_TYPES[e.type];
  const h = state.hero;
  if (def.special === 'slam') {
    e.specialCd = 7.5;
    ringFx(e.x, e.y, 10, 150, 'rgba(255, 180, 120, ALPHA)', 0.6);
    state.shake = Math.max(state.shake, 6);
    if (!h.dead && dist(e.x, e.y, h.x, h.y) < 190) damageHero(32);
    audio.sfx('gate');
  } else if (def.special === 'brood') {
    e.specialCd = 9;
    if (e.adds < 5) {
      for (let i = 0; i < 2; i++) {
        spawnEnemy('watcher', { dist: Math.max(0, e.dist - 30 - i * 20), scale: hpScale(state.wave) * 0.9, add: true });
        e.adds++;
      }
      ringFx(e.x, e.y, 20, 90, 'rgba(140, 170, 255, ALPHA)', 0.7);
    }
  } else if (def.special === 'quake') {
    e.specialCd = 9.5;
    state.shake = Math.max(state.shake, 11);
    ringFx(e.x, e.y, 16, 280, 'rgba(255, 150, 90, ALPHA)', 0.8);
    for (const tower of state.towers) {
      if (dist(tower.x, tower.y, e.x, e.y) < 280) tower.stun = Math.max(tower.stun, 1.5);
    }
    audio.sfx('gate');
  } else if (def.special === 'abyss') {
    e.specialCd = 7;
    if (e.adds < 9) {
      for (let i = 0; i < 3; i++) {
        spawnEnemy('locust', { dist: Math.max(0, e.dist - 40 - i * 18), add: true });
        e.adds++;
      }
    }
    e.hp = Math.min(e.maxHp, e.hp + 250);
    if (!h.dead && dist(e.x, e.y, h.x, h.y) < 300) damageHero(40);
    ringFx(e.x, e.y, 20, 180, 'rgba(190, 50, 60, ALPHA)', 0.8);
    state.shake = Math.max(state.shake, 8);
    audio.sfx('boss');
  }
}

function damageEnemy(e, raw, opts = {}) {
  if (!e || e.dead) return 0;
  let amount = damageAfterArmor(raw, e.armor, opts.pierce ?? 0);
  let crit = false;
  if (opts.critChance && Math.random() < opts.critChance) {
    amount *= opts.critMult || 1.9;
    crit = true;
  }
  e.hp -= amount;
  e.flash = Math.max(e.flash, 0.18);

  if (opts.slow) {
    e.slow = Math.max(e.slow, opts.slow);
    e.slowT = Math.max(e.slowT, opts.slowTime || 2);
  }
  if (opts.stun) e.stun = Math.max(e.stun, opts.stun);
  if (opts.poison) {
    e.poison = Math.max(e.poison, opts.poison);
    e.poisonT = Math.max(e.poisonT, opts.poisonTime || 3);
  }
  if (opts.burn) {
    e.burn = Math.max(e.burn, opts.burn);
    e.burnT = Math.max(e.burnT, opts.burnTime || 3);
  }

  if (!opts.silent) {
    addFloater(e.x + rand(-6, 6), e.y - e.radius - 8, Math.round(amount).toString(), opts.color || (crit ? '#ffe08a' : '#f4ead4'), { crit });
    if (opts.colorHits !== false) {
      for (let i = 0; i < (crit ? 7 : 3); i++) {
        addParticle(e.x, e.y - e.radius * 0.4, {
          vx: rand(-70, 70), vy: rand(-70, 30), life: rand(0.18, 0.5),
          size: rand(1, crit ? 3 : 2), color: opts.color || 'rgba(255, 220, 160, 0.8)', additive: true
        });
      }
      audio.sfx('hit');
    }
  }

  if (e.hp <= 0) killEnemy(e);
  return amount;
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  state.kills++;
  const bounty = Math.round(e.bounty);
  state.gold += bounty;
  state.goldEarned += bounty;
  addFloater(e.x, e.y - e.radius - 14, `+${bounty}`, '#e8c97a', { kind: 'gold' });

  const xp = Math.max(1, Math.round(e.xp * state.stats.xpGain));
  gainXp(xp);

  const color = e.boss ? '#ff9a6a' : ENEMY_TYPES[e.type].color;
  burst(e.x, e.y - e.radius * 0.3, e.boss ? 40 : 10, color, e.boss ? 3.6 : 1.8, e.boss ? 1.3 : 0.7);
  if (e.boss) {
    state.shake = Math.max(state.shake, 15);
    ringFx(e.x, e.y, 20, 240, 'rgba(255, 210, 140, ALPHA)', 1.1);
    showToast(`${e.name} has fallen. The Gate holds.`, 'good', 4200);
    for (let i = 0; i < 24; i++) {
      addParticle(e.x, e.y - 20, {
        vx: rand(-150, 150), vy: rand(-160, 40), life: rand(0.7, 1.6),
        size: rand(1.5, 3.6), color: 'rgba(255, 224, 147, 0.9)', additive: true, shape: 'coin', shrink: true
      });
    }
  }
  audio.sfx('death');
}

function gainXp(amount) {
  const h = state.hero;
  h.xp += amount;
  let leveled = false;
  while (h.xp >= h.xpNext) {
    h.xp -= h.xpNext;
    h.level++;
    h.xpNext = xpForLevel(h.level);
    h.maxHp += 15;
    h.hp = Math.min(h.maxHp, h.hp + 30);
    h.maxMana += 4;
    h.mana = Math.min(h.maxMana, h.mana + 20);
    h.baseAtk += 3;
    state.pendingBoons++;
    leveled = true;
    ringFx(h.x, h.y, 10, 110, 'rgba(255, 226, 160, ALPHA)', 1);
    burst(h.x, h.y - 24, 18, '#ffe6a8', 2.2, 1);
    showToast(`Level ${h.level} — the covenant deepens.`, 'good');
  }
  if (leveled) {
    audio.sfx('level');
    if (state.mode === 'game' && state.phase !== 'title' && state.phase !== 'victory' && state.phase !== 'defeat') {
      openBoon();
    }
  }
}

function damageHero(amount) {
  const h = state.hero;
  if (h.dead) return;
  let remaining = amount;
  if (h.shield > 0) {
    const absorbed = Math.min(h.shield, remaining);
    h.shield -= absorbed;
    remaining -= absorbed;
    if (absorbed > 0) {
      addFloater(h.x, h.y - 58, `-${Math.round(absorbed)}`, '#7ee8d2');
      addParticle(h.x, h.y - 28, {
        vx: rand(-40, 40), vy: rand(-40, 10), life: 0.4,
        size: 2, color: 'rgba(126, 232, 210, 0.8)', additive: true
      });
    }
  }
  if (remaining <= 0) return;
  h.hp -= remaining;
  h.hurtFlash = 0.55;
  state.shake = Math.max(state.shake, 4);
  addFloater(h.x, h.y - 52, `-${Math.round(remaining)}`, '#f08b7d');
  audio.sfx('hit');
  if (h.hp <= 0) {
    h.hp = 0;
    h.dead = true;
    h.respawn = 8;
    h.shield = 0;
    state.heroesFallen++;
    state.shake = Math.max(state.shake, 12);
    burst(h.x, h.y - 20, 26, '#f0a090', 2.4, 1.1);
    showToast('The Bearer has fallen. The Gate stands alone.', 'bad', 4200);
    audio.sfx('gate');
  }
}

function hitGate(e) {
  e.dead = true;
  state.leaks++;
  state.sanctuaryHp = Math.max(0, state.sanctuaryHp - e.gateDamage);
  state.gateFlash = 0.6;
  state.shake = Math.max(state.shake, e.boss ? 16 : 7);
  audio.sfx('gate');
  addFloater(SANCTUARY.x - 30, SANCTUARY.y - 80, `-${e.gateDamage}`, '#ef8b7e', { crit: true });
  burst(SANCTUARY.x - 40, SANCTUARY.y - 20, e.boss ? 30 : 10, '#f08b74', 2, 1);
  if (e.boss) showToast(`${e.name} has broken a seal!`, 'bad', 4000);
  if (state.sanctuaryHp <= 0) endGame(false);
}

/* ------------------------------------------------------------------ Towers */

function sealBuffAt(tower) {
  let buff = 0;
  for (const other of state.towers) {
    if (other.type !== 'seal' || other.id === tower.id) continue;
    const s = towerStats('seal', other.level);
    if (dist(tower.x, tower.y, other.x, other.y) <= s.range * state.stats.towerRange) {
      buff += s.buff;
    }
  }
  return Math.min(0.5, buff);
}

function findTarget(tower, stats) {
  const range = stats.range * state.stats.towerRange;
  let best = null;
  let bestDist = -1;
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (dist(tower.x, tower.y, e.x, e.y) > range + e.radius * 0.5) continue;
    if (e.dist > bestDist) {
      bestDist = e.dist;
      best = e;
    }
  }
  return best;
}

function updateTowers(dt) {
  const t = visualTime;
  for (const tower of state.towers) {
    const s = towerStats(tower.type, tower.level);
    if (tower.stun > 0) {
      tower.stun -= dt;
      continue;
    }
    if (tower.flash > 0) tower.flash -= dt * 4;

    if (tower.type === 'seal') {
      const range = s.range * state.stats.towerRange;
      const inRange = enemiesInRange(tower.x, tower.y, range);
      for (const e of inRange) {
        e.slow = Math.max(e.slow, s.slow);
        e.slowT = Math.max(e.slowT, 0.45);
      }
      tower.cd -= dt * state.stats.towerRate;
      if (tower.cd > 0 || inRange.length === 0) continue;
      tower.cd = 1 / s.rate;
      const buff = sealBuffAt(tower);
      const base = s.damage * state.stats.towerDamage * (1 + buff);
      for (const e of inRange) {
        damageEnemy(e, base, {
          pierce: s.pierce, poison: s.dot, poisonTime: 2.4, color: '#a7e8a8', silent: inRange.length > 5
        });
      }
      ringFx(tower.x, tower.y, 18, range, 'rgba(126, 232, 210, ALPHA)', 0.55);
      addParticle(tower.x, tower.y - 36, {
        vx: 0, vy: -10, life: 0.4, size: 2.4, color: 'rgba(160, 255, 235, 0.8)', additive: true
      });
      audio.sfx('glob');
      continue;
    }

    tower.cd -= dt * state.stats.towerRate;
    if (tower.cd > 0) continue;
    const target = findTarget(tower, s);
    if (!target) continue;
    tower.cd = 1 / s.rate;
    tower.aim = Math.atan2(target.y - tower.y, target.x - tower.x);
    tower.flash = 0.25;
    const buff = sealBuffAt(tower);
    const damage = s.damage * state.stats.towerDamage * (1 + buff);

    // muzzle sparks
    for (let i = 0; i < 3; i++) {
      addParticle(tower.x + Math.cos(tower.aim) * 12, tower.y - 26 + Math.sin(tower.aim) * 8, {
        vx: Math.cos(tower.aim + rand(-0.5, 0.5)) * rand(30, 90),
        vy: Math.sin(tower.aim + rand(-0.5, 0.5)) * rand(30, 90),
        life: rand(0.15, 0.35), size: rand(1, 2.2),
        color: tower.type === 'serpent' ? 'rgba(150, 240, 150, 0.8)' : 'rgba(255, 220, 150, 0.8)',
        additive: true
      });
    }

    if (tower.type === 'ember') {
      state.projectiles.push({
        kind: 'bolt', x: tower.x, y: tower.y - 38, target,
        speed: s.speed, damage, pierce: s.pierce, color: 'amber',
        trail: [], ttl: 2.2
      });
      audio.sfx('bolt');
    } else if (tower.type === 'ballista') {
      const lead = dist(tower.x, tower.y, target.x, target.y) / s.speed;
      const tp = pointAtDistance(target.dist + target.speed * (1 - (target.slow || 0)) * lead);
      const angle = Math.atan2(tp.y - (tower.y - 26), tp.x - tower.x);
      state.projectiles.push({
        kind: 'arrow', x: tower.x, y: tower.y - 26,
        vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed,
        angle, damage, pierce: s.pierce, hits: s.hits, hit: [], ttl: 1.6
      });
      audio.sfx('arrow');
    } else if (tower.type === 'serpent') {
      const flight = Math.max(0.2, dist(tower.x, tower.y, target.x, target.y) / s.speed);
      state.projectiles.push({
        kind: 'glob', x1: tower.x, y1: tower.y - 30, x2: target.x, y2: target.y,
        t: 0, duration: flight, damage, pierce: s.pierce,
        aoe: s.aoe, dot: s.dot, dotTime: s.dotTime, ttl: 3
      });
      audio.sfx('glob');
    }
  }
}

/* ------------------------------------------------------------- Projectiles */

function updateProjectiles(dt) {
  for (const p of state.projectiles) {
    if (p.kind === 'bolt') {
      p.ttl -= dt;
      if (!p.target || p.target.dead) {
        p.ttl -= dt * 3;
      } else {
        const dx = p.target.x - p.x;
        const dy = (p.target.y - p.target.radius * 0.3) - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = p.speed * dt;
        if (d <= step + 6) {
          damageEnemy(p.target, p.damage, {
            pierce: p.pierce, critChance: p.critChance, critMult: p.critMult,
            color: p.color === 'teal' ? '#b6fff0' : '#ffd28a'
          });
          p.ttl = 0;
        } else {
          p.x += (dx / d) * step;
          p.y += (dy / d) * step;
        }
      }
      if (p.trail) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();
      }
      if (p.ttl <= 0) p.dead = true;
    } else if (p.kind === 'arrow') {
      p.ttl -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      for (const e of state.enemies) {
        if (e.dead || p.hit.includes(e.id)) continue;
        if (dist(p.x, p.y, e.x, e.y) < e.radius + 6) {
          p.hit.push(e.id);
          damageEnemy(e, p.damage, { pierce: p.pierce, color: '#ffe4a8' });
          p.hits--;
          if (p.hits <= 0) {
            p.dead = true;
            break;
          }
        }
      }
      if (p.ttl <= 0 || p.x < -100 || p.x > WORLD.width + 100 || p.y < -100 || p.y > WORLD.height + 100) p.dead = true;
    } else if (p.kind === 'glob') {
      p.t += dt / p.duration;
      if (p.t >= 1) {
        explodeGlob(p);
        p.dead = true;
      }
    }
  }
  state.projectiles = state.projectiles.filter(p => !p.dead);
}

function explodeGlob(p) {
  for (const e of enemiesInRange(p.x2, p.y2, p.aoe)) {
    damageEnemy(e, p.damage, {
      pierce: p.pierce, poison: p.dot, poisonTime: p.dotTime, color: '#a8e8a8'
    });
  }
  state.pools.push({
    x: p.x2, y: p.y2, r: p.aoe * 0.9, dps: p.dot,
    ttl: 3.2, maxTtl: 3.2, seed: Math.random() * 10
  });
  ringFx(p.x2, p.y2, 8, p.aoe, 'rgba(140, 235, 150, ALPHA)', 0.7);
  for (let i = 0; i < 12; i++) {
    addParticle(p.x2, p.y2, {
      vx: rand(-90, 90), vy: rand(-100, 20), life: rand(0.3, 0.9),
      size: rand(1, 3), color: 'rgba(150, 240, 150, 0.7)', additive: true
    });
  }
}

function updatePools(dt) {
  for (const p of state.pools) {
    p.ttl -= dt;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (dist(p.x, p.y, e.x, e.y) < p.r + e.radius * 0.5) {
        e.poison = Math.max(e.poison, p.dps);
        e.poisonT = Math.max(e.poisonT, 0.6);
      }
    }
    if (p.ttl <= 0) p.dead = true;
  }
  state.pools = state.pools.filter(p => !p.dead);
}

/* -------------------------------------------------------------- Effects */

function updateEffects(dt) {
  for (const f of state.fx) f.ttl -= dt;
  state.fx = state.fx.filter(f => f.ttl > 0);
  for (const b of state.beams) b.ttl -= dt;
  state.beams = state.beams.filter(b => b.ttl > 0);
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity ?? 60) * dt;
    p.vx *= 0.985;
    if (p.life <= 0) p.dead = true;
  }
  state.particles = state.particles.filter(p => !p.dead);
  if (state.particles.length > 700) state.particles.splice(0, state.particles.length - 700);
}

function updateFloaters(dt) {
  for (const f of state.floaters) {
    f.life -= dt;
    f.y -= 28 * dt;
    f.x += (f.vx || 0) * dt;
    if (f.life <= 0) f.dead = true;
  }
  state.floaters = state.floaters.filter(f => !f.dead);
}

function addParticle(x, y, opts = {}) {
  if (state.particles.length > 720) return;
  state.particles.push({
    x, y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    gravity: opts.gravity ?? 40,
    life: opts.life ?? 0.6,
    maxLife: opts.life ?? 0.6,
    size: opts.size ?? 2,
    color: opts.color ?? 'rgba(255, 230, 170, 0.8)',
    additive: opts.additive ?? true,
    shape: opts.shape ?? 'dot',
    shrink: opts.shrink ?? false,
    alpha: opts.alpha ?? 1
  });
}

function burst(x, y, count, color, speed = 2, size = 0.7) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const v = rand(20, 90) * speed;
    addParticle(x, y, {
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15,
      life: rand(0.3, 0.9), size: rand(1, 2.6) * size,
      color, additive: true, gravity: 120
    });
  }
}

function addFloater(x, y, text, color, opts = {}) {
  if (state.floaters.length > 140) state.floaters.shift();
  state.floaters.push({
    x, y, text, color,
    life: opts.life ?? 0.95,
    maxLife: opts.life ?? 0.95,
    crit: !!opts.crit,
    kind: opts.kind || 'damage',
    vx: rand(-6, 6),
    dead: false
  });
}

function ringFx(x, y, r0, r1, color, life = 0.6) {
  state.fx.push({
    kind: 'ring', x, y, r0, r1, color,
    ttl: life, maxTtl: life
  });
}

/* --------------------------------------------------------------- Abilities */

function abilityPower() {
  return state.stats.abilityPower * (1 + (state.hero.level - 1) * 0.06);
}

function castAbility(id) {
  if (state.mode !== 'game' || (state.phase !== 'prep' && state.phase !== 'wave')) return;
  const h = state.hero;
  if (h.dead) {
    showToast('The Bearer is returning. Hold the line.', 'bad');
    return;
  }
  const def = ABILITIES[id];
  if (!def) return;
  if (h.level < def.unlock) {
    showToast(`${def.name} unlocks at level ${def.unlock}.`, 'bad');
    audio.sfx('error');
    return;
  }
  if (h.cooldowns[id] > 0) {
    audio.sfx('error');
    return;
  }
  if (h.mana < def.mana) {
    showToast('Not enough mana.', 'bad');
    audio.sfx('error');
    return;
  }

  const power = abilityPower();
  const critChance = state.stats.crit;
  const critMult = state.stats.critMult;
  let used = false;

  if (id === 'q') {
    const center = densestCluster(430, 135);
    if (!center) {
      showToast('No enemies within reach of Smite.', 'bad');
      audio.sfx('error');
      return;
    }
    used = true;
    const damage = 125 * power;
    for (const e of enemiesInRange(center.x, center.y, 138)) {
      damageEnemy(e, damage, { pierce: 20, stun: 0.7, critChance, critMult, color: '#ffe6a8' });
    }
    state.fx.push({ kind: 'smite', x: center.x, y: center.y, ttl: 0.75, maxTtl: 0.75 });
    ringFx(center.x, center.y, 10, 140, 'rgba(255, 210, 140, ALPHA)', 0.7);
    state.shake = Math.max(state.shake, 6);
    h.cast = 0.6;
    audio.sfx('smite');
  } else if (id === 'w') {
    used = true;
    const shield = 135 * power;
    h.shield = Math.max(h.shield, shield);
    h.shieldT = 6;
    h.hp = Math.min(h.maxHp, h.hp + 35);
    state.fx.push({ kind: 'shield', x: h.x, y: h.y - 22, r0: 10, r1: 58, color: 'rgba(126, 232, 210, ALPHA)', ttl: 0.8, maxTtl: 0.8 });
    addFloater(h.x, h.y - 60, `+${Math.round(shield)} shield`, '#9df5e2');
    audio.sfx('shield');
  } else if (id === 'e') {
    const target = nearestEnemy(h.x, h.y, 480);
    if (!target) {
      showToast('No target for Judgement.', 'bad');
      audio.sfx('error');
      return;
    }
    used = true;
    const angle = Math.atan2(target.y - h.y, target.x - h.x);
    const length = 520;
    const x2 = h.x + Math.cos(angle) * length;
    const y2 = h.y + Math.sin(angle) * length;
    const damage = 360 * power;
    for (const e of state.enemies) {
      if (e.dead) continue;
      const px = e.x - h.x;
      const py = e.y - h.y;
      const proj = px * Math.cos(angle) + py * Math.sin(angle);
      if (proj < 0 || proj > length) continue;
      const perp = Math.abs(-px * Math.sin(angle) + py * Math.cos(angle));
      if (perp < 38 + e.radius * 0.35) {
        damageEnemy(e, damage, {
          pierce: 30, burn: 22, burnTime: 3, critChance, critMult, color: '#fff0c4'
        });
      }
    }
    state.beams.push({ x1: h.x, y1: h.y - 26, x2, y2, width: 26, ttl: 0.38, maxTtl: 0.38 });
    state.fx.push({ kind: 'holy', x: h.x, y: h.y - 20, ttl: 0.6, maxTtl: 0.6 });
    state.shake = Math.max(state.shake, 7);
    h.cast = 0.7;
    audio.sfx('beam');
  } else if (id === 'r') {
    used = true;
    const damage = 260 * power;
    for (const e of state.enemies) {
      if (e.dead) continue;
      damageEnemy(e, damage, { pierce: 25, burn: 30, burnTime: 4, critChance, critMult, color: '#ffd28a', silent: true });
    }
    for (let i = 0; i < 14; i++) {
      const x = rand(100, 1200);
      const y = rand(100, 820);
      state.fx.push({ kind: 'smite', x, y, ttl: rand(0.4, 0.9), maxTtl: 0.9 });
    }
    state.shake = Math.max(state.shake, 15);
    h.cast = 1;
    showToast('Wrath of Heaven falls upon the horde.', 'good');
    audio.sfx('smite');
  }

  if (!used) return;
  h.mana -= def.mana;
  h.cooldowns[id] = def.cooldown * clamp(state.stats.cooldown, 0.5, 1);
  flashAbility(id);
}

function densestCluster(range, radius) {
  const h = state.hero;
  const candidates = enemiesInRange(h.x, h.y, range);
  if (!candidates.length) return null;
  let best = null;
  let bestCount = -1;
  for (const c of candidates) {
    let count = 0;
    for (const e of candidates) {
      if (dist(c.x, c.y, e.x, e.y) < radius) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ Waves */

function startWave() {
  if (state.mode !== 'game' || state.phase !== 'prep') return;
  state.phase = 'wave';
  state.spawnQueue = buildSpawnQueue(state.wave);
  state.waveTotal = state.spawnQueue.length;
  state.spawnIndex = 0;
  state.elapsed = 0;
  state.enemies = [];
  showBanner(state.wave);
  audio.sfx('wave');
  if (state.wave === 1) {
    setTimeout(() => showToast('The Bearer attacks on his own. Use Q, C, E, R in a pinch.', 'teal', 5000), 1400);
  }
}

function completeWave() {
  if (state.phase !== 'wave') return;
  const econ = state.economy.reduce((sum, e) => sum + economyIncome(e.type, e.level), 0);
  const payout = Math.round(econ * state.stats.income + waveReward(state.wave));
  state.gold += payout;
  state.goldEarned += payout;
  state.lastPayout = payout;
  state.wavesCleared = Math.max(state.wavesCleared, state.wave);
  saveBest(state.wave);
  state.pools = [];
  state.enemies = [];

  for (const e of state.economy) {
    const x = e.x;
    const y = e.y - 20;
    for (let i = 0; i < 8; i++) {
      addParticle(x, y, {
        vx: rand(-50, 50), vy: rand(-110, -30), life: rand(0.5, 1.2),
        size: rand(1, 2.4), color: 'rgba(255, 224, 147, 0.9)', additive: true,
        shape: 'coin', gravity: 160, shrink: true
      });
    }
  }
  addFloater(SANCTUARY.x, SANCTUARY.y - 130, `+${payout} tribute`, '#ffe6a8', { kind: 'gold', life: 1.6 });
  audio.sfx('coin');
  showToast(`Wave ${state.wave} cleared — tribute +${payout} gold.`, 'good', 4200);

  if (state.wave >= TOTAL_WAVES) {
    endGame(true);
    return;
  }
  state.wave++;
  state.phase = 'prep';
  state.spawnQueue = [];
  state.spawnIndex = 0;
  state.elapsed = 0;
  el.waveProgress.classList.add('hidden');
}

function saveBest(wave) {
  if (wave > bestWave) {
    bestWave = wave;
    try { localStorage.setItem(BEST_KEY, String(bestWave)); } catch { /* ignore */ }
  }
}

function endGame(win) {
  if (state.phase === 'victory' || state.phase === 'defeat') return;
  state.phase = win ? 'victory' : 'defeat';
  saveBest(win ? TOTAL_WAVES : state.wavesCleared);
  el.waveProgress.classList.add('hidden');
  el.boonOverlay.classList.add('hidden');
  el.pauseOverlay.classList.add('hidden');
  el.helpOverlay.classList.add('hidden');
  audio.sfx(win ? 'victory' : 'defeat');
  if (win) {
    for (let i = 0; i < 60; i++) {
      addParticle(rand(200, 1100), rand(100, 500), {
        vx: rand(-40, 40), vy: rand(-50, 40), life: rand(1, 3),
        size: rand(1, 3), color: pick(['rgba(255,226,160,0.9)', 'rgba(126,232,210,0.7)', 'rgba(255,255,240,0.8)']),
        additive: true, gravity: 8
      });
    }
  }
  showEnd(win);
}

/* ------------------------------------------------------------------ Boons */

function openBoon() {
  if (state.mode !== 'game') return;
  if (state.phase === 'title' || state.phase === 'victory' || state.phase === 'defeat') return;
  if (state.pendingBoons <= 0) return;
  if (state.phase !== 'boon') state.phaseBeforeBoon = state.phase;
  state.phase = 'boon';
  presentBoons();
}

function presentBoons() {
  boonChoices = randomBoonChoices(3);
  el.boonLevel.textContent = `level ${state.hero.level}`;
  el.boonCards.innerHTML = boonChoices.map((b, i) => `
    <button class="boon" data-boon="${b.id}" style="animation-delay:${i * 60}ms">
      <span class="boon-num">${i + 1}</span>
      <span class="boon-icon"><svg class="icon"><use href="#icon-${b.icon}"/></svg></span>
      <h3>${b.name}</h3>
      <p>${b.desc}</p>
      <span class="boon-pick">Choose this blessing <span>✦</span></span>
    </button>
  `).join('');
  el.boonOverlay.classList.remove('hidden');
  audio.sfx('boon');
}

function applyBoon(id) {
  const boon = BOONS.find(b => b.id === id);
  if (!boon || state.phase !== 'boon') return;
  const mods = boon.mods || {};
  for (const [key, value] of Object.entries(mods)) {
    if (key === 'maxHp') {
      state.hero.maxHp += value;
      state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + value);
    } else if (key === 'sealHeal') {
      state.sanctuaryHp = Math.min(state.maxSanctuaryHp, state.sanctuaryHp + value);
    } else if (key === 'gold') {
      state.gold += value;
      state.goldEarned += value;
    } else if (key in state.stats) {
      state.stats[key] += value;
    }
  }
  state.stats.cooldown = Math.max(0.5, state.stats.cooldown);
  state.stats.crit = Math.min(0.6, state.stats.crit);
  state.boons.push(boon.id);
  state.pendingBoons--;

  const h = state.hero;
  ringFx(h.x, h.y, 12, 120, 'rgba(232, 201, 122, ALPHA)', 0.9);
  burst(h.x, h.y - 26, 22, '#ffe6a8', 2.4, 1);
  addFloater(h.x, h.y - 66, boon.name, '#ffe6a8', { crit: true, life: 1.5 });
  showToast(`Blessing: ${boon.name}`, 'good');
  audio.sfx('upgrade');

  if (state.pendingBoons > 0) {
    presentBoons();
  } else {
    el.boonOverlay.classList.add('hidden');
    state.phase = state.phaseBeforeBoon === 'boon' ? 'prep' : state.phaseBeforeBoon;
  }
}

/* --------------------------------------------------------------- Ambient */

function updateAmbient(dt) {
  visualTime += dt;

  if (embers.length < 90 && Math.random() < dt * 14) {
    embers.push({
      x: rand(30, 1260),
      y: rand(180, 880),
      vy: rand(-16, -5),
      vx: rand(-4, 4),
      size: rand(0.6, 2),
      life: rand(3, 8),
      maxLife: 8,
      color: Math.random() < 0.72 ? 'rgba(255, 208, 130, 0.6)' : 'rgba(126, 232, 210, 0.45)',
      seed: Math.random() * 10
    });
  }
  for (const e of embers) {
    e.life -= dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.life <= 0) e.dead = true;
  }
  embers = embers.filter(e => !e.dead);

  // idle NPC sparkles at the tree
  if (state.mode === 'preview' && Math.random() < dt * 2.4) {
    addParticle(rand(1280, 1520), rand(330, 780), {
      vx: rand(-4, 4), vy: rand(-14, -4), life: rand(2, 4),
      size: rand(0.8, 1.8), color: 'rgba(126, 232, 210, 0.4)', additive: true, gravity: -2
    });
  }
}
