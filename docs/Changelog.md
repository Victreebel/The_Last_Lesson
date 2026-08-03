# Changelog

## 2.6.40 - 2026-08-03

- The expanded Build palette now exposes visible, contextual keyboard choices for all thirteen structures: `1` through `9`, `0`, then `Q`/`W`/`E`. The keys apply only while Build is open, preserve field control groups, and lead into the existing terrain placement and drag rules.

## 2.6.39 - 2026-08-03

- Clearing local data now also suppresses automatic save, Chronicle, and Honor persistence for the current reign. Local continuity resumes only after the player deliberately saves, restores, or starts a new reign, so the reset cannot silently recreate browser records moments later.

## 2.6.38 - 2026-08-03

- Added a deliberate two-step `CLEAR LOCAL DATA` action to the Book of Lessons. It removes only this game’s browser-local records, preserves the current in-memory reign and downloaded archives, and is available by the visible contextual `0` shortcut. Browser coverage protects the confirmation boundary.

## 2.6.37 - 2026-08-03

- Added a player-facing Privacy and Local Data Summary for the static campaign, local saves and playtest exports, and optional self-hosted multiplayer. It documents the current no-account, no-telemetry boundary and the exact browser-local records used for continuity and accessibility preferences.

## 2.6.36 - 2026-08-03

- The Book of Lessons is now fully keyboard-operable after opening it with `L`: its visibly numbered `1` through `9` actions cover local save/load, portable archives, replay verification/review, local playtest export, and presentation preferences. Battlefield control-group assignment remains unchanged outside the Book.

## 2.6.35 - 2026-08-03

- The Book of Lessons now exports a compact local `.playtest.json` evidence record for facilitated sessions. It contains only the active theatre, Rival Doctrine, tick, victory, civic record, and event-type counts; no player, browser, profile, save, or network data leaves the game. Browser coverage verifies the actual download and schema alongside the deterministic unit contract.

## 2.6.34 - 2026-08-03

- Fixed the compact-width tactical HUD: Accord, Heir, and Build panels now share a protected top-right strip and scale together instead of overlapping. Expanding one management panel now closes the other two, preserving clear control ownership on tablets and narrow laptops.

## 2.6.33 - 2026-08-03

- Ashen Oath now calls out the compact `ACCORD [D]` header as the active captive-policy surface, while the Command Dock continues to highlight both assimilation and release. The three civic responses are discoverable together without changing simulation rules, heir learning, or balance.

## 2.6.32 - 2026-08-03

- Civic Records now expose `EXCHANGED` alongside captives taken, integrated, and released. Prisoner Accord returns remain part of the existing release-based rebellion calculation but are no longer hidden inside the general release count.

## 2.6.31 - 2026-08-03

- Ashen Oath now opens with reciprocal, securely housed prisoners and completed civil housing on both thrones. The player can inspect the Prisoner Accord immediately, return four people without erasing the opening's larger captive-unrest problem, and still choose assimilation or release for the remaining population.

## 2.6.30 - 2026-08-03

- Added the Crown-only Prisoner Accord. When both realms hold captives and can house returning citizens, the Accord panel deterministically exchanges up to four people, records the release in each Civic Record, and produces a replay-safe tactical event. Heirs neither negotiate nor learn from the agreement.

## 2.6.29 - 2026-08-03

- Added a shared battalion-readiness presentation contract. Every battlefield battalion now carries a persistent defense bar, while the selected-force Tactical Uplink reports matching `H` (defense), `M` (morale), and `S` (supply) percentages. The change is renderer-only and reads immutable authoritative state.

## 2.6.28 - 2026-08-03

- Added a facilitator-ready playtest protocol for all Campaign Theatres. It records briefing comprehension, Mandate discovery, Heir-feedback understanding, early strategic tradeoffs, Rival pressure clarity, and mobile/desktop presentation issues so human feedback can drive the next tuning pass.

## 2.6.27 - 2026-08-03

- Made the core teaching choice fully transparent: Reward and Punish now show their exact confidence and Trust change in the Heir console. Simulation and presentation share one feedback contract, so the displayed consequence always matches the authoritative lesson result.

## 2.6.26 - 2026-08-03

- Rival Doctrine selection now explains the rival's expected pressure and learning temperament in both the Campaign Theatre cards and keyboard/screen-reader focus. The established grace and learning values remain visible and unchanged; this is clearer difficulty presentation, not a balance change.

## 2.6.25 - 2026-08-03

- Campaign Theatre now gives every chapter a concise Opening directive alongside its terrain intelligence and Honor. The same first response is included in keyboard and screen-reader focus, so the player can understand each opening's practical priority before committing a reign.

## 2.6.24 - 2026-08-03

- Campaign Theatre now previews the selected chapter's optional Honor objective beside its terrain lesson, with the same mastery goal available through keyboard and screen-reader focus. Sealed Honors stay visible as local campaign progress; they never affect match balance.

## 2.6.23 - 2026-08-03

- Expanded battlefield Lesson briefs from a terse action readout into a complete teaching handoff: the observed condition, developing doctrine, strategic goal, confidence, and the existing Heir feedback path are now visible together. This is a presentation-only explanation of the same deterministic doctrine event.

## 2.6.22 - 2026-08-03

- Added compact, content-driven terrain tags to every Campaign Theatre card. The campaign now communicates each chapter's decisive terrain identity at a glance, while selection and screen-reader focus retain the complete terrain lesson.

## 2.6.21 - 2026-08-03

- Added selected-theatre terrain intelligence to Campaign Theatre and its keyboard/screen-reader focus announcements. Players can now see whether an opening teaches fertile expansion, river supply and warships, marsh recovery, or a ridge-and-gate defense before choosing a Rival Doctrine.

## 2.6.20 - 2026-08-03

- Tightened the Tactical Uplink into a five-line battlefield brief: order and selection, people, labor, stability, and Faith. This prevents the active Mandate and intelligence feed from colliding with durable Civic Record history, which remains available in the Book of Lessons and end-of-reign report.

## 2.6.19 - 2026-08-03

- Reframed Campaign Theatre as a focused pre-reign view. The campaign picker now sits over a subdued painterly map while inactive tactical HUD, world labels, and command panels stay out of the decision; launching a reign restores the complete command shell. The canvas now exposes the matching campaign/tactical presentation phase and accessible name for browser-level regression coverage.

## 2.6.18 - 2026-08-03

- Connected each state-derived Imperial Mandate to its actual existing Build, Command, or Heir control. The tactical dock now names the active action surface and highlights its actionable control without auto-opening panels, issuing orders, or placing tutorial flags in simulation state. Captive-policy mandates deliberately highlight both assimilation and release so the player keeps the intended strategic choice.

## 2.6.17 - 2026-08-03

- Added terrain-and-role hover guidance to every Build palette tile. Farmers, housing, logistics, industry, civic works, and fortifications now explain their valid terrain and purpose before placement; the shared tactical tooltip grows to fit that guidance instead of clipping it.

## 2.6.16 - 2026-08-03

- Expanded the Campaign Theatre balance soak from one idealized plan to two representative Crown openings. Civic establishes the economy before its militia; Hold Fast commits a larger militia immediately while assigning only the civilian labor that remains. The 96-case release matrix now protects both openings across every theatre, seed, and Rival Doctrine profile.

## 2.6.15 - 2026-08-03

- Added a bounded Campaign Theatre balance soak. Every release now checks the representative Crown opening across four deterministic world seeds, all four theatres, and each transparent Rival Doctrine profile, with a `pnpm balance:soak` tuning report for local review. The suite also protects the declared first-pressure order: Disciple later than Rival, and Rival later than Architect.

## 2.6.14 - 2026-08-03

- Added a battlefield order overlay for selected Crown forces. Move, advance, naval, and attack orders now render their active route and destination marker directly on the tactical map while respecting fog of war.

## 2.6.13 - 2026-08-03

- Expanded every terrain-zone label with its exact movement, defense, placement, or naval consequence. Map reading now communicates the tactical trade directly, and rendering coverage checks those captions against the authoritative terrain modifiers.

## 2.6.12 - 2026-08-03

- Made every authored Campaign Theatre a distinct authoritative battlefield. Rivergate now has a larger navigable waterway while retaining a playable land siege route, Ashen Oath has a blighted marsh approach, and Stonewall opens on a defensive ridge. Terrain refreshes when a campaign starts, a save restores, or authority snapshots replace the active world.

## 2.6.11 - 2026-08-03

- Made Campaign Theatre keyboard-operable. Arrow keys now move a visible focus across theatres and rival doctrines, `Tab` cycles all available choices, and `Enter` or `Space` selects the focused scenario or begins its reign with a screen-reader announcement.

## 2.6.10 - 2026-08-02

- Rebuilt Campaign Theatre selection as four labeled painterly strategic vignettes for Crownfall, Rivergate, Ashen Oath, and Stonewall. The art preserves the existing Chapter, Chronicle, Honor, difficulty, input, simulation, and save/replay contracts while making each opening legible before a reign begins.

## 2.6.7 - 2026-08-02

- Hardened the storefront delivery path. The HTML5 upload archive now validates its portable entry point, PWA files, optimized tactical assets, runtime chunks, and every local reference; GitHub Verify builds, validates, and retains the exact `the-last-lesson-storefront` package.

## 2.6.6 - 2026-08-02

- Added terrain-specific environmental signatures to the tactical map. Every terrain zone now pairs its existing label and symbol with a distinct deterministic texture treatment, improving terrain recognition and color-independent readability without changing authoritative terrain rules.

## 2.6.5 - 2026-08-02

- Added `pnpm balance:report`, a deterministic standard-opening playtest across Crownfall, Rivergate, Ashen Oath, and Stonewall. It reports survival, economy, force, rival pressure timing, and scenario-specific opening outcomes, and it now runs under automated coverage.

## 2.6.4 - 2026-08-02

- Added data-driven, event-only miracle feedback. Bless Harvest, Inspire Army, Mend Settlement, and Divine Judgment now each have distinct world effects and audio cues while reduced-motion play retains the audible confirmation without forced animation.

## 2.6.3 - 2026-08-02

- Turned the Imperial Mandate into a state-derived, scenario-aware first-session path with visible progress. Every theatre now leads through its distinct opening and the core economy, force, scouting, Heir-feedback, and conquest loop without adding tutorial flags to deterministic state.

## 2.6.2 - 2026-08-02

- Made combat presentation specialization-aware without changing the deterministic combat system. Archer arrows, spear thrusts, close-combat strikes, and Warship cannon fire now read as different battlefield actions, with final impacts retained when a target is destroyed on the resolving tick.

## 2.6.1 - 2026-08-02

- Promoted the existing captive Civic Record into the Book of Lessons and authoritative end-of-reign report. The record remains factual rather than becoming a morality meter, keeping every reign's captive policy visible beside its military, learning, and Faith outcomes.

## 2.6.0 - 2026-08-02

- Connected the four authored theatres into a presentation-only campaign path. The Chronicle now recommends the first unconquered chapter, highlights it in Campaign Theatre, and advances the selection after a victorious reign without locking alternate scenarios or modifying simulation rules.

## 2.5.9 - 2026-08-02

- Bounded the multiplayer host to conservative room, co-op-seat, and WebSocket payload capacities before an input can consume simulation authority. Production hosts may adjust those limits with documented environment variables.

## 2.5.8 - 2026-08-02

- Added host-issued reconnect tokens for retained multiplayer rooms. A browser now stores the credential only for its matching host, room, and Crown identity, and a valid reconnect can safely replace a stale socket without allowing its close event to drop the recovered reign.
- Bound each recovered identity to the empire it originally joined, preventing a raw client from using its recovery credential to switch command authority.
- Added protocol, browser-profile, and socket-level coverage for protected rejoin recovery while keeping reconnect credentials outside deterministic simulation, saves, and replays.

## 2.5.7 - 2026-08-02

- Added persistent browser-local Crown identities for multiplayer rooms and made `REJOIN` reconnect directly to the retained authoritative room after a socket loss.
- Added regression coverage for stable local identity generation and same-identity room recovery without adding account, token, or alternate authority state.
- Added a host-side per-identity command budget, retaining ordinary rapid construction while rejecting command floods before they reach authoritative simulation scheduling.

## 2.5.6 - 2026-08-02

- Replaced raw internal event identifiers in the Tactical Uplink and Book of Lessons with a deterministic, player-facing Chronicle.
- Prioritized decisive tactical reports in the Uplink so a miracle, civic crisis, lesson, or battlefield reversal cannot be immediately buried by routine production events; the Book still retains the unfiltered timeline.

## 2.5.5 - 2026-08-02

- Made building, Realm, Heir, and end-of-reign controls consistently consume their pointer release before battlefield selection can run.

## 2.5.4 - 2026-08-02

- Added cursor-anchored tactical wheel zoom with deterministic-state isolation and browser coverage for the continuous battlefield framing.

## 2.5.3 - 2026-08-02

- Updated the direct GitHub Actions dependencies to Node 24-compatible major releases and explicitly run the remaining Pages composite actions on Node 24. The game build itself remains on Node 22.

## 2.5.2 - 2026-08-02

- Added the `C` canvas shortcut for Mend Settlement at the active Crown seat, with browser coverage for Ashen Oath's player-facing emergency response.
- Command-dock buttons now consume their pointer interaction before the map-selection handler, preserving selection after a tactical or civic command.

## 2.5.1 - 2026-08-02

- Ashen Oath now begins with a bounded civic plague and a first Mandate to use Mend Settlement. The opening Faith reserve can cure it immediately; delaying remains survivable but has an explicit human cost before the captive and religious-pressure decisions begin.
- Added scenario coverage for both the authored outbreak and its first-tick deterministic cure.

## 2.5.0 - 2026-08-02

- Added `MEND SETTLEMENT`, a 14-Faith civic recovery miracle. It restores health, clears an active plague, and reinforces loyalty, devotion, and internal Faith without restoring lost population or infrastructure.
- The rite uses the existing deterministic command, event, doctrine, replay, save, multiplayer, and miracle-presentation contracts; focused simulation coverage verifies both the cure and its resource cost.

## 2.4.3 - 2026-08-02

- The tactical application now publishes its keyboard shortcuts through `aria-keyshortcuts` and defaults motion effects to the browser's reduced-motion preference until the player selects a local override.
- Added browser coverage for both the keyboard accessibility contract and the system-motion default, while preserving the existing local preference behavior.

## 2.4.2 - 2026-08-02

- Local active reigns now pause when the tactical browser tab is hidden and require an intentional resume on return. This protects real-time campaigns from advancing while the player is away without altering simulation state or host-owned multiplayer time.

## 2.4.1 - 2026-08-02

- Hardened portable `.tll` restoration in the Book of Lessons: the temporary browser file picker now cleans itself up after either selection or cancellation and carries an accessible archive label.
- Added production-browser coverage for both restoring an exported archive and safely rejecting a malformed archive, protecting the complete cross-browser save path rather than only the download step.

## 2.4.0 - 2026-08-02

- The Book of Lessons can now export and import versioned portable `.tll` reign archives. Each archive contains the active deterministic save and its campaign opening world, preserving replay verification when a player moves a reign between browsers or devices.

## 2.3.1 - 2026-08-02

- The main verification workflow now builds the authoritative multiplayer Docker image after its deterministic and browser gates, preventing an unvalidated container from becoming the first production deployment.

## 2.3.0 - 2026-08-02

- Added a container-ready authoritative multiplayer host with a deterministic-transport-preserving `/health` endpoint, an operational deployment guide, and networking coverage for the health contract.

## 2.2.3 - 2026-08-02

- Production builds now generate a content-addressed service worker that precaches the exact shell, split engine, art, manifest, and icons in the emitted artifact. Browser coverage verifies an installed campaign survives an offline reload.

## 2.2.2 - 2026-08-02

- Extended the production browser gate so a phone-sized campaign theatre must select the Crownfall Rival doctrine and begin a reign, not merely draw a nonblank canvas.

## 2.2.1 - 2026-08-02

- Reworked campaign-theatre hit handling into one fixed-overlay interaction surface so the visual theatre and doctrine cards receive their intended input across runtime coordinate spaces. Campaign launch now suppresses the unrelated world-selection release and preserves its accessible reign announcement.

## 2.2.0 - 2026-08-02

- Added Playwright browser smoke coverage to the release gate. Desktop verification now checks the PWA shell, WebP tactical assets, and rendered campaign theatre; a phone-sized pass checks that the tactical surface remains visibly rendered without runtime errors.
- GitHub verification and Pages deployment now install Chromium and run these browser checks alongside deterministic simulation and production-build coverage.

## 2.1.0 - 2026-08-02

- Added `pnpm package:storefront`, which builds a relative-path, self-contained HTML5 archive with `index.html` at its root for browser-game storefront uploads.
- The generated archive is ignored by Git and preserves the single-player install/offline path without implying that the separate multiplayer authority is publicly hosted.

## 2.0.0 - 2026-08-02

- Added one optional, deterministic Campaign Honor to every theatre: Veterans' Lesson, Tidecaller, Civic Reckoning, and Unbroken Gate. Honors reward the specific tactical system each opening teaches and appear in the debrief, Campaign Theatre, and Book of Lessons.
- Honors persist only as local presentation progress. They do not grant bonuses or enter authoritative state, saves, replays, multiplayer snapshots, or balance calculations.

## 1.99.0 - 2026-08-02

- Split Phaser into a stable production chunk separate from campaign code. Returning players can now reuse the engine from browser and offline caches when a new game build changes only application code.

## 1.98.0 - 2026-08-02

- Reduced the initial painterly art payload by converting the battlefield and both tactical atlases from 5.2 MB of runtime PNGs to approximately 0.75 MB of reproducible WebP assets.
- Moved original PNGs outside the public deploy root, generated a compact social preview, and advanced the offline cache so installed campaigns refresh to the optimized asset set cleanly.

## 1.97.0 - 2026-08-02

- Made the static single-player release installable on supported browsers with a dedicated painterly Crown-and-Book application crest, web manifest, and offline service worker.
- The service worker uses fresh navigation requests and cache-first local assets, keeping future releases reachable while preserving an offline campaign after its first successful load. Multiplayer remains intentionally online-only.

## 1.96.0 - 2026-08-02

- Added baseline accessibility semantics around the canvas strategy interface: a focusable, named application surface, screen-reader-only campaign and keyboard briefing, a JavaScript fallback, and polite announcements for deliberate player commands.
- The live-region filter excludes raw simulation event identifiers, so five-second world ticks do not flood assistive technology.

## 1.95.0 - 2026-08-02

- Added production web metadata for the public campaign: an intentional browser title, description, dark theme color, and Open Graph/Twitter previews using the existing painterly battlefield art.
- The deployed game now presents its real strategy premise when shared rather than falling back to bare Vite metadata.

## 1.94.0 - 2026-08-02

- Added an automated GitHub Pages release workflow. Every `main` push now rebuilds the verified static campaign with the repository base path and deploys it through GitHub Pages once that publishing source is enabled in repository settings.
- Kept the public release boundary honest: Pages serves the full single-player campaign, while authoritative multiplayer still requires its own WebSocket host.

## 1.93.0 - 2026-08-02

- Added an opening Rival Doctrine countdown to the Tactical Uplink. It makes the selected fair-difficulty grace window legible before the first enemy is visible, giving a new reign a clear strategic tempo without disclosing hidden units or changing the simulation.

## 1.92.0 - 2026-08-02

- Corrected the tactical HUD stacking rule for the expanded Build palette. The minimap now moves beneath the palette when space permits and hides cleanly when the viewport cannot hold both, preventing construction controls from obscuring strategic navigation.
- This remains presentation-only: selection, placement, simulation timing, saves, replays, and multiplayer authority are unchanged.

## 1.91.0 - 2026-08-02

- Added a 180-tick Campaign Theatre pacing regression for Crownfall, Rivergate, Ashen Oath, and Stonewall. After the standard economic opening, the Crown must remain alive and supplied while the Rival Crown has begun a measurable siege against its throne.
- This guards the intended early campaign clock: the map cannot silently become a sandbox, and the rival cannot erase an economically sound opening before the player can respond.

## 1.90.0 - 2026-08-02

- Hardened runtime entity creation for multi-settlement reigns. Same-tick building, battalion, caravan, and Warship production now resolves a deterministic settlement-scoped suffix only when its legacy-shaped base ID is already occupied.
- Added a replay regression proving simultaneous Crown production in two settlements remains independently addressable rather than overwriting one creation with the other.

## 1.89.0 - 2026-08-02

- Mobilizing citizens into a player- or governor-raised battalion now deterministically retires excess civilian labor, preserving food production after construction, luxury, mining, and lumber roles.
- Starvation, sickness, and Villa-loss population reductions use the same labor-capacity reconciliation, preventing phantom worker output after civilian losses.
- Governors now retain a minimum farm workforce before raising an additional battalion, keeping their economic opening viable while preserving military pressure.
- Made governor-raised battalion identities settlement-scoped so simultaneous governors cannot overwrite one another's new field force.
- Added population and governor regressions covering workforce mobilization, civilian losses, sustained farm labor, and concurrent governor recruitment.

## 1.88.0 - 2026-08-02

- Added a `CAMPAIGN THEATRE` path to the end-of-reign debrief, letting players return directly to scenario selection after a victory or defeat.
- The debrief now distinguishes replaying the current theatre from choosing a different Chronicle-marked opening; campaign navigation remains presentation-only.

## 1.87.0 - 2026-08-02

- Added sustainable, terrain-valid rival farms and labeled rival fertile fields to every Campaign Theatre opening, preventing unattended enemy realms from collapsing into empty castles.
- Added 72-tick scenario regressions proving both rival economic viability and the Crown's authored opening-farm path across all four theatres.

## 1.86.0 - 2026-08-02

- Added a local Campaign Chronicle. Victories are recorded per Campaign Theatre opening and appear in the scenario selector and end-of-reign debrief.
- Chronicle status is cosmetic progression: it never locks scenarios or enters simulation state, saves, replays, or multiplayer authority.

## 1.85.0 - 2026-08-02

- Added live affordability state to the construction palette; unaffordable structures dim and report their exact missing wood and/or iron before placement mode begins.
- Replaced generic construction rejection with terrain, boundary, resource, foundation-overlap, and structure-clearance explanations.
- Kept this as a renderer-side preflight only. Authoritative construction validation, command processing, saves, replays, and multiplayer authority remain unchanged.

## 1.84.0 - 2026-08-02

- Expanded the Heir console's latest-lesson record to show doctrine domain, observed condition, intended purpose, and confidence alongside the governor's autonomous utility decision.
- Kept the expanded explanation presentation-only: doctrine formation, confidence, rewards, punishments, saves, replays, and multiplayer authority are unchanged.

## 1.83.0 - 2026-08-02

- Added a persistent `MOTION // FULL` / `MOTION // REDUCED` preference in the Book of Lessons.
- Reduced motion suppresses transient combat, miracle, and lesson-banner tweening while retaining all readable commands, events, and tactical state.
- The preference is local presentation state only and cannot affect simulation, saves, replays, or multiplayer authority.

## 1.82.0 - 2026-08-02

- Added `pnpm check` as the canonical local release gate for the deterministic suite and production build.
- GitHub verification now runs that same command and retains the tested `dist` bundle as a fourteen-day `the-last-lesson-web` artifact.

## 1.81.0 - 2026-08-02

- Added deterministic opening-health coverage for Crownfall, Rivergate, Ashen Oath, and Stonewall. Each scenario must survive its first twelve unattended ticks with a living Crown settlement and no premature victory, and reproduce its full state and event history exactly from the same seed.

## 1.80.0 - 2026-08-02

- Added a persistent `SFX ON/OFF` header control for optional tactical Web Audio.
- The preference is local presentation state only and cannot affect simulation, saves, replays, or multiplayer authority.

## 1.79.0 - 2026-08-02

- Added field feedback for Bless Harvest, Inspire Army, and Divine Judgment using authoritative `miracle-cast` events: a short expanding halo and named invocation at the affected settlement or battalion.
- Kept miracle feedback presentation-only, so Faith costs, effects, command timing, saves, replays, and multiplayer authority are unchanged.

## 1.78.0 - 2026-08-02

- Added contextual hover guidance to command-dock controls, surfacing a command's intent and cost only while it is being inspected.
- Kept the guidance layer presentation-only and compact so it improves first-session clarity without replacing the dense RTS command surface.

## 1.77.0 - 2026-08-02

- Added expanding target impact pulses to existing projectile and damage-number feedback for battalion and Warship strikes.
- Kept combat feedback presentation-only; deterministic damage, cooldowns, event history, saves, replays, and multiplayer state are unchanged.

## 1.76.0 - 2026-08-02

- Replaced generic battalion rectangles with painterly formation markers for militia, spears, archers, raiders, and scout hounds, while preserving explicit labels, ranks, traits, selection, and visibility.
- Added a painterly Warship marker while retaining the distinct supply-wagon presentation and existing transport interaction.
- Kept unit art presentation-only: no combat value, target, path, visibility, command, save, replay, or multiplayer behavior changed.

## 1.75.0 - 2026-08-02

- Replaced gray-box building presentation with a painterly isometric atlas for castles, civic structures, resource works, housing, roads, walls, gates, moats, and outposts.
- Kept building art strictly presentation-side: labels, terrain placement rules, visibility, owner tint, hitboxes, saves, replays, and multiplayer state remain unchanged.
- Center the camera on the active Crown seat when starting, restarting, or restoring a local reign.

## 1.74.0 - 2026-08-02

- Added deterministic `attack-move-battalion` commands. An advancing battalion acquires visible hostile units, convoys, or complete structures inside its acquisition radius, engages them, and resumes its saved march destination once the target is gone.
- Added the `F` advance targeting mode and two simulation regressions covering route resumption and direct-order cancellation.
- Corrected combat target validation to clear destroyed targets before cooldown processing, eliminating an unnecessary stale-target delay for every direct combat order.

## 1.73.0 - 2026-08-02

- Added classic RTS control groups: bind selected Crown battalions with `Ctrl`/`Cmd` plus `1` through `9`, then recall the surviving group with its number key.
- Pressing a recalled group key twice now centers the tactical camera on the average position of that group.
- Kept control groups strictly presentation-side, pruning lost battalions from bindings and clearing bindings whenever a campaign, load, replay, or multiplayer authority changes without changing deterministic simulation, replays, or multiplayer authority.

## 1.72.0 - 2026-08-02

- Added RTS keyboard controls for Build, Heir, Realm, Book, Move, and Attack modes, plus a layered `Esc` cancel flow for placement, panels, and selection.
- Routed matching command-dock clicks through the same handlers so keyboard and pointer controls always produce identical UI states.

## 1.71.0 - 2026-08-01

- Updated the living Technical Design Specification to reflect the actual implementation baseline: complete deterministic milestones, playable local-network co-op, current authoritative boundaries, and remaining delivery work.

## 1.70.0 - 2026-08-01

- Added a 120-second idle-room grace period to the multiplayer host. A room stops simulating when empty but preserves its authority state, so a returning client can rejoin the same reign rather than starting over.
- Added live WebSocket coverage for disconnecting, retaining a room at tick one, and joining it again with the exact persisted host snapshot.

## 1.69.0 - 2026-08-01

- Added explicit remote connection-state handling. An interrupted host freezes the current multiplayer snapshot, marks the header `FROZEN / REJOIN`, and leaves no path for a client to continue the match from a non-authoritative local timeline.
- Browser-verified the live join, host termination, frozen-state, and rejoin affordance flow.

## 1.68.0 - 2026-08-01

- Hardened the authoritative command boundary: clients may command only their own empire's settlements, heirs, battalions, buildings, and transports. The deterministic fixture-only Faith grant command is rejected from connected clients.
- Added coverage for cross-empire command rejection and arbitrary Faith-grant rejection.

## 1.67.0 - 2026-08-01

- Added an in-game `MULTI` lobby that joins named WebSocket rooms as the Crown, renders host-owned snapshots, forwards the existing RTS command intents, and prevents client-local pause or speed changes from desynchronizing a match. The header explicitly identifies host-controlled time while connected.
- Made room setup queue the canonical opening labor plan on the authoritative host while preserving a player's own first-tick labor order as the final decision.
- Added deterministic coverage for the opening-labor precedence rule and browser-verified the full host, join, tick, and snapshot loop.

## 1.66.0 - 2026-08-01

- Added a real `ws`-based authoritative multiplayer host, named-room lifecycle, shared serialized join/intent/snapshot protocol, browser-side remote authority client, and `pnpm server:multiplayer` command.
- Added live WebSocket tests proving that the host owns room setup, command IDs, tick assignment, snapshot delivery, and malformed-message rejection.

## 1.65.0 - 2026-08-01

- Added a GitHub Actions quality gate that installs with the locked dependency graph, runs the full deterministic suite, and builds the browser release on every pull request and main-branch push.
- Added `pnpm preview` for a production-bundle local smoke test.

## 1.64.0 - 2026-08-01

- Added deterministic clear-muster selection around a Castle. New player-trained and heir-trained battalions now avoid overlapping buildings and existing field forces; Stonewall's first defender no longer spawns on its gate.

## 1.63.0 - 2026-08-01

- Reworked the expanded construction-palette tile metadata into compact Owned and Cost lines, preventing resource costs from overflowing adjacent building choices.

## 1.62.0 - 2026-08-01

- Added a nine-tick Stonewall militia regression test, proving the opening defender remains active through the scenario's initial defense window.

## 1.61.0 - 2026-08-01

- Preserved scenario-authored opening labor allocations instead of overwriting them with the generic Crown setup command. Stonewall now starts with its intended farming and construction workforce.

## 1.60.0 - 2026-08-01

- Bound the standard `pnpm dev` server to an IPv4-reachable address so the local browser game at `http://127.0.0.1:5173/` launches reliably.

## 1.59.0 - 2026-08-01

- Clarified the Campaign Theatre launch affordance: the rival-doctrine cards now explicitly begin a new reign instead of reading like passive difficulty information.

## 1.58.0 - 2026-08-01

- Preserved the Stonewall opening in save/load normalization and added a round-trip regression test.
- Made the Tactical Uplink's Imperial Mandate scenario-aware: Rivergate begins with supply, Ashen Oath begins with captive legitimacy, and Stonewall begins with a garrisoned gate.

## 1.57.0 - 2026-08-01

- Added the Stonewall Campaign Theatre opening: a fortified Crown border with walls, gate, food reserves, and build labor for testing defense, retreat, logistics, and counter-siege play.

## 1.56.0 - 2026-08-01

- Governing heirs now recognize unfinished infrastructure and deterministically reassign enough labor to complete foundations before pursuing other priorities.

## 1.55.0 - 2026-08-01

- Made construction labor authoritative. Foundations now need assigned builders, each builder progresses one deterministic site per tick, and stalled sites emit an explainable event instead of silently completing.

## 1.54.0 - 2026-08-01

- Made defensive works spatially meaningful. Hostile Walls now severely slow nearby land movement while Gates form a comparatively faster breach route; the effects vanish when defenses fall.

## 1.53.0 - 2026-08-01

- Taught governing heirs to preserve exhausted field forces. When a visible enemy closes on a low-morale or low-supply battalion, the heir now orders an explainable Retreat to Crown rather than committing it to a doomed fight.

## 1.52.0 - 2026-08-01

- Added authoritative foundation-clearance rules. Building placement now rejects overlapping structures before resources are spent, and the tactical preview uses the same rule.

## 1.51.0 - 2026-08-01

- Added explicit Retreat to Crown orders. Retreat clears a battalion's target, routes it to its home Castle, carries a small morale cost, and becomes an observable military lesson.

## 1.50.0 - 2026-08-01

- Added derived battalion battlefield traits. Repeated terrain combat produces Forest Veterans, Hill Fighters, or Marsh Runners with improved traversal; repeated structure attacks produce Siege Specialists with a bounded siege-only bonus.

## 1.49.0 - 2026-08-01

- Added civic morale recovery. Every third tick, supplied battalions can regain morale from a peaceful, adequately housed, happy, loyal, and religiously secure home settlement. The recovery is event-explained and cannot replace logistical supply.

## 1.48.0 - 2026-08-01

- Added deterministic battle aftermath morale. Destroying an enemy battalion bolsters the victor and nearby settlement forces while shaking surviving defenders; the full delta is exposed through `battle-morale-shifted`.

## 1.47.0 - 2026-08-01

- Made civilian housing a real wartime target: destroying a completed Villa now causes immediate civilian deaths plus health, happiness, and loyalty losses recorded by `housing-destroyed`. Captive Hovels retain their distinct liberation behavior.

## 1.46.0 - 2026-08-01

- Added deterministic local outbreaks for critically unhealthy, food-pressured settlements. Plagues run for three inspectable world ticks, reducing population, health, happiness, and loyalty without relying on hidden random rolls.

## 1.45.0 - 2026-08-01

- Added an empire-level Civic Record for captives taken, integrated, and released. This factual moral memory creates an explainable unresolved-captivity burden in rebellion pressure rather than a generic morality score.

## 1.44.0 - 2026-08-01

- Added persistent battalion experience and derived Militia, Regular, Veteran, Elite, and Legendary ranks. Combat awards experience transparently, while experienced forces lose less morale when completely unsupplied.

## 1.43.0 - 2026-08-01

- Added terrain-compatible Moats to the construction console. Completed enemy moats halve battalion and land-caravan movement through their perimeter, producing clear siege geometry without special-case pathfinding.

## 1.42.0 - 2026-08-01

- Corrected Faith generation so only a settlement's own battalions contribute military Faith; remote forces no longer multiply devotion across an empire.
- `faith-produced` events now provide a source-level breakdown for citizen, military, internal-religion, and rival-pressure contributions.

## 1.41.0 - 2026-08-01

- Enemy Outposts now project a bounded religious pressure beside castles, road corridors, and caravans. Pressure events expose every source.
- Corrected rebellion security to count only a settlement's own battalions; armies stationed in distant domains no longer suppress local unrest.

## 1.40.0 - 2026-08-01

- Added Plantation development for Luxury Groves. Dedicated luxury labor produces global Luxury, with transparent local happiness and devotion gains that feed the existing Faith system.
- Save format `1.2.0` adds luxury labor and migrates valid `1.1.0` saves with zero luxury workers.

## 1.39.0 - 2026-08-01

- Added deterministic settlement defection. A settlement may transfer to the nearest rival throne only under catastrophic rebellion, strong external religious pressure, collapsed loyalty, and no local friendly battalion.
- Defection changes buildings and governance but does not kill the displaced heir; only a captured Castle kills its seated governor.

## 1.38.0 - 2026-08-01

- Added Scout Hounds, a Town Square-trained four-hound pack that spends food and wood instead of citizens, moves quickly, and reveals farther than ordinary battalions.
- Hounds cannot garrison and do not create captives when defeated, preserving their reconnaissance role.

## 1.37.0 - 2026-08-01

- Added a reversible `REVIEW REIGN` workflow to the Book of Lessons. Players can replay the active command history from tick zero in read-only mode and return to the exact live paused campaign.
- Replay review never writes recovery saves, accepts orders, or advances beyond the live reign's recorded tick.

## 1.36.0 - 2026-08-01

- Added the Campaign Theatre with Crownfall, Rivergate, and Ashen Oath scenario openings before Rival Doctrine selection.
- Scenarios are authoritative saved/replayed world state: Rivergate begins with civic transport capacity, while Ashen Oath begins with captives, a hovel, and a hostile religious road corridor.

## 1.35.0 - 2026-08-01

- Added a transport-free `LocalAuthority` host that owns simulation time, command IDs, and immutable snapshots for deterministic local co-op and future network transport.
- Added coverage proving two clients can submit commands to one authority and receive a state/event hash matching the replay system exactly.

## 1.34.0 - 2026-08-01

- Added Divine Judgment: an 18-Faith settlement ward that temporarily counters external religious pressure while raising local Faith, loyalty, and devotion.
- Religious-pressure events now expose the active ward contribution, keeping divine counter-pressure fully explainable.

## 1.33.0 - 2026-08-01

- Added `VERIFY REPLAY` to the Book of Lessons. It compares a fresh replay of the active reign against the authoritative state and event history without mutating either.
- Local and recovery saves retain the campaign's opening-world snapshot so a resumed reign can be verified as well.

## 1.32.0 - 2026-08-01

- Added versioned `the-last-lesson-replay` records with validated serialization and deterministic playback through the same simulation path used by live matches.

## 1.31.0 - 2026-08-01

- Added an authoritative reign report to the match-resolution panel. It summarizes campaign duration, thrones captured, lessons taught, heirs guided, and retained Faith from deterministic world state and event history.
- The report is presentation-only: it neither changes simulation state nor alters saved games, replays, or multiplayer determinism.

## 1.30.0 - 2026-08-01

- Roads now provide religious reach when they form a corridor between hostile thrones, and enemy caravans project a smaller mobile religious influence near a settlement.
- Religious-pressure events now expose castle, road, and caravan sources. The Tactical Uplink and Book of Lessons show internal Faith alongside rival pressure.

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
# 2.6.9 - 2026-08-02

- Expanded the Imperial Mandate from a progress label into state-derived, action-level onboarding directives.
- The Tactical Uplink now names the next visible command path, while Build and Heir headers signal when they are the relevant surface for the active lesson.

# 2.6.8 - 2026-08-02

- Added a locally persisted high-contrast presentation mode, including an `X` shortcut and Book of Lessons visibility control.
- High contrast honors the browser's `prefers-contrast: more` preference until the player makes an explicit local choice, and is verified as presentation-only browser behavior.

# 2.5.6 - 2026-08-02

- Replaced raw internal event identifiers in the Tactical Uplink and Book of Lessons with a deterministic, player-facing Chronicle. Doctrine observations, heir decisions and concerns, miracles, civic crises, logistics, combat, and captures now report what happened and why using the existing immutable event payloads.
- Added narrative regression coverage for doctrine, autonomous heir decisions, and Mend Settlement recovery without introducing a second simulation or history format.
- Prioritized decisive tactical reports in the Uplink so a miracle, civic crisis, lesson, or battlefield reversal cannot be immediately buried by routine production events; the Book still retains the unfiltered timeline.
