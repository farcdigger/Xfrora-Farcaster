import 'dotenv/config';
import { app } from './lib/agent';

// Debug: Check if .env is loaded
console.log('[Index] Checking environment variables...');
console.log('[Index] THE_GRAPH_API_KEY:', process.env.THE_GRAPH_API_KEY ? process.env.THE_GRAPH_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');
console.log('[Index] AGENT_NAME:', process.env.AGENT_NAME || 'NOT FOUND');

// Port priority: PORT > YAMA_AGENT_PORT > default 3001
const port = process.env.PORT 
  ? parseInt(process.env.PORT) 
  : (process.env.YAMA_AGENT_PORT 
    ? parseInt(process.env.YAMA_AGENT_PORT) 
    : 3001);

console.log(`🚀 Starting YAMA Agent server on port ${port}...`);
console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔑 Agent Name: ${process.env.AGENT_NAME || 'yama-agent'}`);

// Wrap fetch to log all requests
const originalFetch = app.fetch;
const wrappedFetch = async (request: Request) => {
  const url = new URL(request.url);
  console.log(`[Route] ${request.method} ${url.pathname}${url.search}`);
  
  const response = await originalFetch(request);
  
  if (response.status === 404) {
    console.log(`[Route] ❌ 404 for ${request.method} ${url.pathname}`);
    console.log(`[Route] Available routes might be different. Check /entrypoints for list.`);
  } else {
    console.log(`[Route] ✅ ${response.status} for ${request.method} ${url.pathname}`);
  }
  
  return response;
};

// Bun server export with increased timeout for long-running operations
export default {
  port,
  fetch: wrappedFetch,
  idleTimeout: 120, // 2 minutes timeout for long operations
};
