import type { RivalDifficulty, ScenarioId } from "../simulation/state/WorldState";

export interface MultiplayerConnectRequest {
  readonly url: string;
  readonly roomId: string;
  readonly clientId: string;
  readonly scenarioId: ScenarioId;
  readonly rivalDifficulty: RivalDifficulty;
}

export interface MultiplayerLobbyDefaults {
  readonly scenarioId: ScenarioId;
  readonly rivalDifficulty: RivalDifficulty;
}

/** DOM form for connection data; simulation and rendering remain Phaser-owned. */
export class MultiplayerLobby {
  private readonly overlay: HTMLDivElement;
  private readonly form: HTMLFormElement;
  private readonly urlInput: HTMLInputElement;
  private readonly roomInput: HTMLInputElement;
  private readonly scenarioSelect: HTMLSelectElement;
  private readonly difficultySelect: HTMLSelectElement;

  constructor(private readonly onConnect: (request: MultiplayerConnectRequest) => void) {
    this.overlay = document.createElement("div");
    this.overlay.className = "multiplayer-lobby";
    this.overlay.hidden = true;
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-labelledby", "multiplayer-lobby-title");

    this.form = document.createElement("form");
    this.form.className = "multiplayer-lobby__form";
    this.form.innerHTML = `
      <header class="multiplayer-lobby__header">
        <h2 id="multiplayer-lobby-title">MULTIPLAYER REIGN</h2>
        <button type="button" class="multiplayer-lobby__close" aria-label="Close multiplayer lobby">×</button>
      </header>
      <label>HOST <input name="url" inputmode="url" autocomplete="url" required /></label>
      <label>ROOM <input name="room" autocomplete="off" maxlength="64" required /></label>
      <label>THEATRE <select name="scenario">
        <option value="crownfall">CROWNFALL</option>
        <option value="rivergate">RIVERGATE</option>
        <option value="ashen-oath">ASHEN OATH</option>
        <option value="stonewall">STONEWALL</option>
      </select></label>
      <label>RIVAL DOCTRINE <select name="difficulty">
        <option value="disciple">DISCIPLE</option>
        <option value="rival">RIVAL</option>
        <option value="architect">ARCHITECT</option>
      </select></label>
      <button type="submit" class="multiplayer-lobby__join">JOIN AS THE CROWN</button>
    `;
    this.urlInput = this.form.elements.namedItem("url") as HTMLInputElement;
    this.roomInput = this.form.elements.namedItem("room") as HTMLInputElement;
    this.scenarioSelect = this.form.elements.namedItem("scenario") as HTMLSelectElement;
    this.difficultySelect = this.form.elements.namedItem("difficulty") as HTMLSelectElement;
    this.urlInput.value = "ws://127.0.0.1:8787";
    this.roomInput.value = "crown-coop";
    this.overlay.append(this.form);
    document.body.append(this.overlay);

    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.close();
      this.onConnect({
        url: this.urlInput.value.trim(),
        roomId: this.roomInput.value.trim(),
        clientId: createClientId(),
        scenarioId: this.scenarioSelect.value as ScenarioId,
        rivalDifficulty: this.difficultySelect.value as RivalDifficulty
      });
    });
    this.form.querySelector<HTMLButtonElement>(".multiplayer-lobby__close")?.addEventListener("click", () => this.close());
    this.overlay.addEventListener("pointerdown", (event) => {
      if (event.target === this.overlay) {
        this.close();
      }
    });
  }

  open(defaults: MultiplayerLobbyDefaults): void {
    this.scenarioSelect.value = defaults.scenarioId;
    this.difficultySelect.value = defaults.rivalDifficulty;
    this.overlay.hidden = false;
    this.roomInput.focus();
    this.roomInput.select();
  }

  close(): void {
    this.overlay.hidden = true;
  }
}

function createClientId(): string {
  const suffix = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12) ?? Math.random().toString(36).slice(2, 14);
  return `crown-${suffix}`;
}
