import Phaser from "phaser";
import type { MultiplayerConnectRequest } from "../../app/MultiplayerLobby";
import type { CommandIntent } from "../../networking/LocalAuthority";
import { RemoteAuthorityClient } from "../../networking/RemoteAuthorityClient";
import type { RemoteConnectionState } from "../../networking/RemoteAuthorityClient";
import type { AuthoritySnapshot } from "../../networking/LocalAuthority";
import type { ServerMessage } from "../../networking/protocol";
import { AudioDirector } from "../AudioDirector";
import { Simulation } from "../../simulation/Simulation";
import type { GameCommand } from "../../simulation/commands/GameCommand";
import type { GameEvent } from "../../simulation/events/GameEvent";
import {
  createSaveGame,
  deserializeSaveGame,
  restoreSaveGame,
  serializeSaveGame,
  type SaveGame
} from "../../simulation/save/SaveGame";
import { createReignReport, formatReignDuration } from "../../simulation/reports/ReignReport";
import { stableHash } from "../../simulation/hash/stableHash";
import { createReplayRecord, runReplayRecord } from "../../simulation/replay/ReplayRecord";
import {
  createInitialWorld,
  getBattalionRank,
  getBattalionTraits,
  getBuildingCost,
  isPositionVisibleToEmpire,
  isBuildingPlacementClear,
  isBuildingTerrainCompatible,
  terrainAtPosition,
  type BattalionState,
  type BattalionSpecialization,
  type CaravanState,
  type BuildingKind,
  type BuildingState,
  type DoctrineRule,
  type HeirState,
  type RivalDifficulty,
  RIVAL_DIFFICULTY_PROFILES,
  type ScenarioId,
  SCENARIO_PROFILES,
  type SettlementState,
  type TerrainKind,
  type TerrainZone,
  type WorldState
} from "../../simulation/state/WorldState";

type ToolMode = "select" | "building" | "move" | "attack" | "attack-move";

const BUILDING_OPTIONS: ReadonlyArray<{ readonly kind: BuildingKind; readonly label: string }> = [
  { kind: "villa", label: "Villa" },
  { kind: "hovel", label: "Hovel" },
  { kind: "town-square", label: "Town Square" },
  { kind: "farm", label: "Farm" },
  { kind: "road", label: "Road" },
  { kind: "military-quarters", label: "Military Quarters" },
  { kind: "mine", label: "Mine" },
  { kind: "lumber-mill", label: "Lumber Mill" },
  { kind: "plantation", label: "Plantation" },
  { kind: "moat", label: "Moat" },
  { kind: "wall", label: "Wall" },
  { kind: "gate", label: "Gate" },
  { kind: "outpost", label: "Outpost" }
];

const BUILDING_COLORS: Record<BuildingKind, number> = {
  castle: 0x8f8366,
  "military-quarters": 0x9d4640,
  "town-square": 0x66705a,
  farm: 0x8f9f4d,
  villa: 0xb9a780,
  hovel: 0x7e6852,
  road: 0x866f55,
  mine: 0x6d7480,
  "lumber-mill": 0x735e40,
  plantation: 0x9b7351,
  moat: 0x356c80,
  wall: 0x9a9788,
  gate: 0x566a74,
  outpost: 0xb2693f
};

const BUILDING_SIZES: Record<BuildingKind, number> = {
  castle: 72,
  "military-quarters": 60,
  "town-square": 56,
  farm: 48,
  villa: 48,
  hovel: 42,
  road: 34,
  mine: 50,
  "lumber-mill": 50,
  plantation: 52,
  moat: 54,
  wall: 54,
  gate: 54,
  outpost: 44
};

const BUILDING_ART_FRAMES: Record<BuildingKind, readonly [number, number]> = {
  castle: [0, 0],
  "military-quarters": [1, 0],
  "town-square": [2, 0],
  farm: [3, 0],
  villa: [0, 1],
  hovel: [1, 1],
  road: [2, 1],
  mine: [3, 1],
  "lumber-mill": [0, 2],
  plantation: [1, 2],
  moat: [2, 2],
  wall: [3, 2],
  gate: [0, 3],
  outpost: [1, 3]
};

const BUILDING_ART_TILE_SIZE: Record<BuildingKind, number> = {
  castle: 158,
  "military-quarters": 132,
  "town-square": 132,
  farm: 130,
  villa: 128,
  hovel: 112,
  road: 104,
  mine: 114,
  "lumber-mill": 120,
  plantation: 122,
  moat: 118,
  wall: 118,
  gate: 122,
  outpost: 120
};

const BUILDING_ATLAS_CELL_SIZE = 313.5;

const UNIT_ART_FRAMES: Record<BattalionSpecialization, readonly [number, number]> = {
  militia: [0, 0],
  spears: [1, 0],
  archers: [2, 0],
  raiders: [0, 1],
  hounds: [1, 1]
};

const UNIT_ATLAS_CELL_SIZE = 512;
const UNIT_ATLAS_DISPLAY_WIDTH = 276;
const UNIT_ATLAS_DISPLAY_HEIGHT = 184;

const BUILDING_DISPLAY_LABELS: Record<BuildingKind, string> = {
  castle: "CASTLE",
  "military-quarters": "MILITARY\nQUARTERS",
  "town-square": "TOWN\nSQUARE",
  farm: "FARM",
  villa: "VILLA",
  hovel: "HOVEL",
  road: "ROAD",
  mine: "MINE",
  "lumber-mill": "LUMBER\nMILL",
  plantation: "PLANTATION",
  moat: "MOAT",
  wall: "WALL",
  gate: "GATE",
  outpost: "OUTPOST"
};

const TERRAIN_COLORS: Record<TerrainKind, number> = {
  grassland: 0x4b623a,
  fertile: 0x758e3c,
  forest: 0x28513a,
  "iron-vein": 0x5c6670,
  "luxury-grove": 0x987e45,
  hills: 0x746b4f,
  water: 0x2f667c,
  marsh: 0x4a624f
};

const TERRAIN_SYMBOLS: Record<TerrainKind, string> = {
  grassland: "G",
  fertile: "F",
  forest: "W",
  "iron-vein": "I",
  "luxury-grove": "L",
  hills: "H",
  water: "~",
  marsh: "M"
};

const TERRAIN_DETAILS: Record<TerrainKind, string> = {
  grassland: "OPEN BUILD GROUND",
  fertile: "FARMS / FOOD",
  forest: "LUMBER MILLS / WOOD",
  "iron-vein": "MINES / IRON",
  "luxury-grove": "PLANTATIONS / LUXURY",
  hills: "SLOW / DEFENSE +",
  water: "BLOCKS LAND UNITS",
  marsh: "SLOW / UNBUILDABLE"
};

const BUILD_PANEL_WIDTH = 306;
const HEIR_PANEL_WIDTH = 286;
const PLACEMENT_GRID_SIZE = 32;
const DRAG_THRESHOLD = 10;
const MINIMAP_WIDTH = 230;
const MINIMAP_HEIGHT = 158;
const WORLD_TICK_MILLISECONDS = 5000;
const AUTO_SAVE_INTERVAL_TICKS = 5;
const UI_COLORS = {
  panel: 0x12191a,
  panelDeep: 0x0b1011,
  trim: 0x5a6b63,
  accent: 0xe2bd61,
  text: "#e9e4cf",
  muted: "#9eaea8",
  command: 0x273536,
  commandActive: 0x4c5f53,
  danger: 0x783c37
};

const LOCAL_SAVE_KEY = "the-last-lesson.primary-save.v1";
const LOCAL_REPLAY_ORIGIN_KEY = "the-last-lesson.replay-origin.v1";
const LOCAL_AUDIO_ENABLED_KEY = "the-last-lesson.audio-enabled.v1";

interface BuildingTile {
  readonly button: Phaser.GameObjects.Rectangle;
  readonly icon: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  readonly count: Phaser.GameObjects.Text;
}

interface HeirFeedbackControl {
  readonly button: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
}

interface ReplayReviewState {
  readonly liveSave: SaveGame;
  readonly commandSequence: number;
  readonly targetTick: number;
}

export class MilestoneOneScene extends Phaser.Scene {
  private campaignDifficulty: RivalDifficulty = "rival";
  private campaignScenario: ScenarioId = "crownfall";
  private campaignInitialWorld: WorldState = createInitialWorld(777, this.campaignDifficulty, this.campaignScenario);
  private simulation = new Simulation(structuredClone(this.campaignInitialWorld));
  private remoteAuthority?: RemoteAuthorityClient;
  private remoteUnsubscribe?: () => void;
  private remoteStatusUnsubscribe?: () => void;
  private remoteRoomId?: string;
  private readonly audio = new AudioDirector();
  private commandSequence = 0;
  private paused = false;
  private campaignSetupPending = true;
  private gameSpeed: 1 | 2 | 3 = 1;
  private simulationClock?: Phaser.Time.TimerEvent;
  private inspectedSettlementId = "settlement-capital";
  private selectedBattalionId: string | null = null;
  private selectedCaravanId: string | null = null;
  private readonly selectedBattalionIds = new Set<string>();
  private readonly controlGroups = new Map<number, readonly string[]>();
  private lastControlGroupSlot?: number;
  private lastControlGroupRecallAt = 0;
  private mode: ToolMode = "select";
  private topHud!: Phaser.GameObjects.Rectangle;
  private gameTitleText!: Phaser.GameObjects.Text;
  private lessonBanner!: Phaser.GameObjects.Container;
  private lessonBannerLabel!: Phaser.GameObjects.Text;
  private lastLessonEventId?: string;
  private pauseControl!: Phaser.GameObjects.Container;
  private pauseControlButton!: Phaser.GameObjects.Rectangle;
  private pauseControlLabel!: Phaser.GameObjects.Text;
  private speedControl!: Phaser.GameObjects.Container;
  private speedControlButton!: Phaser.GameObjects.Rectangle;
  private speedControlLabel!: Phaser.GameObjects.Text;
  private networkControl!: Phaser.GameObjects.Container;
  private networkControlLabel!: Phaser.GameObjects.Text;
  private audioControl!: Phaser.GameObjects.Container;
  private audioControlLabel!: Phaser.GameObjects.Text;
  private audioEnabled = true;
  private bookControl!: Phaser.GameObjects.Container;
  private bookControlLabel!: Phaser.GameObjects.Text;
  private bookPanel!: Phaser.GameObjects.Container;
  private bookPanelBody!: Phaser.GameObjects.Text;
  private replayControlLabel!: Phaser.GameObjects.Text;
  private bookPanelExpanded = false;
  private replayReview?: ReplayReviewState;
  private realmControl!: Phaser.GameObjects.Container;
  private realmControlLabel!: Phaser.GameObjects.Text;
  private realmPanel!: Phaser.GameObjects.Container;
  private realmPanelBody!: Phaser.GameObjects.Text;
  private realmPanelExpanded = false;
  private readonly realmSettlementControls: Phaser.GameObjects.Container[] = [];
  private victoryPanel!: Phaser.GameObjects.Container;
  private victoryTitle!: Phaser.GameObjects.Text;
  private victoryDetail!: Phaser.GameObjects.Text;
  private campaignSetupPanel!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private resourceText!: Phaser.GameObjects.Text;
  private intelPanel!: Phaser.GameObjects.Container;
  private minimapPanel!: Phaser.GameObjects.Rectangle;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapTitle!: Phaser.GameObjects.Text;
  private minimapBounds = { x: 0, y: 0 };
  private commandDock!: Phaser.GameObjects.Container;
  private commandTooltip!: Phaser.GameObjects.Container;
  private commandTooltipLabel!: Phaser.GameObjects.Text;
  private heirPanel!: Phaser.GameObjects.Container;
  private heirPanelBg!: Phaser.GameObjects.Rectangle;
  private heirPanelHeader!: Phaser.GameObjects.Rectangle;
  private heirPanelTitle!: Phaser.GameObjects.Text;
  private heirPanelBody!: Phaser.GameObjects.Text;
  private heirPanelExpanded = false;
  private readonly heirFeedbackControls: HeirFeedbackControl[] = [];
  private buildingsPanel!: Phaser.GameObjects.Container;
  private buildingsPanelBg!: Phaser.GameObjects.Rectangle;
  private buildingsPanelHeader!: Phaser.GameObjects.Rectangle;
  private buildingsPanelTitle!: Phaser.GameObjects.Text;
  private buildingsPanelBody!: Phaser.GameObjects.Text;
  private buildingsPanelExpanded = false;
  private selectedBuildingKind: BuildingKind | null = null;
  private readonly buildingTiles = new Map<BuildingKind, BuildingTile>();
  private worldLayer!: Phaser.GameObjects.Container;
  private readonly buildingSprites = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly buildingArtSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly buildingLabelSprites = new Map<string, Phaser.GameObjects.Text>();
  private readonly battalionSprites = new Map<string, Phaser.GameObjects.Container>();
  private readonly caravanSprites = new Map<string, Phaser.GameObjects.Container>();
  private placementPreview?: Phaser.GameObjects.Rectangle;
  private selectionBox?: Phaser.GameObjects.Rectangle;
  private pointerDownWorld?: Phaser.Math.Vector2;
  private selectionDragActive = false;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("MilestoneOneScene");
  }

  preload(): void {
    this.load.image("painted-world", "assets/painterly-battlefield-v1.png");
    this.load.image("building-atlas", "assets/building-atlas-v1.png");
    this.load.image("unit-atlas", "assets/unit-atlas-v1.png");
  }

  create(): void {
    // Reserve lateral camera room for the permanent command panels without moving authoritative world coordinates.
    this.cameras.main.setBounds(-280, 0, 1680, 900);
    this.worldLayer = this.add.container(0, 0);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.bindKeyboardControls();

    this.drawTerrain();
    this.createUi();
    this.paused = true;
    this.pauseControlLabel.setText("SELECT");
    this.scale.on("resize", () => this.layoutUi());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.handlePointerMove(pointer));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.handlePointerUp(pointer));
    this.game.events.on("join-multiplayer", this.connectToMultiplayer, this);
    this.events.once("shutdown", () => {
      this.game.events.off("join-multiplayer", this.connectToMultiplayer, this);
      this.disconnectFromMultiplayer();
    });

    this.configureSimulationClock();
    this.restoreAudioPreference();

    this.assignOpeningLabor();
    this.centerCameraOnSettlement(this.inspectedSettlementId);
    this.renderWorld();
    this.updateUi(["The Crown is established."]);
  }

  private bindKeyboardControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }
    const bind = (key: string, action: () => void) => {
      keyboard.on(`keydown-${key}`, (event: KeyboardEvent) => {
        if (event.repeat || !this.canUseGameShortcut()) {
          return;
        }
        action();
      });
    };

    bind("SPACE", () => this.togglePause());
    bind("B", () => this.toggleBuildingsPanel());
    bind("H", () => this.toggleHeirPanel());
    bind("R", () => this.toggleRealmPanel());
    bind("L", () => this.toggleBookOfLessons());
    bind("M", () => this.enterMoveMode());
    bind("A", () => this.enterAttackMode());
    bind("F", () => this.enterAttackMoveMode());
    bind("ESC", () => this.cancelActiveCommand());
    keyboard.on("keydown", (event: KeyboardEvent) => {
      if (event.repeat || !this.canUseGameShortcut()) {
        return;
      }
      const slot = Number.parseInt(event.key, 10);
      if (!Number.isInteger(slot) || slot < 1 || slot > 9) {
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        this.assignControlGroup(slot);
      } else {
        this.recallControlGroup(slot);
      }
    });
  }

  private canUseGameShortcut(): boolean {
    if (this.campaignSetupPending) {
      return false;
    }
    const activeElement = document.activeElement;
    return !(
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLSelectElement ||
      activeElement instanceof HTMLTextAreaElement
    );
  }

  private enterMoveMode(): void {
    this.mode = "move";
    this.updateUi(["Select a battalion, then designate a destination."]);
  }

  private enterAttackMode(): void {
    this.mode = "attack";
    this.updateUi(["Select a battalion, then designate a target."]);
  }

  private enterAttackMoveMode(): void {
    this.mode = "attack-move";
    this.updateUi(["Select battalions, then designate an advance route."]);
  }

  private cancelActiveCommand(): void {
    if (this.mode === "building") {
      this.cancelPlacement();
      return;
    }
    if (this.bookPanelExpanded || this.realmPanelExpanded || this.heirPanelExpanded || this.buildingsPanelExpanded) {
      this.bookPanelExpanded = false;
      this.realmPanelExpanded = false;
      this.heirPanelExpanded = false;
      this.buildingsPanelExpanded = false;
      this.updateBookOfLessons();
      this.updateRealmPanel();
      this.updateHeirPanel();
      this.updateBuildingsPanel();
      return;
    }
    this.mode = "select";
    this.clearSelection();
    this.updateUi(["Selection cleared."]);
  }

  private toggleBuildingsPanel(): void {
    this.buildingsPanelExpanded = !this.buildingsPanelExpanded;
    this.updateBuildingsPanel();
  }

  private toggleHeirPanel(): void {
    this.heirPanelExpanded = !this.heirPanelExpanded;
    this.updateHeirPanel();
  }

  private toggleRealmPanel(): void {
    this.realmPanelExpanded = !this.realmPanelExpanded;
    this.bookPanelExpanded = false;
    this.updateBookOfLessons();
    this.updateRealmPanel();
  }

  private toggleBookOfLessons(): void {
    this.bookPanelExpanded = !this.bookPanelExpanded;
    this.realmPanelExpanded = false;
    this.updateRealmPanel();
    this.updateBookOfLessons();
  }

  private assignControlGroup(slot: number): void {
    const battalionIds = [...this.selectedBattalionIds].filter(
      (id) => this.simulation.getState().battalions[id]?.ownerEmpireId === "empire-player"
    );
    if (battalionIds.length === 0) {
      this.updateUi([`Select Crown battalions before assigning group ${slot}.`]);
      return;
    }
    this.controlGroups.set(slot, battalionIds);
    this.updateUi([`Group ${slot} assigned to ${battalionIds.length} battalion(s).`]);
  }

  private recallControlGroup(slot: number): void {
    const battalionIds = this.controlGroups.get(slot)?.filter(
      (id) => this.simulation.getState().battalions[id]?.ownerEmpireId === "empire-player"
    ) ?? [];
    if (battalionIds.length === 0) {
      this.controlGroups.delete(slot);
      this.updateUi([`Group ${slot} has no active Crown battalions.`]);
      return;
    }
    this.clearSelection();
    battalionIds.forEach((id) => this.selectedBattalionIds.add(id));
    this.selectedBattalionId = battalionIds[0];
    const recalledTwice = this.lastControlGroupSlot === slot && this.time.now - this.lastControlGroupRecallAt <= 350;
    this.lastControlGroupSlot = slot;
    this.lastControlGroupRecallAt = this.time.now;
    if (recalledTwice) {
      this.centerCameraOnBattalions(battalionIds);
    }
    this.updateUi([`Group ${slot} recalled: ${battalionIds.length} battalion(s) selected.`]);
  }

  private centerCameraOnBattalions(battalionIds: readonly string[]): void {
    const battalions = battalionIds
      .map((id) => this.simulation.getState().battalions[id])
      .filter((battalion): battalion is BattalionState => Boolean(battalion));
    if (battalions.length === 0) {
      return;
    }
    const x = battalions.reduce((total, battalion) => total + battalion.position.x, 0) / battalions.length;
    const y = battalions.reduce((total, battalion) => total + battalion.position.y, 0) / battalions.length;
    this.cameras.main.centerOn(x, y);
  }

  private getActiveControlGroup(): number | undefined {
    for (const [slot, battalionIds] of this.controlGroups) {
      if (
        battalionIds.length === this.selectedBattalionIds.size &&
        battalionIds.every((id) => this.selectedBattalionIds.has(id))
      ) {
        return slot;
      }
    }
    return undefined;
  }

  private pruneControlGroups(state: WorldState): void {
    for (const [slot, battalionIds] of this.controlGroups) {
      const survivingBattalions = battalionIds.filter(
        (id) => state.battalions[id]?.ownerEmpireId === "empire-player"
      );
      if (survivingBattalions.length === 0) {
        this.controlGroups.delete(slot);
      } else if (survivingBattalions.length !== battalionIds.length) {
        this.controlGroups.set(slot, survivingBattalions);
      }
    }
  }

  private clearControlGroups(): void {
    this.controlGroups.clear();
    this.lastControlGroupSlot = undefined;
    this.lastControlGroupRecallAt = 0;
  }

  update(): void {
    const camera = this.cameras.main;
    const speed = 8;

    if (this.cursors?.left.isDown) camera.scrollX -= speed;
    if (this.cursors?.right.isDown) camera.scrollX += speed;
    if (this.cursors?.up.isDown) camera.scrollY -= speed;
    if (this.cursors?.down.isDown) camera.scrollY += speed;
  }

  private drawTerrain(): void {
    const backdrop = this.add.image(700, 450, "painted-world");
    backdrop.setDisplaySize(1400, 900);
    backdrop.setAlpha(0.82);
    this.worldLayer.add(backdrop);

    const graphics = this.add.graphics();
    graphics.fillStyle(TERRAIN_COLORS.grassland, 0.46);
    graphics.fillRect(0, 0, 1400, 900);

    for (let x = 0; x <= 1400; x += 80) {
      graphics.lineStyle(1, 0x293a2b, 0.42);
      graphics.lineBetween(x, 0, x, 900);
    }

    for (let y = 0; y <= 900; y += 80) {
      graphics.lineStyle(1, 0x293a2b, 0.42);
      graphics.lineBetween(0, y, 1400, y);
    }

    for (const zone of this.simulation.getState().terrainZones) {
      this.drawTerrainZone(graphics, zone);
    }

    this.worldLayer.add(graphics);
  }

  private drawTerrainZone(graphics: Phaser.GameObjects.Graphics, zone: TerrainZone): void {
    const { bounds } = zone;
    graphics.fillStyle(TERRAIN_COLORS[zone.kind], 0.64);
    graphics.fillRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 12);
    graphics.lineStyle(2, 0xd6d1af, 0.35);
    graphics.strokeRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 12);

    if (zone.kind === "water") {
      graphics.lineStyle(2, 0x9cc8d5, 0.32);
      for (let x = bounds.x + 20; x < bounds.x + bounds.width - 12; x += 38) {
        graphics.lineBetween(x, bounds.y + 32, x + 22, bounds.y + 32);
        graphics.lineBetween(x + 8, bounds.y + 78, x + 30, bounds.y + 78);
      }
    }

    const label = this.add.text(bounds.x + bounds.width / 2, bounds.y + 14, `[${TERRAIN_SYMBOLS[zone.kind]}] ${zone.label}\n${TERRAIN_DETAILS[zone.kind]}`, {
      fontFamily: "Arial Black, Arial",
      fontSize: "11px",
      color: "#f4f0d5",
      align: "center",
      lineSpacing: 3,
      backgroundColor: "#111818"
    });
    label.setOrigin(0.5, 0);
    this.worldLayer.add(label);
  }

  private createUi(): void {
    this.createTopHud();
    this.createLessonBanner();
    this.createBookOfLessons();
    this.createRealmPanel();
    this.createVictoryPanel();
    this.createCampaignSetupPanel();
    this.createIntelPanel();
    this.createCommandTooltip();
    this.createCommandDock();
    this.createMinimap();
    this.createHeirPanel();
    this.createBuildingsPanel();
    this.layoutUi();
  }

  private createTopHud(): void {
    this.topHud = this.add.rectangle(0, 0, 1, 58, UI_COLORS.panelDeep, 0.96).setOrigin(0);
    this.topHud.setScrollFactor(0);
    this.topHud.setInteractive({ useHandCursor: false });
    this.topHud.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    this.topHud.setDepth(40);

    this.gameTitleText = this.add.text(18, 10, "THE LAST LESSON", {
      fontFamily: "Arial Black, Arial",
      fontSize: "16px",
      color: "#f2d77f"
    });
    this.gameTitleText.setScrollFactor(0).setDepth(41);

    this.pauseControlButton = this.add.rectangle(436, 14, 64, 30, UI_COLORS.command, 1).setOrigin(0);
    this.pauseControlButton.setStrokeStyle(1, UI_COLORS.trim);
    this.pauseControlButton.setInteractive({ useHandCursor: true });
    this.pauseControlButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.togglePause();
    });
    this.pauseControlLabel = this.add.text(446, 23, "PAUSE", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.pauseControl = this.add.container(0, 0, [this.pauseControlButton, this.pauseControlLabel]);
    this.pauseControl.setScrollFactor(0).setDepth(41);

    this.speedControlButton = this.add.rectangle(510, 14, 76, 30, UI_COLORS.command, 1).setOrigin(0);
    this.speedControlButton.setStrokeStyle(1, UI_COLORS.trim);
    this.speedControlButton.setInteractive({ useHandCursor: true });
    this.speedControlButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.cycleGameSpeed();
    });
    this.speedControlLabel = this.add.text(519, 23, "SPEED 1X", {
      fontFamily: "Arial Black, Arial",
      fontSize: "9px",
      color: UI_COLORS.text
    });
    this.speedControl = this.add.container(0, 0, [this.speedControlButton, this.speedControlLabel]);
    this.speedControl.setScrollFactor(0).setDepth(41);

    const networkButton = this.add.rectangle(600, 14, 82, 30, UI_COLORS.command, 1).setOrigin(0);
    networkButton.setStrokeStyle(1, UI_COLORS.trim);
    networkButton.setInteractive({ useHandCursor: true });
    networkButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.openMultiplayerLobby();
    });
    this.networkControlLabel = this.add.text(610, 23, "MULTI", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.networkControl = this.add.container(0, 0, [networkButton, this.networkControlLabel]);
    this.networkControl.setScrollFactor(0).setDepth(41);

    const audioButton = this.add.rectangle(690, 14, 56, 30, UI_COLORS.command, 1).setOrigin(0);
    audioButton.setStrokeStyle(1, UI_COLORS.trim);
    audioButton.setInteractive({ useHandCursor: true });
    audioButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.toggleAudio();
    });
    this.audioControlLabel = this.add.text(701, 23, "SFX ON", {
      fontFamily: "Arial Black, Arial",
      fontSize: "9px",
      color: UI_COLORS.text
    });
    this.audioControl = this.add.container(0, 0, [audioButton, this.audioControlLabel]);
    this.audioControl.setScrollFactor(0).setDepth(41);

    this.resourceText = this.add.text(758, 18, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      color: UI_COLORS.text
    });
    this.resourceText.setScrollFactor(0).setDepth(41);
  }

  private togglePause(): void {
    if (this.remoteAuthority) {
      this.updateUi(["Multiplayer time is controlled by the host."]);
      return;
    }
    if (this.campaignSetupPending) {
      this.updateUi(["Choose a rival doctrine to begin the reign."]);
      return;
    }
    this.paused = !this.paused;
    this.pauseControlLabel.setText(this.paused ? "RESUME" : "PAUSE");
    this.updateUi([this.paused ? "Simulation paused." : "Simulation resumed."]);
  }

  private cycleGameSpeed(): void {
    if (this.remoteAuthority) {
      this.updateUi(["Multiplayer time is controlled by the host."]);
      return;
    }
    this.gameSpeed = this.gameSpeed === 3 ? 1 : ((this.gameSpeed + 1) as 1 | 2 | 3);
    this.speedControlLabel.setText(`SPEED ${this.gameSpeed}X`);
    this.configureSimulationClock();
    this.updateUi([`Simulation speed set to ${this.gameSpeed}X.`]);
  }

  private restoreAudioPreference(): void {
    try {
      this.audioEnabled = window.localStorage.getItem(LOCAL_AUDIO_ENABLED_KEY) !== "false";
    } catch {
      this.audioEnabled = true;
    }
    this.audio.setEnabled(this.audioEnabled);
    this.audioControlLabel.setText(this.audioEnabled ? "SFX ON" : "SFX OFF");
  }

  private toggleAudio(): void {
    this.audioEnabled = !this.audioEnabled;
    this.audio.setEnabled(this.audioEnabled);
    this.audioControlLabel.setText(this.audioEnabled ? "SFX ON" : "SFX OFF");
    try {
      window.localStorage.setItem(LOCAL_AUDIO_ENABLED_KEY, String(this.audioEnabled));
    } catch {
      // Audio preference is optional local presentation state.
    }
    if (this.audioEnabled) {
      this.audio.play("command");
    }
    this.updateUi([this.audioEnabled ? "Tactical sound enabled." : "Tactical sound disabled."]);
  }

  private configureSimulationClock(): void {
    this.simulationClock?.remove(false);
    this.simulationClock = this.time.addEvent({
      delay: WORLD_TICK_MILLISECONDS / this.gameSpeed,
      loop: true,
      callback: () => {
        if (!this.paused) {
          this.advanceSimulation();
        }
      }
    });
  }

  private advanceSimulation(): void {
    if (this.remoteAuthority) {
      return;
    }
    if (this.replayReview && this.simulation.getState().tick >= this.replayReview.targetTick) {
      this.paused = true;
      this.pauseControlLabel.setText("REPLAY END");
      this.updateUi(["Replay reached the live reign's current tick. Return to continue commanding."]);
      return;
    }
    const result = this.simulation.tick();
    if (!this.replayReview) {
      this.recordAutoSave(result.tick);
    }
    this.renderWorld();
    this.playCombatFeedback(result.events);
    this.playMiracleFeedback(result.events);
    if (this.replayReview && result.tick >= this.replayReview.targetTick) {
      this.paused = true;
      this.pauseControlLabel.setText("REPLAY END");
      this.updateUi(["Replay reached the live reign's current tick. Return to continue commanding."]);
      return;
    }
    this.updateUi(result.events.map((event) => event.type).slice(-5));
  }

  private openMultiplayerLobby(): void {
    this.game.events.emit("open-multiplayer-lobby", {
      scenarioId: this.campaignScenario,
      rivalDifficulty: this.campaignDifficulty
    });
  }

  private connectToMultiplayer(request: MultiplayerConnectRequest): void {
    this.disconnectFromMultiplayer();
    this.campaignScenario = request.scenarioId;
    this.campaignDifficulty = request.rivalDifficulty;
    this.campaignSetupPending = false;
    this.campaignSetupPanel.setVisible(false);
    this.replayReview = undefined;
    this.paused = false;
    this.pauseControlLabel.setText("HOST");
    this.speedControlLabel.setText("HOST SPEED");
    this.networkControlLabel.setText("ONLINE");
    this.clearSelection();
    this.clearControlGroups();

    const authority = new RemoteAuthorityClient();
    this.remoteAuthority = authority;
    this.remoteUnsubscribe = authority.onMessage((message) => this.handleRemoteMessage(message));
    this.remoteStatusUnsubscribe = authority.onConnectionState((state) => this.handleRemoteConnectionState(state));
    authority.connect(request.url, {
      type: "join-match",
      roomId: request.roomId,
      clientId: request.clientId,
      empireId: "empire-player",
      setup: {
        seed: 777,
        scenarioId: request.scenarioId,
        rivalDifficulty: request.rivalDifficulty
      }
    });
    this.updateUi([`Connecting to ${request.roomId.toUpperCase()}...`]);
  }

  private disconnectFromMultiplayer(): void {
    this.remoteUnsubscribe?.();
    this.remoteUnsubscribe = undefined;
    this.remoteStatusUnsubscribe?.();
    this.remoteStatusUnsubscribe = undefined;
    this.remoteAuthority?.disconnect();
    this.remoteAuthority = undefined;
    this.remoteRoomId = undefined;
    if (this.networkControlLabel) {
      this.networkControlLabel.setText("MULTI");
    }
    if (this.speedControlLabel) {
      this.speedControlLabel.setText(`SPEED ${this.gameSpeed}X`);
    }
  }

  private handleRemoteMessage(message: ServerMessage): void {
    if (message.type === "joined-match") {
      this.remoteRoomId = message.roomId;
      this.applyRemoteSnapshot(message.snapshot);
      this.updateUi([`Joined ${message.roomId.toUpperCase()} as the Crown.`]);
      return;
    }
    if (message.type === "snapshot") {
      this.applyRemoteSnapshot(message.snapshot);
      return;
    }
    if (message.type === "command-accepted") {
      this.updateUi([
        `Host scheduled ${message.command.type.replaceAll("-", " ")} for tick ${message.command.tick}.`
      ]);
      return;
    }
    this.updateUi([message.message]);
  }

  private handleRemoteConnectionState(state: RemoteConnectionState): void {
    if (state === "connected") {
      this.networkControlLabel.setText("ONLINE");
      return;
    }
    // Do not resume a disconnected match locally: the host owns its only valid state.
    this.networkControlLabel.setText("REJOIN");
    this.pauseControlLabel.setText("FROZEN");
    this.speedControlLabel.setText("FROZEN");
    this.updateUi(["Multiplayer host disconnected. The reign is frozen; use REJOIN to reconnect."]);
  }

  private applyRemoteSnapshot(snapshot: AuthoritySnapshot): void {
    this.simulation = new Simulation(structuredClone(snapshot.state), undefined, {
      eventLog: structuredClone(snapshot.recentEvents)
    });
    this.inspectedSettlementId = this.getActiveControlledSettlement()?.id ?? "settlement-capital";
    this.lastLessonEventId = undefined;
    this.lessonBanner.setVisible(false);
    this.renderWorld();
    this.playCombatFeedback(snapshot.recentEvents);
    this.playMiracleFeedback(snapshot.recentEvents);
    this.updateUi(snapshot.recentEvents.map((event) => event.type).slice(-5));
  }

  private createLessonBanner(): void {
    const background = this.add.rectangle(0, 0, 420, 42, UI_COLORS.panelDeep, 0.96).setOrigin(0);
    background.setStrokeStyle(1, UI_COLORS.accent);
    this.lessonBannerLabel = this.add.text(14, 8, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: "#f2d77f",
      wordWrap: { width: 390 }
    });
    this.lessonBanner = this.add.container(0, 0, [background, this.lessonBannerLabel]);
    this.lessonBanner.setScrollFactor(0).setDepth(65).setVisible(false);
  }

  private updateLessonBanner(): void {
    const lessonEvent = [...this.simulation.getEventLog()]
      .reverse()
      .find((event) =>
        event.type === "doctrine-observed" ||
        event.type === "doctrine-reinforced" ||
        event.type === "doctrine-disciplined"
      );
    if (!lessonEvent || lessonEvent.id === this.lastLessonEventId) {
      return;
    }

    this.lastLessonEventId = lessonEvent.id;
    const heir = typeof lessonEvent.payload.heirId === "string" ? this.simulation.getState().heirs[lessonEvent.payload.heirId] : undefined;
    const doctrine =
      typeof lessonEvent.payload.doctrineId === "string"
        ? this.simulation.getState().doctrines[lessonEvent.payload.doctrineId]
        : undefined;
    const action = doctrine?.preferredAction.toUpperCase() ?? "A NEW CONVICTION";
    const confidence = doctrine?.confidence ?? lessonEvent.payload.confidence ?? 0;
    const status =
      lessonEvent.type === "doctrine-reinforced"
        ? "REINFORCED"
        : lessonEvent.type === "doctrine-disciplined"
          ? "QUESTIONED"
          : "OBSERVED";
    this.lessonBannerLabel.setText(
      `LESSON ${status} // ${heir?.name.toUpperCase() ?? "HEIR"}\n${action}  ${confidence}%`
    );
    this.tweens.killTweensOf(this.lessonBanner);
    this.lessonBanner.setVisible(true).setAlpha(1);
    this.tweens.add({
      targets: this.lessonBanner,
      alpha: 0,
      delay: 2600,
      duration: 450,
      onComplete: () => this.lessonBanner.setVisible(false)
    });
  }

  private createBookOfLessons(): void {
    const control = this.add.rectangle(190, 14, 118, 30, UI_COLORS.command, 1).setOrigin(0);
    control.setStrokeStyle(1, UI_COLORS.trim);
    control.setInteractive({ useHandCursor: true });
    control.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.toggleBookOfLessons();
    });
    this.bookControlLabel = this.add.text(200, 23, "BOOK [+]", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.bookControl = this.add.container(0, 0, [control, this.bookControlLabel]);
    this.bookControl.setScrollFactor(0).setDepth(41);

    const background = this.add.rectangle(0, 0, 470, 502, UI_COLORS.panelDeep, 0.98).setOrigin(0);
    background.setStrokeStyle(2, UI_COLORS.accent);
    background.setInteractive({ useHandCursor: false });
    background.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    const title = this.add.text(18, 14, "BOOK OF LESSONS", {
      fontFamily: "Arial Black, Arial",
      fontSize: "16px",
      color: "#f2d77f"
    });
    this.bookPanelBody = this.add.text(18, 48, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: UI_COLORS.text,
      lineSpacing: 4,
      wordWrap: { width: 434 }
    });
    const saveButton = this.add.rectangle(18, 360, 204, 34, UI_COLORS.commandActive, 1).setOrigin(0);
    saveButton.setStrokeStyle(1, UI_COLORS.trim);
    saveButton.setInteractive({ useHandCursor: true });
    saveButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.saveLocalGame();
    });
    const loadButton = this.add.rectangle(248, 360, 204, 34, UI_COLORS.command, 1).setOrigin(0);
    loadButton.setStrokeStyle(1, UI_COLORS.trim);
    loadButton.setInteractive({ useHandCursor: true });
    loadButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.loadLocalGame();
    });
    const saveLabel = this.add.text(30, 371, "SAVE LOCAL", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const loadLabel = this.add.text(260, 371, "LOAD LOCAL", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const verifyButton = this.add.rectangle(18, 404, 434, 34, UI_COLORS.command, 1).setOrigin(0);
    verifyButton.setStrokeStyle(1, UI_COLORS.trim);
    verifyButton.setInteractive({ useHandCursor: true });
    verifyButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.verifyCurrentReplay();
    });
    const verifyLabel = this.add.text(150, 415, "VERIFY REPLAY", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const replayButton = this.add.rectangle(18, 448, 434, 34, UI_COLORS.commandActive, 1).setOrigin(0);
    replayButton.setStrokeStyle(1, UI_COLORS.trim);
    replayButton.setInteractive({ useHandCursor: true });
    replayButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.toggleReplayReview();
    });
    this.replayControlLabel = this.add.text(164, 459, "REVIEW REIGN", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.bookPanel = this.add.container(0, 0, [
      background,
      title,
      this.bookPanelBody,
      saveButton,
      loadButton,
      saveLabel,
      loadLabel,
      verifyButton,
      verifyLabel,
      replayButton,
      this.replayControlLabel
    ]);
    this.bookPanel.setScrollFactor(0).setDepth(70).setVisible(false);
    this.updateBookOfLessons();
  }

  private createRealmPanel(): void {
    const control = this.add.rectangle(318, 14, 108, 30, UI_COLORS.command, 1).setOrigin(0);
    control.setStrokeStyle(1, UI_COLORS.trim);
    control.setInteractive({ useHandCursor: true });
    control.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.toggleRealmPanel();
    });
    this.realmControlLabel = this.add.text(328, 23, "REALM [+]", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.realmControl = this.add.container(0, 0, [control, this.realmControlLabel]);
    this.realmControl.setScrollFactor(0).setDepth(41);

    const background = this.add.rectangle(0, 0, 384, 238, UI_COLORS.panelDeep, 0.98).setOrigin(0);
    background.setStrokeStyle(2, UI_COLORS.accent);
    background.setInteractive({ useHandCursor: false });
    background.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    const title = this.add.text(18, 14, "REALM // CROWN DOMAINS", {
      fontFamily: "Arial Black, Arial",
      fontSize: "15px",
      color: "#f2d77f"
    });
    this.realmPanelBody = this.add.text(18, 42, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      color: UI_COLORS.muted
    });
    this.realmPanel = this.add.container(0, 0, [background, title, this.realmPanelBody]);
    this.realmPanel.setScrollFactor(0).setDepth(70).setVisible(false);
  }

  private updateRealmPanel(): void {
    this.realmPanel.setVisible(this.realmPanelExpanded);
    this.realmControlLabel.setText(this.realmPanelExpanded ? "REALM [-]" : "REALM [+]");

    this.realmSettlementControls.splice(0).forEach((control) => control.destroy());
    if (!this.realmPanelExpanded) {
      return;
    }

    const state = this.simulation.getState();
    const settlements = state.empires["empire-player"].settlementIds
      .map((settlementId) => state.settlements[settlementId])
      .filter((settlement): settlement is SettlementState => Boolean(settlement));
    this.realmPanelBody.setText(
      settlements.length > 1
        ? "SELECT A CROWN SEAT TO FOCUS ITS GOVERNOR AND COMMANDS."
        : "CONQUER A RIVAL THRONE TO CREATE A NEW CROWN SEAT."
    );

    settlements.slice(0, 4).forEach((settlement, index) => {
      const y = 70 + index * 40;
      const active = settlement.id === this.getActiveControlledSettlement()?.id;
      const governor = state.heirs[settlement.heirId];
      const button = this.add.rectangle(18, y, 348, 32, active ? UI_COLORS.commandActive : UI_COLORS.command, 1).setOrigin(0);
      button.setStrokeStyle(active ? 2 : 1, active ? UI_COLORS.accent : UI_COLORS.trim);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.selectCrownSeat(settlement.id, true);
      });
      const label = this.add.text(28, y + 6, this.getSettlementDisplayName(settlement.id), {
        fontFamily: "Arial Black, Arial",
        fontSize: "10px",
        color: UI_COLORS.text
      });
      const detail = this.add.text(164, y + 7, `${governor?.name.toUpperCase() ?? "UNASSIGNED"} // ${settlement.population.citizens}C ${settlement.population.militarizedCitizens}M`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        color: "#c1cdc2"
      });
      const row = this.add.container(0, 0, [button, label, detail]);
      this.realmPanel.add(row);
      this.realmSettlementControls.push(row);
    });

    this.layoutUi();
  }

  private selectCrownSeat(settlementId: string, focusCamera: boolean): void {
    const state = this.simulation.getState();
    const settlement = state.settlements[settlementId];
    if (!settlement || settlement.ownerEmpireId !== "empire-player") {
      this.updateUi(["Only Crown castles can establish a command seat."]);
      return;
    }

    this.inspectedSettlementId = settlement.id;
    if (focusCamera) {
      this.centerCameraOnSettlement(settlement.id);
    }
    this.realmPanelExpanded = false;
    this.updateUi([`Command seat focused on ${this.getSettlementDisplayName(settlement.id)}.`]);
  }

  private centerCameraOnSettlement(settlementId: string): void {
    const state = this.simulation.getState();
    const settlement = state.settlements[settlementId];
    const castle = settlement ? state.buildings[settlement.centralBuildingId] : undefined;
    if (castle) {
      this.cameras.main.centerOn(castle.position.x, castle.position.y);
    }
  }

  private createVictoryPanel(): void {
    const background = this.add.rectangle(0, 0, 420, 260, UI_COLORS.panelDeep, 0.98).setOrigin(0);
    background.setStrokeStyle(2, UI_COLORS.accent);
    background.setInteractive({ useHandCursor: false });
    background.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    this.victoryTitle = this.add.text(22, 26, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "22px",
      color: "#f2d77f",
      align: "center",
      wordWrap: { width: 376 }
    });
    this.victoryTitle.setOrigin(0.5, 0).setPosition(210, 26);
    this.victoryDetail = this.add.text(22, 86, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
      color: UI_COLORS.text,
      align: "center",
      wordWrap: { width: 376 }
    });
    this.victoryDetail.setOrigin(0.5, 0).setPosition(210, 86);
    const restartButton = this.add.rectangle(110, 204, 200, 34, UI_COLORS.commandActive, 1).setOrigin(0);
    restartButton.setStrokeStyle(1, UI_COLORS.trim);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.restartCampaign();
    });
    const restartLabel = this.add.text(132, 215, "BEGIN ANOTHER REIGN", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.victoryPanel = this.add.container(0, 0, [background, this.victoryTitle, this.victoryDetail, restartButton, restartLabel]);
    this.victoryPanel.setScrollFactor(0).setDepth(90).setVisible(false);
  }

  private createCampaignSetupPanel(): void {
    const hasSavedReign = this.hasLocalSave();
    const panelHeight = hasSavedReign ? 446 : 402;
    const background = this.add.rectangle(0, 0, 470, panelHeight, UI_COLORS.panelDeep, 0.98).setOrigin(0);
    background.setStrokeStyle(2, UI_COLORS.accent);
    background.setInteractive({ useHandCursor: false });
    background.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    const title = this.add.text(20, 18, "CAMPAIGN THEATRE", {
      fontFamily: "Arial Black, Arial",
      fontSize: "19px",
      color: "#f2d77f"
    });
    const subtitle = this.add.text(20, 50, SCENARIO_PROFILES[this.campaignScenario].summary.toUpperCase(), {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: UI_COLORS.muted
    });
    const controls: Phaser.GameObjects.GameObject[] = [background, title, subtitle];
    const scenarios: ScenarioId[] = ["crownfall", "rivergate", "ashen-oath", "stonewall"];
    scenarios.forEach((scenario, index) => {
      const profile = SCENARIO_PROFILES[scenario];
      const x = 20 + (index % 2) * 214;
      const y = 82 + Math.floor(index / 2) * 70;
      const selected = scenario === this.campaignScenario;
      const button = this.add.rectangle(x, y, 206, 56, selected ? UI_COLORS.commandActive : UI_COLORS.command, 1).setOrigin(0);
      button.setStrokeStyle(selected ? 2 : 1, selected ? UI_COLORS.accent : UI_COLORS.trim);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.selectCampaignScenario(scenario);
      });
      const label = this.add.text(x + 10, y + 9, profile.label, {
        fontFamily: "Arial Black, Arial",
        fontSize: "10px",
        color: UI_COLORS.text,
        wordWrap: { width: 184 }
      });
      const detail = this.add.text(x + 10, y + 27, profile.summary.split(".")[0].toUpperCase(), {
        fontFamily: "Arial, sans-serif",
        fontSize: "8px",
        color: UI_COLORS.muted,
        wordWrap: { width: 184 }
      });
      controls.push(button, label, detail);
    });
    const beginPrompt = this.add.text(20, 222, "BEGIN REIGN // SELECT RIVAL DOCTRINE", {
      fontFamily: "Arial Black, Arial",
      fontSize: "9px",
      color: "#e2bd61"
    });
    controls.push(beginPrompt);
    const difficulties: RivalDifficulty[] = ["disciple", "rival", "architect"];
    difficulties.forEach((difficulty, index) => {
      const profile = RIVAL_DIFFICULTY_PROFILES[difficulty];
      const x = 20 + index * 146;
      const button = this.add.rectangle(x, 242, 136, 108, UI_COLORS.command, 1).setOrigin(0);
      button.setStrokeStyle(1, UI_COLORS.trim);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.startCampaign(difficulty);
      });
      const label = this.add.text(x + 12, 259, `BEGIN // ${profile.label}`, {
        fontFamily: "Arial Black, Arial",
        fontSize: "10px",
        color: UI_COLORS.text,
        wordWrap: { width: 112 }
      });
      const detail = this.add.text(
        x + 12,
        298,
        `GRACE ${profile.openingGraceTicks} TICKS\nLEARNING +${profile.doctrineConfidenceGain}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          color: UI_COLORS.muted,
          lineSpacing: 3
        }
      );
      controls.push(button, label, detail);
    });
    if (hasSavedReign) {
      const continueButton = this.add.rectangle(20, 366, 430, 42, UI_COLORS.commandActive, 1).setOrigin(0);
      continueButton.setStrokeStyle(1, UI_COLORS.trim);
      continueButton.setInteractive({ useHandCursor: true });
      continueButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.loadLocalGame();
      });
      const continueLabel = this.add.text(140, 380, "CONTINUE LOCAL REIGN", {
        fontFamily: "Arial Black, Arial",
        fontSize: "11px",
        color: UI_COLORS.text
      });
      controls.push(continueButton, continueLabel);
    }
    this.campaignSetupPanel = this.add.container(0, 0, controls);
    this.campaignSetupPanel.setSize(470, panelHeight);
    this.campaignSetupPanel.setScrollFactor(0).setDepth(100).setVisible(true);
  }

  private selectCampaignScenario(scenario: ScenarioId): void {
    if (this.campaignScenario === scenario) {
      return;
    }
    this.campaignScenario = scenario;
    this.campaignSetupPanel.destroy(true);
    this.createCampaignSetupPanel();
    this.layoutUi();
  }

  private startCampaign(difficulty: RivalDifficulty): void {
    this.campaignDifficulty = difficulty;
    this.campaignSetupPending = false;
    this.campaignSetupPanel.setVisible(false);
    this.restartCampaign(`${RIVAL_DIFFICULTY_PROFILES[difficulty].label} rival doctrine selected.`);
  }

  private restartCampaign(message = "A new reign begins."): void {
    this.disconnectFromMultiplayer();
    this.campaignInitialWorld = createInitialWorld(777, this.campaignDifficulty, this.campaignScenario);
    this.simulation = new Simulation(structuredClone(this.campaignInitialWorld));
    this.commandSequence = 0;
    this.replayReview = undefined;
    this.paused = false;
    this.inspectedSettlementId = "settlement-capital";
    this.lastLessonEventId = undefined;
    this.lessonBanner.setVisible(false);
    this.pauseControlLabel.setText("PAUSE");
    this.campaignSetupPending = false;
    this.campaignSetupPanel.setVisible(false);
    this.clearSelection();
    this.clearControlGroups();
    this.selectedBuildingKind = null;
    this.mode = "select";
    this.clearPlacementPreview();
    this.assignOpeningLabor();
    this.centerCameraOnSettlement(this.inspectedSettlementId);
    this.renderWorld();
    this.updateUi([message]);
  }

  private assignOpeningLabor(): void {
    const settlement = this.simulation.getState().settlements["settlement-capital"];
    if (!settlement) {
      return;
    }
    const population = settlement.population;
    const authoredLabor =
      population.farmers +
        population.builders +
        population.lumberjacks +
        population.miners +
        population.luxuryWorkers >
      0;
    this.issueCommand({
      type: "assign-labor",
      payload: {
        settlementId: settlement.id,
        farmers: authoredLabor ? population.farmers : 8,
        builders: authoredLabor ? population.builders : 4,
        lumberjacks: authoredLabor ? population.lumberjacks : 6,
        miners: authoredLabor ? population.miners : 0,
        luxuryWorkers: authoredLabor ? population.luxuryWorkers : 0
      }
    });
  }

  private updateVictoryPanel(): void {
    const state = this.simulation.getState();
    const report = createReignReport(state, this.simulation.getEventLog(), "empire-player");
    if (!report) {
      this.victoryPanel.setVisible(false);
      return;
    }
    const playerWon = report.winnerEmpireId === "empire-player";
    this.victoryTitle.setText(playerWon ? "THE CROWN ASCENDS" : "THE CROWN HAS FALLEN");
    this.victoryDetail.setText(
      playerWon
        ? [
            "Every rival throne has fallen. Your lessons now govern the realm.",
            "",
            `REIGN ${formatReignDuration(report.durationSeconds)}  //  THRONES ${report.thronesCaptured}`,
            `LESSONS ${report.lessonsTaught}  //  HEIRS GUIDED ${report.heirsGuided}`,
            `FAITH HELD ${report.faithHeld}`
          ].join("\\n")
        : [
            "The rival crown holds every throne. A different doctrine must rise.",
            "",
            `REIGN ${formatReignDuration(report.durationSeconds)}  //  THRONES ${report.thronesCaptured}`,
            `LESSONS ${report.lessonsTaught}  //  HEIRS GUIDED ${report.heirsGuided}`,
            `FAITH HELD ${report.faithHeld}`
          ].join("\\n")
    );
    this.victoryPanel.setVisible(true);
  }

  private updateBookOfLessons(): void {
    this.bookPanel.setVisible(this.bookPanelExpanded);
    this.bookControlLabel.setText(this.bookPanelExpanded ? "BOOK [-]" : "BOOK [+]");
    this.replayControlLabel.setText(this.replayReview ? "RETURN TO REIGN" : "REVIEW REIGN");
    if (!this.bookPanelExpanded) {
      return;
    }
    const state = this.simulation.getState();
    const settlement = this.getActiveSettlement();
    const heir = this.getActiveHeir();
    const doctrines = this.getHeirDoctrines(heir).slice(0, 4);
    const recentEvents = this.simulation
      .getEventLog()
      .slice(-6)
      .map((event) => `${event.tick}: ${event.type.replaceAll("-", " ").toUpperCase()}`);
    this.bookPanelBody.setText(
      [
      `CURRENT SEAT: ${this.getSettlementDisplayName(settlement?.id)}`,
      `CURRENT HEIR: ${heir?.name.toUpperCase() ?? "UNASSIGNED"}`,
      `STATE: ${heir?.mode.toUpperCase() ?? "NONE"}  //  TRUST: ${heir?.trust ?? 0}`,
      `RIVAL DOCTRINE: ${RIVAL_DIFFICULTY_PROFILES[state.rivalDifficulty].label}`,
      `FAITH: ${settlement?.internalFaith ?? 0}  //  RIVAL PRESSURE: ${settlement?.externalReligiousPressure ?? 0}`,
        "",
        "CONVICTIONS:",
        ...(doctrines.length
          ? doctrines.map((doctrine) => `- ${doctrine.preferredAction} (${doctrine.confidence}%)`)
          : ["- No conviction has been observed."]),
        "",
        "RECENT HISTORY:",
        ...(recentEvents.length ? recentEvents : ["- No events recorded."])
      ].join("\n")
    );
  }

  private saveLocalGame(): void {
    try {
      window.localStorage.setItem(LOCAL_SAVE_KEY, serializeSaveGame(createSaveGame(this.simulation)));
      window.localStorage.setItem(LOCAL_REPLAY_ORIGIN_KEY, JSON.stringify(this.campaignInitialWorld));
      this.updateUi(["Local save recorded in the Book of Lessons."]);
    } catch {
      this.updateUi(["Local save could not be recorded in this browser."]);
    }
  }

  private loadLocalGame(): void {
    try {
      const serialized = window.localStorage.getItem(LOCAL_SAVE_KEY);
      if (!serialized) {
        this.updateUi(["No local save is available."]);
        return;
      }
      this.disconnectFromMultiplayer();
      this.simulation = restoreSaveGame(deserializeSaveGame(serialized));
      this.campaignDifficulty = this.simulation.getState().rivalDifficulty;
      this.campaignScenario = this.simulation.getState().scenarioId;
      this.restoreReplayOrigin();
      this.campaignSetupPending = false;
      this.campaignSetupPanel.setVisible(false);
      this.paused = false;
      this.pauseControlLabel.setText("PAUSE");
      this.inspectedSettlementId = "settlement-capital";
      this.lastLessonEventId = undefined;
      this.lessonBanner.setVisible(false);
      this.replayReview = undefined;
      this.clearSelection();
      this.clearControlGroups();
      this.centerCameraOnSettlement(this.inspectedSettlementId);
      this.renderWorld();
      this.updateUi(["Local save restored."]);
    } catch {
      this.updateUi(["Local save could not be restored."]);
    }
  }

  private hasLocalSave(): boolean {
    try {
      return window.localStorage.getItem(LOCAL_SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  private recordAutoSave(tick: number): void {
    if (tick % AUTO_SAVE_INTERVAL_TICKS !== 0) {
      return;
    }
    try {
      window.localStorage.setItem(LOCAL_SAVE_KEY, serializeSaveGame(createSaveGame(this.simulation)));
      window.localStorage.setItem(LOCAL_REPLAY_ORIGIN_KEY, JSON.stringify(this.campaignInitialWorld));
    } catch {
      // Saving is optional presentation persistence and must never interrupt simulation.
    }
  }

  private restoreReplayOrigin(): void {
    try {
      const serialized = window.localStorage.getItem(LOCAL_REPLAY_ORIGIN_KEY);
      if (!serialized) {
        return;
      }
      const candidate = JSON.parse(serialized) as Partial<WorldState>;
      if (typeof candidate.tick === "number" && typeof candidate.seed === "number" && candidate.empires && candidate.settlements) {
        this.campaignInitialWorld = candidate as WorldState;
      }
    } catch {
      // The active save remains valid even if its optional replay origin was not retained.
    }
  }

  private verifyCurrentReplay(): void {
    const state = this.simulation.getState();
    const replay = runReplayRecord(
      createReplayRecord(this.campaignInitialWorld, this.simulation.getCommandLog(), state.tick)
    );
    const stateMatches = replay.finalStateHash === stableHash(state);
    const eventsMatch = replay.eventLogHash === stableHash(this.simulation.getEventLog());
    this.updateUi([
      stateMatches && eventsMatch
        ? "Replay verified: command history reproduces this reign."
        : "Replay mismatch: this reign needs a new archived opening."
    ]);
  }

  private toggleReplayReview(): void {
    if (this.replayReview) {
      this.simulation = restoreSaveGame(this.replayReview.liveSave);
      this.commandSequence = this.replayReview.commandSequence;
      this.replayReview = undefined;
      this.paused = true;
      this.pauseControlLabel.setText("RESUME");
      this.clearSelection();
      this.clearControlGroups();
      this.renderWorld();
      this.updateUi(["Returned to the live reign. Simulation remains paused."]);
      return;
    }
    if (this.campaignSetupPending) {
      this.updateUi(["Choose a campaign opening before reviewing a reign."]);
      return;
    }

    const liveSave = createSaveGame(this.simulation);
    this.replayReview = {
      liveSave,
      commandSequence: this.commandSequence,
      targetTick: this.simulation.getState().tick
    };
    this.simulation = new Simulation(structuredClone(this.campaignInitialWorld));
    for (const command of liveSave.commandLog) {
      this.simulation.enqueueCommand(structuredClone(command));
    }
    this.paused = true;
    this.pauseControlLabel.setText("PLAY REPLAY");
    this.clearSelection();
    this.clearControlGroups();
    this.renderWorld();
    this.updateUi(["Replay review opened at tick 0. Resume or advance to study the reign."]);
  }

  private createIntelPanel(): void {
    const background = this.add.rectangle(0, 0, 332, 204, UI_COLORS.panel, 0.95).setOrigin(0);
    background.setStrokeStyle(1, UI_COLORS.trim);
    background.setInteractive({ useHandCursor: false });
    background.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    const title = this.add.text(14, 10, "TACTICAL UPLINK", {
      fontFamily: "Arial Black, Arial",
      fontSize: "11px",
      color: "#f2d77f"
    });
    const divider = this.add.rectangle(14, 30, 304, 1, UI_COLORS.trim, 1).setOrigin(0);
    this.statusText = this.add.text(14, 42, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: UI_COLORS.text,
      lineSpacing: 4
    });
    this.eventText = this.add.text(14, 144, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: UI_COLORS.muted,
      lineSpacing: 3,
      wordWrap: { width: 302 }
    });
    this.intelPanel = this.add.container(0, 0, [background, title, divider, this.statusText, this.eventText]);
    this.intelPanel.setScrollFactor(0).setDepth(40);
  }

  private createCommandDock(): void {
    const background = this.add.rectangle(0, 0, 410, 434, UI_COLORS.panel, 0.96).setOrigin(0);
    background.setStrokeStyle(1, UI_COLORS.trim);
    background.setInteractive({ useHandCursor: false });
    background.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    const title = this.add.text(14, 9, "COMMAND ORDERS", {
      fontFamily: "Arial Black, Arial",
      fontSize: "11px",
      color: "#f2d77f"
    });
    const divider = this.add.rectangle(14, 29, 382, 1, UI_COLORS.trim, 1).setOrigin(0);
    this.commandDock = this.add.container(0, 0, [background, title, divider]);
    this.commandDock.setScrollFactor(0).setDepth(40);

    this.addCommandButton(14, 42, "SUPPLY", "WAGON", () => this.createCaravan());
    this.addCommandButton(110, 42, "MOVE", "UNIT", () => this.enterMoveMode());
    this.addCommandButton(206, 42, "ATTACK", "TARGET", () => this.enterAttackMode(), UI_COLORS.danger);
    this.addCommandButton(302, 42, "RETREAT", "TO CROWN", () => this.retreatSelectedBattalions(), UI_COLORS.danger);
    this.addLaborButton(14, "FOOD", () => this.setLaborFocus("farmers"));
    this.addLaborButton(90, "WOOD", () => this.setLaborFocus("lumberjacks"));
    this.addLaborButton(166, "IRON", () => this.setLaborFocus("miners"));
    this.addLaborButton(242, "BUILD", () => this.setLaborFocus("builders"));
    this.addLaborButton(318, "LUX", () => this.setLaborFocus("luxuryWorkers"));
    this.addCommandButton(14, 150, "MILITIA", "FOOD 8", () => this.createBattalion("militia"));
    this.addCommandButton(110, 150, "SPEARS", "IRON 8", () => this.createBattalion("spears"));
    this.addCommandButton(206, 150, "ARCHERS", "WOOD 8", () => this.createBattalion("archers"));
    this.addCommandButton(302, 150, "RAIDERS", "8W 8I", () => this.createBattalion("raiders"));
    this.addWideCommandButton(14, 204, "BLESS HARVEST", "12 FAITH", () => this.castBlessHarvest());
    this.addWideCommandButton(210, 204, "INSPIRE ARMY", "16 FAITH", () => this.castInspireBattalions());
    this.addCommandButton(14, 258, "ASSIMILATE", "4 CAPTIVES", () => this.assimilateCaptives());
    this.addCommandButton(110, 258, "RELEASE", "4 CAPTIVES", () => this.releaseCaptives());
    this.addWideCommandButton(210, 258, "DISEMBARK", "SELECTED CARAVAN", () => this.disembarkCaravan());
    this.addWideCommandButton(14, 312, "GARRISON", "NEAREST DEFENSE WORKS", () => this.garrisonSelectedBattalions());
    this.addWideCommandButton(210, 312, "WARSHIP", "18W 4I / TOWN SQUARE", () => this.createShip());
    this.addCommandButton(14, 366, "HOUNDS", "8F 4W", () => this.createBattalion("hounds"));
    this.addWideCommandButton(110, 366, "DIVINE JUDGMENT", "18 FAITH / RELIGIOUS WARD", () => this.castDivineJudgment());
  }

  private createCommandTooltip(): void {
    const background = this.add.rectangle(0, 0, 248, 42, UI_COLORS.panelDeep, 0.97).setOrigin(0);
    background.setStrokeStyle(1, UI_COLORS.accent);
    this.commandTooltipLabel = this.add.text(10, 8, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      color: UI_COLORS.text,
      wordWrap: { width: 228 }
    });
    this.commandTooltip = this.add.container(0, 0, [background, this.commandTooltipLabel]);
    this.commandTooltip.setScrollFactor(0).setDepth(80).setVisible(false);
  }

  private showCommandTooltip(pointer: Phaser.Input.Pointer, message: string): void {
    const x = Phaser.Math.Clamp(pointer.x + 12, 8, Math.max(8, this.scale.width - 256));
    const y = Phaser.Math.Clamp(pointer.y - 50, 64, Math.max(64, this.scale.height - 50));
    this.commandTooltipLabel.setText(message);
    this.commandTooltip.setPosition(x, y).setVisible(true);
  }

  private hideCommandTooltip(): void {
    this.commandTooltip.setVisible(false);
  }

  private createMinimap(): void {
    this.minimapPanel = this.add.rectangle(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT, UI_COLORS.panelDeep, 0.95).setOrigin(0);
    this.minimapPanel.setStrokeStyle(1, UI_COLORS.trim);
    this.minimapPanel.setInteractive({ useHandCursor: true });
    this.minimapPanel.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      const innerX = Phaser.Math.Clamp(pointer.x - this.minimapBounds.x - 8, 0, MINIMAP_WIDTH - 16);
      const innerY = Phaser.Math.Clamp(pointer.y - this.minimapBounds.y - 28, 0, MINIMAP_HEIGHT - 36);
      this.cameras.main.centerOn(
        (innerX / (MINIMAP_WIDTH - 16)) * 1400,
        (innerY / (MINIMAP_HEIGHT - 36)) * 900
      );
      this.updateMinimap();
    });
    this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(45);
    this.minimapTitle = this.add.text(10, 8, "MINIMAP", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: "#f2d77f"
    });
    this.minimapPanel.setScrollFactor(0).setDepth(44);
    this.minimapTitle.setScrollFactor(0).setDepth(46);
  }

  private updateMinimap(): void {
    if (!this.minimapGraphics) {
      return;
    }
    const state = this.simulation.getState();
    const x = this.minimapBounds.x + 8;
    const y = this.minimapBounds.y + 28;
    const width = MINIMAP_WIDTH - 16;
    const height = MINIMAP_HEIGHT - 36;
    const mapX = (value: number) => x + (value / 1400) * width;
    const mapY = (value: number) => y + (value / 900) * height;

    this.minimapGraphics.clear();
    this.minimapGraphics.fillStyle(TERRAIN_COLORS.grassland, 1);
    this.minimapGraphics.fillRect(x, y, width, height);
    for (const zone of state.terrainZones) {
      this.minimapGraphics.fillStyle(TERRAIN_COLORS[zone.kind], 1);
      this.minimapGraphics.fillRect(
        mapX(zone.bounds.x),
        mapY(zone.bounds.y),
        (zone.bounds.width / 1400) * width,
        (zone.bounds.height / 900) * height
      );
    }
    for (const building of Object.values(state.buildings)) {
      if (building.ownerEmpireId !== "empire-player" && !isPositionVisibleToEmpire(state, "empire-player", building.position)) {
        continue;
      }
      this.minimapGraphics.fillStyle(building.ownerEmpireId === "empire-player" ? 0xe2bd61 : 0xbb5a54, 1);
      this.minimapGraphics.fillRect(mapX(building.position.x) - 2, mapY(building.position.y) - 2, 4, 4);
    }
    for (const battalion of Object.values(state.battalions)) {
      if (battalion.ownerEmpireId !== "empire-player" && !isPositionVisibleToEmpire(state, "empire-player", battalion.position)) {
        continue;
      }
      this.minimapGraphics.fillStyle(battalion.ownerEmpireId === "empire-player" ? 0x85c4dd : 0xd56b62, 1);
      this.minimapGraphics.fillCircle(mapX(battalion.position.x), mapY(battalion.position.y), 2);
    }
    const camera = this.cameras.main.worldView;
    this.minimapGraphics.lineStyle(1, 0xf5e7a2, 0.9);
    this.minimapGraphics.strokeRect(
      mapX(camera.x),
      mapY(camera.y),
      (camera.width / 1400) * width,
      (camera.height / 900) * height
    );
  }

  private addCommandButton(
    x: number,
    y: number,
    label: string,
    detail: string,
    onClick: () => void,
    fill = UI_COLORS.command
  ): void {
    const button = this.add.rectangle(x, y, 82, 46, fill, 1).setOrigin(0);
    button.setStrokeStyle(1, UI_COLORS.trim);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.audio.play("command");
      onClick();
    });
    button.on("pointerover", (pointer: Phaser.Input.Pointer) => this.showCommandTooltip(pointer, `${label}: ${detail}`));
    button.on("pointerout", () => this.hideCommandTooltip());
    const primary = this.add.text(x + 8, y + 8, label, {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const secondary = this.add.text(x + 8, y + 25, detail, {
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      color: "#b6c5bb"
    });
    this.commandDock.add([button, primary, secondary]);
  }

  private addLaborButton(x: number, detail: string, onClick: () => void): void {
    const button = this.add.rectangle(x, 96, 70, 46, UI_COLORS.command, 1).setOrigin(0);
    button.setStrokeStyle(1, UI_COLORS.trim);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.audio.play("command");
      onClick();
    });
    button.on("pointerover", (pointer: Phaser.Input.Pointer) => this.showCommandTooltip(pointer, `LABOR: prioritize ${detail.toLowerCase()} work.`));
    button.on("pointerout", () => this.hideCommandTooltip());
    const primary = this.add.text(x + 7, 104, "LABOR", {
      fontFamily: "Arial Black, Arial",
      fontSize: "9px",
      color: UI_COLORS.text
    });
    const secondary = this.add.text(x + 7, 121, detail, {
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      color: "#b6c5bb"
    });
    this.commandDock.add([button, primary, secondary]);
  }

  private addWideCommandButton(
    x: number,
    y: number,
    label: string,
    detail: string,
    onClick: () => void
  ): void {
    const button = this.add.rectangle(x, y, 182, 46, UI_COLORS.commandActive, 1).setOrigin(0);
    button.setStrokeStyle(1, UI_COLORS.trim);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      onClick();
    });
    button.on("pointerover", (pointer: Phaser.Input.Pointer) => this.showCommandTooltip(pointer, `${label}: ${detail}`));
    button.on("pointerout", () => this.hideCommandTooltip());
    const primary = this.add.text(x + 10, y + 8, label, {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const secondary = this.add.text(x + 10, y + 25, detail, {
      fontFamily: "Arial, sans-serif",
      fontSize: "9px",
      color: "#b6c5bb"
    });
    this.commandDock.add([button, primary, secondary]);
  }

  private createHeirPanel(): void {
    this.heirPanelBg = this.add.rectangle(0, 0, HEIR_PANEL_WIDTH, 48, UI_COLORS.panel, 0.96).setOrigin(0);
    this.heirPanelBg.setStrokeStyle(1, UI_COLORS.trim);
    this.heirPanelBg.setInteractive({ useHandCursor: false });
    this.heirPanelBg.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());

    this.heirPanelHeader = this.add.rectangle(0, 0, HEIR_PANEL_WIDTH, 48, UI_COLORS.panelDeep, 0.98).setOrigin(0);
    this.heirPanelHeader.setInteractive({ useHandCursor: true });
    this.heirPanelHeader.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.toggleHeirPanel();
    });

    this.heirPanelTitle = this.add.text(14, 9, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "12px",
      color: "#f2d77f"
    });
    this.heirPanelBody = this.add.text(14, 56, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: UI_COLORS.text,
      lineSpacing: 4,
      wordWrap: { width: HEIR_PANEL_WIDTH - 28 }
    });
    this.heirPanel = this.add.container(0, 0, [
      this.heirPanelBg,
      this.heirPanelHeader,
      this.heirPanelTitle,
      this.heirPanelBody
    ]);
    this.heirPanel.setScrollFactor(0).setDepth(40).setSize(HEIR_PANEL_WIDTH, 48);
    this.addHeirFeedbackButton(14, 258, "REWARD", UI_COLORS.commandActive, "reward-heir");
    this.addHeirFeedbackButton(146, 258, "PUNISH", UI_COLORS.danger, "punish-heir");
    this.updateHeirPanel();
  }

  private addHeirFeedbackButton(
    x: number,
    y: number,
    label: string,
    fill: number,
    commandType: "reward-heir" | "punish-heir"
  ): void {
    const button = this.add.rectangle(x, y, 126, 34, fill, 1).setOrigin(0);
    button.setStrokeStyle(1, UI_COLORS.trim);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.sendHeirFeedback(commandType);
    });
    const text = this.add.text(x + 12, y + 10, label, {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.heirPanel.add([button, text]);
    this.heirFeedbackControls.push({ button, label: text });
  }

  private updateHeirPanel(): void {
    const settlement = this.getActiveSettlement();
    const heir = this.getActiveHeir();
    const doctrines = this.getHeirDoctrines(heir);
    const lastDoctrine = heir?.lastDoctrineId ? this.simulation.getState().doctrines[heir.lastDoctrineId] : undefined;
    const height = this.heirPanelExpanded ? 350 : 48;

    this.heirPanelBg.setSize(HEIR_PANEL_WIDTH, height);
    this.heirPanel.setSize(HEIR_PANEL_WIDTH, height);
    this.heirPanelTitle.setText(
      this.heirPanelExpanded
        ? `HEIR // ${this.getSettlementDisplayName(settlement?.id)} [-]`
        : `HEIR // ${this.getSettlementDisplayName(settlement?.id)} [+]`
    );
    this.heirPanelBody.setVisible(this.heirPanelExpanded);
    this.heirFeedbackControls.forEach((control) => {
      control.button.setVisible(this.heirPanelExpanded);
      control.label.setVisible(this.heirPanelExpanded);
      control.button.setAlpha(lastDoctrine ? 1 : 0.42);
      control.label.setAlpha(lastDoctrine ? 1 : 0.42);
    });

    if (this.heirPanelExpanded) {
      const convictionLines = doctrines.length
        ? doctrines
            .slice(0, 3)
            .map((doctrine) => `- ${doctrine.preferredAction.toUpperCase()}  ${doctrine.confidence}%`)
        : ["- No observed doctrine yet."];
      this.heirPanelBody.setText(
        [
          `GOVERNOR: ${heir?.name.toUpperCase() ?? "UNASSIGNED"}`,
          `STATE: ${heir?.mode.toUpperCase() ?? "UNASSIGNED"}  //  TRUST: ${heir?.trust ?? 0}`,
          heir?.concern
            ? `CONCERN: ${heir.concern.category.toUpperCase()} // ${heir.concern.message.toUpperCase()}`
            : "CONCERN: NO URGENT GOVERNANCE ALERT.",
          "",
          "LAST LESSON:",
          lastDoctrine
            ? `${lastDoctrine.preferredAction.toUpperCase()}  //  ${lastDoctrine.confidence}%`
            : "Awaiting the God-King's example.",
          "",
          "GOVERNANCE:",
          heir?.lastDecision
            ? `${heir.lastDecision.action.toUpperCase()}  //  UTILITY ${heir.lastDecision.utility}`
            : "No autonomous decision recorded.",
          "",
          "CONVICTIONS:",
          ...convictionLines
        ].join("\n")
      );
    }

    this.layoutUi();
  }

  private getActiveHeir(): HeirState | undefined {
    const state = this.simulation.getState();
    const settlement = this.getActiveSettlement();
    return settlement ? state.heirs[settlement.heirId] : undefined;
  }

  private getActiveSettlement(): SettlementState | undefined {
    const state = this.simulation.getState();
    return state.settlements[this.inspectedSettlementId] ?? state.settlements["settlement-capital"];
  }

  private getActiveControlledSettlement(): SettlementState | undefined {
    const activeSettlement = this.getActiveSettlement();
    if (activeSettlement?.ownerEmpireId === "empire-player") {
      return activeSettlement;
    }

    const state = this.simulation.getState();
    return state.empires["empire-player"].settlementIds
      .map((settlementId) => state.settlements[settlementId])
      .find((settlement): settlement is SettlementState => settlement?.ownerEmpireId === "empire-player");
  }

  private getSettlementDisplayName(settlementId: string | undefined): string {
    if (!settlementId) {
      return "UNASSIGNED";
    }

    const names: Record<string, string> = {
      "settlement-capital": "CROWNKEEP",
      "settlement-rival": "RIVERMARCH",
      "settlement-rival-grove": "GROVEWATCH"
    };
    return names[settlementId] ?? settlementId.replace("settlement-", "").replaceAll("-", " ").toUpperCase();
  }

  private getHeirDoctrines(heir: HeirState | undefined): DoctrineRule[] {
    if (!heir) {
      return [];
    }

    const doctrines = this.simulation.getState().doctrines;
    return heir.doctrineIds
      .map((id) => doctrines[id])
      .filter((doctrine): doctrine is DoctrineRule => Boolean(doctrine))
      .sort((left, right) => right.confidence - left.confidence || right.updatedAtTick - left.updatedAtTick);
  }

  private sendHeirFeedback(commandType: "reward-heir" | "punish-heir"): void {
    const heir = this.getActiveHeir();
    if (heir?.ownerEmpireId !== "empire-player") {
      this.updateUi(["Only Crown governors can receive a lesson."]);
      return;
    }
    if (!heir?.lastDoctrineId) {
      this.updateUi(["The heir has no lesson to reward or punish yet."]);
      return;
    }

    this.issueCommand({ type: commandType, payload: { heirId: heir.id } });
    this.updateUi([`${commandType === "reward-heir" ? "Reward" : "Punish"} issued to ${heir.name}.`]);
  }

  private createBuildingsPanel(): void {
    this.buildingsPanelBg = this.add.rectangle(0, 0, BUILD_PANEL_WIDTH, 48, UI_COLORS.panel, 0.96).setOrigin(0);
    this.buildingsPanelBg.setStrokeStyle(1, UI_COLORS.trim);
    this.buildingsPanelBg.setInteractive({ useHandCursor: false });
    this.buildingsPanelBg.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    this.buildingsPanelHeader = this.add.rectangle(0, 0, BUILD_PANEL_WIDTH, 48, UI_COLORS.panelDeep, 0.98).setOrigin(0);
    this.buildingsPanelHeader.setInteractive({ useHandCursor: true });
    this.buildingsPanelHeader.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.toggleBuildingsPanel();
    });
    this.buildingsPanelTitle = this.add.text(14, 9, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "12px",
      color: "#f2d77f"
    });
    this.buildingsPanelBody = this.add.text(14, 54, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      color: UI_COLORS.muted,
      lineSpacing: 3
    });
    this.buildingsPanel = this.add.container(0, 0, [
      this.buildingsPanelBg,
      this.buildingsPanelHeader,
      this.buildingsPanelTitle,
      this.buildingsPanelBody
    ]);
    this.buildingsPanel.setScrollFactor(0);
    this.buildingsPanel.setDepth(40);
    this.buildingsPanel.setSize(BUILD_PANEL_WIDTH, 48);
    this.createBuildingOptionControls();
    this.updateBuildingsPanel();
  }

  private createBuildingOptionControls(): void {
    for (const [index, option] of BUILDING_OPTIONS.entries()) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 12 + column * 94;
      const y = 76 + row * 76;
      const button = this.add.rectangle(x, y, 86, 68, UI_COLORS.command, 1).setOrigin(0);
      button.setStrokeStyle(1, UI_COLORS.trim);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.selectBuilding(option.kind);
      });
      const icon = this.add.rectangle(x + 10, y + 10, 18, 18, BUILDING_COLORS[option.kind], 1).setOrigin(0);
      icon.setStrokeStyle(1, 0x0b1011);
      const label = this.add.text(x + 34, y + 8, option.label, {
        fontFamily: "Arial Black, Arial",
        fontSize: "9px",
        color: UI_COLORS.text,
        wordWrap: { width: 46 }
      });
      const count = this.add.text(x + 10, y + 43, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "8px",
        color: "#b6c5bb",
        lineSpacing: 1
      });
      this.buildingsPanel.add([button, icon, label, count]);
      this.buildingTiles.set(option.kind, { button, icon, label, count });
    }
  }

  private layoutUi(): void {
    const { width, height } = this.scale;
    const compact = width < 900;
    const narrow = width < 640;
    const topHeight = narrow ? 122 : compact ? 94 : 58;
    const scale = narrow ? 0.6 : Math.min(1, Math.max(0.72, (width - 24) / BUILD_PANEL_WIDTH));
    const buildPanelX = width - 16 - BUILD_PANEL_WIDTH * scale;
    const heirPanelX = buildPanelX - 12 - HEIR_PANEL_WIDTH * scale;

    this.topHud.setSize(width, topHeight);
    this.gameTitleText.setPosition(18, 10);
    const lessonScale = narrow ? Math.min(1, (width - 32) / 420) : 1;
    this.lessonBanner.setScale(lessonScale);
    this.lessonBanner.setPosition(
      Math.max(16, Math.round((width - 420 * lessonScale) / 2)),
      Math.max(topHeight + 14, height - 62 * lessonScale)
    );
    const pauseX = compact ? width - 82 : 436;
    const pauseY = compact ? 36 : 14;
    this.pauseControlButton.setPosition(pauseX, pauseY);
    this.pauseControlLabel.setPosition(pauseX + 10, pauseY + 9);
    const speedX = compact ? width - 168 : 510;
    this.speedControlButton.setPosition(speedX, pauseY);
    this.speedControlLabel.setPosition(speedX + 9, pauseY + 9);
    this.networkControl.setScale(narrow ? 0.7 : 1);
    this.networkControl.setPosition(narrow ? -85 : compact ? -164 : 0, narrow ? 48 : 0);
    this.audioControl.setScale(narrow ? 0.7 : 1);
    this.audioControl.setPosition(narrow ? -168 : compact ? -246 : 0, narrow ? 48 : 0);
    this.resourceText.setPosition(compact ? 18 : 758, narrow ? 88 : compact ? 47 : 19);
    this.bookControl.setScale(narrow ? 0.7 : 1);
    this.realmControl.setScale(narrow ? 0.7 : 1);
    this.bookControl.setPosition(narrow ? -115 : 0, narrow ? 48 : 0);
    this.realmControl.setPosition(narrow ? -113 : 0, narrow ? 48 : 0);
    const bookScale = narrow ? Math.min(1, (width - 32) / 470) : 1;
    const realmScale = narrow ? Math.min(1, (width - 32) / 384) : 1;
    const victoryScale = narrow ? Math.min(1, (width - 32) / 420) : 1;
    const campaignScale = narrow ? Math.min(1, (width - 32) / 470) : 1;
    this.bookPanel.setScale(bookScale);
    this.realmPanel.setScale(realmScale);
    this.victoryPanel.setScale(victoryScale);
    this.campaignSetupPanel.setScale(campaignScale);
    this.bookPanel.setPosition(
      Math.max(16, Math.round((width - 470 * bookScale) / 2)),
      Math.max(topHeight + 18, Math.round((height - 502 * bookScale) / 2))
    );
    this.realmPanel.setPosition(
      Math.max(16, Math.round((width - 384 * realmScale) / 2)),
      Math.max(topHeight + 18, Math.round((height - 238) / 2))
    );
    this.victoryPanel.setPosition(
      Math.max(16, Math.round((width - 420 * victoryScale) / 2)),
      Math.max(topHeight + 18, Math.round((height - 260 * victoryScale) / 2))
    );
    this.campaignSetupPanel.setPosition(
      Math.max(16, Math.round((width - 470 * campaignScale) / 2)),
      Math.max(topHeight + 18, Math.round((height - this.campaignSetupPanel.height * campaignScale) / 2))
    );
    this.intelPanel.setVisible(!narrow);
    this.intelPanel.setPosition(16, topHeight + 14);
    this.commandDock.setScale(narrow ? 0.86 : 1);
    this.commandDock.setPosition(narrow ? 8 : 16, narrow ? Math.max(topHeight + 112, height - 400) : Math.max(topHeight + 220, height - 450));
    this.minimapBounds = { x: Math.max(16, width - MINIMAP_WIDTH - 16), y: Math.max(topHeight + 210, height - MINIMAP_HEIGHT - 16) };
    this.minimapPanel.setVisible(!narrow);
    this.minimapGraphics.setVisible(!narrow);
    this.minimapTitle.setVisible(!narrow);
    this.minimapPanel.setPosition(this.minimapBounds.x, this.minimapBounds.y);
    this.minimapTitle.setPosition(this.minimapBounds.x + 10, this.minimapBounds.y + 8);
    this.updateMinimap();
    if (this.heirPanel) {
      this.heirPanel.setScale(scale);
      this.heirPanel.setPosition(narrow ? 10 : Math.max(16, heirPanelX), topHeight + 14);
    }
    if (this.buildingsPanel) {
      this.buildingsPanel.setScale(scale);
      this.buildingsPanel.setPosition(narrow ? 194 : buildPanelX, topHeight + 14);
    }
  }

  private updateBuildingsPanel(): void {
    const settlement = this.getActiveControlledSettlement();
    const counts = this.getBuildingCounts();
    const buildRows = Math.ceil(BUILDING_OPTIONS.length / 3);
    const height = this.buildingsPanelExpanded ? 76 + buildRows * 76 + 8 : 48;

    this.buildingsPanelBg.setSize(BUILD_PANEL_WIDTH, height);
    this.buildingsPanel.setSize(BUILD_PANEL_WIDTH, height);
    this.buildingsPanelTitle.setText(
      this.buildingsPanelExpanded
        ? `BUILD // ${this.getSettlementDisplayName(settlement?.id)} [-]`
        : `BUILD // ${this.getSettlementDisplayName(settlement?.id)} [+]`
    );
    this.buildingsPanelBody.setVisible(this.buildingsPanelExpanded);
    for (const [kind, tile] of this.buildingTiles) {
      const isSelected = kind === this.selectedBuildingKind;
      tile.button.setVisible(this.buildingsPanelExpanded);
      tile.icon.setVisible(this.buildingsPanelExpanded);
      tile.label.setVisible(this.buildingsPanelExpanded);
      tile.count.setVisible(this.buildingsPanelExpanded);
      tile.button.setFillStyle(isSelected ? UI_COLORS.commandActive : UI_COLORS.command, 1);
      tile.button.setStrokeStyle(isSelected ? 2 : 1, isSelected ? UI_COLORS.accent : UI_COLORS.trim);
      const cost = getBuildingCost(kind);
      tile.count.setText(`OWNED ${counts[kind] ?? 0}\nCOST ${cost.wood}W ${cost.iron}I`);
    }

    if (this.buildingsPanelExpanded) {
      this.buildingsPanelBody.setText(
        this.selectedBuildingKind
          ? `READY: ${this.getBuildingLabel(this.selectedBuildingKind).toUpperCase()} // Select terrain to deploy.`
          : "Select a structure, then select terrain to deploy."
      );
    }

    this.layoutUi();
  }

  private getBuildingCounts(): Partial<Record<BuildingKind, number>> {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      return {};
    }
    return Object.values(this.simulation.getState().buildings).reduce<Partial<Record<BuildingKind, number>>>(
      (counts, building) => {
        if (building.settlementId === settlement.id) {
          counts[building.kind] = (counts[building.kind] ?? 0) + 1;
        }
        return counts;
      },
      {}
    );
  }

  private selectBuilding(kind: BuildingKind): void {
    this.selectedBuildingKind = kind;
    this.mode = "building";
    this.buildingsPanelExpanded = false;
    this.ensurePlacementPreview();
    this.updateUi([`Construction ready: ${this.getBuildingLabel(kind)}. Select terrain to deploy.`]);
  }

  private getBuildingLabel(kind: BuildingKind): string {
    return BUILDING_OPTIONS.find((option) => option.kind === kind)?.label ?? kind;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.y < this.topHud.height) {
      return;
    }

    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    if (this.isRightClick(pointer)) {
      if (this.mode === "building") {
        this.cancelPlacement();
      } else {
        this.mode = "select";
        if (this.selectedCaravanId) {
          this.issueCaravanMoveOrder(worldPoint);
        } else {
          this.issueMoveOrder(worldPoint);
        }
      }
      return;
    }

    if (!this.isPrimaryClick(pointer)) {
      return;
    }

    this.pointerDownWorld = worldPoint.clone();

    if (this.mode === "building") {
      this.updatePlacementPreview(worldPoint);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    if (this.mode === "building") {
      this.updatePlacementPreview(worldPoint);
    }

    if (!this.pointerDownWorld || this.mode !== "select" || !pointer.isDown) {
      return;
    }

    if (!this.selectionDragActive && Phaser.Math.Distance.BetweenPoints(this.pointerDownWorld, worldPoint) >= DRAG_THRESHOLD) {
      this.selectionDragActive = true;
      this.ensureSelectionBox();
    }

    if (this.selectionDragActive) {
      this.updateSelectionBox(this.pointerDownWorld, worldPoint);
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isRightClick(pointer) || !this.pointerDownWorld) {
      return;
    }

    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    const start = this.pointerDownWorld;
    this.pointerDownWorld = undefined;

    if (this.mode === "building" && this.selectedBuildingKind) {
      const kind = this.selectedBuildingKind;
      if (this.isLinearBuilding(kind) && Phaser.Math.Distance.BetweenPoints(start, worldPoint) >= DRAG_THRESHOLD) {
        this.placeLinearBuildings(kind, start, worldPoint);
      } else {
        this.placeBuildingAt(kind, worldPoint);
      }
      return;
    }

    if (this.mode === "move") {
      this.issueMoveOrder(worldPoint);
      this.mode = "select";
      return;
    }

    if (this.mode === "attack-move") {
      this.issueAttackMoveOrder(worldPoint);
      this.mode = "select";
      return;
    }

    if (this.selectionDragActive) {
      this.finishBoxSelection(start, worldPoint, this.isShiftHeld(pointer));
      return;
    }

    if (this.mode === "select" && !this.isShiftHeld(pointer)) {
      this.clearSelection();
      this.updateUi(["Selection cleared."]);
    }
  }

  private ensurePlacementPreview(): void {
    if (this.placementPreview || !this.selectedBuildingKind) {
      return;
    }

    const size = BUILDING_SIZES[this.selectedBuildingKind];
    this.placementPreview = this.add.rectangle(0, 0, size, size, 0x4e965c, 0.5);
    this.placementPreview.setStrokeStyle(2, UI_COLORS.accent, 0.9);
    this.worldLayer.add(this.placementPreview);
  }

  private updatePlacementPreview(point: Phaser.Math.Vector2): void {
    if (!this.selectedBuildingKind) {
      return;
    }

    this.ensurePlacementPreview();
    const position = this.snapToGrid(point);
    const valid = this.isValidBuildingPosition(this.selectedBuildingKind, position);
    const size = BUILDING_SIZES[this.selectedBuildingKind];
    this.placementPreview?.setSize(size, size);
    this.placementPreview?.setPosition(position.x, position.y);
    this.placementPreview?.setFillStyle(valid ? 0x4e965c : 0xa74c42, 0.48);
    this.placementPreview?.setStrokeStyle(2, valid ? 0xb9df83 : 0xf0a38d, 0.95);
  }

  private clearPlacementPreview(): void {
    this.placementPreview?.destroy();
    this.placementPreview = undefined;
  }

  private cancelPlacement(): void {
    const cancelled = this.selectedBuildingKind ? this.getBuildingLabel(this.selectedBuildingKind) : "construction";
    this.selectedBuildingKind = null;
    this.mode = "select";
    this.clearPlacementPreview();
    this.updateUi([`${cancelled} placement cancelled.`]);
  }

  private placeBuildingAt(kind: BuildingKind, point: Phaser.Math.Vector2): boolean {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before authorizing construction."]);
      return false;
    }
    const position = this.snapToGrid(point);
    if (!this.isValidBuildingPosition(kind, position)) {
      this.updateUi(["Construction site blocked. Choose open terrain."]);
      return false;
    }

    this.issueCommand({
      type: "place-building",
      payload: {
        settlementId: settlement.id,
        kind,
        position: { x: position.x, y: position.y }
      }
    });
    this.selectedBuildingKind = null;
    this.mode = "select";
    this.clearPlacementPreview();
    this.updateUi([`${this.getBuildingLabel(kind)} deployment authorized.`]);
    return true;
  }

  private placeLinearBuildings(kind: BuildingKind, from: Phaser.Math.Vector2, to: Phaser.Math.Vector2): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before authorizing construction."]);
      return;
    }
    const length = Phaser.Math.Distance.BetweenPoints(from, to);
    const steps = Math.max(1, Math.ceil(length / PLACEMENT_GRID_SIZE));
    const placedPositions = new Set<string>();
    let placed = 0;

    for (let step = 0; step <= steps; step += 1) {
      const amount = step / steps;
      const point = new Phaser.Math.Vector2(
        Phaser.Math.Linear(from.x, to.x, amount),
        Phaser.Math.Linear(from.y, to.y, amount)
      );
      const position = this.snapToGrid(point);
      const key = `${position.x}:${position.y}`;
      if (placedPositions.has(key) || !this.isValidBuildingPosition(kind, position)) {
        continue;
      }

      placedPositions.add(key);
      this.issueCommand({
        type: "place-building",
        payload: {
          settlementId: settlement.id,
          kind,
          position: { x: position.x, y: position.y }
        }
      });
      placed += 1;
    }

    if (placed === 0) {
      this.updateUi(["No open terrain along placement line."]);
      return;
    }

    this.selectedBuildingKind = null;
    this.mode = "select";
    this.clearPlacementPreview();
    this.updateUi([`${placed} ${this.getBuildingLabel(kind).toLowerCase()} segments authorized.`]);
  }

  private isValidBuildingPosition(kind: BuildingKind, position: Phaser.Math.Vector2): boolean {
    const size = BUILDING_SIZES[kind];
    if (position.x < size || position.y < size || position.x > 1400 - size || position.y > 900 - size) {
      return false;
    }

    if (
      !isBuildingTerrainCompatible(kind, terrainAtPosition(this.simulation.getState(), position)) ||
      !isBuildingPlacementClear(this.simulation.getState(), kind, position)
    ) {
      return false;
    }

    const resources = this.simulation.getState().empires["empire-player"].resources;
    const cost = getBuildingCost(kind);
    if (resources.wood < cost.wood || resources.iron < cost.iron) {
      return false;
    }

    return !Object.values(this.simulation.getState().buildings).some((building) => {
      const minimumDistance = (size + BUILDING_SIZES[building.kind]) * 0.55;
      return Phaser.Math.Distance.Between(position.x, position.y, building.position.x, building.position.y) < minimumDistance;
    });
  }

  private isLinearBuilding(kind: BuildingKind): boolean {
    return kind === "road" || kind === "wall";
  }

  private snapToGrid(point: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Math.round(point.x / PLACEMENT_GRID_SIZE) * PLACEMENT_GRID_SIZE,
      Math.round(point.y / PLACEMENT_GRID_SIZE) * PLACEMENT_GRID_SIZE
    );
  }

  private ensureSelectionBox(): void {
    if (this.selectionBox) {
      return;
    }

    this.selectionBox = this.add.rectangle(0, 0, 1, 1, 0x8cb58b, 0.14).setOrigin(0);
    this.selectionBox.setStrokeStyle(1, 0xd7e8af, 0.9);
    this.worldLayer.add(this.selectionBox);
  }

  private updateSelectionBox(start: Phaser.Math.Vector2, current: Phaser.Math.Vector2): void {
    if (!this.selectionBox) {
      return;
    }

    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    this.selectionBox.setPosition(x, y);
    this.selectionBox.setSize(Math.max(1, Math.abs(current.x - start.x)), Math.max(1, Math.abs(current.y - start.y)));
  }

  private finishBoxSelection(start: Phaser.Math.Vector2, end: Phaser.Math.Vector2, append: boolean): void {
    const bounds = new Phaser.Geom.Rectangle(
      Math.min(start.x, end.x),
      Math.min(start.y, end.y),
      Math.abs(end.x - start.x),
      Math.abs(end.y - start.y)
    );
    const selectedIds = Object.values(this.simulation.getState().battalions)
      .filter(
        (battalion) =>
          battalion.ownerEmpireId === "empire-player" &&
          Phaser.Geom.Rectangle.Contains(bounds, battalion.position.x, battalion.position.y)
      )
      .map((battalion) => battalion.id);

    if (!append) {
      this.clearSelection();
    }
    selectedIds.forEach((id) => this.selectedBattalionIds.add(id));
    this.selectedBattalionId = selectedIds[0] ?? (append ? this.selectedBattalionId : null);
    this.selectionBox?.destroy();
    this.selectionBox = undefined;
    this.selectionDragActive = false;
    this.updateUi([selectedIds.length ? `${selectedIds.length} battalion(s) selected.` : "No battalions in selection area."]);
  }

  private selectBattalion(id: string, append: boolean): void {
    if (this.simulation.getState().battalions[id]?.ownerEmpireId !== "empire-player") {
      this.updateUi(["Rival battalions cannot be selected. Designate them as a target."]);
      return;
    }
    if (!append) {
      this.clearSelection();
    }
    this.selectedCaravanId = null;
    this.selectedBattalionIds.add(id);
    this.selectedBattalionId = id;
    this.updateUi([`Selected ${id}.`]);
  }

  private clearSelection(): void {
    this.selectedBattalionIds.clear();
    this.selectedBattalionId = null;
    this.selectedCaravanId = null;
  }

  private issueMoveOrder(point: Phaser.Math.Vector2): void {
    if (this.selectedBattalionIds.size === 0) {
      this.updateUi(["Select a battalion before issuing an order."]);
      return;
    }

    const destination = this.snapToGrid(point);
    for (const battalionId of this.selectedBattalionIds) {
      this.issueCommand({
        type: "move-battalion",
        payload: { battalionId, destination: { x: destination.x, y: destination.y } }
      });
    }
    this.updateUi([`Move order issued to ${this.selectedBattalionIds.size} battalion(s).`]);
  }

  private issueAttackMoveOrder(point: Phaser.Math.Vector2): void {
    if (this.selectedBattalionIds.size === 0) {
      this.updateUi(["Select a battalion before ordering an advance."]);
      return;
    }
    const destination = this.snapToGrid(point);
    for (const battalionId of this.selectedBattalionIds) {
      this.issueCommand({
        type: "attack-move-battalion",
        payload: { battalionId, destination: { x: destination.x, y: destination.y } }
      });
    }
    this.updateUi([`Advance ordered for ${this.selectedBattalionIds.size} battalion(s).`]);
  }

  private retreatSelectedBattalions(): void {
    if (this.selectedBattalionIds.size === 0) {
      this.updateUi(["Select a battalion before ordering a retreat."]);
      return;
    }
    for (const battalionId of this.selectedBattalionIds) {
      this.issueCommand({ type: "retreat-battalion", payload: { battalionId } });
    }
    this.mode = "select";
    this.updateUi([`Retreat ordered for ${this.selectedBattalionIds.size} battalion(s).`]);
  }

  private issueCaravanMoveOrder(point: Phaser.Math.Vector2): void {
    if (!this.selectedCaravanId) {
      return;
    }
    const destination = this.snapToGrid(point);
    this.issueCommand({
      type: "move-caravan",
      payload: { caravanId: this.selectedCaravanId, destination: { x: destination.x, y: destination.y } }
    });
    this.updateUi(["Supply caravan routed to new destination."]);
  }

  private issueAttackOrder(
    targetId: BattalionState["id"] | BuildingState["id"] | CaravanState["id"]
  ): void {
    if (this.selectedBattalionIds.size === 0) {
      this.updateUi(["Select a battalion before designating a target."]);
      return;
    }

    for (const battalionId of this.selectedBattalionIds) {
      this.issueCommand({
        type: "attack-target",
        payload: { battalionId, targetId }
      });
    }
    this.mode = "select";
    this.updateUi([`Attack order issued to ${this.selectedBattalionIds.size} battalion(s).`]);
  }

  private issueShipAttackOrder(targetId: CaravanState["id"]): void {
    const ship = this.selectedCaravanId ? this.simulation.getState().caravans[this.selectedCaravanId] : undefined;
    if (!ship || ship.kind !== "ship") {
      this.updateUi(["Select a Crown Warship before designating a naval target."]);
      return;
    }
    this.issueCommand({ type: "attack-with-ship", payload: { shipId: ship.id, targetId } });
    this.mode = "select";
    this.updateUi(["Warship attack order issued."]);
  }

  private isRightClick(pointer: Phaser.Input.Pointer): boolean {
    return pointer.rightButtonDown() || (pointer.event as MouseEvent | undefined)?.button === 2;
  }

  private isPrimaryClick(pointer: Phaser.Input.Pointer): boolean {
    return !this.isRightClick(pointer);
  }

  private isShiftHeld(pointer: Phaser.Input.Pointer): boolean {
    return Boolean((pointer.event as MouseEvent | undefined)?.shiftKey);
  }

  private createBattalion(specialization: BattalionSpecialization = "militia"): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before training a battalion."]);
      return;
    }
    const hasMilitaryQuarters = Object.values(this.simulation.getState().buildings).some(
      (building) =>
        building.ownerEmpireId === "empire-player" &&
        building.settlementId === settlement.id &&
        building.kind === "military-quarters" &&
        building.complete
    );
    const hasTownSquare = settlement.buildingIds.some((id) => {
      const building = this.simulation.getState().buildings[id];
      return building?.kind === "town-square" && building.complete;
    });
    if (specialization === "hounds" && !hasTownSquare) {
      this.updateUi(["Construct a Town Square before training scout hounds."]);
      return;
    }
    if (specialization !== "militia" && specialization !== "hounds" && !hasMilitaryQuarters) {
      this.updateUi(["Construct Military Quarters before training specialized battalions."]);
      return;
    }
    this.issueCommand({
      type: "create-battalion",
      payload: {
        settlementId: settlement.id,
        size: specialization === "militia" ? 10 : specialization === "hounds" ? 4 : 8,
        specialization
      }
    });
    this.updateUi([`${specialization.toUpperCase()} battalion queued for training.`]);
  }

  private createCaravan(): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before commissioning a supply wagon."]);
      return;
    }
    this.issueCommand({ type: "create-caravan", payload: { settlementId: settlement.id } });
    this.updateUi(["Supply wagon queued. Requires a completed Town Square and 12 local food."]);
  }

  private createShip(): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before commissioning a Warship."]);
      return;
    }
    this.issueCommand({ type: "create-ship", payload: { settlementId: settlement.id } });
    this.updateUi(["Warship queued. It launches on water and requires a Town Square, 18 wood, and 4 iron."]);
  }

  private setLaborFocus(
    focus: "farmers" | "builders" | "lumberjacks" | "miners" | "luxuryWorkers"
  ): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before assigning labor."]);
      return;
    }
    const available = settlement.population.citizens - settlement.population.militarizedCitizens;
    const roles: Array<"farmers" | "builders" | "lumberjacks" | "miners" | "luxuryWorkers"> = [
      focus,
      ...(["farmers", "builders", "lumberjacks", "miners", "luxuryWorkers"] as const).filter(
        (role) => role !== focus
      )
    ];
    const allocation = { farmers: 0, builders: 0, lumberjacks: 0, miners: 0, luxuryWorkers: 0 };
    let remaining = available;
    for (const role of roles) {
      const assigned = Math.min(role === focus ? 12 : 4, remaining);
      allocation[role] = assigned;
      remaining -= assigned;
    }
    this.issueCommand({
      type: "assign-labor",
      payload: { settlementId: settlement.id, ...allocation }
    });
    this.updateUi([`Labor priority set: ${focus.toUpperCase()}.`]);
  }

  private castBlessHarvest(): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before invoking Bless Harvest."]);
      return;
    }
    this.issueCommand({
      type: "cast-miracle",
      payload: {
        empireId: "empire-player",
        kind: "bless-harvest",
        settlementId: settlement.id
      }
    });
    this.updateUi(["Bless Harvest petitioned. 12 Faith will be spent on confirmation."]);
  }

  private castInspireBattalions(): void {
    if (this.selectedBattalionIds.size === 0) {
      this.updateUi(["Select Crown battalions before invoking Inspire Army."]);
      return;
    }
    for (const targetId of this.selectedBattalionIds) {
      this.issueCommand({
        type: "cast-miracle",
        payload: { empireId: "empire-player", kind: "inspire-battalion", targetId }
      });
    }
    this.updateUi([`Inspire Army petitioned for ${this.selectedBattalionIds.size} battalion(s).`]);
  }

  private castDivineJudgment(): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before invoking Divine Judgment."]);
      return;
    }
    this.issueCommand({
      type: "cast-miracle",
      payload: { empireId: "empire-player", kind: "divine-judgment", settlementId: settlement.id }
    });
    this.updateUi(["Divine Judgment petitioned. 18 Faith will shield this settlement from rival pressure."]);
  }

  private assimilateCaptives(): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before ordering assimilation."]);
      return;
    }
    const count = Math.min(4, settlement.population.captives);
    if (count === 0) {
      this.updateUi([`No captives are housed in ${this.getSettlementDisplayName(settlement.id)}.`]);
      return;
    }
    this.issueCommand({
      type: "assimilate-captives",
      payload: { settlementId: settlement.id, count }
    });
    this.updateUi([`Assimilation ordered for ${count} captive(s).`]);
  }

  private releaseCaptives(): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before releasing captives."]);
      return;
    }
    const count = Math.min(4, settlement.population.captives);
    if (count === 0) {
      this.updateUi([`No captives are held in ${this.getSettlementDisplayName(settlement.id)}.`]);
      return;
    }
    this.issueCommand({
      type: "release-captives",
      payload: { settlementId: settlement.id, count }
    });
    this.updateUi([`${count} captive(s) released by royal decree.`]);
  }

  private disembarkCaravan(): void {
    if (!this.selectedCaravanId) {
      this.updateUi(["Select a Crown caravan before ordering disembarkation."]);
      return;
    }
    this.issueCommand({ type: "disembark-caravan", payload: { caravanId: this.selectedCaravanId } });
    this.updateUi(["Caravan disembarkation ordered."]);
  }

  private garrisonSelectedBattalions(): void {
    const state = this.simulation.getState();
    const selected = [...this.selectedBattalionIds]
      .map((id) => state.battalions[id])
      .filter((battalion): battalion is BattalionState => Boolean(battalion));
    if (selected.length === 0) {
      this.updateUi(["Select Crown battalions near a castle, wall, gate, or outpost."]);
      return;
    }

    let orders = 0;
    for (const battalion of selected) {
      const building = Object.values(state.buildings)
        .filter(
          (candidate) =>
            candidate.ownerEmpireId === "empire-player" &&
            candidate.complete &&
            this.getGarrisonCapacity(candidate.kind) > (candidate.garrisonBattalionIds?.length ?? 0) &&
            Phaser.Math.Distance.Between(
              battalion.position.x,
              battalion.position.y,
              candidate.position.x,
              candidate.position.y
            ) <= 84
        )
        .sort(
          (left, right) =>
            Phaser.Math.Distance.Between(battalion.position.x, battalion.position.y, left.position.x, left.position.y) -
            Phaser.Math.Distance.Between(battalion.position.x, battalion.position.y, right.position.x, right.position.y)
        )[0];
      if (!building) {
        continue;
      }
      this.issueCommand({ type: "garrison-battalion", payload: { battalionId: battalion.id, buildingId: building.id } });
      orders += 1;
    }
    this.updateUi(
      orders > 0
        ? [`Garrison orders issued for ${orders} battalion(s).`]
        : ["No available defense work is within garrison range."]
    );
  }

  private getGarrisonCapacity(kind: BuildingKind): number {
    if (kind === "castle") {
      return 2;
    }
    return kind === "wall" || kind === "gate" || kind === "outpost" ? 1 : 0;
  }

  private getCaptiveCapacity(settlementId: string): number {
    const state = this.simulation.getState();
    const settlement = state.settlements[settlementId];
    return settlement.buildingIds.reduce((capacity, buildingId) => {
      const building = state.buildings[buildingId];
      return capacity + (building?.kind === "hovel" && building.complete ? 12 : 0);
    }, 0);
  }

  private getCitizenCapacity(settlementId: string): number {
    const state = this.simulation.getState();
    const settlement = state.settlements[settlementId];
    return settlement.buildingIds.reduce((capacity, buildingId) => {
      const building = state.buildings[buildingId];
      if (!building?.complete) {
        return capacity;
      }
      if (building.kind === "castle") {
        return capacity + 24;
      }
      return capacity + (building.kind === "villa" ? 12 : 0);
    }, 0);
  }

  private issueCommand(command: CommandIntent): void {
    if (this.replayReview) {
      this.updateUi(["Replay review is read-only. Return to the live reign before issuing orders."]);
      return;
    }
    if (this.remoteAuthority) {
      this.remoteAuthority.submit(command);
      return;
    }
    this.simulation.enqueueCommand({
      id: `ui-command-${this.commandSequence++}`,
      issuedBy: "player-1",
      tick: this.simulation.getState().tick + 1,
      ...command
    } as GameCommand);
  }

  private playCombatFeedback(events: GameEvent[]): void {
    for (const event of events) {
      const isBattalionStrike = event.type === "damage-dealt";
      const isShipStrike = event.type === "ship-fired";
      if (!isBattalionStrike && !isShipStrike) {
        continue;
      }
      this.audio.play(isShipStrike ? "naval" : "combat");
      const attackerId = String(event.payload.attackerId ?? event.payload.shipId ?? "");
      const targetId = String(event.payload.targetId ?? "");
      const attacker = this.getEntityPosition(attackerId);
      const target = this.getEntityPosition(targetId);
      if (!attacker || !target) {
        continue;
      }
      const projectile = this.add.circle(
        attacker.x,
        attacker.y,
        isShipStrike ? 5 : 3,
        isShipStrike ? 0x9cc8d5 : 0xf0d36f,
        0.95
      );
      projectile.setDepth(30);
      this.tweens.add({
        targets: projectile,
        x: target.x,
        y: target.y,
        alpha: 0,
        duration: isShipStrike ? 320 : 180,
        ease: "Quad.easeOut",
        onComplete: () => projectile.destroy()
      });
      const impact = this.add.circle(
        target.x,
        target.y,
        isShipStrike ? 14 : 9,
        isShipStrike ? 0x9cc8d5 : 0xf0d36f,
        0.22
      );
      impact.setStrokeStyle(isShipStrike ? 3 : 2, isShipStrike ? 0xc9edf5 : 0xffe1a4, 0.9).setDepth(30);
      this.tweens.add({
        targets: impact,
        scaleX: isShipStrike ? 3 : 2.4,
        scaleY: isShipStrike ? 3 : 2.4,
        alpha: 0,
        duration: isShipStrike ? 420 : 280,
        ease: "Quad.easeOut",
        onComplete: () => impact.destroy()
      });
      const damage = Number(event.payload.damage ?? 0);
      if (damage <= 0) {
        continue;
      }
      const marker = this.add.text(target.x, target.y - 18, `-${damage}`, {
        fontFamily: "Arial Black, Arial",
        fontSize: isShipStrike ? "15px" : "12px",
        color: isShipStrike ? "#b8e2ef" : "#f4cf88",
        stroke: "#141817",
        strokeThickness: 3
      });
      marker.setOrigin(0.5).setDepth(31);
      this.tweens.add({
        targets: marker,
        y: target.y - 46,
        alpha: 0,
        duration: 620,
        ease: "Sine.easeOut",
        onComplete: () => marker.destroy()
      });
    }
  }

  private getEntityPosition(entityId: string): { x: number; y: number } | undefined {
    const state = this.simulation.getState();
    return state.battalions[entityId]?.position ?? state.buildings[entityId]?.position ?? state.caravans[entityId]?.position;
  }

  private playMiracleFeedback(events: GameEvent[]): void {
    for (const event of events) {
      if (event.type !== "miracle-cast") {
        continue;
      }
      const miracle = String(event.payload.miracle ?? "");
      const battalionId = typeof event.payload.battalionId === "string" ? event.payload.battalionId : undefined;
      const settlementId = typeof event.payload.settlementId === "string" ? event.payload.settlementId : undefined;
      const settlement = settlementId ? this.simulation.getState().settlements[settlementId] : undefined;
      const position = battalionId
        ? this.getEntityPosition(battalionId)
        : settlement
          ? this.getEntityPosition(settlement.centralBuildingId)
          : undefined;
      if (!position) {
        continue;
      }

      const style =
        miracle === "bless-harvest"
          ? { color: 0xb9d86d, label: "HARVEST BLESSED", radius: 30 }
          : miracle === "inspire-battalion"
            ? { color: 0xf2d77f, label: "ARMY INSPIRED", radius: 22 }
            : { color: 0x90c8df, label: "DIVINE WARD", radius: 38 };
      const halo = this.add.circle(position.x, position.y, style.radius, style.color, 0.1);
      halo.setStrokeStyle(3, style.color, 0.94).setDepth(32);
      this.tweens.add({
        targets: halo,
        scaleX: 2.4,
        scaleY: 2.4,
        alpha: 0,
        duration: 820,
        ease: "Sine.easeOut",
        onComplete: () => halo.destroy()
      });
      const title = this.add.text(position.x, position.y - style.radius - 24, style.label, {
        fontFamily: "Arial Black, Arial",
        fontSize: "10px",
        color: `#${style.color.toString(16).padStart(6, "0")}`,
        stroke: "#10150f",
        strokeThickness: 3
      });
      title.setOrigin(0.5).setDepth(33);
      this.tweens.add({
        targets: title,
        y: title.y - 20,
        alpha: 0,
        delay: 550,
        duration: 450,
        ease: "Sine.easeIn",
        onComplete: () => title.destroy()
      });
    }
  }

  private renderWorld(): void {
    const state = this.simulation.getState();
    this.pruneControlGroups(state);

    for (const building of Object.values(state.buildings)) {
      this.renderBuilding(building);
    }

    for (const battalion of Object.values(state.battalions)) {
      this.renderBattalion(battalion);
    }

    for (const caravan of Object.values(state.caravans)) {
      this.renderCaravan(caravan);
    }

    for (const [id, sprite] of this.battalionSprites) {
      if (!state.battalions[id]) {
        sprite.destroy();
        this.battalionSprites.delete(id);
        this.selectedBattalionIds.delete(id);
      }
    }

    for (const [id, sprite] of this.buildingSprites) {
      if (!state.buildings[id]) {
        sprite.destroy();
        this.buildingSprites.delete(id);
        this.buildingArtSprites.get(id)?.destroy();
        this.buildingArtSprites.delete(id);
        this.buildingLabelSprites.get(id)?.destroy();
        this.buildingLabelSprites.delete(id);
      }
    }

    for (const [id, sprite] of this.caravanSprites) {
      if (!state.caravans[id]) {
        sprite.destroy();
        this.caravanSprites.delete(id);
        if (this.selectedCaravanId === id) {
          this.selectedCaravanId = null;
        }
      }
    }

    if (this.selectedBattalionId && !state.battalions[this.selectedBattalionId]) {
      this.selectedBattalionId = this.selectedBattalionIds.values().next().value ?? null;
    }
  }

  private renderBuilding(building: BuildingState): void {
    const color = building.ownerEmpireId === "empire-player" ? BUILDING_COLORS[building.kind] : 0x914946;
    let sprite = this.buildingSprites.get(building.id);
    let art = this.buildingArtSprites.get(building.id);
    let label = this.buildingLabelSprites.get(building.id);

    if (!art) {
      const [column, row] = BUILDING_ART_FRAMES[building.kind];
      const tileSize = BUILDING_ART_TILE_SIZE[building.kind];
      art = this.add.image(building.position.x, building.position.y, "building-atlas");
      art.setCrop(
        column * BUILDING_ATLAS_CELL_SIZE,
        row * BUILDING_ATLAS_CELL_SIZE,
        BUILDING_ATLAS_CELL_SIZE,
        BUILDING_ATLAS_CELL_SIZE
      );
      // Phaser scales against the source image before applying a crop. The atlas has four cells per axis.
      art.setDisplaySize(tileSize * 4, tileSize * 4);
      // Crop coordinates remain relative to the full atlas, so anchor at the selected cell's center.
      art.setOrigin((column + 0.5) / 4, (row + 0.5) / 4);
      this.worldLayer.add(art);
      this.buildingArtSprites.set(building.id, art);
    }

    if (!sprite) {
      const size = BUILDING_SIZES[building.kind];
      sprite = this.add.rectangle(building.position.x, building.position.y, size, size, color, 1);
      sprite.setStrokeStyle(2, 0x191c16);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        const currentBuilding = this.simulation.getState().buildings[building.id];
        if (!currentBuilding) {
          return;
        }

        if (
          currentBuilding.kind === "castle" &&
          currentBuilding.ownerEmpireId === "empire-player" &&
          !this.isRightClick(pointer) &&
          this.mode !== "attack"
        ) {
          this.selectCrownSeat(currentBuilding.settlementId, false);
          return;
        }

        if (currentBuilding.ownerEmpireId !== "empire-player" && (this.isRightClick(pointer) || this.mode === "attack")) {
          this.issueAttackOrder(currentBuilding.id);
          return;
        }

        if (currentBuilding.ownerEmpireId !== "empire-player" && this.mode === "attack-move") {
          this.issueAttackMoveOrder(new Phaser.Math.Vector2(currentBuilding.position.x, currentBuilding.position.y));
          this.mode = "select";
          return;
        }

        if (currentBuilding.ownerEmpireId === "empire-player" && this.mode === "attack") {
          this.updateUi(["Cannot target a structure held by the Crown."]);
          return;
        }

        if (this.mode === "building") {
          this.updateUi(["Construction site blocked. Choose open terrain."]);
        }
      });
      this.worldLayer.add(sprite);
      this.buildingSprites.set(building.id, sprite);
    }

    if (!label) {
      label = this.add.text(building.position.x, building.position.y, this.getBuildingWorldLabel(building), {
        fontFamily: "Arial Black, Arial",
        fontSize: "9px",
        color: "#ffffff",
        align: "center",
        backgroundColor: "#12191a"
      });
      label.setOrigin(0.5, 1);
      this.worldLayer.add(label);
      this.buildingLabelSprites.set(building.id, label);
    }

    sprite.setPosition(building.position.x, building.position.y);
    sprite.setFillStyle(building.complete ? color : 0x6a6041, building.complete ? 0.12 : 0.28);
    const visible =
      building.ownerEmpireId === "empire-player" ||
      isPositionVisibleToEmpire(this.simulation.getState(), "empire-player", building.position);
    sprite.setVisible(visible);
    art.setPosition(building.position.x, building.position.y);
    art.setAlpha(building.complete ? (building.ownerEmpireId === "empire-player" ? 1 : 0.82) : 0.42);
    if (building.ownerEmpireId === "empire-player") {
      art.clearTint();
    } else {
      art.setTint(0xe4b2ad);
    }
    art.setVisible(visible);
    label.setPosition(building.position.x, building.position.y - BUILDING_ART_TILE_SIZE[building.kind] / 2 - 5);
    label.setText(this.getBuildingWorldLabel(building));
    label.setVisible(visible);
  }

  private renderBattalion(battalion: BattalionState): void {
    let container = this.battalionSprites.get(battalion.id);

    if (!container) {
      const ownerColor = battalion.ownerEmpireId === "empire-player" ? 0x3d7391 : 0x9d4640;
      const marker = this.add.ellipse(0, 0, 88, 52, ownerColor, 0.35);
      marker.setStrokeStyle(2, 0x201614);
      const [column, row] = UNIT_ART_FRAMES[battalion.specialization];
      const art = this.add.image(0, 0, "unit-atlas");
      art.setCrop(
        column * UNIT_ATLAS_CELL_SIZE,
        row * UNIT_ATLAS_CELL_SIZE,
        UNIT_ATLAS_CELL_SIZE,
        UNIT_ATLAS_CELL_SIZE
      );
      art.setDisplaySize(UNIT_ATLAS_DISPLAY_WIDTH, UNIT_ATLAS_DISPLAY_HEIGHT);
      art.setOrigin((column + 0.5) / 3, (row + 0.5) / 2);
      const label = this.add.text(0, 49, this.getBattalionLabel(battalion), {
        fontFamily: "Arial Black, Arial",
        fontSize: "9px",
        color: "#ffffff",
        stroke: "#10150f",
        strokeThickness: 3
      });
      label.setOrigin(0.5);
      label.setAlign("center");
      container = this.add.container(battalion.position.x, battalion.position.y, [marker, art, label]);
      container.setSize(96, 104);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        if (
          battalion.ownerEmpireId !== "empire-player" &&
          (this.isRightClick(pointer) || this.mode === "attack") &&
          this.selectedBattalionIds.size > 0
        ) {
          this.issueAttackOrder(battalion.id);
          return;
        }
        if (
          battalion.ownerEmpireId !== "empire-player" &&
          this.mode === "attack-move" &&
          this.selectedBattalionIds.size > 0
        ) {
          this.issueAttackMoveOrder(new Phaser.Math.Vector2(battalion.position.x, battalion.position.y));
          this.mode = "select";
          return;
        }
        if (battalion.ownerEmpireId !== "empire-player") {
          this.updateUi(["Rival battalion detected. Select Crown forces to attack."]);
          return;
        }
        this.selectBattalion(battalion.id, this.isShiftHeld(pointer));
      });
      this.worldLayer.add(container);
      this.battalionSprites.set(battalion.id, container);
    }

    container.setPosition(battalion.position.x, battalion.position.y);
    const marker = container.getAt(0) as Phaser.GameObjects.Ellipse;
    marker.setFillStyle(battalion.ownerEmpireId === "empire-player" ? 0x3d7391 : 0x9d4640, 0.35);
    marker.setStrokeStyle(this.selectedBattalionIds.has(battalion.id) ? 4 : 2, 0xf0d36f);
    const art = container.getAt(1) as Phaser.GameObjects.Image;
    if (battalion.ownerEmpireId === "empire-player") {
      art.clearTint();
    } else {
      art.setTint(0xe4aaaa);
    }
    const label = container.getAt(2) as Phaser.GameObjects.Text;
    label.setText(this.getBattalionLabel(battalion));
    container.setVisible(
      battalion.ownerEmpireId === "empire-player" ||
        isPositionVisibleToEmpire(this.simulation.getState(), "empire-player", battalion.position)
    );
  }

  private renderCaravan(caravan: CaravanState): void {
    let container = this.caravanSprites.get(caravan.id);
    if (!container) {
      const base = this.add.rectangle(
        0,
        0,
        54,
        28,
        caravan.ownerEmpireId === "empire-player" ? 0xb58c43 : 0x7c4542,
        1
      );
      base.setStrokeStyle(2, 0x201614);
      const shipArt = caravan.kind === "ship" ? this.add.image(0, 0, "unit-atlas") : undefined;
      if (shipArt) {
        shipArt.setCrop(2 * UNIT_ATLAS_CELL_SIZE, UNIT_ATLAS_CELL_SIZE, UNIT_ATLAS_CELL_SIZE, UNIT_ATLAS_CELL_SIZE);
        shipArt.setDisplaySize(UNIT_ATLAS_DISPLAY_WIDTH, UNIT_ATLAS_DISPLAY_HEIGHT);
        shipArt.setOrigin(2.5 / 3, 0.75);
      }
      const label = this.add.text(0, 0, this.getCaravanLabel(caravan), {
        fontFamily: "Arial Black, Arial",
        fontSize: "8px",
        color: "#ffffff",
        align: "center",
        stroke: "#10150f",
        strokeThickness: shipArt ? 3 : 0
      });
      label.setOrigin(0.5);
      if (shipArt) {
        label.setY(49);
      }
      container = this.add.container(caravan.position.x, caravan.position.y, shipArt ? [base, shipArt, label] : [base, label]);
      container.setSize(shipArt ? 96 : 54, shipArt ? 104 : 28);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        if (
          caravan.ownerEmpireId === "empire-player" &&
          this.isRightClick(pointer) &&
          this.selectedBattalionIds.size > 0
        ) {
          for (const battalionId of this.selectedBattalionIds) {
            this.issueCommand({ type: "embark-battalion", payload: { battalionId, caravanId: caravan.id } });
          }
          this.updateUi([`Embarkation ordered for ${this.selectedBattalionIds.size} battalion(s).`]);
          return;
        }
        if (
          caravan.ownerEmpireId !== "empire-player" &&
          (this.isRightClick(pointer) || this.mode === "attack")
        ) {
          if (
            this.selectedCaravanId &&
            this.simulation.getState().caravans[this.selectedCaravanId]?.kind === "ship"
          ) {
            this.issueShipAttackOrder(caravan.id);
          } else if (this.selectedBattalionIds.size > 0) {
            this.issueAttackOrder(caravan.id);
          } else {
            this.updateUi(["Select a Crown battalion or Warship before designating a convoy target."]);
          }
          return;
        }
        if (
          caravan.ownerEmpireId !== "empire-player" &&
          this.mode === "attack-move" &&
          this.selectedBattalionIds.size > 0
        ) {
          this.issueAttackMoveOrder(new Phaser.Math.Vector2(caravan.position.x, caravan.position.y));
          this.mode = "select";
          return;
        }
        if (caravan.ownerEmpireId !== "empire-player") {
          this.updateUi(["Rival supply convoy detected. Select Crown battalions to raid it."]);
          return;
        }
        this.clearSelection();
        this.selectedCaravanId = caravan.id;
        this.updateUi([`${caravan.kind === "ship" ? "Warship" : "Supply caravan"} selected. Right-click valid terrain to route it.`]);
      });
      this.worldLayer.add(container);
      this.caravanSprites.set(caravan.id, container);
    }
    container.setPosition(caravan.position.x, caravan.position.y);
    const base = container.getAt(0) as Phaser.GameObjects.Rectangle;
    base.setFillStyle(
      caravan.kind === "ship"
        ? caravan.ownerEmpireId === "empire-player" ? 0x2f667c : 0x5f3f62
        : caravan.ownerEmpireId === "empire-player" ? 0xb58c43 : 0x7c4542
    );
    base.setStrokeStyle(this.selectedCaravanId === caravan.id ? 4 : 2, 0xf0d36f);
    const shipArt = caravan.kind === "ship" ? (container.getAt(1) as Phaser.GameObjects.Image) : undefined;
    if (shipArt) {
      if (caravan.ownerEmpireId === "empire-player") {
        shipArt.clearTint();
      } else {
        shipArt.setTint(0xe4aaaa);
      }
    }
    const label = container.getAt(caravan.kind === "ship" ? 2 : 1) as Phaser.GameObjects.Text;
    label.setText(this.getCaravanLabel(caravan));
    container.setVisible(
      caravan.ownerEmpireId === "empire-player" ||
        isPositionVisibleToEmpire(this.simulation.getState(), "empire-player", caravan.position)
    );
  }

  private getBattalionLabel(battalion: BattalionState): string {
    const suffix = battalion.id.split("-").at(-1) ?? "1";
    const trait = getBattalionTraits(battalion.battlefieldTraining)[0];
    return battalion.specialization === "hounds"
      ? `HOUNDS ${suffix}\n${battalion.size} SCOUTS`
      : `${getBattalionRank(battalion.experience)} ${battalion.specialization.toUpperCase()}\n${trait ? trait.toUpperCase() : `${battalion.size} TROOPS`}`;
  }

  private getCaravanLabel(caravan: CaravanState): string {
    const passengerSize = caravan.passengerBattalionIds.reduce(
      (total, battalionId) => total + (this.simulation.getState().battalions[battalionId]?.size ?? 0),
      0
    );
    const vehicle = caravan.kind === "ship" ? "WARSHIP" : "WAGON";
    return `${caravan.ownerEmpireId === "empire-player" ? "CROWN" : "RIVAL"} ${vehicle}\nF${caravan.cargoFood} U${passengerSize}`;
  }

  private getBuildingWorldLabel(building: BuildingState): string {
    const owner = building.ownerEmpireId === "empire-player" ? "CROWN" : "RIVAL";
    const garrisonCapacity = this.getGarrisonCapacity(building.kind);
    const garrison =
      garrisonCapacity > 0
        ? `\nGARRISON ${building.garrisonBattalionIds?.length ?? 0}/${garrisonCapacity}`
        : "";
    return `${owner} ${BUILDING_DISPLAY_LABELS[building.kind]}${garrison}`;
  }

  private updateUi(events: string[]): void {
    const state = this.simulation.getState();
    const empire = state.empires["empire-player"];
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      return;
    }
    const selectedBattalion =
      this.selectedBattalionIds.size === 1
        ? state.battalions[this.selectedBattalionIds.values().next().value as string]
        : undefined;
    const selectedTraits = selectedBattalion ? getBattalionTraits(selectedBattalion.battlefieldTraining) : [];
    const activeControlGroup = this.getActiveControlGroup();
    const controlGroupSummary = activeControlGroup ? `  //  GROUP ${activeControlGroup}` : "";
    const selectionSummary = selectedBattalion
      ? `UNIT: ${getBattalionRank(selectedBattalion.experience)} ${selectedBattalion.specialization.toUpperCase()}  //  MORALE ${selectedBattalion.morale}  //  SUPPLY ${selectedBattalion.supply}  //  XP ${selectedBattalion.experience ?? 0}  //  ${selectedTraits.join(" / ") || "NO TRAIT"}${controlGroupSummary}`
      : this.selectedCaravanId
        ? "SELECTION: SUPPLY CARAVAN"
        : this.selectedBattalionIds.size
          ? `SELECTION: ${this.selectedBattalionIds.size} BATTALIONS${controlGroupSummary}`
          : "SELECTION: NO UNIT SELECTED";
    this.resourceText.setText(
      this.scale.width < 640
        ? `SEAT ${this.getSettlementDisplayName(settlement.id)}  //  TICK ${state.tick}\nFOOD ${settlement.localFood}  WOOD ${empire.resources.wood}  IRON ${empire.resources.iron}  LUX ${empire.resources.luxury}  FAITH ${empire.resources.faith}`
        : `SEAT ${this.getSettlementDisplayName(settlement.id)}    FOOD ${settlement.localFood}    WOOD ${empire.resources.wood}    IRON ${empire.resources.iron}    LUX ${empire.resources.luxury}    FAITH ${empire.resources.faith}    TICK ${state.tick}`
    );
    this.statusText.setText(
      [
        `ORDER: ${this.getModeLabel()}`,
        selectionSummary,
        `POPULATION: ${settlement.population.citizens}/${this.getCitizenCapacity(settlement.id)}  //  MILITARY: ${settlement.population.militarizedCitizens}  //  GROWTH: ${settlement.population.growthProgress}/80`,
        `LABOR: FARM ${settlement.population.farmers}  BUILD ${settlement.population.builders}  LUMBER ${settlement.population.lumberjacks}  MINE ${settlement.population.miners}  LUX ${settlement.population.luxuryWorkers}`,
        `CAPTIVES: ${settlement.population.captives}/${this.getCaptiveCapacity(settlement.id)}  //  REBELLION: ${settlement.pressures.rebellion}%  //  HEALTH ${settlement.population.health}  //  PLAGUE ${settlement.plagueTicks ?? 0}`,
        `FAITH: ${settlement.internalFaith}  //  RIVAL PRESSURE: ${settlement.externalReligiousPressure}`,
        `CIVIC RECORD: TAKEN ${empire.moralMemory?.captivesTaken ?? 0}  //  INTEGRATED ${empire.moralMemory?.captivesIntegrated ?? 0}  //  RELEASED ${empire.moralMemory?.captivesReleased ?? 0}`
      ].join("\n")
    );
    const victory = state.victory.winnerEmpireId;
    this.eventText.setText(
      victory
        ? `VICTORY // ${state.empires[victory]?.name.toUpperCase() ?? "THE WINNER"} HOLDS EVERY THRONE.`
        : `MANDATE: ${this.getImperialMandate()}\nTHREAT: ${this.getThreatForecast(settlement)}\nLATEST INTEL: ${events.at(-1) ?? "NO NEW REPORTS."}`
    );
    this.updateHeirPanel();
    this.updateLessonBanner();
    this.updateRealmPanel();
    this.updateBuildingsPanel();
    this.updateBookOfLessons();
    this.updateVictoryPanel();
    this.updateMinimap();
  }

  private getModeLabel(): string {
    if (this.mode === "building" && this.selectedBuildingKind) {
      return `DEPLOY ${this.getBuildingLabel(this.selectedBuildingKind).toUpperCase()}`;
    }
    if (this.mode === "attack-move") {
      return "ADVANCE";
    }

    return this.mode.toUpperCase();
  }

  private getImperialMandate(): string {
    const state = this.simulation.getState();
    const playerSettlements = state.empires["empire-player"].settlementIds
      .map((id) => state.settlements[id])
      .filter((settlement): settlement is SettlementState => Boolean(settlement));
    const hasFieldForce = Object.values(state.battalions).some(
      (battalion) => battalion.ownerEmpireId === "empire-player"
    );

    if (state.scenarioId === "ashen-oath") {
      const captiveCount = playerSettlements.reduce((total, settlement) => total + settlement.population.captives, 0);
      if (captiveCount > 0) {
        return "SECURE THE CAPTIVES: ASSIMILATE OR RELEASE THEM.";
      }
    }

    if (state.scenarioId === "rivergate") {
      const hasCaravan = Object.values(state.caravans).some(
        (caravan) => caravan.ownerEmpireId === "empire-player" && caravan.kind === "caravan"
      );
      if (!hasCaravan) {
        return "COMMISSION A SUPPLY WAGON FROM THE TOWN SQUARE.";
      }
    }

    if (state.scenarioId === "stonewall") {
      if (!hasFieldForce) {
        return "RAISE A BATTALION TO HOLD THE GATE.";
      }
      const gateIsGarrisoned = Object.values(state.buildings).some(
        (building) =>
          building.ownerEmpireId === "empire-player" &&
          building.kind === "gate" &&
          (building.garrisonBattalionIds?.length ?? 0) > 0
      );
      if (!gateIsGarrisoned) {
        return "GARRISON A BATTALION IN THE GATE.";
      }
    }

    const hasFarm = playerSettlements.some((settlement) =>
      settlement.buildingIds.some((id) => state.buildings[id]?.kind === "farm" && state.buildings[id]?.complete)
    );
    if (!hasFarm) {
      return "ESTABLISH A FARM ON FERTILE GROUND.";
    }
    if (!hasFieldForce) {
      return "RAISE A BATTALION TO SECURE THE CROWN.";
    }
    const rivalObserved = Object.values(state.buildings).some(
      (building) =>
        building.ownerEmpireId === "empire-rival" &&
        isPositionVisibleToEmpire(state, "empire-player", building.position)
    );
    if (!rivalObserved) {
      return "SCOUT THE FRONTIER AND FIND THE RIVAL THRONE.";
    }
    return "BREAK THE RIVAL CASTLE AND TAKE THE THRONE.";
  }

  private getThreatForecast(settlement: SettlementState): string {
    const state = this.simulation.getState();
    const castle = state.buildings[settlement.centralBuildingId];
    if (settlement.localFood < 20 || settlement.pressures.food >= 45) {
      return "FOOD RESERVES ARE STRAINED.";
    }
    if (settlement.pressures.rebellion >= 45) {
      return "CAPTIVE UNREST IS RISING.";
    }
    if (settlement.externalReligiousPressure >= 15) {
      return "RIVAL RELIGION IS UNDERMINING THE SEAT.";
    }
    if (!castle) {
      return "THE GOVERNING CASTLE HAS FALLEN.";
    }

    const nearestEnemy = [...Object.values(state.battalions), ...Object.values(state.buildings)]
      .filter(
        (entity) =>
          entity.ownerEmpireId !== "empire-player" &&
          isPositionVisibleToEmpire(state, "empire-player", entity.position)
      )
      .map((entity) => Math.hypot(entity.position.x - castle.position.x, entity.position.y - castle.position.y))
      .sort((left, right) => left - right)[0];
    if (nearestEnemy !== undefined && nearestEnemy <= 260) {
      return `HOSTILES OBSERVED ${Math.round(nearestEnemy)}M FROM THE CASTLE.`;
    }
    if (nearestEnemy !== undefined) {
      return "RIVAL FORCES ARE OBSERVED BEYOND THE PERIMETER.";
    }
    return "NO IMMEDIATE THREAT IS OBSERVED.";
  }
}
