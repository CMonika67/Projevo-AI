import type { IncomingMessage, ServerResponse } from 'http';

process.env.VERCEL = process.env.VERCEL || '1';
let appInstance: any = null;
let initError: any = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (initError) throw initError;

  try {
    let mod: any = null;
    try {
      mod = await import('../server.js');
    } catch {
      try {
        mod = await import('../server.ts');
      } catch {
        mod = await import('../server');
      }
    }
    appInstance = mod.app || mod.default;
    return appInstance;
  } catch (err: any) {
    initError = {
      message: err?.message || String(err),
      stack: err?.stack,
      code: err?.code
    };
    throw initError;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[SERVERLESS INIT ERROR]', err?.message || err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'An unexpected server error occurred'
    }));
  }
}
