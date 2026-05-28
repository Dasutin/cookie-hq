# Cookie HQ

Cookie HQ is a small household webapp for tracking cookie cutter requests, preparing source PNGs for Fusion 360, and saving the Fusion and print files that go with each request.

## Stack

- Node + Express API
- Vite + React + Mantine UI
- SQLite metadata database
- Docker volume storage for uploads and generated PNGs
- Sharp image processing

## Local Development

```powershell
npm install
npm run dev
```

The Vite app runs on `http://localhost:5173` and proxies API requests to the server on `http://localhost:4435`.

## Docker

```powershell
docker compose up --build
```

The production app runs on `http://localhost:4435`. SQLite and uploaded/generated files are stored in the `cookie_hq_data` Docker volume.

## Scripts

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Data

Cookie HQ stores metadata in SQLite and files on disk under `DATA_DIR`, which defaults to `./data` locally and `/data` in Docker.

## Documentation

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Deployment](docs/deployment.md)
- [Test Plan](TEST_PLAN.md)
