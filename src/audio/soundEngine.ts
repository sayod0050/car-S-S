/**
 * Procedural Web Audio synthesizer for S&S Racing.
 * Generates engine purr, tire drift screech, countdown tones, nitro boost,
 * collision crunch, coin/victory fanfare, and high-energy racing music.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private driftSource: AudioBufferSourceNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;
  private driftGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
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
      this.masterGain.gain.value = 0.82;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.soundEnabled ? 0.78 : 0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.25 : 0;
      this.musicGain.connect(this.masterGain);

      this.createNoiseBuffer();
      this.setupEngineAndDriftNodes();
    }
    return this.ctx;
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private setupEngineAndDriftNodes(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;
    this.engineFilter.Q.value = 2.6;

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

    // Continuous drift tire screech loop
    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0;

    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.value = 1650;
    this.driftFilter.Q.value = 5.5;

    this.driftSource = this.ctx.createBufferSource();
    this.driftSource.buffer = this.noiseBuffer;
    this.driftSource.loop = true;

    this.driftSource.connect(this.driftFilter);
    this.driftFilter.connect(this.driftGain);
    this.driftGain.connect(this.sfxGain);
    this.driftSource.start();
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
      this.sfxGain.gain.setTargetAtTime(soundEnabled ? 0.78 : 0, now, 0.04);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(musicEnabled ? 0.25 : 0, now, 0.08);
    }
  }

  public updateEngine(
    speedKmh: number,
    isBoosting: boolean,
    isDrifting: boolean,
    active: boolean
  ): void {
    if (
      !this.ctx ||
      !this.engineGain ||
      !this.engineOsc1 ||
      !this.engineOsc2 ||
      !this.engineFilter ||
      !this.driftGain
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || !this.soundEnabled) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
      this.driftGain.gain.setTargetAtTime(0, now, 0.05);
      this.wasBoosting = false;
      return;
    }

    const normSpeed = Math.max(0, Math.min(1.6, speedKmh / 230));
    const baseFreq = 44 + normSpeed * 84 + (isBoosting ? 28 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(
      210 + normSpeed * 560 + (isBoosting ? 460 : 0),
      now,
      0.05
    );
    this.engineGain.gain.setTargetAtTime(0.08 + normSpeed * 0.055, now, 0.05);

    this.driftGain.gain.setTargetAtTime(isDrifting ? 0.095 : 0, now, 0.04);

    if (isBoosting && !this.wasBoosting) {
      this.playNitro();
    }
    this.wasBoosting = isBoosting;
  }

  public playCountdown(isGo: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = isGo ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isGo ? 0.22 : 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.45 : 0.22));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (isGo ? 0.46 : 0.24));
  }

  public playNitro(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.exponentialRampToValueAtTime(2100, now + 0.32);
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

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.35);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.09, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playCrash(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const sub = ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(heavy ? 150 : 120, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + (heavy ? 0.4 : 0.2));

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(heavy ? 0.4 : 0.24, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.42 : 0.22));

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.44);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + (heavy ? 0.6 : 0.24));

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(heavy ? 0.42 : 0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.62 : 0.25));

    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.64);
  }

  public playButton(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.05);

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
    const notes = [523.25, 659.25, 783.99, 1046.5];
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

  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.soundEnabled) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.09;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2600;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.36);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  private startMusicLoop(): void {
    if (this.musicTimerId !== null) return;
    const stepMs = 112;
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

      if (step % 4 === 2 && this.noiseBuffer) {
        const hat = this.ctx.createBufferSource();
        hat.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const hGain = this.ctx.createGain();
        hGain.gain.setValueAtTime(0.075, now);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        hat.connect(hp);
        hp.connect(hGain);
        hGain.connect(this.musicGain);
        hat.start(now);
        hat.stop(now + 0.05);
      }

      const bassFreq = bassPattern[step];
      if (bassFreq > 0) {
        const bass = this.ctx.createOscillator();
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(bassFreq, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(430, now);

        const bGain = this.ctx.createGain();
        bGain.gain.setValueAtTime(0.18, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        bass.connect(filter);
        filter.connect(bGain);
        bGain.connect(this.musicGain);
        bass.start(now);
        bass.stop(now + 0.11);
      }

      const leadFreq = leadPattern[step];
      if (leadFreq > 0) {
        const lead = this.ctx.createOscillator();
        lead.type = 'triangle';
        lead.frequency.setValueAtTime(leadFreq, now);

        const lGain = this.ctx.createGain();
        lGain.gain.setValueAtTime(0.08, now);
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
