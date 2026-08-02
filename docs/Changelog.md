# Changelog

## 1.29.0 - 2026-08-01

- Reworked the narrow tactical layout for phone-sized viewports: the header reflows, resources wrap, governor/build controls share the available width, campaign panels scale to fit, and the command dock remains reachable.
- Minimap and Tactical Uplink chrome now yield on narrow screens rather than colliding with the command surface. Both remain available at larger widths.

## 1.28.0 - 2026-08-01

- Added local recovery saves every five world ticks. They are renderer-owned persistence only and cannot interrupt or mutate simulation execution.
- The opening Rival Doctrine screen now offers `CONTINUE LOCAL REIGN` when a recoverable local save exists.

## 1.27.0 - 2026-08-01

- Added a campaign-opening Rival Doctrine choice: `DISCIPLE`, `RIVAL`, and `ARCHITECT` provide transparent rival-governance difficulty profiles.
- Profiles are deterministic world state. They alter only the rival's protected opening window and governor doctrine-confidence gain; resources, troops, combat values, visibility, and map state remain fair.

## 1.26.0 - 2026-08-01

- Added a compact `SPEED` control to the tactical header. It cycles the playable browser simulation between 1x, 2x, and 3x while preserving the fixed deterministic tick logic, save data, event order, and replay contract.

## 1.25.0 - 2026-08-01

- Added a live threat forecast to the Tactical Uplink. It prioritizes low food, captive unrest, religious pressure, and observed hostile proximity for the active command seat.

## 1.24.0 - 2026-08-01

- Added `RELEASE` captive orders. A royal decree releases up to four captives from the active settlement, trading labor for happiness, loyalty, devotion, internal Faith, and reduced rebellion exposure.
- Releasing captives is an observable social doctrine, distinct from Town Square-based assimilation.

## 1.23.0 - 2026-08-01

- Added an authoritative event-driven Lesson banner. When an heir observes, reinforces, or questions a doctrine, the battlefield now identifies the heir, action, and current confidence without altering simulation state.

## 1.22.0 - 2026-08-01

- Added the compact `REALM` top-bar control and Crown Domains roster. It presents every owned settlement with its governor and population, centers the tactical camera on selection, and changes the active command seat.

## 1.21.0 - 2026-08-01

- Selecting a Crown castle now establishes the active command seat. The tactical readout, building inventory, placement commands, labor, recruitment, transport, assimilation, and Bless Harvest all operate on that settlement.
- Specialist training now requires Military Quarters in the active settlement, preserving independent settlement development after conquest.

## 1.20.0 - 2026-08-01

- Crown castles are now inspectable governor seats: selecting one focuses the Heir panel, Book of Lessons, and reward/punishment controls on that settlement's live heir.
- The heir console identifies the selected settlement and governor, so conquered frontier settlements are actionable rather than opaque campaign objects.

## 1.19.0 - 2026-08-01

- Expanded the opening campaign to three settlements: the Rival Crown now begins with `Grovewatch`, a second independently governed throne in the luxury grove.
- Victory now correctly requires every rival throne to fall; capturing one settlement creates a Crown governor and leaves the remaining rival settlement in play.

## 1.18.0 - 2026-08-01

- Added an optional presentation-only Web Audio layer for command confirmation and throttled land/naval combat impacts; no simulation state, save data, replay data, or deterministic outcome depends on audio.

## 1.17.0 - 2026-08-01

- Added an Imperial Mandate to the tactical uplink. It advances from farm establishment through military readiness, scouting, and castle capture using live simulation state.

## 1.16.0 - 2026-08-01

- Added deterministic per-empire visibility from completed structures, battalions, and caravans; unseen rival entities are now hidden from the world view and minimap.
- Made rival governance respect the same observed-information rule. The rival now scouts contested ground before committing an expedition against a discovered throne.

## 1.15.0 - 2026-08-01

- Added a rival-governance opening: after a fair early-game grace window, the rival heir raises a second field battalion and launches an explainable expedition toward the opposing throne.
- Added deterministic regression coverage for rival recruitment, expedition orders, doctrine recording, and opening isolation from other simulation tests.

## 1.13.0 - 2026-08-01

- Added event-driven battlefield combat feedback: projectile traces and floating damage markers for battalion and Warship attacks.
- Integrated feedback into both continuous simulation ticks and manual Advance ticks, preserving deterministic state ownership in the simulation layer.

## 1.12.0 - 2026-08-01

- Added an interactive RTS minimap with terrain, buildings, friendly and rival force markers, and an active camera frame.
- Clicking the minimap now recenters the tactical camera; the interaction was verified in the live browser build.

## 1.11.0 - 2026-08-01

- Added a top-bar Pause/Resume control with Space-key support, keeping the continuous simulation available for tactical planning.
- Repositioned the command dock so its complete command set remains reachable on common laptop-height viewports.
- Replaced the prototype opening status with a game-world state message and manually verified the pause state in the live browser build.

## 1.10.0 - 2026-08-01

- Added direct Warship attack orders against hostile vessels, deterministic naval fire, cooldowns, sinking events, and route-aware UI targeting.
- Added naval-combat regression coverage, including the restriction that embarked battalions cannot attack from Warships.

## 1.9.0 - 2026-08-01

- Added the first painterly battlefield art layer beneath the explicit, simulation-labelled terrain overlays.
- Preserved grid, terrain symbols, building labels, and tactical UI contrast so the visual update strengthens rather than obscures RTS readability.

## 1.14.0 - 2026-08-01

- Added a match-resolution overlay for victory and defeat, including a deterministic in-place campaign restart so every playable session has a clear ending and immediate replay path.

## 1.8.0 - 2026-08-01

- Added Town Square-built Warships with water-only launch and movement, transport capacity, and distinctive world labels.
- Prevented battalions embarked aboard Warships from attacking independently.
- Added deterministic naval transport coverage.

## 1.7.0 - 2026-08-01

- Expanded governor AI with explainable concerns for scarcity, rebellion, military danger, and insufficient faith.
- Governors can now assimilate captives, garrison defensive works, and spend faith to inspire a weakened field force when those actions carry the highest utility.
- Added deterministic coverage for autonomous captive integration and heir concerns.

## 1.6.0 - 2026-08-01

- Added garrison commands for Castles, Walls, Gates, and Outposts.
- Garrisoned battalions now hold position while retaining their outward attack capability; movement orders release them.
- Breaching a defensive work destroys its garrison, with deterministic regression coverage for garrison, release, and breach behavior.

## 1.5.0 - 2026-08-01

- Added a local population lifecycle: food consumption, Villa-based citizen capacity, surplus-driven growth, and starvation losses.
- Slowed the browser prototype to the canonical five-second simulation cadence and doubled initial food reserves for a viable opening.
- Bumped the deterministic save schema to `1.1.0` and added regression coverage for growth and starvation.

## 1.1.0 - 2026-08-01

- Added rival settlement, castle capture, heir death, successor governance, and victory state.
- Added terrain labels, terrain-specific structures, resource capacities, construction costs, roads, and supply.
- Added player learning, governor decision explanations, faith generation, religious pressure, rebellion pressure, and two miracles.
- Added versioned deterministic saves that preserve event continuity.
- Expanded the tactical command console with labor and miracle controls.
- Added deterministic regression coverage for capture, governance, resources, faith, roads, and save/resume.

## 1.2.0 - 2026-08-01

- Added specialized militia, spear, archer, and raider battalions with Military Quarters gating, resource costs, range, cadence, and counterplay.
- Added captive capture from routed battalions, hovel capacity, liberation after housing destruction, rebellion escape, and Town Square assimilation.
- Expanded the command dock with visible specialization, captive, and social-state controls.

## 1.3.0 - 2026-08-01

- Added physical land caravans with food cargo, road acceleration, battalion supply delivery, visible selection/routing, and hostile raiding.
- Added deterministic transport and logistics disruption coverage.

## 1.4.0 - 2026-08-01

- Added capacity-limited battalion embarkation, synchronized transport movement, player disembarkation, and emergency ejection after caravan destruction.
- Added Book of Lessons UI with heir doctrine history, recent event history, and local save/load controls.
