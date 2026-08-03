# The Last Lesson Playtest Protocol

## Purpose

This protocol turns external play sessions into evidence for balance, clarity,
and the central teaching loop. It supplements deterministic campaign reports;
it never replaces them or changes the frozen simulation rules.

## Session Format

- One facilitator and one player.
- Record the build commit, browser, viewport class, scenario, and Rival Doctrine.
- Include at least one 640-899px compact-width session alongside desktop and phone checks.
- Use a fresh local profile for first-session testing.
- Observe without coaching until the player explicitly asks for help.
- Capture the first 25 minutes, then a short post-session interview.

## Core Questions

1. Can the player describe the selected Theatre's terrain, opening directive,
   Honor, and Rival Doctrine before starting?
2. Does the player find the first active Imperial Mandate and its highlighted
   command surface without facilitation?
3. Does the player understand what an Heir observed and predict what Reward or
   Punish will do before using either action?
4. Does the player perceive a meaningful tradeoff between civic labor and an
   early field battalion?
5. Does the player recognize the Rival's first pressure as fair, legible, and
   attributable to the chosen doctrine rather than an unexplained bonus?
6. When a Prisoner Accord is available, does the player find the highlighted
   Accord and understand that it returns equal people to both realms and does
   not teach the Heir?

## Theatre Coverage

Run at least four sessions per Theatre: two on Rival, one on Disciple, and one
on Architect. Rotate first-time players through the opening order so Crownfall
does not always receive the least experienced sessions.

| Theatre | Observe | Success Signal | Watch For |
| --- | --- | --- | --- |
| Crownfall | Food and first levy | Player reaches farm, militia, scout, and first lesson unaided | Missing the fertile-ground requirement or overbuilding before food |
| Rivergate | Supply route | Player commissions a wagon and identifies the river as an opportunity | Treating the river as decoration or never noticing naval logistics |
| Ashen Oath | Plague, captives, and prisoner accord | Player understands assimilation, release, and equal exchange as distinct civic choices | Punishment/assimilation confusion, an unclear Accord requirement, or moral framing that feels opaque |
| Stonewall | Gate defense | Player raises and garrisons a force before the first serious pressure | Gate status, garrison command, or ridge advantage going unnoticed |

## Observation Sheet

Record exact times where possible:

```text
Build commit:
Player experience: RTS / strategy / none
Scenario and Rival Doctrine:
Viewport: desktop / phone

Time to select a Theatre:
Player explanation of terrain and opening directive:
Time to first completed Mandate step:
Time to first battalion:
Time to first observed lesson:
Predicted Reward/Punish outcome before action:
Time to first rival contact:
Reason given for a loss, stall, or restart:
Accessibility or readability issue:
Most satisfying decision:
Most confusing decision:
Would play another Theatre? Why or why not?
```

## Triage Rules

- **Onboarding defect:** three players cannot identify the active Mandate path
  or a required command surface.
- **Explainability defect:** two players cannot state the confidence/Trust
  consequence of feedback after seeing the Heir panel.
- **Balance investigation:** a theatre repeatedly loses its Crown before the
  first readable rival contact, or a standard opening has no meaningful
  counterpressure by the first expedition.
- **Presentation defect:** labels, terrain tags, controls, or transient lesson
  briefs obscure relevant tactical information at either supported viewport.

Record defects as reproducible observations first. A tuning or UI change must
then be paired with a deterministic regression where that is possible.
