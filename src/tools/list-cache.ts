import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

import type { CacheService } from '../cache/cache.service.js';

export function registerListCacheTool(
    server: McpServer,
    cacheService: CacheService,
): void {
    server.registerTool(
        'list_cached_figma_nodes',
        {
            title: 'List cached Figma nodes',

            description:
                'Lista os nós do Figma armazenados no cache local, incluindo validade, tamanho e data de expiração.',

            inputSchema: z.object({
                includeExpired: z
                    .boolean()
                    .optional()
                    .default(true)
                    .describe(
                        'Define se entradas expiradas devem aparecer no resultado.',
                    ),

                includeCorrupted: z
                    .boolean()
                    .optional()
                    .default(true)
                    .describe(
                        'Define se arquivos de cache corrompidos devem aparecer no resultado.',
                    ),
            }),

            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
            },
        },

        async ({
                   includeExpired,
                   includeCorrupted,
               }) => {
            try {
                const result =
                    await cacheService.list();

                const entries =
                    result.entries.filter((entry) => {
                        if (
                            !includeExpired &&
                            entry.status === 'expired'
                        ) {
                            return false;
                        }

                        return !(!includeCorrupted &&
                            entry.status === 'corrupted');
                    });

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    summary: {
                                        total:
                                        result.total,

                                        displayed:
                                        entries.length,

                                        valid:
                                        result.valid,

                                        expired:
                                        result.expired,

                                        corrupted:
                                        result.corrupted,

                                        sizeInBytes:
                                        result.sizeInBytes,
                                    },

                                    entries,
                                },
                                null,
                                2,
                            ),
                        },
                    ],
                };
            } catch (error: unknown) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Erro desconhecido ao listar o cache.';

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Não foi possível listar o cache: ${message}`,
                        },
                    ],
                    isError: true,
                };
            }
        },
    );
}
