import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { FigmaClient } from '../figma/client.js';
import { registerGetFigmaNodeTool } from './get-figma-node.js';
import { registerHealthCheckTool } from './health-check.js';

export interface ToolDependencies {
    figmaClient: FigmaClient;
}

export function registerTools(
    server: McpServer,
    dependencies: ToolDependencies,
): void {
    registerHealthCheckTool(server);
    registerGetFigmaNodeTool(server, dependencies.figmaClient);
}