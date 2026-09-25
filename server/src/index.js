import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { createDb } from './db.js';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'defect.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = createDb(DB_PATH);
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Defect Detector API listening on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
