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
