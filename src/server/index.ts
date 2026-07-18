import 'dotenv/config';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from '../config/env.js';

import { FigmaClient } from '../figma/client.js';

import { registerTools } from '../tools/index.js';

import { CacheService } from '../cache/cache.service.js';
import { FigmaContextService } from '../figma/context.service.js';

const config = loadConfig();

const figmaClient = new FigmaClient(config);

const figmaNodeCache = new CacheService({
    storagePath: config.storagePath,
    namespace: 'figma/nodes',
    ttlSeconds: config.cacheTtlSeconds,
});

const figmaContextService =
    new FigmaContextService(
        figmaClient,
        figmaNodeCache,
    );

const server = new McpServer({
    name: 'figma-context-cache-mcp',
    version: '0.1.0',
});

registerTools(server, {
    figmaContextService,
});

async function main(): Promise<void> {
    const transport =
        new StdioServerTransport();

    await server.connect(transport);
}

main().catch((error: unknown) => {
    console.error(
        'Erro ao iniciar o servidor MCP:',
        error,
    );

    process.exit(1);
});
