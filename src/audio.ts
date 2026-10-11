/** Small synthesized water-and-bell palette. No files, no autoplay, no network. */
export class PondAudio {
  enabled = false;
  context: AudioContext | null = null;
  async unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { this.context = null; }
  }
  tone(kind: 'collect' | 'hit' | 'start' | 'win') {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    try {
      const ctx = this.context;
      const notes = kind === 'collect' ? [880, 1320] : kind === 'hit' ? [130, 90] : kind === 'win' ? [523, 659, 784, 1046] : [392, 587];
      notes.forEach((frequency, i) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + i * 0.085;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        if (kind === 'hit') oscillator.frequency.exponentialRampToValueAtTime(55, start + 0.18);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.075, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.25);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Audio failure never interrupts a round. */ }
  }
}
