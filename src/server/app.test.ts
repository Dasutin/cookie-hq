import AdmZip from 'adm-zip';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

function dateDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function create3mfWithThumbnail(thumbnail: Buffer): Buffer {
  const zip = new AdmZip();
  zip.addFile('3D/3dmodel.model', Buffer.from('<model unit="millimeter" xml:lang="en-US"></model>'));
  zip.addFile('Metadata/thumbnail.png', thumbnail);
  zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0" encoding="UTF-8"?>'));

  return zip.toBuffer();
}

describe('Cookie HQ API', () => {
  it('creates, archives, unarchives, uploads files, and downloads the processed PNG', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cookie-hq-api-'));
    const uploadDir = path.join(dataDir, 'uploads');
    const app = createApp({
      config: {
        dataDir,
        dbPath: path.join(dataDir, 'test.sqlite'),
        uploadDir
      }
    });
    const png = await sharp({
      create: {
        width: 3,
        height: 3,
        channels: 4,
        background: { r: 180, g: 60, b: 90, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    const created = await request(app)
      .post('/api/cutters')
      .field('name', 'Moon')
      .field('maxSizeInches', '4.5')
      .field('sizeAxis', 'width')
      .field('mirrorImage', 'false')
      .field('dueDate', dateDaysFromNow(14))
      .attach('image', png, {
        filename: 'moon.png',
        contentType: 'image/png'
      })
      .expect(201);

    const id = created.body.cutter.id as string;
    expect(created.body.cutter.archived).toBe(false);
    expect(created.body.cutter.mirrorImage).toBe(false);

    const requests = await request(app).get('/api/cutters?archived=false').expect(200);
    expect(requests.body.cutters).toHaveLength(1);

    await request(app).patch(`/api/cutters/${id}`).send({ archived: true }).expect(200);
    const archived = await request(app).get('/api/cutters?archived=true').expect(200);
    expect(archived.body.cutters).toHaveLength(1);

    await request(app).post(`/api/cutters/${id}/unarchive`).send({}).expect(400);
    const unarchived = await request(app)
      .post(`/api/cutters/${id}/unarchive`)
      .send({ dueDate: dateDaysFromNow(21) })
      .expect(200);
    expect(unarchived.body.cutter.archived).toBe(false);
    expect(unarchived.body.cutter.dueDate).toBe(dateDaysFromNow(21));

    await request(app)
      .post(`/api/cutters/${id}/files/fusion`)
      .attach('file', Buffer.from('fusion'), 'project.f3d')
      .expect(200);

    await request(app)
      .post(`/api/cutters/${id}/files/print`)
      .attach('file', Buffer.from('solid'), 'moon.stl')
      .expect(200);

    const modelUpload = await request(app)
      .post(`/api/cutters/${id}/files/print`)
      .attach('file', create3mfWithThumbnail(png), 'moon.3mf')
      .expect(200);
    expect(modelUpload.body.cutter.modelPreviewFile.mimeType).toBe('image/png');

    const modelPreview = await request(app).get(`/api/cutters/${id}/files/modelPreview?inline=true`).expect(200);
    expect(modelPreview.headers['content-disposition']).toContain('inline');
    expect(modelPreview.headers['content-type']).toContain('image/png');

    const stlUpload = await request(app)
      .post(`/api/cutters/${id}/files/print`)
      .attach('file', Buffer.from('solid'), 'moon.stl')
      .expect(200);
    expect(stlUpload.body.cutter.modelPreviewFile).toBeNull();

    await request(app)
      .post(`/api/cutters/${id}/files/print`)
      .attach('file', Buffer.from('bad'), 'moon.txt')
      .expect(400);

    const downloaded = await request(app).get(`/api/cutters/${id}/files/png`).expect(200);
    expect(downloaded.headers['content-disposition']).toContain('moon.png');
    expect(downloaded.body.length).toBeGreaterThan(0);

    const preview = await request(app).get(`/api/cutters/${id}/files/png?inline=true`).expect(200);
    expect(preview.headers['content-disposition']).toContain('inline');
    expect(preview.headers['content-type']).toContain('image/png');
  });

  it('converts non-PNG request images before storing them', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cookie-hq-api-'));
    const app = createApp({
      config: {
        dataDir,
        dbPath: path.join(dataDir, 'test.sqlite'),
        uploadDir: path.join(dataDir, 'uploads')
      }
    });
    const jpeg = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: { r: 40, g: 120, b: 220 }
      }
    })
      .jpeg()
      .toBuffer();

    const created = await request(app)
      .post('/api/cutters')
      .field('name', 'Cloud')
      .field('maxSizeInches', '3')
      .field('sizeAxis', 'height')
      .field('mirrorImage', 'true')
      .field('dueDate', dateDaysFromNow(30))
      .attach('image', jpeg, {
        filename: 'cloud.jpg',
        contentType: 'image/jpeg'
      })
      .expect(201);

    expect(created.body.cutter.pngFile.mimeType).toBe('image/png');
    expect(created.body.cutter.mirrorImage).toBe(true);
  });

  it('only permanently deletes archived cutters and removes their stored files', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cookie-hq-api-'));
    const uploadDir = path.join(dataDir, 'uploads');
    const app = createApp({
      config: {
        dataDir,
        dbPath: path.join(dataDir, 'test.sqlite'),
        uploadDir
      }
    });
    const png = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: { r: 120, g: 210, b: 160, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    const created = await request(app)
      .post('/api/cutters')
      .field('name', 'Star')
      .field('maxSizeInches', '3.5')
      .field('sizeAxis', 'width')
      .field('mirrorImage', 'false')
      .field('dueDate', dateDaysFromNow(8))
      .attach('image', png, {
        filename: 'star.png',
        contentType: 'image/png'
      })
      .expect(201);

    const id = created.body.cutter.id as string;
    const storedPng = created.body.cutter.pngFile.storedName as string;

    await request(app).delete(`/api/cutters/${id}`).expect(409);
    await request(app).patch(`/api/cutters/${id}`).send({ archived: true }).expect(200);
    await request(app).delete(`/api/cutters/${id}`).expect(204);

    const archived = await request(app).get('/api/cutters?archived=true').expect(200);
    expect(archived.body.cutters).toHaveLength(0);
    await request(app).get(`/api/cutters/${id}/files/png`).expect(404);
    await expect(fs.access(path.join(uploadDir, storedPng))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('requires a request image and rejects past due dates', async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cookie-hq-api-'));
    const app = createApp({
      config: {
        dataDir,
        dbPath: path.join(dataDir, 'test.sqlite'),
        uploadDir: path.join(dataDir, 'uploads')
      }
    });
    const png = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: { r: 90, g: 180, b: 80, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    await request(app)
      .post('/api/cutters')
      .field('name', 'No Image')
      .field('maxSizeInches', '3')
      .field('sizeAxis', 'width')
      .field('mirrorImage', 'false')
      .field('dueDate', dateDaysFromNow(7))
      .expect(400);

    await request(app)
      .post('/api/cutters')
      .field('name', 'Past Date')
      .field('maxSizeInches', '3')
      .field('sizeAxis', 'width')
      .field('mirrorImage', 'false')
      .field('dueDate', dateDaysFromNow(-1))
      .attach('image', png, {
        filename: 'past.png',
        contentType: 'image/png'
      })
      .expect(400);
  });
});
