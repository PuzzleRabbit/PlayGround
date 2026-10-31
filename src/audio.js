function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.musicBus = null
    this.sfxBus = null
    this.muted = false
    this.scene = 'title'
    this.step = 0
    this.nextNote = 0
    this.timer = null
    this.noise = null
    this.lastStepAt = 0
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    this.ctx = ctx

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.knee.value = 22
    compressor.ratio.value = 8
    compressor.attack.value = 0.004
    compressor.release.value = 0.24
    compressor.connect(ctx.destination)

    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.66
    this.master.connect(compressor)

    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0
    this.musicBus.connect(this.master)

    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = 0.52
    this.sfxBus.connect(this.master)

    this.noise = this.createNoiseBuffer(1.2)
    this.nextNote = ctx.currentTime + 0.06
    this.timer = setInterval(() => this.schedule(), 30)
    this.schedule()
    this.musicBus.gain.setTargetAtTime(0.16, ctx.currentTime, 0.8)
  }

  createNoiseBuffer(seconds) {
    const ctx = this.ctx
    const length = Math.floor(ctx.sampleRate * seconds)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    }
    return buffer
  }

  setScene(scene) {
    if (this.scene === scene) return
    this.scene = scene
    this.step = 0
    if (this.ctx) this.nextNote = this.ctx.currentTime + 0.04
  }

  toggleMute(force) {
    this.muted = typeof force === 'boolean' ? force : !this.muted
    if (this.ctx) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.66, now, 0.04)
    }
    return this.muted
  }

  tempo() {
    if (this.scene === 'boss') return 132
    if (this.scene === 'fight') return 112
    return 86
  }

  schedule() {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const stepDur = 60 / this.tempo() / 4
    const horizon = ctx.currentTime + 0.16
    let guard = 0
    while (this.nextNote < horizon && guard < 24) {
      this.playStep(this.step, this.nextNote)
      this.nextNote += stepDur
      this.step = (this.step + 1) % 128
      guard += 1
    }
  }

  playStep(step, time) {
    const bar = Math.floor(step / 16)
    const beat = step % 16
    const fight = this.scene === 'fight' || this.scene === 'boss'
    const boss = this.scene === 'boss'

    if (!fight) {
      if (beat === 0 || beat === 8) this.kick(time, 0.22)
      if (beat === 4 || beat === 12) this.shaker(time, 0.035)
      if (bar % 2 === 0 && (beat === 0 || beat === 8)) {
        this.drone(time, 55 * (bar % 4 === 2 ? 1.2 : 1), 1.35, 0.022)
      }
      if (bar % 2 === 1 && (beat === 2 || beat === 10)) {
        this.flute(time, [330, 392, 440, 392, 330][bar % 5], 0.55, 0.026)
      }
      return
    }

    if (beat === 0 || beat === 6 || (boss && beat === 10)) this.kick(time, 0.34)
    if (beat === 8 || beat === 14 || (boss && beat === 3)) this.kick(time, 0.26)
    if (beat === 3 || beat === 11 || (boss && beat === 15)) this.tom(time, beat === 11 ? 120 : 90, 0.18)
    if (beat % 2 === 1) this.shaker(time, 0.045)
    if (beat === 0 || beat === 8) {
      this.drone(time, [55, 55, 65.4, 49][bar % 4], 0.45, 0.05)
    }
    if (beat === 0 && bar % 4 === 0) {
      const melody = [220, 261.63, 293.66, 329.63, 293.66, 261.63, 220, 196][Math.floor(step / 16) % 8]
      this.flute(time + 0.1, melody, 0.5, 0.022)
    }
    if (boss && beat === 4 && bar % 2 === 0) {
      this.flute(time, 146.83, 0.32, 0.02)
    }
  }

  tone(time, freq, endFreq, duration, type, peak, filter) {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(Math.max(20, freq), time)
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + duration)
    }
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + Math.min(0.012, duration * 0.2))
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    let node = gain
    if (filter) {
      const biquad = ctx.createBiquadFilter()
      biquad.type = filter.type || 'lowpass'
      biquad.frequency.value = filter.freq || 900
      biquad.Q.value = filter.q ?? 0.7
      gain.connect(biquad)
      node = biquad
    }
    osc.connect(gain)
    node.connect(this.sfxBus)
    osc.start(time)
    osc.stop(time + duration + 0.02)
  }

  noiseBurst(time, duration, peak, filterType, freq, q = 0.8, endFreq) {
    const ctx = this.ctx
    if (!ctx || !this.noise) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.setValueAtTime(freq, time)
    if (endFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), time + duration)
    filter.Q.value = q
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxBus)
    src.start(time, Math.random() * 0.3, duration + 0.02)
  }

  kick(time, peak = 0.3) {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(130, time)
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.14)
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2)
    osc.connect(gain)
    gain.connect(this.musicBus)
    osc.start(time)
    osc.stop(time + 0.22)
  }

  tom(time, freq, peak) {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq * 1.35, time)
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.09)
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24)
    osc.connect(gain)
    gain.connect(this.musicBus)
    osc.start(time)
    osc.stop(time + 0.26)
  }

  shaker(time, peak) {
    if (!this.ctx || !this.noise) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 5200
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(peak, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.musicBus)
    src.start(time, Math.random() * 0.5, 0.06)
  }

  drone(time, freq, duration, peak) {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc2.type = 'sine'
    osc.frequency.value = freq
    osc2.frequency.value = freq * 2.005
    filter.type = 'lowpass'
    filter.frequency.value = 320
    filter.Q.value = 4
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.06)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.musicBus)
    osc.start(time)
    osc2.start(time)
    osc.stop(time + duration + 0.05)
    osc2.stop(time + duration + 0.05)
  }

  flute(time, freq, duration, peak) {
    const ctx = this.ctx
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    lfo.frequency.value = 5.2
    lfoGain.gain.value = 4.5
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.06)
    gain.gain.exponentialRampToValueAtTime(peak * 0.7, time + duration * 0.6)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    osc.connect(gain)
    gain.connect(this.musicBus)
    osc.start(time)
    lfo.start(time)
    osc.stop(time + duration + 0.02)
    lfo.stop(time + duration + 0.02)
  }

  sfx(name) {
    if (!this.ctx || this.ctx.state !== 'running') return
    const t = this.ctx.currentTime + 0.001
    switch (name) {
      case 'swing':
        this.noiseBurst(t, 0.13, 0.13, 'bandpass', 1300, 1.4, 420)
        break
      case 'hit':
        this.tone(t, 155, 62, 0.14, 'triangle', 0.35, { type: 'lowpass', freq: 900 })
        this.noiseBurst(t, 0.09, 0.18, 'bandpass', 900, 1, 300)
        break
      case 'heavy':
        this.tone(t, 120, 38, 0.24, 'sine', 0.5)
        this.noiseBurst(t, 0.16, 0.24, 'lowpass', 700, 0.8, 180)
        break
      case 'hurt':
        this.tone(t, 240, 80, 0.26, 'sawtooth', 0.2, { type: 'lowpass', freq: 1200 })
        break
      case 'jump':
        this.tone(t, 210, 390, 0.13, 'sine', 0.14)
        break
      case 'land':
        this.noiseBurst(t, 0.11, 0.16, 'lowpass', 480, 0.7, 120)
        break
      case 'roar':
        this.tone(t, 92, 42, 0.8, 'sawtooth', 0.32, { type: 'lowpass', freq: 480, q: 3 })
        this.noiseBurst(t, 0.75, 0.16, 'lowpass', 600, 2, 160)
        break
      case 'special':
        this.tone(t, 70, 34, 0.85, 'sawtooth', 0.34, { type: 'lowpass', freq: 520, q: 5 })
        this.noiseBurst(t, 0.55, 0.2, 'bandpass', 400, 1.1, 110)
        break
      case 'meat':
        this.tone(t, 440, 440, 0.1, 'sine', 0.14)
        this.tone(t + 0.08, 660, 660, 0.14, 'sine', 0.12)
        break
      case 'clear':
        this.tone(t, 392, 392, 0.16, 'triangle', 0.14)
        this.tone(t + 0.14, 523.25, 523.25, 0.3, 'triangle', 0.14)
        break
      case 'gameover':
        this.tone(t, 196, 196, 0.3, 'sawtooth', 0.13, { type: 'lowpass', freq: 900 })
        this.tone(t + 0.24, 155, 155, 0.45, 'sawtooth', 0.12, { type: 'lowpass', freq: 700 })
        this.tone(t + 0.55, 110, 82, 0.9, 'sawtooth', 0.12, { type: 'lowpass', freq: 500 })
        break
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
          this.tone(t + index * 0.12, freq, freq, 0.28, 'triangle', 0.13)
        })
        break
      case 'charge':
        this.noiseBurst(t, 0.6, 0.13, 'bandpass', 220, 0.8, 900)
        break
      case 'slam':
        this.tone(t, 84, 28, 0.5, 'sine', 0.55)
        this.noiseBurst(t, 0.4, 0.25, 'lowpass', 500, 0.7, 80)
        break
      default:
        break
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (this.ctx) this.ctx.close()
    this.ctx = null
  }
}
