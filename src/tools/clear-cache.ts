import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

import type { CacheService } from '../cache/cache.service.js';

const clearCacheInputSchema = z
    .object({
        mode: z
            .enum([
                'all',
                'expired',
                'corrupted',
                'key',
            ])
            .describe(
                [
                    'Define quais entradas serão removidas.',
                    '"all" remove todas;',
                    '"expired" remove somente expiradas;',
                    '"corrupted" remove arquivos inválidos;',
                    '"key" remove uma chave específica.',
                ].join(' '),
            ),

        key: z
            .string()
            .min(1)
            .optional()
            .describe(
                'Chave da entrada. Obrigatória quando mode for "key".',
            ),
    })
    .superRefine((value, context) => {
        if (
            value.mode === 'key' &&
            !value.key?.trim()
        ) {
            context.addIssue({
                code: 'custom',
                path: ['key'],
                message:
                    'A chave é obrigatória quando mode é "key".',
            });
        }
    });

export function registerClearCacheTool(
    server: McpServer,
    cacheService: CacheService,
): void {
    server.registerTool(
        'clear_figma_cache',
        {
            title: 'Clear Figma cache',

            description:
                'Remove entradas do cache local do Figma por status, chave específica ou integralmente.',

            inputSchema: clearCacheInputSchema,

            annotations: {
                readOnlyHint: false,
                destructiveHint: true,
                idempotentHint: true,
            },
        },

        async ({ mode, key }) => {
            try {
                const result =
                    await cacheService.clear({
                        mode,
                        key,
                    });

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    message:
                                        createResultMessage(
                                            result.removed,
                                            mode,
                                        ),

                                    ...result,
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
                        : 'Erro desconhecido ao limpar o cache.';

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Não foi possível limpar o cache: ${message}`,
                        },
                    ],
                    isError: true,
                };
            }
        },
    );
}

function createResultMessage(
    removed: number,
    mode: string,
): string {
    if (removed === 0) {
        return `Nenhuma entrada correspondente ao modo "${mode}" foi encontrada.`;
    }

    if (removed === 1) {
        return 'Uma entrada foi removida do cache.';
    }

    return `${removed} entradas foram removidas do cache.`;
}
