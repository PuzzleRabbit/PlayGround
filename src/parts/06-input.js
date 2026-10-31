// ---------------------------------------------------------------------------
// Input and boot

const buildOrder = [...Object.keys(TOWERS), ...Object.keys(ECONOMY)];
const moveKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

function isOverlayOpen() {
  return !el.boonOverlay.classList.contains('hidden')
    || !el.pauseOverlay.classList.contains('hidden')
    || !el.endOverlay.classList.contains('hidden')
    || !el.helpOverlay.classList.contains('hidden')
    || !el.title.classList.contains('hidden');
}

function bindEvents() {
  window.addEventListener('resize', resize);

  el.start.addEventListener('click', startRun);
  el.how.addEventListener('click', openHelp);
  el.helpClose.addEventListener('click', closeHelp);
  el.helpDone.addEventListener('click', closeHelp);
  el.resume.addEventListener('click', togglePause);
  el.pauseHelp.addEventListener('click', openHelp);
  el.pauseRestart.addEventListener('click', restartRun);
  el.retry.addEventListener('click', restartRun);
  el.endTitleBtn.addEventListener('click', returnToTitle);
  el.speed.addEventListener('click', toggleSpeed);
  el.mute.addEventListener('click', toggleMute);
  el.help.addEventListener('click', openHelp);
  el.pause.addEventListener('click', togglePause);
  el.horn.addEventListener('click', startWave);
  el.armory.addEventListener('click', toggleArmory);
  el.shopClose.addEventListener('click', closeArmory);

  el.towerCards.addEventListener('click', event => {
    const card = event.target.closest('.card');
    if (card) chooseBuild(card.dataset.build);
  });
  el.econCards.addEventListener('click', event => {
    const card = event.target.closest('.card');
    if (card) chooseBuild(card.dataset.build);
  });

  el.selectedPanel.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'upgrade') upgradeSelected();
    else if (action === 'sell') sellSelected();
    else if (action === 'close') clearSelection();
  });

  el.boonCards.addEventListener('click', event => {
    const card = event.target.closest('.boon');
    if (card) applyBoon(card.dataset.boon);
  });

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
    state.hoverPad = null;
    state.hoverSanctum = null;
    state.hoverTowerId = null;
    el.tooltip.classList.add('hidden');
    canvas.style.cursor = 'default';
  });
  canvas.addEventListener('contextmenu', event => {
    event.preventDefault();
    clearSelection();
    el.tooltip.classList.add('hidden');
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state.phase === 'wave' || state.phase === 'prep')) togglePause();
  });
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();

  if (!el.boonOverlay.classList.contains('hidden')) {
    if (['1', '2', '3'].includes(key)) {
      const boon = boonChoices[Number(key) - 1];
      if (boon) applyBoon(boon.id);
      event.preventDefault();
    }
    return;
  }

  if (!el.helpOverlay.classList.contains('hidden')) {
    if (key === 'escape' || key === 'h') closeHelp();
    return;
  }

  if (!el.endOverlay.classList.contains('hidden')) {
    return;
  }

  if (!el.title.classList.contains('hidden')) {
    if (key === 'enter' || key === ' ') {
      event.preventDefault();
      startRun();
    }
    return;
  }

  if (state.phase === 'paused') {
    if (key === 'escape' || key === 'p') togglePause();
    else if (key === 'h') openHelp();
    return;
  }

  if (moveKeys.has(key)) {
    if (state.phase === 'prep' || state.phase === 'wave') {
      keys.add(key);
      if (key.startsWith('arrow') || key === ' ') event.preventDefault();
    }
  }

  if (key === 'escape') {
    if (state.selectedBuild || state.selectedTowerId || state.selectedEconId) {
      clearSelection();
      el.tooltip.classList.add('hidden');
    } else {
      togglePause();
    }
    event.preventDefault();
    return;
  }

  if (key === 'p') { togglePause(); return; }
  if (key === 'h') { openHelp(); return; }
  if (key === 'm') { toggleMute(); return; }
  if (key === 'f') { toggleSpeed(); return; }

  if (key === ' ' || key === 'enter') {
    if (state.phase === 'prep') startWave();
    event.preventDefault();
    return;
  }

  if (state.phase !== 'prep' && state.phase !== 'wave') return;

  const abilityMap = { q: 'q', e: 'e', r: 'r', c: 'w' };
  if (abilityMap[key]) {
    castAbility(abilityMap[key]);
    event.preventDefault();
    return;
  }

  if (/^[1-7]$/.test(key)) {
    const id = buildOrder[Number(key) - 1];
    if (id) chooseBuild(id);
    event.preventDefault();
  }
}

function onKeyUp(event) {
  keys.delete(event.key.toLowerCase());
}

function onPointerMove(event) {
  const p = screenToWorld(event.clientX, event.clientY);
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.wx = p.x;
  pointer.wy = p.y;
  pointer.inside = true;
  updateHover(p.x, p.y);
  updateCursor();
}

function updateHover(wx, wy) {
  state.hoverPad = null;
  state.hoverSanctum = null;
  state.hoverTowerId = null;
  let pad = null;
  for (const p of state.pads) {
    if (dist(wx, wy, p.x, p.y) < 40) { pad = p; break; }
  }
  let sanctum = null;
  if (!pad) {
    for (const p of state.sanctum) {
      if (dist(wx, wy, p.x, p.y) < 36) { sanctum = p; break; }
    }
  }
  if (pad) {
    state.hoverPad = pad.index;
    if (pad.towerId) state.hoverTowerId = pad.towerId;
  } else if (sanctum) {
    state.hoverSanctum = sanctum.index;
  }
  updateTooltip(pad, sanctum);
}

function updateCursor() {
  if (state.mode !== 'game') { canvas.style.cursor = 'default'; return; }
  if (state.hoverPad != null || state.hoverSanctum != null || state.hoverTowerId) {
    canvas.style.cursor = 'pointer';
  } else if (state.selectedBuild) {
    canvas.style.cursor = 'crosshair';
  } else {
    canvas.style.cursor = 'crosshair';
  }
}

function updateTooltip(pad, sanctum) {
  if (state.mode !== 'game' || isOverlayOpen()) {
    el.tooltip.classList.add('hidden');
    return;
  }
  let html = '';
  if (pad) {
    const tower = pad.towerId ? state.towers.find(t => t.id === pad.towerId) : null;
    if (tower) {
      const def = TOWERS[tower.type];
      const s = towerStats(tower.type, tower.level);
      html = `<strong>${def.name} · level ${tower.level}</strong>
        <span class="tip-stats">DMG ${Math.round(s.damage * state.stats.towerDamage)} · RNG ${Math.round(s.range * state.stats.towerRange)} · RATE ${(s.rate * state.stats.towerRate).toFixed(2)}/s</span>
        <div style="margin-top:4px">Click to inspect, upgrade or sell.</div>`;
    } else if (state.selectedBuild && BUILD_TYPES[state.selectedBuild]?.pad === 'guardian') {
      const def = BUILD_TYPES[state.selectedBuild];
      const s = towerStats(state.selectedBuild, 1);
      html = `<strong>${def.name}</strong>
        <span class="tip-cost">${def.cost} gold</span>
        <div>${def.blurb}</div>
        <span class="tip-stats">DMG ${s.damage} · RNG ${Math.round(s.range * state.stats.towerRange)} · RATE ${s.rate}/s</span>
        ${state.gold < def.cost ? '<div class="tip-warn">Not enough gold.</div>' : '<div style="color:var(--gold);margin-top:4px">Click to raise this guardian.</div>'}`;
    } else {
      html = `<strong>Rune Pad</strong><div>Choose a guardian from the Armory, then place it here.</div>`;
    }
  } else if (sanctum) {
    const econ = sanctum.econId ? state.economy.find(e => e.id === sanctum.econId) : null;
    if (econ) {
      const def = ECONOMY[econ.type];
      html = `<strong>${def.name} · level ${econ.level}</strong>
        <span class="tip-stats">Tribute ${Math.round(economyIncome(econ.type, econ.level) * state.stats.income)} gold each wave</span>
        <div style="margin-top:4px">Click to inspect or upgrade.</div>`;
    } else if (state.selectedBuild && BUILD_TYPES[state.selectedBuild]?.pad === 'sanctum') {
      const def = BUILD_TYPES[state.selectedBuild];
      html = `<strong>${def.name}</strong>
        <span class="tip-cost">${def.cost} gold</span>
        <div>${def.blurb}</div>
        ${state.gold < def.cost ? '<div class="tip-warn">Not enough gold.</div>' : '<div style="color:var(--teal);margin-top:4px">Click to raise this sanctum relic.</div>'}`;
    } else {
      html = `<strong>Sanctum Court</strong><div>Wells, reliquaries and oracles pay tribute at the end of every wave.</div>`;
    }
  }

  if (!html) {
    el.tooltip.classList.add('hidden');
    return;
  }
  el.tooltip.innerHTML = html;
  el.tooltip.classList.remove('hidden');
  const tw = 228;
  const th = el.tooltip.offsetHeight || 110;
  let x = pointer.x + 18;
  let y = pointer.y + 16;
  if (x + tw > window.innerWidth - 10) x = pointer.x - tw - 18;
  if (y + th > window.innerHeight - 10) y = pointer.y - th - 16;
  el.tooltip.style.left = `${clamp(x, 10, window.innerWidth - tw - 10)}px`;
  el.tooltip.style.top = `${clamp(y, 10, window.innerHeight - th - 10)}px`;
}

function onPointerDown(event) {
  if (state.mode !== 'game' || isOverlayOpen()) return;
  if (event.button === 2) return;
  const p = screenToWorld(event.clientX, event.clientY);
  pointer.wx = p.x;
  pointer.wy = p.y;

  let pad = null;
  for (const candidate of state.pads) {
    if (dist(p.x, p.y, candidate.x, candidate.y) < 42) { pad = candidate; break; }
  }
  if (pad) {
    if (pad.towerId) {
      selectTower(pad.towerId);
      audio.sfx('click');
      return;
    }
    if (state.selectedBuild && BUILD_TYPES[state.selectedBuild].pad === 'guardian') {
      buildAt(state.selectedBuild, pad.index);
      el.tooltip.classList.add('hidden');
      return;
    }
    showToast('Choose a guardian in the Armory, then click the rune pad.', 'teal', 3000);
    return;
  }

  let sanctum = null;
  for (const candidate of state.sanctum) {
    if (dist(p.x, p.y, candidate.x, candidate.y) < 38) { sanctum = candidate; break; }
  }
  if (sanctum) {
    if (sanctum.econId) {
      selectEcon(sanctum.econId);
      audio.sfx('click');
      return;
    }
    if (state.selectedBuild && BUILD_TYPES[state.selectedBuild].pad === 'sanctum') {
      buildAt(state.selectedBuild, sanctum.index);
      el.tooltip.classList.add('hidden');
      return;
    }
    showToast('Sanctum courts hold wells, reliquaries and oracles.', 'teal', 3200);
    return;
  }

  if (state.selectedBuild) {
    clearSelection();
    return;
  }

  const h = state.hero;
  if (!h.dead && state.phase !== 'boon' && state.phase !== 'paused') {
    h.moveTarget = { x: clamp(p.x, 70, 1230), y: clamp(p.y, 72, 820) };
    ringFx(h.moveTarget.x, h.moveTarget.y, 4, 22, 'rgba(126, 232, 210, ALPHA)', 0.45);
    h.moving = true;
  }
}

/* --------------------------------------------------------------- Debug API */

function debugFill() {
  state.gold = 999999;
  const cycle = ['ember', 'serpent', 'ballista', 'seal'];
  for (const pad of state.pads) {
    if (!pad.towerId) buildAt(cycle[pad.index % cycle.length], pad.index, true);
  }
  for (const pad of state.sanctum) {
    if (!pad.econId) buildAt('oracle', pad.index, true);
  }
  debugUpgrade();
}

function debugUpgrade() {
  state.gold = 999999;
  for (const t of state.towers) t.level = 4;
  for (const e of state.economy) e.level = 4;
  lastSelectionKey = '';
  renderSelectedPanel();
}

function debugAdvance(seconds) {
  let remaining = seconds;
  while (remaining > 0) {
    if (state.phase === 'boon') {
      if (boonChoices[0]) applyBoon(boonChoices[0].id);
      else break;
      continue;
    }
    if (state.phase !== 'prep' && state.phase !== 'wave') break;
    const step = Math.min(1 / 60, remaining);
    updatePlay(step);
    remaining -= step;
  }
  return {
    phase: state.phase, wave: state.wave, elapsed: state.elapsed,
    enemies: state.enemies.length, hp: state.sanctuaryHp,
    gold: Math.round(state.gold), kills: state.kills, boons: state.boons.length
  };
}

function debugAutoRun(maxWave = TOTAL_WAVES) {
  const wasMuted = audio.muted;
  audio.muted = true;
  if (state.mode !== 'game') startRun();
  state.speed = 1;
  debugFill();
  let safety = 0;
  while (state.wave <= maxWave && safety < 80) {
    safety++;
    if (state.phase === 'victory' || state.phase === 'defeat') break;
    if (state.phase === 'prep') {
      debugUpgrade();
      startWave();
    }
    let steps = 0;
    while ((state.phase === 'wave' || state.phase === 'boon') && steps < 240 * 60) {
      if (state.phase === 'boon') {
        if (boonChoices[0]) applyBoon(boonChoices[0].id);
        else break;
        continue;
      }
      updatePlay(1 / 60);
      steps++;
    }
    if (state.phase === 'wave') break;
    if (state.phase === 'victory' || state.phase === 'defeat') break;
  }
  audio.muted = wasMuted;
  return {
    phase: state.phase, wave: state.wave, cleared: state.wavesCleared,
    kills: state.kills, hp: state.sanctuaryHp, boons: state.boons.length,
    gold: Math.round(state.gold), towers: state.towers.length, economy: state.economy.length
  };
}

window.__covenant = {
  get state() { return state; },
  start: startRun,
  title: returnToTitle,
  startWave,
  build: (type, index) => buildAt(type, index, true),
  fill: debugFill,
  upgrade: debugUpgrade,
  advance: debugAdvance,
  autoRun: debugAutoRun,
  addGold: n => { state.gold += n; },
  chooseBoon: i => applyBoon(boonChoices[i]?.id)
};

/* ------------------------------------------------------------------- Boot */

function frame(now) {
  const raw = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (state.phase === 'prep' || state.phase === 'wave') {
    updatePlay(raw * state.speed);
  }
  updateAmbient(raw);
  draw();
  if (state.mode === 'game') updateHud();

  requestAnimationFrame(frame);
}

function init() {
  buildStaticArt();
  resize();
  buildShopCards();
  buildAbilities();
  bindEvents();
  updateMuteIcon();
  updateBestBadge();
  draw();
  requestAnimationFrame(frame);
}

init();
