import type { IncomingMessage, ServerResponse } from 'http';
import { app } from '../server';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL SERVERLESS FUNCTION ERROR]', err?.message || err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'An unexpected server error occurred',
      details: err?.message || String(err)
    }));
  }
}
