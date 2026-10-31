import { Input } from './input.js'
import { AudioEngine } from './audio.js'
import { FX } from './fx.js'
import {
  createPlayer, createEnemy, updatePlayer, updateEnemy,
} from './actors.js'
import {
  VIEW_W, VIEW_H, GROUND_TOP, DEPTH, LEVEL_END, WAVES, WAVE_COUNT, FIXED_PICKUPS,
} from './config.js'
import {
  drawBackground, drawForeground, drawCharacter, drawMeat,
  drawHUD, drawBanner, drawVignette,
} from './art.js'

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const input = new Input()
const audio = new AudioEngine()
const fx = new FX()

const screens = {
  title: document.getElementById('screen-title'),
  pause: document.getElementById('screen-pause'),
  over: document.getElementById('screen-over'),
  win: document.getElementById('screen-win'),
}
const muteButton = document.getElementById('mute-btn')

const HIGH_SCORE_KEY = 'wammer-dudes.highscore'
const MUTE_KEY = 'wammer-dudes.muted'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function loadHighScore() {
  try {
    return Math.max(0, Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0)
  } catch {
    return 0
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)))
  } catch {
    // private mode: score simply won't persist
  }
}

function storedMute() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

const game = {
  state: 'title',
  time: 0,
  dt: 0,
  input,
  audio,
  fx,
  player: createPlayer(),
  enemies: [],
  pickups: [],
  waves: [],
  waveIndex: -1,
  activeWave: null,
  boss: null,
  camera: { x: 0, shake: 0, lock: null },
  score: 0,
  highScore: loadHighScore(),
  combo: 0,
  comboTimer: 0,
  comboPulse: 0,
  maxCombo: 0,
  banner: null,
  hitstop: 0,
  flash: 0,
  victoryTimer: 0,
  titleCam: 240,
  titleRival: null,
  dropCount: 0,
}

audio.muted = storedMute()

function refreshMuteButton() {
  muteButton.classList.toggle('muted', audio.muted)
  muteButton.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound')
}

function toggleMute(force) {
  const muted = audio.toggleMute(force)
  refreshMuteButton()
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // ignore storage failures
  }
}

function padScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(6, '0')
}

function refreshOverlays() {
  const best = Math.max(game.highScore, game.score)
  document.getElementById('hs-title').textContent = padScore(best)
  document.getElementById('final-score').textContent = padScore(game.score)
  document.getElementById('best-score').textContent = padScore(best)
  document.getElementById('win-score').textContent = padScore(game.score)
  document.getElementById('win-best').textContent = padScore(best)
}

function showScreen(name) {
  for (const [key, element] of Object.entries(screens)) {
    element.classList.toggle('hidden', key !== name)
  }
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
}

function makeWaves() {
  return WAVES.map((wave) => ({ ...wave, enemies: [...wave.enemies] }))
}

function showBanner(title, sub, options = {}) {
  const duration = options.duration ?? 2
  game.banner = {
    title,
    sub,
    t: duration,
    duration,
    size: options.size ?? 56,
    color: options.color ?? '#ffcf4d',
    y: options.y ?? 172,
    rotate: options.rotate ?? -0.025,
    strokeWidth: options.strokeWidth ?? 9,
  }
}

function resetRun() {
  game.player = createPlayer()
  game.enemies.length = 0
  game.pickups = FIXED_PICKUPS.map((pickup) => ({ ...pickup }))
  game.waves = makeWaves()
  game.waveIndex = -1
  game.activeWave = null
  game.boss = null
  game.camera.x = 0
  game.camera.shake = 0
  game.camera.lock = null
  game.score = 0
  game.combo = 0
  game.comboTimer = 0
  game.comboPulse = 0
  game.maxCombo = 0
  game.hitstop = 0
  game.flash = 0
  game.victoryTimer = 0
  game.dropCount = 0
  game.time = 0
  game.titleCam = 240
  fx.reset()
  audio.setScene('fight')
  showBanner('FIRE VALLEY', 'SMASH RIGHT TO FIND THE BONEFANG', {
    size: 54,
    duration: 2.7,
    y: 176,
  })
}

function beginRun() {
  audio.unlock()
  if (audio.muted) audio.toggleMute(true)
  resetRun()
  game.state = 'playing'
  showScreen(null)
  audio.sfx('clear')
}

function pauseGame() {
  if (game.state !== 'playing') return
  game.state = 'paused'
  showScreen('pause')
}

function resumeGame() {
  if (game.state !== 'paused') return
  game.state = 'playing'
  showScreen(null)
}

function finishRun(won) {
  if (game.state === 'gameover' || game.state === 'victory') return
  game.state = won ? 'victory' : 'gameover'
  if (game.score > game.highScore) {
    game.highScore = Math.floor(game.score)
    saveHighScore(game.highScore)
  }
  refreshOverlays()
  showScreen(won ? 'win' : 'over')
  audio.setScene('title')
  if (won) audio.sfx('win')
}

function onPlayerDefeat() {
  if (game.state !== 'playing') return
  finishRun(false)
}

function onBossDefeated(boss) {
  game.boss = null
  game.camera.lock = null
  game.activeWave = null
  game.victoryTimer = 3.15
  game.score += 2500
  game.camera.shake = 22
  game.hitstop = 0.12
  fx.text('MOG DOWN!', boss.x, boss.z, '#ffcf4d', 44, { height: 128, life: 2.2 })
  fx.ring(boss.x, boss.z, 320, '255, 214, 120', 0.9, 0.26)
  showBanner('MAMMOTH MOG FALLS', 'THE VALLEY IS YOURS', {
    size: 46,
    color: '#ffe08a',
    duration: 3,
    y: 168,
  })
  audio.sfx('roar')
}

function onBossEnrage(boss) {
  game.camera.shake = Math.max(game.camera.shake, 14)
  fx.ring(boss.x, boss.z, 180, '255, 113, 52', 0.6, 0.3)
  fx.text('ENRAGED!', boss.x, boss.z, '#ff8a5b', 34, { height: 126, life: 1.4 })
  audio.sfx('roar')
  showBanner('MOG IS FURIOUS', 'JUMP OVER THE GROUND SLAM', {
    size: 34,
    color: '#ff8a5b',
    duration: 1.8,
    y: 140,
  })
}

function dropPickup(x, z) {
  if (game.pickups.length > 5) return
  game.dropCount += 1
  game.pickups.push({
    x: clamp(x, 40, LEVEL_END - 40),
    z: clamp(z, 0.08, 0.94),
    seed: rand(0, 10),
  })
}

game.onPlayerDefeat = onPlayerDefeat
game.onBossDefeated = onBossDefeated
game.onBossEnrage = onBossEnrage
game.dropPickup = dropPickup
game.showBanner = showBanner

game.titleRival = createEnemy('grunt', 820, 0.72)
game.titleRival.state = 'idle'
game.titleRival.animT = 0

/* ------------------------------------------------------------------ */
/* Run flow                                                            */
/* ------------------------------------------------------------------ */

function startWave(index) {
  const wave = game.waves[index]
  if (!wave) return
  game.waveIndex = index
  game.camera.lock = wave.lock

  if (wave.boss) {
    game.activeWave = { index, lock: wave.lock, pending: [], boss: true, cleared: false }
    const boss = createEnemy('boss', wave.lock + 620, 0.68)
    boss.state = 'intro'
    boss.stateT = 0
    boss.facing = -1
    game.enemies.push(boss)
    game.boss = boss
    audio.setScene('boss')
    audio.sfx('roar')
    showBanner('MAMMOTH MOG', 'CHIEFTAIN OF THE BONEFANG', {
      size: 56,
      color: '#ff8a5b',
      duration: 2.9,
      y: 168,
      strokeWidth: 10,
    })
  } else {
    const pending = wave.enemies.map((type, i) => ({
      type,
      side: wave.flank && i === wave.enemies.length - 1 ? 'left' : 'right',
      delay: 0.15 + i * 0.42,
      slot: i,
    }))
    game.activeWave = { index, lock: wave.lock, pending, boss: false, cleared: false }
    showBanner(wave.name, `FIGHT ${index + 1} OF ${WAVE_COUNT}`, {
      size: 52,
      color: '#ffcf4d',
      duration: 1.9,
      y: 170,
    })
  }
}

function spawnWaveEnemy(spec) {
  const x = spec.side === 'left'
    ? game.camera.x - 60 - rand(0, 70)
    : game.camera.x + VIEW_W + 50 + rand(0, 110)
  const z = clamp(rand(0.16, 0.9), 0, 1)
  const enemy = createEnemy(spec.type, x, z, spec.slot)
  enemy.facing = spec.side === 'left' ? 1 : -1
  game.enemies.push(enemy)
  fx.dust(x, z, 5, { color: '188, 144, 96' })
}

function updateWaves(dt) {
  const active = game.activeWave
  if (active) {
    for (let i = active.pending.length - 1; i >= 0; i -= 1) {
      const spec = active.pending[i]
      spec.delay -= dt
      if (spec.delay <= 0) {
        spawnWaveEnemy(spec)
        active.pending.splice(i, 1)
      }
    }

    if (!active.cleared && !active.boss && active.pending.length === 0) {
      const anyAlive = game.enemies.some((enemy) => !enemy.dead)
      if (!anyAlive) {
        active.cleared = true
        game.activeWave = null
        game.camera.lock = null
        const bonus = 220 + game.waveIndex * 45
        game.score += bonus
        fx.text(`+${bonus}`, game.player.x, game.player.z, '#ffe08a', 24, { height: 110, life: 1 })
        showBanner('PATH CLEARED', 'GO RIGHT  →', {
          size: 48,
          color: '#ffe08a',
          duration: 1.8,
          y: 176,
        })
        audio.sfx('clear')
      }
    }
    return
  }

  const nextIndex = game.waveIndex + 1
  const next = game.waves[nextIndex]
  if (next && game.player.x >= next.trigger && game.player.state !== 'down') {
    startWave(nextIndex)
  }
}

function updatePickups() {
  const player = game.player
  for (let i = game.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = game.pickups[i]
    if (Math.abs(pickup.x - player.x) < 40 && Math.abs(pickup.z - player.z) < 0.17 && player.jumpY < 34) {
      player.hp = Math.min(player.maxHp, player.hp + 30)
      player.hpGhost = player.hp
      game.score += 60
      fx.text('+30 MEAT', pickup.x, pickup.z, '#a8e06a', 22, { height: 80, life: 1 })
      fx.impact(pickup.x, pickup.z, 26, 0.8, '180, 224, 120')
      audio.sfx('meat')
      game.pickups.splice(i, 1)
    }
  }
}

function updateCamera(dt) {
  const maxCam = game.camera.lock ?? (LEVEL_END - VIEW_W)
  const desired = clamp(game.player.x - 370, 0, maxCam)
  game.camera.x += (desired - game.camera.x) * (1 - Math.exp(-6.5 * dt))
}

function updateTimers(dt) {
  if (game.combo > 0) {
    game.comboTimer -= dt
    if (game.comboTimer <= 0) {
      game.combo = 0
      game.comboTimer = 0
    }
  }
  game.comboPulse = Math.max(0, game.comboPulse - dt * 2.8)
  game.flash = Math.max(0, game.flash - dt * 2.1)
  game.camera.shake = Math.max(0, game.camera.shake - dt * 24)
  if (game.banner) {
    game.banner.t -= dt
    if (game.banner.t <= 0) game.banner = null
  }
  if (game.score > game.highScore) {
    game.highScore = Math.floor(game.score)
  }
}

function updateTitle(dt) {
  game.player.animT += dt
  game.player.state = 'idle'
  game.titleRival.animT += dt
  game.titleRival.state = 'idle'
  game.titleCam = 250 + Math.sin(game.time * 0.08) * 55
  fx.update(dt)
}

/* ------------------------------------------------------------------ */
/* Main loop                                                           */
/* ------------------------------------------------------------------ */

let lastTime = performance.now()

function tick(dt) {
  input.sample()
  game.dt = dt

  if (input.consume('mute')) toggleMute()

  if (game.state === 'paused') {
    if (input.consume('pause') || input.consume('confirm')) {
      resumeGame()
      audio.unlock()
    }
    return
  }

  game.time += dt
  updateTimers(dt)

  if (game.state === 'title') {
    updateTitle(dt)
    if (input.consume('confirm') || input.consume('attack') || input.consume('jump') || input.consume('restart')) {
      beginRun()
    }
    return
  }

  if (game.state === 'gameover' || game.state === 'victory') {
    fx.update(dt * 0.55)
    if (input.consume('confirm') || input.consume('jump') || input.consume('restart')) {
      beginRun()
    }
    return
  }

  if (game.state !== 'playing') return

  if (input.consume('pause')) {
    pauseGame()
    return
  }

  if (game.hitstop > 0) {
    game.hitstop -= dt
    fx.update(dt * 0.18)
    return
  }

  updatePlayer(game, dt)
  for (const enemy of game.enemies) updateEnemy(game, enemy, dt)
  game.enemies = game.enemies.filter((enemy) => !enemy.remove)
  updatePickups()
  updateWaves(dt)
  updateCamera(dt)
  fx.update(dt)

  if (game.victoryTimer > 0) {
    game.victoryTimer -= dt
    if (game.victoryTimer <= 0) finishRun(true)
  }
}

function drawSlamWarning(ctx, boss, cameraX, time) {
  if (!boss || !boss.slamTarget) return
  if (boss.state !== 'slamWind' && boss.state !== 'slamAir') return
  const x = boss.slamTarget.x - cameraX
  const y = GROUND_TOP + boss.slamTarget.z * DEPTH
  const pulse = 0.65 + Math.sin(time * 18) * 0.2
  const radius = 232
  ctx.save()
  ctx.globalAlpha = pulse * 0.8
  ctx.strokeStyle = 'rgba(255, 116, 55, 0.95)'
  ctx.lineWidth = 4
  ctx.setLineDash([16, 10])
  ctx.beginPath()
  ctx.ellipse(x, y, radius, radius * 0.24, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 0.13
  ctx.fillStyle = '#ff7a3c'
  ctx.beginPath()
  ctx.ellipse(x, y, radius, radius * 0.24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawEnemyTells(ctx, cameraX, time) {
  for (const enemy of game.enemies) {
    if (enemy.dead) continue
    const screenX = enemy.x - cameraX
    if (screenX < -80 || screenX > VIEW_W + 80) continue
    const groundY = GROUND_TOP + enemy.z * DEPTH
    const y = groundY - (enemy.jumpY || 0) - (enemy.kind === 'boss' ? 150 : 104)
    let show = false
    let size = 22
    if (enemy.state === 'attack' && enemy.attackP < 0.45) show = true
    if (enemy.kind === 'boss' && ['swingWind', 'slamWind', 'chargeWind'].includes(enemy.state)) {
      show = true
      size = 30
    }
    if (!show) continue
    const bounce = Math.sin(time * 14 + enemy.seed) * 3
    ctx.save()
    ctx.translate(screenX, y + bounce)
    ctx.font = `400 ${size}px "Bangers", "Arial Black", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(3, size * 0.2)
    ctx.strokeStyle = '#2a130b'
    ctx.strokeText('!', 0, 0)
    ctx.fillStyle = enemy.kind === 'boss' ? '#ff7a3b' : '#ffcf4d'
    ctx.fillText('!', 0, 0)
    ctx.restore()
  }
}

function drawCampfire(ctx, cameraX, time) {
  const x = 262
  const y = GROUND_TOP + 0.52 * DEPTH
  ctx.save()

  const glow = ctx.createRadialGradient(x, y - 22, 4, x, y - 18, 130)
  glow.addColorStop(0, 'rgba(255, 171, 70, 0.38)')
  glow.addColorStop(0.4, 'rgba(255, 120, 40, 0.14)')
  glow.addColorStop(1, 'rgba(255, 90, 30, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - 140, y - 150, 280, 210)

  // logs
  ctx.strokeStyle = '#3a2117'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - 27, y + 4)
  ctx.lineTo(x + 27, y - 5)
  ctx.moveTo(x - 26, y - 5)
  ctx.lineTo(x + 28, y + 4)
  ctx.stroke()
  ctx.strokeStyle = '#6a3d24'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(x - 27, y + 4)
  ctx.lineTo(x + 27, y - 5)
  ctx.moveTo(x - 26, y - 5)
  ctx.lineTo(x + 28, y + 4)
  ctx.stroke()

  for (let i = 0; i < 4; i += 1) {
    const flicker = Math.sin(time * 9 + i * 2.3) * 4
    const height = 34 + i * 8 + flicker
    const width = 13 - i * 2
    ctx.beginPath()
    ctx.moveTo(x - width + i * 3, y - 2)
    ctx.quadraticCurveTo(x - width + flicker, y - height * 0.6, x + i * 3 - 2, y - height)
    ctx.quadraticCurveTo(x + width + flicker, y - height * 0.4, x + width + i * 3, y - 1)
    ctx.closePath()
    ctx.fillStyle = i < 2 ? '#ffcf4d' : '#ff7a32'
    ctx.globalAlpha = 0.85 - i * 0.12
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.beginPath()
  ctx.ellipse(x, y - 7, 8, 15, 0.1, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 245, 190, 0.85)'
  ctx.fill()
  ctx.restore()
}

function render() {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  if (canvas.width !== Math.floor(VIEW_W * dpr) || canvas.height !== Math.floor(VIEW_H * dpr)) {
    canvas.width = Math.floor(VIEW_W * dpr)
    canvas.height = Math.floor(VIEW_H * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, VIEW_W, VIEW_H)
  ctx.imageSmoothingEnabled = true

  const camera = game.camera
  const shakeX = (Math.random() * 2 - 1) * camera.shake
  const shakeY = (Math.random() * 2 - 1) * camera.shake * 0.65
  const cameraX = game.state === 'title' ? game.titleCam : camera.x

  ctx.save()
  ctx.translate(shakeX, shakeY)
  drawBackground(ctx, cameraX, game.time)

  if (game.state === 'title') {
    drawCampfire(ctx, cameraX, game.time)
    game.player.x = cameraX + 158
    game.player.z = 0.72
    game.player.facing = 1
    game.player.hp = game.player.maxHp
    game.player.hpGhost = game.player.maxHp
    game.titleRival.x = cameraX + 824
    game.titleRival.z = 0.72
    game.titleRival.facing = -1
    game.titleRival.hp = 40
    game.titleRival.maxHp = 40
    const titleEntities = [game.player, game.titleRival].sort((a, b) => a.z - b.z)
    for (const entity of titleEntities) drawCharacter(ctx, entity, cameraX, game.time)
    drawForeground(ctx, cameraX, game.time)
    ctx.restore()
    drawVignette(ctx)
    return
  }

  fx.drawGround(ctx, cameraX)
  drawSlamWarning(ctx, game.boss, cameraX, game.time)

  for (const pickup of game.pickups) drawMeat(ctx, pickup, cameraX, game.time)

  const entities = [...game.enemies, game.player].sort((a, b) => a.z - b.z)
  for (const entity of entities) drawCharacter(ctx, entity, cameraX, game.time)

  fx.draw(ctx, cameraX)
  drawEnemyTells(ctx, cameraX, game.time)
  drawForeground(ctx, cameraX, game.time)
  ctx.restore()

  drawVignette(ctx)

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(190, 32, 20, ${game.flash * 0.34})`
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }

  if (game.state === 'playing' || game.state === 'paused' || game.state === 'victory') {
    drawHUD(ctx, game, game.time)
  }
  if (game.state === 'playing') drawBanner(ctx, game.banner, game.time)
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000))
  lastTime = now
  tick(dt)
  input.endFrame()
  render()
  requestAnimationFrame(frame)
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

document.getElementById('start-btn').addEventListener('click', beginRun)
document.getElementById('resume-btn').addEventListener('click', resumeGame)
document.getElementById('retry-btn').addEventListener('click', beginRun)
document.getElementById('again-btn').addEventListener('click', beginRun)
muteButton.addEventListener('click', () => toggleMute())
refreshMuteButton()

addEventListener('pointerdown', () => {
  audio.unlock()
  if (audio.muted) audio.toggleMute(true)
})
addEventListener('keydown', () => {
  audio.unlock()
  if (audio.muted) audio.toggleMute(true)
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') pauseGame()
})

addEventListener('resize', () => {
  // canvas backing store is handled on the next render
})

showScreen('title')
refreshOverlays()
window.__wammer = game
requestAnimationFrame(frame)
