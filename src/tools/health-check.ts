import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

export function registerHealthCheckTool(server: McpServer): void {
    server.registerTool(
        'health_check',
        {
            title: 'Health check',
            description: 'Verifica se o servidor MCP está em execução.',
            inputSchema: z.object({
                message: z
                    .string()
                    .optional()
                    .describe('Mensagem opcional para ser devolvida pelo servidor.'),
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
            },
        },
        async ({ message }) => ({
            content: [
                {
                    type: 'text',
                    text: message
                        ? `Servidor funcionando. Mensagem recebida: ${message}`
                        : 'Servidor figma-context-cache-mcp funcionando.',
                },
            ],
        }),
    );
}