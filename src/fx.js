import { VIEW_W, GROUND_TOP, DEPTH, GRAVITY } from './config.js'

const DISPLAY = '"Bangers", "Arial Black", Impact, sans-serif'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function easeOut(step) {
  return 1 - Math.pow(1 - step, 3)
}

function screenPosition(entity, cameraX) {
  return {
    x: entity.x - cameraX,
    y: GROUND_TOP + entity.z * DEPTH - (entity.y || 0),
  }
}

export class FX {
  constructor() {
    this.particles = []
    this.rings = []
    this.texts = []
  }

  reset() {
    this.particles.length = 0
    this.rings.length = 0
    this.texts.length = 0
  }

  dust(x, z, count = 6, options = {}) {
    const color = options.color || '210, 170, 120'
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        type: 'dust',
        x: x + rand(-12, 12),
        z: clamp(z + rand(-0.02, 0.02), 0, 1),
        y: rand(0, 5),
        vx: rand(-42, 42),
        vy: rand(10, 46),
        vz: rand(-0.035, 0.035),
        life: rand(0.3, 0.62),
        maxLife: 0.62,
        size: rand(3, 9),
        color,
        gravity: -6,
        alpha: 0.5,
      })
    }
  }

  impact(x, z, height = 52, strength = 1, color = '255, 205, 95') {
    for (let i = 0; i < 7 + strength * 4; i += 1) {
      const angle = rand(0, Math.PI * 2)
      const speed = rand(90, 260) * strength
      this.particles.push({
        type: Math.random() > 0.62 ? 'star' : 'spark',
        x,
        z,
        y: height + rand(-10, 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.8 + 70,
        vz: rand(-0.04, 0.04),
        life: rand(0.16, 0.38),
        maxLife: 0.38,
        size: rand(4, 11) * Math.min(1.5, strength),
        color,
        gravity: GRAVITY * 0.7,
        rot: rand(0, Math.PI),
        vr: rand(-12, 12),
        alpha: 1,
      })
    }
  }

  bones(x, z, height = 20, count = 4) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        type: 'bone',
        x,
        z,
        y: height + rand(0, 25),
        vx: rand(-170, 170),
        vy: rand(100, 280),
        vz: rand(-0.05, 0.05),
        life: rand(0.5, 0.9),
        maxLife: 0.9,
        size: rand(4, 7),
        color: '236, 219, 184',
        gravity: GRAVITY,
        rot: rand(0, Math.PI * 2),
        vr: rand(-14, 14),
        alpha: 1,
      })
    }
  }

  slash(x, z, dir, height = 52, size = 46) {
    this.particles.push({
      type: 'slash',
      x,
      z,
      y: height,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.14,
      maxLife: 0.14,
      size,
      color: '255, 235, 170',
      dir,
      alpha: 1,
    })
  }

  debris(x, z, y, count = 5) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        type: 'debris',
        x,
        z,
        y,
        vx: rand(-140, 140),
        vy: rand(80, 240),
        vz: rand(-0.03, 0.03),
        life: rand(0.35, 0.7),
        maxLife: 0.7,
        size: rand(2, 5),
        color: '117, 76, 50',
        gravity: GRAVITY,
        rot: rand(0, Math.PI),
        vr: rand(-9, 9),
        alpha: 1,
      })
    }
  }

  ring(x, z, maxRadius, color = '255, 207, 93', duration = 0.45, width = 0.26) {
    this.rings.push({
      x,
      z,
      maxRadius,
      radius: 0,
      color,
      duration,
      life: duration,
      width,
    })
  }

  text(text, x, z, color = '#ffcf4d', size = 20, options = {}) {
    this.texts.push({
      text,
      x,
      z,
      y: options.height ?? 86,
      vy: options.vy ?? 48,
      life: options.life ?? 0.8,
      maxLife: options.life ?? 0.8,
      color,
      size,
      stroke: options.stroke || '#24110b',
      rotation: options.rotation ?? rand(-0.06, 0.06),
      alpha: 1,
    })
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i]
      particle.life -= dt
      if (particle.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      if (particle.type === 'slash') continue
      particle.x += particle.vx * dt
      particle.z = clamp(particle.z + particle.vz * dt, 0, 1)
      particle.y += particle.vy * dt
      particle.vy -= (particle.gravity || 0) * dt
      if (particle.rot !== undefined) particle.rot += (particle.vr || 0) * dt
      if (particle.y < 0) {
        particle.y = 0
        particle.vy *= -0.28
        particle.vx *= 0.7
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const ring = this.rings[i]
      ring.life -= dt
      if (ring.life <= 0) this.rings.splice(i, 1)
    }

    for (let i = this.texts.length - 1; i >= 0; i -= 1) {
      const text = this.texts[i]
      text.life -= dt
      text.y += text.vy * dt
      text.vy *= 0.94
      if (text.life <= 0) this.texts.splice(i, 1)
    }
  }

  drawGround(ctx, cameraX) {
    for (const ring of this.rings) {
      const progress = 1 - ring.life / ring.duration
      const radius = ring.maxRadius * easeOut(progress)
      const alpha = Math.max(0, 1 - progress)
      const x = ring.x - cameraX
      const y = GROUND_TOP + ring.z * DEPTH
      if (x < -radius - 40 || x > VIEW_W + radius + 40) continue

      ctx.save()
      ctx.globalAlpha = alpha * 0.9
      ctx.strokeStyle = `rgba(${ring.color}, 0.9)`
      ctx.lineWidth = 7 * (1 - progress) + 1.5
      ctx.beginPath()
      ctx.ellipse(x, y, radius, radius * ring.width, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = alpha * 0.24
      ctx.strokeStyle = `rgba(${ring.color}, 0.8)`
      ctx.lineWidth = 15 * (1 - progress) + 2
      ctx.stroke()
      if (progress < 0.3) {
        ctx.globalAlpha = (1 - progress / 0.3) * 0.18
        ctx.fillStyle = `rgba(${ring.color}, 0.8)`
        ctx.beginPath()
        ctx.ellipse(x, y, radius, radius * ring.width, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  draw(ctx, cameraX) {
    for (const particle of this.particles) {
      const alpha = clamp(particle.life / Math.max(0.001, particle.maxLife), 0, 1)
      const x = particle.x - cameraX
      const y = GROUND_TOP + particle.z * DEPTH - particle.y
      if (x < -80 || x > VIEW_W + 80) continue

      ctx.save()
      ctx.globalAlpha = alpha * (particle.alpha ?? 1)

      if (particle.type === 'dust') {
        const growth = 1 + (1 - alpha) * 1.6
        ctx.fillStyle = `rgba(${particle.color}, 0.5)`
        ctx.beginPath()
        ctx.arc(x, y, particle.size * growth, 0, Math.PI * 2)
        ctx.fill()
      } else if (particle.type === 'spark') {
        const speed = Math.hypot(particle.vx, particle.vy)
        const angle = Math.atan2(particle.vy, particle.vx)
        ctx.strokeStyle = `rgba(${particle.color}, 0.95)`
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - Math.cos(angle) * Math.min(18, speed * 0.06), y + Math.sin(angle) * Math.min(18, speed * 0.06))
        ctx.stroke()
        ctx.fillStyle = `rgba(255, 250, 220, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, 2.2, 0, Math.PI * 2)
        ctx.fill()
      } else if (particle.type === 'star') {
        ctx.translate(x, y)
        ctx.rotate(particle.rot)
        ctx.fillStyle = `rgba(${particle.color}, 0.95)`
        ctx.strokeStyle = 'rgba(39, 19, 12, 0.7)'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < 8; i += 1) {
          const angle = (i / 8) * Math.PI * 2
          const radius = i % 2 === 0 ? particle.size : particle.size * 0.35
          const px = Math.cos(angle) * radius
          const py = Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else if (particle.type === 'bone') {
        ctx.translate(x, y)
        ctx.rotate(particle.rot)
        ctx.strokeStyle = 'rgba(236, 219, 184, 0.95)'
        ctx.lineWidth = particle.size * 0.55
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(-particle.size, 0)
        ctx.lineTo(particle.size, 0)
        ctx.stroke()
        ctx.fillStyle = 'rgba(236, 219, 184, 0.95)'
        ctx.beginPath()
        ctx.arc(-particle.size, -particle.size * 0.4, particle.size * 0.45, 0, Math.PI * 2)
        ctx.arc(-particle.size, particle.size * 0.4, particle.size * 0.45, 0, Math.PI * 2)
        ctx.arc(particle.size, -particle.size * 0.4, particle.size * 0.45, 0, Math.PI * 2)
        ctx.arc(particle.size, particle.size * 0.4, particle.size * 0.45, 0, Math.PI * 2)
        ctx.fill()
      } else if (particle.type === 'slash') {
        const progress = 1 - alpha
        const start = particle.dir > 0 ? -1.35 : Math.PI - 1.35
        const end = particle.dir > 0 ? 1.35 : Math.PI + 1.35
        ctx.translate(x, y)
        ctx.rotate(-0.15 + progress * 0.3)
        ctx.strokeStyle = `rgba(${particle.color}, ${0.85 * alpha})`
        ctx.lineWidth = 8 * alpha + 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(0, 0, particle.size, start, end)
        ctx.stroke()
        ctx.strokeStyle = `rgba(255, 255, 235, ${0.8 * alpha})`
        ctx.lineWidth = 2.5 * alpha + 0.5
        ctx.beginPath()
        ctx.arc(0, 0, particle.size - 3, start + 0.08, end - 0.08)
        ctx.stroke()
      } else if (particle.type === 'debris') {
        ctx.translate(x, y)
        ctx.rotate(particle.rot)
        ctx.fillStyle = `rgba(${particle.color}, 0.95)`
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.8)
      }
      ctx.restore()
    }

    for (const text of this.texts) {
      const alpha = clamp(text.life / text.maxLife, 0, 1)
      const age = 1 - alpha
      const pop = 1 + Math.max(0, 0.26 - age) * 2.4
      const x = text.x - cameraX
      const y = GROUND_TOP + text.z * DEPTH - text.y
      if (x < -120 || x > VIEW_W + 120) continue
      ctx.save()
      ctx.globalAlpha = Math.min(1, alpha * 1.8)
      ctx.translate(x, y)
      ctx.rotate(text.rotation)
      ctx.scale(pop, pop)
      ctx.font = `400 ${text.size}px ${DISPLAY}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.lineWidth = Math.max(2, text.size * 0.16)
      ctx.strokeStyle = text.stroke
      ctx.strokeText(text.text, 0, 0)
      ctx.fillStyle = text.color
      ctx.fillText(text.text, 0, 0)
      ctx.restore()
    }
  }
}
