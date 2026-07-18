import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

import { FigmaApiError } from "../figma/erros.js";
import type { FigmaClient } from '../figma/client.js';

export function registerGetFigmaNodeTool(
    server: McpServer,
    figmaClient: FigmaClient,
): void {
    server.registerTool(
        'get_figma_node',
        {
            title: 'Get Figma node',
            description:
                'Busca um nó específico de um arquivo do Figma e retorna sua estrutura JSON.',
            inputSchema: z.object({
                fileKey: z
                    .string()
                    .min(1)
                    .describe('Chave do arquivo extraída da URL do Figma.'),

                nodeId: z
                    .string()
                    .min(1)
                    .describe(
                        'Identificador do nó. Aceita os formatos 4510:5941 e 4510-5941.',
                    ),

                depth: z
                    .number()
                    .int()
                    .min(1)
                    .max(20)
                    .optional()
                    .describe(
                        'Profundidade máxima de filhos retornados. Quando omitida, retorna toda a subárvore.',
                    ),
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
            },
        },
        async ({ fileKey, nodeId, depth }) => {
            try {
                const response = await figmaClient.getNode(fileKey, nodeId, {
                    depth,
                });

                const normalizedNodeId = nodeId.replaceAll('-', ':');
                const nodeEntry = response.nodes[normalizedNodeId];

                if (!nodeEntry?.document) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `O Figma respondeu, mas não retornou o nó ${normalizedNodeId}.`,
                            },
                        ],
                        isError: true,
                    };
                }

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    file: {
                                        name: response.name,
                                        version: response.version,
                                        lastModified: response.lastModified,
                                    },
                                    node: nodeEntry.document,
                                    components: nodeEntry.components ?? {},
                                    componentSets: nodeEntry.componentSets ?? {},
                                    styles: nodeEntry.styles ?? {},
                                },
                                null,
                                2,
                            ),
                        },
                    ],
                };
            } catch (error: unknown) {
                return createToolError(error);
            }
        },
    );
}

function createToolError(error: unknown) {
    if (error instanceof FigmaApiError) {
        return {
            content: [
                {
                    type: 'text' as const,
                    text: [
                        error.message,
                        `Status HTTP: ${error.status}`,
                        error.responseBody
                            ? `Detalhes: ${error.responseBody}`
                            : undefined,
                    ]
                        .filter(Boolean)
                        .join('\n'),
                },
            ],
            isError: true,
        };
    }

    const message =
        error instanceof Error
            ? error.message
            : 'Ocorreu um erro desconhecido ao consultar o Figma.';

    return {
        content: [
            {
                type: 'text' as const,
                text: message,
            },
        ],
        isError: true,
    };
}
