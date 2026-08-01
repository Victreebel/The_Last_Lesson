export type TacticalSound = "command" | "combat" | "naval" | "victory";

/** Presentation-only Web Audio cues. The simulation never depends on this class. */
export class AudioDirector {
  private context?: AudioContext;
  private lastCombatAt = 0;

  play(sound: TacticalSound): void {
    const now = Date.now();
    if ((sound === "combat" || sound === "naval") && now - this.lastCombatAt < 140) return;
    if (sound === "combat" || sound === "naval") this.lastCombatAt = now;
    try {
      const context = this.context ?? new AudioContext();
      this.context = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const settings: Record<TacticalSound, readonly [number, number, OscillatorType]> = {
        command: [440, 0.035, "square"], combat: [116, 0.045, "sawtooth"],
        naval: [82, 0.06, "triangle"], victory: [660, 0.09, "sine"]
      };
      const [frequency, volume, type] = settings[sound];
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.17);
    } catch {
      // Audio is optional when a browser denies playback.
    }
  }
}
