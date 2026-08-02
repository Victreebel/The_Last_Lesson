# Storefront Release

## Artifact

Create the standalone browser build with:

```sh
pnpm package:storefront
```

This produces `release/the-last-lesson-web.zip`. It is a self-contained HTML5 upload archive: `index.html` is at its root, all game paths are relative, and it includes the install manifest, service worker, icons, JavaScript chunks, and optimized painterly assets.

`pnpm verify:storefront` validates an existing archive. It rejects a package that is missing its root entry point, PWA delivery files, tactical art, required engine/application chunks, or a locally referenced asset.

## Pre-Upload Gate

1. Run `pnpm check`.
2. Run `pnpm package:storefront`.
3. Confirm `pnpm verify:storefront` reports a verified archive.
4. Upload only `release/the-last-lesson-web.zip` to the browser-game storefront.

The package is the complete single-player campaign. Public online co-op remains a separate product operation because it needs a deployed WebSocket authority with a public `wss://` endpoint.

## CI Delivery

The GitHub verification workflow packages and validates the archive on every pull request and `main` push. Its `the-last-lesson-storefront` artifact preserves the exact verified archive for fourteen days, alongside the static Pages build artifact.
