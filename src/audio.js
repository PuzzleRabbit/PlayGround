// A tiny procedural soundscape. Everything is synthesized; no audio assets.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.started = false;
    this.last = Object.create(null);
    this.drone = [];
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(ctx.destination);
  }

  async start() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
    if (!this.started) {
      this.started = true;
      this.ambient();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, t + 0.18);
    }
  }

  ambient() {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const bus = ctx.createGain();
    bus.gain.value = 0.16;
    bus.connect(this.master);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 0.7;
    filter.connect(bus);

    const freqs = [55, 82.5, 110, 164.81];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 0.23 : 0.09;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.045 + i * 0.017;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.045;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      lfo.start(now);
      this.drone.push(osc, lfo);
    });

    // A quiet wind of filtered noise.
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 2.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 480;
    noiseFilter.Q.value = 0.6;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.16;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.master);

    const slow = ctx.createOscillator();
    slow.type = 'sine';
    slow.frequency.value = 0.024;
    const slowGain = ctx.createGain();
    slowGain.gain.value = 0.08;
    slow.connect(slowGain);
    slowGain.connect(noiseGain.gain);
    slow.start(now);
    noise.start(now);
    this.drone.push(slow);
  }

  tone({ freq = 440, freqEnd = null, type = 'sine', duration = 0.2, volume = 0.08, delay = 0, attack = 0.006 }) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  noiseBurst({ duration = 0.2, volume = 0.06, frequency = 900, q = 1, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  throttled(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return true;
    this.last[name] = now;
    return false;
  }

  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'build':
        this.tone({ freq: 196, type: 'triangle', duration: 0.16, volume: 0.06 });
        this.tone({ freq: 392, type: 'sine', duration: 0.5, volume: 0.05, delay: 0.06 });
        this.tone({ freq: 587.33, type: 'sine', duration: 0.6, volume: 0.035, delay: 0.13 });
        break;
      case 'upgrade':
        [329.63, 493.88, 659.25, 987.77].forEach((f, i) => {
          this.tone({ freq: f, type: 'triangle', duration: 0.34, volume: 0.045, delay: i * 0.06 });
        });
        break;
      case 'sell':
        this.tone({ freq: 600, freqEnd: 320, type: 'triangle', duration: 0.2, volume: 0.04 });
        break;
      case 'bolt':
        if (this.throttled('bolt', 90)) return;
        this.tone({ freq: 880, freqEnd: 420, type: 'sine', duration: 0.12, volume: 0.026 });
        break;
      case 'arrow':
        if (this.throttled('arrow', 90)) return;
        this.noiseBurst({ duration: 0.12, volume: 0.03, frequency: 1800, q: 2 });
        this.tone({ freq: 220, freqEnd: 90, type: 'triangle', duration: 0.16, volume: 0.025 });
        break;
      case 'glob':
        this.tone({ freq: 180, freqEnd: 70, type: 'sine', duration: 0.3, volume: 0.04 });
        break;
      case 'hit':
        if (this.throttled('hit', 55)) return;
        this.tone({ freq: 260, freqEnd: 150, type: 'square', duration: 0.055, volume: 0.012 });
        break;
      case 'death':
        if (this.throttled('death', 70)) return;
        this.noiseBurst({ duration: 0.18, volume: 0.026, frequency: 420, q: 0.8 });
        this.tone({ freq: 150, freqEnd: 55, type: 'triangle', duration: 0.2, volume: 0.035 });
        break;
      case 'gate':
        this.tone({ freq: 90, freqEnd: 38, type: 'sawtooth', duration: 0.7, volume: 0.09 });
        this.noiseBurst({ duration: 0.5, volume: 0.07, frequency: 180, q: 0.6 });
        break;
      case 'wave':
        this.tone({ freq: 110, type: 'sawtooth', duration: 1.4, volume: 0.05 });
        this.tone({ freq: 164.81, type: 'triangle', duration: 1.6, volume: 0.05, delay: 0.1 });
        this.tone({ freq: 220, type: 'triangle', duration: 1.8, volume: 0.04, delay: 0.22 });
        this.noiseBurst({ duration: 0.8, volume: 0.03, frequency: 700, q: 0.5 });
        break;
      case 'coin':
        if (this.throttled('coin', 120)) return;
        this.tone({ freq: 1046, type: 'triangle', duration: 0.16, volume: 0.03 });
        this.tone({ freq: 1568, type: 'sine', duration: 0.24, volume: 0.02, delay: 0.04 });
        break;
      case 'level':
        [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => {
          this.tone({ freq: f, type: 'sine', duration: 0.5, volume: 0.055, delay: i * 0.09 });
        });
        break;
      case 'boon':
        [392, 523.25, 659.25, 783.99].forEach((f, i) => {
          this.tone({ freq: f, type: 'triangle', duration: 0.8, volume: 0.04, delay: i * 0.11 });
        });
        break;
      case 'smite':
        this.noiseBurst({ duration: 0.4, volume: 0.07, frequency: 500, q: 0.6 });
        this.tone({ freq: 320, freqEnd: 80, type: 'sawtooth', duration: 0.45, volume: 0.06 });
        break;
      case 'beam':
        this.tone({ freq: 1200, freqEnd: 240, type: 'sawtooth', duration: 0.4, volume: 0.045 });
        this.noiseBurst({ duration: 0.3, volume: 0.04, frequency: 2400, q: 1.5 });
        break;
      case 'shield':
        this.tone({ freq: 330, freqEnd: 660, type: 'sine', duration: 0.5, volume: 0.05 });
        this.tone({ freq: 495, type: 'sine', duration: 0.7, volume: 0.035, delay: 0.08 });
        break;
      case 'boss':
        this.tone({ freq: 65, type: 'sawtooth', duration: 2.2, volume: 0.1 });
        this.tone({ freq: 98, type: 'triangle', duration: 2.4, volume: 0.05 });
        this.noiseBurst({ duration: 1.6, volume: 0.05, frequency: 200, q: 0.4 });
        break;
      case 'error':
        this.tone({ freq: 180, freqEnd: 120, type: 'square', duration: 0.12, volume: 0.025 });
        break;
      case 'click':
        this.tone({ freq: 520, type: 'sine', duration: 0.05, volume: 0.02 });
        break;
      case 'victory':
        [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone({ freq: f, type: 'triangle', duration: 1.6, volume: 0.055, delay: i * 0.16 });
        });
        this.noiseBurst({ duration: 2, volume: 0.025, frequency: 1400, q: 0.6 });
        break;
      case 'defeat':
        [220, 196, 164.81, 130.81, 98].forEach((f, i) => {
          this.tone({ freq: f, type: 'triangle', duration: 1.4, volume: 0.06, delay: i * 0.22 });
        });
        this.tone({ freq: 55, type: 'sawtooth', duration: 2.6, volume: 0.05, delay: 0.5 });
        break;
      default:
        break;
    }
  }
}
