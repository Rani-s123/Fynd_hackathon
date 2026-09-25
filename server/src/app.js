import express from 'express';
import cors from 'cors';
import { createRouter } from './routes.js';

export function createApp(db) {
  const app = express();
  app.use(cors());
  // Photo evidence is sent as a base64 data URL from the frontend; allow a
  // reasonably generous body size (the frontend already caps uploads at 5MB).
  app.use(express.json({ limit: '8mb' }));

  // Lightweight request log -- method, path, status, duration. Cheap to add,
  // useful during a live demo/judging walkthrough to show what's happening.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  app.use('/api', createRouter(db));
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Unknown routes get a clean 404 JSON body instead of Express's default HTML page.
  app.use((req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` });
  });

  // Basic error handler so a thrown exception returns JSON, not an HTML stack trace.
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' });
  });

  return app;
}
