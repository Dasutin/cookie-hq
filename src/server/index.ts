import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app';
import { getConfig } from './config';

const config = getConfig();
const app = createApp({ config });
const clientDist = path.resolve(process.cwd(), 'dist/client');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`Cookie HQ listening on port ${config.port}`);
});
