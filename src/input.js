const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'attack', KeyX: 'attack',
  KeyK: 'jump', KeyZ: 'jump', Space: 'jump',
  KeyL: 'special', KeyC: 'special',
  Enter: 'confirm', NumpadEnter: 'confirm',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute', KeyR: 'restart',
}

export class Input {
  constructor() {
    this.held = new Set()
    this.pressed = new Set()
    this.ax = 0
    this.az = 0
    this.joy = { x: 0, y: 0, active: false }
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window

    addEventListener('keydown', (event) => {
      const action = KEYMAP[event.code]
      if (!action) return
      if (['left', 'right', 'up', 'down', 'attack', 'jump', 'special', 'confirm', 'pause'].includes(action)) {
        event.preventDefault()
      }
      if (!event.repeat) this.pressed.add(action)
      this.held.add(action)
    }, { passive: false })

    addEventListener('keyup', (event) => {
      const action = KEYMAP[event.code]
      if (!action) return
      this.held.delete(action)
      if (['left', 'right', 'up', 'down', 'attack', 'jump', 'special'].includes(action)) event.preventDefault()
    }, { passive: false })

    addEventListener('blur', () => {
      this.held.clear()
      this.joy.x = 0
      this.joy.y = 0
      this.joy.active = false
    })

    if (this.isTouch) document.body.classList.add('touch')
    this.setupJoystick()
    this.setupButtons()
  }

  setupJoystick() {
    const base = document.getElementById('joystick')
    const knob = document.getElementById('stick-knob')
    if (!base || !knob) return
    let pointerId = null
    const max = 36

    const move = (event) => {
      const rect = base.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let dx = event.clientX - cx
      let dy = event.clientY - cy
      const len = Math.hypot(dx, dy) || 1
      const clamped = Math.min(len, max)
      dx = (dx / len) * clamped
      dy = (dy / len) * clamped
      knob.style.transform = `translate(${dx}px, ${dy}px)`
      const nx = dx / max
      const ny = dy / max
      const dead = 0.16
      this.joy.x = Math.abs(nx) < dead ? 0 : nx
      this.joy.y = Math.abs(ny) < dead ? 0 : ny
      this.joy.active = true
    }

    base.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId
      base.setPointerCapture(pointerId)
      move(event)
      event.preventDefault()
    })
    base.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return
      move(event)
      event.preventDefault()
    })
    const end = (event) => {
      if (pointerId !== null && event.pointerId !== pointerId) return
      pointerId = null
      this.joy.x = 0
      this.joy.y = 0
      this.joy.active = false
      knob.style.transform = 'translate(0px, 0px)'
    }
    base.addEventListener('pointerup', end)
    base.addEventListener('pointercancel', end)
    base.addEventListener('lostpointercapture', end)
  }

  setupButtons() {
    for (const button of document.querySelectorAll('.touch-btn')) {
      const action = button.dataset.action
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault()
        this.pressed.add(action)
        this.held.add(action)
        button.classList.add('pressed')
      })
      const release = (event) => {
        event.preventDefault()
        this.held.delete(action)
        button.classList.remove('pressed')
      }
      button.addEventListener('pointerup', release)
      button.addEventListener('pointercancel', release)
      button.addEventListener('pointerleave', release)
    }
  }

  sample() {
    let x = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0)
    let z = (this.held.has('down') ? 1 : 0) - (this.held.has('up') ? 1 : 0)
    if (this.joy.active) {
      x = this.joy.x
      z = this.joy.y
    }
    const len = Math.hypot(x, z)
    if (len > 1) {
      x /= len
      z /= len
    }
    this.ax = x
    this.az = z
  }

  consume(action) {
    if (!this.pressed.has(action)) return false
    this.pressed.delete(action)
    return true
  }

  isDown(action) {
    return this.held.has(action)
  }

  endFrame() {
    this.pressed.clear()
  }
}
