# The Last Lesson Privacy and Local Data Summary

**Effective:** 2026-08-03  
**Scope:** the current browser campaign and optional self-hosted multiplayer adapter.

## Plain-Language Summary

The Last Lesson does not include an account system, advertising SDK, analytics
SDK, telemetry service, or in-game purchase flow. A local single-player reign
runs in the browser and does not send gameplay, save, replay, playtest, or
accessibility-preference data to a The Last Lesson service.

GitHub Pages and any other web host may process ordinary web requests (such as
an IP address and browser request headers) under its own policies. That
hosting-layer processing is outside the game simulation and is not used by the
game for player profiles or gameplay analytics.

## Browser-Local Data

The browser may retain the following data for convenience. It stays in that
browser profile unless the player explicitly downloads, shares, or exports it.

| Local data | Purpose |
| --- | --- |
| Save and replay origin | Continue a local reign and verify or review its deterministic history. |
| Campaign Chronicle and Honors | Mark locally completed theatres and optional scenario mastery. |
| Audio, motion, and contrast preferences | Respect the player’s presentation choices between visits. |
| Browser-local Crown identity | Rejoin an optional multiplayer room as the same Crown without creating an account. |
| Per-host-room reconnect credential | Reclaim a temporarily retained multiplayer room after an interrupted connection. |

Clearing this site’s browser storage removes those local records. Exported
`.tll` archives and `.playtest.json` files are ordinary files chosen and kept
by the player; clearing browser storage does not remove downloaded files.

## Local Playtest Records

`BOOK > EXPORT PLAYTEST` creates a local JSON file. The record contains only
the theatre, Rival Doctrine, tick, victory state, factual Civic Record, and
event-type counts. It does not include player identity, browser metadata,
local preferences, save state, or network data. The game never uploads this
file; sharing it is a player or facilitator decision.

## Optional Multiplayer

Multiplayer is an optional connection to a host chosen by the player. Joining
a room sends the host a browser-generated Crown identity, the requested room,
the selected opening, gameplay intents, and receives authoritative gameplay
snapshots. The in-repository host keeps the active room and reconnect
credential in memory only, holds an empty room for up to two minutes, and does
not implement account profiles, persistent room storage, or telemetry.

The person or organization operating a multiplayer host controls that host and
its network environment. Before public multiplayer use, players should review
the operator’s privacy notice and use a secure `wss://` host. The current
prototype does not provide public matchmaking or a hosted account service.

## Third-Party Policies

Browser vendors, web hosts, storefronts, and multiplayer-host operators may
have their own data practices. This summary describes The Last Lesson
application behavior only; it does not replace those providers’ policies.

## Changes

Any future addition of accounts, analytics, cloud saves, matchmaking, payments,
or persistent multiplayer services must update this document before release.
