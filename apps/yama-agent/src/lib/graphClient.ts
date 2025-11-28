import { GraphQLClient } from 'graphql-request';
import type { SubgraphConfig } from './subgraph-config';
import { getSubgraphEndpoint } from './subgraph-config';

const DEFAULT_TIMEOUT_MS = 30_000;

export function getGraphClient(subgraphConfig: SubgraphConfig): GraphQLClient {
  const endpoint = getSubgraphEndpoint(subgraphConfig);
  const headers: Record<string, string> = {};

  if (process.env.THE_GRAPH_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.THE_GRAPH_API_KEY}`;
  }

  return new GraphQLClient(endpoint, {
    headers,
    fetch: (url, options) =>
      fetch(url, {
        ...options,
        signal: AbortSignal.timeout?.(DEFAULT_TIMEOUT_MS),
      }),
  });
}
