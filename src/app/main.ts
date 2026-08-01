import Phaser from "phaser";
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

new Phaser.Game(config);
