# Cookie HQ Deployment

## Docker Compose

Build and run:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:4435
```

## Published Image

The GitHub Actions workflow publishes the `main` branch image to GitHub Container Registry:

```text
ghcr.io/dasutin/cookie-hq:latest
```

Use port `4435` and persist `/data` for the SQLite database and uploaded/generated files.

## Data Persistence

`docker-compose.yml` mounts the `cookie_hq_data` volume at `/data`.

Inside that volume:
- SQLite database: `/data/cookie-hq.sqlite`
- Uploaded/generated files: `/data/uploads`

## Environment Variables

- `PORT`: server port. Defaults to `4435`.
- `DATA_DIR`: base data directory. Defaults to `/data` in Docker and `./data` locally.
- `DB_PATH`: optional explicit SQLite path.
- `UPLOAD_DIR`: optional explicit upload directory.

## Local Development

Install dependencies:

```powershell
npm install
```

Run both frontend and backend:

```powershell
npm run dev
```

The client runs on `http://localhost:5173` and proxies API requests to `http://localhost:4435`.

## Verification

Run before publishing or deploying:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
docker build -t cookie-hq:local .
docker compose config
```
