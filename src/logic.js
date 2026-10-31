// Covenant — pure game data and rules (no DOM dependencies).

export const WORLD = { width: 1600, height: 900 };
export const TOTAL_WAVES = 20;

// The pilgrim road: the horde enters at the top-left and marches on the Gate.
export const PATH = [
  { x: -70, y: 130 },
  { x: 220, y: 130 },
  { x: 220, y: 330 },
  { x: 490, y: 330 },
  { x: 490, y: 610 },
  { x: 790, y: 610 },
  { x: 790, y: 250 },
  { x: 950, y: 250 },
  { x: 950, y: 470 },
  { x: 1040, y: 470 }
];

export const SANCTUARY = { x: 1108, y: 470 };
export const HERO_START = { x: 946, y: 470 };

// Rune pads for guardians (beside the road, never on it).
export const PADS = [
  { x: 132, y: 58 },
  { x: 330, y: 232 },
  { x: 322, y: 414 },
  { x: 398, y: 505 },
  { x: 636, y: 708 },
  { x: 704, y: 506 },
  { x: 620, y: 410 },
  { x: 884, y: 392 },
  { x: 882, y: 140 },
  { x: 962, y: 118 },
  { x: 1042, y: 332 },
  { x: 1004, y: 604 }
];

// Sanctum courts for the tycoon economy.
export const SANCTUM_PADS = [
  { x: 1082, y: 646 },
  { x: 1176, y: 602 },
  { x: 1156, y: 756 },
  { x: 1240, y: 696 }
];

export const ENEMY_TYPES = {
  locust: {
    name: 'Locust', plural: 'Locusts', hp: 34, speed: 96, armor: 0,
    bounty: 4, xp: 5, gateDamage: 1, radius: 11, color: '#9dba5a',
    lore: 'The first plague, grown hungry.'
  },
  scarab: {
    name: 'Scarab', plural: 'Scarabs', hp: 96, speed: 62, armor: 5,
    bounty: 8, xp: 9, gateDamage: 1, radius: 15, color: '#c99a4f',
    lore: 'Tomb-shelled and stubborn.'
  },
  watcher: {
    name: 'Watcher', plural: 'Watchers', hp: 78, speed: 108, armor: 1,
    bounty: 9, xp: 10, gateDamage: 1, radius: 12, color: '#8e8fe8', flying: true,
    lore: 'A disobedient eye on stolen wings.'
  },
  nephilim: {
    name: 'Nephilim', plural: 'Nephilim', hp: 300, speed: 38, armor: 10,
    bounty: 20, xp: 22, gateDamage: 2, radius: 22, color: '#9a8f86',
    lore: 'The old giants, half angel and all ruin.'
  },
  plaguebearer: {
    name: 'Plaguebearer', plural: 'Plaguebearers', hp: 172, speed: 54, armor: 3,
    bounty: 15, xp: 18, gateDamage: 2, radius: 16, color: '#76b072',
    heal: 9,
    lore: 'It carries a censer of the sixth plague.'
  },
  goliath: {
    name: 'Goliath', plural: 'Goliaths', hp: 2300, speed: 31, armor: 13,
    bounty: 160, xp: 90, gateDamage: 4, radius: 30, color: '#b0784c',
    boss: true, special: 'slam',
    lore: 'Champion of Gath. He has not learned fear.'
  },
  leviathan: {
    name: 'Leviathan', plural: 'Leviathans', hp: 4600, speed: 39, armor: 8,
    bounty: 280, xp: 140, gateDamage: 5, radius: 32, color: '#4f9bb8',
    boss: true, flying: true, special: 'brood',
    lore: 'The sea-serpent of the deep, swimming through air.'
  },
  behemoth: {
    name: 'Behemoth', plural: 'Behemoths', hp: 10500, speed: 25, armor: 24,
    bounty: 420, xp: 230, gateDamage: 7, radius: 36, color: '#8b6a52',
    boss: true, special: 'quake',
    lore: 'The land itself walks, and it is angry.'
  },
  abaddon: {
    name: 'Abaddon', plural: 'Abaddon', hp: 26000, speed: 29, armor: 18,
    bounty: 950, xp: 420, gateDamage: 12, radius: 42, color: '#b34e54',
    boss: true, flying: true, special: 'abyss',
    lore: 'The Destroyer, king of the bottomless pit.'
  }
};

export const TOWERS = {
  ember: {
    id: 'ember', name: 'Cherubim Ember', cost: 70, pad: 'guardian',
    icon: 'flame', color: '#ffb469', accent: '#ff7a3d',
    blurb: 'Swift fire from a winged sentinel. Balanced single-target damage.',
    levels: [
      { damage: 16, range: 190, rate: 1.65, speed: 620, pierce: 2 },
      { damage: 27, range: 202, rate: 1.82, speed: 660, pierce: 3 },
      { damage: 44, range: 216, rate: 2.02, speed: 710, pierce: 5 },
      { damage: 70, range: 236, rate: 2.28, speed: 780, pierce: 7 }
    ],
    upgrades: [55, 120, 245]
  },
  serpent: {
    id: 'serpent', name: 'Brazen Serpent', cost: 100, pad: 'guardian',
    icon: 'serpent', color: '#8edf8a', accent: '#3f9d63',
    blurb: 'Lobs venom that pools on the road and poisons the horde.',
    levels: [
      { damage: 12, range: 178, rate: 0.82, speed: 430, aoe: 74, dot: 11, dotTime: 3.4, pierce: 3 },
      { damage: 19, range: 190, rate: 0.9, speed: 450, aoe: 84, dot: 18, dotTime: 3.6, pierce: 4 },
      { damage: 30, range: 204, rate: 1.0, speed: 480, aoe: 96, dot: 28, dotTime: 3.8, pierce: 6 },
      { damage: 46, range: 222, rate: 1.1, speed: 520, aoe: 112, dot: 44, dotTime: 4.0, pierce: 9 }
    ],
    upgrades: [90, 185, 360]
  },
  ballista: {
    id: 'ballista', name: 'Covenant Ballista', cost: 140, pad: 'guardian',
    icon: 'bow', color: '#e7c67d', accent: '#a9743c',
    blurb: 'Long range, armour-piercing bolts that skewer a line of foes.',
    levels: [
      { damage: 72, range: 332, rate: 0.5, speed: 1150, hits: 2, pierce: 13 },
      { damage: 118, range: 352, rate: 0.55, speed: 1280, hits: 3, pierce: 18 },
      { damage: 190, range: 378, rate: 0.6, speed: 1420, hits: 4, pierce: 24 },
      { damage: 305, range: 412, rate: 0.68, speed: 1580, hits: 5, pierce: 32 }
    ],
    upgrades: [125, 265, 500]
  },
  seal: {
    id: 'seal', name: "Solomon's Seal", cost: 115, pad: 'guardian',
    icon: 'seal', color: '#7ee8d2', accent: '#3b9b93',
    blurb: 'Binds the road in a slow-aura and empowers nearby guardians.',
    levels: [
      { damage: 7, range: 178, rate: 0.7, slow: 0.26, dot: 9, buff: 0.12, pierce: 8 },
      { damage: 12, range: 192, rate: 0.8, slow: 0.33, dot: 15, buff: 0.16, pierce: 12 },
      { damage: 19, range: 208, rate: 0.9, slow: 0.41, dot: 24, buff: 0.2, pierce: 18 },
      { damage: 29, range: 228, rate: 1.0, slow: 0.5, dot: 36, buff: 0.25, pierce: 26 }
    ],
    upgrades: [95, 205, 390]
  }
};

export const ECONOMY = {
  well: {
    id: 'well', name: 'Manna Well', cost: 60, pad: 'sanctum',
    icon: 'well', color: '#77d7e9', accent: '#2e7f9a',
    blurb: 'A spring of manna. Tribute at the end of every wave.',
    levels: [12, 19, 29, 44],
    upgrades: [50, 115, 235]
  },
  reliquary: {
    id: 'reliquary', name: 'Reliquary', cost: 125, pad: 'sanctum',
    icon: 'reliquary', color: '#e8c978', accent: '#a47432',
    blurb: 'Pilgrims leave gold at the shrine. Stronger wave tribute.',
    levels: [24, 38, 58, 88],
    upgrades: [110, 245, 480]
  },
  oracle: {
    id: 'oracle', name: 'Oracle Tent', cost: 220, pad: 'sanctum',
    icon: 'oracle', color: '#b79bf0', accent: '#6d4db1',
    blurb: 'Prophecy draws wealthy kings. The finest tribute in the sanctum.',
    levels: [44, 68, 102, 150],
    upgrades: [190, 405, 780]
  }
};

export const BUILD_TYPES = { ...TOWERS, ...ECONOMY };

const g = (type, count, gap, delay = 1.4) => ({ type, count, gap, delay });

export const WAVES = [
  {
    name: 'The First Flight',
    lore: 'A whisper of wings from the eastern dust.',
    groups: [g('locust', 8, 0.85, 0.8)]
  },
  {
    name: 'Crawling Dark',
    lore: 'The tomb doors open. The scarabs remember the way.',
    groups: [g('locust', 6, 0.6, 0.6), g('scarab', 3, 1.5, 4)]
  },
  {
    name: 'Swarms of the Dust',
    lore: 'What the locust leaves, the scarab devours.',
    groups: [g('scarab', 7, 1.1, 0.8), g('locust', 12, 0.5, 3)]
  },
  {
    name: 'Watchers in the Wind',
    lore: 'They fell for loving the world. They still watch it burn.',
    groups: [g('watcher', 6, 1.0, 0.8), g('locust', 10, 0.5, 4)]
  },
  {
    name: 'Goliath of Gath',
    lore: 'The ground learns the weight of an old champion.',
    boss: 'goliath',
    groups: [g('goliath', 1, 1, 1), g('locust', 12, 0.65, 3)]
  },
  {
    name: 'The Plague-Bearers',
    lore: 'They bring a cure for hope. Do not breathe it in.',
    groups: [g('scarab', 10, 0.8, 0.8), g('plaguebearer', 1, 1, 5)]
  },
  {
    name: 'Wings over Ash',
    lore: 'The sky is full of eyes tonight.',
    groups: [g('watcher', 10, 0.7, 0.8), g('scarab', 8, 1.0, 4)]
  },
  {
    name: 'Sons of Anak',
    lore: 'The giants are not myths. They are patient.',
    groups: [g('nephilim', 2, 5, 0.8), g('locust', 16, 0.45, 2.5)]
  },
  {
    name: 'Pestilence Unbound',
    lore: 'Three censers swing. The air turns to a grave.',
    groups: [g('plaguebearer', 3, 4, 0.8), g('scarab', 12, 0.8, 2.5)]
  },
  {
    name: 'Leviathan Rises',
    lore: 'The deep has a king, and he has learned to fly.',
    boss: 'leviathan',
    groups: [g('leviathan', 1, 1, 1), g('watcher', 10, 0.8, 4)]
  },
  {
    name: 'The Nephilim Host',
    lore: 'They come in ranks, as they did before the Flood.',
    groups: [g('nephilim', 4, 3, 0.8), g('watcher', 10, 0.7, 5)]
  },
  {
    name: 'The Endless Swarm',
    lore: 'Count them if you like. They will not wait.',
    groups: [g('locust', 30, 0.3, 0.6), g('scarab', 14, 0.7, 4)]
  },
  {
    name: 'Two Giants',
    lore: 'Gath sent its champion. Gath sent his brother.',
    boss: 'goliath',
    groups: [g('goliath', 2, 8, 1), g('plaguebearer', 2, 3, 4)]
  },
  {
    name: "Watchers' Choir",
    lore: 'A hymn of broken wings, sung in a dead language.',
    groups: [g('nephilim', 5, 2.5, 0.8), g('watcher', 14, 0.6, 5)]
  },
  {
    name: 'Behemoth Stirs',
    lore: 'The hillside stands up. It has been waiting.',
    boss: 'behemoth',
    groups: [g('behemoth', 1, 1, 1), g('scarab', 16, 0.7, 4)]
  },
  {
    name: 'The Titan War',
    lore: 'Heaven and earth are only weather to them.',
    groups: [g('nephilim', 6, 2.2, 0.8), g('locust', 20, 0.35, 5)]
  },
  {
    name: 'Deluge of Locusts',
    lore: 'The horizon is not horizon. It is them.',
    groups: [g('locust', 48, 0.22, 0.6), g('watcher', 16, 0.7, 6)]
  },
  {
    name: 'Plagues of Egypt',
    lore: 'Every plague at once. The old kingdom is jealous.',
    groups: [
      g('nephilim', 6, 2.5, 0.8),
      g('plaguebearer', 4, 3, 5),
      g('scarab', 12, 0.8, 18)
    ]
  },
  {
    name: 'The Fallen Kings',
    lore: 'The kings of the earth bring their crowns to the gate.',
    groups: [g('goliath', 2, 6, 1), g('watcher', 20, 0.55, 4), g('scarab', 18, 0.6, 7)]
  },
  {
    name: 'Abaddon, the Destroyer',
    lore: 'The bottomless pit gives up its king. Hold the Gate.',
    boss: 'abaddon',
    groups: [
      g('abaddon', 1, 1, 1),
      g('nephilim', 4, 4, 12),
      g('locust', 30, 0.3, 8)
    ]
  }
];

export const BOONS = [
  {
    id: 'samson', name: 'Strength of Samson', icon: 'fist',
    desc: 'The Bearer\u2019s attacks deal 30% more damage.',
    mods: { heroDamage: 0.3 }
  },
  {
    id: 'seraph', name: 'Wings of the Seraph', icon: 'wing',
    desc: 'Move 22% faster. Outrun the horde.',
    mods: { heroSpeed: 0.22 }
  },
  {
    id: 'manna', name: 'Manna from Heaven', icon: 'well',
    desc: 'Sanctum tribute is increased by 30%.',
    mods: { income: 0.3 }
  },
  {
    id: 'vessel', name: 'Chosen Vessel', icon: 'heart',
    desc: '+55 max health. Heal for the same amount.',
    mods: { maxHp: 55 }
  },
  {
    id: 'prophet', name: 'Fury of the Prophet', icon: 'storm',
    desc: 'All ability cooldowns are reduced by 18%.',
    mods: { cooldown: -0.18 }
  },
  {
    id: 'watcherbane', name: 'Eye of the Watcher', icon: 'eye',
    desc: 'Guardian range is increased by 15%.',
    mods: { towerRange: 0.15 }
  },
  {
    id: 'aaron', name: 'Blessing of Aaron', icon: 'seal',
    desc: 'All guardian damage is increased by 18%.',
    mods: { towerDamage: 0.18 }
  },
  {
    id: 'covenant', name: 'Covenant Renewed', icon: 'shield',
    desc: 'Mend 5 sanctuary seals immediately.',
    mods: { sealHeal: 5 }
  },
  {
    id: 'magi', name: 'Gifts of the Magi', icon: 'coin',
    desc: 'Gain 220 gold at once.',
    mods: { gold: 220 }
  },
  {
    id: 'eden', name: 'Fruit of Eden', icon: 'leaf',
    desc: 'Mana regeneration is increased by 60%.',
    mods: { manaRegen: 0.6 }
  },
  {
    id: 'david', name: 'Stone of David', icon: 'stone',
    desc: '+12% critical strike chance for the Bearer.',
    mods: { crit: 0.12 }
  },
  {
    id: 'jubilee', name: 'Year of Jubilee', icon: 'hourglass',
    desc: 'Guardians attack 20% faster.',
    mods: { towerRate: 0.2 }
  },
  {
    id: 'firstborn', name: 'Birthright', icon: 'spark',
    desc: 'Gain 20% more experience from every kill.',
    mods: { xpGain: 0.2 }
  },
  {
    id: 'judgement', name: 'Trumpet of Judgement', icon: 'trumpet',
    desc: 'Ability power is increased by 25%.',
    mods: { abilityPower: 0.25 }
  }
];

export const ABILITIES = {
  q: {
    id: 'q', key: 'Q', name: 'Smite', icon: 'smite',
    mana: 25, cooldown: 6, unlock: 1,
    desc: 'Call down a pillar of fire on the thickest press of enemies.'
  },
  w: {
    id: 'w', key: 'C', name: 'Aegis', icon: 'shield',
    mana: 30, cooldown: 14, unlock: 1,
    desc: 'A shield of covenant light absorbs damage and mends the Bearer.'
  },
  e: {
    id: 'e', key: 'E', name: 'Judgement', icon: 'beam',
    mana: 45, cooldown: 16, unlock: 2,
    desc: 'A lance of holy light burns everything in a line.'
  },
  r: {
    id: 'r', key: 'R', name: 'Wrath of Heaven', icon: 'wrath',
    mana: 80, cooldown: 55, unlock: 4,
    desc: 'Every enemy on the field is scorched by the wrath of the covenant.'
  }
};

// ---------------------------------------------------------------------------
// Helpers

const segmentLengths = PATH.slice(1).map((p, i) => {
  const a = PATH[i];
  return Math.hypot(p.x - a.x, p.y - a.y);
});
export const PATH_LENGTH = segmentLengths.reduce((sum, n) => sum + n, 0);

export function pointAtDistance(distance, path = PATH) {
  let d = Math.max(0, Math.min(distance, PATH_LENGTH));
  for (let i = 0; i < path.length - 1; i++) {
    const len = segmentLengths[i];
    if (d <= len) {
      const a = path[i];
      const b = path[i + 1];
      const t = len === 0 ? 0 : d / len;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        dx: (b.x - a.x) / (len || 1),
        dy: (b.y - a.y) / (len || 1),
        angle: Math.atan2(b.y - a.y, b.x - a.x)
      };
    }
    d -= len;
  }
  const a = path[path.length - 2];
  const b = path[path.length - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return {
    x: b.x, y: b.y,
    dx: (b.x - a.x) / len, dy: (b.y - a.y) / len,
    angle: Math.atan2(b.y - a.y, b.x - a.x)
  };
}

export function hpScale(wave) {
  return 1 + 0.16 * Math.max(0, wave - 1);
}

export function waveReward(wave) {
  return 40 + wave * 10;
}

export function xpForLevel(level) {
  return Math.round(55 * Math.pow(level, 1.5));
}

export function damageAfterArmor(raw, armor = 0, pierce = 0) {
  const effectiveArmor = Math.max(0, armor - pierce);
  return Math.max(raw * 0.15, raw - effectiveArmor);
}

export function towerStats(typeId, level = 1) {
  const def = TOWERS[typeId];
  if (!def) return null;
  return def.levels[Math.max(0, Math.min(level - 1, def.levels.length - 1))];
}

export function towerUpgradeCost(typeId, level = 1) {
  const def = TOWERS[typeId];
  if (!def || level >= def.levels.length) return null;
  return def.upgrades[level - 1];
}

export function towerInvested(typeId, level = 1) {
  const def = TOWERS[typeId];
  if (!def) return 0;
  let total = def.cost;
  for (let i = 0; i < level - 1; i++) total += def.upgrades[i] || 0;
  return total;
}

export function economyIncome(typeId, level = 1) {
  const def = ECONOMY[typeId];
  if (!def) return 0;
  return def.levels[Math.max(0, Math.min(level - 1, def.levels.length - 1))];
}

export function economyUpgradeCost(typeId, level = 1) {
  const def = ECONOMY[typeId];
  if (!def || level >= def.levels.length) return null;
  return def.upgrades[level - 1];
}

export function economyInvested(typeId, level = 1) {
  const def = ECONOMY[typeId];
  if (!def) return 0;
  let total = def.cost;
  for (let i = 0; i < level - 1; i++) total += def.upgrades[i] || 0;
  return total;
}

export function buildSpawnQueue(waveNumber) {
  const wave = WAVES[Math.max(0, Math.min(waveNumber - 1, WAVES.length - 1))];
  const queue = [];
  let cursor = 0;
  for (const group of wave.groups) {
    cursor += group.delay ?? 1.4;
    for (let i = 0; i < group.count; i++) {
      queue.push({ type: group.type, at: cursor + i * group.gap });
    }
    cursor += Math.max(0, group.count - 1) * group.gap;
  }
  return queue.sort((a, b) => a.at - b.at);
}

export function waveEnemySummary(waveNumber) {
  const wave = WAVES[waveNumber - 1];
  if (!wave) return [];
  const counts = new Map();
  for (const group of wave.groups) {
    counts.set(group.type, (counts.get(group.type) || 0) + group.count);
  }
  return [...counts.entries()].map(([type, count]) => ({ type, count }));
}

export function roman(n) {
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
    [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let out = '';
  let v = Math.max(0, Math.floor(n));
  for (const [value, glyph] of map) {
    while (v >= value) { out += glyph; v -= value; }
  }
  return out;
}

export function defaultStats() {
  return {
    towerDamage: 1,
    towerRange: 1,
    towerRate: 1,
    heroDamage: 1,
    heroSpeed: 1,
    abilityPower: 1,
    cooldown: 1,
    income: 1,
    crit: 0.05,
    critMult: 1.9,
    manaRegen: 1,
    xpGain: 1
  };
}

export function randomBoonChoices(count = 3, random = Math.random) {
  const pool = BOONS.slice();
  const choices = [];
  const target = Math.min(count, pool.length);
  while (choices.length < target) {
    const index = Math.floor(random() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}
