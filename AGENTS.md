# Repository Guidelines

## Project Overview

Cookie HQ is a household request tracker for cookie cutters. It lets a requester add an image, size, mirror preference, and due date; then the maker can download the processed image and attach Fusion 360 plus print files.

The app is intentionally simple:
- No authentication.
- Two item states only: active requests and archived items.
- SQLite stores metadata.
- Uploaded/generated files live on disk under `DATA_DIR`.
- Docker is the expected production install path.

## Stack And Layout

- Frontend: Vite, React, TypeScript, Mantine UI.
- Backend: Node 24, Express, TypeScript.
- Database: Node built-in `node:sqlite`.
- Image processing: `sharp`.
- 3MF thumbnail extraction: `adm-zip`.
- Tests: Vitest, Supertest, Testing Library.

Important paths:
- `src/client/`: React app and UI behavior.
- `src/server/`: Express API, database access, uploads, image processing.
- `src/shared/`: shared types and small cross-cutting helpers.
- `docs/`: project documentation.
- `data/`: local runtime data, ignored by Git.
- `dist/`: build output, ignored by Git.

## Commands

Use these from the repo root:

```powershell
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
docker compose up --build
```

The default production port is `4435`. Vite dev server runs on `5173` and proxies API calls to `http://localhost:4435`.

## Implementation Notes

- Keep UI changes mobile responsive. Desktop uses a table; mobile uses cards.
- Follow the system color scheme only. Do not add a manual light/dark toggle.
- Keep the request image required.
- Due dates must be today or later.
- Preserve the two-list model: `Requests` and `Archived`. Do not add production statuses.
- Request images are saved as PNG-ready files. Existing PNGs are copied directly unless mirroring is enabled; non-PNG images are converted with `sharp`.
- If a `.3mf` print file includes `Metadata/thumbnail.png`, extract it and prefer it as the table/card thumbnail. Fall back to the processed request PNG otherwise.
- If a `.stl` replaces a `.3mf`, clear any stale 3MF model preview.

## Git And Generated Files

Do not commit:
- `node_modules/`
- `dist/`
- `data/`
- coverage output
- local `.env` files

Before handing off changes, run at least:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

For Docker-facing changes, also run:

```powershell
docker build -t cookie-hq:local .
docker compose config
```
