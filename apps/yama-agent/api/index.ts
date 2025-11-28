import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import the agent app
let app: any;
try {
  const agentModule = require('../src/lib/agent');
  app = agentModule.app;
} catch (error) {
  console.error('[Vercel] Failed to load agent:', error);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Health check
  if (req.url === '/health') {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  if (!app) {
    return res.status(500).json({ 
      error: 'Agent not initialized',
      message: 'Failed to load agent module'
    });
  }

  try {
    // Build full URL
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const url = `${protocol}://${host}${req.url}`;

    console.log(`[Vercel] ${req.method} ${url}`);

    // Convert Vercel request to Web Request
    const headers: Record<string, string> = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) {
        headers[key] = Array.isArray(value) ? value[0] : value;
      }
    });

    const request = new Request(url, {
      method: req.method || 'GET',
      headers: new Headers(headers),
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? JSON.stringify(req.body)
        : undefined,
    });

    // Call the Hono app
    const response = await app.fetch(request);

    // Convert Response back to Vercel response
    const contentType = response.headers.get('content-type') || 'application/json';
    
    // Set status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Handle different content types
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return res.json(json);
    } else if (contentType.includes('text/')) {
      const text = await response.text();
      return res.send(text);
    } else {
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (error: any) {
    console.error('[Vercel] Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

