import {
  WORLD, TOTAL_WAVES, PATH, PATH_LENGTH, SANCTUARY, HERO_START, PADS, SANCTUM_PADS,
  ENEMY_TYPES, TOWERS, ECONOMY, BUILD_TYPES, WAVES, BOONS, ABILITIES,
  pointAtDistance, hpScale, waveReward, xpForLevel, damageAfterArmor,
  towerStats, towerUpgradeCost, towerInvested, economyIncome, economyUpgradeCost,
  economyInvested, buildSpawnQueue, waveEnemySummary, roman, defaultStats,
  randomBoonChoices
} from './logic.js';
import { AudioEngine } from './audio.js';

const TAU = Math.PI * 2;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const audio = new AudioEngine();

const $ = (id) => document.getElementById(id);
const el = {
  hud: $('hud'), gold: $('goldValue'), seals: $('sealValue'), wave: $('waveValue'),
  speed: $('speedBtn'), speedLabel: $('speedLabel'), mute: $('muteBtn'),
  help: $('helpBtn'), pause: $('pauseBtn'), waveProgress: $('waveProgress'),
  banner: $('waveBanner'), toasts: $('toasts'), tooltip: $('tooltip'),
  shop: $('shop'), shopClose: $('shopClose'), armory: $('armoryBtn'),
  towerCards: $('towerCards'), econCards: $('econCards'), selectedPanel: $('selectedPanel'),
  heroBar: $('heroBar'), heroLevel: $('heroLevel'), boonCount: $('boonCount'),
  hpFill: $('hpFill'), hpText: $('hpText'), manaFill: $('manaFill'), manaText: $('manaText'),
  xpFill: $('xpFill'), xpText: $('xpText'), abilities: $('abilities'),
  phaseLabel: $('phaseLabel'), waveTitle: $('waveTitle'), wavePreview: $('wavePreview'),
  horn: $('hornBtn'),
  title: $('titleOverlay'), start: $('startBtn'), how: $('howBtn'), best: $('bestBadge'),
  boonOverlay: $('boonOverlay'), boonCards: $('boonCards'), boonLevel: $('boonLevel'),
  pauseOverlay: $('pauseOverlay'), resume: $('resumeBtn'), pauseHelp: $('pauseHelpBtn'),
  pauseRestart: $('pauseRestartBtn'),
  endOverlay: $('endOverlay'), endEyebrow: $('endEyebrow'), endTitle: $('endTitle'),
  endSub: $('endSub'), endStats: $('endStats'), endFoot: $('endFoot'),
  retry: $('retryBtn'), endTitleBtn: $('endTitleBtn'),
  helpOverlay: $('helpOverlay'), helpClose: $('helpClose'), helpDone: $('helpDone')
};

const BEST_KEY = 'covenant.bestWave';
const MUTE_KEY = 'covenant.muted';

const view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
const keys = new Set();
const pointer = { x: 0, y: 0, wx: 800, wy: 450, inside: false };
let visualTime = 0;
let state = createState('preview');
let lastFrame = performance.now();
let nextId = 1;
let boonChoices = [];
let lastGold = -1;
let lastSelectionKey = '';
let helpReturn = null;
let embers = [];
let bestWave = readNumber(BEST_KEY, 0);
let muted = localStorage.getItem(MUTE_KEY) === '1';

const textCache = new WeakMap();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function readNumber(key, fallback) {
  const raw = localStorage.getItem(key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function setText(node, value) {
  if (!node) return;
  if (textCache.get(node) === value) return;
  textCache.set(node, value);
  node.textContent = value;
}

function createHero() {
  return {
    x: HERO_START.x, y: HERO_START.y,
    hp: 220, maxHp: 220, mana: 100, maxMana: 100,
    level: 1, xp: 0, xpNext: xpForLevel(1),
    atkCd: 0, atkRate: 1.35, baseAtk: 26,
    shield: 0, shieldT: 0, dead: false, respawn: 0,
    facing: 1, moving: false, walk: 0, hurtFlash: 0, cast: 0,
    moveTarget: null,
    cooldowns: { q: 0, w: 0, e: 0, r: 0 }
  };
}

function createState(mode) {
  const game = mode === 'game';
  return {
    mode,
    phase: game ? 'prep' : 'title',
    phaseBeforeBoon: 'prep',
    time: 0,
    wave: 1,
    gold: 320,
    sanctuaryHp: 20,
    maxSanctuaryHp: 20,
    wavesCleared: 0,
    kills: 0,
    goldEarned: 0,
    towersBuilt: 0,
    heroesFallen: 0,
    leaks: 0,
    enemies: [],
    towers: [],
    economy: [],
    projectiles: [],
    pools: [],
    particles: [],
    floaters: [],
    beams: [],
    fx: [],
    pads: PADS.map((p, i) => ({ ...p, index: i, towerId: null })),
    sanctum: SANCTUM_PADS.map((p, i) => ({ ...p, index: i, econId: null })),
    hero: createHero(),
    stats: defaultStats(),
    boons: [],
    pendingBoons: 0,
    spawnQueue: [],
    spawnIndex: 0,
    waveTotal: 0,
    elapsed: 0,
    selectedBuild: null,
    selectedTowerId: null,
    selectedEconId: null,
    hoverPad: null,
    hoverSanctum: null,
    hoverTowerId: null,
    speed: 1,
    shake: 0,
    gateFlash: 0,
    resumePhase: 'prep',
    lastPayout: 0,
    incomeThisWave: 0
  };
}

// ---------------------------------------------------------------------------
// Static art (generated once)

const bgLayer = document.createElement('canvas');
const pathLayer = document.createElement('canvas');
bgLayer.width = WORLD.width;
bgLayer.height = WORLD.height;
pathLayer.width = WORLD.width;
pathLayer.height = WORLD.height;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

function ellipse(g, x, y, rx, ry) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
}

function drawMountain(g, rnd, baseY, height, color, roughness) {
  g.beginPath();
  g.moveTo(-40, WORLD.height);
  g.lineTo(-40, baseY);
  let x = -40;
  while (x < WORLD.width + 40) {
    const step = 70 + rnd() * 130;
    const peak = baseY - height * (0.3 + rnd() * 0.7);
    g.lineTo(x + step * 0.45, peak);
    g.lineTo(x + step, baseY - rnd() * roughness);
    x += step;
  }
  g.lineTo(WORLD.width + 40, WORLD.height);
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

function drawTree(g, x, baseY, scale, rnd) {
  g.save();
  g.translate(x, baseY);
  g.scale(scale, scale);
  g.strokeStyle = 'rgba(126, 232, 210, 0.20)';
  g.lineCap = 'round';
  g.shadowColor = 'rgba(126, 232, 210, 0.45)';
  g.shadowBlur = 18;

  const tips = [];
  function branch(len, angle, depth, width) {
    if (depth <= 0 || len < 3) return;
    const ex = Math.cos(angle) * len;
    const ey = Math.sin(angle) * len;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(Math.cos(angle + 0.25) * len * 0.5, Math.sin(angle + 0.25) * len * 0.5, ex, ey);
    g.stroke();
    g.save();
    g.translate(ex, ey);
    const branches = depth > 4 ? 2 : 2 + (rnd() > 0.55 ? 1 : 0);
    for (let i = 0; i < branches; i++) {
      branch(len * (0.58 + rnd() * 0.16), angle + (i - (branches - 1) / 2) * (0.5 + rnd() * 0.35) + (rnd() - 0.5) * 0.25, depth - 1, width * 0.66);
    }
    if (depth <= 2) tips.push({ x: ex, y: ey });
    g.restore();
  }

  // roots
  g.strokeStyle = 'rgba(126, 232, 210, 0.10)';
  for (let i = -2; i <= 2; i++) {
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(i * 22, 16, i * 48, 30 + Math.abs(i) * 7);
    g.stroke();
  }

  g.strokeStyle = 'rgba(126, 232, 210, 0.19)';
  branch(120, -Math.PI / 2, 6, 7);

  for (const tip of tips) {
    g.fillStyle = `rgba(126, 232, 210, ${0.18 + rnd() * 0.4})`;
    g.beginPath();
    g.arc(tip.x, tip.y, 1.1 + rnd() * 2.1, 0, TAU);
    g.fill();
  }
  g.restore();
}

function buildStaticArt() {
  const g = bgLayer.getContext('2d');
  const rnd = mulberry32(90210);

  const sky = g.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, '#04050c');
  sky.addColorStop(0.34, '#080a17');
  sky.addColorStop(0.58, '#111127');
  sky.addColorStop(0.78, '#1b1327');
  sky.addColorStop(1, '#241723');
  g.fillStyle = sky;
  g.fillRect(0, 0, WORLD.width, WORLD.height);

  // nebulae
  const neb = (x, y, r, color) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  neb(310, 210, 420, 'rgba(58, 100, 112, 0.08)');
  neb(1080, 140, 520, 'rgba(92, 64, 128, 0.10)');
  neb(1450, 470, 430, 'rgba(120, 66, 68, 0.07)');

  // stars
  for (let i = 0; i < 320; i++) {
    const x = rnd() * WORLD.width;
    const y = rnd() * 610;
    const r = rnd() < 0.92 ? 0.35 + rnd() * 0.8 : 1.1 + rnd() * 1.1;
    g.fillStyle = `rgba(${210 + rnd() * 45}, ${218 + rnd() * 37}, 255, ${0.12 + rnd() * 0.6})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }

  // moon
  const mx = 1348;
  const my = 158;
  const halo = g.createRadialGradient(mx, my, 24, mx, my, 240);
  halo.addColorStop(0, 'rgba(226, 224, 205, 0.20)');
  halo.addColorStop(0.25, 'rgba(206, 206, 200, 0.08)');
  halo.addColorStop(0.6, 'rgba(180, 180, 220, 0.025)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo;
  g.fillRect(mx - 240, my - 240, 480, 480);

  const moonBody = g.createRadialGradient(mx - 18, my - 20, 6, mx, my, 62);
  moonBody.addColorStop(0, '#f2ecd7');
  moonBody.addColorStop(0.55, '#d8d2bc');
  moonBody.addColorStop(1, '#9c998c');
  g.fillStyle = moonBody;
  g.beginPath();
  g.arc(mx, my, 58, 0, TAU);
  g.fill();

  g.fillStyle = 'rgba(100, 102, 100, 0.18)';
  const craters = [
    [-16, -12, 11], [18, 8, 7], [-4, 24, 5], [26, -20, 4], [-28, 18, 6], [4, -30, 4]
  ];
  for (const [cx, cy, r] of craters) {
    g.beginPath();
    g.arc(mx + cx, my + cy, r, 0, TAU);
    g.fill();
  }
  g.strokeStyle = 'rgba(245, 240, 218, 0.13)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(mx, my, 60, 0, TAU);
  g.stroke();

  // mountains
  drawMountain(g, rnd, 610, 250, '#0b0d19', 30);
  drawMountain(g, rnd, 668, 180, '#0a0b15', 24);
  drawMountain(g, rnd, 726, 120, '#080910', 18);

  // horizon fog
  const fog = g.createLinearGradient(0, 570, 0, 800);
  fog.addColorStop(0, 'rgba(26, 28, 48, 0)');
  fog.addColorStop(0.5, 'rgba(31, 32, 52, 0.55)');
  fog.addColorStop(1, 'rgba(10, 11, 18, 0.9)');
  g.fillStyle = fog;
  g.fillRect(0, 560, WORLD.width, 260);

  // distant ruin silhouettes on the horizon
  g.fillStyle = 'rgba(7, 8, 14, 0.88)';
  for (const x of [120, 165, 210, 1035, 1090, 1430]) {
    const h = 24 + rnd() * 44;
    g.fillRect(x, 590 - h, 15 + rnd() * 18, h);
    g.fillRect(x - 4, 586 - h, 26 + rnd() * 18, 6);
  }
  g.fillStyle = 'rgba(232, 201, 122, 0.16)';
  g.fillRect(1094, 560, 3, 6);
  g.fillRect(1027, 572, 2, 4);

  // the plateau
  const px = 24, py = 24, pw = 1252, ph = 852;
  roundRect(g, px, py, pw, ph, 30);
  const ground = g.createRadialGradient(640, 430, 120, 640, 430, 760);
  ground.addColorStop(0, '#171827');
  ground.addColorStop(0.55, '#10111d');
  ground.addColorStop(1, '#0a0b13');
  g.fillStyle = ground;
  g.fill();
  g.strokeStyle = 'rgba(232, 201, 122, 0.11)';
  g.lineWidth = 1.5;
  g.stroke();
  roundRect(g, px + 9, py + 9, pw - 18, ph - 18, 24);
  g.strokeStyle = 'rgba(232, 201, 122, 0.045)';
  g.lineWidth = 1;
  g.stroke();

  // faint stone tiles and cracks
  g.save();
  roundRect(g, px, py, pw, ph, 30);
  g.clip();
  for (let i = 0; i < 70; i++) {
    const x = px + rnd() * pw;
    const y = py + rnd() * ph;
    const len = 10 + rnd() * 34;
    const a = rnd() * TAU;
    g.strokeStyle = `rgba(180, 178, 190, ${0.018 + rnd() * 0.03})`;
    g.lineWidth = 0.7 + rnd() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const x = px + 60 + rnd() * (pw - 120);
    const y = py + 60 + rnd() * (ph - 120);
    const rx = 20 + rnd() * 50;
    g.strokeStyle = 'rgba(232, 201, 122, 0.028)';
    g.lineWidth = 1;
    ellipse(g, x, y, rx, rx * 0.45);
    g.stroke();
  }
  g.restore();

  // gate sigil etched into the ground
  g.save();
  g.translate(SANCTUARY.x, SANCTUARY.y + 10);
  for (let ring = 0; ring < 3; ring++) {
    g.strokeStyle = `rgba(232, 201, 122, ${0.14 - ring * 0.035})`;
    g.lineWidth = ring === 0 ? 1.6 : 1;
    g.setLineDash(ring === 1 ? [3, 12] : []);
    g.beginPath();
    g.arc(0, 0, 178 + ring * 30, 0, TAU);
    g.stroke();
  }
  g.setLineDash([]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    g.save();
    g.rotate(a);
    g.translate(0, -207);
    g.fillStyle = 'rgba(232, 201, 122, 0.18)';
    g.beginPath();
    g.moveTo(0, -4);
    g.lineTo(3.5, 3);
    g.lineTo(-3.5, 3);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.restore();

  // tree of life on the eastern cliff
  drawTree(g, 1400, 772, 1.55, rnd);
  drawTree(g, 1316, 812, 0.74, rnd);

  // faint rune marks around the plateau edge
  for (let i = 0; i < 30; i++) {
    const x = px + 30 + (i / 30) * (pw - 60);
    g.fillStyle = 'rgba(232, 201, 122, 0.07)';
    g.fillRect(x, py + 12, 2, 6);
    g.fillRect(x, py + ph - 18, 2, 6);
  }

  buildPathLayer();
}

function buildPathLayer() {
  const g = pathLayer.getContext('2d');
  const rnd = mulberry32(4711);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  const tracePath = () => {
    g.beginPath();
    g.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
  };
  const stroke = (width, color) => {
    tracePath();
    g.lineWidth = width;
    g.strokeStyle = color;
    g.stroke();
  };

  // A deep shadow, a faint gold halo, then layered worn stone.
  stroke(112, 'rgba(0, 0, 0, 0.46)');
  stroke(98, 'rgba(232, 201, 122, 0.045)');
  stroke(88, '#1b1722');
  stroke(80, '#292331');
  stroke(66, '#332b3d');
  stroke(52, 'rgba(62, 52, 71, 0.62)');
  stroke(24, 'rgba(15, 13, 21, 0.28)');

  // Pale gold shoulders. Vertices use averaged normals so the offset line
  // turns cleanly at every corner instead of cutting across it.
  const normals = PATH.map((p, i) => {
    const prev = PATH[Math.max(0, i - 1)];
    const next = PATH[Math.min(PATH.length - 1, i + 1)];
    let nx = 0, ny = 0;
    if (i > 0) {
      const dx = p.x - prev.x, dy = p.y - prev.y, l = Math.hypot(dx, dy) || 1;
      nx += -dy / l; ny += dx / l;
    }
    if (i < PATH.length - 1) {
      const dx = next.x - p.x, dy = next.y - p.y, l = Math.hypot(dx, dy) || 1;
      nx += -dy / l; ny += dx / l;
    }
    const l = Math.hypot(nx, ny) || 1;
    return { x: nx / l, y: ny / l };
  });
  const edge = (offset, color, width) => {
    g.beginPath();
    PATH.forEach((p, i) => {
      const x = p.x + normals[i].x * offset;
      const y = p.y + normals[i].y * offset;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.lineJoin = 'round';
    g.lineWidth = width;
    g.strokeStyle = color;
    g.stroke();
  };
  edge(43, 'rgba(0, 0, 0, 0.26)', 3);
  edge(39, 'rgba(232, 201, 122, 0.14)', 1.2);
  edge(-39, 'rgba(232, 201, 122, 0.14)', 1.2);

  // Flagstone joints, slightly irregular so the road reads as masonry.
  for (let d = 28, row = 0; d < PATH_LENGTH; d += 38, row++) {
    const p = pointAtDistance(d);
    const half = 30 + (row % 3) * 2;
    g.strokeStyle = row % 2 ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.022)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(p.x - p.dy * half, p.y + p.dx * half);
    g.lineTo(p.x + p.dy * half, p.y - p.dx * half);
    g.stroke();
  }

  // Chips, pale wear and moss gathering along the shoulders.
  for (let i = 0; i < 150; i++) {
    const d = rnd() * PATH_LENGTH;
    const p = pointAtDistance(d);
    const off = (rnd() - 0.5) * 62;
    const x = p.x - p.dy * off;
    const y = p.y + p.dx * off;
    const w = 1.4 + rnd() * 6;
    g.fillStyle = rnd() < 0.22
      ? `rgba(126, 232, 210, ${0.025 + rnd() * 0.03})`
      : `rgba(236, 221, 190, ${0.018 + rnd() * 0.028})`;
    g.save();
    g.translate(x, y);
    g.rotate(p.angle + rnd() * 1.2);
    g.fillRect(-w / 2, -1, w, 1.3 + rnd() * 1.6);
    g.restore();
  }

  // Small rune markers and votive lights along the pilgrim road.
  for (let d = 44; d < PATH_LENGTH; d += 92) {
    const p = pointAtDistance(d);
    const ox = -p.dy * 45;
    const oy = p.dx * 45;
    for (const side of [1, -1]) {
      const x = p.x + ox * side;
      const y = p.y + oy * side;
      g.fillStyle = 'rgba(232, 201, 122, 0.2)';
      g.beginPath();
      g.arc(x, y, 1.7, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(232, 201, 122, 0.1)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, y, 5.5, 0, TAU);
      g.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Resize

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  view.w = w;
  view.h = h;
  view.dpr = dpr;
  view.scale = Math.min(w / WORLD.width, h / WORLD.height);
  view.ox = (w - WORLD.width * view.scale) / 2;
  view.oy = (h - WORLD.height * view.scale) / 2;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}

function screenToWorld(clientX, clientY) {
  return {
    x: (clientX - view.ox) / view.scale,
    y: (clientY - view.oy) / view.scale
  };
}
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
