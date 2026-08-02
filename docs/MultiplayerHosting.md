# Multiplayer Hosting

The Last Lesson uses one authoritative WebSocket server per deployment. The server owns the deterministic simulation, tick timing, command IDs, and snapshots; browsers only submit intents and render snapshots.

## Container

Build and run the included container locally:

```sh
docker build -t the-last-lesson-host .
docker run --rm -p 8787:8787 the-last-lesson-host
```

The host accepts WebSocket connections at `ws://localhost:8787` and reports a load-balancer-friendly health response at `GET /health`:

```json
{"status":"ok","rooms":0}
```

Set `PORT` when the host platform supplies one. The process binds its HTTP/WebSocket listener to that port and shuts down cleanly on `SIGINT` or `SIGTERM`.

The host defaults to 64 active or retained rooms, four Crown seats per room, and a 16 KiB WebSocket payload limit. Override those operational limits with positive integers in `MAX_ROOMS`, `MAX_CLIENTS_PER_ROOM`, and `MAX_PAYLOAD_BYTES`; capacity is enforced before a room or player reaches simulation authority.

## Public Deployment

Deploy the container to any service that supports long-lived WebSocket connections, HTTPS, and an HTTP health check. Configure the service to expose the container port and use `/health` as its readiness path.

The static GitHub Pages game must connect to the host over `wss://` in production. A public domain and TLS are therefore deployment-provider configuration, not game simulation configuration.

## Boundaries

This host deliberately does not add account identity, matchmaking, payments, moderation, or broad anti-cheat services. It does issue an opaque reconnect credential to each Crown after the first join, stores it only in that browser's local profile, and requires it to reclaim a retained Crown identity. Commands, rooms, co-op seats, and payload size are bounded before they reach authoritative scheduling. These transport safeguards do not replace account-backed identity or production anti-cheat, which require a chosen provider and account model.
