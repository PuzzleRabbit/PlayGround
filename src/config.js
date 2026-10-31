export const VIEW_W = 960
export const VIEW_H = 540
export const GROUND_TOP = 352
export const DEPTH = 146
export const LEVEL_END = 7800

export const PLAYER_SPEED = 252
export const PLAYER_Z_SPEED = 0.66
export const GRAVITY = 1520
export const JUMP_SPEED = 470

export const WAVE_COUNT = 7

export const WAVES = [
  { trigger: 600, lock: 480, name: 'SCOUTS!', enemies: ['grunt', 'grunt'] },
  { trigger: 1600, lock: 1500, name: 'CLUB LAW', enemies: ['grunt', 'grunt', 'clubber'], flank: true },
  { trigger: 2600, lock: 2500, name: 'LEAPERS!', enemies: ['leaper', 'grunt', 'leaper'] },
  { trigger: 3620, lock: 3540, name: 'BONEFANG RAID', enemies: ['clubber', 'grunt', 'grunt', 'clubber'] },
  { trigger: 4660, lock: 4580, name: 'THE GAUNTLET', enemies: ['leaper', 'leaper', 'clubber', 'grunt'], flank: true },
  { trigger: 5700, lock: 5620, name: 'WAR PARTY', enemies: ['clubber', 'grunt', 'clubber', 'leaper', 'grunt'], flank: true },
  { trigger: 6740, lock: 6620, name: 'MAMMOTH MOG', boss: true, enemies: [] },
]

export const ATTACKS = [
  { duration: 0.3, hitAt: 0.43, damage: 10, range: 88, depth: 0.21, knock: 155, shake: 3.5, word: 'BONK!' },
  { duration: 0.32, hitAt: 0.43, damage: 12, range: 94, depth: 0.22, knock: 175, shake: 4.5, word: 'WHACK!' },
  { duration: 0.46, hitAt: 0.5, damage: 20, range: 108, depth: 0.27, knock: 300, shake: 8.5, word: 'CRUNCH!' },
]

export const ENEMY_STATS = {
  grunt: {
    hp: 40,
    speed: 108,
    damage: 8,
    range: 68,
    attackDuration: 0.92,
    hitAt: 0.54,
    cooldown: [0.7, 1.25],
    score: 120,
    scale: 0.97,
  },
  clubber: {
    hp: 88,
    speed: 82,
    damage: 15,
    range: 80,
    attackDuration: 1.16,
    hitAt: 0.56,
    cooldown: [1.15, 1.7],
    score: 280,
    scale: 1.06,
  },
  leaper: {
    hp: 34,
    speed: 138,
    damage: 11,
    range: 74,
    attackDuration: 0.8,
    hitAt: 0.5,
    cooldown: [0.95, 1.5],
    score: 190,
    scale: 0.93,
  },
  boss: {
    hp: 500,
    speed: 96,
    damage: 18,
    range: 132,
    cooldown: [0.7, 1.1],
    score: 5000,
    scale: 1,
  },
}

export const FIXED_PICKUPS = [
  { x: 2760, z: 0.7, seed: 1.7 },
  { x: 6350, z: 0.46, seed: 4.2 },
]
