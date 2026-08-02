import Phaser from "phaser";
import {
  MultiplayerLobby,
  type MultiplayerConnectRequest,
  type MultiplayerLobbyDefaults
} from "./MultiplayerLobby";
import { MilestoneOneScene } from "../rendering/scenes/MilestoneOneScene";
import "../styles.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#1d2319",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  input: {
    mouse: {
      preventDefaultDown: true,
      preventDefaultMove: true,
      preventDefaultUp: true
    }
  },
  disableContextMenu: true,
  scene: [MilestoneOneScene]
};

const game = new Phaser.Game(config);
const lobby = new MultiplayerLobby((request: MultiplayerConnectRequest) => {
  game.events.emit("join-multiplayer", request);
});

game.events.on("open-multiplayer-lobby", (defaults: MultiplayerLobbyDefaults) => lobby.open(defaults));

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {
      // Offline support is progressive enhancement; a failed registration must never interrupt a reign.
    });
  });
}
