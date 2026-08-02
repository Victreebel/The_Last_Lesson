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

## Public Deployment

Deploy the container to any service that supports long-lived WebSocket connections, HTTPS, and an HTTP health check. Configure the service to expose the container port and use `/health` as its readiness path.

The static GitHub Pages game must connect to the host over `wss://` in production. A public domain and TLS are therefore deployment-provider configuration, not game simulation configuration.

## Boundaries

This host deliberately does not add account identity, matchmaking, payments, rate limiting, moderation, or anti-cheat services. It only provides the transport-safe deterministic authority already specified by the game. Those product services require a chosen production provider and account model.
