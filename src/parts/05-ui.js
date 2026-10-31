// ---------------------------------------------------------------------------
// Interface

const cardEls = [];
let hornKey = '';
let lastWaveUiKey = '';
let tutorialShown = false;

function cardMarkup(id, def, hotkey) {
  return `
    <button class="card" data-build="${id}" data-cost="${def.cost}" style="--card-color:${def.color}">
      <span class="card-icon"><svg class="icon"><use href="#icon-${def.icon}"/></svg></span>
      <span class="card-body">
        <h4>${def.name}</h4>
        <p>${def.blurb}</p>
      </span>
      <span class="card-meta">
        <span class="cost"><svg class="icon"><use href="#icon-coin"/></svg>${def.cost}</span>
        <span class="hotkey">${hotkey}</span>
      </span>
    </button>`;
}

function buildShopCards() {
  let hotkey = 1;
  el.towerCards.innerHTML = Object.values(TOWERS).map(def => cardMarkup(def.id, def, hotkey++)).join('');
  el.econCards.innerHTML = Object.values(ECONOMY).map(def => cardMarkup(def.id, def, hotkey++)).join('');
  for (const node of document.querySelectorAll('.card')) cardEls.push(node);
}

function chooseBuild(id) {
  if (state.mode !== 'game' || (state.phase !== 'prep' && state.phase !== 'wave')) return;
  if (state.selectedBuild === id) {
    state.selectedBuild = null;
    updateShopSelection();
    return;
  }
  const def = BUILD_TYPES[id];
  if (!def) return;
  if (state.gold < def.cost) {
    showToast(`You need ${def.cost} gold for the ${def.name}.`, 'bad');
    audio.sfx('error');
    return;
  }
  state.selectedBuild = id;
  state.selectedTowerId = null;
  state.selectedEconId = null;
  updateShopSelection();
  renderSelectedPanel();
  audio.sfx('click');
  if (window.innerWidth <= 1080) closeArmory();
}

function updateShopSelection() {
  for (const node of cardEls) {
    node.classList.toggle('selected', node.dataset.build === state.selectedBuild);
  }
}

function closeArmory() {
  el.shop.classList.remove('open');
}

function toggleArmory() {
  if (state.mode !== 'game') return;
  el.shop.classList.toggle('open');
  if (el.shop.classList.contains('open') && window.innerWidth <= 1080) {
    // keep the overlay above the hero bar
    el.shop.style.bottom = '12px';
  }
}

function buildAt(id, rawIndex, forge = false) {
  const def = BUILD_TYPES[id];
  if (!def || state.mode !== 'game') return false;
  if (!forge && state.gold < def.cost) {
    showToast(`You need ${def.cost} gold for the ${def.name}.`, 'bad');
    audio.sfx('error');
    return false;
  }
  if (def.pad === 'guardian') {
    const pad = state.pads[rawIndex];
    if (!pad || pad.towerId) return false;
    const tower = {
      id: nextId++, type: id, x: pad.x, y: pad.y,
      level: 1, cd: 0, aim: -Math.PI / 2, flash: 0, stun: 0,
      invested: def.cost, padIndex: pad.index
    };
    state.towers.push(tower);
    pad.towerId = tower.id;
    state.selectedTowerId = tower.id;
    state.selectedEconId = null;
    ringFx(pad.x, pad.y, 8, 56, 'rgba(232, 201, 122, ALPHA)', 0.8);
    burst(pad.x, pad.y - 16, 16, '#ffe6a8', 1.7, 0.8);
  } else {
    const pad = state.sanctum[rawIndex];
    if (!pad || pad.econId) return false;
    const econ = {
      id: nextId++, type: id, x: pad.x, y: pad.y,
      level: 1, invested: def.cost, padIndex: pad.index
    };
    state.economy.push(econ);
    pad.econId = econ.id;
    state.selectedEconId = econ.id;
    state.selectedTowerId = null;
    ringFx(pad.x, pad.y, 8, 48, 'rgba(126, 232, 210, ALPHA)', 0.8);
    burst(pad.x, pad.y - 14, 14, '#ffe6a8', 1.5, 0.8);
  }
  state.gold -= def.cost;
  state.towersBuilt++;
  state.selectedBuild = null;
  updateShopSelection();
  renderSelectedPanel();
  audio.sfx('build');
  showToast(`${def.name} raised.`, 'good', 2200);
  updateCardStates(true);
  closeArmory();
  return true;
}

function selectTower(id) {
  state.selectedTowerId = id;
  state.selectedEconId = null;
  state.selectedBuild = null;
  renderSelectedPanel();
  updateShopSelection();
  if (window.innerWidth <= 1080) el.shop.classList.add('open');
}

function selectEcon(id) {
  state.selectedEconId = id;
  state.selectedTowerId = null;
  state.selectedBuild = null;
  renderSelectedPanel();
  updateShopSelection();
  if (window.innerWidth <= 1080) el.shop.classList.add('open');
}

function clearSelection() {
  state.selectedTowerId = null;
  state.selectedEconId = null;
  state.selectedBuild = null;
  renderSelectedPanel();
  updateShopSelection();
}

function selectedEntity() {
  if (state.selectedTowerId) {
    const tower = state.towers.find(t => t.id === state.selectedTowerId);
    if (tower) return { kind: 'tower', entity: tower, def: TOWERS[tower.type] };
  }
  if (state.selectedEconId) {
    const econ = state.economy.find(e => e.id === state.selectedEconId);
    if (econ) return { kind: 'econ', entity: econ, def: ECONOMY[econ.type] };
  }
  return null;
}

function renderSelectedPanel() {
  const selected = selectedEntity();
  if (!selected) {
    el.selectedPanel.classList.add('hidden');
    el.selectedPanel.innerHTML = '';
    lastSelectionKey = '';
    return;
  }
  const { kind, entity, def } = selected;
  let statsHtml = '';
  let note = '';
  let upgradeCost = null;
  let refund = 0;
  let level = entity.level;

  if (kind === 'tower') {
    const s = towerStats(entity.type, entity.level);
    upgradeCost = towerUpgradeCost(entity.type, entity.level);
    refund = Math.floor(towerInvested(entity.type, entity.level) * 0.7);
    statsHtml = `
      <div class="stat-cell"><span>Damage</span><b>${Math.round(s.damage * state.stats.towerDamage)}</b></div>
      <div class="stat-cell"><span>Range</span><b>${Math.round(s.range * state.stats.towerRange)}</b></div>
      <div class="stat-cell"><span>Rate</span><b>${(s.rate * state.stats.towerRate).toFixed(2)}/s</b></div>`;
    if (entity.type === 'serpent') note = `Venom pool · ${s.dot}/s for ${s.dotTime}s`;
    else if (entity.type === 'ballista') note = `Armour pierce ${s.pierce} · skewers ${s.hits} foes`;
    else if (entity.type === 'seal') note = `Slows ${Math.round(s.slow * 100)}% · empowers nearby guardians +${Math.round(s.buff * 100)}%`;
    else note = `Armour pierce ${s.pierce} · swift single target`;
  } else {
    const income = economyIncome(entity.type, entity.level);
    upgradeCost = economyUpgradeCost(entity.type, entity.level);
    refund = Math.floor(economyInvested(entity.type, entity.level) * 0.7);
    statsHtml = `
      <div class="stat-cell"><span>Tribute</span><b>${Math.round(income * state.stats.income)}</b></div>
      <div class="stat-cell"><span>Level</span><b>${level}/4</b></div>
      <div class="stat-cell"><span>Refund</span><b>${refund}</b></div>`;
    note = 'Pays at the end of every wave';
  }

  const key = `${kind}:${entity.id}:${level}:${state.gold < (upgradeCost ?? 0)}:${upgradeCost ?? 'max'}`;
  if (key !== lastSelectionKey) {
    lastSelectionKey = key;
    el.selectedPanel.innerHTML = `
      <div class="selected-top">
        <span class="card-icon" style="--card-color:${def.color}"><svg class="icon"><use href="#icon-${def.icon}"/></svg></span>
        <div class="selected-title">
          <h4>${def.name}</h4>
          <span>${kind === 'tower' ? 'Guardian' : 'Sanctum'} · Level ${level}${level < 4 ? '' : ' · Ascended'}</span>
        </div>
        <button class="selected-close" data-action="close" aria-label="Deselect"><svg class="icon" style="width:12px;height:12px"><use href="#icon-close"/></svg></button>
      </div>
      <div class="selected-stats">${statsHtml}</div>
      <div class="selected-note" style="font-size:9px;color:var(--muted-2);margin:-2px 0 8px;line-height:1.35">${note}</div>
      <div class="selected-actions">
        <button class="mini-btn" data-action="upgrade" ${upgradeCost == null || state.gold < upgradeCost ? 'disabled' : ''}>
          <svg class="icon"><use href="#icon-upgrade"/></svg>
          ${upgradeCost == null ? 'Fully Ascended' : `Upgrade · ${upgradeCost}`}
        </button>
        <button class="mini-btn sell" data-action="sell">
          <svg class="icon"><use href="#icon-coin"/></svg>
          Sell · ${refund}
        </button>
      </div>`;
    el.selectedPanel.classList.remove('hidden');
  }
}

function upgradeSelected() {
  const selected = selectedEntity();
  if (!selected) return;
  const { kind, entity, def } = selected;
  const cost = kind === 'tower'
    ? towerUpgradeCost(entity.type, entity.level)
    : economyUpgradeCost(entity.type, entity.level);
  if (cost == null) {
    showToast(`${def.name} is fully ascended.`, 'bad');
    return;
  }
  if (state.gold < cost) {
    showToast(`You need ${cost} gold to ascend the ${def.name}.`, 'bad');
    audio.sfx('error');
    return;
  }
  state.gold -= cost;
  entity.level++;
  entity.invested += cost;
  lastSelectionKey = '';
  renderSelectedPanel();
  updateCardStates(true);
  ringFx(entity.x, entity.y, 8, 70, 'rgba(232, 201, 122, ALPHA)', 0.8);
  burst(entity.x, entity.y - 18, 18, '#ffe6a8', 1.8, 0.9);
  audio.sfx('upgrade');
  showToast(`${def.name} ascended to level ${entity.level}.`, 'good', 2400);
}

function sellSelected() {
  const selected = selectedEntity();
  if (!selected) return;
  const { kind, entity, def } = selected;
  const refund = Math.floor((kind === 'tower'
    ? towerInvested(entity.type, entity.level)
    : economyInvested(entity.type, entity.level)) * 0.7);
  state.gold += refund;
  if (kind === 'tower') {
    const pad = state.pads[entity.padIndex];
    if (pad) pad.towerId = null;
    state.towers = state.towers.filter(t => t.id !== entity.id);
    state.selectedTowerId = null;
  } else {
    const pad = state.sanctum[entity.padIndex];
    if (pad) pad.econId = null;
    state.economy = state.economy.filter(e => e.id !== entity.id);
    state.selectedEconId = null;
  }
  lastSelectionKey = '';
  renderSelectedPanel();
  updateCardStates(true);
  ringFx(entity.x, entity.y, 10, 54, 'rgba(255, 210, 150, ALPHA)', 0.7);
  addFloater(entity.x, entity.y - 20, `+${refund}`, '#e8c97a', { kind: 'gold' });
  audio.sfx('sell');
  showToast(`${def.name} dismantled for ${refund} gold.`, '', 2200);
}

function updateCardStates(force = false) {
  if (!force && state.gold === lastGold) return;
  lastGold = state.gold;
  for (const node of cardEls) {
    const cost = Number(node.dataset.cost);
    node.classList.toggle('unaffordable', state.gold < cost);
  }
  const selected = selectedEntity();
  if (selected) {
    const upgradeBtn = el.selectedPanel.querySelector('[data-action="upgrade"]');
    if (upgradeBtn) {
      const cost = selected.kind === 'tower'
        ? towerUpgradeCost(selected.entity.type, selected.entity.level)
        : economyUpgradeCost(selected.entity.type, selected.entity.level);
      upgradeBtn.disabled = cost == null || state.gold < cost;
    }
  }
}

/* ------------------------------------------------------------------ HUD */

function updateHud() {
  if (state.mode !== 'game') return;
  const h = state.hero;
  setText(el.gold, String(Math.floor(state.gold)));
  setText(el.seals, `${state.sanctuaryHp}`);
  setText(el.wave, `${state.wave}`);
  setText(el.heroLevel, String(h.level));
  setText(el.boonCount, state.boons.length ? `${state.boons.length} blessing${state.boons.length > 1 ? 's' : ''}` : 'No blessings yet');
  setText(el.hpText, `${Math.ceil(h.hp)} / ${h.maxHp}`);
  setText(el.manaText, `${Math.floor(h.mana)} / ${h.maxMana}`);
  setText(el.xpText, `${Math.floor(h.xp)} / ${h.xpNext} XP`);
  setText(el.phaseLabel, state.phase === 'prep' ? 'Preparation' : state.phase === 'wave' ? 'The siege' : state.phase === 'boon' ? 'Blessing' : state.phase === 'paused' ? 'Paused' : state.phase === 'victory' ? 'Victory' : 'Defeat');

  el.hpFill.style.width = `${clamp(h.hp / h.maxHp, 0, 1) * 100}%`;
  el.manaFill.style.width = `${clamp(h.mana / h.maxMana, 0, 1) * 100}%`;
  el.xpFill.style.width = `${clamp(h.xp / h.xpNext, 0, 1) * 100}%`;

  const w = WAVES[state.wave - 1] || WAVES[WAVES.length - 1];
  const waveKey = `${state.wave}:${state.phase}:${state.spawnIndex}:${state.enemies.length}`;
  if (waveKey !== lastWaveUiKey) {
    lastWaveUiKey = waveKey;
    setText(el.waveTitle, `W${state.wave} · ${w.name}`);
    if (state.phase === 'wave') {
      const remaining = (state.spawnQueue.length - state.spawnIndex) + state.enemies.length;
      setText(el.wavePreview, `${remaining} foe${remaining === 1 ? '' : 's'} remain`);
    } else {
      setText(el.wavePreview, formatWavePreview(state.wave));
    }
  }

  updateAbilities();
  updateCardStates();
  updateHorn(w);
  updateProgress();
}

function formatWavePreview(waveNumber) {
  const summary = waveEnemySummary(waveNumber);
  const bits = summary.slice(0, 3).map(({ type, count }) => {
    const def = ENEMY_TYPES[type];
    return `${count} ${def.plural || def.name}`;
  });
  if (summary.length > 3) bits.push(`+${summary.length - 3} more`);
  return bits.join(' · ');
}

function updateHorn(w) {
  const phase = state.phase;
  const remaining = state.phase === 'wave' ? (state.spawnQueue.length - state.spawnIndex) + state.enemies.length : 0;
  const key = `${phase}:${state.wave}:${remaining}`;
  if (key === hornKey) return;
  hornKey = key;
  el.horn.classList.toggle('busy', phase !== 'prep');
  if (phase === 'prep') {
    const boss = WAVES[state.wave - 1]?.boss;
    el.horn.innerHTML = `
      <span class="horn-glow"></span>
      <span class="horn-text"><b>Sound the Horn</b><small>${boss ? `Champion: ${ENEMY_TYPES[boss].name} · wave ${state.wave}` : `Begin wave ${state.wave}`}</small></span>
      <svg class="icon"><use href="#icon-chevron"/></svg>`;
  } else if (phase === 'wave') {
    const fill = clamp(((state.spawnQueue.length - remaining) / Math.max(1, state.spawnQueue.length)) * 100, 0, 100);
    el.horn.innerHTML = `
      <span class="horn-fill" style="width:${Math.round(fill)}%"></span>
      <span class="horn-text"><b>Wave ${state.wave} in progress</b><small>${remaining} foe${remaining === 1 ? '' : 's'} remain</small></span>`;
  } else {
    el.horn.innerHTML = `<span class="horn-text"><b>The siege waits</b><small>${phase === 'paused' ? 'Paused' : phase === 'boon' ? 'Choose a blessing' : 'The road is silent'}</small></span>`;
  }
}

function updateProgress() {
  if (state.phase === 'wave') {
    el.waveProgress.classList.remove('hidden');
    const remaining = (state.spawnQueue.length - state.spawnIndex) + state.enemies.length;
    const pct = 1 - remaining / Math.max(1, state.waveTotal);
    el.waveProgress.firstElementChild.style.width = `${clamp(pct, 0, 1) * 100}%`;
  } else {
    el.waveProgress.classList.add('hidden');
  }
}

function buildAbilities() {
  el.abilities.innerHTML = Object.values(ABILITIES).map(a => `
    <button class="ability" data-ability="${a.id}" title="${a.name} — ${a.desc}">
      <span class="ability-key">${a.key}</span>
      <span class="ability-cost">${a.mana}</span>
      <svg class="icon"><use href="#icon-${a.icon}"/></svg>
      <span class="ability-name">${a.name}</span>
      <span class="cd-mask hidden"></span>
    </button>`).join('');
  for (const node of el.abilities.querySelectorAll('.ability')) {
    node.addEventListener('click', () => castAbility(node.dataset.ability));
  }
}

function updateAbilities() {
  const h = state.hero;
  for (const node of el.abilities.querySelectorAll('.ability')) {
    const id = node.dataset.ability;
    const def = ABILITIES[id];
    const cd = h.cooldowns[id];
    const locked = h.level < def.unlock;
    node.classList.toggle('locked', locked);
    node.classList.toggle('no-mana', !locked && h.mana < def.mana);
    const mask = node.querySelector('.cd-mask');
    if (cd > 0.05) {
      mask.classList.remove('hidden');
      setText(mask, cd >= 3 ? String(Math.ceil(cd)) : cd.toFixed(1));
    } else {
      mask.classList.add('hidden');
    }
  }
}

function flashAbility(id) {
  const node = el.abilities.querySelector(`[data-ability="${id}"]`);
  if (!node) return;
  node.classList.remove('flash');
  void node.offsetWidth;
  node.classList.add('flash');
  setTimeout(() => node.classList.remove('flash'), 450);
}

/* ------------------------------------------------------------- Feedback */

function showToast(text, tone = '', ms = 3400) {
  while (el.toasts.children.length >= 3) {
    el.toasts.firstElementChild.remove();
  }
  const node = document.createElement('div');
  node.className = `toast ${tone}`.trim();
  node.textContent = text;
  el.toasts.appendChild(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 350);
  }, ms);
}

function showBanner(waveNumber) {
  const w = WAVES[waveNumber - 1];
  if (!w) return;
  el.banner.innerHTML = `
    <span class="banner-eyebrow">Wave ${roman(waveNumber)} of ${roman(TOTAL_WAVES)}</span>
    <strong class="banner-title">${w.name}</strong>
    <em class="banner-lore">${w.lore}</em>
    ${w.boss ? `<span class="banner-boss">A CHAMPION OF THE OLD WORLD</span>` : ''}`;
  el.banner.classList.remove('show');
  void el.banner.offsetWidth;
  el.banner.classList.add('show');
}

function showEnd(win) {
  const cleared = win ? TOTAL_WAVES : state.wavesCleared;
  el.endEyebrow.textContent = win ? 'The covenant holds' : 'The sanctuary is lost';
  el.endTitle.textContent = win ? 'The Gate Endures' : 'The Gate Is Broken';
  el.endSub.textContent = win
    ? 'Abaddon is cast back into the pit. The old myths break against the last light, and the road is quiet at last.'
    : `${state.leaks} of the horde reached the Gate. The final seal broke on wave ${state.wave}. The world goes dark beyond the walls.`;
  el.endStats.innerHTML = `
    <div class="end-stat"><b>${cleared}<span style="font-size:11px;color:var(--muted-2)"> /20</span></b><span>Waves held</span></div>
    <div class="end-stat"><b>${state.kills}</b><span>Foes slain</span></div>
    <div class="end-stat"><b>${Math.round(state.goldEarned)}</b><span>Gold earned</span></div>
    <div class="end-stat"><b>${state.boons.length}</b><span>Blessings</span></div>`;
  el.endFoot.textContent = win
    ? 'The covenant is complete. The Gate has never fallen.'
    : `Best run: wave ${Math.max(bestWave, cleared)} of 20.`;
  el.endOverlay.classList.remove('hidden');
  el.hud.classList.remove('hidden');
  el.heroBar.classList.remove('hidden');
}

function updateBestBadge() {
  if (bestWave > 0) {
    el.best.textContent = `Best run · wave ${bestWave} of 20`;
    el.best.classList.remove('hidden');
  } else {
    el.best.classList.add('hidden');
  }
}

function updateMuteIcon() {
  const use = el.mute.querySelector('use');
  use.setAttribute('href', muted ? '#icon-mute' : '#icon-sound');
  el.mute.title = muted ? 'Unmute (M)' : 'Mute (M)';
}

/* ---------------------------------------------------------------- Screens */

function startRun() {
  audio.start();
  audio.setMuted(muted);
  document.body.classList.add('in-game');
  state = createState('game');
  boonChoices = [];
  nextId = 1;
  lastGold = -1;
  hornKey = '';
  lastWaveUiKey = '';
  lastSelectionKey = '';
  tutorialShown = true;
  el.title.classList.add('hidden');
  el.endOverlay.classList.add('hidden');
  el.boonOverlay.classList.add('hidden');
  el.pauseOverlay.classList.add('hidden');
  el.helpOverlay.classList.add('hidden');
  el.shop.classList.remove('open');
  el.hud.classList.remove('hidden');
  el.shop.classList.remove('hidden');
  el.heroBar.classList.remove('hidden');
  el.horn.classList.remove('busy');
  el.waveProgress.classList.add('hidden');
  el.tooltip.classList.add('hidden');
  updateShopSelection();
  renderSelectedPanel();
  updateCardStates(true);
  for (const node of el.toasts.children) node.remove();
  setTimeout(() => {
    if (state.mode !== 'game') return;
    showToast('Choose a guardian in the Armory, then click a glowing rune pad.', 'teal', 5600);
  }, 450);
  setTimeout(() => {
    if (state.mode !== 'game' || state.wave !== 1 || state.phase !== 'prep') return;
    showToast('Click the ground to move the Bearer. Sound the Horn when ready.', '', 5200);
  }, 3000);
  lastFrame = performance.now();
}

function returnToTitle() {
  state = createState('preview');
  boonChoices = [];
  document.body.classList.remove('in-game');
  lastGold = -1;
  el.hud.classList.add('hidden');
  el.shop.classList.add('hidden');
  el.shop.classList.remove('open');
  el.heroBar.classList.add('hidden');
  el.title.classList.remove('hidden');
  el.endOverlay.classList.add('hidden');
  el.boonOverlay.classList.add('hidden');
  el.pauseOverlay.classList.add('hidden');
  el.helpOverlay.classList.add('hidden');
  el.banner.classList.remove('show');
  el.tooltip.classList.add('hidden');
  updateBestBadge();
  updateShopSelection();
}

function restartRun() {
  el.endOverlay.classList.add('hidden');
  startRun();
}

function togglePause() {
  if (state.phase === 'prep' || state.phase === 'wave') {
    state.resumePhase = state.phase;
    state.phase = 'paused';
    el.pauseOverlay.classList.remove('hidden');
    audio.sfx('click');
  } else if (state.phase === 'paused') {
    state.phase = state.resumePhase || 'prep';
    el.pauseOverlay.classList.add('hidden');
    audio.sfx('click');
  }
}

function openHelp() {
  if (!el.helpOverlay.classList.contains('hidden')) return;
  helpReturn = state.phase;
  if (state.phase === 'prep' || state.phase === 'wave') {
    state.resumePhase = state.phase;
    state.phase = 'paused';
    el.pauseOverlay.classList.add('hidden');
  }
  el.helpOverlay.classList.remove('hidden');
}

function closeHelp() {
  el.helpOverlay.classList.add('hidden');
  if (helpReturn === 'prep' || helpReturn === 'wave') {
    state.phase = helpReturn;
  } else if (helpReturn === 'paused') {
    el.pauseOverlay.classList.remove('hidden');
  }
  helpReturn = null;
}

function toggleMute() {
  muted = !muted;
  audio.setMuted(muted);
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  updateMuteIcon();
  audio.sfx('click');
}

function toggleSpeed() {
  if (state.mode !== 'game') return;
  state.speed = state.speed === 1 ? 2 : 1;
  el.speedLabel.textContent = `${state.speed}×`;
  audio.sfx('click');
}
