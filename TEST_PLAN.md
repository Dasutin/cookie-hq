# Cookie HQ Test Plan

## Automated Checks

Run these before committing:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Request Flow

1. Open Cookie HQ.
2. Add a new request with name, max size, width/height choice, image, mirror option, and due date.
3. Confirm it appears in the `Requests` table.
4. Download the PNG and confirm the file opens.

## Image Handling

1. Upload a PNG without mirror and confirm the downloaded file remains a PNG.
2. Upload a PNG with mirror enabled and confirm it is mirrored left-to-right.
3. Upload a JPEG or WebP and confirm the downloaded file is PNG.

## Maker File Flow

1. Edit an active request.
2. Upload a `.f3d` or `.f3z` Fusion file.
3. Upload a `.stl` or `.3mf` print file.
4. Confirm both files can be downloaded from the table.
5. For `.3mf` uploads that include `Metadata/thumbnail.png`, confirm the table thumbnail switches from the request PNG to the embedded model preview.
6. Upload a `.stl` afterward and confirm the thumbnail falls back to the request PNG.
7. Confirm an unsupported print file extension is rejected.

## Archive Flow

1. Archive a request.
2. Confirm it leaves `Requests` and appears in `Archived`.
3. Unarchive it.
4. Confirm the app asks for a new due date before returning it to `Requests`.
5. Confirm existing PNG, Fusion, and print files are preserved.
6. Archive it again, click delete from `Archived`, and confirm a warning dialog appears.
7. Confirm delete removes it from `Archived` and the files can no longer be downloaded.

## Responsive And Theme Checks

1. Test desktop width and confirm the table layout is usable.
2. Test mobile width and confirm the stacked request cards are usable.
3. Switch the system/browser color scheme and confirm Cookie HQ follows it without an in-app toggle.

## Docker Checks

1. Run `docker compose up --build`.
2. Add a request and upload files.
3. Restart the container.
4. Confirm the request and files are still present.
