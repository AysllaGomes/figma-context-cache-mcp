import {
    mkdtemp,
    rm,
} from 'node:fs/promises';

import os from 'node:os';
import path from 'node:path';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { CacheService } from '../../src/cache/cache.service.js';
import { FigmaClient } from '../../src/figma/client.js';
import { FigmaContextService } from '../../src/figma/context.service.js';

import type { AppConfig } from '../../src/config/env.js';
import type { FigmaNodesResponse } from '../../src/figma/types.js';

describe('FigmaContextService', () => {
    let storagePath: string;
    let cacheService: CacheService;
    let figmaClient: FigmaClient;
    let figmaContextService: FigmaContextService;

    beforeEach(async () => {
        storagePath = await mkdtemp(
            path.join(
                os.tmpdir(),
                'figma-context-service-',
            ),
        );

        cacheService = new CacheService({
            storagePath,
            namespace: 'figma/nodes',
            ttlSeconds: 60,
        });

        figmaClient = new FigmaClient(
            createAppConfig(),
        );

        figmaContextService =
            new FigmaContextService(
                figmaClient,
                cacheService,
            );
    });

    afterEach(async () => {
        vi.restoreAllMocks();

        await rm(storagePath, {
            recursive: true,
            force: true,
        });
    });

    it('fetches the node from Figma when the cache is empty', async () => {
        const response =
            createFigmaResponse({
                nodeName: 'Relatórios gerenciais',
            });

        const getNodeSpy = vi
            .spyOn(figmaClient, 'getNode')
            .mockResolvedValue(response);

        const result =
            await figmaContextService.getNode(
                'file-key',
                '4510-5941',
                {
                    depth: 1,
                },
            );

        expect(result.source).toBe('figma');
        expect(result.response).toEqual(response);
        expect(result.cacheEntry.data).toEqual(
            response,
        );

        expect(getNodeSpy).toHaveBeenCalledOnce();

        expect(getNodeSpy).toHaveBeenCalledWith(
            'file-key',
            '4510:5941',
            {
                depth: 1,
            },
        );
    });

    it('returns a cached node without calling Figma again', async () => {
        const response =
            createFigmaResponse({
                nodeName: 'Cached node',
            });

        const getNodeSpy = vi
            .spyOn(figmaClient, 'getNode')
            .mockResolvedValue(response);

        const firstResult =
            await figmaContextService.getNode(
                'file-key',
                '4510:5941',
                {
                    depth: 1,
                },
            );

        const secondResult =
            await figmaContextService.getNode(
                'file-key',
                '4510:5941',
                {
                    depth: 1,
                },
            );

        expect(firstResult.source).toBe('figma');
        expect(secondResult.source).toBe('cache');

        expect(secondResult.response).toEqual(
            response,
        );

        expect(getNodeSpy).toHaveBeenCalledTimes(1);
    });

    it('normalizes the file key and node id before requesting Figma', async () => {
        const getNodeSpy = vi
            .spyOn(figmaClient, 'getNode')
            .mockResolvedValue(
                createFigmaResponse(),
            );

        await figmaContextService.getNode(
            '  file-key  ',
            '  4510-5941  ',
            {
                depth: 2,
            },
        );

        expect(getNodeSpy).toHaveBeenCalledWith(
            'file-key',
            '4510:5941',
            {
                depth: 2,
            },
        );
    });

    it('creates different cache entries for different depths', async () => {
        const getNodeSpy = vi
            .spyOn(figmaClient, 'getNode')
            .mockResolvedValue(
                createFigmaResponse(),
            );

        const depthOneResult =
            await figmaContextService.getNode(
                'file-key',
                '4510:5941',
                {
                    depth: 1,
                },
            );

        const depthTwoResult =
            await figmaContextService.getNode(
                'file-key',
                '4510:5941',
                {
                    depth: 2,
                },
            );

        expect(
            depthOneResult.cacheEntry.key,
        ).toBe(
            'node__file-key__4510:5941__depth-1',
        );

        expect(
            depthTwoResult.cacheEntry.key,
        ).toBe(
            'node__file-key__4510:5941__depth-2',
        );

        expect(getNodeSpy).toHaveBeenCalledTimes(2);
    });

    it('uses depth-all in the cache key when depth is not provided', async () => {
        vi.spyOn(
            figmaClient,
            'getNode',
        ).mockResolvedValue(
            createFigmaResponse(),
        );

        const result =
            await figmaContextService.getNode(
                'file-key',
                '4510:5941',
            );

        expect(result.cacheEntry.key).toBe(
            'node__file-key__4510:5941__depth-all',
        );
    });

    it('ignores a valid cache entry when forceRefresh is true', async () => {
        const cachedResponse =
            createFigmaResponse({
                version: '1',
                nodeName: 'Old node',
            });

        const refreshedResponse =
            createFigmaResponse({
                version: '2',
                nodeName: 'Updated node',
            });

        const getNodeSpy = vi
            .spyOn(figmaClient, 'getNode')
            .mockResolvedValueOnce(
                cachedResponse,
            )
            .mockResolvedValueOnce(
                refreshedResponse,
            );

        await figmaContextService.getNode(
            'file-key',
            '4510:5941',
            {
                depth: 1,
            },
        );

        const result =
            await figmaContextService.getNode(
                'file-key',
                '4510:5941',
                {
                    depth: 1,
                    forceRefresh: true,
                },
            );

        expect(result.source).toBe('figma');
        expect(result.response).toEqual(
            refreshedResponse,
        );

        expect(result.response.version).toBe('2');

        expect(
            result.response.nodes['4510:5941']
                ?.document?.name,
        ).toBe('Updated node');

        expect(getNodeSpy).toHaveBeenCalledTimes(2);
    });

    it('syncNode always fetches a fresh response from Figma', async () => {
        const firstResponse =
            createFigmaResponse({
                version: '1',
                nodeName: 'Initial node',
            });

        const synchronizedResponse =
            createFigmaResponse({
                version: '2',
                nodeName: 'Synchronized node',
            });

        const getNodeSpy = vi
            .spyOn(figmaClient, 'getNode')
            .mockResolvedValueOnce(
                firstResponse,
            )
            .mockResolvedValueOnce(
                synchronizedResponse,
            );

        await figmaContextService.getNode(
            'file-key',
            '4510:5941',
            {
                depth: 1,
            },
        );

        const result =
            await figmaContextService.syncNode(
                'file-key',
                '4510-5941',
                {
                    depth: 1,
                },
            );

        expect(result.source).toBe('figma');
        expect(result.response).toEqual(
            synchronizedResponse,
        );

        expect(
            result.response.nodes['4510:5941']
                ?.document?.name,
        ).toBe('Synchronized node');

        expect(getNodeSpy).toHaveBeenCalledTimes(2);

        expect(getNodeSpy).toHaveBeenLastCalledWith(
            'file-key',
            '4510:5941',
            {
                depth: 1,
            },
        );
    });

    it('stores the synchronized response for subsequent reads', async () => {
        const initialResponse =
            createFigmaResponse({
                version: '1',
                nodeName: 'Initial node',
            });

        const synchronizedResponse =
            createFigmaResponse({
                version: '2',
                nodeName: 'Synchronized node',
            });

        const getNodeSpy = vi
            .spyOn(figmaClient, 'getNode')
            .mockResolvedValueOnce(
                initialResponse,
            )
            .mockResolvedValueOnce(
                synchronizedResponse,
            );

        await figmaContextService.getNode(
            'file-key',
            '4510:5941',
            {
                depth: 1,
            },
        );

        await figmaContextService.syncNode(
            'file-key',
            '4510:5941',
            {
                depth: 1,
            },
        );

        const cachedResult =
            await figmaContextService.getNode(
                'file-key',
                '4510:5941',
                {
                    depth: 1,
                },
            );

        expect(cachedResult.source).toBe(
            'cache',
        );

        expect(cachedResult.response).toEqual(
            synchronizedResponse,
        );

        expect(
            cachedResult.response.nodes[
                '4510:5941'
                ]?.document?.name,
        ).toBe('Synchronized node');

        expect(getNodeSpy).toHaveBeenCalledTimes(2);
    });
});

function createAppConfig(): AppConfig {
    return {
        figmaApiKey: 'test-figma-token',
        figmaApiBaseUrl:
            'https://api.figma.com/v1',
        storagePath: 'unused-in-this-test',
        cacheTtlSeconds: 60,
    };
}

interface CreateFigmaResponseOptions {
    version?: string;
    nodeName?: string;
}

function createFigmaResponse(
    options: CreateFigmaResponseOptions = {},
): FigmaNodesResponse {
    const {
        version = '1',
        nodeName = 'Relatórios gerenciais',
    } = options;

    return {
        name: 'Arquivo de testes',
        lastModified:
            '2026-07-19T12:00:00.000Z',
        version,
        nodes: {
            '4510:5941': {
                document: {
                    id: '4510:5941',
                    name: nodeName,
                    type: 'CANVAS',
                },
                components: {},
                componentSets: {},
                schemaVersion: 0,
                styles: {},
            },
        },
    };
}
