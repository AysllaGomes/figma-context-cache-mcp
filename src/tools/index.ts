import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerHealthCheckTool } from './health-check.js';
import { registerGetFigmaNodeTool } from './get-figma-node.js';

import type { FigmaContextService } from '../figma/context.service.js';

export interface ToolDependencies {
    figmaContextService: FigmaContextService;
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
}
