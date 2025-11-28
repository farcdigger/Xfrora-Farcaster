import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/lib/agent';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Convert Vercel request to standard Request
    const url = `https://${req.headers.host}${req.url}`;
    const request = new Request(url, {
      method: req.method || 'GET',
      headers: new Headers(req.headers as Record<string, string>),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Call the Hono app
    const response = await app.fetch(request);

    // Convert Response to Vercel response
    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    res.status(response.status);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.send(body);
  } catch (error: any) {
    console.error('[Vercel Handler] Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

