export const VIEW_W = 960
export const VIEW_H = 540
export const GROUND_TOP = 352
export const DEPTH = 146

const INK = '#1c0e0b'
const BONE = '#f3dfb6'
const DISPLAY = '"Bangers", "Arial Black", Impact, sans-serif'
const BODY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif'

const PALETTES = {
  player: {
    skin: '#e8a06a', skinDark: '#c57a48', hair: '#d4522b', hairDark: '#a0371a',
    cloth: '#3d716c', clothDark: '#28514e', fur: '#dcc196', furDark: '#b39264',
    club: '#8c5a2f', clubDark: '#653d1e', eye: '#fff7e2', paint: '#e05a32',
  },
  grunt: {
    skin: '#a6b269', skinDark: '#7f8b4d', hair: '#3f2a18', hairDark: '#2b1a0e',
    cloth: '#74452b', clothDark: '#512e1b', fur: '#8f6844', furDark: '#6d4c2e',
    club: '#7d4e28', clubDark: '#593317', eye: '#fff3cf', paint: '#b93b2a',
  },
  clubber: {
    skin: '#ca8c5f', skinDark: '#a56a42', hair: '#582b1b', hairDark: '#3a1a10',
    cloth: '#6c3e25', clothDark: '#4c2916', fur: '#9d7650', furDark: '#795634',
    club: '#74451f', clubDark: '#4f2c12', eye: '#fff3cf', paint: '#b93b2a',
  },
  leaper: {
    skin: '#b7c195', skinDark: '#8e9a6d', hair: '#59712f', hairDark: '#3d4f1e',
    cloth: '#46572f', clothDark: '#313e1f', fur: '#7f8f59', furDark: '#5d6a3d',
    club: '#6d4a28', clubDark: '#4a3018', eye: '#f6ffd8', paint: '#c24830',
  },
  boss: {
    skin: '#8f6656', skinDark: '#6d4a3d', hair: '#2c1913', hairDark: '#1b0e0a',
    cloth: '#5a2a21', clothDark: '#3d1a14', fur: '#c9ae84', furDark: '#a4875e',
    club: '#6b4224', clubDark: '#462813', eye: '#ffd35e', paint: '#d2402b',
  },
}

const KIND = {
  player: { bulk: 1, headR: 13.5, hair: 'spiky', beard: false, club: 1, shirt: true, necklace: true, pants: true },
  grunt: { bulk: 0.98, headR: 13, hair: 'topknot', beard: false, club: 0.95, shirt: true, necklace: false, pants: true, warPaint: true },
  clubber: { bulk: 1.2, headR: 14.5, hair: 'bald', beard: true, club: 1.18, shirt: true, necklace: false, pants: true, warPaint: true },
  leaper: { bulk: 0.86, headR: 12.5, hair: 'crest', beard: false, club: 0, shirt: false, necklace: false, pants: true, warPaint: true },
  boss: { bulk: 1.52, headR: 17.5, hair: 'mammoth', beard: true, club: 1.75, shirt: true, necklace: false, pants: true, warPaint: false, boss: true },
}

let vignetteCanvas = null
let grainCanvas = null
let skyCanvas = null
let groundCanvas = null
let groundDetailCanvas = null
let foregroundCanvas = null
let jungleCanvas = null
const mountainStripCache = new Map()

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function smooth(step) {
  return step * step * (3 - 2 * step)
}

function easeOut(step) {
  return 1 - Math.pow(1 - step, 3)
}

function hash(n) {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return value - Math.floor(value)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function path(ctx, points, close = true) {
  ctx.beginPath()
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  if (close) ctx.closePath()
}

function fillShape(ctx, points, fill, line = INK, lineWidth = 3) {
  path(ctx, points)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (line) {
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = line
    ctx.stroke()
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function displayText(ctx, text, x, y, size, fill, options = {}) {
  const {
    align = 'center',
    baseline = 'middle',
    stroke = INK,
    strokeWidth = Math.max(2, size * 0.12),
    alpha = 1,
    rotate = 0,
    spacing = null,
  } = options
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.translate(x, y)
  if (rotate) ctx.rotate(rotate)
  ctx.font = `400 ${size}px ${DISPLAY}`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  if (spacing !== null && 'letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
  if (stroke) {
    ctx.lineWidth = strokeWidth
    ctx.strokeStyle = stroke
    ctx.lineJoin = 'round'
    ctx.strokeText(text, 0, 0)
  }
  ctx.fillStyle = fill
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function bodyText(ctx, text, x, y, size, color, options = {}) {
  const { align = 'left', weight = 800, baseline = 'middle', alpha = 1, spacing = 0 } = options
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.font = `${weight} ${size}px ${BODY}`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* World background                                                    */
/* ------------------------------------------------------------------ */

function buildSky() {
  skyCanvas = makeCanvas(VIEW_W, 430)
  const sctx = skyCanvas.getContext('2d')
  const gradient = sctx.createLinearGradient(0, 0, 0, 420)
  gradient.addColorStop(0, '#3a2139')
  gradient.addColorStop(0.26, '#773a45')
  gradient.addColorStop(0.55, '#c9664d')
  gradient.addColorStop(0.78, '#f4a15d')
  gradient.addColorStop(1, '#ffd08a')
  sctx.fillStyle = gradient
  sctx.fillRect(0, 0, VIEW_W, 430)

  const sunX = 728
  const sunY = 140
  const glow = sctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 170)
  glow.addColorStop(0, 'rgba(255, 233, 170, 0.95)')
  glow.addColorStop(0.16, 'rgba(255, 201, 117, 0.55)')
  glow.addColorStop(0.5, 'rgba(255, 150, 80, 0.16)')
  glow.addColorStop(1, 'rgba(255, 130, 70, 0)')
  sctx.fillStyle = glow
  sctx.fillRect(sunX - 190, sunY - 190, 380, 380)

  sctx.beginPath()
  sctx.arc(sunX, sunY, 48, 0, Math.PI * 2)
  sctx.fillStyle = '#ffe8ae'
  sctx.fill()

  sctx.save()
  sctx.globalAlpha = 0.16
  sctx.fillStyle = '#ffd8a0'
  for (let i = 0; i < 3; i += 1) {
    const y = sunY - 20 + i * 16
    sctx.fillRect(sunX - 46, y, 92, 3)
  }
  sctx.restore()
}

function sky(ctx, time) {
  if (!skyCanvas) buildSky()
  ctx.drawImage(skyCanvas, 0, 0)

  // afternoon clouds
  const clouds = [
    { x: 110, y: 104, s: 1.1, a: 0.18 },
    { x: 430, y: 74, s: 0.8, a: 0.12 },
    { x: 830, y: 190, s: 1.35, a: 0.1 },
  ]
  for (let i = 0; i < clouds.length; i += 1) {
    const cloud = clouds[i]
    const drift = ((time * 2.2 + i * 90) % 1100) - 100
    ctx.save()
    ctx.globalAlpha = cloud.a
    ctx.fillStyle = '#ffe0ba'
    ctx.beginPath()
    ctx.ellipse(cloud.x + drift * 0.12, cloud.y, 92 * cloud.s, 17 * cloud.s, 0, 0, Math.PI * 2)
    ctx.ellipse(cloud.x + 44 + drift * 0.12, cloud.y - 9, 54 * cloud.s, 14 * cloud.s, 0, 0, Math.PI * 2)
    ctx.ellipse(cloud.x - 52 + drift * 0.12, cloud.y + 3, 48 * cloud.s, 10 * cloud.s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawPterodactyls(ctx, camX, time) {
  ctx.save()
  ctx.fillStyle = 'rgba(55, 27, 35, 0.55)'
  for (let i = 0; i < 2; i += 1) {
    const speed = 9 + i * 4
    const x = ((time * speed + i * 570) % 1240) - 140 - camX * 0.035
    const y = 88 + i * 54 + Math.sin(time * 0.6 + i * 2) * 9
    const flap = Math.sin(time * 4.2 + i * 2.4)
    const size = 0.8 + i * 0.25
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(size, size)
    ctx.beginPath()
    ctx.moveTo(-17, 0)
    ctx.quadraticCurveTo(-7, -4, 0, 0)
    ctx.quadraticCurveTo(6, -3, 17, 0)
    ctx.quadraticCurveTo(8, 0, 3, 3)
    ctx.quadraticCurveTo(10, 8 + flap * 4, 17, 11 + flap * 4)
    ctx.quadraticCurveTo(4, 7, 0, 4)
    ctx.quadraticCurveTo(-5, 6, -14, 9 - flap * 3)
    ctx.quadraticCurveTo(-9, 4, -17, 0)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

function mountainRange(ctx, camX, factor, baseY, color, seed, height, width, jagged = 6) {
  const key = `${baseY}|${color}|${seed}|${height}|${width}|${jagged}`
  let strip = mountainStripCache.get(key)
  if (!strip) {
    strip = makeCanvas(width, baseY)
    const sctx = strip.getContext('2d')
    sctx.fillStyle = color
    sctx.beginPath()
    sctx.moveTo(-2, baseY)
    for (let i = 0; i < jagged; i += 1) {
      const x1 = (i / jagged) * width
      const x2 = ((i + 0.5) / jagged) * width
      const peak = baseY - height * (0.45 + hash(seed + i) * 0.55)
      sctx.lineTo(x1, baseY - height * 0.15)
      sctx.lineTo(x2, peak)
      sctx.lineTo(x2 + 4, peak + 6)
    }
    sctx.lineTo(width + 2, baseY)
    sctx.closePath()
    sctx.fill()
    mountainStripCache.set(key, strip)
  }

  const offset = -((camX * factor) % width)
  for (let copy = -1; copy <= 2; copy += 1) {
    ctx.drawImage(strip, Math.round(offset + copy * width), 0)
  }
}

function drawVolcano(ctx, camX, time) {
  const wrap = 2600
  const base = 1500
  const x = ((base - camX * 0.1) % wrap + wrap) % wrap - 320
  if (x > VIEW_W + 260 || x < -380) return
  const groundY = 337

  ctx.save()
  const glow = ctx.createRadialGradient(x + 6, groundY - 128, 8, x + 6, groundY - 116, 150)
  glow.addColorStop(0, 'rgba(255, 132, 54, 0.5)')
  glow.addColorStop(0.3, 'rgba(255, 100, 40, 0.15)')
  glow.addColorStop(1, 'rgba(255, 90, 40, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - 170, groundY - 270, 360, 290)

  ctx.beginPath()
  ctx.moveTo(x - 180, groundY)
  ctx.quadraticCurveTo(x - 92, groundY - 72, x - 44, groundY - 154)
  ctx.lineTo(x + 20, groundY - 168)
  ctx.quadraticCurveTo(x + 78, groundY - 82, x + 176, groundY)
  ctx.closePath()
  const cone = ctx.createLinearGradient(x - 180, groundY, x + 180, groundY - 160)
  cone.addColorStop(0, '#4b2c3e')
  cone.addColorStop(0.55, '#623548')
  cone.addColorStop(1, '#783d4b')
  ctx.fillStyle = cone
  ctx.fill()

  // lava veins
  ctx.strokeStyle = 'rgba(255, 118, 48, 0.75)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x - 16, groundY - 164)
  ctx.quadraticCurveTo(x - 30, groundY - 120, x + 2, groundY - 96)
  ctx.quadraticCurveTo(x + 28, groundY - 78, x + 16, groundY - 40)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 54, groundY - 140)
  ctx.quadraticCurveTo(x - 72, groundY - 108, x - 58, groundY - 70)
  ctx.stroke()

  // crater glow
  ctx.beginPath()
  ctx.ellipse(x - 12, groundY - 164, 34, 8, 0.05, 0, Math.PI * 2)
  ctx.fillStyle = '#ff8a3c'
  ctx.fill()

  // smoke
  for (let i = 0; i < 5; i += 1) {
    const phase = (time * 0.16 + i * 0.2) % 1
    const alpha = (1 - phase) * 0.2
    const radius = 12 + phase * 38
    ctx.beginPath()
    ctx.arc(x - 12 + Math.sin(i * 3.1 + time * 0.2) * 20 * phase, groundY - 176 - phase * 120, radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(72, 47, 58, ${alpha})`
    ctx.fill()
  }
  ctx.restore()
}

function buildJungle() {
  const wrap = 960
  const horizon = 344
  jungleCanvas = makeCanvas(wrap, 360)
  const jctx = jungleCanvas.getContext('2d')
  const trees = [
    { x: 24, s: 1.25, palm: true },
    { x: 138, s: 0.8, palm: false },
    { x: 286, s: 1.05, palm: true },
    { x: 418, s: 0.72, palm: false },
    { x: 544, s: 1.35, palm: true },
    { x: 684, s: 0.9, palm: true },
    { x: 816, s: 0.65, palm: false },
    { x: 912, s: 1.15, palm: true },
  ]

  for (const tree of trees) {
    const x = tree.x
    const s = tree.s
    if (tree.palm) {
      jctx.strokeStyle = '#2b2326'
      jctx.lineWidth = 7 * s
      jctx.lineCap = 'round'
      jctx.beginPath()
      jctx.moveTo(x, horizon + 18)
      jctx.quadraticCurveTo(x + 6 * s, horizon - 50 * s, x + 18 * s, horizon - 96 * s)
      jctx.stroke()
      jctx.fillStyle = '#2b2326'
      const topX = x + 18 * s
      const topY = horizon - 96 * s
      for (let i = 0; i < 6; i += 1) {
        const angle = -Math.PI * 0.9 + i * 0.52
        const length = (30 + (i % 3) * 13) * s
        jctx.beginPath()
        jctx.moveTo(topX, topY)
        jctx.quadraticCurveTo(
          topX + Math.cos(angle) * length * 0.55,
          topY + Math.sin(angle) * length * 0.38,
          topX + Math.cos(angle) * length,
          topY + Math.sin(angle) * length * 0.6 + 8 * s,
        )
        jctx.quadraticCurveTo(
          topX + Math.cos(angle) * length * 0.5,
          topY + Math.sin(angle) * length * 0.5 + 5,
          topX,
          topY + 2,
        )
        jctx.fill()
      }
    } else {
      jctx.fillStyle = '#2b2326'
      jctx.beginPath()
      jctx.ellipse(x, horizon - 58 * s, 48 * s, 28 * s, 0, 0, Math.PI * 2)
      jctx.ellipse(x - 32 * s, horizon - 40 * s, 34 * s, 20 * s, 0, 0, Math.PI * 2)
      jctx.ellipse(x + 33 * s, horizon - 42 * s, 32 * s, 19 * s, 0, 0, Math.PI * 2)
      jctx.fill()
      jctx.fillRect(x - 5 * s, horizon - 44 * s, 10 * s, 62 * s)
    }
  }

  const mist = jctx.createLinearGradient(0, 300, 0, 356)
  mist.addColorStop(0, 'rgba(255, 158, 102, 0)')
  mist.addColorStop(1, 'rgba(255, 173, 112, 0.2)')
  jctx.fillStyle = mist
  jctx.fillRect(0, 295, wrap, 65)
}

function drawJungle(ctx, camX) {
  if (!jungleCanvas) buildJungle()
  const wrap = 960
  const offset = -((camX * 0.36) % wrap)
  ctx.drawImage(jungleCanvas, Math.round(offset), 0)
  ctx.drawImage(jungleCanvas, Math.round(offset + wrap), 0)
  if (offset < -wrap + VIEW_W) ctx.drawImage(jungleCanvas, Math.round(offset + wrap * 2), 0)
}

function drawLandmarks(ctx, camX) {
  const landmarks = [
    { x: 420, kind: 'hut', scale: 1 },
    { x: 1980, kind: 'bones', scale: 1.15 },
    { x: 3160, kind: 'arch', scale: 0.95 },
    { x: 4520, kind: 'hut', scale: 1.2 },
    { x: 5680, kind: 'bones', scale: 1.3 },
  ]
  for (const landmark of landmarks) {
    const x = landmark.x - camX * 0.88
    if (x < -200 || x > VIEW_W + 200) continue
    const y = 342
    const s = landmark.scale
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.globalAlpha = 0.82
    if (landmark.kind === 'hut') {
      fillShape(ctx, [[-38, 0], [-24, -40], [24, -40], [38, 0]], '#3c2926', '#241614', 3)
      fillShape(ctx, [[-31, -38], [0, -76], [31, -38]], '#4a3029', '#241614', 3)
      fillShape(ctx, [[-10, 0], [-10, -22], [10, -22], [10, 0]], '#1f1211', '#1f1211', 1)
      ctx.strokeStyle = '#6c4a37'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-20, -8)
      ctx.lineTo(20, -8)
      ctx.stroke()
    } else if (landmark.kind === 'bones') {
      ctx.strokeStyle = '#d5bd95'
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-42, 0)
      ctx.quadraticCurveTo(-26, -48, 0, -54)
      ctx.quadraticCurveTo(26, -48, 42, 0)
      ctx.stroke()
      for (let i = -3; i <= 3; i += 1) {
        const px = i * 11
        const py = -54 + Math.abs(i) * 11
        ctx.beginPath()
        ctx.arc(px, py, 4.2, 0, Math.PI * 2)
        ctx.fillStyle = '#d5bd95'
        ctx.fill()
      }
      ctx.beginPath()
      ctx.arc(0, -66, 11, 0, Math.PI * 2)
      ctx.fillStyle = '#d5bd95'
      ctx.fill()
      ctx.fillStyle = '#3c2926'
      ctx.beginPath()
      ctx.arc(-4, -68, 2.5, 0, Math.PI * 2)
      ctx.arc(4, -68, 2.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // stone arch
      ctx.fillStyle = '#4a3230'
      ctx.beginPath()
      ctx.moveTo(-46, 0)
      ctx.lineTo(-40, -52)
      ctx.quadraticCurveTo(-36, -76, 0, -78)
      ctx.quadraticCurveTo(36, -76, 40, -52)
      ctx.lineTo(46, 0)
      ctx.lineTo(26, 0)
      ctx.lineTo(24, -50)
      ctx.quadraticCurveTo(20, -60, 0, -61)
      ctx.quadraticCurveTo(-20, -60, -24, -50)
      ctx.lineTo(-26, 0)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 145, 64, 0.16)'
      ctx.beginPath()
      ctx.ellipse(0, -30, 18, 27, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

function buildGroundBase() {
  const top = GROUND_TOP - 22
  groundCanvas = makeCanvas(VIEW_W, VIEW_H - top)
  const sctx = groundCanvas.getContext('2d')
  sctx.translate(0, -top)

  const ground = sctx.createLinearGradient(0, GROUND_TOP - 18, 0, VIEW_H)
  ground.addColorStop(0, '#7e4a33')
  ground.addColorStop(0.3, '#a5673f')
  ground.addColorStop(0.72, '#c18352')
  ground.addColorStop(1, '#8d573a')
  sctx.fillStyle = ground
  sctx.fillRect(0, GROUND_TOP - 22, VIEW_W, VIEW_H - GROUND_TOP + 22)

  // trampled path
  const pathGradient = sctx.createLinearGradient(0, 360, 0, 508)
  pathGradient.addColorStop(0, 'rgba(222, 165, 105, 0.18)')
  pathGradient.addColorStop(0.5, 'rgba(236, 184, 121, 0.28)')
  pathGradient.addColorStop(1, 'rgba(200, 140, 86, 0.15)')
  sctx.fillStyle = pathGradient
  sctx.beginPath()
  sctx.moveTo(0, 364)
  sctx.quadraticCurveTo(VIEW_W * 0.5, 352, VIEW_W, 368)
  sctx.lineTo(VIEW_W, 508)
  sctx.quadraticCurveTo(VIEW_W * 0.5, 520, 0, 505)
  sctx.closePath()
  sctx.fill()

  // darker dirt rim at the top
  const rim = sctx.createLinearGradient(0, GROUND_TOP - 26, 0, GROUND_TOP + 18)
  rim.addColorStop(0, 'rgba(41, 22, 20, 0.8)')
  rim.addColorStop(1, 'rgba(41, 22, 20, 0)')
  sctx.fillStyle = rim
  sctx.fillRect(0, GROUND_TOP - 26, VIEW_W, 46)
}

function drawGroundBase(ctx) {
  if (!groundCanvas) buildGroundBase()
  ctx.drawImage(groundCanvas, 0, GROUND_TOP - 22)
}

function paintGroundProp(ctx, x, y, seed, roll) {
  if (roll < 0.34) {
    // pebble / cracked rock
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(0.7 + hash(seed + 2) * 0.8, 0.55 + hash(seed + 3) * 0.45)
    fillShape(ctx, [[-8, 1], [-5, -5], [3, -6], [8, -1], [5, 4], [-3, 5]], '#7a4a34', 'rgba(52, 28, 22, 0.55)', 1.4)
    ctx.fillStyle = 'rgba(255, 206, 145, 0.2)'
    ctx.beginPath()
    ctx.ellipse(-2, -2, 4, 1.5, -0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  } else if (roll < 0.55) {
    // little bone
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(hash(seed + 7) * Math.PI)
    ctx.strokeStyle = 'rgba(232, 210, 170, 0.55)'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-7, 0)
    ctx.lineTo(7, 0)
    ctx.stroke()
    ctx.fillStyle = 'rgba(232, 210, 170, 0.55)'
    ctx.beginPath()
    ctx.arc(-7, -2, 2, 0, Math.PI * 2)
    ctx.arc(-7, 2, 2, 0, Math.PI * 2)
    ctx.arc(7, -2, 2, 0, Math.PI * 2)
    ctx.arc(7, 2, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  } else if (roll < 0.76) {
    // dry tuft
    ctx.save()
    ctx.translate(x, y)
    ctx.strokeStyle = 'rgba(88, 90, 47, 0.85)'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    for (let k = 0; k < 4; k += 1) {
      ctx.beginPath()
      ctx.moveTo(0, 2)
      ctx.quadraticCurveTo((k - 1.5) * 4, -5, (k - 1.5) * 8, -11 - hash(seed + k) * 5)
      ctx.stroke()
    }
    ctx.restore()
  } else {
    // footprints / cracks
    ctx.save()
    ctx.translate(x, y)
    ctx.strokeStyle = 'rgba(90, 52, 38, 0.45)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.ellipse(0, 0, 5, 2.6, -0.2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(10, 3, 1.6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

function buildGroundDetails() {
  const tile = 176
  const tiles = 8
  groundDetailCanvas = makeCanvas(tile * tiles, 190)
  const sctx = groundDetailCanvas.getContext('2d')
  for (let index = 0; index < tiles; index += 1) {
    const base = index * tile
    for (let j = 0; j < 4; j += 1) {
      const seed = index * 13.7 + j * 7.3
      const x = base + hash(seed) * tile
      const z = 0.06 + hash(seed + 4.2) * 0.9
      paintGroundProp(sctx, x, z * DEPTH + 8, seed, hash(seed + 9.4))
    }
  }
}

function drawGroundDetails(ctx, camX, time) {
  if (!groundDetailCanvas) buildGroundDetails()
  const width = 1408
  const offset = -((camX % width) + width) % width
  ctx.drawImage(groundDetailCanvas, Math.round(offset), 360)
  ctx.drawImage(groundDetailCanvas, Math.round(offset + width), 360)
  if (offset + width < VIEW_W) ctx.drawImage(groundDetailCanvas, Math.round(offset + width * 2), 360)

  // heat shimmer lines
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.strokeStyle = '#ffe0b0'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i += 1) {
    const y = 385 + i * 31
    const x = ((time * (8 + i * 3) + i * 230) % 1100) - 70
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + 34, y - 3, x + 70, y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawAmbientEmbers(ctx, camX, time) {
  ctx.save()
  for (let i = 0; i < 18; i += 1) {
    const speed = 4 + hash(i * 2.1) * 8
    const x = (hash(i * 5.7) * 1040 + time * speed * 0.4 - camX * 0.04) % 1040 - 40
    const y = 540 - ((time * (10 + hash(i) * 18) + hash(i + 3) * 560) % 570)
    const alpha = 0.16 + hash(i + 8) * 0.35
    ctx.fillStyle = `rgba(255, ${130 + Math.floor(hash(i + 2) * 70)}, 60, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, 0.9 + hash(i + 1) * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawBackground(ctx, camX, time) {
  sky(ctx, time)
  drawPterodactyls(ctx, camX, time)
  mountainRange(ctx, camX, 0.045, 330, '#77455a', 11, 150, 1240, 7)
  drawVolcano(ctx, camX, time)
  mountainRange(ctx, camX, 0.11, 338, '#5f3549', 31, 116, 980, 6)
  mountainRange(ctx, camX, 0.22, 348, '#47293a', 57, 74, 760, 5)
  drawJungle(ctx, camX, time)
  drawLandmarks(ctx, camX)
  drawGroundBase(ctx)
  drawGroundDetails(ctx, camX, time)
  drawAmbientEmbers(ctx, camX, time)
}

function buildForeground() {
  const tile = 280
  const tiles = 6
  const top = 470
  foregroundCanvas = makeCanvas(tile * tiles, VIEW_H - top)
  const sctx = foregroundCanvas.getContext('2d')
  sctx.fillStyle = 'rgba(37, 25, 24, 0.92)'
  for (let index = 0; index < tiles; index += 1) {
    const base = index * tile
    for (let j = 0; j < 2; j += 1) {
      const seed = index * 3.9 + j * 8.1
      const x = base + hash(seed) * tile
      const y = 524 + hash(seed + 2) * 18 - top
      for (let k = 0; k < 5; k += 1) {
        sctx.beginPath()
        sctx.moveTo(x + k * 6 - 12, y + 18)
        sctx.quadraticCurveTo(x + k * 6 - 12, y - 2, x + k * 6 - 18, y - 18 - hash(seed + k) * 20)
        sctx.lineTo(x + k * 6 - 6, y + 18)
        sctx.fill()
      }
    }
  }
}

export function drawForeground(ctx, camX) {
  if (!foregroundCanvas) buildForeground()
  const width = 1680
  const offset = -(((camX * 1.12) % width) + width) % width
  ctx.drawImage(foregroundCanvas, Math.round(offset), 470)
  ctx.drawImage(foregroundCanvas, Math.round(offset + width), 470)
}

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* ------------------------------------------------------------------ */

function hairShape(ctx, style, r, palette) {
  ctx.fillStyle = palette.hair
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'

  if (style === 'spiky') {
    ctx.beginPath()
    ctx.moveTo(-r * 0.95, -r * 0.1)
    ctx.lineTo(-r * 1.3, -r * 0.9)
    ctx.lineTo(-r * 0.7, -r * 0.85)
    ctx.lineTo(-r * 0.82, -r * 1.55)
    ctx.lineTo(-r * 0.18, -r * 1.02)
    ctx.lineTo(0, -r * 1.72)
    ctx.lineTo(r * 0.5, -r * 1.08)
    ctx.lineTo(r * 1.06, -r * 1.36)
    ctx.lineTo(r * 0.98, -r * 0.52)
    ctx.lineTo(r * 1.22, -r * 0.18)
    ctx.lineTo(r * 0.72, -r * 0.42)
    ctx.lineTo(r * 0.72, r * 0.12)
    ctx.lineTo(r * 0.12, -r * 0.35)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (style === 'topknot') {
    ctx.beginPath()
    ctx.moveTo(-r, -r * 0.12)
    ctx.quadraticCurveTo(-r * 0.85, -r * 1.2, 0, -r * 1.15)
    ctx.quadraticCurveTo(r * 0.8, -r * 1.12, r * 0.72, -r * 0.2)
    ctx.quadraticCurveTo(r * 0.6, -r * 0.7, 0, -r * 0.7)
    ctx.quadraticCurveTo(-r * 0.62, -r * 0.72, -r, -r * 0.12)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(-r * 0.08, -r * 1.34, r * 0.34, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = palette.paint
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(-r * 0.4, -r * 1.12)
    ctx.lineTo(r * 0.26, -r * 1.2)
    ctx.stroke()
  } else if (style === 'bald') {
    ctx.beginPath()
    ctx.arc(-r * 0.1, -r * 0.24, r * 0.98, Math.PI * 1.02, Math.PI * 1.95)
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.28, -r * 0.62, r * 0.24, r * 0.1, -0.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (style === 'crest') {
    ctx.beginPath()
    ctx.moveTo(-r * 0.85, -r * 0.72)
    ctx.lineTo(-r * 0.5, -r * 1.9)
    ctx.lineTo(-r * 0.05, -r * 1.14)
    ctx.lineTo(r * 0.22, -r * 1.72)
    ctx.lineTo(r * 0.52, -r * 1.02)
    ctx.lineTo(r * 0.9, -r * 0.66)
    ctx.quadraticCurveTo(r * 0.4, -r * 0.42, -r * 0.1, -r * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = palette.hairDark
    ctx.beginPath()
    ctx.ellipse(-r * 0.2, -r * 0.55, r * 0.55, r * 0.24, 0.05, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawHead(ctx, cfg, palette, head, r, detail = {}) {
  const { tilt = 0, mouth = 0, blink = false, boss = false } = detail
  ctx.save()
  ctx.translate(head.x, head.y)
  ctx.rotate(tilt)

  // ear
  ctx.beginPath()
  ctx.ellipse(-r * 0.9, r * 0.1, r * 0.24, r * 0.34, 0.1, 0, Math.PI * 2)
  ctx.fillStyle = palette.skinDark
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.4
  ctx.stroke()

  hairShape(ctx, cfg.hair, r, palette)

  // head
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 1.02, r * 1.12, -0.05, 0, Math.PI * 2)
  ctx.fillStyle = palette.skin
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = INK
  ctx.stroke()

  // jaw shadow
  ctx.beginPath()
  ctx.ellipse(r * 0.15, r * 0.58, r * 0.62, r * 0.36, 0.08, 0, Math.PI * 2)
  ctx.fillStyle = palette.skinDark
  ctx.globalAlpha = 0.28
  ctx.fill()
  ctx.globalAlpha = 1

  // brow ridge
  ctx.strokeStyle = INK
  ctx.lineWidth = 3.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(r * 0.06, -r * 0.35)
  ctx.lineTo(r * 0.75, -r * 0.24)
  ctx.stroke()

  // eye
  ctx.beginPath()
  ctx.ellipse(r * 0.38, -r * 0.05, r * 0.24, blink ? r * 0.05 : r * 0.18, 0, 0, Math.PI * 2)
  ctx.fillStyle = palette.eye
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.6
  ctx.stroke()
  if (!blink) {
    ctx.beginPath()
    ctx.arc(r * 0.44, -r * 0.04, r * 0.1, 0, Math.PI * 2)
    ctx.fillStyle = '#24130d'
    ctx.fill()
  }

  // nose
  ctx.beginPath()
  ctx.moveTo(r * 0.62, r * 0.05)
  ctx.lineTo(r * 1.12, r * 0.29)
  ctx.lineTo(r * 0.7, r * 0.38)
  ctx.closePath()
  ctx.fillStyle = palette.skin
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.2
  ctx.stroke()

  // mouth
  if (mouth > 0.4) {
    ctx.beginPath()
    ctx.ellipse(r * 0.4, r * 0.62, r * 0.3, r * 0.18 + mouth * r * 0.12, 0.08, 0, Math.PI * 2)
    ctx.fillStyle = '#3a1611'
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.8
    ctx.stroke()
  } else {
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(r * 0.18, r * 0.62)
    ctx.quadraticCurveTo(r * 0.44, r * 0.7, r * 0.72, r * 0.58)
    ctx.stroke()
  }

  // war paint
  if (cfg.warPaint) {
    ctx.strokeStyle = palette.paint
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(r * 0.18, -r * 0.36)
    ctx.lineTo(r * 0.5, r * 0.42)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(r * 0.36, -r * 0.32)
    ctx.lineTo(r * 0.66, r * 0.32)
    ctx.stroke()
  }

  // beard
  if (cfg.beard) {
    ctx.beginPath()
    ctx.moveTo(-r * 0.45, r * 0.5)
    ctx.quadraticCurveTo(-r * 0.6, r * 1.5, r * 0.12, r * 1.42)
    ctx.quadraticCurveTo(r * 0.82, r * 1.3, r * 0.82, r * 0.5)
    ctx.quadraticCurveTo(r * 0.4, r * 0.92, -r * 0.45, r * 0.5)
    ctx.fillStyle = palette.hairDark
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.4
    ctx.stroke()
  }

  if (boss) {
    // mammoth skull helmet
    ctx.beginPath()
    ctx.ellipse(-r * 0.04, -r * 0.74, r * 1.12, r * 0.72, -0.08, Math.PI, Math.PI * 2)
    ctx.lineTo(r * 0.96, -r * 0.52)
    ctx.quadraticCurveTo(r * 0.4, -r * 0.28, -r * 0.3, -r * 0.6)
    ctx.closePath()
    ctx.fillStyle = '#e6d6b4'
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 3
    ctx.stroke()

    // skull eye sockets
    ctx.beginPath()
    ctx.ellipse(-r * 0.32, -r * 0.8, r * 0.17, r * 0.22, -0.2, 0, Math.PI * 2)
    ctx.ellipse(r * 0.34, -r * 0.82, r * 0.17, r * 0.22, 0.2, 0, Math.PI * 2)
    ctx.fillStyle = '#2a1b16'
    ctx.fill()

    // tusks
    ctx.strokeStyle = '#efe3c6'
    ctx.lineWidth = r * 0.3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-r * 0.75, -r * 0.6)
    ctx.quadraticCurveTo(-r * 1.5, r * 0.1, -r * 0.8, r * 0.8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(r * 0.8, -r * 0.6)
    ctx.quadraticCurveTo(r * 1.42, r * 0.04, r * 0.9, r * 0.66)
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-r * 0.75, -r * 0.6)
    ctx.quadraticCurveTo(-r * 1.5, r * 0.1, -r * 0.8, r * 0.8)
    ctx.stroke()
  }

  ctx.restore()
}

function drawClub(ctx, cfg, palette, hand, angle, scale = 1) {
  if (!cfg.club) return
  const length = 46 * cfg.club * scale
  ctx.save()
  ctx.translate(hand.x, hand.y)
  ctx.rotate(angle)
  ctx.scale(cfg.club, cfg.club)

  // handle
  ctx.beginPath()
  ctx.moveTo(-9, -3.4)
  ctx.lineTo(length * 0.5, -4.4)
  ctx.lineTo(length * 0.5, 4.4)
  ctx.lineTo(-9, 3.4)
  ctx.closePath()
  ctx.fillStyle = palette.club
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = INK
  ctx.stroke()

  // head
  ctx.beginPath()
  ctx.moveTo(length * 0.42, -5)
  ctx.quadraticCurveTo(length * 0.72, -13, length * 0.94, -10)
  ctx.quadraticCurveTo(length * 1.12, -4, length * 1.05, 2)
  ctx.quadraticCurveTo(length * 0.94, 12, length * 0.66, 9)
  ctx.quadraticCurveTo(length * 0.44, 6, length * 0.42, 5)
  ctx.closePath()
  ctx.fillStyle = palette.club
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.stroke()

  // wood grain + knots
  ctx.strokeStyle = palette.clubDark
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(length * 0.15, -2)
  ctx.lineTo(length * 0.4, -2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(length * 0.63, 0, 3.2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(length * 0.82, -2, 2.2, 0, Math.PI * 2)
  ctx.stroke()

  // bone studs
  ctx.fillStyle = '#e6d6b4'
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.4
  for (let i = 0; i < 3; i += 1) {
    const bx = length * (0.62 + i * 0.12)
    const by = -8 - (i % 2) * 2
    ctx.beginPath()
    ctx.moveTo(bx - 3, by)
    ctx.lineTo(bx, by - 6)
    ctx.lineTo(bx + 3, by)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

function drawCharacterPose(ctx, ent, cfg, palette, time, opts) {
  const state = ent.state
  const t = ent.animT
  const p = clamp(ent.attackP ?? 0, 0, 1)
  const isBoss = cfg.boss
  let bob = Math.sin(time * 2.4 + (ent.seed || 0)) * 1.2
  let crouch = 0
  let lean = 0
  let headTilt = 0
  let mouth = 0
  let legF = { x: 5, y: 0 }
  let legB = { x: -6, y: 0 }
  let handF = { x: 12, y: -57 }
  let handB = { x: -12, y: -52 }
  let clubAngle = -2.18
  let flash = false

  if (state === 'walk') {
    const ph = t * 10
    const swing = Math.sin(ph)
    const liftF = Math.max(0, Math.sin(ph))
    const liftB = Math.max(0, -Math.sin(ph))
    legF = { x: 6 + swing * 11, y: -liftF * 7 }
    legB = { x: -6 - swing * 11, y: -liftB * 7 }
    bob = Math.abs(Math.cos(ph)) * 2.1
    lean = 0.06
    handF = { x: 10 - swing * 5, y: -56 + bob * 0.4 }
    handB = { x: -10 + swing * 6, y: -51 + bob * 0.4 }
    clubAngle = -2.1 + swing * 0.04
  } else if (state === 'idle' || state === 'spawn') {
    bob = Math.sin(time * 2.1 + (ent.seed || 0)) * 1.4
    handF = { x: 12, y: -57 + bob }
    handB = { x: -12, y: -52 + bob }
    if (state === 'spawn') {
      crouch = 4
      lean = 0.14
    }
  } else if (state === 'attack') {
    const combo = ent.comboStep || 0
    if (combo === 0) {
      if (p < 0.42) {
        const k = smooth(clamp(p / 0.42, 0, 1))
        handF = { x: lerp(12, 2, k), y: lerp(-57, -77, k) }
        clubAngle = lerp(-2.18, -2.95, k)
        lean = -0.09 * k
      } else if (p < 0.64) {
        const k = easeOut(clamp((p - 0.42) / 0.22, 0, 1))
        handF = { x: lerp(2, 28, k), y: lerp(-77, -45, k) }
        clubAngle = lerp(-2.95, 0.62, k)
        lean = lerp(-0.09, 0.24, k)
        crouch = 2 * k
      } else {
        const k = smooth(clamp((p - 0.64) / 0.36, 0, 1))
        handF = { x: lerp(28, 12, k), y: lerp(-45, -57, k) }
        clubAngle = lerp(0.62, -2.18, k)
        lean = lerp(0.24, 0, k)
        crouch = 2 * (1 - k)
      }
    } else if (combo === 1) {
      if (p < 0.36) {
        const k = smooth(clamp(p / 0.36, 0, 1))
        handF = { x: lerp(12, -3, k), y: lerp(-57, -66, k) }
        clubAngle = lerp(-2.18, -3.05, k)
        lean = -0.13 * k
      } else if (p < 0.58) {
        const k = easeOut(clamp((p - 0.36) / 0.22, 0, 1))
        handF = { x: lerp(-3, 31, k), y: lerp(-66, -56, k) }
        clubAngle = lerp(-3.05, -0.02, k)
        lean = lerp(-0.13, 0.2, k)
        legF = { x: 10, y: 0 }
        legB = { x: -10, y: 0 }
      } else {
        const k = smooth(clamp((p - 0.58) / 0.42, 0, 1))
        handF = { x: lerp(31, 12, k), y: lerp(-56, -57, k) }
        clubAngle = lerp(-0.02, -2.18, k)
        lean = lerp(0.2, 0, k)
      }
    } else {
      if (p < 0.46) {
        const k = smooth(clamp(p / 0.46, 0, 1))
        handF = { x: lerp(12, 4, k), y: lerp(-57, -82, k) }
        clubAngle = lerp(-2.18, -2.7, k)
        lean = -0.16 * k
        crouch = 3 * k
        legF = { x: 9, y: 0 }
        legB = { x: -9, y: 0 }
      } else if (p < 0.64) {
        const k = easeOut(clamp((p - 0.46) / 0.18, 0, 1))
        handF = { x: lerp(4, 34, k), y: lerp(-82, -34, k) }
        clubAngle = lerp(-2.7, 1.05, k)
        lean = lerp(-0.16, 0.36, k)
        crouch = lerp(3, 7, k)
      } else {
        const k = smooth(clamp((p - 0.64) / 0.36, 0, 1))
        handF = { x: lerp(34, 12, k), y: lerp(-34, -57, k) }
        clubAngle = lerp(1.05, -2.18, k)
        lean = lerp(0.36, 0, k)
        crouch = lerp(7, 0, k)
      }
    }
  } else if (state === 'jump' || (ent.jumpY || 0) > 1) {
    bob = 0
    legF = { x: 10, y: -13 }
    legB = { x: -9, y: -7 }
    handF = { x: 16, y: -66 }
    handB = { x: -20, y: -62 }
    clubAngle = -1.95
    lean = 0.08
    crouch = 2
  } else if (state === 'hurt') {
    const k = clamp(ent.stateT / 0.24, 0, 1)
    lean = -0.28 * Math.sin(k * Math.PI)
    headTilt = -0.18
    mouth = 0.7
    legF = { x: 3, y: 0 }
    legB = { x: -13, y: 0 }
    handF = { x: 1, y: -52 }
    handB = { x: -20, y: -60 }
    clubAngle = -2.4
  } else if (state === 'special' || state === 'roar') {
    const k = Math.sin(clamp(ent.stateT / 0.5, 0, 1) * Math.PI)
    lean = -0.16 * k
    headTilt = -0.12 * k
    mouth = 1
    legF = { x: 12, y: 0 }
    legB = { x: -13, y: 0 }
    handF = { x: 24, y: -72 - k * 6 }
    handB = { x: -24, y: -70 - k * 6 }
    clubAngle = -1.35
    bob = -k * 2
  } else if (state === 'charge') {
    lean = 0.4
    legF = { x: 14, y: 0 }
    legB = { x: -16, y: -4 }
    handF = { x: 8, y: -60 }
    handB = { x: -18, y: -56 }
    clubAngle = -2.7
    mouth = 0.6
  } else if (state === 'swingWind' || state === 'slamWind') {
    lean = -0.2
    crouch = 4
    handF = { x: 3, y: -84 }
    handB = { x: -18, y: -70 }
    clubAngle = -2.8
    mouth = 0.5
    legF = { x: 11, y: 0 }
    legB = { x: -13, y: 0 }
  } else if (state === 'swingHit') {
    lean = 0.34
    crouch = 4
    handF = { x: 36, y: -44 }
    handB = { x: -8, y: -50 }
    clubAngle = 0.58
    mouth = 0.8
    legF = { x: 14, y: 0 }
    legB = { x: -15, y: 0 }
  } else if (state === 'slamLand') {
    lean = 0.48
    crouch = 16
    handF = { x: 34, y: -20 }
    handB = { x: -16, y: -44 }
    clubAngle = 1.1
    mouth = 1
    legF = { x: 16, y: 0 }
    legB = { x: -18, y: 0 }
  } else if (state === 'roarBoss') {
    lean = -0.2
    headTilt = -0.18
    mouth = 1
    legF = { x: 15, y: 0 }
    legB = { x: -16, y: 0 }
    handF = { x: 28, y: -75 }
    handB = { x: -27, y: -74 }
    clubAngle = -1.2
    bob = -3
  }

  if (ent.hitFlash > 0) flash = true

  const bulk = cfg.bulk
  const hip = { x: 0, y: -38 + crouch }
  const shoulder = { x: lean * 22, y: -63 + crouch + bob }
  const head = { x: shoulder.x + 2 + lean * 9, y: shoulder.y - cfg.headR * 1.26 }

  const drawLeg = (foot, shade) => {
    const knee = {
      x: (hip.x + foot.x) / 2 + 5 + (foot.x - hip.x) * 0.12,
      y: (hip.y + foot.y) / 2 + 3,
    }
    ctx.beginPath()
    ctx.moveTo(hip.x, hip.y)
    ctx.quadraticCurveTo(knee.x, knee.y, foot.x, foot.y - 3)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 12.5 * bulk + 5
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = 12.5 * bulk
    ctx.strokeStyle = shade ? palette.skinDark : palette.skin
    ctx.stroke()

    // foot
    ctx.beginPath()
    ctx.ellipse(foot.x + 4, foot.y - 2, 9 * bulk, 5.2 * bulk, -0.08, 0, Math.PI * 2)
    ctx.fillStyle = shade ? palette.skinDark : palette.skin
    ctx.fill()
    ctx.lineWidth = 2.6
    ctx.strokeStyle = INK
    ctx.stroke()
  }

  const drawArm = (from, to, bend, shade) => {
    const mx = (from.x + to.x) / 2 + bend
    const my = (from.y + to.y) / 2 + 4
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(mx, my, to.x, to.y)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 9.5 * bulk + 5
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = 9.5 * bulk
    ctx.strokeStyle = shade ? palette.skinDark : palette.skin
    ctx.stroke()

    // hand
    ctx.beginPath()
    ctx.arc(to.x, to.y, 6.2 * bulk, 0, Math.PI * 2)
    ctx.fillStyle = shade ? palette.skinDark : palette.skin
    ctx.fill()
    ctx.lineWidth = 2.4
    ctx.strokeStyle = INK
    ctx.stroke()
  }

  const torsoTop = shoulder.y
  const torsoBottom = hip.y + 4
  const halfW = 12.5 * bulk

  // back arm behind body
  drawArm({ x: shoulder.x - 3, y: shoulder.y + 5 }, handB, -6 * (handB.x > 0 ? 1 : -1), true)
  // back leg
  drawLeg(legB, true)

  // torso
  const shirt = cfg.shirt
  ctx.beginPath()
  ctx.moveTo(shoulder.x - halfW, torsoTop)
  ctx.quadraticCurveTo(shoulder.x - halfW * 1.25, (torsoTop + torsoBottom) / 2, hip.x - halfW * 0.86, torsoBottom)
  ctx.lineTo(hip.x + halfW * 0.86, torsoBottom)
  ctx.quadraticCurveTo(shoulder.x + halfW * 1.24, (torsoTop + torsoBottom) / 2, shoulder.x + halfW, torsoTop)
  ctx.closePath()
  ctx.fillStyle = shirt ? palette.cloth : palette.skin
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = INK
  ctx.stroke()

  if (shirt) {
    // fur trim / collar
    ctx.beginPath()
    ctx.moveTo(shoulder.x - halfW - 2, torsoTop - 3)
    for (let i = 0; i <= 6; i += 1) {
      const x = shoulder.x - halfW - 2 + (i / 6) * (halfW * 2 + 4)
      const y = torsoTop - 2 + (i % 2 === 0 ? -6 : 2)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(shoulder.x + halfW + 2, torsoTop + 8)
    ctx.lineTo(shoulder.x - halfW - 2, torsoTop + 8)
    ctx.closePath()
    ctx.fillStyle = palette.fur
    ctx.fill()
    ctx.lineWidth = 2.4
    ctx.strokeStyle = INK
    ctx.stroke()

    // ragged hem
    ctx.beginPath()
    ctx.moveTo(hip.x - halfW * 0.86, torsoBottom)
    for (let i = 0; i <= 4; i += 1) {
      const x = hip.x - halfW * 0.86 + (i / 4) * halfW * 1.72
      ctx.lineTo(x, torsoBottom + (i % 2 === 0 ? 5 : 0))
    }
    ctx.lineTo(hip.x + halfW * 0.86, torsoBottom)
    ctx.fillStyle = palette.clothDark
    ctx.globalAlpha = 0.5
    ctx.fill()
    ctx.globalAlpha = 1
  } else {
    // bare chest with a strap
    ctx.strokeStyle = palette.fur
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(shoulder.x - halfW, torsoTop + 3)
    ctx.lineTo(hip.x + halfW, torsoBottom - 3)
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(shoulder.x - halfW, torsoTop + 3)
    ctx.lineTo(hip.x + halfW, torsoBottom - 3)
    ctx.stroke()
  }

  if (cfg.necklace) {
    ctx.strokeStyle = '#d9c7a0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(shoulder.x - halfW * 0.7, torsoTop + 3)
    ctx.quadraticCurveTo(shoulder.x, torsoTop + 18, shoulder.x + halfW * 0.7, torsoTop + 4)
    ctx.stroke()
    for (let i = 0; i < 5; i += 1) {
      const angle = Math.PI * (0.2 + i * 0.15)
      const bx = shoulder.x + Math.cos(angle) * halfW * 0.7
      const by = torsoTop + 8 + Math.sin(angle) * 8
      ctx.beginPath()
      ctx.arc(bx, by, 2.4, 0, Math.PI * 2)
      ctx.fillStyle = '#efe0bd'
      ctx.fill()
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
  }

  // shoulder tufts
  if (shirt && !isBoss) {
    ctx.beginPath()
    ctx.arc(shoulder.x + halfW * 0.8, torsoTop + 3, 7 * bulk, 0, Math.PI * 2)
    ctx.fillStyle = palette.fur
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.2
    ctx.stroke()
  }

  // front leg
  drawLeg(legF, false)

  if (isBoss) {
    // fur cape behind
    ctx.beginPath()
    ctx.moveTo(shoulder.x - halfW * 0.8, torsoTop + 2)
    ctx.quadraticCurveTo(shoulder.x - halfW * 2.2, torsoTop + 30, shoulder.x - halfW * 1.6, torsoBottom + 10)
    ctx.lineTo(shoulder.x - halfW * 0.6, torsoBottom - 4)
    ctx.closePath()
    ctx.fillStyle = palette.clothDark
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.5
    ctx.stroke()
  }

  // head
  drawHead(ctx, cfg, palette, head, cfg.headR, {
    tilt: headTilt + lean * 0.3,
    mouth,
    boss: isBoss,
    blink: Math.sin(time * 1.7 + (ent.seed || 0)) > 0.985,
  })

  // front arm + club
  drawArm({ x: shoulder.x + 4, y: shoulder.y + 5 }, handF, 7 * (handF.x > shoulder.x ? 1 : -1), false)
  drawClub(ctx, cfg, palette, handF, clubAngle, 1)

  // little sweat/blood? skipped
  if (flash) return
}

export function drawCharacter(ctx, ent, cameraX, time) {
  const cfg = KIND[ent.kind] || KIND.grunt
  const palette = ent.palette || PALETTES[ent.kind] || PALETTES.grunt
  const screenX = ent.x - cameraX
  if (screenX < -150 || screenX > VIEW_W + 150) return

  const jumpY = ent.jumpY || 0
  const groundY = GROUND_TOP + clamp(ent.z, 0, 1) * DEPTH
  const scale = (0.9 + clamp(ent.z, 0, 1) * 0.16) * (ent.scale || 1)
  const alpha = ent.alpha ?? 1
  const flash = (ent.hitFlash || 0) > 0

  // shadow
  const shadowScale = 1 - clamp(jumpY / 160, 0, 0.55)
  ctx.save()
  ctx.globalAlpha = 0.3 * alpha * shadowScale
  ctx.fillStyle = '#2a1511'
  ctx.beginPath()
  ctx.ellipse(screenX, groundY + 2, 30 * scale * shadowScale, 8 * scale * shadowScale, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screenX, groundY - jumpY)
  ctx.scale(ent.facing * scale, scale)

  let lying = 0
  if (ent.state === 'down' || ent.state === 'dying') {
    lying = clamp(ent.downP ?? (ent.stateT / 0.45), 0, 1)
    lying = smooth(lying)
    ctx.translate(0, -9 * lying)
    ctx.rotate(-1.35 * lying)
  }

  if (flash) ctx.filter = 'brightness(2.3) saturate(0.75)'
  drawCharacterPose(ctx, ent, cfg, palette, time, {})

  // small hp bar for tough enemies
  if (!flash && ent.hp < ent.maxHp && ent.hp > 0 && ent.kind !== 'boss' && ent.kind !== 'player') {
    ctx.filter = 'none'
    const width = 34 * (cfg.bulk > 1.1 ? 1.15 : 1)
    const ratio = clamp(ent.hp / ent.maxHp, 0, 1)
    const barY = -108 * (cfg.bulk > 1.1 ? 1.05 : 1)
    ctx.save()
    ctx.scale(ent.facing, 1)
    ctx.fillStyle = 'rgba(22, 11, 8, 0.72)'
    roundedRect(ctx, -width / 2 - 1, barY - 1, width + 2, 5, 2)
    ctx.fill()
    ctx.fillStyle = ratio > 0.35 ? '#e25935' : '#ffb03e'
    roundedRect(ctx, -width / 2, barY, width * ratio, 3, 1.5)
    ctx.fill()
    ctx.restore()
  }

  ctx.restore()
}

export function drawMeat(ctx, pickup, cameraX, time) {
  const x = pickup.x - cameraX
  const y = GROUND_TOP + pickup.z * DEPTH - 16 - Math.sin(time * 3 + pickup.seed) * 4
  if (x < -40 || x > VIEW_W + 40) return

  ctx.save()
  ctx.globalAlpha = 0.26
  ctx.fillStyle = '#2a1511'
  ctx.beginPath()
  ctx.ellipse(x, GROUND_TOP + pickup.z * DEPTH + 2, 18, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.3)
  // bone
  ctx.beginPath()
  ctx.moveTo(-2, -4)
  ctx.lineTo(-18, 6)
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.strokeStyle = '#f0e1bd'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(-20, 2, 4.4, 0, Math.PI * 2)
  ctx.arc(-18, 8, 4.4, 0, Math.PI * 2)
  ctx.fillStyle = '#f0e1bd'
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.stroke()
  // meat
  ctx.beginPath()
  ctx.ellipse(6, 0, 17, 13, 0.35, 0, Math.PI * 2)
  ctx.fillStyle = '#b64b2e'
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(3, -2, 6, 4, 0.4, 0, Math.PI * 2)
  ctx.fillStyle = '#e08056'
  ctx.fill()
  ctx.restore()

  // sparkle
  const alpha = 0.4 + Math.sin(time * 5 + pickup.seed) * 0.3
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#ffe6a0'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 16, y - 22)
  ctx.lineTo(x + 16, y - 12)
  ctx.moveTo(x + 11, y - 17)
  ctx.lineTo(x + 21, y - 17)
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

function drawSkull(ctx, x, y, size, color = BONE) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.strokeStyle = 'rgba(27, 13, 9, 0.9)'
  ctx.lineWidth = Math.max(1, size * 0.09)
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.42, size * 0.38, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(27, 13, 9, 0.85)'
  ctx.beginPath()
  ctx.ellipse(-size * 0.16, -size * 0.03, size * 0.12, size * 0.14, 0, 0, Math.PI * 2)
  ctx.ellipse(size * 0.16, -size * 0.03, size * 0.12, size * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(-size * 0.2, size * 0.26, size * 0.4, size * 0.14)
  ctx.strokeStyle = 'rgba(27, 13, 9, 0.8)'
  ctx.lineWidth = Math.max(1, size * 0.05)
  ctx.beginPath()
  ctx.moveTo(-size * 0.08, size * 0.27)
  ctx.lineTo(-size * 0.08, size * 0.4)
  ctx.moveTo(size * 0.08, size * 0.27)
  ctx.lineTo(size * 0.08, size * 0.4)
  ctx.stroke()
  ctx.restore()
}

function drawHealthPanel(ctx, game, time) {
  const player = game.player
  const x = 22
  const y = 20
  const width = 318
  const height = 82

  ctx.save()
  ctx.fillStyle = 'rgba(24, 12, 9, 0.74)'
  roundedRect(ctx, x, y, width, height, 13)
  ctx.fill()
  ctx.strokeStyle = 'rgba(243, 223, 182, 0.24)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // portrait
  const px = x + 31
  const py = y + 40
  ctx.beginPath()
  ctx.arc(px, py, 25, 0, Math.PI * 2)
  ctx.fillStyle = '#4e2f22'
  ctx.fill()
  ctx.strokeStyle = '#d8bd8f'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.save()
  ctx.beginPath()
  ctx.arc(px, py, 22, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = PALETTES.player.skin
  ctx.fillRect(px - 24, py - 24, 48, 48)
  // hair
  ctx.fillStyle = PALETTES.player.hair
  ctx.beginPath()
  ctx.moveTo(px - 24, py - 5)
  ctx.lineTo(px - 19, py - 22)
  ctx.lineTo(px - 7, py - 15)
  ctx.lineTo(px - 2, py - 27)
  ctx.lineTo(px + 8, py - 14)
  ctx.lineTo(px + 19, py - 20)
  ctx.lineTo(px + 23, py - 4)
  ctx.quadraticCurveTo(px + 6, py - 12, px - 24, py - 5)
  ctx.fill()
  // face
  ctx.fillStyle = PALETTES.player.skin
  ctx.beginPath()
  ctx.ellipse(px + 2, py + 3, 17, 18, 0, 0, Math.PI * 2)
  ctx.fill()
  // eye
  ctx.fillStyle = '#fff7e2'
  ctx.beginPath()
  ctx.ellipse(px + 7, py + 1, 4.6, 3.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#24130d'
  ctx.beginPath()
  ctx.arc(px + 8.5, py + 1, 2.1, 0, Math.PI * 2)
  ctx.fill()
  // brow + mouth
  ctx.strokeStyle = '#26120c'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(px + 2, py - 4)
  ctx.lineTo(px + 12, py - 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(px + 2, py + 12)
  ctx.quadraticCurveTo(px + 9, py + 15, px + 14, py + 10)
  ctx.stroke()
  ctx.restore()

  // level badge?
  ctx.beginPath()
  ctx.arc(px + 20, py + 20, 9, 0, Math.PI * 2)
  ctx.fillStyle = '#ffcf4d'
  ctx.fill()
  ctx.strokeStyle = '#1c0e0b'
  ctx.lineWidth = 2
  ctx.stroke()
  bodyText(ctx, '1', px + 20, py + 21, 12, '#2a130b', { align: 'center', weight: 900 })

  // name + score
  displayText(ctx, 'KRUNK', x + 66, y + 20, 24, BONE, { align: 'left', strokeWidth: 4, spacing: 1 })

  // health bar
  const barX = x + 66
  const barY = y + 31
  const barW = 232
  const barH = 18
  const ratio = clamp(player.hp / player.maxHp, 0, 1)
  const ghost = clamp((player.hpGhost ?? player.hp) / player.maxHp, 0, 1)

  ctx.fillStyle = 'rgba(12, 6, 5, 0.82)'
  roundedRect(ctx, barX, barY, barW, barH, 5)
  ctx.fill()
  ctx.strokeStyle = 'rgba(243, 223, 182, 0.55)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  if (ghost > ratio) {
    ctx.fillStyle = 'rgba(255, 238, 205, 0.55)'
    roundedRect(ctx, barX + 3, barY + 3, (barW - 6) * ghost, barH - 6, 3)
    ctx.fill()
  }

  const healthGradient = ctx.createLinearGradient(barX, 0, barX + barW, 0)
  if (ratio > 0.55) {
    healthGradient.addColorStop(0, '#e5512f')
    healthGradient.addColorStop(0.6, '#ff8b3d')
    healthGradient.addColorStop(1, '#ffc248')
  } else if (ratio > 0.25) {
    healthGradient.addColorStop(0, '#d8402a')
    healthGradient.addColorStop(1, '#ff7937')
  } else {
    healthGradient.addColorStop(0, '#a9211c')
    healthGradient.addColorStop(1, '#e34527')
  }
  ctx.fillStyle = healthGradient
  roundedRect(ctx, barX + 3, barY + 3, Math.max(0, (barW - 6) * ratio), barH - 6, 3)
  ctx.fill()

  // notches
  ctx.strokeStyle = 'rgba(27, 13, 9, 0.26)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i += 1) {
    const nx = barX + 3 + ((barW - 6) / 4) * i
    ctx.beginPath()
    ctx.moveTo(nx, barY + 3)
    ctx.lineTo(nx, barY + barH - 3)
    ctx.stroke()
  }
  // shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  roundedRect(ctx, barX + 4, barY + 4, Math.max(0, (barW - 8) * ratio), 3, 1.5)
  ctx.fill()

  // lives
  for (let i = 0; i < 3; i += 1) {
    drawSkull(ctx, barX + 8 + i * 18, y + 64, 14, i < player.lives ? BONE : 'rgba(90, 63, 47, 0.55)')
  }

  // rage bar
  const rageX = barX + 68
  const rageY = y + 59
  const rageW = 164
  const rageH = 9
  const rage = clamp(player.special / 100, 0, 1)
  ctx.fillStyle = 'rgba(12, 6, 5, 0.8)'
  roundedRect(ctx, rageX, rageY, rageW, rageH, 4)
  ctx.fill()
  ctx.strokeStyle = 'rgba(243, 223, 182, 0.35)'
  ctx.lineWidth = 1
  ctx.stroke()
  const rageGradient = ctx.createLinearGradient(rageX, 0, rageX + rageW, 0)
  rageGradient.addColorStop(0, '#a3691d')
  rageGradient.addColorStop(0.5, '#ffc248')
  rageGradient.addColorStop(1, '#ffe9a4')
  ctx.fillStyle = rageGradient
  roundedRect(ctx, rageX + 2, rageY + 2, (rageW - 4) * rage, rageH - 4, 2)
  ctx.fill()
  if (rage >= 1) {
    const pulse = 0.55 + Math.sin(time * 8) * 0.35
    ctx.globalAlpha = pulse
    ctx.strokeStyle = '#ffe9a4'
    ctx.lineWidth = 2
    roundedRect(ctx, rageX - 2, rageY - 2, rageW + 4, rageH + 4, 5)
    ctx.stroke()
    ctx.globalAlpha = 1
    bodyText(ctx, 'RAGE!', rageX + rageW + 8, rageY + 5, 9, '#ffcf4d', { spacing: 0.5 })
  } else {
    bodyText(ctx, 'RAGE', rageX + rageW + 8, rageY + 5, 8, '#a98a6b', { spacing: 0.8 })
  }

  // run hint at first moments
  if (game.time < 8 && game.state === 'playing') {
    const alpha = clamp((8 - game.time) / 2, 0, 1)
    bodyText(ctx, 'J = BONK · K = JUMP · L = RAGE', x, y + height + 16, 10, '#e6c79a', { alpha, spacing: 1 })
  }
  ctx.restore()
}

function drawScorePanel(ctx, game, time) {
  const x = 938
  const y = 26
  ctx.save()
  ctx.textAlign = 'right'
  bodyText(ctx, 'SCORE', x, y, 10, '#c39a6d', { align: 'right', spacing: 2.4 })
  displayText(ctx, String(Math.floor(game.score)).padStart(6, '0'), x, y + 28, 32, BONE, {
    align: 'right',
    strokeWidth: 5,
    spacing: 1,
  })
  bodyText(ctx, `BEST ${String(Math.floor(game.highScore || 0)).padStart(6, '0')}`, x, y + 50, 9, '#9c7a5d', {
    align: 'right',
    spacing: 1.6,
  })
  bodyText(ctx, `FIGHT ${Math.max(1, Math.min(game.waveIndex + 1, 7))} / 7`, x, y + 70, 10, '#e6c79a', {
    align: 'right',
    spacing: 1.8,
  })

  if (game.combo > 1) {
    const pulse = 1 + Math.min(0.28, (game.comboPulse || 0) * 0.9)
    ctx.save()
    ctx.translate(x - 2, 146)
    ctx.scale(pulse, pulse)
    displayText(ctx, `x${game.combo}`, 0, 0, 44, '#ffcf4d', { align: 'right', strokeWidth: 7, rotate: -0.04 })
    displayText(ctx, 'COMBO', 0, 27, 16, BONE, { align: 'right', strokeWidth: 4, spacing: 2 })
    ctx.restore()

    const w = 92
    const ratio = clamp(game.comboTimer / 2, 0, 1)
    ctx.fillStyle = 'rgba(20, 10, 7, 0.6)'
    roundedRect(ctx, x - w, 174, w, 5, 2.5)
    ctx.fill()
    ctx.fillStyle = ratio > 0.4 ? '#ff9a3d' : '#d9532b'
    roundedRect(ctx, x - w, 174, w * ratio, 5, 2.5)
    ctx.fill()
  }

  if (game.player.special >= 100 && game.state === 'playing') {
    const pulse = 0.7 + Math.sin(time * 7) * 0.3
    ctx.globalAlpha = pulse
    bodyText(ctx, 'L → TRIBE ROAR', x, 198, 10, '#ffcf4d', { align: 'right', spacing: 1.2 })
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

function drawBossBar(ctx, boss, time) {
  if (!boss) return
  const x = 252
  const y = 498
  const w = 456
  const h = 18
  const ratio = clamp(boss.hp / boss.maxHp, 0, 1)
  const ghost = clamp((boss.hpGhost ?? boss.hp) / boss.maxHp, 0, 1)

  ctx.save()
  ctx.fillStyle = 'rgba(20, 10, 7, 0.78)'
  roundedRect(ctx, x - 10, y - 24, w + 20, h + 32, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(243, 223, 182, 0.24)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  drawSkull(ctx, x - 2, y - 6, 20, '#d8bd8f')
  drawSkull(ctx, x + w + 2, y - 6, 20, '#d8bd8f')

  displayText(ctx, 'MAMMOTH MOG', 480, y - 14, 20, boss.hp / boss.maxHp < 0.45 ? '#ff8a5b' : '#f3dfb6', {
    strokeWidth: 4,
    spacing: 2,
  })

  ctx.fillStyle = 'rgba(10, 5, 4, 0.9)'
  roundedRect(ctx, x, y, w, h, 4)
  ctx.fill()
  ctx.strokeStyle = 'rgba(243, 223, 182, 0.5)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  if (ghost > ratio) {
    ctx.fillStyle = 'rgba(255, 236, 198, 0.6)'
    roundedRect(ctx, x + 2, y + 2, (w - 4) * ghost, h - 4, 2.5)
    ctx.fill()
  }

  const gradient = ctx.createLinearGradient(x, 0, x + w, 0)
  gradient.addColorStop(0, '#8e1d19')
  gradient.addColorStop(0.45, '#d83b26')
  gradient.addColorStop(1, '#ff7a37')
  ctx.fillStyle = gradient
  roundedRect(ctx, x + 2, y + 2, (w - 4) * ratio, h - 4, 2.5)
  ctx.fill()

  if (boss.hp / boss.maxHp < 0.45) {
    ctx.globalAlpha = 0.3 + Math.sin(time * 9) * 0.2
    ctx.fillStyle = '#ffd25b'
    roundedRect(ctx, x + 2, y + 2, (w - 4) * ratio, h - 4, 2.5)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  bodyText(ctx, boss.hp / boss.maxHp < 0.45 ? 'ENRAGED' : 'BONEFANG CHIEFTAIN', 480, y + h + 5, 8, '#b58c63', {
    align: 'center',
    spacing: 2.2,
  })
  ctx.restore()
}

export function drawHUD(ctx, game, time) {
  drawHealthPanel(ctx, game, time)
  drawScorePanel(ctx, game, time)
  drawBossBar(ctx, game.boss, time)

  if (game.player.hp / game.player.maxHp < 0.3) {
    const pulse = 0.16 + Math.sin(time * 5) * 0.07
    const gradient = ctx.createRadialGradient(480, 270, 180, 480, 270, 560)
    gradient.addColorStop(0, 'rgba(160, 20, 10, 0)')
    gradient.addColorStop(1, `rgba(160, 20, 10, ${pulse + 0.24})`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }
}

export function drawBanner(ctx, banner, time) {
  if (!banner) return
  const progress = clamp(banner.t / banner.duration, 0, 1)
  const inAlpha = clamp((banner.duration - banner.t) / 0.18, 0, 1)
  const outAlpha = clamp(banner.t / 0.4, 0, 1)
  const alpha = Math.min(inAlpha, outAlpha)
  const pop = 1 + (1 - clamp((banner.duration - banner.t) / 0.25, 0, 1)) * 0.1
  const y = banner.y ?? 176

  ctx.save()
  ctx.translate(VIEW_W / 2, y)
  ctx.rotate(banner.rotate ?? -0.025)
  ctx.scale(pop, pop)
  ctx.globalAlpha = alpha

  // soft wash behind the words so they read against the bright sky
  const wash = ctx.createRadialGradient(0, 0, 12, 0, 0, 300)
  wash.addColorStop(0, 'rgba(20, 10, 7, 0.42)')
  wash.addColorStop(0.5, 'rgba(20, 10, 7, 0.28)')
  wash.addColorStop(1, 'rgba(20, 10, 7, 0)')
  ctx.save()
  ctx.scale(1, 0.52)
  ctx.fillStyle = wash
  ctx.beginPath()
  ctx.arc(0, 0, 300, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  displayText(ctx, banner.title, 0, 0, banner.size, banner.color || '#ffcf4d', {
    strokeWidth: banner.strokeWidth || 9,
    stroke: '#23110b',
    spacing: 2,
  })
  if (banner.sub) {
    displayText(ctx, banner.sub, 0, banner.size * 0.72, banner.size * 0.29, BONE, {
      strokeWidth: 4,
      stroke: '#23110b',
      spacing: 2,
    })
  }
  ctx.restore()
}

export function drawVignette(ctx) {
  if (!vignetteCanvas) {
    vignetteCanvas = document.createElement('canvas')
    vignetteCanvas.width = VIEW_W
    vignetteCanvas.height = VIEW_H
    const vctx = vignetteCanvas.getContext('2d')
    const gradient = vctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.46, VIEW_H * 0.38, VIEW_W / 2, VIEW_H * 0.52, VIEW_H * 0.85)
    gradient.addColorStop(0, 'rgba(18, 8, 6, 0)')
    gradient.addColorStop(0.65, 'rgba(18, 8, 6, 0.18)')
    gradient.addColorStop(1, 'rgba(18, 8, 6, 0.7)')
    vctx.fillStyle = gradient
    vctx.fillRect(0, 0, VIEW_W, VIEW_H)

    grainCanvas = document.createElement('canvas')
    grainCanvas.width = 160
    grainCanvas.height = 160
    const gctx = grainCanvas.getContext('2d')
    const image = gctx.createImageData(160, 160)
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.random() * 255
      image.data[i] = value
      image.data[i + 1] = value
      image.data[i + 2] = value
      image.data[i + 3] = Math.random() * 20
    }
    gctx.putImageData(image, 0, 0)

    // bake the grain into the vignette so it costs nothing per frame
    vctx.save()
    vctx.globalAlpha = 0.3
    vctx.fillStyle = vctx.createPattern(grainCanvas, 'repeat')
    vctx.fillRect(0, 0, VIEW_W, VIEW_H)
    vctx.restore()
  }
  ctx.drawImage(vignetteCanvas, 0, 0)
}

export function drawTitleScene(ctx, game, time) {
  // handled by game via drawBackground; this export is reserved for future effects
}
