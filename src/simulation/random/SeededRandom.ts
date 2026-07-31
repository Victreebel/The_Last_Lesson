export interface RandomState {
  readonly seed: number;
}

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  nextFloat(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  nextInt(minInclusive: number, maxInclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  getState(): RandomState {
    return { seed: this.seed };
  }

  setState(state: RandomState): void {
    this.seed = state.seed >>> 0;
  }
}

