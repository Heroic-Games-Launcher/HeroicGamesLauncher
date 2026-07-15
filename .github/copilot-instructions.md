# Heroic Games Launcher — Copilot Instructions

## Architecture Overview

Heroic is an Electron app (TypeScript, React, electron-vite) that launches games from Epic Games Store, GOG, and Amazon Games. It wraps CLI tools (legendary, gogdl, nile) behind a unified **Runner** abstraction.

The codebase has four layers — never import across boundaries except through the defined IPC bridge:

| Layer        | Path            | Runs in                                            |
| ------------ | --------------- | -------------------------------------------------- |
| **Backend**  | `src/backend/`  | Main (Node.js) process                             |
| **Preload**  | `src/preload/`  | Preload scripts — bridge between main ↔ renderer   |
| **Frontend** | `src/frontend/` | Renderer (React) process                           |
| **Common**   | `src/common/`   | Shared types/utils only — no process-specific code |

## IPC Communication (Critical Pattern)

All frontend↔backend communication goes through a **fully type-safe IPC system**. Direct `ipcMain`/`ipcRenderer` imports are **banned by ESLint** — use the typed wrappers instead.

1. **Define the channel** in `src/common/types/ipc.ts` — add to `SyncIPCFunctions` (fire-and-forget) or `AsyncIPCFunctions` (request/response) or `FrontendMessages` (backend→frontend push)
2. **Register the handler** in `src/backend/` using helpers from `src/backend/ipc.ts`: `addHandler()`, `addListener()`, or `sendFrontendMessage()`
3. **Expose to frontend** in `src/preload/api/` using factory functions from `src/preload/ipc.ts`: `makeHandlerInvoker()`, `makeListenerCaller()`, or `frontendListenerSlot()`
4. **Call from frontend** via `window.api.yourFunction()`

## Store Manager Pattern

Game store backends are abstracted via two interfaces in `src/common/types/`: `GameManager` (per-game ops: install, launch, update, repair, etc.) and `LibraryManager` (library-level: getGameInfo, listUpdateableGames, etc.).

Each runner (`legendary`, `gog`, `nile`, `sideload`, `zoom`) implements these as **module-level exported functions** (not classes). They are aggregated into `gameManagerMap` and `libraryManagerMap` in `src/backend/storeManagers/index.ts` for polymorphic dispatch by `Runner` key.

> **Zoom runner** (`src/backend/storeManagers/zoom/`) is **experimental and Linux-only**, gated behind a feature flag. Unlike the other runners which wrap CLI tools, Zoom directly calls the ZOOM Platform REST API via HTTP. Several operations (update, repair, import) are stubs. Always check the feature flag before enabling Zoom-related code paths.

## Wine/Proton Management (Linux & macOS)

Wine/Proton handling is a major subsystem in `src/backend/wine/` and `src/backend/tools/`:

- **Wine discovery** (`src/backend/wine/manager/utils.ts`): scans the system for installed Wine/Proton/CrossOver/GPTK versions — checks `$PATH`, `~/.local/share/lutris/`, Steam `compatibilitytools.d/`, and platform-specific paths.
- **Wine downloading** (`src/backend/wine/manager/`): downloads and installs Wine-GE, GE-Proton, Wine-Lutris, Wine-Crossover, etc. from GitHub releases. Sources defined in `downloader/constants.ts`.
- **DXVK/VKD3D tools** (`src/backend/tools/index.ts`): manages DirectX translation layers — downloads and installs DXVK, VKD3D, DXVK-NVAPI DLLs into Wine prefixes.
- **umu-launcher** (`src/backend/wiki_game_info/umu/`): on Linux, [umu-launcher](https://github.com/Open-Wine-Components/umu-launcher) is the preferred way to run games with Proton outside Steam. Heroic resolves the `umu-run` binary (system `$PATH` first, then a bundled Lutris runtime fallback), looks up each game's `GAMEID` via the `umu.openwinecomponents.org` API, and passes it as `GAMEID` env var so umu-launcher can apply game-specific Proton fixes. The umu path is togglable per-game.

## Frontend Conventions

- **Components** live in `src/frontend/components/UI/`, each in its own folder with `index.tsx` + `index.css`/`index.scss`. Re-exported via barrel file.
- **Screens** in `src/frontend/screens/` (Library, Game, Settings, Login, etc.)
- **State**: Legacy `GlobalState.tsx` (React Context class component) coexists with newer **Zustand** slices in `GlobalStateV2.ts`. Prefer Zustand for new state.
- **Styling**: Plain CSS/SCSS imports (no CSS Modules). Use the spacing system (`--space-*`) and text scale variables from the design system (see `doc/frontend_design_system.md`).
- **Path aliases**: Import as `'backend/...'`, `'frontend/...'`, `'common/...'` — never use deep relative paths across layers.

## Logging

Use the logger from `backend/logger`:

````ts
import { logInfo, logWarning, logError, LogPrefix } from 'backend/logger'

First arg is a string or array; second is a `LogPrefix` for categorization.

## Development Workflow

```bash
git clone <repo>
pnpm install
pnpm download-helper-binaries
pnpm start                             # dev mode with HMR
````

- **Type-check**: `pnpm codecheck` (runs `tsc --noEmit`)
- **Lint**: `pnpm lint`
- **Unit tests**: `pnpm test` (Jest, ts-jest). Tests live in `__tests__/` folders alongside source.
- **E2E tests**: `pnpm test:e2e` (Playwright). Tests in `e2e/`.
- **Build**: `pnpm dist:linux`, `pnpm dist:win`, `pnpm dist:mac`

## Testing Notes

- Backend tests use `jest.clearAllMocks()` in `beforeEach`.
- Currently only backend unit tests are configured in Jest (`projects: ['<rootDir>/src/backend']`); there are no frontend unit tests or `src/frontend/__mocks__/electron.js` in this codebase. If you later add frontend tests, ensure `window.api` calls and any `ipcRenderer.invoke` channels are properly mocked so tests do not hang on unresolved promises.
- Prefer small, reusable test helper functions or fixture factories for common setup/teardown logic.
- E2E tests use `CI=e2e` env to enable test-only IPC stubs (`addTestOnlyListener`).

## Key Conventions

- **Runner type**: `'legendary' | 'gog' | 'nile' | 'sideload' | 'zoom'` — always use this union, never hardcode store-specific logic without the manager maps.
- **Persistence**: `electron-store` with typed wrappers (`TypeCheckedStoreBackend`/`TypeCheckedStoreFrontend`). Store schema is the `StoreStructure` interface in `src/common/types/electron_store.ts`; `src/backend/schemas.ts` only contains the Zod schema for validating file paths.
- **i18n**: `i18next` — backend uses `i18next-fs-backend`, frontend uses `i18next-http-backend`. 50+ locales in `public/locales/`.
- **No direct Electron imports in frontend** — everything goes through `window.api` (enforced by ESLint `no-restricted-imports`).
