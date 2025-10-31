## Purpose
Short, actionable guidance to help AI coding agents be productive in this repository.

## Big picture (what to know first)
- This repo contains a React Native Expo mobile app at the project root (App.js, `package.json`).
- A separate provider platform lives in `heartlink-provider-platform/` with two main subprojects:
  - `backend/` — Node/Express provider API (ESM modules, see `heartlink-provider-platform/backend/src`).
  - `frontend/` — a React + Vite frontend scaffold under `heartlink-provider-platform/frontend`.
- Data/storage: Firestore (firebase-admin in backend). Security rules and unit tests are present (`firebase.rules.test.json`, `rules.test.js`).

## Key developer workflows & commands
- Mobile (root):
  - Start dev server: `npm run start` (runs `expo start`).
  - Run on Android: `npm run android`. iOS: `npm run ios`.
- Firebase emulators (root): `npm run emulators` (runs `firebase emulators:start --only firestore`).
- Provider backend (server):
  - Install and run from `heartlink-provider-platform/backend`.
  - Start (emulator mode): `npm run start:emu` — sets `FIREBASE_MODE=emulator` before boot.
  - Start (prod): `npm run start:prod` — requires `FIREBASE_SERVICE_ACCOUNT_PATH` and correct `.env` values.
- Rules test: run the root `npm run test:rules` which executes `rules.test.js` using `@firebase/rules-unit-testing`.

## Project-specific code patterns & conventions
- Modules use ESM (package.json contains `type: "module"`) — use `import` / `export` not `require`.
- Backend structure (follow this pattern when adding features):
  - `heartlink-provider-platform/backend/src/app.js` — central Express app; routes are mounted here.
  - `heartlink-provider-platform/backend/src/routes/*.js` — define routers and route paths.
  - `heartlink-provider-platform/backend/src/controllers/*.js` — business logic for routes.
  - `heartlink-provider-platform/backend/src/middleware` — e.g. `authMiddleware.js` provides `verifyToken` (uses JWT and reads `process.env.JWT_SECRET`).
  - `heartlink-provider-platform/backend/src/config/db.js` — initializes Firestore. Respect `FIREBASE_MODE` (`emulator` vs `prod`).

Example: to add a new protected endpoint
1. Add controller `backend/src/controllers/myController.js` exporting handler functions.
2. Add route `backend/src/routes/myRoutes.js` exporting an Express Router and mounting handlers.
3. Wire it in `backend/src/app.js`: `import myRoutes from './routes/myRoutes.js'; app.use('/api/my', myRoutes);`

## Integration points & environment
- Firestore: backend reads `FIREBASE_MODE` and (for prod) `FIREBASE_SERVICE_ACCOUNT_PATH`. By default use emulator mode for development.
- Authentication: JWTs are used (`jsonwebtoken`) and verified in `src/middleware/authMiddleware.js`.
- Root-level files of interest: `firebase.json`, `firebase.rules.test.json`, `rules.test.js`.

## Common pitfalls to check for
- Watch relative import paths inside `backend/src` — code uses relative imports (e.g., `./controllers/authController.js`). Avoid accidental absolute/duplicated prefixes.
- Ensure `.env` (or `.env.example`) values are set before running `start:prod` (especially `FIREBASE_SERVICE_ACCOUNT_PATH` and `JWT_SECRET`).
- Routes follow the Router -> controllers pattern; returning consistent JSON error shapes (see existing `authMiddleware` examples).

## Where to look for examples
- Route wiring: `heartlink-provider-platform/backend/src/app.js`.
- Auth middleware: `heartlink-provider-platform/backend/src/middleware/authMiddleware.js`.
- Firestore bootstrap: `heartlink-provider-platform/backend/src/config/db.js`.
- Mobile entry: `App.js` and root `package.json` (Expo scripts).

## How to use these instructions
- Prefer small, incremental edits that follow the established patterns: add controller -> route -> mount.
- When changing integration/config, make sure emulator vs prod paths and env variables are respected.

If anything here is unclear or you'd like more detail in a specific area (examples for controllers, tests, or CI), tell me which area and I'll expand or adjust the file.
