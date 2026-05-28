import path from 'node:path';

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  uploadDir: string;
  port: number;
}

export function getConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const dataDir = overrides.dataDir ?? process.env.DATA_DIR ?? path.join(process.cwd(), 'data');

  return {
    dataDir,
    dbPath: overrides.dbPath ?? process.env.DB_PATH ?? path.join(dataDir, 'cookie-hq.sqlite'),
    uploadDir: overrides.uploadDir ?? process.env.UPLOAD_DIR ?? path.join(dataDir, 'uploads'),
    port: overrides.port ?? Number(process.env.PORT ?? 4435)
  };
}
