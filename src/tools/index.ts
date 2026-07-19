import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerListCacheTool } from './list-cache.js';
import { registerClearCacheTool } from './clear-cache.js';
import { registerHealthCheckTool } from './health-check.js';
import { registerGetFigmaNodeTool } from './get-figma-node.js';

import type { CacheService } from '../cache/cache.service.js';
import type { FigmaContextService } from '../figma/context.service.js';

export interface ToolDependencies {
    figmaContextService: FigmaContextService;
    figmaNodeCache: CacheService;
}

export function registerTools(
    server: McpServer,
    dependencies: ToolDependencies,
): void {
    registerHealthCheckTool(server);

    registerGetFigmaNodeTool(
        server,
        dependencies.figmaContextService,
    );

    registerListCacheTool(
        server,
        dependencies.figmaNodeCache,
    );

    registerClearCacheTool(
        server,
        dependencies.figmaNodeCache,
    );
}