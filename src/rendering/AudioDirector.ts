export type TacticalSound =
  | "command"
  | "melee"
  | "ranged"
  | "naval"
  | "miracle-harvest"
  | "miracle-inspire"
  | "miracle-mend"
  | "miracle-judgment"
  | "victory";

/** Presentation-only Web Audio cues. The simulation never depends on this class. */
export class AudioDirector {
  private context?: AudioContext;
  private lastCombatAt = 0;
  private lastMiracleAt = 0;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(sound: TacticalSound): void {
    if (!this.enabled) return;
    const now = Date.now();
    const isCombatSound = sound === "melee" || sound === "ranged" || sound === "naval";
    const isMiracleSound = sound.startsWith("miracle-");
    if (isCombatSound && now - this.lastCombatAt < 140) return;
    if (isMiracleSound && now - this.lastMiracleAt < 220) return;
    if (isCombatSound) this.lastCombatAt = now;
    if (isMiracleSound) this.lastMiracleAt = now;
    try {
      const context = this.context ?? new AudioContext();
      this.context = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const settings: Record<TacticalSound, readonly [number, number, OscillatorType]> = {
        command: [440, 0.035, "square"],
        melee: [116, 0.045, "sawtooth"],
        ranged: [246, 0.035, "triangle"],
        naval: [82, 0.06, "triangle"],
        "miracle-harvest": [522, 0.04, "sine"],
        "miracle-inspire": [392, 0.05, "triangle"],
        "miracle-mend": [660, 0.045, "sine"],
        "miracle-judgment": [174, 0.06, "square"],
        victory: [660, 0.09, "sine"]
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
