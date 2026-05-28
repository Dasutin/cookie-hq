import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processCookieImage } from './images';

describe('processCookieImage', () => {
  it('stores an existing PNG without conversion when mirroring is disabled', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cookie-hq-images-'));
    const buffer = await sharp({
      create: {
        width: 2,
        height: 1,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    const result = await processCookieImage(
      { buffer, originalName: 'heart.png', mimeType: 'image/png' },
      dir,
      false
    );
    const output = await fs.readFile(path.join(dir, result.storedName));

    expect(result.converted).toBe(false);
    expect(output.equals(buffer)).toBe(true);
  });

  it('mirrors an existing PNG horizontally when requested', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cookie-hq-images-'));
    const buffer = await sharp(
      Buffer.from([
        255, 0, 0, 255,
        0, 0, 255, 255
      ]),
      {
        raw: {
          width: 2,
          height: 1,
          channels: 4
        }
      }
    )
      .png()
      .toBuffer();

    const result = await processCookieImage(
      { buffer, originalName: 'heart.png', mimeType: 'image/png' },
      dir,
      true
    );
    const mirrored = await sharp(path.join(dir, result.storedName)).raw().toBuffer();

    expect(result.converted).toBe(true);
    expect([...mirrored]).toEqual([
      0, 0, 255, 255,
      255, 0, 0, 255
    ]);
  });

  it('converts non-PNG images to PNG', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cookie-hq-images-'));
    const buffer = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 240, g: 180, b: 90 }
      }
    })
      .jpeg()
      .toBuffer();

    const result = await processCookieImage(
      { buffer, originalName: 'star.jpg', mimeType: 'image/jpeg' },
      dir,
      false
    );
    const metadata = await sharp(path.join(dir, result.storedName)).metadata();

    expect(result.converted).toBe(true);
    expect(metadata.format).toBe('png');
  });
});
