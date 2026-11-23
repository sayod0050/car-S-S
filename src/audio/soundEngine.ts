/**
 * Procedural Web Audio synthesizer for Street Rush 3D.
 * Zero external audio files — generates engine purr, nitro boost, coin chimes,
 * crash impact, UI clicks, and a driving synth-arcade soundtrack.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Continuous engine nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Noise buffer cache
  private noiseBuffer: AudioBuffer | null = null;

  // Music sequencer
  private musicTimerId: number | null = null;
  private musicStep = 0;

  private soundEnabled = true;
  private musicEnabled = true;
  private wasBoosting = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.soundEnabled ? 0.75 : 0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.26 : 0;
      this.musicGain.connect(this.masterGain);

      this.createNoiseBuffer();
      this.setupEngineNodes();
    }
    return this.ctx;
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private setupEngineNodes(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;
    this.engineFilter.Q.value = 2.4;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 55;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 110;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    this.startMusicLoop();
  }

  public setSettings(soundEnabled: boolean, musicEnabled: boolean): void {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(soundEnabled ? 0.75 : 0, now, 0.04);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(musicEnabled ? 0.26 : 0, now, 0.08);
    }
  }

  public updateEngine(speedKmh: number, isBoosting: boolean, active: boolean): void {
    if (!this.ctx || !this.engineGain || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || !this.soundEnabled) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
      this.wasBoosting = false;
      return;
    }

    const normSpeed = Math.max(0, Math.min(1.6, speedKmh / 220));
    const baseFreq = 46 + normSpeed * 78 + (isBoosting ? 24 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(220 + normSpeed * 520 + (isBoosting ? 420 : 0), now, 0.05);
    this.engineGain.gain.setTargetAtTime(0.085 + normSpeed * 0.045, now, 0.06);

    if (isBoosting && !this.wasBoosting) {
      this.playNitro();
    }
    this.wasBoosting = isBoosting;
  }

  public playNitro(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    // Turbine air rush
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(1900, now + 0.32);
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.56);

    // Rising synth turbine
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.35);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.09, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playCoin(streak = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled) return;

    const now = ctx.currentTime;
    const pitchBoost = Math.min(streak, 8) * 35;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77 + pitchBoost, now); // B5
    osc1.frequency.setValueAtTime(1318.51 + pitchBoost, now + 0.055); // E6

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc1.connect(gain);
    gain.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.25);
  }

  public playSwipe(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playNearMiss(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(280, now + 0.2);
    filter.Q.value = 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.23);
  }

  public playCrash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    // Low-end impact thud
    const sub = ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(150, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.45);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.52);

    // Metallic crunch noise
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.75);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.55, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.82);
  }

  public playButton(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playUnlock(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  private startMusicLoop(): void {
    if (this.musicTimerId !== null) return;
    // 132 BPM 16th-note step = ~113.6ms
    const stepMs = 114;
    const bassPattern = [
      55, 0, 55, 55, 65.41, 0, 65.41, 65.41,
      73.42, 0, 73.42, 73.42, 65.41, 0, 82.41, 73.42,
    ];
    const leadPattern = [
      440, 0, 523.25, 0, 659.25, 0, 523.25, 587.33,
      440, 0, 523.25, 659.25, 783.99, 0, 659.25, 587.33,
    ];

    this.musicTimerId = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled || this.ctx.state !== 'running') {
        return;
      }
      const now = this.ctx.currentTime;
      const step = this.musicStep % 16;
      this.musicStep++;

      // Kick drum on quarter beats
      if (step % 4 === 0) {
        const kick = this.ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(125, now);
        kick.frequency.exponentialRampToValueAtTime(42, now + 0.09);

        const kGain = this.ctx.createGain();
        kGain.gain.setValueAtTime(0.32, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        kick.connect(kGain);
        kGain.connect(this.musicGain);
        kick.start(now);
        kick.stop(now + 0.12);
      }

      // Off-beat crisp hi-hat
      if (step % 4 === 2 && this.noiseBuffer) {
        const hat = this.ctx.createBufferSource();
        hat.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const hGain = this.ctx.createGain();
        hGain.gain.setValueAtTime(0.08, now);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        hat.connect(hp);
        hp.connect(hGain);
        hGain.connect(this.musicGain);
        hat.start(now);
        hat.stop(now + 0.05);
      }

      // Driving synth bass
      const bassFreq = bassPattern[step];
      if (bassFreq > 0) {
        const bass = this.ctx.createOscillator();
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(bassFreq, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, now);

        const bGain = this.ctx.createGain();
        bGain.gain.setValueAtTime(0.18, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        bass.connect(filter);
        filter.connect(bGain);
        bGain.connect(this.musicGain);
        bass.start(now);
        bass.stop(now + 0.11);
      }

      // Sunlit arcade arpeggio lead
      const leadFreq = leadPattern[step];
      if (leadFreq > 0) {
        const lead = this.ctx.createOscillator();
        lead.type = 'triangle';
        lead.frequency.setValueAtTime(leadFreq, now);

        const lGain = this.ctx.createGain();
        lGain.gain.setValueAtTime(0.085, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        lead.connect(lGain);
        lGain.connect(this.musicGain);
        lead.start(now);
        lead.stop(now + 0.17);
      }
    }, stepMs);
  }

  public dispose(): void {
    if (this.musicTimerId !== null) {
      clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
