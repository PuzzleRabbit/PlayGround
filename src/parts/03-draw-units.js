/* ----------------------------------------------------------------- Enemies */

function drawEnemies(g) {
  const list = state.enemies.filter(e => !e.dead).sort((a, b) => a.y - b.y);
  for (const e of list) drawEnemy(g, e);
}

function drawHpBar(g, x, y, w, frac, boss, name) {
  const h = boss ? 6 : 4;
  g.fillStyle = 'rgba(4, 5, 10, 0.8)';
  roundRect(g, x - w / 2 - 1, y - 1, w + 2, h + 2, 2);
  g.fill();
  const col = frac > 0.55 ? '#e8c97a' : frac > 0.25 ? '#e59d5a' : '#d96158';
  g.fillStyle = col;
  roundRect(g, x - w / 2, y, Math.max(1, w * frac), h, 1.5);
  g.fill();
  if (boss) {
    g.strokeStyle = 'rgba(232, 201, 122, 0.55)';
    g.lineWidth = 0.8;
    roundRect(g, x - w / 2 - 1, y - 1, w + 2, h + 2, 2);
    g.stroke();
    if (name) {
      g.font = '600 11px Cinzel, Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.fillStyle = 'rgba(255, 230, 170, 0.9)';
      g.shadowColor = 'rgba(0,0,0,.9)';
      g.shadowBlur = 4;
      g.fillText(name.toUpperCase(), x, y - 5);
      g.shadowBlur = 0;
    }
  }
}

function drawEnemy(g, e) {
  const def = ENEMY_TYPES[e.type];
  const boss = !!e.boss;
  const bob = Math.sin(visualTime * 4.2 + e.seed * 7) * (boss ? 1.2 : 2);
  const flip = Math.cos(e.angle || 0) < -0.12 ? -1 : 1;
  const r = e.radius;

  g.save();
  // ground shadow
  g.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ellipse(g, e.x, e.y + r * 0.82, r * 0.95, r * 0.34);
  g.fill();

  // status auras
  if (e.slow > 0.02) {
    g.strokeStyle = 'rgba(126, 232, 210, 0.3)';
    g.lineWidth = 1.4;
    ellipse(g, e.x, e.y + r * 0.8, r * 1.25, r * 0.42);
    g.stroke();
  }
  if (boss) {
    const aura = g.createRadialGradient(e.x, e.y, 2, e.x, e.y, r * 3.6);
    aura.addColorStop(0, 'rgba(180, 52, 52, 0.14)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = aura;
    g.fillRect(e.x - r * 4, e.y - r * 4, r * 8, r * 8);
  }

  g.save();
  g.translate(e.x, e.y + bob);
  g.scale(flip, 1);

  if (e.type === 'locust') {
    const flap = Math.sin(visualTime * 24 + e.seed * 9) * 0.8;
    g.fillStyle = 'rgba(168, 214, 148, 0.22)';
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      g.rotate(-0.35 - flap * 0.35);
      ellipse(g, 11, -8, 10, 3.6);
      g.fill();
      g.strokeStyle = 'rgba(200, 240, 170, 0.25)';
      g.lineWidth = 0.7;
      g.stroke();
      g.restore();
    }
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = 'rgba(120, 142, 76, 0.8)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-2 + i * 3, 3);
      g.lineTo(-9 + i * 4, 10 + Math.sin(visualTime * 12 + i) * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(-2 + i * 3, 3);
      g.lineTo(2 + i * 4, 10);
      g.stroke();
    }
    const body = g.createLinearGradient(0, -6, 0, 8);
    body.addColorStop(0, '#6f803e');
    body.addColorStop(1, '#39451f');
    g.fillStyle = body;
    ellipse(g, 0, 1, 9, 5.5);
    g.fill();
    g.strokeStyle = 'rgba(30, 36, 16, 0.8)';
    g.stroke();
    g.fillStyle = '#2f3819';
    g.beginPath();
    g.arc(7, -1, 3.8, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255, 216, 120, 0.9)';
    g.beginPath();
    g.arc(8.4, -2.2, 1.1, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(190, 214, 120, 0.5)';
    g.beginPath();
    g.moveTo(-7, -1);
    g.lineTo(-12, -4);
    g.moveTo(-7, 2);
    g.lineTo(-12, 4);
    g.stroke();
  } else if (e.type === 'scarab') {
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        g.strokeStyle = 'rgba(86, 66, 34, 0.85)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(side * 6, -3 + i * 5);
        g.lineTo(side * (14 + Math.sin(visualTime * 8 + i) * 2), 4 + i * 5);
        g.stroke();
      }
    }
    const shell = g.createLinearGradient(-10, -8, 12, 10);
    shell.addColorStop(0, '#8a6731');
    shell.addColorStop(0.45, '#59401f');
    shell.addColorStop(1, '#2d2315');
    g.fillStyle = shell;
    ellipse(g, 0, 0, 13.5, 10);
    g.fill();
    g.strokeStyle = 'rgba(226, 186, 105, 0.4)';
    g.lineWidth = 1;
    g.stroke();
    g.strokeStyle = 'rgba(232, 201, 122, 0.45)';
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(0, 9);
    g.stroke();
    g.strokeStyle = 'rgba(232, 201, 122, 0.25)';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(-4 + i * 4, 0, 5 + i * 2, -1.2, 1.2);
      g.stroke();
    }
    g.fillStyle = '#2a2114';
    g.beginPath();
    g.moveTo(10, -6);
    g.lineTo(17, 0);
    g.lineTo(10, 4);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255, 200, 110, 0.85)';
    g.beginPath();
    g.arc(12, -1, 1.1, 0, TAU);
    g.fill();
  } else if (e.type === 'watcher') {
    const flap = Math.sin(visualTime * 7 + e.seed * 5) * 0.35;
    const wy = -4;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        g.save();
        g.translate(side * 6, wy + i * 8);
        g.rotate(side * (-0.4 - flap + i * 0.35));
        g.fillStyle = `rgba(130, 128, 220, ${0.18 - i * 0.04})`;
        g.beginPath();
        g.ellipse(side * 13, 0, 15, 5.5, 0, 0, TAU);
        g.fill();
        g.strokeStyle = 'rgba(170, 168, 245, 0.3)';
        g.lineWidth = 0.8;
        g.stroke();
        g.restore();
      }
    }
    glow(g, 0, wy, 22, 'rgba(140, 140, 235, 0.25)');
    const eye = g.createRadialGradient(-2, wy - 2, 1, 0, wy, 13);
    eye.addColorStop(0, '#f4f1e6');
    eye.addColorStop(0.6, '#cfc8dc');
    eye.addColorStop(1, '#756f9a');
    g.fillStyle = eye;
    ellipse(g, 0, wy, 10, 12);
    g.fill();
    g.strokeStyle = 'rgba(70, 66, 110, 0.8)';
    g.lineWidth = 1;
    g.stroke();
    const iris = g.createRadialGradient(1, wy, 1, 1, wy, 6);
    iris.addColorStop(0, '#b7b5ff');
    iris.addColorStop(0.5, '#5a58b8');
    iris.addColorStop(1, '#24205a');
    g.fillStyle = iris;
    g.beginPath();
    g.arc(2, wy, 6, 0, TAU);
    g.fill();
    g.fillStyle = '#141225';
    g.beginPath();
    g.arc(2.5, wy, 2.8, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.8)';
    g.beginPath();
    g.arc(0, wy - 2.5, 1.4, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(150, 145, 220, 0.5)';
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.55 + i * 0.3;
      g.beginPath();
      g.moveTo(Math.cos(a) * 8, wy + Math.sin(a) * 9);
      g.lineTo(Math.cos(a) * 16, wy + Math.sin(a) * 18);
      g.stroke();
    }
  } else if (e.type === 'nephilim' || e.type === 'goliath') {
    const big = e.type === 'goliath';
    const sc = big ? 1.75 : 1;
    g.scale(sc, sc);
    const walk = Math.sin(visualTime * 3.4 + e.seed * 8) * 0.5;
    const skin = big
      ? ['#7b5f43', '#3d2e22']
      : ['#8b8179', '#403b39'];
    // legs
    for (const side of [-1, 1]) {
      g.strokeStyle = skin[1];
      g.lineWidth = big ? 8 : 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(side * 6, 8);
      g.lineTo(side * (8 + walk * side * 3), 25);
      g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(side * (8 + walk * side * 3), 26);
      g.lineTo(side * (10 + walk * side * 3), 29);
      g.stroke();
    }
    // torso
    const body = g.createLinearGradient(-14, -16, 14, 18);
    body.addColorStop(0, skin[0]);
    body.addColorStop(1, skin[1]);
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(-10, -14);
    g.lineTo(10, -14);
    g.lineTo(14, 12);
    g.lineTo(-14, 12);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(20, 18, 17, 0.5)';
    g.stroke();
    // arms
    for (const side of [-1, 1]) {
      g.strokeStyle = skin[1];
      g.lineWidth = big ? 6 : 5;
      g.beginPath();
      g.moveTo(side * 10, -10);
      g.lineTo(side * (17 + Math.sin(visualTime * 2 + e.seed) * 1.5), 8);
      g.stroke();
      if (big && side === 1) {
        // spear
        g.strokeStyle = '#6b5334';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(24, 16);
        g.lineTo(24, -24);
        g.stroke();
        g.fillStyle = '#cbb27a';
        g.beginPath();
        g.moveTo(24, -31);
        g.lineTo(21, -23);
        g.lineTo(27, -23);
        g.closePath();
        g.fill();
      }
    }
    // head
    g.fillStyle = skin[0];
    g.beginPath();
    g.arc(2, -20, big ? 7.5 : 6.5, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(25, 20, 16, 0.6)';
    g.stroke();
    // horns
    g.strokeStyle = '#c3ae8d';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-3, -24);
    g.quadraticCurveTo(-10, -30, -7, -34);
    g.moveTo(7, -24);
    g.quadraticCurveTo(14, -30, 11, -34);
    g.stroke();
    g.fillStyle = 'rgba(255, 96, 70, 0.95)';
    g.beginPath();
    g.arc(0, -20, 1.2, 0, TAU);
    g.arc(5, -20, 1.2, 0, TAU);
    g.fill();
    // cracks
    g.strokeStyle = big ? 'rgba(255, 150, 80, 0.25)' : 'rgba(232, 201, 122, 0.18)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(-6, -10);
    g.lineTo(-3, -2);
    g.lineTo(-6, 6);
    g.moveTo(6, -8);
    g.lineTo(9, 2);
    g.stroke();
    if (big) {
      // bronze helmet crest
      g.fillStyle = 'rgba(150, 104, 58, 0.85)';
      g.beginPath();
      g.arc(2, -22, 7.5, Math.PI, 0);
      g.fill();
      g.fillStyle = '#c9a45e';
      g.beginPath();
      g.moveTo(2, -34);
      g.lineTo(-2, -26);
      g.lineTo(6, -26);
      g.closePath();
      g.fill();
    }
  } else if (e.type === 'plaguebearer') {
    const sway = Math.sin(visualTime * 2.2 + e.seed * 6);
    // censer
    g.strokeStyle = 'rgba(120, 120, 100, 0.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(11, -8);
    g.lineTo(16 + sway * 3, 9);
    g.stroke();
    glow(g, 17 + sway * 3, 11, 14, 'rgba(120, 220, 120, 0.25)');
    g.fillStyle = 'rgba(90, 170, 90, 0.85)';
    g.beginPath();
    g.arc(17 + sway * 3, 11, 2.6, 0, TAU);
    g.fill();
    // robe
    const robe = g.createLinearGradient(0, -22, 0, 20);
    robe.addColorStop(0, '#283c29');
    robe.addColorStop(1, '#101a12');
    g.fillStyle = robe;
    g.beginPath();
    g.moveTo(0, -24);
    g.quadraticCurveTo(12, -16, 15, 18);
    g.lineTo(-15, 18);
    g.quadraticCurveTo(-12, -16, 0, -24);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(110, 150, 100, 0.35)';
    g.stroke();
    // hood darkness
    g.fillStyle = 'rgba(4, 8, 5, 0.94)';
    g.beginPath();
    ellipse(g, 0, -16, 7, 9);
    g.fill();
    g.fillStyle = 'rgba(150, 255, 150, 0.75)';
    g.beginPath();
    g.arc(-3, -17, 1, 0, TAU);
    g.arc(3, -17, 1, 0, TAU);
    g.fill();
    // smoke wisps
    g.strokeStyle = 'rgba(130, 200, 130, 0.16)';
    g.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) {
      const a = visualTime * 1.4 + i * 2;
      g.beginPath();
      g.moveTo(-8 + i * 7, 4);
      g.quadraticCurveTo(-12 + i * 8 + Math.sin(a) * 4, -4, -7 + i * 7, -12);
      g.stroke();
    }
  } else if (e.type === 'behemoth') {
    const walk = Math.sin(visualTime * 2.5 + e.seed) * 2;
    // legs
    for (const [lx, ly] of [[-20, 14], [18, 16], [-12, 22], [12, 24]]) {
      g.fillStyle = '#3e3028';
      roundRect(g, lx - 5, ly - 6, 10, 17, 4);
      g.fill();
    }
    const body = g.createLinearGradient(-26, -18, 20, 24);
    body.addColorStop(0, '#6d5542');
    body.addColorStop(0.5, '#4b3a2d');
    body.addColorStop(1, '#241c17');
    g.fillStyle = body;
    ellipse(g, 0, 0, 28, 20);
    g.fill();
    g.strokeStyle = 'rgba(26, 20, 16, 0.7)';
    g.lineWidth = 1.4;
    g.stroke();
    // head
    g.fillStyle = '#4a382c';
    g.beginPath();
    ellipse(g, 25, 2, 12, 10);
    g.fill();
    g.strokeStyle = 'rgba(26, 20, 16, 0.7)';
    g.stroke();
    // horns
    g.strokeStyle = '#c2a77f';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(27, -7);
    g.quadraticCurveTo(34, -18, 43, -12);
    g.moveTo(21, -8);
    g.quadraticCurveTo(24, -20, 32, -20);
    g.stroke();
    g.fillStyle = 'rgba(255, 116, 68, 0.9)';
    g.beginPath();
    g.arc(30, 0, 1.6, 0, TAU);
    g.fill();
    // back spikes
    g.fillStyle = '#7b6048';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(-24 + i * 10, -14);
      g.lineTo(-20 + i * 10, -30 - Math.sin(i * 1.7) * 5);
      g.lineTo(-15 + i * 10, -12);
      g.closePath();
      g.fill();
    }
    // glowing cracks
    g.strokeStyle = 'rgba(255, 128, 66, 0.4)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-14, -6);
    g.lineTo(-6, 4);
    g.lineTo(-10, 12);
    g.moveTo(8, -10);
    g.lineTo(3, 0);
    g.lineTo(12, 8);
    g.stroke();
    // dust
    g.fillStyle = 'rgba(170, 150, 120, 0.08)';
    g.beginPath();
    g.arc(-26 + walk, 26, 24, 0, TAU);
    g.fill();
  } else if (e.type === 'leviathan') {
    const wave = Math.sin(visualTime * 3 + e.seed) * 5;
    g.save();
    g.rotate(-0.18);
    for (let i = 5; i >= 0; i--) {
      const x = Math.sin(i * 0.8 + visualTime * 2.4) * 10;
      const y = 18 + i * 11;
      const rr = 9 + i * 1.1;
      const scale = g.createLinearGradient(-rr, 0, rr, 0);
      scale.addColorStop(0, '#245369');
      scale.addColorStop(0.5, '#4f9bb8');
      scale.addColorStop(1, '#1b3e52');
      g.fillStyle = scale;
      g.beginPath();
      ellipse(g, x, y + wave * (i / 6), rr, rr * 0.8);
      g.fill();
      g.strokeStyle = 'rgba(150, 230, 250, 0.2)';
      g.lineWidth = 1;
      g.stroke();
      // fins
      if (i % 2 === 0) {
        g.fillStyle = 'rgba(80, 180, 210, 0.25)';
        g.beginPath();
        g.moveTo(x - rr, y);
        g.lineTo(x - rr - 5, y - 3);
        g.lineTo(x - rr + 2, y + 5);
        g.closePath();
        g.fill();
      }
    }
    // head
    const hx = Math.sin(visualTime * 2.4) * 10;
    const head = g.createLinearGradient(hx - 16, -26, hx + 16, 10);
    head.addColorStop(0, '#78c4da');
    head.addColorStop(1, '#265c70');
    g.fillStyle = head;
    g.beginPath();
    ellipse(g, hx, -12, 18, 15);
    g.fill();
    g.strokeStyle = 'rgba(160, 240, 255, 0.35)';
    g.stroke();
    // jaws
    g.fillStyle = '#162c36';
    g.beginPath();
    g.moveTo(hx - 13, -8);
    g.lineTo(hx + 4, -4);
    g.lineTo(hx - 10, 5);
    g.closePath();
    g.fill();
    g.strokeStyle = '#d7f4ff';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(hx - 8, -4);
    g.lineTo(hx - 5, 0);
    g.moveTo(hx - 3, -3);
    g.lineTo(hx, 1);
    g.stroke();
    g.fillStyle = 'rgba(255, 220, 120, 0.95)';
    g.beginPath();
    g.arc(hx - 7, -17, 2.2, 0, TAU);
    g.fill();
    // crest fins
    g.fillStyle = 'rgba(120, 210, 235, 0.3)';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(hx - 3 + i * 6, -24);
      g.lineTo(hx + i * 6, -38 - i * 2);
      g.lineTo(hx + 4 + i * 6, -23);
      g.closePath();
      g.fill();
    }
    g.restore();
  } else if (e.type === 'abaddon') {
    const flap = Math.sin(visualTime * 2.2 + e.seed) * 0.25;
    // wings
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      g.rotate(flap * side);
      const wing = g.createLinearGradient(6, -20, 52, 26);
      wing.addColorStop(0, 'rgba(66, 20, 26, 0.95)');
      wing.addColorStop(1, 'rgba(16, 8, 12, 0.9)');
      g.fillStyle = wing;
      g.beginPath();
      g.moveTo(6, -18);
      g.quadraticCurveTo(34, -32, 56, -12);
      g.quadraticCurveTo(44, -4, 48, 10);
      g.quadraticCurveTo(32, 2, 28, 16);
      g.quadraticCurveTo(20, 4, 8, 8);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(170, 60, 60, 0.25)';
      g.lineWidth = 1.2;
      g.stroke();
      g.strokeStyle = 'rgba(120, 45, 45, 0.4)';
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(12, -12 + i * 7);
        g.lineTo(42 - i * 4, -8 + i * 8);
        g.stroke();
      }
      g.restore();
    }
    // body
    const body = g.createLinearGradient(-14, -24, 14, 24);
    body.addColorStop(0, '#5c2026');
    body.addColorStop(1, '#1b0c10');
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(-9, -20);
    g.lineTo(9, -20);
    g.lineTo(13, 18);
    g.lineTo(0, 26);
    g.lineTo(-13, 18);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(180, 70, 70, 0.35)';
    g.stroke();
    // head
    g.fillStyle = '#2b1014';
    g.beginPath();
    g.arc(0, -26, 8, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(200, 100, 90, 0.4)';
    g.stroke();
    // crown of horns
    g.strokeStyle = '#c3a97f';
    g.lineWidth = 1.8;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * 4, -32);
      g.lineTo(i * 5, -42 - Math.abs(i) * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(255, 110, 80, 1)';
    g.beginPath();
    g.arc(-3, -27, 1.5, 0, TAU);
    g.arc(3, -27, 1.5, 0, TAU);
    g.fill();
    // chains
    g.strokeStyle = 'rgba(160, 120, 80, 0.4)';
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(-11, 0);
    g.quadraticCurveTo(-22, 12, -16, 25);
    g.moveTo(11, 2);
    g.quadraticCurveTo(22, 14, 17, 27);
    g.stroke();
    glow(g, 0, 0, 60, 'rgba(150, 30, 36, 0.18)');
  }

  if (e.flash > 0) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255, 240, 220, ${e.flash * 3.4})`;
    g.beginPath();
    g.arc(0, -4, r * 1.25, 0, TAU);
    g.fill();
  }
  g.restore();

  // health bar
  const frac = clamp(e.hp / e.maxHp, 0, 1);
  const barWidth = boss ? 92 : Math.min(46, 16 + r * 1.5);
  const barY = e.y - r * (boss ? 2.9 : 1.8) - 8;
  if (boss || frac < 1) {
    drawHpBar(g, e.x, barY, barWidth, frac, boss, def.name);
  }
  if (e.stun > 0) {
    g.strokeStyle = 'rgba(150, 220, 255, 0.8)';
    g.lineWidth = 1.1;
    for (let i = 0; i < 2; i++) {
      const a = visualTime * 7 + i * Math.PI;
      g.beginPath();
      g.arc(e.x, e.y - r - 6, 8, a, a + 0.9);
      g.stroke();
    }
  }
  g.restore();
}

/* -------------------------------------------------------------------- Hero */

function drawHero(g) {
  const h = state.hero;
  const t = visualTime;

  if (h.dead) {
    const x = HERO_START.x;
    const y = HERO_START.y;
    g.save();
    g.globalAlpha = 0.55;
    glow(g, x, y - 20, 40, 'rgba(126, 232, 210, 0.15)');
    g.strokeStyle = 'rgba(126, 232, 210, 0.45)';
    g.lineWidth = 1;
    g.setLineDash([4, 6]);
    g.beginPath();
    g.arc(x, y, 24, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    g.font = '600 11px Cinzel, Georgia, serif';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(210, 245, 235, 0.9)';
    g.fillText(`RETURNING ${Math.ceil(h.respawn)}`, x, y - 36);
    g.restore();
    return;
  }

  const bob = h.moving ? Math.sin(h.walk * 11) * 1.6 : Math.sin(t * 1.8) * 0.9;
  const flip = h.facing < 0 ? -1 : 1;

  g.save();
  g.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ellipse(g, h.x, h.y + 10, 17, 6);
  g.fill();

  if (h.moveTarget) {
    const mt = h.moveTarget;
    g.strokeStyle = 'rgba(126, 232, 210, 0.45)';
    g.lineWidth = 1.2;
    g.setLineDash([3, 5]);
    g.beginPath();
    g.arc(mt.x, mt.y, 10 + Math.sin(t * 4) * 2, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(126, 232, 210, 0.5)';
    g.beginPath();
    g.arc(mt.x, mt.y, 2, 0, TAU);
    g.fill();
  }

  g.translate(h.x, h.y + bob);
  g.scale(flip, 1);

  // halo
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = `rgba(255, 226, 150, ${0.5 + Math.sin(t * 2.2) * 0.12})`;
  g.lineWidth = 1.6;
  g.setLineDash([5, 4]);
  g.beginPath();
  g.ellipse(0, -51, 15, 5, 0, 0, TAU);
  g.stroke();
  g.setLineDash([]);
  glow(g, 0, -34, 34, 'rgba(232, 201, 122, 0.12)');
  g.restore();

  // cloak
  const sway = h.moving ? Math.sin(h.walk * 9) * 3 : Math.sin(t * 1.8) * 1.2;
  g.fillStyle = 'rgba(38, 44, 66, 0.95)';
  g.beginPath();
  g.moveTo(-9, -34);
  g.quadraticCurveTo(-19, -10, -15 + sway, 8);
  g.lineTo(0, 6);
  g.lineTo(15 + sway, 8);
  g.quadraticCurveTo(19, -10, 9, -34);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(232, 201, 122, 0.26)';
  g.lineWidth = 1;
  g.stroke();

  // robe
  const robe = g.createLinearGradient(0, -32, 0, 8);
  robe.addColorStop(0, '#4e526b');
  robe.addColorStop(1, '#1b1e2e');
  g.fillStyle = robe;
  g.beginPath();
  g.moveTo(-8, -30);
  g.lineTo(8, -30);
  g.lineTo(11, 4);
  g.lineTo(-11, 4);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(232, 201, 122, 0.5)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, -30);
  g.lineTo(0, 2);
  g.stroke();
  g.fillStyle = 'rgba(232, 201, 122, 0.35)';
  g.fillRect(-11, 2, 22, 2);

  // shoulders / mantle
  g.fillStyle = '#2d3149';
  g.beginPath();
  ellipse(g, 0, -30, 11, 5);
  g.fill();

  // head
  g.fillStyle = '#e2c7a2';
  g.beginPath();
  g.arc(1, -40, 6.4, 0, TAU);
  g.fill();
  g.fillStyle = '#2a2230';
  g.beginPath();
  g.arc(1, -43, 6.2, Math.PI, 0);
  g.fill();

  // staff
  g.save();
  g.translate(-11, -18);
  g.rotate(-0.08);
  g.strokeStyle = '#6f5533';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 22);
  g.lineTo(0, -42);
  g.stroke();
  g.strokeStyle = 'rgba(232, 201, 122, 0.7)';
  g.lineWidth = 0.9;
  g.beginPath();
  g.arc(0, -46, 4, 0, TAU);
  g.stroke();
  glow(g, 0, -46, 16, 'rgba(126, 232, 210, 0.35)');
  g.fillStyle = h.cast > 0 ? '#ffffff' : '#9df5e2';
  g.beginPath();
  g.arc(0, -46, h.cast > 0 ? 4 : 2.6, 0, TAU);
  g.fill();
  g.restore();

  // shield
  if (h.shield > 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(126, 232, 210, ${0.35 + Math.sin(t * 5) * 0.08})`;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(0, -24, 33, 0, TAU);
    g.stroke();
    g.strokeStyle = 'rgba(232, 201, 122, 0.18)';
    g.setLineDash([2, 7]);
    g.beginPath();
    g.arc(0, -24, 38, t, t + TAU * 0.7);
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  if (h.hurtFlash > 0) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255, 90, 70, ${h.hurtFlash * 0.6})`;
    g.beginPath();
    g.arc(0, -20, 20, 0, TAU);
    g.fill();
  }
  g.restore();
}

/* ------------------------------------------------------------- Projectiles */

function drawProjectiles(g) {
  const t = visualTime;
  for (const p of state.projectiles) {
    if (p.kind === 'bolt') {
      g.save();
      g.globalCompositeOperation = 'lighter';
      if (p.trail) {
        for (let i = 0; i < p.trail.length; i++) {
          const tr = p.trail[i];
          const a = (i / p.trail.length) * 0.35;
          g.fillStyle = `rgba(255, 220, 160, ${a})`;
          g.beginPath();
          g.arc(tr.x, tr.y, 2 + i * 1.2, 0, TAU);
          g.fill();
        }
      }
      glow(g, p.x, p.y, 18, p.color === 'teal' ? 'rgba(126, 232, 210, 0.3)' : 'rgba(255, 170, 90, 0.3)');
      g.fillStyle = p.color === 'teal' ? '#c9fff4' : '#fff4cf';
      g.beginPath();
      g.arc(p.x, p.y, 3.4, 0, TAU);
      g.fill();
      g.restore();
    } else if (p.kind === 'arrow') {
      g.save();
      g.strokeStyle = 'rgba(255, 226, 160, 0.85)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - Math.cos(p.angle) * 24, p.y - Math.sin(p.angle) * 24);
      g.stroke();
      g.strokeStyle = 'rgba(232, 201, 122, 0.25)';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - Math.cos(p.angle) * 34, p.y - Math.sin(p.angle) * 34);
      g.stroke();
      g.fillStyle = '#fff8dd';
      g.beginPath();
      g.arc(p.x, p.y, 2.4, 0, TAU);
      g.fill();
      g.restore();
    } else if (p.kind === 'glob') {
      const tt = clamp(p.t, 0, 1);
      const x = lerp(p.x1, p.x2, tt);
      const y = lerp(p.y1, p.y2, tt);
      const z = Math.sin(tt * Math.PI) * 74;
      g.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ellipse(g, x, y, 7 - tt * 2, 3);
      g.fill();
      g.save();
      g.globalCompositeOperation = 'lighter';
      glow(g, x, y - z, 16, 'rgba(120, 230, 130, 0.25)');
      g.fillStyle = '#b8f5a9';
      g.beginPath();
      g.arc(x, y - z, 4.2, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(150, 255, 150, 0.25)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, y - z, 8 + Math.sin(t * 12) * 1.5, 0, TAU);
      g.stroke();
      g.restore();
    }
  }
}

function drawPools(g) {
  for (const p of state.pools) {
    const alpha = clamp(p.ttl / p.maxTtl, 0, 1);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const grd = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
    grd.addColorStop(0, `rgba(130, 240, 140, ${0.22 * alpha})`);
    grd.addColorStop(0.6, `rgba(70, 170, 90, ${0.1 * alpha})`);
    grd.addColorStop(1, 'rgba(30, 80, 50, 0)');
    g.fillStyle = grd;
    ellipse(g, p.x, p.y, p.r, p.r * 0.45);
    g.fill();
    g.strokeStyle = `rgba(160, 255, 170, ${0.2 * alpha})`;
    g.lineWidth = 1;
    ellipse(g, p.x, p.y, p.r * (0.7 + 0.3 * Math.sin(visualTime * 3 + p.seed)), p.r * 0.35);
    g.stroke();
    for (let i = 0; i < 3; i++) {
      const a = visualTime * 1.2 + i * 2.1 + p.seed;
      const rr = p.r * 0.35;
      g.fillStyle = `rgba(180, 255, 180, ${0.25 * alpha})`;
      g.beginPath();
      g.arc(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.4, 1.6, 0, TAU);
      g.fill();
    }
    g.restore();
  }
}

/* ----------------------------------------------------------------- Effects */

function drawBeams(g) {
  for (const b of state.beams) {
    const a = clamp(b.ttl / b.maxTtl, 0, 1);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const grd = g.createLinearGradient(b.x1, b.y1, b.x2, b.y2);
    grd.addColorStop(0, `rgba(255, 250, 220, ${0.9 * a})`);
    grd.addColorStop(0.4, `rgba(255, 226, 140, ${0.6 * a})`);
    grd.addColorStop(1, `rgba(255, 170, 90, 0)`);
    g.strokeStyle = grd;
    g.lineWidth = b.width * a;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(b.x1, b.y1);
    g.lineTo(b.x2, b.y2);
    g.stroke();
    g.strokeStyle = `rgba(255, 255, 240, ${0.6 * a})`;
    g.lineWidth = Math.max(1, b.width * 0.22 * a);
    g.stroke();
    g.restore();
  }
}

function drawFx(g) {
  for (const f of state.fx) {
    const a = clamp(f.ttl / f.maxTtl, 0, 1);
    g.save();
    g.globalCompositeOperation = 'lighter';
    if (f.kind === 'ring' || f.kind === 'quake' || f.kind === 'shield') {
      const grow = 1 - a;
      g.strokeStyle = f.color.replace('ALPHA', (a * 0.55).toFixed(3));
      g.lineWidth = f.kind === 'quake' ? 2.4 * a : 2 * a;
      g.beginPath();
      g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * grow, 0, TAU);
      g.stroke();
      if (f.kind === 'shield') {
        glow(g, f.x, f.y, f.r1 * 0.8, `rgba(126, 232, 210, ${a * 0.08})`);
      }
    } else if (f.kind === 'smite') {
      const grd = g.createLinearGradient(f.x, f.y - 320, f.x, f.y);
      grd.addColorStop(0, 'rgba(255, 240, 190, 0)');
      grd.addColorStop(0.55, `rgba(255, 220, 140, ${a * 0.42})`);
      grd.addColorStop(1, `rgba(255, 255, 235, ${a * 0.7})`);
      g.fillStyle = grd;
      g.fillRect(f.x - 18 * a, f.y - 320, 36 * a, 320);
      glow(g, f.x, f.y, 70, `rgba(255, 200, 110, ${a * 0.3})`);
      g.strokeStyle = `rgba(255, 232, 170, ${a * 0.7})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(f.x, f.y, 20 + (1 - a) * 90, 0, TAU);
      g.stroke();
    } else if (f.kind === 'holy') {
      glow(g, f.x, f.y, 60 * (1.2 - a), `rgba(255, 230, 160, ${a * 0.35})`);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU + visualTime;
        g.strokeStyle = `rgba(255, 240, 190, ${a * 0.5})`;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(f.x + Math.cos(ang) * 10, f.y + Math.sin(ang) * 10);
        g.lineTo(f.x + Math.cos(ang) * (40 + (1 - a) * 66), f.y + Math.sin(ang) * (40 + (1 - a) * 66));
        g.stroke();
      }
    } else if (f.kind === 'spawn') {
      g.strokeStyle = `rgba(126, 232, 210, ${a * 0.5})`;
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(f.x, f.y, 18 + (1 - a) * 54, 0, TAU);
      g.stroke();
      g.strokeStyle = `rgba(232, 201, 122, ${a * 0.4})`;
      g.setLineDash([2, 5]);
      g.beginPath();
      g.arc(f.x, f.y, 10 + (1 - a) * 30, 0, TAU);
      g.stroke();
      g.setLineDash([]);
    }
    g.restore();
  }
}

function drawParticles(g) {
  for (const p of state.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    g.save();
    if (p.additive) g.globalCompositeOperation = 'lighter';
    g.globalAlpha = a * (p.alpha ?? 1);
    if (p.shape === 'line') {
      g.strokeStyle = p.color;
      g.lineWidth = p.size;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      g.stroke();
    } else if (p.shape === 'coin') {
      g.fillStyle = p.color;
      g.beginPath();
      g.ellipse(p.x, p.y, p.size, p.size * 0.7, 0, 0, TAU);
      g.fill();
    } else {
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.size * (p.shrink ? a : 1), 0, TAU);
      g.fill();
    }
    g.restore();
  }
}

function drawFloaters(g) {
  for (const f of state.floaters) {
    const a = clamp(f.life / f.maxLife, 0, 1);
    g.save();
    g.globalAlpha = Math.min(1, a * 1.6);
    g.font = f.crit ? '700 15px Cinzel, Georgia, serif' : f.kind === 'gold' ? '600 12px Cinzel, Georgia, serif' : '600 11px Spectral, Georgia, serif';
    g.textAlign = 'center';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(4, 5, 9, 0.8)';
    g.strokeText(f.text, f.x, f.y);
    g.fillStyle = f.color;
    g.fillText(f.text, f.x, f.y);
    g.restore();
  }
}

function drawEmbers(g) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const e of embers) {
    const a = clamp(e.life / e.maxLife, 0, 1);
    g.globalAlpha = a * 0.6;
    g.fillStyle = e.color;
    g.beginPath();
    g.arc(e.x + Math.sin(visualTime * 0.6 + e.seed) * 6, e.y, e.size, 0, TAU);
    g.fill();
  }
  g.restore();
}

function drawRangePreviews(g) {
  const h = state.hero;
  const t = visualTime;
  if (state.mode !== 'game') return;

  if (state.selectedTowerId) {
    const tower = state.towers.find(x => x.id === state.selectedTowerId);
    if (tower) {
      const s = towerStats(tower.type, tower.level);
      const range = s.range * state.stats.towerRange;
      g.save();
      g.strokeStyle = 'rgba(232, 201, 122, 0.22)';
      g.lineWidth = 1;
      g.setLineDash([4, 7]);
      g.beginPath();
      g.arc(tower.x, tower.y, range, 0, TAU);
      g.stroke();
      g.setLineDash([]);
      if (tower.type === 'seal') {
        const grd = g.createRadialGradient(tower.x, tower.y, 0, tower.x, tower.y, range);
        grd.addColorStop(0, 'rgba(126, 232, 210, 0.03)');
        grd.addColorStop(1, 'rgba(126, 232, 210, 0.07)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(tower.x, tower.y, range, 0, TAU);
        g.fill();
      }
      g.restore();
    }
  }

  if (state.selectedBuild) {
    const def = BUILD_TYPES[state.selectedBuild];
    const pad = state.hoverPad != null ? state.pads[state.hoverPad] : null;
    if (def && def.pad === 'guardian' && pad && !pad.towerId) {
      const s = towerStats(state.selectedBuild, 1);
      if (s) {
        const range = s.range * state.stats.towerRange;
        const affordable = state.gold >= def.cost;
        g.save();
        g.strokeStyle = affordable ? 'rgba(232, 201, 122, 0.4)' : 'rgba(227, 121, 109, 0.4)';
        g.lineWidth = 1.2;
        g.setLineDash([5, 8]);
        g.beginPath();
        g.arc(pad.x, pad.y, range, 0, TAU);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = affordable ? 'rgba(232, 201, 122, 0.035)' : 'rgba(227, 121, 109, 0.035)';
        g.fill();
        g.restore();
      }
    }
  }

  // hero attack radius is shown faintly when standing still
  if (!h.dead && state.phase === 'wave') {
    g.save();
    g.strokeStyle = 'rgba(126, 232, 210, 0.045)';
    g.lineWidth = 1;
    g.setLineDash([2, 9]);
    g.beginPath();
    g.arc(h.x, h.y, 236, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  // cursor rune when placing
  if (state.selectedBuild && state.phase !== 'title') {
    const isGuardian = BUILD_TYPES[state.selectedBuild].pad === 'guardian';
    if (!isGuardian || state.hoverPad == null) {
      const x = pointer.wx;
      const y = pointer.wy;
      if (x > 0 && y > 0) {
        g.save();
        g.globalAlpha = 0.3 + Math.sin(t * 4) * 0.1;
        g.strokeStyle = 'rgba(232, 201, 122, 0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y, 16, 0, TAU);
        g.stroke();
        g.restore();
      }
    }
  }
}
