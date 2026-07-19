import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

import type { FigmaContextService } from '../figma/context.service.js';
import { FigmaApiError } from '../figma/errors.js';

export function registerSyncFigmaNodeTool(
    server: McpServer,
    figmaContextService: FigmaContextService,
): void {
    server.registerTool(
        'sync_figma_node',
        {
            title: 'Sync Figma node',

            description:
                'Consulta novamente um nó na API do Figma e atualiza sua entrada no cache local.',

            inputSchema: z.object({
                fileKey: z
                    .string()
                    .min(1)
                    .describe(
                        'Chave do arquivo extraída da URL do Figma.',
                    ),

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
                        'Profundidade máxima dos filhos retornados.',
                    ),
            }),

            annotations: {
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
            },
        },

        async ({
                   fileKey,
                   nodeId,
                   depth,
               }) => {
            try {
                const result =
                    await figmaContextService.syncNode(
                        fileKey,
                        nodeId,
                        {
                            depth,
                        },
                    );

                const normalizedNodeId = nodeId
                    .trim()
                    .replaceAll('-', ':');

                const nodeEntry =
                    result.response.nodes[
                        normalizedNodeId
                        ];

                if (!nodeEntry?.document) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text:
                                    `O Figma respondeu, mas não retornou o nó ${normalizedNodeId}.`,
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
                                    message:
                                        'Nó do Figma sincronizado com sucesso.',

                                    metadata: {
                                        source:
                                        result.source,

                                        cacheUpdated: true,

                                        cacheKey:
                                        result.cacheEntry.key,

                                        syncedAt:
                                        result.cacheEntry.createdAt,

                                        expiresAt:
                                        result.cacheEntry.expiresAt,
                                    },

                                    file: {
                                        name:
                                        result.response.name,

                                        version:
                                        result.response.version,

                                        lastModified:
                                        result.response.lastModified,
                                    },

                                    node: {
                                        id:
                                        nodeEntry.document.id,

                                        name:
                                        nodeEntry.document.name,

                                        type:
                                        nodeEntry.document.type,
                                    },
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
            : 'Ocorreu um erro desconhecido ao sincronizar o nó do Figma.';

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
