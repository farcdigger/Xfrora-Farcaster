import { introspectSubgraph } from '../src/lib/protocol-introspection';
import { SUBGRAPH_CONFIGS, type SubgraphConfig } from '../src/lib/subgraph-config';
import { GraphQLClient } from 'graphql-request';

const LEGACY_URLS = {
  gmx_arbitrum: 'https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats',
  lido_ethereum: 'https://api.thegraph.com/subgraphs/name/lidofinance/lido',
  rocketpool_ethereum: 'https://api.thegraph.com/subgraphs/name/rocket-pool/rocket-pool'
};

// Override the client creation for this script to use direct URLs
async function introspectUrl(name: string, url: string) {
  console.log(`\n📊 ${name} (Legacy URL: ${url})`);
  console.log('─'.repeat(50));

  const client = new GraphQLClient(url);
  try {
    const introspection = await client.request(`
      {
        __schema {
          queryType {
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }
    `);
    
    // @ts-ignore
    const fields = introspection.__schema.queryType.fields
      // @ts-ignore
      .map((f: any) => f.name)
      // @ts-ignore
      .filter((name: string) => !name.startsWith('__'));
    
    if (fields.length > 0) {
      console.log(`✅ Available top-level fields (${fields.length}):`);
      // @ts-ignore
      fields.slice(0, 30).forEach(field => console.log(`   - ${field}`));
    } else {
      console.log('❌ No fields returned.');
    }
  } catch (error: any) {
    console.error(`❌ Failed to introspect: ${error.message}`);
  }
}

async function checkNewProtocols() {
  console.log('🔍 Checking new protocols using Legacy Hosted Service URLs (for schema discovery)...\n');

  for (const [key, url] of Object.entries(LEGACY_URLS)) {
    await introspectUrl(key, url);
  }
}

checkNewProtocols().catch(console.error);
