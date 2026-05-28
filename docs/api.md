# Cookie HQ API

Base URL in production: `http://localhost:4435/api`.

## Health

`GET /api/health`

Returns:

```json
{ "ok": true, "name": "Cookie HQ" }
```

## Cutters

`GET /api/cutters?archived=false`

Lists active requests.

`GET /api/cutters?archived=true`

Lists archived requests.

`POST /api/cutters`

Multipart form fields:
- `name`: required string.
- `maxSizeInches`: required positive number.
- `sizeAxis`: `width` or `height`.
- `mirrorImage`: boolean-like string.
- `dueDate`: required `YYYY-MM-DD`, today or later.
- `image`: required image upload.

`PATCH /api/cutters/:id`

JSON body can update:
- `name`
- `maxSizeInches`
- `sizeAxis`
- `mirrorImage`
- `dueDate`
- `archived`

`POST /api/cutters/:id/unarchive`

JSON body:

```json
{ "dueDate": "2026-06-01" }
```

The due date is required and must be today or later.

`DELETE /api/cutters/:id`

Permanently deletes an archived request and its stored files. Active requests return `409`; archive first before deleting.

## Files

`POST /api/cutters/:id/files/fusion`

Multipart field:
- `file`: `.f3d` or `.f3z`

`POST /api/cutters/:id/files/print`

Multipart field:
- `file`: `.stl` or `.3mf`

For `.3mf`, the server extracts `Metadata/thumbnail.png` when available.

`GET /api/cutters/:id/files/png`

Downloads the processed request PNG.

`GET /api/cutters/:id/files/modelPreview?inline=true`

Returns the extracted 3MF thumbnail inline when available.

`GET /api/cutters/:id/files/fusion`

Downloads the Fusion file.

`GET /api/cutters/:id/files/print`

Downloads the print file.
