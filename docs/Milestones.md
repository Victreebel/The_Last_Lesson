# Milestones

## Milestone 0: Simulation Kernel

Goal: prove deterministic simulation.

Completion criteria:

- Fixed tick simulation exists.
- Seeded random source exists.
- Commands are queued and logged.
- Events are emitted and logged.
- State hashing is stable.
- The same initial state, seed, and command log produce the same final state and event log.

## Milestone 1: Gray-Box RTS Loop

Goal: prove basic play.

Includes camera, selection, building placement, resource production, battalion creation, movement, and basic combat.

Status: complete in gray-box form.

Implemented:

- Phaser world view with grid terrain and simple settlement structures.
- Camera panning with arrow keys.
- UI controls for farm placement, battalion creation, movement, attacking, and manual ticks.
- Simulation-backed food, wood, and faith readouts.
- Labor assignment bootstrap for farmers, builders, and lumberjacks.
- Deterministic farm placement.
- Deterministic battalion creation.
- Deterministic battalion movement.
- Deterministic attack orders and damage resolution.
- Event feedback panel.
- Milestone 1 simulation test covering create, move, and attack behavior.

Acceptance:

- `pnpm test` passes.
- `pnpm build` passes.
- Browser smoke test confirms the map, controls, and battalion creation render without console errors.

Known limitations:

- Art is intentionally gray-box.
- Combat has no projectile or attack cadence presentation yet.
- Enemy settlements are not implemented until the conquest slice.
- Selection feedback is basic.
