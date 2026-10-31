import {
  ATTACKS, ENEMY_STATS, GRAVITY, JUMP_SPEED, LEVEL_END,
  PLAYER_SPEED, PLAYER_Z_SPEED, VIEW_W,
} from './config.js'

const COMBO_WORDS = ['BONK!', 'WHACK!', 'THWUMP!', 'CRUNCH!', 'SMACK!', 'OOF!']

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function comboMultiplier(combo) {
  return 1 + Math.min(2, Math.floor(combo / 5) * 0.5)
}

function pickWord() {
  return COMBO_WORDS[Math.floor(Math.random() * COMBO_WORDS.length)]
}

export function createPlayer() {
  return {
    kind: 'player',
    x: 190,
    z: 0.62,
    jumpY: 0,
    vy: 0,
    vx: 0,
    vz: 0,
    facing: 1,
    hp: 100,
    maxHp: 100,
    hpGhost: 100,
    lives: 3,
    special: 0,
    state: 'idle',
    stateT: 0,
    animT: 0,
    attackT: 0,
    attackP: 0,
    attackDur: 0,
    comboStep: 0,
    didHit: false,
    attackBuffer: 0,
    iframes: 0,
    hitFlash: 0,
    downP: 0,
    downTimer: 0,
    stepTimer: 0,
    scale: 1,
    seed: 3.7,
    alpha: 1,
  }
}

export function createEnemy(type, x, z, slot = 0) {
  const stats = ENEMY_STATS[type]
  return {
    kind: type,
    x,
    z,
    jumpY: 0,
    vy: 0,
    vx: 0,
    vz: 0,
    facing: -1,
    hp: stats.hp,
    maxHp: stats.hp,
    hpGhost: stats.hp,
    speed: stats.speed,
    damage: stats.damage,
    range: stats.range,
    attackDuration: stats.attackDuration || 1,
    hitAt: stats.hitAt || 0.54,
    attackCooldown: rand(0.45, 1.1),
    state: 'spawn',
    stateT: 0,
    animT: rand(0, 3),
    attackT: 0,
    attackP: 0,
    didHit: false,
    slotOffset: type === 'boss' ? 0 : ((slot % 3) - 1) * 0.11,
    scoreValue: stats.score,
    scale: stats.scale,
    seed: rand(0, 10),
    hitFlash: 0,
    dead: false,
    deadT: 0,
    downP: 0,
    alpha: 1,
    stepTimer: 0,
    enraged: false,
    pattern: 0,
    slamTarget: null,
    slamFrom: null,
    leapFrom: null,
    leapTo: null,
  }
}

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */

function playerBounds(game, player) {
  player.z = clamp(player.z, 0, 1)
  const minX = game.camera.x + 32
  const maxX = Math.min(game.camera.x + VIEW_W - 36, LEVEL_END - 36)
  player.x = clamp(player.x, minX, maxX)
}

function startAttack(game, step) {
  const player = game.player
  const attack = ATTACKS[step]
  player.state = 'attack'
  player.stateT = 0
  player.attackT = 0
  player.attackP = 0
  player.attackDur = attack.duration
  player.comboStep = step
  player.didHit = false
  player.attackBuffer = 0
  game.audio.sfx('swing')
}

function startSpecial(game) {
  const player = game.player
  player.state = 'special'
  player.stateT = 0
  player.attackP = 0
  player.didBlast = false
  player.iframes = Math.max(player.iframes, 1.15)
  player.special = 0
  game.shake = Math.max(game.shake, 5)
}

function playerHitCheck(game) {
  const player = game.player
  const attack = ATTACKS[player.comboStep] || ATTACKS[0]
  let hitAny = false
  for (const enemy of game.enemies) {
    if (enemy.dead) continue
    const dx = (enemy.x - player.x) * player.facing
    const depth = Math.abs(enemy.z - player.z)
    const bossBonus = enemy.kind === 'boss' ? 30 : 0
    if (dx > -20 && dx < attack.range + bossBonus && depth < attack.depth + (enemy.kind === 'boss' ? 0.12 : 0)) {
      damageEnemy(game, enemy, attack.damage, attack.knock, player.facing)
      hitAny = true
    }
  }
  if (hitAny) {
    game.fx.slash(player.x + player.facing * 30, player.z, player.facing, 54, player.comboStep === 2 ? 56 : 44)
    game.shake = Math.max(game.shake, attack.shake)
  }
}

function respawnPlayer(game, player) {
  player.hp = player.maxHp
  player.hpGhost = player.maxHp
  player.state = 'idle'
  player.stateT = 0
  player.attackP = 0
  player.comboStep = 0
  player.jumpY = 0
  player.vy = 0
  player.vx = 0
  player.vz = 0
  player.downP = 0
  player.iframes = 2.6
  player.special = 0
  player.z = 0.62
  player.x = clamp(game.camera.x + 190, game.camera.x + 60, game.camera.x + VIEW_W - 90)

  for (const enemy of game.enemies) {
    if (enemy.dead) continue
    enemy.state = 'idle'
    enemy.stateT = 0
    enemy.attackP = 0
    enemy.didHit = false
    enemy.attackCooldown = 1.3
    enemy.x += enemy.x > player.x ? 46 : -46
    if (enemy.kind === 'boss') enemy.x = clamp(enemy.x, game.camera.x + 80, game.camera.x + VIEW_W - 80)
  }

  game.fx.ring(player.x, player.z, 130, '255, 220, 140', 0.6, 0.24)
  game.fx.dust(player.x, player.z, 12)
  game.audio.sfx('clear')
  game.showBanner?.('GET UP!', `${player.lives} CLUBS LEFT`, {
    size: 52,
    color: '#ffe08a',
    duration: 1.8,
  })
}

export function updatePlayer(game, dt) {
  const player = game.player
  const input = game.input
  player.animT += dt

  if (player.hitFlash > 0) player.hitFlash -= dt
  if (player.iframes > 0) player.iframes -= dt
  player.attackBuffer = Math.max(0, player.attackBuffer - dt)

  if (player.hpGhost > player.hp) {
    player.hpGhost = Math.max(player.hp, player.hpGhost - 42 * dt)
  } else {
    player.hpGhost = player.hp
  }

  if (player.state === 'down') {
    player.stateT += dt
    player.downP = Math.min(1, player.stateT / 0.5)
    player.downTimer -= dt
    player.jumpY = 0
    player.vy = 0
    if (player.downTimer <= 0) {
      if (player.lives > 0) respawnPlayer(game, player)
      else game.onPlayerDefeat?.()
    }
    return
  }

  if (player.state === 'hurt') {
    player.stateT += dt
    player.x += player.vx * dt
    player.z = clamp(player.z + player.vz * dt, 0, 1)
    player.vx *= 0.86
    player.vz *= 0.9
    playerBounds(game, player)
    if (player.stateT > 0.34) {
      player.state = player.jumpY > 0 ? 'jump' : 'idle'
      player.stateT = 0
    }
    return
  }

  // jump physics
  if (player.jumpY > 0 || player.vy > 0) {
    player.jumpY += player.vy * dt
    player.vy -= GRAVITY * dt
    if (player.jumpY <= 0) {
      player.jumpY = 0
      player.vy = 0
      if (player.state === 'jump') {
        player.state = 'idle'
        game.audio.sfx('land')
        game.fx.dust(player.x, player.z, 6)
        game.shake = Math.max(game.shake, 1.8)
      }
    }
  }

  if (player.state === 'special') {
    player.stateT += dt
    player.attackP = clamp(player.stateT / 0.86, 0, 1)
    if (!player.didBlast && player.stateT > 0.27) {
      player.didBlast = true
      const blastRadius = 238
      for (const enemy of game.enemies) {
        if (enemy.dead) continue
        if (Math.abs(enemy.x - player.x) < blastRadius && Math.abs(enemy.z - player.z) < 0.58) {
          damageEnemy(game, enemy, 34, 340, Math.sign(enemy.x - player.x) || 1)
        }
      }
      game.fx.ring(player.x, player.z, blastRadius, '255, 205, 93', 0.55, 0.24)
      game.fx.ring(player.x, player.z, blastRadius * 0.65, '255, 120, 52', 0.42, 0.3)
      game.fx.impact(player.x, player.z, 58, 2.2, '255, 214, 110')
      game.fx.text('RAAAWR!', player.x, player.z, '#ffe08a', 36, { height: 105, life: 1 })
      game.shake = Math.max(game.shake, 18)
      game.hitstop = Math.max(game.hitstop, 0.1)
      game.audio.sfx('special')
    }
    if (player.stateT > 0.86) {
      player.state = player.jumpY > 0 ? 'jump' : 'idle'
      player.stateT = 0
      player.attackP = 0
    }
    playerBounds(game, player)
    return
  }

  if (player.state === 'attack') {
    const attack = ATTACKS[player.comboStep] || ATTACKS[0]
    player.attackT += dt
    player.attackP = clamp(player.attackT / player.attackDur, 0, 1)
    if (player.attackP < 0.55) player.x += player.facing * 56 * dt
    if (!player.didHit && player.attackP >= attack.hitAt) {
      player.didHit = true
      playerHitCheck(game)
    }
    if (input.consume('attack')) player.attackBuffer = 1
    if (player.attackP >= 1) {
      if (player.attackBuffer && player.comboStep < ATTACKS.length - 1) {
        startAttack(game, player.comboStep + 1)
      } else {
        player.state = player.jumpY > 0 ? 'jump' : 'idle'
        player.stateT = 0
        player.attackP = 0
        player.comboStep = 0
        player.attackBuffer = 0
      }
    }
    playerBounds(game, player)
    return
  }

  const jumpPressed = input.consume('jump')
  const attackPressed = input.consume('attack')
  const specialPressed = input.consume('special')
  const grounded = player.jumpY <= 0 && player.vy <= 0

  if (grounded && jumpPressed) {
    player.vy = JUMP_SPEED
    player.jumpY = 0.01
    player.state = 'jump'
    game.audio.sfx('jump')
    game.fx.dust(player.x, player.z, 5)
  }

  if (grounded && attackPressed) {
    player.stateT = 0
    startAttack(game, 0)
    return
  }

  if (grounded && specialPressed && player.special >= 100) {
    startSpecial(game)
    return
  }

  const ax = input.ax
  const az = input.az
  const moving = Math.hypot(ax, az) > 0.12

  if (moving) {
    const speed = grounded ? PLAYER_SPEED : PLAYER_SPEED * 0.78
    const length = Math.max(1, Math.hypot(ax, az))
    player.x += (ax / length) * speed * dt
    player.z += (az / length) * PLAYER_Z_SPEED * dt * (grounded ? 1 : 0.78)
    if (Math.abs(ax) > 0.15) player.facing = ax > 0 ? 1 : -1
    if (grounded && player.state !== 'walk') {
      player.state = 'walk'
      player.animT = 0
    }
    if (grounded) {
      player.stepTimer -= dt
      if (player.stepTimer <= 0) {
        player.stepTimer = 0.19
        game.fx.dust(player.x - player.facing * 10, player.z, 2, { color: '192, 148, 100' })
      }
    }
  } else if (grounded) {
    player.state = 'idle'
  }

  if (!grounded) player.state = 'jump'
  playerBounds(game, player)
}

/* ------------------------------------------------------------------ */
/* Enemies                                                             */
/* ------------------------------------------------------------------ */

export function damagePlayer(game, amount, sourceX) {
  const player = game.player
  if (player.state === 'down' || player.state === 'special' || player.iframes > 0 || game.state !== 'playing') return

  player.hp = Math.max(0, player.hp - amount)
  player.iframes = 0.95
  player.hitFlash = 0.16
  player.state = 'hurt'
  player.stateT = 0
  player.attackP = 0
  player.comboStep = 0
  player.attackBuffer = 0
  player.didHit = false
  player.vx = (player.x >= sourceX ? 1 : -1) * 195
  player.vz = rand(-0.05, 0.05)

  game.combo = 0
  game.comboTimer = 0
  game.comboPulse = 0
  game.shake = Math.max(game.shake, amount >= 20 ? 13 : 8)
  game.flash = 0.55
  game.hitstop = Math.max(game.hitstop, 0.06)
  game.audio.sfx('hurt')
  game.fx.impact(player.x, player.z, 56, 1.2, '255, 116, 68')
  game.fx.text('OUCH!', player.x, player.z, '#ff8a5b', 22, { height: 96 })

  if (player.hp <= 0) {
    player.hp = 0
    player.state = 'down'
    player.stateT = 0
    player.downP = 0
    player.downTimer = 1.7
    player.lives = Math.max(0, player.lives - 1)
    game.combo = 0
    game.shake = 16
    game.audio.sfx('gameover')
  }
}

export function damageEnemy(game, enemy, amount, knock, dir) {
  if (enemy.dead) return
  const multiplier = comboMultiplier(game.combo)
  enemy.hp -= amount
  enemy.hitFlash = 0.14
  enemy.attackP = 0

  const height = (enemy.jumpY || 0) + 52
  game.fx.impact(enemy.x, enemy.z, height, amount >= 18 ? 1.55 : 1, '255, 208, 93')
  if (Math.random() > 0.5) game.fx.bones(enemy.x, enemy.z, height - 8, 1)
  game.hitstop = Math.max(game.hitstop, amount >= 18 ? 0.085 : 0.05)
  game.shake = Math.max(game.shake, amount >= 18 ? 8 : 4)
  game.audio.sfx(amount >= 18 ? 'heavy' : 'hit')

  game.combo += 1
  game.comboTimer = 2.2
  game.comboPulse = 0.3
  game.maxCombo = Math.max(game.maxCombo, game.combo)
  game.score += Math.round(7 * multiplier)
  game.player.special = Math.min(100, game.player.special + (amount >= 18 ? 12 : 7))

  if (game.combo % 3 === 0 || amount >= 18) {
    game.fx.text(pickWord(), enemy.x, enemy.z, '#ffcf4d', amount >= 18 ? 29 : 20, { height: 94 })
  }

  if (enemy.hp <= 0) {
    killEnemy(game, enemy, dir)
    return
  }

  if (enemy.kind === 'boss') {
    if (!enemy.enraged && enemy.hp < enemy.maxHp * 0.45) {
      enemy.enraged = true
      game.onBossEnrage?.(enemy)
    }
    return
  }

  enemy.state = 'hurt'
  enemy.stateT = 0
  enemy.hurtT = 0.34
  enemy.jumpY = 0
  enemy.vy = 0
  enemy.vx = dir * knock
  enemy.vz = rand(-0.055, 0.055)
}

function killEnemy(game, enemy, dir) {
  enemy.hp = 0
  enemy.dead = true
  enemy.state = 'down'
  enemy.stateT = 0
  enemy.downP = 0
  enemy.deadT = 0
  enemy.jumpY = 0
  enemy.vy = 0
  enemy.vx = dir * 260
  enemy.vz = rand(-0.1, 0.1)
  enemy.alpha = 1

  const multiplier = comboMultiplier(game.combo)
  const points = Math.round((enemy.scoreValue || 100) * multiplier)
  game.score += points
  game.fx.text(`+${points}`, enemy.x, enemy.z, '#ffe08a', 23, { height: 76, life: 0.95 })
  game.fx.bones(enemy.x, enemy.z, 28, enemy.kind === 'boss' ? 14 : 4)
  game.fx.ring(enemy.x, enemy.z, enemy.kind === 'boss' ? 260 : 46, '255, 211, 120', enemy.kind === 'boss' ? 0.7 : 0.3, 0.24)
  game.audio.sfx('heavy')
  game.comboPulse = 0.25

  if (enemy.kind === 'boss') {
    game.onBossDefeated?.(enemy)
  } else if (enemy.kind === 'clubber' && Math.random() < 0.55) {
    game.dropPickup?.(enemy.x, enemy.z)
  }
}

function updateDead(enemy, dt) {
  enemy.deadT += dt
  if (enemy.downP < 1) enemy.downP = Math.min(1, enemy.deadT / 0.45)
  enemy.x += enemy.vx * dt
  enemy.z = clamp(enemy.z + enemy.vz * dt, 0, 1)
  enemy.vx *= 0.9
  enemy.vz *= 0.9
  if (enemy.kind !== 'boss') {
    if (enemy.deadT > 1.2) enemy.alpha = clamp(1 - (enemy.deadT - 1.2) / 0.55, 0, 1)
    if (enemy.deadT > 1.8) enemy.remove = true
  }
}

function enemyStrike(game, enemy) {
  const player = game.player
  if (player.state === 'down' || game.state !== 'playing') return
  const dx = (player.x - enemy.x) * enemy.facing
  const depth = Math.abs(player.z - enemy.z)
  if (dx > -24 && dx < enemy.range + 30 && depth < 0.22 && player.jumpY < 34) {
    damagePlayer(game, enemy.damage, enemy.x)
  }
}

function startLeap(game, enemy) {
  const player = game.player
  enemy.state = 'leap'
  enemy.stateT = 0
  enemy.leapFrom = { x: enemy.x, z: enemy.z }
  enemy.leapTo = {
    x: clamp(player.x + player.vx * 0.14, game.camera.x + 40, game.camera.x + VIEW_W - 40),
    z: clamp(player.z, 0.02, 0.98),
  }
  enemy.jumpY = 1
  enemy.didHit = false
  game.audio.sfx('swing')
}

function updateLeaper(game, enemy, dt) {
  const player = game.player

  if (enemy.state === 'leapWind') {
    enemy.stateT += dt
    enemy.facing = player.x >= enemy.x ? 1 : -1
    if (enemy.stateT > 0.42) startLeap(game, enemy)
    return
  }

  if (enemy.state === 'leap') {
    enemy.stateT += dt
    const t = clamp(enemy.stateT / 0.62, 0, 1)
    enemy.x = enemy.leapFrom.x + (enemy.leapTo.x - enemy.leapFrom.x) * t
    enemy.z = enemy.leapFrom.z + (enemy.leapTo.z - enemy.leapFrom.z) * t
    enemy.jumpY = Math.sin(Math.PI * t) * 84
    if (t >= 1) {
      enemy.jumpY = 0
      enemy.state = 'idle'
      enemy.stateT = 0
      enemy.attackCooldown = rand(1.05, 1.5)
      game.fx.dust(enemy.x, enemy.z, 10)
      game.fx.ring(enemy.x, enemy.z, 54, '224, 176, 116', 0.32, 0.24)
      game.audio.sfx('land')
      const dx = (player.x - enemy.x) * enemy.facing
      const depth = Math.abs(player.z - enemy.z)
      if (dx > -36 && dx < 96 && depth < 0.25 && player.jumpY < 46) {
        damagePlayer(game, enemy.damage, enemy.x)
      }
    }
    return
  }

  if (enemy.state === 'hurt') {
    enemy.stateT += dt
    enemy.x += enemy.vx * dt
    enemy.z = clamp(enemy.z + enemy.vz * dt, 0, 1)
    enemy.vx *= 0.85
    enemy.vz *= 0.9
    if (enemy.stateT > 0.32) enemy.state = 'idle'
    return
  }

  if (enemy.state === 'attack') {
    enemy.stateT += dt
    enemy.attackP = clamp(enemy.stateT / enemy.attackDuration, 0, 1)
    if (!enemy.didHit && enemy.attackP >= enemy.hitAt) {
      enemy.didHit = true
      enemyStrike(game, enemy)
    }
    if (enemy.attackP >= 1) {
      enemy.state = 'idle'
      enemy.stateT = 0
      enemy.attackP = 0
      enemy.attackCooldown = rand(...ENEMY_STATS.leaper.cooldown)
    }
    return
  }

  if (enemy.state === 'spawn') {
    enemy.stateT += dt
    if (enemy.stateT > 0.45) {
      enemy.state = 'idle'
      enemy.stateT = 0
    }
    return
  }

  if (player.state === 'down' || game.state !== 'playing') {
    enemy.state = 'idle'
    return
  }

  const dx = player.x - enemy.x
  const depth = Math.abs(player.z - enemy.z)
  enemy.facing = dx >= 0 ? 1 : -1

  if (Math.abs(dx) > 105 && Math.abs(dx) < 330 && depth < 0.26 && enemy.attackCooldown <= 0) {
    enemy.state = 'leapWind'
    enemy.stateT = 0
    game.fx.dust(enemy.x, enemy.z, 4)
    return
  }

  if (Math.abs(dx) < enemy.range && depth < 0.17 && enemy.attackCooldown <= 0) {
    enemy.state = 'attack'
    enemy.stateT = 0
    enemy.attackP = 0
    enemy.didHit = false
    return
  }

  const side = enemy.x >= player.x ? 1 : -1
  const targetX = player.x + side * enemy.range * 0.8
  const targetZ = clamp(player.z + enemy.slotOffset, 0.05, 0.95)
  const moveX = targetX - enemy.x
  const moveZ = targetZ - enemy.z
  if (Math.abs(moveX) > 4 || Math.abs(moveZ) > 0.014) {
    const speed = enemy.speed * (Math.abs(dx) > 360 ? 1.35 : 1)
    const vx = moveX
    const vz = moveZ * 150
    const length = Math.max(1, Math.hypot(vx, vz))
    enemy.x += (vx / length) * speed * dt
    enemy.z += ((vz / length) * speed * dt) / 150
    enemy.z = clamp(enemy.z, 0, 1)
    enemy.state = 'walk'
    enemy.stepTimer -= dt
    if (enemy.stepTimer <= 0) {
      enemy.stepTimer = 0.24
      game.fx.dust(enemy.x - enemy.facing * 8, enemy.z, 1, { color: '176, 132, 88' })
    }
  } else {
    enemy.state = 'idle'
  }
}

export function updateEnemy(game, enemy, dt) {
  enemy.animT += dt
  if (enemy.hitFlash > 0) enemy.hitFlash -= dt
  if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt
  if (enemy.hpGhost > enemy.hp) enemy.hpGhost = Math.max(enemy.hp, enemy.hpGhost - 60 * dt)

  if (enemy.dead) {
    updateDead(enemy, dt)
    return
  }

  if (enemy.kind === 'boss') {
    updateBoss(game, enemy, dt)
  } else if (enemy.kind === 'leaper') {
    updateLeaper(game, enemy, dt)
  } else {
    updateGrunt(game, enemy, dt)
  }
}

function updateGrunt(game, enemy, dt) {
  const player = game.player

  if (enemy.state === 'spawn') {
    enemy.stateT += dt
    if (enemy.stateT > 0.45) {
      enemy.state = 'idle'
      enemy.stateT = 0
    }
    return
  }

  if (enemy.state === 'hurt') {
    enemy.stateT += dt
    enemy.x += enemy.vx * dt
    enemy.z = clamp(enemy.z + enemy.vz * dt, 0, 1)
    enemy.vx *= 0.85
    enemy.vz *= 0.9
    if (enemy.stateT > 0.32) enemy.state = 'idle'
    return
  }

  if (enemy.state === 'attack') {
    enemy.stateT += dt
    enemy.attackP = clamp(enemy.stateT / enemy.attackDuration, 0, 1)
    if (!enemy.didHit && enemy.attackP >= enemy.hitAt) {
      enemy.didHit = true
      enemyStrike(game, enemy)
      game.audio.sfx('swing')
    }
    if (enemy.attackP >= 1) {
      enemy.state = 'idle'
      enemy.stateT = 0
      enemy.attackP = 0
      enemy.attackCooldown = rand(...ENEMY_STATS[enemy.kind].cooldown)
    }
    return
  }

  if (player.state === 'down' || game.state !== 'playing') {
    enemy.state = 'idle'
    return
  }

  const dx = player.x - enemy.x
  const depth = Math.abs(player.z - enemy.z)
  enemy.facing = dx >= 0 ? 1 : -1

  if (Math.abs(dx) < enemy.range && depth < 0.17 && enemy.attackCooldown <= 0) {
    enemy.state = 'attack'
    enemy.stateT = 0
    enemy.attackP = 0
    enemy.didHit = false
    return
  }

  const side = enemy.x >= player.x ? 1 : -1
  const targetX = player.x + side * enemy.range * 0.78
  const targetZ = clamp(player.z + enemy.slotOffset, 0.05, 0.95)
  const moveX = targetX - enemy.x
  const moveZ = targetZ - enemy.z
  if (Math.abs(moveX) > 4 || Math.abs(moveZ) > 0.014) {
    const speed = enemy.speed * (Math.abs(dx) > 360 ? 1.35 : 1)
    const vx = moveX
    const vz = moveZ * 150
    const length = Math.max(1, Math.hypot(vx, vz))
    enemy.x += (vx / length) * speed * dt
    enemy.z += ((vz / length) * speed * dt) / 150
    enemy.z = clamp(enemy.z, 0, 1)
    enemy.state = 'walk'
    enemy.stepTimer -= dt
    if (enemy.stepTimer <= 0) {
      enemy.stepTimer = 0.26
      game.fx.dust(enemy.x - enemy.facing * 8, enemy.z, 1, { color: '176, 132, 88' })
    }
  } else {
    enemy.state = 'idle'
  }
}

/* ------------------------------------------------------------------ */
/* Boss                                                                */
/* ------------------------------------------------------------------ */

function bossStart(game, boss, state) {
  boss.state = state
  boss.stateT = 0
  boss.didHit = false
  if (state === 'slamWind') {
    boss.slamTarget = {
      x: clamp(game.player.x, game.camera.x + 80, game.camera.x + VIEW_W - 80),
      z: clamp(game.player.z, 0.12, 0.92),
    }
    boss.slamFrom = { x: boss.x, z: boss.z }
    game.audio.sfx('roar')
  } else if (state === 'chargeWind') {
    game.audio.sfx('charge')
  } else if (state === 'swingWind') {
    game.audio.sfx('swing')
  }
}

function chooseBossAttack(game, boss) {
  const player = game.player
  const distance = Math.abs(player.x - boss.x)
  const pattern = boss.pattern % 4
  boss.pattern += 1
  boss.facing = player.x >= boss.x ? 1 : -1

  if (distance > 300) {
    bossStart(game, boss, pattern === 2 ? 'slamWind' : 'chargeWind')
  } else if (distance < 195) {
    bossStart(game, boss, pattern === 3 ? 'slamWind' : 'swingWind')
  } else {
    bossStart(game, boss, pattern % 2 === 0 ? 'swingWind' : 'slamWind')
  }
}

function bossSwingHit(game, boss) {
  const player = game.player
  game.fx.slash(boss.x + boss.facing * 62, boss.z, boss.facing, 72, 66)
  game.shake = Math.max(game.shake, 10)
  game.audio.sfx('heavy')
  if (player.state === 'down') return
  const dx = (player.x - boss.x) * boss.facing
  const depth = Math.abs(player.z - boss.z)
  if (dx > -34 && dx < 158 && depth < 0.3 && player.jumpY < 42) {
    damagePlayer(game, 18, boss.x)
  }
}

function bossSlam(game, boss) {
  const target = boss.slamTarget || { x: boss.x, z: boss.z }
  game.fx.ring(target.x, target.z, 242, '255, 152, 59', 0.52, 0.3)
  game.fx.ring(target.x, target.z, 120, '255, 214, 130', 0.34, 0.3)
  game.fx.dust(target.x, target.z, 18)
  game.fx.debris(target.x, target.z, 8, 8)
  game.shake = Math.max(game.shake, 17)
  game.hitstop = Math.max(game.hitstop, 0.06)
  game.audio.sfx('slam')

  const player = game.player
  if (player.state === 'down') return
  if (Math.abs(player.x - target.x) < 242 && Math.abs(player.z - target.z) < 0.52 && player.jumpY < 30) {
    damagePlayer(game, 24, target.x)
  }
}

function updateBoss(game, boss, dt) {
  const player = game.player

  if (boss.state === 'intro') {
    boss.stateT += dt
    boss.facing = -1
    boss.x -= 52 * dt
    boss.stepTimer -= dt
    if (boss.stepTimer <= 0) {
      boss.stepTimer = 0.22
      game.fx.dust(boss.x - 8, boss.z, 2, { color: '186, 140, 92' })
    }
    if (boss.stateT > 1.7) {
      boss.state = 'idle'
      boss.stateT = 0
      boss.attackCooldown = 0.65
    }
    return
  }

  if (boss.state === 'swingWind') {
    boss.stateT += dt
    if (boss.stateT > (boss.enraged ? 0.5 : 0.66)) {
      boss.state = 'swingHit'
      boss.stateT = 0
      bossSwingHit(game, boss)
    }
    return
  }

  if (boss.state === 'swingHit') {
    boss.stateT += dt
    if (boss.stateT > 0.26) {
      boss.state = 'idle'
      boss.stateT = 0
      boss.attackCooldown = boss.enraged ? 0.42 : 0.8
    }
    return
  }

  if (boss.state === 'slamWind') {
    boss.stateT += dt
    if (boss.stateT > (boss.enraged ? 0.58 : 0.78)) {
      boss.state = 'slamAir'
      boss.stateT = 0
      boss.jumpY = 1
      boss.slamFrom = { x: boss.x, z: boss.z }
    }
    return
  }

  if (boss.state === 'slamAir') {
    boss.stateT += dt
    const duration = 0.62
    const t = clamp(boss.stateT / duration, 0, 1)
    const target = boss.slamTarget
    if (target) {
      boss.x = boss.slamFrom.x + (target.x - boss.slamFrom.x) * t
      boss.z = boss.slamFrom.z + (target.z - boss.slamFrom.z) * t
    }
    boss.jumpY = Math.sin(Math.PI * t) * 112
    if (t >= 1) {
      boss.jumpY = 0
      boss.state = 'slamLand'
      boss.stateT = 0
      bossSlam(game, boss)
    }
    return
  }

  if (boss.state === 'slamLand') {
    boss.stateT += dt
    if (boss.stateT > 0.52) {
      boss.state = 'idle'
      boss.stateT = 0
      boss.attackCooldown = boss.enraged ? 0.55 : 0.95
    }
    return
  }

  if (boss.state === 'chargeWind') {
    boss.stateT += dt
    if (boss.stateT > (boss.enraged ? 0.42 : 0.58)) {
      boss.state = 'charge'
      boss.stateT = 0
      boss.didHit = false
      boss.vx = boss.facing * (boss.enraged ? 640 : 540)
    }
    return
  }

  if (boss.state === 'charge') {
    boss.stateT += dt
    boss.x += boss.vx * dt
    boss.x = clamp(boss.x, game.camera.x + 60, game.camera.x + VIEW_W - 60)
    boss.stepTimer -= dt
    if (boss.stepTimer <= 0) {
      boss.stepTimer = 0.08
      game.fx.dust(boss.x - boss.facing * 18, boss.z, 2, { color: '194, 146, 94' })
    }
    if (!boss.didHit && player.state !== 'down') {
      const dx = (player.x - boss.x) * boss.facing
      const depth = Math.abs(player.z - boss.z)
      if (dx > -50 && dx < 92 && depth < 0.25 && player.jumpY < 34) {
        boss.didHit = true
        damagePlayer(game, 22, boss.x)
        game.shake = Math.max(game.shake, 12)
      }
    }
    if (boss.stateT > 0.58) {
      boss.state = 'chargeRec'
      boss.stateT = 0
    }
    return
  }

  if (boss.state === 'chargeRec') {
    boss.stateT += dt
    if (boss.stateT > 0.75) {
      boss.state = 'idle'
      boss.stateT = 0
      boss.attackCooldown = boss.enraged ? 0.4 : 0.7
    }
    return
  }

  if (boss.state === 'hurt') {
    boss.stateT += dt
    boss.x += boss.vx * dt
    boss.vx *= 0.85
    if (boss.stateT > 0.3) boss.state = 'idle'
    return
  }

  // idle / walk
  boss.stateT += dt
  if (player.state === 'down' || game.state !== 'playing') {
    boss.state = 'idle'
    return
  }

  boss.facing = player.x >= boss.x ? 1 : -1
  const distance = Math.abs(player.x - boss.x)
  const depth = Math.abs(player.z - boss.z)
  const side = boss.x >= player.x ? 1 : -1
  const targetX = player.x + side * 158
  const targetZ = clamp(player.z, 0.15, 0.9)
  const moveX = targetX - boss.x
  const moveZ = targetZ - boss.z

  if (Math.abs(moveX) > 12 || Math.abs(moveZ) > 0.03) {
    const speed = boss.speed * (boss.enraged ? 1.28 : 1)
    const vx = moveX
    const vz = moveZ * 150
    const length = Math.max(1, Math.hypot(vx, vz))
    boss.x += (vx / length) * speed * dt
    boss.z += ((vz / length) * speed * dt) / 150
    boss.x = clamp(boss.x, game.camera.x + 70, game.camera.x + VIEW_W - 70)
    boss.z = clamp(boss.z, 0.12, 0.92)
    boss.state = 'walk'
    boss.stepTimer -= dt
    if (boss.stepTimer <= 0) {
      boss.stepTimer = 0.2
      game.fx.dust(boss.x - boss.facing * 10, boss.z, 2, { color: '186, 140, 92' })
    }
  } else {
    boss.state = 'idle'
  }

  if (distance < 430 && boss.attackCooldown <= 0) chooseBossAttack(game, boss)
}
