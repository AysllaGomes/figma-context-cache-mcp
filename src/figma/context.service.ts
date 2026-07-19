import type { CacheService } from '../cache/cache.service.js';
import type { CacheEntry } from '../cache/types.js';

import type {
    FigmaClient,
    GetNodeOptions,
} from './client.js';

import type { FigmaNodesResponse } from './types.js';

export interface GetFigmaNodeContextOptions
    extends GetNodeOptions {
    forceRefresh?: boolean;
}

export interface FigmaNodeContextResult {
    source: 'cache' | 'figma';
    cacheEntry: CacheEntry<FigmaNodesResponse>;
    response: FigmaNodesResponse;
}

export class FigmaContextService {
    constructor(
        private readonly figmaClient: FigmaClient,
        private readonly cacheService: CacheService,
    ) {}

    async getNode(
        fileKey: string,
        nodeId: string,
        options: GetFigmaNodeContextOptions = {},
    ): Promise<FigmaNodeContextResult> {
        const normalizedFileKey = fileKey.trim();
        const normalizedNodeId =
            normalizeNodeId(nodeId);

        const cacheKey = createNodeCacheKey(
            normalizedFileKey,
            normalizedNodeId,
            options.depth,
        );

        if (!options.forceRefresh) {
            const cachedResponse =
                await this.cacheService.get<FigmaNodesResponse>(
                    cacheKey,
                );

            if (
                cachedResponse.hit &&
                cachedResponse.entry
            ) {
                return {
                    source: 'cache',
                    cacheEntry: cachedResponse.entry,
                    response: cachedResponse.entry.data,
                };
            }
        }

        const response = await this.figmaClient.getNode(
            normalizedFileKey,
            normalizedNodeId,
            {
                depth: options.depth,
            },
        );

        const cacheEntry =
            await this.cacheService.set(
                cacheKey,
                response,
            );

        return {
            source: 'figma',
            cacheEntry,
            response,
        };
    }

    async syncNode(
        fileKey: string,
        nodeId: string,
        options: GetNodeOptions = {},
    ): Promise<FigmaNodeContextResult> {
        return this.getNode(
            fileKey,
            nodeId,
            {
                ...options,
                forceRefresh: true,
            },
        );
    }
}

function createNodeCacheKey(
    fileKey: string,
    nodeId: string,
    depth?: number,
): string {
    return [
        'node',
        fileKey,
        nodeId,
        `depth-${depth ?? 'all'}`,
    ].join('__');
}

function normalizeNodeId(nodeId: string): string {
    return nodeId
        .trim()
        .replaceAll('-', ':');
}
