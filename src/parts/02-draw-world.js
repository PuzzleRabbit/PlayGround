// ---------------------------------------------------------------------------
// Rendering

function glow(g, x, y, r, color) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

function draw() {
  const { w, h, dpr, scale, ox, oy } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const backdrop = ctx.createLinearGradient(0, 0, 0, h);
  backdrop.addColorStop(0, '#04050a');
  backdrop.addColorStop(0.6, '#06070e');
  backdrop.addColorStop(1, '#0a0810');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, w, h);

  const shake = state.shake > 0 ? state.shake : 0;
  const sx = shake ? rand(-shake, shake) : 0;
  const sy = shake ? rand(-shake, shake) : 0;

  ctx.save();
  ctx.translate(ox + sx, oy + sy);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.rect(0, 0, WORLD.width, WORLD.height);
  ctx.clip();

  ctx.drawImage(bgLayer, 0, 0);
  ctx.drawImage(pathLayer, 0, 0);
  drawAtmosphere(ctx);
  drawPathPulses(ctx);
  drawPools(ctx);
  drawSanctum(ctx);
  drawPads(ctx);
  drawSanctuary(ctx);
  drawEconomy(ctx);
  drawRangePreviews(ctx);
  drawTowers(ctx);
  drawEnemies(ctx);
  drawHero(ctx);
  drawProjectiles(ctx);
  drawBeams(ctx);
  drawFx(ctx);
  drawParticles(ctx);
  drawFloaters(ctx);
  drawEmbers(ctx);

  if (state.gateFlash > 0) {
    const alpha = Math.min(0.22, state.gateFlash * 0.22);
    ctx.fillStyle = `rgba(150, 32, 28, ${alpha})`;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  ctx.restore();
}

function drawAtmosphere(g) {
  const t = visualTime;
  g.save();
  g.globalCompositeOperation = 'screen';
  const fogs = [
    { x: 320 + Math.sin(t * 0.035) * 90, y: 690 + Math.cos(t * 0.028) * 28, r: 390, c: 'rgba(58, 91, 110, 0.045)' },
    { x: 950 + Math.cos(t * 0.03) * 120, y: 260 + Math.sin(t * 0.04) * 40, r: 430, c: 'rgba(104, 72, 132, 0.035)' },
    { x: 730 + Math.sin(t * 0.024 + 2) * 160, y: 520 + Math.cos(t * 0.033) * 50, r: 460, c: 'rgba(48, 88, 82, 0.028)' }
  ];
  for (const f of fogs) glow(g, f.x, f.y, f.r, f.c);
  g.restore();
}

function drawPathPulses(g) {
  const t = visualTime;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const d = (t * 48 + i * (PATH_LENGTH / 16)) % PATH_LENGTH;
    const p = pointAtDistance(d);
    const a = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2 + i));
    glow(g, p.x, p.y, 22, `rgba(232, 201, 122, ${a * 0.34})`);
    g.fillStyle = `rgba(255, 228, 164, ${a})`;
    g.beginPath();
    g.arc(p.x, p.y, 1.8, 0, TAU);
    g.fill();
  }

  // portal at the edge of the world while a wave is active
  if (state.phase === 'wave') {
    const p = pointAtDistance(18);
    const pulse = 0.6 + 0.4 * Math.sin(t * 4);
    glow(g, p.x, p.y, 120, `rgba(126, 232, 210, ${0.06 + pulse * 0.04})`);
    g.strokeStyle = `rgba(126, 232, 210, ${0.15 + pulse * 0.2})`;
    g.lineWidth = 2;
    g.setLineDash([8, 12]);
    g.beginPath();
    g.arc(p.x, p.y, 46 + Math.sin(t * 3) * 4, t, t + TAU * 0.8);
    g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

/* ------------------------------------------------------------------ Pads */

function drawRune(g, index, radius, color, alpha) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = 1.2;
  g.globalAlpha = alpha;
  const kind = index % 5;
  if (kind === 0) {
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * TAU;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.stroke();
  } else if (kind === 1) {
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * TAU;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.stroke();
  } else if (kind === 2) {
    g.beginPath();
    g.arc(0, 0, radius * 0.8, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(-radius * 0.55, 0);
    g.lineTo(radius * 0.55, 0);
    g.moveTo(0, -radius * 0.55);
    g.lineTo(0, radius * 0.55);
    g.stroke();
  } else if (kind === 3) {
    for (let i = 0; i < 3; i++) {
      g.rotate(TAU / 3);
      g.beginPath();
      g.moveTo(0, -radius * 0.9);
      g.lineTo(radius * 0.4, radius * 0.3);
      g.lineTo(-radius * 0.4, radius * 0.3);
      g.closePath();
      g.stroke();
    }
  } else {
    g.beginPath();
    for (let i = 0; i < 20; i++) {
      const a = (i / 19) * TAU * 1.4;
      const r = (i / 19) * radius;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();
}

function drawPad(g, pad) {
  const tower = pad.towerId ? state.towers.find(t => t.id === pad.towerId) : null;
  const hover = state.hoverPad === pad.index;
  const selecting = state.selectedBuild && BUILD_TYPES[state.selectedBuild]?.pad === 'guardian';
  const active = hover || (selecting && !tower);
  const t = visualTime;
  g.save();
  g.translate(pad.x, pad.y);

  if (!tower) {
    if (active) glow(g, 0, 0, 64, 'rgba(232, 201, 122, 0.14)');
    g.fillStyle = 'rgba(6, 7, 12, 0.6)';
    g.beginPath();
    g.arc(0, 0, 31, 0, TAU);
    g.fill();
    g.strokeStyle = active ? 'rgba(255, 224, 154, 0.8)' : 'rgba(232, 201, 122, 0.28)';
    g.lineWidth = active ? 1.7 : 1;
    g.beginPath();
    g.arc(0, 0, 31, 0, TAU);
    g.stroke();

    g.save();
    g.rotate(t * 0.15 + pad.index);
    g.setLineDash([4, 9]);
    g.strokeStyle = active ? 'rgba(232, 201, 122, 0.6)' : 'rgba(232, 201, 122, 0.18)';
    g.beginPath();
    g.arc(0, 0, 39, 0, TAU);
    g.stroke();
    g.restore();

    drawRune(g, pad.index, 16, active ? 'rgba(255, 232, 178, 0.85)' : 'rgba(232, 201, 122, 0.4)', 1);

    if (selecting) {
      g.globalAlpha = 0.45 + 0.3 * Math.sin(t * 3 + pad.index);
      g.strokeStyle = 'rgba(255, 230, 170, 0.7)';
      g.beginPath();
      g.arc(0, 0, 46, 0, TAU);
      g.stroke();
    }
  } else {
    // occupied pad: a soft halo beneath the guardian
    g.strokeStyle = hover ? 'rgba(232, 201, 122, 0.6)' : 'rgba(232, 201, 122, 0.16)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(0, 0, 31, 0, TAU);
    g.stroke();
    g.setLineDash([2, 7]);
    g.strokeStyle = 'rgba(232, 201, 122, 0.12)';
    g.beginPath();
    g.arc(0, 0, 39, 0, TAU);
    g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

function drawPads(g) {
  for (const pad of state.pads) drawPad(g, pad);
}

function drawSanctum(g) {
  const t = visualTime;
  const selecting = state.selectedBuild && BUILD_TYPES[state.selectedBuild]?.pad === 'sanctum';
  for (const pad of state.sanctum) {
    const econ = pad.econId ? state.economy.find(e => e.id === pad.econId) : null;
    if (econ) continue;
    const hover = state.hoverSanctum === pad.index;
    const active = hover || selecting;
    g.save();
    g.translate(pad.x, pad.y);
    if (active) glow(g, 0, 0, 55, 'rgba(126, 232, 210, 0.12)');
    g.fillStyle = 'rgba(8, 9, 15, 0.7)';
    g.beginPath();
    g.moveTo(0, -26);
    g.lineTo(26, 0);
    g.lineTo(0, 26);
    g.lineTo(-26, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = active ? 'rgba(126, 232, 210, 0.75)' : 'rgba(232, 201, 122, 0.22)';
    g.lineWidth = active ? 1.5 : 1;
    g.stroke();
    g.strokeStyle = active ? 'rgba(126, 232, 210, 0.55)' : 'rgba(232, 201, 122, 0.15)';
    g.beginPath();
    g.moveTo(0, -17);
    g.lineTo(17, 0);
    g.lineTo(0, 17);
    g.lineTo(-17, 0);
    g.closePath();
    g.stroke();
    g.fillStyle = active ? 'rgba(255, 226, 160, 0.9)' : 'rgba(232, 201, 122, 0.42)';
    g.font = '600 12px Cinzel, Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('✦', 0, 1);
    if (active) {
      g.globalAlpha = 0.4 + 0.25 * Math.sin(t * 2.4 + pad.index);
      g.beginPath();
      g.arc(0, 0, 36, 0, TAU);
      g.strokeStyle = 'rgba(126, 232, 210, 0.55)';
      g.stroke();
    }
    g.restore();
  }
}

/* ------------------------------------------------------------- Sanctuary */

function drawFlame(g, x, y, size, seed, tint = 1) {
  const t = visualTime;
  const flick = Math.sin(t * 9 + seed) * 0.16 + Math.sin(t * 15.3 + seed * 2) * 0.07;
  g.save();
  g.translate(x, y);
  g.globalCompositeOperation = 'lighter';
  const grd = g.createLinearGradient(0, 0, 0, -size * (1 + flick));
  if (tint > 0.5) {
    grd.addColorStop(0, 'rgba(255, 120, 40, 0.75)');
    grd.addColorStop(0.5, 'rgba(255, 194, 92, 0.6)');
    grd.addColorStop(1, 'rgba(255, 238, 180, 0)');
  } else {
    grd.addColorStop(0, 'rgba(40, 160, 160, 0.6)');
    grd.addColorStop(0.6, 'rgba(126, 232, 210, 0.35)');
    grd.addColorStop(1, 'rgba(200, 255, 240, 0)');
  }
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(-size * 0.28, 0);
  g.quadraticCurveTo(-size * 0.4, -size * 0.5, -size * 0.1 + flick * 8, -size * 0.85);
  g.quadraticCurveTo(size * 0.12, -size * 0.55, size * 0.26, 0);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255, 248, 214, 0.55)';
  g.beginPath();
  g.ellipse(0, -size * 0.18, size * 0.09, size * 0.28, 0, 0, TAU);
  g.fill();
  g.restore();
}

function drawSanctuary(g) {
  const t = visualTime;
  const { x, y } = SANCTUARY;
  const hpFrac = state.sanctuaryHp / state.maxSanctuaryHp;
  g.save();
  g.translate(x, y);

  glow(g, 0, 8, 230, `rgba(126, 232, 210, ${0.05 + hpFrac * 0.04 + Math.sin(t * 1.6) * 0.01})`);

  // platform and steps
  ellipse(g, 0, 62, 166, 54);
  g.fillStyle = 'rgba(7, 8, 13, 0.9)';
  g.fill();
  g.strokeStyle = 'rgba(232, 201, 122, 0.13)';
  g.lineWidth = 1.2;
  g.stroke();

  for (let i = 0; i < 3; i++) {
    ellipse(g, 0, 66 - i * 14, 132 - i * 15, 38 - i * 4);
    g.fillStyle = `rgba(${22 + i * 4}, ${21 + i * 3}, ${30 + i * 3}, 0.95)`;
    g.fill();
    g.strokeStyle = `rgba(232, 201, 122, ${0.06 + i * 0.02})`;
    g.stroke();
  }

  // pillars
  const pillar = (px) => {
    const grd = g.createLinearGradient(px - 14, 0, px + 14, 0);
    grd.addColorStop(0, '#191722');
    grd.addColorStop(0.45, '#39313a');
    grd.addColorStop(0.7, '#2a2430');
    grd.addColorStop(1, '#13121b');
    g.fillStyle = grd;
    roundRect(g, px - 14, -114, 28, 152, 4);
    g.fill();
    g.strokeStyle = 'rgba(232, 201, 122, 0.18)';
    g.lineWidth = 1;
    g.stroke();
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = 'rgba(0, 0, 0, 0.24)';
      g.beginPath();
      g.moveTo(px - 8 + i * 5, -100);
      g.lineTo(px - 8 + i * 5, 22);
      g.stroke();
    }
    g.fillStyle = '#3b3440';
    roundRect(g, px - 20, -124, 40, 12, 2);
    g.fill();
    g.strokeStyle = 'rgba(232, 201, 122, 0.26)';
    g.stroke();
    g.fillStyle = 'rgba(232, 201, 122, 0.12)';
    g.fillRect(px - 17, -96, 34, 2);
  };
  pillar(-76);
  pillar(76);

  // lintel
  g.fillStyle = '#2a2431';
  roundRect(g, -100, -146, 200, 22, 3);
  g.fill();
  g.strokeStyle = 'rgba(232, 201, 122, 0.24)';
  g.stroke();
  g.strokeStyle = 'rgba(232, 201, 122, 0.14)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-86, -135);
  g.lineTo(86, -135);
  g.stroke();

  // glyphs on lintel
  g.fillStyle = 'rgba(232, 201, 122, 0.55)';
  g.font = '600 11px Cinzel, Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('✦  ✧  ✦', 0, -134);

  // portal
  const portal = g.createRadialGradient(0, -18, 4, 0, -18, 82);
  portal.addColorStop(0, 'rgba(216, 255, 240, 0.9)');
  portal.addColorStop(0.28, 'rgba(126, 232, 210, 0.55)');
  portal.addColorStop(0.7, 'rgba(38, 108, 116, 0.28)');
  portal.addColorStop(1, 'rgba(10, 30, 38, 0)');
  g.fillStyle = portal;
  ellipse(g, 0, -22, 50, 82);
  g.fill();

  // portal rings
  g.save();
  g.translate(0, -22);
  for (let i = 0; i < 2; i++) {
    g.rotate(t * (i ? -0.18 : 0.24));
    g.strokeStyle = `rgba(180, 255, 234, ${0.16 - i * 0.05})`;
    g.lineWidth = 1;
    g.setLineDash([3, 9]);
    g.beginPath();
    g.ellipse(0, 0, 36 + i * 10, 66 + i * 8, 0, 0, TAU);
    g.stroke();
  }
  g.restore();

  // banners
  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * 61, -98);
    g.fillStyle = 'rgba(91, 33, 38, 0.85)';
    g.beginPath();
    g.moveTo(-9, 0);
    g.lineTo(9, 0);
    g.lineTo(9, 42);
    g.lineTo(0, 51);
    g.lineTo(-9, 42);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(232, 201, 122, 0.32)';
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = 'rgba(232, 201, 122, 0.6)';
    g.font = '600 9px Cinzel, Georgia, serif';
    g.textAlign = 'center';
    g.fillText('✦', 0, 22);
    g.restore();
  }

  // braziers
  for (const side of [-1, 1]) {
    const bx = side * 114;
    const by = 26;
    g.fillStyle = '#1b1920';
    g.beginPath();
    g.moveTo(bx - 10, by);
    g.lineTo(bx + 10, by);
    g.lineTo(bx + 6, by + 14);
    g.lineTo(bx - 6, by + 14);
    g.closePath();
    g.fill();
    g.fillStyle = '#2c2730';
    g.fillRect(bx - 1.5, by + 14, 3, 20);
    ellipse(g, bx, by + 35, 10, 4);
    g.fillStyle = '#17151c';
    g.fill();
    drawFlame(g, bx, by - 2, 32, side * 3, 1);
  }

  // shield dome
  if (state.mode === 'game') {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(126, 232, 210, ${0.08 + hpFrac * 0.18})`;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, -6, 158, Math.PI * 1.06, Math.PI * 1.94);
    g.stroke();
    g.strokeStyle = 'rgba(232, 201, 122, 0.12)';
    g.beginPath();
    g.arc(0, -6, 149, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    g.restore();
  }

  g.restore();
}

/* --------------------------------------------------------------- Economy */

function drawEconomy(g) {
  const t = visualTime;
  for (const e of state.economy) {
    const def = ECONOMY[e.type];
    const hover = state.hoverSanctum === e.padIndex;
    g.save();
    g.translate(e.x, e.y);
    const pulse = 0.6 + 0.4 * Math.sin(t * 1.7 + e.id);
    glow(g, 0, -8, 64, `rgba(232, 201, 122, ${0.05 + pulse * 0.03})`);

    // base
    ellipse(g, 0, 20, 36, 13);
    g.fillStyle = 'rgba(8, 9, 15, 0.9)';
    g.fill();
    g.strokeStyle = hover ? 'rgba(232, 201, 122, 0.7)' : 'rgba(232, 201, 122, 0.22)';
    g.lineWidth = 1.2;
    g.stroke();

    if (e.type === 'well') {
      ellipse(g, 0, -2, 24, 11);
      g.fillStyle = '#242330';
      g.fill();
      g.strokeStyle = 'rgba(126, 232, 210, 0.4)';
      g.stroke();
      const water = g.createRadialGradient(0, -2, 2, 0, -2, 22);
      water.addColorStop(0, 'rgba(190, 255, 248, 0.8)');
      water.addColorStop(0.6, 'rgba(80, 190, 200, 0.5)');
      water.addColorStop(1, 'rgba(20, 60, 70, 0)');
      g.fillStyle = water;
      ellipse(g, 0, -2, 20, 8);
      g.fill();
      g.strokeStyle = 'rgba(232, 201, 122, 0.25)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-20, 18);
      g.lineTo(-20, 2);
      g.moveTo(20, 18);
      g.lineTo(20, 2);
      g.stroke();
      g.fillStyle = 'rgba(232, 201, 122, 0.5)';
      g.beginPath();
      g.arc(0, -16 - Math.sin(t * 2 + e.id) * 3, 2.2, 0, TAU);
      g.fill();
    } else if (e.type === 'reliquary') {
      g.fillStyle = '#4a3520';
      roundRect(g, -24, -4, 48, 22, 4);
      g.fill();
      g.strokeStyle = 'rgba(232, 201, 122, 0.5)';
      g.stroke();
      g.fillStyle = '#5d4326';
      roundRect(g, -24, -14, 48, 12, 5);
      g.fill();
      g.strokeStyle = 'rgba(232, 201, 122, 0.65)';
      g.stroke();
      g.fillStyle = 'rgba(255, 226, 156, 0.85)';
      g.fillRect(-2, -10, 4, 20);
      g.beginPath();
      g.arc(0, -3, 6, Math.PI, 0);
      g.strokeStyle = 'rgba(255, 226, 156, 0.8)';
      g.lineWidth = 1.4;
      g.stroke();
      g.fillStyle = `rgba(255, 230, 160, ${0.25 + pulse * 0.35})`;
      g.beginPath();
      g.arc(0, -19 - Math.sin(t * 2.4 + e.id) * 2, 3, 0, TAU);
      g.fill();
    } else {
      // oracle tent
      g.fillStyle = 'rgba(58, 42, 86, 0.9)';
      g.beginPath();
      g.moveTo(0, -38);
      g.lineTo(30, 16);
      g.lineTo(-30, 16);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(183, 155, 240, 0.55)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = 'rgba(20, 15, 30, 0.9)';
      g.beginPath();
      g.moveTo(0, -14);
      g.lineTo(10, 16);
      g.lineTo(-10, 16);
      g.closePath();
      g.fill();
      g.fillStyle = `rgba(210, 190, 255, ${0.6 + pulse * 0.3})`;
      g.beginPath();
      g.ellipse(0, -6, 6, 3, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#2a1f3a';
      g.beginPath();
      g.arc(0, -6, 1.9, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(232, 201, 122, 0.32)';
      g.beginPath();
      g.moveTo(0, -38);
      g.lineTo(0, -47);
      g.stroke();
      g.fillStyle = 'rgba(232, 201, 122, 0.7)';
      g.beginPath();
      g.arc(0, -49, 2, 0, TAU);
      g.fill();
    }

    // level pips
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i < e.level ? 'rgba(255, 226, 160, 0.85)' : 'rgba(232, 201, 122, 0.16)';
      g.beginPath();
      g.arc(-12 + i * 8, 33, 1.9, 0, TAU);
      g.fill();
    }
    g.restore();
  }
}

/* ---------------------------------------------------------------- Towers */

function drawTowers(g) {
  const t = visualTime;
  for (const tower of state.towers) {
    const def = TOWERS[tower.type];
    const stats = towerStats(tower.type, tower.level);
    const s = 1;
    g.save();
    g.translate(tower.x, tower.y);
    const hover = state.hoverTowerId === tower.id;
    const selected = state.selectedTowerId === tower.id;
    if (hover || selected) glow(g, 0, -30, 60, 'rgba(232, 201, 122, 0.12)');

    // pedestal
    ellipse(g, 0, 24, 26, 10);
    g.fillStyle = 'rgba(6, 7, 12, 0.9)';
    g.fill();
    ellipse(g, 0, 20, 21, 8);
    g.fillStyle = '#1d1c28';
    g.fill();
    g.strokeStyle = selected ? 'rgba(255, 230, 170, 0.75)' : 'rgba(232, 201, 122, 0.26)';
    g.lineWidth = 1.2;
    g.stroke();
    g.strokeStyle = 'rgba(232, 201, 122, 0.13)';
    g.beginPath();
    g.ellipse(0, 20, 28, 11, 0, 0, TAU);
    g.stroke();

    const bob = Math.sin(t * 1.9 + tower.id * 1.3) * 2.2;
    const stun = tower.stun > 0;

    if (tower.type === 'ember') {
      g.save();
      g.translate(0, -34 + bob);
      const flap = Math.sin(t * 5 + tower.id) * 0.22;
      for (const side of [-1, 1]) {
        g.save();
        g.scale(side, 1);
        g.rotate(flap * side);
        g.fillStyle = 'rgba(255, 186, 118, 0.22)';
        g.beginPath();
        g.moveTo(6, 0);
        g.quadraticCurveTo(30, -18, 40, -2);
        g.quadraticCurveTo(28, 4, 7, 10);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(255, 210, 150, 0.35)';
        g.lineWidth = 1;
        g.stroke();
        g.restore();
      }
      glow(g, 0, 0, 26, 'rgba(255, 150, 60, 0.42)');
      const orb = g.createRadialGradient(-3, -3, 1, 0, 0, 11);
      orb.addColorStop(0, '#fff8dc');
      orb.addColorStop(0.5, '#ffc46b');
      orb.addColorStop(1, '#b24a1c');
      g.fillStyle = orb;
      g.beginPath();
      g.arc(0, 0, 10, 0, TAU);
      g.fill();
      g.restore();
    } else if (tower.type === 'serpent') {
      g.save();
      g.translate(0, 4);
      g.strokeStyle = 'rgba(150, 130, 95, 0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 16);
      g.lineTo(0, -46);
      g.stroke();
      g.strokeStyle = 'rgba(126, 220, 135, 0.85)';
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= 30; i++) {
        const p = i / 30;
        const y = 10 - p * 52;
        const x = Math.sin(p * Math.PI * 4 + t * 1.4) * (7 + p * 2);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      g.fillStyle = 'rgba(160, 245, 164, 0.9)';
      g.beginPath();
      g.arc(Math.sin(4 * Math.PI + t * 1.4) * 9, -42 + bob * 0.4, 3, 0, TAU);
      g.fill();
      glow(g, 0, -44 + bob, 18, 'rgba(90, 220, 120, 0.3)');
      g.restore();
    } else if (tower.type === 'ballista') {
      g.save();
      g.translate(0, 1);
      g.fillStyle = '#2a2330';
      roundRect(g, -10, -6, 20, 24, 3);
      g.fill();
      g.strokeStyle = 'rgba(232, 201, 122, 0.3)';
      g.stroke();
      g.rotate(tower.aim || 0);
      g.strokeStyle = '#b78b4c';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-24, -4);
      g.quadraticCurveTo(0, -18, 24, -4);
      g.stroke();
      g.strokeStyle = 'rgba(232, 201, 122, 0.7)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-24, -4);
      g.lineTo(24, -4);
      g.stroke();
      g.fillStyle = '#e7d3a3';
      g.fillRect(-1, -4, 34, 2.4);
      g.fillStyle = '#f3e4bb';
      g.beginPath();
      g.moveTo(33, -2.8);
      g.lineTo(26, -6);
      g.lineTo(26, 0.4);
      g.closePath();
      g.fill();
      g.restore();
      glow(g, 0, -4, 20, 'rgba(232, 201, 122, 0.12)');
    } else if (tower.type === 'seal') {
      g.save();
      g.translate(0, -36 + bob);
      g.rotate(t * 0.35);
      glow(g, 0, 0, 34, 'rgba(126, 232, 210, 0.22)');
      g.strokeStyle = 'rgba(126, 232, 210, 0.8)';
      g.lineWidth = 1.4;
      for (let i = 0; i < 2; i++) {
        g.beginPath();
        for (let p = 0; p < 3; p++) {
          const a = (p / 3) * TAU + i * Math.PI;
          const x = Math.cos(a) * 15;
          const y = Math.sin(a) * 15;
          if (p === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.closePath();
        g.stroke();
      }
      g.beginPath();
      g.arc(0, 0, 20, 0, TAU);
      g.strokeStyle = 'rgba(232, 201, 122, 0.4)';
      g.stroke();
      g.fillStyle = '#e9fdf7';
      g.beginPath();
      g.arc(0, 0, 2.4, 0, TAU);
      g.fill();
      g.restore();
    }

    // level pips
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i < tower.level ? 'rgba(255, 226, 160, 0.9)' : 'rgba(232, 201, 122, 0.16)';
      g.beginPath();
      g.arc(-12 + i * 8, 32, 1.9, 0, TAU);
      g.fill();
    }

    if (stun) {
      g.strokeStyle = 'rgba(130, 200, 255, 0.7)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * 2.1;
        g.beginPath();
        g.arc(0, -26, 20, a, a + 0.55);
        g.stroke();
      }
    }

    g.restore();
  }
}
