# Changelog

## 1.9.0 - 2026-08-01

- Added the first painterly battlefield art layer beneath the explicit, simulation-labelled terrain overlays.
- Preserved grid, terrain symbols, building labels, and tactical UI contrast so the visual update strengthens rather than obscures RTS readability.

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
