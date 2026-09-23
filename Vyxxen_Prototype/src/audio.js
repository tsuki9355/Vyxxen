export class AudioSystem {
  enabled = true;
  context = null;
  unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? .22 : 0;
      this.master.connect(this.context.destination);
      this.engine = this.context.createOscillator();
      this.engine.type = 'sawtooth';
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 150;
      this.engineGain = this.context.createGain(); this.engineGain.gain.value = 0;
      this.engine.connect(filter).connect(this.engineGain).connect(this.master);
      this.engine.start();
    }
    this.context.resume().catch(() => {});
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.setTargetAtTime(this.enabled ? .22 : 0,this.context.currentTime,.05);
    return this.enabled;
  }
  flight(active, slow = false) {
    if (!this.context) return;
    this.engineGain.gain.setTargetAtTime(active ? .16 : 0,this.context.currentTime,.1);
    this.engine.frequency.setTargetAtTime(slow ? 43 : 62,this.context.currentTime,.2);
  }
  tone(frequency, duration, type = 'sine', volume = .2, end = frequency) {
    if (!this.context || !this.enabled) return;
    const t = this.context.currentTime;
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency,t);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);
    gain.gain.setValueAtTime(volume,t); gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    oscillator.connect(gain).connect(this.master); oscillator.start(t); oscillator.stop(t+duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  shot() { this.tone(720,.075,'triangle',.14,250); }
  hit() { this.tone(100,.27,'sawtooth',.4,24); }
  pickup() { this.tone(550,.28,'sine',.4,1400); }
  refuel() { this.tone(310,.12,'sine',.15,450); }
}
