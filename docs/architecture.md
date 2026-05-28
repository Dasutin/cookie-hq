# Cookie HQ Architecture

## Overview

Cookie HQ is a single-container web app with a React frontend served by an Express backend. The backend owns uploads, image processing, SQLite metadata, and static asset serving in production.

## Runtime Components

- React client: Mantine UI, responsive table/card views, modals for create/edit/unarchive/delete.
- Express API: request CRUD, archive/unarchive/delete, file upload/download, static client hosting.
- SQLite database: one `cutters` table containing request metadata and file metadata.
- File storage: generated PNGs, uploaded Fusion files, print files, and extracted model previews under `DATA_DIR/uploads`.

## Data Model

Each cutter has:
- Name.
- Max size in inches.
- Size axis: `width` or `height`.
- Mirror image flag.
- Due date.
- Archived boolean.
- Processed request PNG metadata.
- Optional Fusion file metadata.
- Optional print file metadata.
- Optional 3MF model preview metadata.

There is no status field. Items are active requests when `archived=false` and archived items when `archived=true`.

Archived items can be permanently deleted from the Archived view. Delete removes the SQLite row and attempts to remove the generated/uploaded files from storage.

## Image And Model Preview Flow

Request image upload:
- PNG without mirroring is stored as-is.
- PNG with mirroring is processed and saved as PNG.
- Non-PNG images are converted to PNG.

Print file upload:
- `.stl` and `.3mf` are accepted.
- `.3mf` files are inspected for `Metadata/thumbnail.png`.
- If the embedded thumbnail exists, it is extracted and stored as `modelPreviewFile`.
- If no model preview exists, or if a later `.stl` replaces the print file, the UI falls back to the request PNG.

## Production Serving

The Docker image builds the React client into `dist/client` and the server into `dist/server`. The Express app serves `dist/client` and listens on port `4435` by default.
