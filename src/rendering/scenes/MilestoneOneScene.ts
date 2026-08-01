import Phaser from "phaser";
import { Simulation } from "../../simulation/Simulation";
import type { GameCommand } from "../../simulation/commands/GameCommand";
import { createInitialWorld, type BattalionState, type BuildingState } from "../../simulation/state/WorldState";

type ToolMode = "select" | "farm" | "move" | "attack";

export class MilestoneOneScene extends Phaser.Scene {
  private simulation = new Simulation(createInitialWorld(777));
  private commandSequence = 0;
  private selectedBattalionId: string | null = null;
  private mode: ToolMode = "select";
  private statusText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private resourceText!: Phaser.GameObjects.Text;
  private buildingsPanel!: Phaser.GameObjects.Container;
  private buildingsPanelBg!: Phaser.GameObjects.Rectangle;
  private buildingsPanelTitle!: Phaser.GameObjects.Text;
  private buildingsPanelBody!: Phaser.GameObjects.Text;
  private buildingsPanelExpanded = false;
  private worldLayer!: Phaser.GameObjects.Container;
  private readonly buildingSprites = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly battalionSprites = new Map<string, Phaser.GameObjects.Container>();
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("MilestoneOneScene");
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, 1400, 900);
    this.worldLayer = this.add.container(0, 0);
    this.cursors = this.input.keyboard?.createCursorKeys();

    this.drawTerrain();
    this.createUi();
    this.scale.on("resize", () => this.layoutBuildingsPanel());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handleWorldClick(pointer));

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const result = this.simulation.tick();
        this.renderWorld();
        this.updateUi(result.events.map((event) => event.type).slice(-5));
      }
    });

    this.issueCommand({
      type: "assign-labor",
      payload: {
        settlementId: "settlement-capital",
        farmers: 8,
        builders: 4,
        lumberjacks: 6
      }
    });
    this.renderWorld();
    this.updateUi(["Milestone 1 online"]);
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
    const graphics = this.add.graphics();
    graphics.fillStyle(0x26301f, 1);
    graphics.fillRect(0, 0, 1400, 900);

    for (let x = 0; x <= 1400; x += 80) {
      graphics.lineStyle(1, 0x394431, 0.55);
      graphics.lineBetween(x, 0, x, 900);
    }

    for (let y = 0; y <= 900; y += 80) {
      graphics.lineStyle(1, 0x394431, 0.55);
      graphics.lineBetween(0, y, 1400, y);
    }

    graphics.fillStyle(0x3a492d, 1);
    graphics.fillEllipse(780, 260, 260, 150);
    graphics.fillStyle(0x425437, 1);
    graphics.fillEllipse(290, 640, 360, 190);
    this.worldLayer.add(graphics);
  }

  private createUi(): void {
    const panel = this.add.rectangle(0, 0, 360, 190, 0x11150f, 0.92).setOrigin(0);
    panel.setScrollFactor(0);
    this.resourceText = this.add.text(18, 16, "", {
      fontFamily: "Inter, Arial",
      fontSize: "14px",
      color: "#efe8d1"
    });
    this.resourceText.setScrollFactor(0);

    this.statusText = this.add.text(18, 82, "", {
      fontFamily: "Inter, Arial",
      fontSize: "13px",
      color: "#d8b15f"
    });
    this.statusText.setScrollFactor(0);

    this.eventText = this.add.text(18, 112, "", {
      fontFamily: "Inter, Arial",
      fontSize: "12px",
      color: "#bfc8a8"
    });
    this.eventText.setScrollFactor(0);

    this.addButton(18, 206, "Place Farm", () => {
      this.mode = "farm";
      this.updateUi(["Click the map to place a farm"]);
    });
    this.addButton(138, 206, "Raise Battalion", () => this.createBattalion());
    this.addButton(18, 250, "Move", () => {
      this.mode = "move";
      this.updateUi(["Select a battalion, then click destination"]);
    });
    this.addButton(138, 250, "Attack", () => {
      this.mode = "attack";
      this.updateUi(["Select a battalion, then click a target"]);
    });
    this.addButton(258, 250, "Tick", () => {
      const result = this.simulation.tick();
      this.renderWorld();
      this.updateUi(result.events.map((event) => event.type).slice(-5));
    });
    this.createBuildingsPanel();
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 108, 34, 0x2f3a28, 1).setOrigin(0);
    button.setStrokeStyle(1, 0x6f7c55);
    button.setScrollFactor(0);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", onClick);
    const text = this.add.text(x + 10, y + 9, label, {
      fontFamily: "Inter, Arial",
      fontSize: "12px",
      color: "#efe8d1"
    });
    text.setScrollFactor(0);
  }

  private createBuildingsPanel(): void {
    this.buildingsPanelBg = this.add.rectangle(0, 0, 194, 48, 0x11150f, 0.94).setOrigin(0);
    this.buildingsPanelBg.setStrokeStyle(1, 0x6f7c55);
    this.buildingsPanelTitle = this.add.text(14, 10, "", {
      fontFamily: "Inter, Arial",
      fontSize: "13px",
      color: "#efe8d1"
    });
    this.buildingsPanelBody = this.add.text(14, 34, "", {
      fontFamily: "Inter, Arial",
      fontSize: "12px",
      color: "#bfc8a8",
      lineSpacing: 6
    });
    this.buildingsPanel = this.add.container(0, 0, [
      this.buildingsPanelBg,
      this.buildingsPanelTitle,
      this.buildingsPanelBody
    ]);
    this.buildingsPanel.setScrollFactor(0);
    this.buildingsPanel.setDepth(20);
    this.buildingsPanel.setSize(194, 48);
    this.buildingsPanel.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 194, 48),
      Phaser.Geom.Rectangle.Contains
    );
    this.buildingsPanel.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.buildingsPanelExpanded = !this.buildingsPanelExpanded;
      this.updateBuildingsPanel();
    });
    this.layoutBuildingsPanel();
    this.updateBuildingsPanel();
  }

  private layoutBuildingsPanel(): void {
    if (!this.buildingsPanel) {
      return;
    }

    const width = this.scale.width;
    const panelWidth = this.buildingsPanelExpanded ? 248 : 194;
    this.buildingsPanel.setPosition(Math.max(380, width - panelWidth - 18), 18);
  }

  private updateBuildingsPanel(): void {
    const counts = this.getBuildingCounts();
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const width = this.buildingsPanelExpanded ? 248 : 194;
    const height = this.buildingsPanelExpanded ? 190 : 48;

    this.buildingsPanelBg.setSize(width, height);
    this.buildingsPanel.setSize(width, height);
    this.buildingsPanel.input?.hitArea.setTo(0, 0, width, height);
    this.buildingsPanelTitle.setText(
      this.buildingsPanelExpanded ? `Buildings (${total})  ▲` : `Buildings: ${total}  ▼`
    );
    this.buildingsPanelBody.setVisible(this.buildingsPanelExpanded);

    if (this.buildingsPanelExpanded) {
      this.buildingsPanelBody.setText(
        [
          `Castle ${counts.castle ?? 0}`,
          `Town Square ${counts["town-square"] ?? 0}`,
          `Military Quarters ${counts["military-quarters"] ?? 0}`,
          `Farms ${counts.farm ?? 0}`,
          `Villas ${counts.villa ?? 0}`,
          `Hovels ${counts.hovel ?? 0}`,
          `Roads ${counts.road ?? 0}`
        ].join("\n")
      );
    }

    this.layoutBuildingsPanel();
  }

  private getBuildingCounts(): Record<string, number> {
    return Object.values(this.simulation.getState().buildings).reduce<Record<string, number>>(
      (counts, building) => {
        counts[building.kind] = (counts[building.kind] ?? 0) + 1;
        return counts;
      },
      {}
    );
  }

  private handleWorldClick(pointer: Phaser.Input.Pointer): void {
    if (pointer.y < 72) {
      return;
    }

    const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    if (this.mode === "farm") {
      this.issueCommand({
        type: "place-building",
        payload: {
          settlementId: "settlement-capital",
          kind: "farm",
          position: { x: Math.round(worldPoint.x), y: Math.round(worldPoint.y) }
        }
      });
      this.mode = "select";
      return;
    }

    if (this.mode === "move" && this.selectedBattalionId) {
      this.issueCommand({
        type: "move-battalion",
        payload: {
          battalionId: this.selectedBattalionId,
          destination: { x: Math.round(worldPoint.x), y: Math.round(worldPoint.y) }
        }
      });
      return;
    }
  }

  private createBattalion(): void {
    this.issueCommand({
      type: "create-battalion",
      payload: {
        settlementId: "settlement-capital",
        size: 10
      }
    });
  }

  private issueCommand(command: Omit<GameCommand, "id" | "issuedBy" | "tick">): void {
    this.simulation.enqueueCommand({
      id: `ui-command-${this.commandSequence++}`,
      issuedBy: "player-1",
      tick: this.simulation.getState().tick + 1,
      ...command
    } as GameCommand);
  }

  private renderWorld(): void {
    const state = this.simulation.getState();

    for (const building of Object.values(state.buildings)) {
      this.renderBuilding(building);
    }

    for (const battalion of Object.values(state.battalions)) {
      this.renderBattalion(battalion);
    }

    for (const [id, sprite] of this.battalionSprites) {
      if (!state.battalions[id]) {
        sprite.destroy();
        this.battalionSprites.delete(id);
      }
    }
  }

  private renderBuilding(building: BuildingState): void {
    const color = building.kind === "farm" ? 0x8f9f4d : building.kind === "castle" ? 0x8f8366 : 0x66705a;
    let sprite = this.buildingSprites.get(building.id);

    if (!sprite) {
      const size = building.kind === "castle" ? 72 : building.kind === "farm" ? 48 : 56;
      sprite = this.add.rectangle(building.position.x, building.position.y, size, size, color, 1);
      sprite.setStrokeStyle(2, 0x191c16);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        if (this.mode === "attack" && this.selectedBattalionId) {
          this.issueCommand({
            type: "attack-target",
            payload: {
              battalionId: this.selectedBattalionId,
              targetId: building.id
            }
          });
        }
      });
      this.worldLayer.add(sprite);
      this.buildingSprites.set(building.id, sprite);
    }

    sprite.setPosition(building.position.x, building.position.y);
    sprite.setFillStyle(building.complete ? color : 0x6a6041, 1);
  }

  private renderBattalion(battalion: BattalionState): void {
    let container = this.battalionSprites.get(battalion.id);

    if (!container) {
      const base = this.add.rectangle(0, 0, 42, 28, 0x9d4640, 1);
      base.setStrokeStyle(2, 0x201614);
      const label = this.add.text(-15, -7, `${battalion.size}`, {
        fontFamily: "Inter, Arial",
        fontSize: "12px",
        color: "#ffffff"
      });
      container = this.add.container(battalion.position.x, battalion.position.y, [base, label]);
      container.setSize(42, 28);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.selectedBattalionId = battalion.id;
        this.updateUi([`Selected ${battalion.id}`]);
      });
      this.worldLayer.add(container);
      this.battalionSprites.set(battalion.id, container);
    }

    container.setPosition(battalion.position.x, battalion.position.y);
    const base = container.getAt(0) as Phaser.GameObjects.Rectangle;
    base.setStrokeStyle(this.selectedBattalionId === battalion.id ? 4 : 2, 0xf0d36f);
  }

  private updateUi(events: string[]): void {
    const state = this.simulation.getState();
    const empire = state.empires["empire-player"];
    const settlement = state.settlements["settlement-capital"];
    this.resourceText.setText(
      [
        `Tick ${state.tick}`,
        `Food ${settlement.localFood}  Wood ${empire.resources.wood}  Faith ${empire.resources.faith}`,
        `Citizens ${settlement.population.citizens}  Military ${settlement.population.militarizedCitizens}`,
        `Labor F${settlement.population.farmers} B${settlement.population.builders} L${settlement.population.lumberjacks}`
      ].join("\n")
    );
    this.statusText.setText(`Mode: ${this.mode}  Selected: ${this.selectedBattalionId ?? "none"}`);
    this.eventText.setText(events.join("\n"));
    this.updateBuildingsPanel();
  }
}
