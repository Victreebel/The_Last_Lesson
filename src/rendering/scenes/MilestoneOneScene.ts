import Phaser from "phaser";
import { getEarnedScenarioHonor, SCENARIO_HONORS, type CampaignHonor } from "../../campaign/CampaignHonors";
import { getCampaignChapter, getCampaignProgression } from "../../campaign/CampaignProgression";
import { createPlaytestRecord, createPlaytestRecordFilename, serializePlaytestRecord } from "../../campaign/PlaytestRecord";
import { getImperialMandateProgress } from "../../campaign/ImperialMandate";
import { getMandateGuidance, type MandateCommandControl } from "../../campaign/MandateGuidance";
import { HEIR_FEEDBACK } from "../../learning/HeirFeedback";
import { storeMultiplayerReconnectToken, type MultiplayerConnectRequest } from "../../app/MultiplayerLobby";
import type { CommandIntent } from "../../networking/LocalAuthority";
import { RemoteAuthorityClient } from "../../networking/RemoteAuthorityClient";
import type { RemoteConnectionState } from "../../networking/RemoteAuthorityClient";
import type { AuthoritySnapshot } from "../../networking/LocalAuthority";
import type { ServerMessage } from "../../networking/protocol";
import { AudioDirector } from "../AudioDirector";
import { getBattalionReadinessPresentation } from "../battalionReadinessPresentation";
import { getCombatFeedbackPresentation } from "../combatPresentation";
import { describeGameEvent, selectTacticalReportEvents } from "../eventNarrative";
import { getMiracleFeedbackPresentation } from "../miraclePresentation";
import { getOrderIndicators } from "../orderPresentation";
import { getLessonPresentationLines, type LessonPresentationStatus } from "../lessonPresentation";
import { getTacticalTopPanelLayout } from "../tacticalPanelLayout";
import { getTerrainPresentation } from "../terrainPresentation";
import { getTacticalUplinkStatusLines } from "../tacticalUplink";
import { BOOK_PANEL_HEIGHT, CAMPAIGN_THEATRE_LAYOUT } from "../uiLayout";
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
import {
  createPortableSaveArchive,
  createPortableSaveFilename,
  deserializePortableSaveArchive,
  serializePortableSaveArchive,
  type PortableSaveArchive
} from "../../simulation/save/PortableSave";
import { createReignReport, formatCivicRecord, formatReignDuration } from "../../simulation/reports/ReignReport";
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
  type TerrainZone,
  type WorldState
} from "../../simulation/state/WorldState";

type ToolMode = "select" | "building" | "move" | "attack" | "attack-move";

const BUILDING_OPTIONS: ReadonlyArray<{
  readonly kind: BuildingKind;
  readonly label: string;
  readonly detail: string;
}> = [
  { kind: "villa", label: "Villa", detail: "Citizen housing. Protects the Crown's civilian capacity." },
  { kind: "hovel", label: "Hovel", detail: "Captive housing. Capacity, supervision, and a rebellion target." },
  { kind: "town-square", label: "Town Square", detail: "Civic command. Enables caravans, Warships, Hounds, and captive integration." },
  { kind: "farm", label: "Farm", detail: "Requires fertile ground. Produces local food and population growth." },
  { kind: "road", label: "Road", detail: "Builds on open land. Accelerates movement, supply, and religious influence." },
  { kind: "military-quarters", label: "Military Quarters", detail: "Enables specialist battalions beyond the militia levy." },
  { kind: "mine", label: "Mine", detail: "Requires an iron vein. Produces iron for fortifications and specialists." },
  { kind: "lumber-mill", label: "Lumber Mill", detail: "Requires forest. Produces wood for construction and logistics." },
  { kind: "plantation", label: "Plantation", detail: "Requires a luxury grove. Produces Luxury for happiness and devotion." },
  { kind: "moat", label: "Moat", detail: "Defensive perimeter. Slows hostile ground forces and land caravans." },
  { kind: "wall", label: "Wall", detail: "Fortification. Garrison forces fire from its defense until breached." },
  { kind: "gate", label: "Gate", detail: "Garrisonable wall opening. A faster route through a defended line." },
  { kind: "outpost", label: "Outpost", detail: "Extends vision, local defense, and frontier religious pressure." }
];

const BUILDING_SHORTCUT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Q", "W", "E"] as const;

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

const CAMPAIGN_ART_FRAMES: Record<ScenarioId, readonly [number, number]> = {
  crownfall: [0, 0],
  rivergate: [1, 0],
  "ashen-oath": [0, 1],
  stonewall: [1, 1]
};

const CAMPAIGN_ART_ATLAS_CELL_SIZE = 627;

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

const BUILD_PANEL_WIDTH = 306;
const HEIR_PANEL_WIDTH = 286;
const ACCORD_PANEL_WIDTH = 262;
const PLACEMENT_GRID_SIZE = 32;
const DRAG_THRESHOLD = 10;
const MINIMAP_WIDTH = 230;
const MINIMAP_HEIGHT = 158;
const WORLD_TICK_MILLISECONDS = 5000;
const AUTO_SAVE_INTERVAL_TICKS = 5;
const CAMERA_ZOOM_MIN = 0.72;
const CAMERA_ZOOM_MAX = 1.5;
const CAMERA_ZOOM_STEP = 0.1;
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
const LOCAL_REDUCED_MOTION_KEY = "the-last-lesson.reduced-motion.v1";
const LOCAL_HIGH_CONTRAST_KEY = "the-last-lesson.high-contrast.v1";
const LOCAL_CAMPAIGN_CHRONICLE_KEY = "the-last-lesson.campaign-chronicle.v1";
const LOCAL_CAMPAIGN_HONORS_KEY = "the-last-lesson.campaign-honors.v1";

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

interface CommandTile {
  readonly button: Phaser.GameObjects.Rectangle;
  readonly primary: Phaser.GameObjects.Text;
  readonly secondary: Phaser.GameObjects.Text;
  readonly fill: number;
}

interface ReplayReviewState {
  readonly liveSave: SaveGame;
  readonly commandSequence: number;
  readonly targetTick: number;
}

type CampaignSetupFocus =
  | { readonly kind: "scenario"; readonly scenario: ScenarioId; readonly x: number; readonly y: number }
  | { readonly kind: "difficulty"; readonly difficulty: RivalDifficulty; readonly x: number; readonly y: number }
  | { readonly kind: "local-save"; readonly x: number; readonly y: number };

const CAMPAIGN_SCENARIOS: readonly ScenarioId[] = ["crownfall", "rivergate", "ashen-oath", "stonewall"];
const CAMPAIGN_DIFFICULTIES: readonly RivalDifficulty[] = ["disciple", "rival", "architect"];

export class MilestoneOneScene extends Phaser.Scene {
  private campaignDifficulty: RivalDifficulty = "rival";
  private campaignScenario: ScenarioId = "crownfall";
  private campaignChronicle: Partial<Record<ScenarioId, number>> = {};
  private campaignHonors: Partial<Record<ScenarioId, true>> = {};
  private recordedCampaignVictoryScenario?: ScenarioId;
  private campaignInitialWorld: WorldState = createInitialWorld(777, this.campaignDifficulty, this.campaignScenario);
  private simulation = new Simulation(structuredClone(this.campaignInitialWorld));
  private remoteAuthority?: RemoteAuthorityClient;
  private remoteUnsubscribe?: () => void;
  private remoteStatusUnsubscribe?: () => void;
  private remoteRoomId?: string;
  private remoteReconnectRequest?: MultiplayerConnectRequest;
  private readonly audio = new AudioDirector();
  private commandSequence = 0;
  private paused = false;
  private campaignSetupPending = true;
  private campaignSetupFocusIndex = 0;
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
  private motionControlLabel!: Phaser.GameObjects.Text;
  private visibilityControlLabel!: Phaser.GameObjects.Text;
  private clearLocalDataLabel!: Phaser.GameObjects.Text;
  private lessonBannerHideTimer?: Phaser.Time.TimerEvent;
  private bookPanelExpanded = false;
  private reducedMotion = false;
  private highContrast = false;
  private clearLocalDataConfirmationPending = false;
  private localPersistenceSuppressed = false;
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
  private campaignSetupInput?: Phaser.GameObjects.Zone;
  private statusText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private resourceText!: Phaser.GameObjects.Text;
  private intelPanel!: Phaser.GameObjects.Container;
  private minimapPanel!: Phaser.GameObjects.Rectangle;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapTitle!: Phaser.GameObjects.Text;
  private minimapBounds = { x: 0, y: 0 };
  private minimapEligible = false;
  private commandDock!: Phaser.GameObjects.Container;
  private commandMandateText!: Phaser.GameObjects.Text;
  private commandTooltip!: Phaser.GameObjects.Container;
  private commandTooltipBackground!: Phaser.GameObjects.Rectangle;
  private commandTooltipLabel!: Phaser.GameObjects.Text;
  private heirPanel!: Phaser.GameObjects.Container;
  private heirPanelBg!: Phaser.GameObjects.Rectangle;
  private heirPanelHeader!: Phaser.GameObjects.Rectangle;
  private heirPanelTitle!: Phaser.GameObjects.Text;
  private heirPanelBody!: Phaser.GameObjects.Text;
  private heirPanelExpanded = false;
  private readonly heirFeedbackControls: HeirFeedbackControl[] = [];
  private accordPanel!: Phaser.GameObjects.Container;
  private accordPanelBg!: Phaser.GameObjects.Rectangle;
  private accordPanelHeader!: Phaser.GameObjects.Rectangle;
  private accordPanelTitle!: Phaser.GameObjects.Text;
  private accordPanelBody!: Phaser.GameObjects.Text;
  private accordExchangeButton!: Phaser.GameObjects.Rectangle;
  private accordExchangeLabel!: Phaser.GameObjects.Text;
  private accordPanelExpanded = false;
  private buildingsPanel!: Phaser.GameObjects.Container;
  private buildingsPanelBg!: Phaser.GameObjects.Rectangle;
  private buildingsPanelHeader!: Phaser.GameObjects.Rectangle;
  private buildingsPanelTitle!: Phaser.GameObjects.Text;
  private buildingsPanelBody!: Phaser.GameObjects.Text;
  private buildingsPanelExpanded = false;
  private selectedBuildingKind: BuildingKind | null = null;
  private accessibilityAnnouncements?: HTMLElement;
  private readonly buildingTiles = new Map<BuildingKind, BuildingTile>();
  private readonly commandTiles = new Map<MandateCommandControl, CommandTile>();
  private worldLayer!: Phaser.GameObjects.Container;
  private terrainLayer?: Phaser.GameObjects.Container;
  private orderLayer?: Phaser.GameObjects.Graphics;
  private readonly buildingSprites = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly buildingArtSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly buildingLabelSprites = new Map<string, Phaser.GameObjects.Text>();
  private readonly battalionSprites = new Map<string, Phaser.GameObjects.Container>();
  private readonly caravanSprites = new Map<string, Phaser.GameObjects.Container>();
  private placementPreview?: Phaser.GameObjects.Rectangle;
  private selectionBox?: Phaser.GameObjects.Rectangle;
  private pointerDownWorld?: Phaser.Math.Vector2;
  private selectionDragActive = false;
  private suppressNextPointerUp = false;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly handleVisibilityChange = (): void => {
    if (
      document.visibilityState !== "hidden" ||
      this.remoteAuthority ||
      this.campaignSetupPending ||
      this.paused
    ) {
      return;
    }
    this.paused = true;
    this.pauseControlLabel.setText("RESUME");
    this.updateUi(["Reign paused while the field map was out of view."]);
  };

  constructor() {
    super("MilestoneOneScene");
  }

  preload(): void {
    this.load.image("painted-world", "assets/painterly-battlefield-v1.webp");
    this.load.image("building-atlas", "assets/building-atlas-v1.webp");
    this.load.image("unit-atlas", "assets/unit-atlas-v1.webp");
    this.load.image("campaign-theatres", "assets/campaign-theatres-v1.webp");
  }

  create(): void {
    // Reserve lateral camera room for the permanent command panels without moving authoritative world coordinates.
    this.cameras.main.setBounds(-280, 0, 1680, 900);
    this.configureAccessibility();
    this.worldLayer = this.add.container(0, 0);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.bindKeyboardControls();

    this.drawTerrain();
    this.restoreCampaignChronicle();
    this.restoreCampaignHonors();
    this.campaignScenario = getCampaignProgression(this.campaignChronicle).nextTheatre ?? "crownfall";
    this.createUi();
    this.paused = true;
    this.pauseControlLabel.setText("SELECT");
    this.scale.on("resize", () => this.layoutUi());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointerDown(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.handlePointerMove(pointer));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.handlePointerUp(pointer));
    this.input.on(
      "wheel",
      (pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) =>
        this.handleCameraWheel(pointer, deltaY)
    );
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.game.events.on("join-multiplayer", this.connectToMultiplayer, this);
    this.events.once("shutdown", () => {
      this.game.events.off("join-multiplayer", this.connectToMultiplayer, this);
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
      this.disconnectFromMultiplayer();
      this.accessibilityAnnouncements?.replaceChildren();
      this.accessibilityAnnouncements = undefined;
    });

    this.configureSimulationClock();
    this.restoreAudioPreference();
    this.restoreMotionPreference();
    this.restoreHighContrastPreference();

    this.assignOpeningLabor();
    this.centerCameraOnSettlement(this.inspectedSettlementId);
    this.renderWorld();
    this.updateUi(["The Crown is established."]);
  }

  private configureAccessibility(): void {
    const canvas = this.game.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", "The Last Lesson tactical map and command interface");
    canvas.setAttribute("aria-describedby", "the-last-lesson-accessibility-brief");
    canvas.setAttribute(
      "aria-keyshortcuts",
      "ArrowUp ArrowDown ArrowLeft ArrowRight Tab Enter B C D H R L M A F X Escape Space 0 1 2 3 4 5 6 7 8 9 Q W E Control+1 Control+2 Control+3 Control+4 Control+5 Control+6 Control+7 Control+8 Control+9"
    );
    this.accessibilityAnnouncements = document.getElementById("the-last-lesson-announcements") ?? undefined;
  }

  private announceAccessibility(message: string): void {
    if (!this.accessibilityAnnouncements || this.accessibilityAnnouncements.textContent === message) {
      return;
    }
    this.accessibilityAnnouncements.textContent = message;
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
    bind("R", () => this.toggleRealmPanel());
    bind("L", () => this.toggleBookOfLessons());
    bind("C", () => this.castMendSettlement());
    bind("M", () => this.enterMoveMode());
    bind("A", () => this.enterAttackMode());
    bind("F", () => this.enterAttackMoveMode());
    bind("X", () => this.toggleHighContrast());
    bind("ESC", () => this.cancelActiveCommand());
    keyboard.on("keydown", (event: KeyboardEvent) => {
      if (event.repeat || this.isTextInputFocused()) {
        return;
      }
      if (this.campaignSetupPending) {
        this.handleCampaignSetupKeyboard(event);
        return;
      }
      if (this.handleManagementPanelToggleShortcut(event)) {
        return;
      }
      if (this.handleBookShortcut(event)) {
        return;
      }
      if (this.handleBuildShortcut(event)) {
        return;
      }
      if (this.handleHeirPanelShortcut(event)) {
        return;
      }
      if (this.handleAccordPanelShortcut(event)) {
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
    return !this.isTextInputFocused();
  }

  private isTextInputFocused(): boolean {
    const activeElement = document.activeElement;
    return (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLSelectElement ||
      activeElement instanceof HTMLTextAreaElement
    );
  }

  /**
   * Accord and Heir use the scene-wide key stream so their contextual actions work
   * consistently in browser, desktop, and automated playtest input.
   */
  private handleManagementPanelToggleShortcut(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }
    const key = event.key.toUpperCase();
    if (key === "D") {
      event.preventDefault();
      this.toggleAccordPanel();
      return true;
    }
    if (key === "H") {
      event.preventDefault();
      this.toggleHeirPanel();
      return true;
    }
    return false;
  }

  /** Book shortcuts are contextual, leaving battalion control groups unchanged during field command. */
  private handleBookShortcut(event: KeyboardEvent): boolean {
    if (!this.bookPanelExpanded || event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }
    const action = {
      "0": () => this.requestClearLocalData(),
      "1": () => this.saveLocalGame(),
      "2": () => this.loadLocalGame(),
      "3": () => this.exportPortableSave(),
      "4": () => this.requestPortableSaveImport(),
      "5": () => this.verifyCurrentReplay(),
      "6": () => this.exportPlaytestRecord(),
      "7": () => this.toggleReplayReview(),
      "8": () => this.toggleReducedMotion(),
      "9": () => this.toggleHighContrast()
    }[event.key];
    if (!action) {
      return false;
    }
    event.preventDefault();
    action();
    return true;
  }

  /** Build shortcuts exist only while the visible palette is open. */
  private handleBuildShortcut(event: KeyboardEvent): boolean {
    if (!this.buildingsPanelExpanded || event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }
    const key = event.key.toUpperCase();
    const index = BUILDING_SHORTCUT_KEYS.indexOf(key as (typeof BUILDING_SHORTCUT_KEYS)[number]);
    const option = index >= 0 ? BUILDING_OPTIONS[index] : undefined;
    if (!option) {
      return false;
    }
    event.preventDefault();
    this.selectBuilding(option.kind);
    return true;
  }

  /** Heir feedback remains contextual so battlefield control groups retain their field meaning. */
  private handleHeirPanelShortcut(event: KeyboardEvent): boolean {
    if (!this.heirPanelExpanded || event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }
    const commandType = event.key === "1" ? "reward-heir" : event.key === "2" ? "punish-heir" : undefined;
    if (!commandType) {
      return false;
    }
    event.preventDefault();
    this.sendHeirFeedback(commandType);
    return true;
  }

  /** The prisoner accord has one available action, exposed as a visible contextual key. */
  private handleAccordPanelShortcut(event: KeyboardEvent): boolean {
    if (!this.accordPanelExpanded || event.ctrlKey || event.metaKey || event.altKey || event.key !== "1") {
      return false;
    }
    event.preventDefault();
    this.exchangeCaptives();
    return true;
  }

  private handleCampaignSetupKeyboard(event: KeyboardEvent): void {
    const key = event.key;
    if (key === "Tab") {
      event.preventDefault();
      this.cycleCampaignSetupFocus(event.shiftKey ? -1 : 1);
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      this.activateCampaignSetupFocus();
      return;
    }
    const direction: { readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 } | undefined =
      key === "ArrowUp" ? { x: 0, y: -1 } : key === "ArrowDown" ? { x: 0, y: 1 } : key === "ArrowLeft" ? { x: -1, y: 0 } : key === "ArrowRight" ? { x: 1, y: 0 } : undefined;
    if (!direction) {
      return;
    }
    event.preventDefault();
    this.moveCampaignSetupFocus(direction.x, direction.y);
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
    if (this.bookPanelExpanded || this.realmPanelExpanded || this.accordPanelExpanded || this.heirPanelExpanded || this.buildingsPanelExpanded) {
      this.bookPanelExpanded = false;
      this.realmPanelExpanded = false;
      this.accordPanelExpanded = false;
      this.heirPanelExpanded = false;
      this.buildingsPanelExpanded = false;
      this.updateBookOfLessons();
      this.updateRealmPanel();
      this.updateAccordPanel();
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
    if (this.buildingsPanelExpanded) {
      this.accordPanelExpanded = false;
      this.heirPanelExpanded = false;
      this.updateAccordPanel();
      this.updateHeirPanel();
    }
    this.updateBuildingsPanel();
    this.updateUi([
      this.buildingsPanelExpanded
        ? "Build panel expanded. Use keys 1 through 9, 0, Q, W, or E to select a structure."
        : "Build panel collapsed."
    ]);
  }

  private toggleHeirPanel(): void {
    this.heirPanelExpanded = !this.heirPanelExpanded;
    if (this.heirPanelExpanded) {
      this.accordPanelExpanded = false;
      this.buildingsPanelExpanded = false;
      this.updateAccordPanel();
      this.updateBuildingsPanel();
    }
    this.updateHeirPanel();
    const announcement = this.heirPanelExpanded
      ? "Heir panel expanded. Use 1 to reward or 2 to punish the latest lesson."
      : "Heir panel collapsed.";
    this.updateUi([announcement]);
    this.announceAccessibility(announcement);
  }

  private toggleAccordPanel(): void {
    this.accordPanelExpanded = !this.accordPanelExpanded;
    if (this.accordPanelExpanded) {
      this.heirPanelExpanded = false;
      this.buildingsPanelExpanded = false;
      this.updateHeirPanel();
      this.updateBuildingsPanel();
    }
    this.updateAccordPanel();
    const announcement = this.accordPanelExpanded
      ? "Accord panel expanded. Use 1 to exchange available captives."
      : "Accord panel collapsed.";
    this.updateUi([announcement]);
    this.announceAccessibility(announcement);
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
    this.updateUi([this.bookPanelExpanded ? "Book of Lessons opened." : "Book of Lessons closed."]);
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
    this.terrainLayer?.destroy(true);
    this.terrainLayer = this.add.container(0, 0);
    this.worldLayer.addAt(this.terrainLayer, 0);

    const backdrop = this.add.image(700, 450, "painted-world");
    backdrop.setDisplaySize(1400, 900);
    backdrop.setAlpha(0.82);
    this.terrainLayer.add(backdrop);

    const graphics = this.add.graphics();
    graphics.fillStyle(getTerrainPresentation("grassland").color, 0.46);
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

    this.terrainLayer.add(graphics);
  }

  private drawTerrainZone(graphics: Phaser.GameObjects.Graphics, zone: TerrainZone): void {
    const { bounds } = zone;
    const presentation = getTerrainPresentation(zone.kind);
    graphics.fillStyle(presentation.color, 0.64);
    graphics.fillRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 12);
    this.drawTerrainTexture(graphics, zone);
    graphics.lineStyle(2, 0xd6d1af, 0.35);
    graphics.strokeRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 12);

    const label = this.add.text(bounds.x + bounds.width / 2, bounds.y + 14, `[${presentation.symbol}] ${zone.label}\n${presentation.detail}`, {
      fontFamily: "Arial Black, Arial",
      fontSize: "11px",
      color: "#f4f0d5",
      align: "center",
      lineSpacing: 3,
      backgroundColor: "#111818"
    });
    label.setOrigin(0.5, 0);
    this.terrainLayer?.add(label);
  }

  private drawTerrainTexture(graphics: Phaser.GameObjects.Graphics, zone: TerrainZone): void {
    const { bounds } = zone;
    const presentation = getTerrainPresentation(zone.kind);
    const inset = 16;
    const minX = bounds.x + inset;
    const maxX = bounds.x + bounds.width - inset;
    const minY = bounds.y + 44;
    const maxY = bounds.y + bounds.height - inset;

    switch (presentation.pattern) {
      case "grass":
        graphics.lineStyle(1, presentation.patternColor, 0.22);
        for (let x = minX; x < maxX; x += 28) {
          for (let y = minY; y < maxY; y += 34) {
            graphics.lineBetween(x, y + 8, x + 3, y);
          }
        }
        return;
      case "furrows":
        graphics.lineStyle(2, presentation.patternColor, 0.28);
        for (let y = minY; y < maxY; y += 22) {
          graphics.lineBetween(minX, y + 8, maxX, y - 8);
        }
        return;
      case "canopy":
        graphics.fillStyle(presentation.patternColor, 0.26);
        for (let y = minY; y < maxY; y += 32) {
          for (let x = minX + ((Math.floor((y - minY) / 32) % 2) * 14); x < maxX; x += 30) {
            graphics.fillCircle(x, y, 8);
            graphics.fillCircle(x + 5, y - 3, 5);
          }
        }
        return;
      case "veins":
        graphics.lineStyle(2, presentation.patternColor, 0.38);
        for (let x = minX; x < maxX - 18; x += 46) {
          graphics.lineBetween(x, minY + 8, x + 16, minY + 28);
          graphics.lineBetween(x + 16, minY + 28, x + 8, maxY - 18);
          graphics.lineBetween(x + 8, maxY - 18, x + 27, maxY - 4);
        }
        return;
      case "blooms":
        graphics.fillStyle(presentation.patternColor, 0.34);
        for (let y = minY; y < maxY; y += 34) {
          for (let x = minX + ((Math.floor((y - minY) / 34) % 2) * 16); x < maxX; x += 38) {
            graphics.fillCircle(x, y, 5);
            graphics.fillCircle(x + 5, y + 3, 3);
          }
        }
        return;
      case "contours":
        graphics.lineStyle(2, presentation.patternColor, 0.28);
        for (let y = minY + 12; y < maxY; y += 30) {
          graphics.strokeEllipse(bounds.x + bounds.width / 2, y, bounds.width - 40, 20);
        }
        return;
      case "ripples":
        graphics.lineStyle(2, presentation.patternColor, 0.34);
        for (let x = minX; x < maxX - 22; x += 38) {
          graphics.lineBetween(x, minY + 12, x + 22, minY + 12);
          graphics.lineBetween(x + 8, Math.min(minY + 58, maxY), x + 30, Math.min(minY + 58, maxY));
        }
        return;
      case "reeds":
        graphics.fillStyle(0x2b3f35, 0.26);
        for (let x = minX; x < maxX; x += 48) {
          graphics.fillEllipse(x + 14, maxY - 12, 30, 11);
        }
        graphics.lineStyle(2, presentation.patternColor, 0.32);
        for (let x = minX; x < maxX; x += 22) {
          graphics.lineBetween(x, maxY - 10, x + 3, minY + 24);
        }
        return;
    }
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
    this.createAccordPanel();
    this.createHeirPanel();
    this.createBuildingsPanel();
    this.layoutUi();
  }

  private createTopHud(): void {
    this.topHud = this.add.rectangle(0, 0, 1, 58, UI_COLORS.panelDeep, 0.96).setOrigin(0);
    this.topHud.setScrollFactor(0);
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

  private restoreMotionPreference(): void {
    let storedPreference: string | null = null;
    try {
      storedPreference = window.localStorage.getItem(LOCAL_REDUCED_MOTION_KEY);
    } catch {
      // A browser may deny local storage, so the system accessibility preference remains the fallback.
    }
    this.reducedMotion = storedPreference === null
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : storedPreference === "true";
    this.motionControlLabel.setText(this.reducedMotion ? "8 MOTION // REDUCED" : "8 MOTION // FULL");
  }

  private toggleReducedMotion(): void {
    this.reducedMotion = !this.reducedMotion;
    this.motionControlLabel.setText(this.reducedMotion ? "8 MOTION // REDUCED" : "8 MOTION // FULL");
    try {
      window.localStorage.setItem(LOCAL_REDUCED_MOTION_KEY, String(this.reducedMotion));
    } catch {
      // Motion preference is optional local presentation state.
    }
    this.updateUi([this.reducedMotion ? "Reduced motion enabled." : "Full motion enabled."]);
  }

  private restoreHighContrastPreference(): void {
    let storedPreference: string | null = null;
    try {
      storedPreference = window.localStorage.getItem(LOCAL_HIGH_CONTRAST_KEY);
    } catch {
      // Contrast preference is optional local presentation state.
    }
    this.highContrast = storedPreference === null
      ? window.matchMedia("(prefers-contrast: more)").matches
      : storedPreference === "true";
    this.applyHighContrastPreference();
  }

  private toggleHighContrast(): void {
    this.highContrast = !this.highContrast;
    this.applyHighContrastPreference();
    try {
      window.localStorage.setItem(LOCAL_HIGH_CONTRAST_KEY, String(this.highContrast));
    } catch {
      // Contrast preference is optional local presentation state.
    }
    this.updateUi([this.highContrast ? "High contrast enabled." : "Standard contrast enabled."]);
  }

  private applyHighContrastPreference(): void {
    const canvas = this.game.canvas;
    canvas.classList.toggle("the-last-lesson--high-contrast", this.highContrast);
    canvas.dataset.contrastMode = this.highContrast ? "high" : "standard";
    this.visibilityControlLabel.setText(this.highContrast ? "9 VISIBILITY // HIGH" : "9 VISIBILITY // STANDARD");
  }

  private restoreCampaignChronicle(): void {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_CAMPAIGN_CHRONICLE_KEY) ?? "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return;
      }
      const record = parsed as Record<string, unknown>;
      const scenarios: readonly ScenarioId[] = ["crownfall", "rivergate", "ashen-oath", "stonewall"];
      this.campaignChronicle = scenarios.reduce<Partial<Record<ScenarioId, number>>>((chronicle, scenario) => {
        const victories = record[scenario];
        if (typeof victories === "number" && Number.isSafeInteger(victories) && victories > 0) {
          chronicle[scenario] = victories;
        }
        return chronicle;
      }, {});
    } catch {
      this.campaignChronicle = {};
    }
  }

  private getCampaignConquests(scenario: ScenarioId): number {
    return this.campaignChronicle[scenario] ?? 0;
  }

  private restoreCampaignHonors(): void {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_CAMPAIGN_HONORS_KEY) ?? "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return;
      }
      const record = parsed as Record<string, unknown>;
      const scenarios: readonly ScenarioId[] = ["crownfall", "rivergate", "ashen-oath", "stonewall"];
      this.campaignHonors = scenarios.reduce<Partial<Record<ScenarioId, true>>>((honors, scenario) => {
        if (record[scenario] === true) {
          honors[scenario] = true;
        }
        return honors;
      }, {});
    } catch {
      this.campaignHonors = {};
    }
  }

  private getCampaignHonor(scenario: ScenarioId): CampaignHonor | undefined {
    return this.campaignHonors[scenario] ? SCENARIO_HONORS[scenario] : undefined;
  }

  private recordCampaignHonor(state: WorldState): CampaignHonor | undefined {
    const honor = getEarnedScenarioHonor(state);
    if (!honor || this.campaignHonors[state.scenarioId]) {
      return this.getCampaignHonor(state.scenarioId);
    }
    this.campaignHonors = { ...this.campaignHonors, [state.scenarioId]: true };
    if (!this.localPersistenceSuppressed) {
      try {
        window.localStorage.setItem(LOCAL_CAMPAIGN_HONORS_KEY, JSON.stringify(this.campaignHonors));
      } catch {
        // Campaign honors are optional local presentation progress.
      }
    }
    return honor;
  }

  private recordCampaignVictory(scenario: ScenarioId): void {
    if (this.recordedCampaignVictoryScenario === scenario) {
      return;
    }
    this.recordedCampaignVictoryScenario = scenario;
    this.campaignChronicle = {
      ...this.campaignChronicle,
      [scenario]: this.getCampaignConquests(scenario) + 1
    };
    if (!this.localPersistenceSuppressed) {
      try {
        window.localStorage.setItem(LOCAL_CAMPAIGN_CHRONICLE_KEY, JSON.stringify(this.campaignChronicle));
      } catch {
        // Chronicle progress is optional local presentation state.
      }
    }
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
    this.playCombatFeedback(result.events);
    this.renderWorld();
    this.playMiracleFeedback(result.events);
    if (this.replayReview && result.tick >= this.replayReview.targetTick) {
      this.paused = true;
      this.pauseControlLabel.setText("REPLAY END");
      this.updateUi(["Replay reached the live reign's current tick. Return to continue commanding."]);
      return;
    }
    this.updateUi(this.getTacticalReports(result.events));
  }

  private openMultiplayerLobby(): void {
    if (this.networkControlLabel.text === "REJOIN" && this.remoteReconnectRequest) {
      this.connectToMultiplayer(this.remoteReconnectRequest);
      return;
    }
    this.game.events.emit("open-multiplayer-lobby", {
      scenarioId: this.campaignScenario,
      rivalDifficulty: this.campaignDifficulty
    });
  }

  private connectToMultiplayer(request: MultiplayerConnectRequest): void {
    this.disconnectFromMultiplayer();
    this.remoteReconnectRequest = request;
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
      ...(request.reconnectToken ? { reconnectToken: request.reconnectToken } : {}),
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
    this.remoteReconnectRequest = undefined;
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
      if (this.remoteReconnectRequest) {
        this.remoteReconnectRequest = { ...this.remoteReconnectRequest, reconnectToken: message.reconnectToken };
        storeMultiplayerReconnectToken(this.remoteReconnectRequest, message.reconnectToken);
      }
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
    this.networkControlLabel.setText(this.remoteReconnectRequest ? "REJOIN" : "MULTI");
    this.pauseControlLabel.setText("FROZEN");
    this.speedControlLabel.setText("FROZEN");
    this.updateUi([
      this.remoteReconnectRequest
        ? "Multiplayer host disconnected. The reign is frozen; use REJOIN to recover the room."
        : "Multiplayer host disconnected. The reign is frozen."
    ]);
  }

  private applyRemoteSnapshot(snapshot: AuthoritySnapshot): void {
    this.simulation = new Simulation(structuredClone(snapshot.state), undefined, {
      eventLog: structuredClone(snapshot.recentEvents)
    });
    this.drawTerrain();
    this.inspectedSettlementId = this.getActiveControlledSettlement()?.id ?? "settlement-capital";
    this.lastLessonEventId = undefined;
    this.lessonBanner.setVisible(false);
    this.playCombatFeedback(snapshot.recentEvents);
    this.renderWorld();
    this.playMiracleFeedback(snapshot.recentEvents);
    this.updateUi(this.getTacticalReports(snapshot.recentEvents));
  }

  private createLessonBanner(): void {
    const background = this.add.rectangle(0, 0, 420, 82, UI_COLORS.panelDeep, 0.96).setOrigin(0);
    background.setStrokeStyle(1, UI_COLORS.accent);
    this.lessonBannerLabel = this.add.text(14, 8, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "9px",
      color: "#f2d77f",
      lineSpacing: 1,
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
    const status: LessonPresentationStatus =
      lessonEvent.type === "doctrine-reinforced"
        ? "reinforced"
        : lessonEvent.type === "doctrine-disciplined"
          ? "disciplined"
          : "observed";
    const eventConfidence = typeof lessonEvent.payload.confidence === "number" ? lessonEvent.payload.confidence : 0;
    this.lessonBannerLabel.setText(
      getLessonPresentationLines({
        status,
        heirName: heir?.name,
        condition: doctrine?.condition,
        action: doctrine?.preferredAction,
        goal: doctrine?.goal,
        confidence: doctrine?.confidence ?? eventConfidence
      }).join("\n")
    );
    this.tweens.killTweensOf(this.lessonBanner);
    this.lessonBannerHideTimer?.remove(false);
    this.lessonBannerHideTimer = undefined;
    this.lessonBanner.setVisible(true).setAlpha(1);
    if (this.reducedMotion) {
      this.lessonBannerHideTimer = this.time.delayedCall(2600, () => this.lessonBanner.setVisible(false));
      return;
    }
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
    this.bookControlLabel = this.add.text(200, 23, "BOOK [+]", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.bookControl = this.add.container(0, 0, [control, this.bookControlLabel]);
    this.bookControl.setScrollFactor(0).setDepth(41);

    const background = this.add.rectangle(0, 0, 470, BOOK_PANEL_HEIGHT, UI_COLORS.panelDeep, 0.98).setOrigin(0);
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
    const loadButton = this.add.rectangle(248, 360, 204, 34, UI_COLORS.command, 1).setOrigin(0);
    loadButton.setStrokeStyle(1, UI_COLORS.trim);
    const saveLabel = this.add.text(30, 371, "1 SAVE LOCAL", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const loadLabel = this.add.text(260, 371, "2 LOAD LOCAL", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const exportButton = this.add.rectangle(18, 404, 204, 34, UI_COLORS.commandActive, 1).setOrigin(0);
    exportButton.setStrokeStyle(1, UI_COLORS.trim);
    const importButton = this.add.rectangle(248, 404, 204, 34, UI_COLORS.command, 1).setOrigin(0);
    importButton.setStrokeStyle(1, UI_COLORS.trim);
    const exportLabel = this.add.text(30, 415, "3 EXPORT .TLL", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const importLabel = this.add.text(260, 415, "4 IMPORT .TLL", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const verifyButton = this.add.rectangle(18, 448, 204, 34, UI_COLORS.command, 1).setOrigin(0);
    verifyButton.setStrokeStyle(1, UI_COLORS.trim);
    const verifyLabel = this.add.text(44, 459, "5 VERIFY REPLAY", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const playtestButton = this.add.rectangle(248, 448, 204, 34, UI_COLORS.commandActive, 1).setOrigin(0);
    playtestButton.setStrokeStyle(1, UI_COLORS.trim);
    const playtestLabel = this.add.text(260, 459, "6 EXPORT PLAYTEST", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const replayButton = this.add.rectangle(18, 492, 434, 34, UI_COLORS.commandActive, 1).setOrigin(0);
    replayButton.setStrokeStyle(1, UI_COLORS.trim);
    this.replayControlLabel = this.add.text(154, 503, "7 REVIEW REIGN", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const motionButton = this.add.rectangle(18, 536, 434, 34, UI_COLORS.command, 1).setOrigin(0);
    motionButton.setStrokeStyle(1, UI_COLORS.trim);
    this.motionControlLabel = this.add.text(128, 547, "8 MOTION // FULL", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const visibilityButton = this.add.rectangle(18, 580, 434, 34, UI_COLORS.command, 1).setOrigin(0);
    visibilityButton.setStrokeStyle(1, UI_COLORS.trim);
    this.visibilityControlLabel = this.add.text(116, 591, "9 VISIBILITY // STANDARD", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const clearLocalDataButton = this.add.rectangle(18, 624, 434, 34, UI_COLORS.danger, 1).setOrigin(0);
    clearLocalDataButton.setStrokeStyle(1, UI_COLORS.trim);
    this.clearLocalDataLabel = this.add.text(132, 635, "0 CLEAR LOCAL DATA", {
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
      exportButton,
      importButton,
      exportLabel,
      importLabel,
      verifyButton,
      verifyLabel,
      playtestButton,
      playtestLabel,
      replayButton,
      this.replayControlLabel,
      motionButton,
      this.motionControlLabel,
      visibilityButton,
      this.visibilityControlLabel,
      clearLocalDataButton,
      this.clearLocalDataLabel
    ]);
    this.bookPanel.setScrollFactor(0).setDepth(70).setVisible(false);
    this.updateBookOfLessons();
  }

  private handleBookPointerDown(localX: number, localY: number): void {
    this.suppressNextPointerUp = true;

    if (localY >= 360 && localY < 394) {
      if (localX < 230) {
        this.saveLocalGame();
      } else {
        this.loadLocalGame();
      }
      return;
    }
    if (localY >= 404 && localY < 438) {
      if (localX < 230) {
        this.exportPortableSave();
      } else {
        this.requestPortableSaveImport();
      }
      return;
    }
    if (localY >= 448 && localY < 482) {
      if (localX < 230) {
        this.verifyCurrentReplay();
      } else {
        this.exportPlaytestRecord();
      }
      return;
    }
    if (localY >= 492 && localY < 526) {
      this.toggleReplayReview();
      return;
    }
    if (localY >= 536 && localY < 570) {
      this.toggleReducedMotion();
      return;
    }
    if (localY >= 580 && localY < 614) {
      this.toggleHighContrast();
      return;
    }
    if (localY >= 624 && localY < 658) {
      this.requestClearLocalData();
    }
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
        this.suppressNextPointerUp = true;
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
    const background = this.add.rectangle(0, 0, 420, 304, UI_COLORS.panelDeep, 0.98).setOrigin(0);
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
    const restartButton = this.add.rectangle(32, 244, 168, 34, UI_COLORS.commandActive, 1).setOrigin(0);
    restartButton.setStrokeStyle(1, UI_COLORS.trim);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.suppressNextPointerUp = true;
      this.restartCampaign();
    });
    const restartLabel = this.add.text(47, 255, "REPEAT THEATRE", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    const theatreButton = this.add.rectangle(220, 244, 168, 34, UI_COLORS.command, 1).setOrigin(0);
    theatreButton.setStrokeStyle(1, UI_COLORS.trim);
    theatreButton.setInteractive({ useHandCursor: true });
    theatreButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.suppressNextPointerUp = true;
      this.returnToCampaignTheatre();
    });
    const theatreLabel = this.add.text(234, 255, "CAMPAIGN THEATRE", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.victoryPanel = this.add.container(0, 0, [
      background,
      this.victoryTitle,
      this.victoryDetail,
      restartButton,
      restartLabel,
      theatreButton,
      theatreLabel
    ]);
    this.victoryPanel.setScrollFactor(0).setDepth(90).setVisible(false);
  }

  private createCampaignSetupPanel(): void {
    const hasSavedReign = this.hasLocalSave();
    const focusEntries = this.getCampaignSetupFocusEntries(hasSavedReign);
    if (!focusEntries[this.campaignSetupFocusIndex]) {
      this.campaignSetupFocusIndex = Math.max(0, CAMPAIGN_SCENARIOS.indexOf(this.campaignScenario));
    }
    const focusedControl = focusEntries[this.campaignSetupFocusIndex];
    const panelHeight = hasSavedReign
      ? CAMPAIGN_THEATRE_LAYOUT.heightWithLocalSave
      : CAMPAIGN_THEATRE_LAYOUT.height;
    const background = this.add
      .rectangle(0, 0, CAMPAIGN_THEATRE_LAYOUT.width, panelHeight, UI_COLORS.panelDeep, 0.98)
      .setOrigin(0);
    background.setStrokeStyle(2, UI_COLORS.accent);
    const title = this.add.text(20, 18, "CAMPAIGN THEATRE", {
      fontFamily: "Arial Black, Arial",
      fontSize: "19px",
      color: "#f2d77f"
    });
    title.setScrollFactor(0);
    const subtitle = this.add.text(20, 50, SCENARIO_PROFILES[this.campaignScenario].summary.toUpperCase(), {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: UI_COLORS.muted
    });
    subtitle.setScrollFactor(0);
    const terrainIntel = this.add.text(
      20,
      66,
      `TERRAIN // ${SCENARIO_PROFILES[this.campaignScenario].terrainIntel}`,
      {
        fontFamily: "Arial Black, Arial",
        fontSize: "9px",
        color: "#c3d4c5"
      }
    );
    terrainIntel.setScrollFactor(0);
    const selectedHonor = this.getCampaignHonor(this.campaignScenario);
    const honorProfile = SCENARIO_HONORS[this.campaignScenario];
    const honorIntel = this.add.text(
      20,
      CAMPAIGN_THEATRE_LAYOUT.honorY,
      selectedHonor
        ? `HONOR // ${selectedHonor.label} SEALED`
        : `HONOR // ${honorProfile.label}: ${honorProfile.condition}`,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "8px",
        color: selectedHonor ? "#f2d77f" : "#afc0b1",
        wordWrap: { width: 430 }
      }
    );
    honorIntel.setScrollFactor(0);
    const directiveIntel = this.add.text(
      20,
      CAMPAIGN_THEATRE_LAYOUT.directiveY,
      `OPENING // ${SCENARIO_PROFILES[this.campaignScenario].openingDirective.toUpperCase()}`,
      {
        fontFamily: "Arial, sans-serif",
        fontSize: "8px",
        color: "#b8c4b7",
        wordWrap: { width: 430 }
      }
    );
    directiveIntel.setScrollFactor(0);
    const controls: Phaser.GameObjects.GameObject[] = [background, title, subtitle, terrainIntel, honorIntel, directiveIntel];
    const campaignProgression = getCampaignProgression(this.campaignChronicle);
    CAMPAIGN_SCENARIOS.forEach((scenario, index) => {
      const profile = SCENARIO_PROFILES[scenario];
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x =
        CAMPAIGN_THEATRE_LAYOUT.scenarioFirstColumnX +
        column * (CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth + CAMPAIGN_THEATRE_LAYOUT.scenarioColumnGap);
      const y =
        CAMPAIGN_THEATRE_LAYOUT.scenarioFirstRowY +
        row * (CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight + CAMPAIGN_THEATRE_LAYOUT.scenarioRowGap);
      const selected = scenario === this.campaignScenario;
      const focused = focusedControl?.kind === "scenario" && focusedControl.scenario === scenario;
      const conquests = this.getCampaignConquests(scenario);
      const honor = this.getCampaignHonor(scenario);
      const [artColumn, artRow] = CAMPAIGN_ART_FRAMES[scenario];
      const art = this.add.image(
        x + CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth / 2,
        y + CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight / 2,
        "campaign-theatres"
      );
      art.setCrop(
        artColumn * CAMPAIGN_ART_ATLAS_CELL_SIZE,
        artRow * CAMPAIGN_ART_ATLAS_CELL_SIZE,
        CAMPAIGN_ART_ATLAS_CELL_SIZE,
        CAMPAIGN_ART_ATLAS_CELL_SIZE
      );
      // Cropped atlas frames are rendered at the card bounds. This prevents an
      // atlas origin from bleeding art into the campaign briefing or neighbor.
      art.setDisplaySize(CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth, CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight);
      art.setOrigin(0.5);
      const button = this.add
        .rectangle(
          x,
          y,
          CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth,
          CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight,
          selected ? UI_COLORS.commandActive : UI_COLORS.command,
          selected ? 0.26 : 0.46
        )
        .setOrigin(0);
      button.setScrollFactor(0);
      button.setStrokeStyle(focused ? 3 : selected ? 2 : 1, focused ? 0xf7efc8 : selected ? UI_COLORS.accent : UI_COLORS.trim);
      const terrainBadge = this.add
        .rectangle(x + 6, y + 6, CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth - 12, 15, UI_COLORS.panelDeep, 0.84)
        .setOrigin(0);
      const terrainTag = this.add.text(x + 11, y + 10, profile.terrainTag, {
        fontFamily: "Arial Black, Arial",
        fontSize: "8px",
        color: "#d7e5d9",
        wordWrap: { width: CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth - 22 }
      });
      const caption = this.add
        .rectangle(
          x,
          y + CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight - 30,
          CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth,
          30,
          UI_COLORS.panelDeep,
          0.84
        )
        .setOrigin(0);
      const chapter = getCampaignChapter(scenario);
      const status = conquests
        ? `CROWNED ${conquests}`
        : campaignProgression.nextTheatre === scenario
          ? "NEXT THEATRE"
          : "UNCONQUERED";
      const label = this.add.text(x + 9, y + CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight - 27, `CHAPTER ${chapter} // ${profile.label}`, {
        fontFamily: "Arial Black, Arial",
        fontSize: "10px",
        color: conquests || campaignProgression.nextTheatre === scenario ? "#f2d77f" : UI_COLORS.text,
        wordWrap: { width: 184 }
      });
      const detail = this.add.text(x + 9, y + CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight - 13, honor ? `HONOR // ${honor.label}` : status, {
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
        color: UI_COLORS.muted,
        wordWrap: { width: 184 }
      });
      controls.push(art, button, terrainBadge, terrainTag, caption, label, detail);
    });
    const beginPrompt = this.add.text(20, CAMPAIGN_THEATRE_LAYOUT.beginPromptY, "BEGIN REIGN // SELECT RIVAL DOCTRINE", {
      fontFamily: "Arial Black, Arial",
      fontSize: "9px",
      color: "#e2bd61"
    });
    controls.push(beginPrompt);
    CAMPAIGN_DIFFICULTIES.forEach((difficulty, index) => {
      const profile = RIVAL_DIFFICULTY_PROFILES[difficulty];
      const focused = focusedControl?.kind === "difficulty" && focusedControl.difficulty === difficulty;
      const x = 20 + index * 146;
      const button = this.add
        .rectangle(x, CAMPAIGN_THEATRE_LAYOUT.difficultyY, 136, CAMPAIGN_THEATRE_LAYOUT.difficultyHeight, UI_COLORS.command, 1)
        .setOrigin(0);
      button.setScrollFactor(0);
      button.setStrokeStyle(focused ? 3 : 1, focused ? 0xf7efc8 : UI_COLORS.trim);
      const label = this.add.text(x + 12, CAMPAIGN_THEATRE_LAYOUT.difficultyY + 17, `BEGIN // ${profile.label}`, {
        fontFamily: "Arial Black, Arial",
        fontSize: "10px",
        color: UI_COLORS.text,
        wordWrap: { width: 112 }
      });
      const detail = this.add.text(
        x + 12,
        CAMPAIGN_THEATRE_LAYOUT.difficultyY + 42,
        `${profile.briefing.toUpperCase()}\nGRACE ${profile.openingGraceTicks} TICKS // LEARNING +${profile.doctrineConfidenceGain}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "8px",
          color: UI_COLORS.muted,
          lineSpacing: 4,
          wordWrap: { width: 112 }
        }
      );
      controls.push(button, label, detail);
    });
    if (hasSavedReign) {
      const focused = focusedControl?.kind === "local-save";
      const continueButton = this.add.rectangle(20, CAMPAIGN_THEATRE_LAYOUT.localSaveY, 430, 34, UI_COLORS.commandActive, 1).setOrigin(0);
      continueButton.setScrollFactor(0);
      continueButton.setStrokeStyle(focused ? 3 : 1, focused ? 0xf7efc8 : UI_COLORS.trim);
      const continueLabel = this.add.text(140, CAMPAIGN_THEATRE_LAYOUT.localSaveY + 10, "CONTINUE LOCAL REIGN", {
        fontFamily: "Arial Black, Arial",
        fontSize: "11px",
        color: UI_COLORS.text
      });
      controls.push(continueButton, continueLabel);
    }
    this.campaignSetupPanel = this.add.container(0, 0, controls);
    this.campaignSetupPanel.setSize(CAMPAIGN_THEATRE_LAYOUT.width, panelHeight);
    this.campaignSetupPanel.setScrollFactor(0).setDepth(100).setVisible(true);
    this.campaignSetupInput?.destroy();
    this.campaignSetupInput = this.add
      .zone(0, 0, CAMPAIGN_THEATRE_LAYOUT.width, panelHeight)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(101);
    this.campaignSetupInput.setInteractive({ useHandCursor: true });
    this.campaignSetupInput.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer, localX: number, localY: number) => this.handleCampaignSetupPointerDown(pointer, localX, localY)
    );
  }

  private handleCampaignSetupPointerDown(pointer: Phaser.Input.Pointer, localX: number, localY: number): void {
    pointer.event.stopPropagation();
    this.suppressNextPointerUp = true;

    const scenarioBottom =
      CAMPAIGN_THEATRE_LAYOUT.scenarioFirstRowY +
      2 * CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight +
      CAMPAIGN_THEATRE_LAYOUT.scenarioRowGap;
    if (localY >= CAMPAIGN_THEATRE_LAYOUT.scenarioFirstRowY && localY < scenarioBottom) {
      const column = localX < CAMPAIGN_THEATRE_LAYOUT.width / 2 ? 0 : 1;
      const row =
        localY < CAMPAIGN_THEATRE_LAYOUT.scenarioFirstRowY + CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight + CAMPAIGN_THEATRE_LAYOUT.scenarioRowGap
          ? 0
          : 1;
      this.campaignSetupFocusIndex = row * 2 + column;
      this.selectCampaignScenario(CAMPAIGN_SCENARIOS[this.campaignSetupFocusIndex]);
      return;
    }

    if (
      localY >= CAMPAIGN_THEATRE_LAYOUT.difficultyY &&
      localY < CAMPAIGN_THEATRE_LAYOUT.difficultyY + CAMPAIGN_THEATRE_LAYOUT.difficultyHeight
    ) {
      const index = Math.floor((localX - 20) / 146);
      if (index >= 0 && index < CAMPAIGN_DIFFICULTIES.length && localX >= 20 + index * 146 && localX < 156 + index * 146) {
        this.campaignSetupFocusIndex = CAMPAIGN_SCENARIOS.length + index;
        this.startCampaign(CAMPAIGN_DIFFICULTIES[index]);
      }
      return;
    }

    if (
      this.hasLocalSave() &&
      localY >= CAMPAIGN_THEATRE_LAYOUT.localSaveY &&
      localY < CAMPAIGN_THEATRE_LAYOUT.localSaveY + 34 &&
      localX >= 20 &&
      localX < 450
    ) {
      this.campaignSetupFocusIndex = CAMPAIGN_SCENARIOS.length + CAMPAIGN_DIFFICULTIES.length;
      this.loadLocalGame();
    }
  }

  private selectCampaignScenario(scenario: ScenarioId): void {
    this.campaignSetupFocusIndex = CAMPAIGN_SCENARIOS.indexOf(scenario);
    if (this.campaignScenario === scenario) {
      this.announceAccessibility(`${this.describeCampaignSetupFocus(this.getCampaignSetupFocusEntries()[this.campaignSetupFocusIndex])} Selected.`);
      return;
    }
    this.campaignScenario = scenario;
    this.refreshCampaignSetupPanel();
    this.announceAccessibility(
      `${SCENARIO_PROFILES[scenario].label} selected. ${SCENARIO_PROFILES[scenario].summary} Terrain: ${SCENARIO_PROFILES[scenario].terrainIntel}. Opening: ${SCENARIO_PROFILES[scenario].openingDirective} Honor: ${SCENARIO_HONORS[scenario].label}. ${SCENARIO_HONORS[scenario].condition}`
    );
  }

  private getCampaignSetupFocusEntries(hasSavedReign = this.hasLocalSave()): readonly CampaignSetupFocus[] {
    const scenarioEntries = CAMPAIGN_SCENARIOS.map((scenario, index) => ({
      kind: "scenario" as const,
      scenario,
      x:
        CAMPAIGN_THEATRE_LAYOUT.scenarioFirstColumnX +
        (index % 2) * (CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth + CAMPAIGN_THEATRE_LAYOUT.scenarioColumnGap) +
        CAMPAIGN_THEATRE_LAYOUT.scenarioCardWidth / 2,
      y:
        CAMPAIGN_THEATRE_LAYOUT.scenarioFirstRowY +
        Math.floor(index / 2) * (CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight + CAMPAIGN_THEATRE_LAYOUT.scenarioRowGap) +
        CAMPAIGN_THEATRE_LAYOUT.scenarioCardHeight / 2
    }));
    const difficultyEntries = CAMPAIGN_DIFFICULTIES.map((difficulty, index) => ({
      kind: "difficulty" as const,
      difficulty,
      x: 20 + index * 146 + 68,
      y: CAMPAIGN_THEATRE_LAYOUT.difficultyY + CAMPAIGN_THEATRE_LAYOUT.difficultyHeight / 2
    }));
    return hasSavedReign
      ? [...scenarioEntries, ...difficultyEntries, { kind: "local-save", x: 235, y: CAMPAIGN_THEATRE_LAYOUT.localSaveY + 17 }]
      : [...scenarioEntries, ...difficultyEntries];
  }

  private describeCampaignSetupFocus(focus: CampaignSetupFocus | undefined): string {
    if (!focus) {
      return "Campaign Theatre";
    }
    if (focus.kind === "scenario") {
      const profile = SCENARIO_PROFILES[focus.scenario];
      const honor = SCENARIO_HONORS[focus.scenario];
      return `Campaign Theatre focus: Chapter ${getCampaignChapter(focus.scenario)}, ${profile.label}. ${profile.summary} Terrain: ${profile.terrainIntel}. Opening: ${profile.openingDirective} Honor: ${honor.label}. ${honor.condition}`;
    }
    if (focus.kind === "difficulty") {
      const profile = RIVAL_DIFFICULTY_PROFILES[focus.difficulty];
      return `Campaign Theatre focus: Begin ${profile.label}. ${profile.briefing} ${profile.openingGraceTicks} opening grace ticks. Learning plus ${profile.doctrineConfidenceGain}.`;
    }
    return "Campaign Theatre focus: Continue local reign.";
  }

  private refreshCampaignSetupPanel(): void {
    this.campaignSetupInput?.destroy();
    this.campaignSetupInput = undefined;
    this.campaignSetupPanel.destroy(true);
    this.createCampaignSetupPanel();
    this.layoutUi();
  }

  private cycleCampaignSetupFocus(direction: -1 | 1): void {
    const entries = this.getCampaignSetupFocusEntries();
    this.campaignSetupFocusIndex = (this.campaignSetupFocusIndex + direction + entries.length) % entries.length;
    this.refreshCampaignSetupPanel();
    this.announceAccessibility(this.describeCampaignSetupFocus(entries[this.campaignSetupFocusIndex]));
  }

  private moveCampaignSetupFocus(horizontal: -1 | 0 | 1, vertical: -1 | 0 | 1): void {
    const entries = this.getCampaignSetupFocusEntries();
    const current = entries[this.campaignSetupFocusIndex];
    if (!current) {
      this.campaignSetupFocusIndex = Math.max(0, CAMPAIGN_SCENARIOS.indexOf(this.campaignScenario));
      this.refreshCampaignSetupPanel();
      return;
    }
    const candidates = entries
      .map((entry, index) => ({ entry, index, deltaX: entry.x - current.x, deltaY: entry.y - current.y }))
      .filter(({ deltaX, deltaY }) =>
        horizontal
          ? Math.sign(deltaX) === horizontal && Math.abs(deltaY) <= Math.abs(deltaX) * 0.75
          : Math.sign(deltaY) === vertical && Math.abs(deltaX) <= Math.abs(deltaY) * 0.75
      )
      .map(({ entry, index, deltaX, deltaY }) => ({
        entry,
        index,
        score: horizontal ? deltaX * deltaX * 4 + deltaY * deltaY : deltaY * deltaY * 4 + deltaX * deltaX
      }))
      .sort((left, right) => left.score - right.score);
    const next = candidates[0];
    if (!next) {
      return;
    }
    this.campaignSetupFocusIndex = next.index;
    this.refreshCampaignSetupPanel();
    this.announceAccessibility(this.describeCampaignSetupFocus(next.entry));
  }

  private activateCampaignSetupFocus(): void {
    const focus = this.getCampaignSetupFocusEntries()[this.campaignSetupFocusIndex];
    if (!focus) {
      return;
    }
    if (focus.kind === "scenario") {
      this.selectCampaignScenario(focus.scenario);
      return;
    }
    if (focus.kind === "difficulty") {
      this.startCampaign(focus.difficulty);
      return;
    }
    this.loadLocalGame();
  }

  private startCampaign(difficulty: RivalDifficulty): void {
    this.campaignDifficulty = difficulty;
    this.campaignSetupPending = false;
    this.campaignSetupPanel.setVisible(false);
    this.campaignSetupInput?.setVisible(false).disableInteractive();
    this.restartCampaign(`${RIVAL_DIFFICULTY_PROFILES[difficulty].label} rival doctrine selected.`);
    const campaignAnnouncement = `${SCENARIO_PROFILES[this.campaignScenario].label} reign begins. ${this.getImperialMandate()}`;
    // Phaser dispatches the scene-wide pointer-up after this button's pointer-down handler.
    // Announce on the next frame so the generic selection message cannot mask the campaign transition.
    this.time.delayedCall(16, () => this.announceAccessibility(campaignAnnouncement));
  }

  private restartCampaign(message = "A new reign begins."): void {
    this.disconnectFromMultiplayer();
    this.campaignInitialWorld = createInitialWorld(777, this.campaignDifficulty, this.campaignScenario);
    this.localPersistenceSuppressed = false;
    this.simulation = new Simulation(structuredClone(this.campaignInitialWorld));
    this.commandSequence = 0;
    this.recordedCampaignVictoryScenario = undefined;
    this.replayReview = undefined;
    this.paused = false;
    this.inspectedSettlementId = "settlement-capital";
    this.lastLessonEventId = undefined;
    this.lessonBanner.setVisible(false);
    this.pauseControlLabel.setText("PAUSE");
    this.campaignSetupPending = false;
    this.campaignSetupPanel.setVisible(false);
    this.campaignSetupInput?.setVisible(false).disableInteractive();
    this.clearSelection();
    this.clearControlGroups();
    this.selectedBuildingKind = null;
    this.mode = "select";
    this.clearPlacementPreview();
    this.assignOpeningLabor();
    this.centerCameraOnSettlement(this.inspectedSettlementId);
    this.drawTerrain();
    this.renderWorld();
    this.updateUi([message]);
  }

  private returnToCampaignTheatre(): void {
    this.disconnectFromMultiplayer();
    this.paused = true;
    this.pauseControlLabel.setText("SELECT");
    this.campaignSetupPending = true;
    this.campaignScenario = getCampaignProgression(this.campaignChronicle).nextTheatre ?? this.campaignScenario;
    this.campaignSetupFocusIndex = Math.max(0, CAMPAIGN_SCENARIOS.indexOf(this.campaignScenario));
    this.victoryPanel.setVisible(false);
    this.campaignSetupInput?.destroy();
    this.campaignSetupInput = undefined;
    this.campaignSetupPanel.destroy(true);
    this.createCampaignSetupPanel();
    this.clearSelection();
    this.clearControlGroups();
    this.mode = "select";
    this.clearPlacementPreview();
    this.layoutUi();
    this.updateUi(["Choose the next Campaign Theatre."]);
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
    if (this.campaignSetupPending) {
      this.victoryPanel.setVisible(false);
      return;
    }
    const state = this.simulation.getState();
    const report = createReignReport(state, this.simulation.getEventLog(), "empire-player");
    if (!report) {
      this.victoryPanel.setVisible(false);
      return;
    }
    const playerWon = report.winnerEmpireId === "empire-player";
    let campaignHonor: CampaignHonor | undefined;
    if (playerWon) {
      this.recordCampaignVictory(state.scenarioId);
      campaignHonor = this.recordCampaignHonor(state);
    }
    const campaignConquests = this.getCampaignConquests(state.scenarioId);
    const nextTheatre = getCampaignProgression(this.campaignChronicle).nextTheatre;
    this.victoryTitle.setText(playerWon ? "THE CROWN ASCENDS" : "THE CROWN HAS FALLEN");
    this.victoryDetail.setText(
      playerWon
        ? [
            "Every rival throne has fallen. Your lessons now govern the realm.",
            "",
            `REIGN ${formatReignDuration(report.durationSeconds)}  //  THRONES ${report.thronesCaptured}`,
            `LESSONS ${report.lessonsTaught}  //  HEIRS GUIDED ${report.heirsGuided}`,
            `FAITH HELD ${report.faithHeld}`,
            formatCivicRecord(report),
            `CHRONICLE: ${SCENARIO_PROFILES[state.scenarioId].label.toUpperCase()} CROWNED ${campaignConquests}`,
            nextTheatre ? `NEXT THEATRE: ${SCENARIO_PROFILES[nextTheatre].label}` : "CAMPAIGN: EVERY THEATRE CROWNED",
            campaignHonor
              ? `HONOR: ${campaignHonor.label}`
              : `HONOR UNSEALED: ${SCENARIO_HONORS[state.scenarioId].label}`
          ].join("\\n")
        : [
            "The rival crown holds every throne. A different doctrine must rise.",
            "",
            `REIGN ${formatReignDuration(report.durationSeconds)}  //  THRONES ${report.thronesCaptured}`,
            `LESSONS ${report.lessonsTaught}  //  HEIRS GUIDED ${report.heirsGuided}`,
            `FAITH HELD ${report.faithHeld}`,
            formatCivicRecord(report)
          ].join("\\n")
    );
    this.victoryPanel.setVisible(true);
  }

  private updateBookOfLessons(): void {
    this.bookPanel.setVisible(this.bookPanelExpanded);
    this.bookControlLabel.setText(this.bookPanelExpanded ? "BOOK [-]" : "BOOK [+]");
    this.replayControlLabel.setText(this.replayReview ? "7 RETURN TO REIGN" : "7 REVIEW REIGN");
    this.clearLocalDataLabel.setText(
      this.clearLocalDataConfirmationPending ? "0 CONFIRM CLEAR DATA" : "0 CLEAR LOCAL DATA"
    );
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
      .map((event) => `${event.tick}: ${this.describeEvent(event)}`);
    this.bookPanelBody.setText(
      [
      `CURRENT SEAT: ${this.getSettlementDisplayName(settlement?.id)}`,
      `CURRENT HEIR: ${heir?.name.toUpperCase() ?? "UNASSIGNED"}`,
      `STATE: ${heir?.mode.toUpperCase() ?? "NONE"}  //  TRUST: ${heir?.trust ?? 0}`,
      `RIVAL DOCTRINE: ${RIVAL_DIFFICULTY_PROFILES[state.rivalDifficulty].label}`,
      `THEATRE HONOR: ${this.getCampaignHonor(state.scenarioId)?.label ?? `UNSEALED // ${SCENARIO_HONORS[state.scenarioId].condition.toUpperCase()}`}`,
      `FAITH: ${settlement?.internalFaith ?? 0}  //  RIVAL PRESSURE: ${settlement?.externalReligiousPressure ?? 0}`,
      formatCivicRecord(state.empires["empire-player"]?.moralMemory),
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
      this.localPersistenceSuppressed = false;
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
      const save = deserializeSaveGame(serialized);
      this.restoreSavedReign(save, this.readLocalReplayOrigin() ?? save.world);
      this.updateUi(["Local save restored."]);
    } catch {
      this.updateUi(["Local save could not be restored."]);
    }
  }

  private exportPortableSave(): void {
    if (this.remoteAuthority) {
      this.updateUi(["Leave multiplayer before exporting a local reign."]);
      return;
    }
    try {
      const archive = createPortableSaveArchive(this.simulation, this.campaignInitialWorld);
      const data = new Blob([serializePortableSaveArchive(archive)], { type: "application/json" });
      const url = URL.createObjectURL(data);
      const download = document.createElement("a");
      download.href = url;
      download.download = createPortableSaveFilename(this.simulation.getState());
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      this.updateUi(["Portable reign exported from the Book of Lessons."]);
    } catch {
      this.updateUi(["Portable save could not be exported in this browser."]);
    }
  }

  private exportPlaytestRecord(): void {
    try {
      const state = this.simulation.getState();
      const data = new Blob([serializePlaytestRecord(createPlaytestRecord(state, this.simulation.getEventLog()))], {
        type: "application/json"
      });
      const url = URL.createObjectURL(data);
      const download = document.createElement("a");
      download.href = url;
      download.download = createPlaytestRecordFilename(state);
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      this.updateUi(["Local playtest record exported. No data was transmitted."]);
    } catch {
      this.updateUi(["Playtest record could not be exported in this browser."]);
    }
  }

  private requestPortableSaveImport(): void {
    const input = document.createElement("input");
    input.id = "the-last-lesson-portable-save-input";
    input.type = "file";
    input.accept = ".tll,application/json";
    input.style.display = "none";
    input.setAttribute("aria-label", "Choose a The Last Lesson portable save archive");
    const removeInput = () => input.remove();
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];
        removeInput();
        if (file) {
          void this.importPortableSave(file);
        }
      },
      { once: true }
    );
    input.addEventListener("cancel", removeInput, { once: true });
    document.body.append(input);
    input.click();
  }

  private async importPortableSave(file: File): Promise<void> {
    try {
      const archive = deserializePortableSaveArchive(await file.text());
      this.restorePortableSave(archive);
      this.updateUi(["Portable reign restored. The Book retains its original lesson history."]);
    } catch {
      this.updateUi(["That .tll archive could not be restored."]);
    }
  }

  private restorePortableSave(archive: PortableSaveArchive): void {
    this.restoreSavedReign(archive.save, archive.campaignInitialWorld);
  }

  private restoreSavedReign(save: SaveGame, campaignInitialWorld: WorldState): void {
    this.disconnectFromMultiplayer();
    this.localPersistenceSuppressed = false;
    this.simulation = restoreSaveGame(save);
    this.campaignInitialWorld = structuredClone(campaignInitialWorld);
    this.campaignDifficulty = this.simulation.getState().rivalDifficulty;
    this.campaignScenario = this.simulation.getState().scenarioId;
    this.campaignSetupPending = false;
    this.campaignSetupPanel.setVisible(false);
    this.campaignSetupInput?.setVisible(false).disableInteractive();
    this.paused = false;
    this.pauseControlLabel.setText("PAUSE");
    this.inspectedSettlementId = "settlement-capital";
    this.lastLessonEventId = undefined;
    this.lessonBanner.setVisible(false);
    this.replayReview = undefined;
    this.clearSelection();
    this.clearControlGroups();
    this.centerCameraOnSettlement(this.inspectedSettlementId);
    this.drawTerrain();
    this.renderWorld();
  }

  private hasLocalSave(): boolean {
    try {
      return window.localStorage.getItem(LOCAL_SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  private recordAutoSave(tick: number): void {
    if (this.localPersistenceSuppressed || tick % AUTO_SAVE_INTERVAL_TICKS !== 0) {
      return;
    }
    try {
      window.localStorage.setItem(LOCAL_SAVE_KEY, serializeSaveGame(createSaveGame(this.simulation)));
      window.localStorage.setItem(LOCAL_REPLAY_ORIGIN_KEY, JSON.stringify(this.campaignInitialWorld));
    } catch {
      // Saving is optional presentation persistence and must never interrupt simulation.
    }
  }

  private readLocalReplayOrigin(): WorldState | undefined {
    try {
      const serialized = window.localStorage.getItem(LOCAL_REPLAY_ORIGIN_KEY);
      if (!serialized) {
        return undefined;
      }
      const candidate = JSON.parse(serialized) as Partial<WorldState>;
      if (typeof candidate.tick === "number" && typeof candidate.seed === "number" && candidate.empires && candidate.settlements) {
        return candidate as WorldState;
      }
    } catch {
      // A local save remains valid even if its optional replay origin was not retained.
    }
    return undefined;
  }

  private requestClearLocalData(): void {
    if (!this.clearLocalDataConfirmationPending) {
      this.clearLocalDataConfirmationPending = true;
      this.updateBookOfLessons();
      this.updateUi(["Press 0 or select CONFIRM CLEAR DATA to remove this browser's local records."]);
      return;
    }
    try {
      const keys = Array.from({ length: window.localStorage.length }, (_value, index) => window.localStorage.key(index)).filter(
        (key): key is string => Boolean(key?.startsWith("the-last-lesson."))
      );
      for (const key of keys) {
        window.localStorage.removeItem(key);
      }
      this.campaignChronicle = {};
      this.campaignHonors = {};
      this.localPersistenceSuppressed = true;
      this.clearLocalDataConfirmationPending = false;
      this.updateBookOfLessons();
      this.updateUi(["Local records cleared. This active reign and downloaded files remain available."]);
    } catch {
      this.clearLocalDataConfirmationPending = false;
      this.updateBookOfLessons();
      this.updateUi(["Local records could not be cleared in this browser."]);
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
    const background = this.add.rectangle(0, 0, 332, 218, UI_COLORS.panel, 0.95).setOrigin(0);
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
      fontSize: "10px",
      color: UI_COLORS.text,
      lineSpacing: 3
    });
    this.eventText = this.add.text(14, 124, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
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
    this.commandMandateText = this.add.text(152, 10, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "9px",
      color: "#e2bd61"
    });
    const divider = this.add.rectangle(14, 29, 382, 1, UI_COLORS.trim, 1).setOrigin(0);
    this.commandDock = this.add.container(0, 0, [background, title, this.commandMandateText, divider]);
    this.commandDock.setScrollFactor(0).setDepth(40);

    this.addCommandButton(14, 42, "SUPPLY", "WAGON", () => this.createCaravan(), UI_COLORS.command, "supply");
    this.addCommandButton(110, 42, "MOVE", "UNIT", () => this.enterMoveMode(), UI_COLORS.command, "move");
    this.addCommandButton(206, 42, "ATTACK", "TARGET", () => this.enterAttackMode(), UI_COLORS.danger, "attack");
    this.addCommandButton(302, 42, "RETREAT", "TO CROWN", () => this.retreatSelectedBattalions(), UI_COLORS.danger);
    this.addLaborButton(14, "FOOD", () => this.setLaborFocus("farmers"));
    this.addLaborButton(90, "WOOD", () => this.setLaborFocus("lumberjacks"));
    this.addLaborButton(166, "IRON", () => this.setLaborFocus("miners"));
    this.addLaborButton(242, "BUILD", () => this.setLaborFocus("builders"));
    this.addLaborButton(318, "LUX", () => this.setLaborFocus("luxuryWorkers"));
    this.addCommandButton(14, 150, "MILITIA", "FOOD 8", () => this.createBattalion("militia"), UI_COLORS.command, "militia");
    this.addCommandButton(110, 150, "SPEARS", "IRON 8", () => this.createBattalion("spears"));
    this.addCommandButton(206, 150, "ARCHERS", "WOOD 8", () => this.createBattalion("archers"));
    this.addCommandButton(302, 150, "RAIDERS", "8W 8I", () => this.createBattalion("raiders"));
    this.addWideCommandButton(14, 204, "BLESS HARVEST", "12 FAITH", () => this.castBlessHarvest());
    this.addWideCommandButton(210, 204, "INSPIRE ARMY", "16 FAITH", () => this.castInspireBattalions());
    this.addCommandButton(14, 258, "ASSIMILATE", "4 CAPTIVES", () => this.assimilateCaptives(), UI_COLORS.command, "assimilate");
    this.addCommandButton(110, 258, "RELEASE", "4 CAPTIVES", () => this.releaseCaptives(), UI_COLORS.command, "release");
    this.addWideCommandButton(210, 258, "DISEMBARK", "SELECTED CARAVAN", () => this.disembarkCaravan());
    this.addWideCommandButton(14, 312, "GARRISON", "NEAREST DEFENSE WORKS", () => this.garrisonSelectedBattalions(), "garrison");
    this.addWideCommandButton(210, 312, "WARSHIP", "18W 4I / TOWN SQUARE", () => this.createShip());
    this.addCommandButton(14, 366, "HOUNDS", "8F 4W", () => this.createBattalion("hounds"));
    this.addCommandButton(110, 366, "MEND", "14 FAITH", () => this.castMendSettlement(), UI_COLORS.command, "mend");
    this.addWideCommandButton(206, 366, "DIVINE JUDGMENT", "18 FAITH / RELIGIOUS WARD", () => this.castDivineJudgment());
  }

  private createCommandTooltip(): void {
    this.commandTooltipBackground = this.add.rectangle(0, 0, 248, 42, UI_COLORS.panelDeep, 0.97).setOrigin(0);
    this.commandTooltipBackground.setStrokeStyle(1, UI_COLORS.accent);
    this.commandTooltipLabel = this.add.text(10, 8, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      color: UI_COLORS.text,
      wordWrap: { width: 228 }
    });
    this.commandTooltip = this.add.container(0, 0, [this.commandTooltipBackground, this.commandTooltipLabel]);
    this.commandTooltip.setScrollFactor(0).setDepth(80).setVisible(false);
  }

  private showCommandTooltip(pointer: Phaser.Input.Pointer, message: string): void {
    this.commandTooltipLabel.setText(message);
    const tooltipHeight = Math.max(42, this.commandTooltipLabel.height + 16);
    this.commandTooltipBackground.setSize(248, tooltipHeight);
    const x = Phaser.Math.Clamp(pointer.x + 12, 8, Math.max(8, this.scale.width - 256));
    const y = Phaser.Math.Clamp(pointer.y - tooltipHeight - 8, 64, Math.max(64, this.scale.height - tooltipHeight - 8));
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
    this.minimapGraphics.fillStyle(getTerrainPresentation("grassland").color, 1);
    this.minimapGraphics.fillRect(x, y, width, height);
    for (const zone of state.terrainZones) {
      this.minimapGraphics.fillStyle(getTerrainPresentation(zone.kind).color, 1);
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
    fill = UI_COLORS.command,
    mandateControl?: MandateCommandControl
  ): void {
    const button = this.add.rectangle(x, y, 82, 46, fill, 1).setOrigin(0);
    button.setStrokeStyle(1, UI_COLORS.trim);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.suppressNextPointerUp = true;
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
    if (mandateControl) {
      this.commandTiles.set(mandateControl, { button, primary, secondary, fill });
    }
  }

  private addLaborButton(x: number, detail: string, onClick: () => void): void {
    const button = this.add.rectangle(x, 96, 70, 46, UI_COLORS.command, 1).setOrigin(0);
    button.setStrokeStyle(1, UI_COLORS.trim);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.suppressNextPointerUp = true;
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
    onClick: () => void,
    mandateControl?: MandateCommandControl
  ): void {
    const button = this.add.rectangle(x, y, 182, 46, UI_COLORS.commandActive, 1).setOrigin(0);
    button.setStrokeStyle(1, UI_COLORS.trim);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.suppressNextPointerUp = true;
      this.audio.play("command");
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
    if (mandateControl) {
      this.commandTiles.set(mandateControl, { button, primary, secondary, fill: UI_COLORS.commandActive });
    }
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
    this.addHeirFeedbackButton(14, 304, "1 REWARD", UI_COLORS.commandActive, "reward-heir");
    this.addHeirFeedbackButton(146, 304, "2 PUNISH", UI_COLORS.danger, "punish-heir");
    this.updateHeirPanel();
  }

  private createAccordPanel(): void {
    this.accordPanelBg = this.add.rectangle(0, 0, ACCORD_PANEL_WIDTH, 48, UI_COLORS.panel, 0.96).setOrigin(0);
    this.accordPanelBg.setStrokeStyle(1, UI_COLORS.trim);
    this.accordPanelBg.setInteractive({ useHandCursor: false });
    this.accordPanelBg.on("pointerdown", (pointer: Phaser.Input.Pointer) => pointer.event.stopPropagation());
    this.accordPanelHeader = this.add.rectangle(0, 0, ACCORD_PANEL_WIDTH, 48, UI_COLORS.panelDeep, 0.98).setOrigin(0);
    this.accordPanelHeader.setInteractive({ useHandCursor: true });
    this.accordPanelHeader.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.toggleAccordPanel();
    });
    this.accordPanelTitle = this.add.text(14, 9, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "12px",
      color: "#f2d77f"
    });
    this.accordPanelBody = this.add.text(14, 56, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      color: UI_COLORS.text,
      lineSpacing: 4,
      wordWrap: { width: ACCORD_PANEL_WIDTH - 28 }
    });
    this.accordExchangeButton = this.add.rectangle(14, 142, ACCORD_PANEL_WIDTH - 28, 36, UI_COLORS.commandActive, 1).setOrigin(0);
    this.accordExchangeButton.setStrokeStyle(1, UI_COLORS.trim);
    this.accordExchangeButton.setInteractive({ useHandCursor: true });
    this.accordExchangeButton.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.suppressNextPointerUp = true;
      this.exchangeCaptives();
    });
    this.accordExchangeButton.on("pointerover", (pointer: Phaser.Input.Pointer) => {
      this.showCommandTooltip(pointer, "Prisoner Accord: return equal numbers of captives. This Crown-only negotiation does not teach heirs.");
    });
    this.accordExchangeButton.on("pointerout", () => this.hideCommandTooltip());
    this.accordExchangeLabel = this.add.text(28, 153, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "10px",
      color: UI_COLORS.text
    });
    this.accordPanel = this.add.container(0, 0, [
      this.accordPanelBg,
      this.accordPanelHeader,
      this.accordPanelTitle,
      this.accordPanelBody,
      this.accordExchangeButton,
      this.accordExchangeLabel
    ]);
    this.accordPanel.setScrollFactor(0).setDepth(40).setSize(ACCORD_PANEL_WIDTH, 48);
    this.updateAccordPanel();
  }

  private getPrisonerAccord():
    | { readonly settlement: SettlementState; readonly rivalSettlement: SettlementState; readonly count: number }
    | undefined {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      return undefined;
    }
    const rivals = Object.values(this.simulation.getState().settlements)
      .filter((candidate) => candidate.ownerEmpireId !== settlement.ownerEmpireId)
      .sort(
        (left, right) =>
          right.population.captives - left.population.captives || left.id.localeCompare(right.id)
      );
    const rivalSettlement = rivals[0];
    if (!rivalSettlement) {
      return undefined;
    }
    const count = Math.max(
      0,
      Math.min(
        4,
        settlement.population.captives,
        rivalSettlement.population.captives,
        this.getCitizenCapacity(settlement.id) - settlement.population.citizens,
        this.getCitizenCapacity(rivalSettlement.id) - rivalSettlement.population.citizens
      )
    );
    return { settlement, rivalSettlement, count };
  }

  private updateAccordPanel(): void {
    const accord = this.getPrisonerAccord();
    const activeMandate = getImperialMandateProgress(this.simulation.getState()).activeStep;
    const accordIsMandated = getMandateGuidance(activeMandate.id).surface === "accord";
    const height = this.accordPanelExpanded ? 190 : 48;
    this.accordPanelBg.setSize(ACCORD_PANEL_WIDTH, height);
    this.accordPanel.setSize(ACCORD_PANEL_WIDTH, height);
    this.accordPanelHeader.setFillStyle(accordIsMandated ? UI_COLORS.commandActive : UI_COLORS.panelDeep, 0.98);
    this.accordPanelTitle.setText(
      this.accordPanelExpanded
        ? "ACCORD // PRISONERS [-]"
        : `ACCORD // PRISONERS [${accordIsMandated ? "!" : "+"}]`
    );
    this.accordPanelTitle.setColor(accordIsMandated ? UI_COLORS.text : "#f2d77f");
    this.accordPanelBody.setVisible(this.accordPanelExpanded);
    this.accordExchangeButton.setVisible(this.accordPanelExpanded);
    this.accordExchangeLabel.setVisible(this.accordPanelExpanded);

    if (this.accordPanelExpanded) {
      const settlement = accord?.settlement;
      const rivalSettlement = accord?.rivalSettlement;
      const available = accord?.count ?? 0;
      this.accordPanelBody.setText(
        settlement && rivalSettlement
          ? [
              `${this.getSettlementDisplayName(settlement.id)} HOLDS: ${settlement.population.captives} RIVAL`,
              `${this.getSettlementDisplayName(rivalSettlement.id)} HOLDS: ${rivalSettlement.population.captives} CROWN`,
              available > 0
                ? "KEY 1: RETURN EQUAL PRISONERS. HEIRS DO NOT LEARN."
                : "Both realms must hold prisoners and have civil housing."
            ].join("\n")
          : "No rival settlement can negotiate an accord."
      );
      this.accordExchangeLabel.setText(available > 0 ? `1 EXCHANGE ${available} CAPTIVE${available === 1 ? "" : "S"}` : "ACCORD UNAVAILABLE");
      this.accordExchangeButton.setFillStyle(available > 0 ? UI_COLORS.commandActive : UI_COLORS.command, 1);
      this.accordExchangeButton.setAlpha(available > 0 ? 1 : 0.45);
      this.accordExchangeLabel.setAlpha(available > 0 ? 1 : 0.55);
    }
    this.layoutUi();
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
      this.suppressNextPointerUp = true;
      this.sendHeirFeedback(commandType);
    });
    const feedback = commandType === "reward-heir" ? HEIR_FEEDBACK.reward : HEIR_FEEDBACK.punish;
    const text = this.add.text(x + 12, y + 6, `${label} ${feedback.confidenceDelta > 0 ? "+" : ""}${feedback.confidenceDelta}\nTRUST ${feedback.trustDelta > 0 ? "+" : ""}${feedback.trustDelta}`, {
      fontFamily: "Arial Black, Arial",
      fontSize: "8px",
      color: UI_COLORS.text,
      lineSpacing: 2
    });
    this.heirPanel.add([button, text]);
    this.heirFeedbackControls.push({ button, label: text });
  }

  private updateHeirPanel(): void {
    const settlement = this.getActiveSettlement();
    const heir = this.getActiveHeir();
    const activeMandate = getImperialMandateProgress(this.simulation.getState()).activeStep;
    const heirLessonIsMandated = getMandateGuidance(activeMandate.id).surface === "heir";
    const doctrines = this.getHeirDoctrines(heir);
    const lastDoctrine = heir?.lastDoctrineId ? this.simulation.getState().doctrines[heir.lastDoctrineId] : undefined;
    const height = this.heirPanelExpanded ? 396 : 48;

    this.heirPanelBg.setSize(HEIR_PANEL_WIDTH, height);
    this.heirPanel.setSize(HEIR_PANEL_WIDTH, height);
    this.heirPanelHeader.setFillStyle(heirLessonIsMandated ? UI_COLORS.commandActive : UI_COLORS.panelDeep, 0.98);
    this.heirPanelTitle.setText(
      this.heirPanelExpanded
        ? `HEIR // ${this.getSettlementDisplayName(settlement?.id)} [-]`
        : `HEIR // ${this.getSettlementDisplayName(settlement?.id)} [${heirLessonIsMandated ? "!" : "+"}]`
    );
    this.heirPanelTitle.setColor(heirLessonIsMandated ? UI_COLORS.text : "#f2d77f");
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
            .slice(0, 2)
            .map(
              (doctrine) =>
                `- ${doctrine.domain.toUpperCase()} // ${doctrine.preferredAction.toUpperCase()}  ${doctrine.confidence}%`
            )
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
            ? `${lastDoctrine.domain.toUpperCase()} // ${lastDoctrine.preferredAction.toUpperCase()}  ${lastDoctrine.confidence}%`
            : "Awaiting the God-King's example.",
          lastDoctrine ? `WHEN: ${lastDoctrine.condition.toUpperCase()}` : "WHEN: A command is observed.",
          lastDoctrine ? `PURPOSE: ${lastDoctrine.goal.toUpperCase()}` : "PURPOSE: SHAPE FUTURE GOVERNANCE.",
          lastDoctrine
            ? `FEEDBACK: REWARD +${HEIR_FEEDBACK.reward.confidenceDelta} CONFIDENCE / +${HEIR_FEEDBACK.reward.trustDelta} TRUST // PUNISH ${HEIR_FEEDBACK.punish.confidenceDelta} / ${HEIR_FEEDBACK.punish.trustDelta}`
            : "FEEDBACK: OBSERVE A LESSON BEFORE YOU REINFORCE OR DISCIPLINE IT.",
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
        this.suppressNextPointerUp = true;
        this.selectBuilding(option.kind);
      });
      button.on("pointerover", (pointer: Phaser.Input.Pointer) => {
        this.showCommandTooltip(pointer, `${option.label.toUpperCase()}: ${option.detail}`);
      });
      button.on("pointerout", () => this.hideCommandTooltip());
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
    const topPanelLayout = getTacticalTopPanelLayout(width, {
      accord: ACCORD_PANEL_WIDTH,
      heir: HEIR_PANEL_WIDTH,
      build: BUILD_PANEL_WIDTH
    });
    const scale = narrow ? 0.6 : topPanelLayout.scale;

    this.topHud.setSize(width, topHeight);
    this.gameTitleText.setPosition(18, 10);
    const lessonScale = narrow ? Math.min(1, (width - 32) / 420) : 1;
    this.lessonBanner.setScale(lessonScale);
    this.lessonBanner.setPosition(
      Math.max(16, Math.round((width - 420 * lessonScale) / 2)),
      Math.max(topHeight + 14, height - 98 * lessonScale)
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
    const headerControlScale = narrow ? 0.7 : 1;
    const headerControlOffsetX = narrow ? -115 : 0;
    const headerControlOffsetY = narrow ? 48 : 0;
    this.bookControl.setScale(headerControlScale);
    this.realmControl.setScale(narrow ? 0.7 : 1);
    this.bookControl.setPosition(headerControlOffsetX, headerControlOffsetY);
    this.realmControl.setPosition(narrow ? -113 : 0, narrow ? 48 : 0);
    const bookScale = narrow ? Math.min(1, (width - 32) / 470) : 1;
    const realmScale = narrow ? Math.min(1, (width - 32) / 384) : 1;
    const victoryScale = narrow ? Math.min(1, (width - 32) / 420) : 1;
    const campaignScale = narrow ? Math.min(1, (width - 32) / CAMPAIGN_THEATRE_LAYOUT.width) : 1;
    this.bookPanel.setScale(bookScale);
    this.realmPanel.setScale(realmScale);
    this.victoryPanel.setScale(victoryScale);
    this.campaignSetupPanel.setScale(campaignScale);
    this.bookPanel.setPosition(
      Math.max(16, Math.round((width - 470 * bookScale) / 2)),
      Math.max(topHeight + 18, Math.round((height - BOOK_PANEL_HEIGHT * bookScale) / 2))
    );
    this.realmPanel.setPosition(
      Math.max(16, Math.round((width - 384 * realmScale) / 2)),
      Math.max(topHeight + 18, Math.round((height - 238) / 2))
    );
    this.victoryPanel.setPosition(
      Math.max(16, Math.round((width - 420 * victoryScale) / 2)),
      Math.max(topHeight + 18, Math.round((height - 304 * victoryScale) / 2))
    );
    const campaignPanelX = Math.max(16, Math.round((width - CAMPAIGN_THEATRE_LAYOUT.width * campaignScale) / 2));
    const campaignPanelY = Math.max(topHeight + 18, Math.round((height - this.campaignSetupPanel.height * campaignScale) / 2));
    this.campaignSetupPanel.setPosition(campaignPanelX, campaignPanelY);
    this.campaignSetupInput?.setScale(campaignScale).setPosition(campaignPanelX, campaignPanelY);
    this.intelPanel.setVisible(!narrow);
    this.intelPanel.setPosition(16, topHeight + 14);
    this.commandDock.setScale(narrow ? 0.86 : 1);
    this.commandDock.setPosition(narrow ? 8 : 16, narrow ? Math.max(topHeight + 112, height - 400) : Math.max(topHeight + 220, height - 450));
    const buildPanelHeight = this.buildingsPanelExpanded ? 76 + Math.ceil(BUILDING_OPTIONS.length / 3) * 76 + 8 : 48;
    const minimapY = this.buildingsPanelExpanded
      ? Math.max(topHeight + 210, topHeight + 14 + buildPanelHeight * scale + 12)
      : Math.max(topHeight + 210, height - MINIMAP_HEIGHT - 16);
    const minimapVisible = !narrow && minimapY + MINIMAP_HEIGHT <= height - 16;
    this.minimapEligible = minimapVisible;
    this.minimapBounds = { x: Math.max(16, width - MINIMAP_WIDTH - 16), y: minimapY };
    this.minimapPanel.setVisible(minimapVisible);
    this.minimapGraphics.setVisible(minimapVisible);
    this.minimapTitle.setVisible(minimapVisible);
    this.minimapPanel.setPosition(this.minimapBounds.x, this.minimapBounds.y);
    this.minimapTitle.setPosition(this.minimapBounds.x + 10, this.minimapBounds.y + 8);
    this.updateMinimap();
    if (this.heirPanel) {
      this.heirPanel.setScale(scale);
      this.heirPanel.setPosition(narrow ? 10 : topPanelLayout.heirX, topHeight + 14);
    }
    if (this.accordPanel) {
      this.accordPanel.setScale(scale);
      this.accordPanel.setPosition(narrow ? 10 : topPanelLayout.accordX, narrow ? topHeight + 70 : topHeight + 14);
    }
    if (this.buildingsPanel) {
      this.buildingsPanel.setScale(scale);
      this.buildingsPanel.setPosition(narrow ? 194 : topPanelLayout.buildX, topHeight + 14);
    }
    // The Heir panel requests an early layout while the Build panel is still being created.
    if (this.buildingsPanel) {
      this.applyCampaignPresentationMode();
    }
  }

  /** Keeps Campaign Theatre a calm selection view; it never changes game state or input rules. */
  private applyCampaignPresentationMode(): void {
    const theatreOpen = this.campaignSetupPending;
    const tacticalVisible = !theatreOpen;

    this.worldLayer.setAlpha(theatreOpen ? 0.3 : 1);
    this.pauseControl.setVisible(tacticalVisible);
    this.speedControl.setVisible(tacticalVisible);
    this.networkControl.setVisible(tacticalVisible);
    this.audioControl.setVisible(tacticalVisible);
    this.bookControl.setVisible(tacticalVisible);
    this.realmControl.setVisible(tacticalVisible);
    this.resourceText.setVisible(tacticalVisible);
    this.intelPanel.setVisible(tacticalVisible && this.scale.width >= 640);
    this.commandDock.setVisible(tacticalVisible);
    this.accordPanel.setVisible(tacticalVisible);
    this.heirPanel.setVisible(tacticalVisible);
    this.buildingsPanel.setVisible(tacticalVisible);
    this.minimapPanel.setVisible(tacticalVisible && this.minimapEligible);
    this.minimapGraphics.setVisible(tacticalVisible && this.minimapEligible);
    this.minimapTitle.setVisible(tacticalVisible && this.minimapEligible);
    this.bookPanel.setVisible(tacticalVisible && this.bookPanelExpanded);
    this.realmPanel.setVisible(tacticalVisible && this.realmPanelExpanded);
    if (theatreOpen) {
      this.lessonBanner.setVisible(false);
      this.victoryPanel.setVisible(false);
    }

    this.game.canvas.setAttribute("data-campaign-phase", theatreOpen ? "theatre" : "tactical");
    this.game.canvas.setAttribute(
      "aria-label",
      theatreOpen ? "The Last Lesson Campaign Theatre selection" : "The Last Lesson tactical map and command interface"
    );
  }

  private updateBuildingsPanel(): void {
    const settlement = this.getActiveControlledSettlement();
    const mandateGuidance = getMandateGuidance(getImperialMandateProgress(this.simulation.getState()).activeStep.id);
    const farmIsMandated = mandateGuidance.surface === "build";
    const counts = this.getBuildingCounts();
    const buildRows = Math.ceil(BUILDING_OPTIONS.length / 3);
    const height = this.buildingsPanelExpanded ? 76 + buildRows * 76 + 8 : 48;

    this.buildingsPanelBg.setSize(BUILD_PANEL_WIDTH, height);
    this.buildingsPanel.setSize(BUILD_PANEL_WIDTH, height);
    this.buildingsPanelTitle.setText(
      this.buildingsPanelExpanded
        ? `BUILD // ${this.getSettlementDisplayName(settlement?.id)} [-]`
        : `BUILD // ${this.getSettlementDisplayName(settlement?.id)} [${farmIsMandated ? "!" : "+"}]`
    );
    this.buildingsPanelTitle.setColor(farmIsMandated ? UI_COLORS.text : "#f2d77f");
    this.buildingsPanelBody.setVisible(this.buildingsPanelExpanded);
    for (const [kind, tile] of this.buildingTiles) {
      const isSelected = kind === this.selectedBuildingKind;
      const isMandated = mandateGuidance.buildingTargets.includes(kind);
      const affordability = this.getBuildingAffordability(kind);
      tile.button.setVisible(this.buildingsPanelExpanded);
      tile.icon.setVisible(this.buildingsPanelExpanded);
      tile.label.setVisible(this.buildingsPanelExpanded);
      tile.count.setVisible(this.buildingsPanelExpanded);
      tile.button.setFillStyle(isSelected || isMandated ? UI_COLORS.commandActive : UI_COLORS.command, 1);
      tile.button.setStrokeStyle(isSelected || isMandated ? 2 : 1, isSelected || isMandated ? UI_COLORS.accent : UI_COLORS.trim);
      tile.button.setAlpha(affordability.canAfford ? 1 : 0.48);
      tile.icon.setAlpha(affordability.canAfford ? 1 : 0.48);
      tile.label.setAlpha(affordability.canAfford ? 1 : 0.48);
      tile.count.setAlpha(affordability.canAfford ? 1 : 0.48);
      const cost = getBuildingCost(kind);
      const shortcut = BUILDING_SHORTCUT_KEYS[BUILDING_OPTIONS.findIndex((option) => option.kind === kind)];
      tile.count.setText(`${shortcut} OWNED ${counts[kind] ?? 0}\nCOST ${cost.wood}W ${cost.iron}I`);
    }

    if (this.buildingsPanelExpanded) {
      const affordability = this.selectedBuildingKind ? this.getBuildingAffordability(this.selectedBuildingKind) : undefined;
      this.buildingsPanelBody.setText(
        this.selectedBuildingKind
          ? affordability?.canAfford
            ? `READY: ${this.getBuildingLabel(this.selectedBuildingKind).toUpperCase()} // Select terrain to deploy.`
            : `INSUFFICIENT: ${this.formatBuildingShortfall(affordability!)}.`
          : "KEYS 1-9, 0, Q/W/E // Select a structure, then select terrain to deploy."
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
    const affordability = this.getBuildingAffordability(kind);
    if (!affordability.canAfford) {
      this.updateUi([`${this.getBuildingLabel(kind)} requires ${this.formatBuildingShortfall(affordability)}.`]);
      return;
    }
    this.selectedBuildingKind = kind;
    this.mode = "building";
    this.buildingsPanelExpanded = false;
    this.ensurePlacementPreview();
    this.updateUi([`Construction ready: ${this.getBuildingLabel(kind)}. Select terrain to deploy.`]);
  }

  private getBuildingLabel(kind: BuildingKind): string {
    return BUILDING_OPTIONS.find((option) => option.kind === kind)?.label ?? kind;
  }

  private getBuildingAffordability(kind: BuildingKind): {
    readonly canAfford: boolean;
    readonly missingWood: number;
    readonly missingIron: number;
  } {
    const resources = this.simulation.getState().empires["empire-player"].resources;
    const cost = getBuildingCost(kind);
    const missingWood = Math.max(0, cost.wood - resources.wood);
    const missingIron = Math.max(0, cost.iron - resources.iron);
    return { canAfford: missingWood === 0 && missingIron === 0, missingWood, missingIron };
  }

  private formatBuildingShortfall(affordability: {
    readonly missingWood: number;
    readonly missingIron: number;
  }): string {
    const needs = [
      affordability.missingWood > 0 ? `${affordability.missingWood} WOOD` : undefined,
      affordability.missingIron > 0 ? `${affordability.missingIron} IRON` : undefined
    ].filter((need): need is string => Boolean(need));
    return needs.length ? `NEED ${needs.join(" + ")}` : "RESOURCES READY";
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isPrimaryClick(pointer) && this.isBookControlPointer(pointer)) {
      this.toggleBookOfLessons();
      return;
    }

    if (this.isPrimaryClick(pointer) && this.bookPanelExpanded && this.isBookPanelPointer(pointer)) {
      const localX = (pointer.x - this.bookPanel.x) / this.bookPanel.scaleX;
      const localY = (pointer.y - this.bookPanel.y) / this.bookPanel.scaleY;
      this.handleBookPointerDown(localX, localY);
      return;
    }

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

  private handleCameraWheel(pointer: Phaser.Input.Pointer, deltaY: number): void {
    if (pointer.y < this.topHud.height || deltaY === 0) {
      return;
    }

    const camera = this.cameras.main;
    const currentZoom = camera.zoom;
    const targetZoom = Phaser.Math.Clamp(
      currentZoom + (deltaY < 0 ? CAMERA_ZOOM_STEP : -CAMERA_ZOOM_STEP),
      CAMERA_ZOOM_MIN,
      CAMERA_ZOOM_MAX
    );
    if (targetZoom === currentZoom) {
      return;
    }

    // Preserve the battlefield point beneath the cursor while changing strategic scale.
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    camera.setZoom(targetZoom);
    const adjustedPoint = camera.getWorldPoint(pointer.x, pointer.y);
    camera.scrollX += worldPoint.x - adjustedPoint.x;
    camera.scrollY += worldPoint.y - adjustedPoint.y;
  }

  private isBookControlPointer(pointer: Phaser.Input.Pointer): boolean {
    const narrow = this.scale.width < 640;
    const scale = narrow ? 0.7 : 1;
    const x = 190 * scale + (narrow ? -115 : 0);
    const y = 14 * scale + (narrow ? 48 : 0);
    return pointer.x >= x && pointer.x < x + 118 * scale && pointer.y >= y && pointer.y < y + 30 * scale;
  }

  private isBookPanelPointer(pointer: Phaser.Input.Pointer): boolean {
    return (
      pointer.x >= this.bookPanel.x &&
      pointer.x < this.bookPanel.x + 470 * this.bookPanel.scaleX &&
      pointer.y >= this.bookPanel.y &&
      pointer.y < this.bookPanel.y + BOOK_PANEL_HEIGHT * this.bookPanel.scaleY
    );
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
    if (this.suppressNextPointerUp) {
      this.suppressNextPointerUp = false;
      this.pointerDownWorld = undefined;
      return;
    }
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
    const placementFailure = this.getBuildingPlacementFailure(kind, position);
    if (placementFailure) {
      this.updateUi([placementFailure]);
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
    return !this.getBuildingPlacementFailure(kind, position);
  }

  private getBuildingPlacementFailure(kind: BuildingKind, position: Phaser.Math.Vector2): string | undefined {
    const size = BUILDING_SIZES[kind];
    if (position.x < size || position.y < size || position.x > 1400 - size || position.y > 900 - size) {
      return "Construction must remain within the battlefield boundary.";
    }

    const state = this.simulation.getState();
    const terrain = terrainAtPosition(state, position);
    if (!isBuildingTerrainCompatible(kind, terrain)) {
      return `${this.getBuildingLabel(kind)} cannot be deployed on ${terrain.replaceAll("-", " ")} terrain.`;
    }

    const affordability = this.getBuildingAffordability(kind);
    if (!affordability.canAfford) {
      return `${this.getBuildingLabel(kind)} requires ${this.formatBuildingShortfall(affordability)}.`;
    }

    if (!isBuildingPlacementClear(state, kind, position)) {
      return "Construction site overlaps an existing foundation or structure.";
    }

    const overlapsExistingBuilding = Object.values(state.buildings).some((building) => {
      const minimumDistance = (size + BUILDING_SIZES[building.kind]) * 0.55;
      return Phaser.Math.Distance.Between(position.x, position.y, building.position.x, building.position.y) < minimumDistance;
    });
    return overlapsExistingBuilding ? "Construction site is too close to an existing structure." : undefined;
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

  private castMendSettlement(): void {
    const settlement = this.getActiveControlledSettlement();
    if (!settlement) {
      this.updateUi(["Select a Crown castle before invoking Mend Settlement."]);
      return;
    }
    this.issueCommand({
      type: "cast-miracle",
      payload: { empireId: "empire-player", kind: "mend-settlement", settlementId: settlement.id }
    });
    this.updateUi(["Mend Settlement petitioned. 14 Faith will restore civic health and end plague."]);
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

  private exchangeCaptives(): void {
    const accord = this.getPrisonerAccord();
    if (!accord || accord.count === 0) {
      this.updateUi(["A prisoner accord requires captives and citizen housing on both sides."]);
      return;
    }
    this.issueCommand({
      type: "exchange-captives",
      payload: {
        settlementId: accord.settlement.id,
        rivalSettlementId: accord.rivalSettlement.id,
        count: accord.count
      }
    });
    this.updateUi([
      `Prisoner accord proposed: ${accord.count} returned between ${this.getSettlementDisplayName(accord.settlement.id)} and ${this.getSettlementDisplayName(accord.rivalSettlement.id)}.`
    ]);
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
      const feedback = getCombatFeedbackPresentation(event);
      if (!feedback) {
        continue;
      }
      this.audio.play(feedback.sound);
      if (this.reducedMotion) {
        continue;
      }
      const attackerId = String(event.payload.attackerId ?? event.payload.shipId ?? "");
      const targetId = String(event.payload.targetId ?? "");
      const attacker = this.getEntityPosition(attackerId);
      const target = this.getEntityPosition(targetId);
      if (!attacker || !target) {
        continue;
      }

      if (feedback.delivery === "projectile") {
        const trajectory = Phaser.Math.Angle.Between(attacker.x, attacker.y, target.x, target.y);
        const projectile =
          feedback.projectile === "arrow"
            ? this.add.rectangle(attacker.x, attacker.y, 18, 2, feedback.color, 0.98).setRotation(trajectory)
            : this.add.circle(attacker.x, attacker.y, 5, feedback.color, 0.95);
        projectile.setDepth(30);
        this.tweens.add({
          targets: projectile,
          x: target.x,
          y: target.y,
          alpha: 0,
          duration: feedback.projectileDuration,
          ease: "Quad.easeOut",
          onComplete: () => projectile.destroy()
        });
      } else {
        const trajectory = Phaser.Math.Angle.Between(attacker.x, attacker.y, target.x, target.y);
        const length = feedback.delivery === "thrust" ? 34 : 22;
        const strike = this.add.line(target.x, target.y, -length / 2, 0, length / 2, 0, feedback.color, 0.92);
        strike.setLineWidth(feedback.delivery === "thrust" ? 3 : 5).setRotation(trajectory).setDepth(30);
        this.tweens.add({
          targets: strike,
          alpha: 0,
          scaleX: 1.35,
          scaleY: 1.35,
          duration: 180,
          ease: "Sine.easeOut",
          onComplete: () => strike.destroy()
        });
      }
      const impact = this.add.circle(
        target.x,
        target.y,
        feedback.impactRadius,
        feedback.color,
        0.22
      );
      impact.setStrokeStyle(feedback.projectile === "cannonball" ? 3 : 2, feedback.impactColor, 0.9).setDepth(30);
      this.tweens.add({
        targets: impact,
        scaleX: feedback.impactScale,
        scaleY: feedback.impactScale,
        alpha: 0,
        duration: feedback.impactDuration,
        ease: "Quad.easeOut",
        onComplete: () => impact.destroy()
      });
      const damage = Number(event.payload.damage ?? 0);
      if (damage <= 0) {
        continue;
      }
      const marker = this.add.text(target.x, target.y - 18, `-${damage}`, {
        fontFamily: "Arial Black, Arial",
        fontSize: feedback.damageFontSize,
        color: `#${feedback.impactColor.toString(16).padStart(6, "0")}`,
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
    const authoritativePosition =
      state.battalions[entityId]?.position ?? state.buildings[entityId]?.position ?? state.caravans[entityId]?.position;
    if (authoritativePosition) {
      return authoritativePosition;
    }

    const renderedEntity =
      this.battalionSprites.get(entityId) ?? this.buildingSprites.get(entityId) ?? this.caravanSprites.get(entityId);
    return renderedEntity ? { x: renderedEntity.x, y: renderedEntity.y } : undefined;
  }

  private playMiracleFeedback(events: GameEvent[]): void {
    for (const event of events) {
      const feedback = getMiracleFeedbackPresentation(event);
      if (!feedback) {
        continue;
      }
      this.audio.play(feedback.sound);
      if (this.reducedMotion) {
        continue;
      }
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

      const halo = this.add.circle(position.x, position.y, feedback.radius, feedback.color, 0.1);
      halo.setStrokeStyle(feedback.delivery === "judgment" ? 4 : 3, feedback.color, 0.94).setDepth(32);
      this.tweens.add({
        targets: halo,
        scaleX: feedback.ringScale,
        scaleY: feedback.ringScale,
        alpha: 0,
        duration: feedback.duration,
        ease: "Sine.easeOut",
        onComplete: () => halo.destroy()
      });

      this.playMiracleDelivery(position, feedback);

      const title = this.add.text(position.x, position.y - feedback.radius - 24, feedback.label, {
        fontFamily: "Arial Black, Arial",
        fontSize: "10px",
        color: `#${feedback.accentColor.toString(16).padStart(6, "0")}`,
        stroke: "#10150f",
        strokeThickness: 3
      });
      title.setOrigin(0.5).setDepth(33);
      this.tweens.add({
        targets: title,
        y: title.y - 20,
        alpha: 0,
        delay: Math.round(feedback.duration * 0.52),
        duration: 450,
        ease: "Sine.easeIn",
        onComplete: () => title.destroy()
      });
    }
  }

  private playMiracleDelivery(
    position: { x: number; y: number },
    feedback: ReturnType<typeof getMiracleFeedbackPresentation>
  ): void {
    if (!feedback) {
      return;
    }
    const particleRadius = feedback.radius + 10;
    for (let index = 0; index < feedback.particleCount; index += 1) {
      const angle = (index / feedback.particleCount) * Math.PI * 2;
      const startRadius = feedback.delivery === "harvest" ? feedback.radius * 0.35 : particleRadius;
      const particle = this.add.circle(
        position.x + Math.cos(angle) * startRadius,
        position.y + Math.sin(angle) * startRadius,
        feedback.delivery === "harvest" ? 3 : 2,
        feedback.accentColor,
        0.92
      );
      particle.setDepth(33);
      const endRadius = feedback.delivery === "harvest" ? particleRadius : feedback.radius * 0.25;
      this.tweens.add({
        targets: particle,
        x: position.x + Math.cos(angle) * endRadius,
        y: position.y + Math.sin(angle) * endRadius,
        alpha: 0,
        scaleX: feedback.delivery === "harvest" ? 0.5 : 1.9,
        scaleY: feedback.delivery === "harvest" ? 0.5 : 1.9,
        duration: feedback.duration,
        ease: feedback.delivery === "harvest" ? "Sine.easeOut" : "Quad.easeIn",
        onComplete: () => particle.destroy()
      });
    }

    if (feedback.delivery === "inspiration") {
      for (let index = 0; index < 4; index += 1) {
        const angle = (index / 4) * Math.PI * 2;
        const ray = this.add.line(
          position.x,
          position.y,
          Math.cos(angle) * 8,
          Math.sin(angle) * 8,
          Math.cos(angle) * (feedback.radius + 18),
          Math.sin(angle) * (feedback.radius + 18),
          feedback.accentColor,
          0.9
        );
        ray.setLineWidth(2).setDepth(33);
        this.tweens.add({
          targets: ray,
          alpha: 0,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: feedback.duration,
          ease: "Sine.easeOut",
          onComplete: () => ray.destroy()
        });
      }
      return;
    }

    if (feedback.delivery === "restoration") {
      const cross = this.add.container(position.x, position.y);
      const horizontal = this.add.rectangle(0, 0, feedback.radius, 4, feedback.accentColor, 0.9);
      const vertical = this.add.rectangle(0, 0, 4, feedback.radius, feedback.accentColor, 0.9);
      cross.add([horizontal, vertical]).setDepth(33);
      this.tweens.add({
        targets: cross,
        alpha: 0,
        scaleX: 1.7,
        scaleY: 1.7,
        duration: feedback.duration,
        ease: "Sine.easeOut",
        onComplete: () => cross.destroy()
      });
      return;
    }

    if (feedback.delivery === "judgment") {
      const bolt = this.add.graphics().setDepth(34);
      bolt.lineStyle(3, feedback.accentColor, 0.95);
      bolt.beginPath();
      bolt.moveTo(position.x - 10, position.y - 116);
      bolt.lineTo(position.x + 7, position.y - 82);
      bolt.lineTo(position.x - 6, position.y - 48);
      bolt.lineTo(position.x + 4, position.y - 14);
      bolt.lineTo(position.x, position.y);
      bolt.strokePath();
      this.tweens.add({
        targets: bolt,
        alpha: 0,
        delay: 110,
        duration: Math.round(feedback.duration * 0.62),
        ease: "Quad.easeOut",
        onComplete: () => bolt.destroy()
      });
    }
  }

  private renderWorld(): void {
    const state = this.simulation.getState();
    this.pruneControlGroups(state);
    this.renderOrderIndicators(state);

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

  private renderOrderIndicators(state: WorldState): void {
    if (!this.orderLayer) {
      this.orderLayer = this.add.graphics();
      this.worldLayer.add(this.orderLayer);
    }
    this.orderLayer.clear();

    for (const indicator of getOrderIndicators(state, this.selectedBattalionIds, this.selectedCaravanId)) {
      const color =
        indicator.kind === "attack"
          ? 0xe75f4f
          : indicator.kind === "advance"
            ? 0xf2d77f
            : indicator.kind === "naval"
              ? 0x9cc8d5
              : 0x84cbe1;
      const angle = Phaser.Math.Angle.Between(
        indicator.origin.x,
        indicator.origin.y,
        indicator.destination.x,
        indicator.destination.y
      );
      const length = Phaser.Math.Distance.BetweenPoints(indicator.origin, indicator.destination);
      if (length < 18) {
        continue;
      }

      this.orderLayer.lineStyle(2, color, 0.86);
      this.orderLayer.lineBetween(indicator.origin.x, indicator.origin.y, indicator.destination.x, indicator.destination.y);
      const wingLength = 13;
      const wingSpread = Math.PI / 7;
      this.orderLayer.fillStyle(color, 0.94);
      this.orderLayer.fillTriangle(
        indicator.destination.x,
        indicator.destination.y,
        indicator.destination.x - Math.cos(angle - wingSpread) * wingLength,
        indicator.destination.y - Math.sin(angle - wingSpread) * wingLength,
        indicator.destination.x - Math.cos(angle + wingSpread) * wingLength,
        indicator.destination.y - Math.sin(angle + wingSpread) * wingLength
      );
      if (indicator.kind === "attack") {
        this.orderLayer.lineStyle(2, color, 0.9);
        this.orderLayer.strokeCircle(indicator.destination.x, indicator.destination.y, 22);
      }
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
      const readinessTrack = this.add.rectangle(-38, -43, 76, 5, 0x10150f, 0.9).setOrigin(0, 0.5);
      readinessTrack.setStrokeStyle(1, 0xe6ead7, 0.48);
      const readinessFill = this.add.rectangle(-37, -43, 74, 3, 0x87c777, 0.96).setOrigin(0, 0.5);
      container = this.add.container(battalion.position.x, battalion.position.y, [marker, art, label, readinessTrack, readinessFill]);
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
    const readiness = getBattalionReadinessPresentation(battalion);
    const readinessFill = container.getAt(4) as Phaser.GameObjects.Rectangle;
    const readinessWidth = Math.max(0, Math.round(74 * (readiness.defense / 100)));
    readinessFill.setDisplaySize(readinessWidth, 3);
    readinessFill.setFillStyle(
      readiness.defense <= 30 ? 0xe75f4f : readiness.defense <= 60 ? 0xf0c86a : 0x87c777,
      readinessWidth > 0 ? 0.96 : 0
    );
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
    const activeControlGroup = this.getActiveControlGroup();
    this.resourceText.setText(
      this.scale.width < 640
        ? `SEAT ${this.getSettlementDisplayName(settlement.id)}  //  TICK ${state.tick}\nFOOD ${settlement.localFood}  WOOD ${empire.resources.wood}  IRON ${empire.resources.iron}  LUX ${empire.resources.luxury}  FAITH ${empire.resources.faith}`
        : `SEAT ${this.getSettlementDisplayName(settlement.id)}    FOOD ${settlement.localFood}    WOOD ${empire.resources.wood}    IRON ${empire.resources.iron}    LUX ${empire.resources.luxury}    FAITH ${empire.resources.faith}    TICK ${state.tick}`
    );
    this.statusText.setText(
      getTacticalUplinkStatusLines({
        order: this.getModeLabel(),
        settlement,
        citizenCapacity: this.getCitizenCapacity(settlement.id),
        captiveCapacity: this.getCaptiveCapacity(settlement.id),
        selectedBattalion,
        selectedCaravan: Boolean(this.selectedCaravanId),
        selectedBattalionCount: this.selectedBattalionIds.size,
        activeControlGroup
      }).join("\n")
    );
    const victory = state.victory.winnerEmpireId;
    this.eventText.setText(
      victory
        ? `VICTORY // ${state.empires[victory]?.name.toUpperCase() ?? "THE WINNER"} HOLDS EVERY THRONE.`
        : this.getTacticalUplinkMandate(settlement, events)
    );
    this.updateAccordPanel();
    this.updateHeirPanel();
    this.updateLessonBanner();
    this.updateMandateGuidance();
    this.updateRealmPanel();
    this.updateBuildingsPanel();
    this.updateBookOfLessons();
    this.updateVictoryPanel();
    this.updateMinimap();
    this.applyCampaignPresentationMode();
    const latestPlayerMessage = events.at(-1);
    if (latestPlayerMessage?.includes(" ")) {
      this.announceAccessibility(latestPlayerMessage);
    }
  }

  private describeEvent(event: GameEvent): string {
    const state = this.simulation.getState();
    return describeGameEvent(event, {
      settlementName: (id) => this.getSettlementDisplayName(id),
      heirName: (id) => state.heirs[id ?? ""]?.name ?? "AN HEIR",
      entityName: (id) => this.getEntityDisplayName(id)
    });
  }

  private getTacticalReports(events: readonly GameEvent[]): string[] {
    return selectTacticalReportEvents(events).map((event) => this.describeEvent(event));
  }

  private getEntityDisplayName(id: string | undefined): string {
    if (!id) {
      return "THE UNKNOWN";
    }
    const state = this.simulation.getState();
    const battalion = state.battalions[id];
    if (battalion) {
      const owner = battalion.ownerEmpireId === "empire-player" ? "CROWN" : "RIVAL";
      return `${owner} ${battalion.specialization.replaceAll("-", " ").toUpperCase()}`;
    }
    const building = state.buildings[id];
    if (building) {
      const owner = building.ownerEmpireId === "empire-player" ? "CROWN" : "RIVAL";
      return `${owner} ${this.getBuildingLabel(building.kind).toUpperCase()}`;
    }
    const caravan = state.caravans[id];
    if (caravan) {
      const owner = caravan.ownerEmpireId === "empire-player" ? "CROWN" : "RIVAL";
      return `${owner} ${caravan.kind === "ship" ? "WARSHIP" : "CARAVAN"}`;
    }
    return id.replaceAll("-", " ").toUpperCase();
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
    const activeStep = getImperialMandateProgress(this.simulation.getState()).activeStep;
    return `${activeStep.label} ${activeStep.instruction}`;
  }

  private updateMandateGuidance(): void {
    const guidance = getMandateGuidance(getImperialMandateProgress(this.simulation.getState()).activeStep.id);
    this.commandMandateText.setText(guidance.label);
    for (const [control, tile] of this.commandTiles) {
      const highlighted = guidance.commandTargets.includes(control);
      tile.button.setFillStyle(highlighted ? UI_COLORS.commandActive : tile.fill, 1);
      tile.button.setStrokeStyle(highlighted ? 2 : 1, highlighted ? UI_COLORS.accent : UI_COLORS.trim);
      tile.primary.setColor(highlighted ? "#fff4c5" : UI_COLORS.text);
      tile.secondary.setColor(highlighted ? "#f2d77f" : "#b6c5bb");
    }
  }

  private getTacticalUplinkMandate(settlement: SettlementState, events: readonly string[]): string {
    const mandate = getImperialMandateProgress(this.simulation.getState());
    return [
      `MANDATE ${Math.min(mandate.completedSteps + 1, mandate.steps.length)}/${mandate.steps.length}: ${mandate.activeStep.label}`,
      `DIRECTIVE: ${mandate.activeStep.instruction}`,
      `THREAT: ${this.getThreatForecast(settlement)}`,
      `LATEST INTEL: ${events.at(-1) ?? "NO NEW REPORTS."}`
    ].join("\n");
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

    const rivalOpeningTicks = RIVAL_DIFFICULTY_PROFILES[state.rivalDifficulty].openingGraceTicks - state.tick;
    if (rivalOpeningTicks > 0) {
      return `RIVAL DOCTRINE PREPARES FOR WAR IN ${rivalOpeningTicks} TICKS.`;
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
