import {
    mkdtemp,
    mkdir,
    readFile,
    rm,
    writeFile,
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

describe('CacheService', () => {
    let storagePath: string;
    let cacheService: CacheService;

    beforeEach(async () => {
        storagePath = await mkdtemp(
            path.join(
                os.tmpdir(),
                'figma-context-cache-',
            ),
        );

        cacheService = new CacheService({
            storagePath,
            namespace: 'figma/nodes',
            ttlSeconds: 60,
        });
    });

    afterEach(async () => {
        vi.useRealTimers();

        await rm(storagePath, {
            recursive: true,
            force: true,
        });
    });

    it('returns a cache miss when the entry does not exist', async () => {
        const result =
            await cacheService.get('missing-entry');

        expect(result).toEqual({
            hit: false,
        });
    });

    it('stores and retrieves a valid entry', async () => {
        const data = {
            nodeId: '4510:5941',
            name: 'Relatórios gerenciais',
        };

        const storedEntry =
            await cacheService.set(
                'figma-node',
                data,
            );

        const result =
            await cacheService.get<typeof data>(
                'figma-node',
            );

        expect(result.hit).toBe(true);
        expect(result.entry).toEqual(storedEntry);
        expect(result.entry?.data).toEqual(data);
    });

    it('creates an expiration date based on the configured TTL', async () => {
        vi.useFakeTimers();

        vi.setSystemTime(
            new Date('2026-07-19T12:00:00.000Z'),
        );

        const entry =
            await cacheService.set(
                'figma-node',
                {
                    name: 'Button',
                },
            );

        expect(entry.createdAt).toBe(
            '2026-07-19T12:00:00.000Z',
        );

        expect(entry.expiresAt).toBe(
            '2026-07-19T12:01:00.000Z',
        );
    });

    it('removes an expired entry when it is accessed', async () => {
        vi.useFakeTimers();

        vi.setSystemTime(
            new Date('2026-07-19T12:00:00.000Z'),
        );

        await cacheService.set(
            'expired-node',
            {
                name: 'Old node',
            },
        );

        vi.setSystemTime(
            new Date('2026-07-19T12:01:01.000Z'),
        );

        const firstResult =
            await cacheService.get(
                'expired-node',
            );

        const secondResult =
            await cacheService.get(
                'expired-node',
            );

        expect(firstResult).toEqual({
            hit: false,
        });

        expect(secondResult).toEqual({
            hit: false,
        });
    });

    it('removes a corrupted JSON entry when it is accessed', async () => {
        const directoryPath = path.join(
            storagePath,
            'figma/nodes',
        );

        await mkdir(directoryPath, {
            recursive: true,
        });

        await writeFile(
            path.join(
                directoryPath,
                'corrupted-entry.json',
            ),
            '{ invalid json',
            'utf8',
        );

        const result =
            await cacheService.get(
                'corrupted-entry',
            );

        expect(result).toEqual({
            hit: false,
        });

        await expect(
            readFile(
                path.join(
                    directoryPath,
                    'corrupted-entry.json',
                ),
                'utf8',
            ),
        ).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });

    it('lists valid, expired and corrupted entries', async () => {
        vi.useFakeTimers();

        vi.setSystemTime(
            new Date('2026-07-19T12:00:00.000Z'),
        );

        await cacheService.set(
            'expired-entry',
            {
                name: 'Expired',
            },
        );

        vi.setSystemTime(
            new Date('2026-07-19T12:01:01.000Z'),
        );

        await cacheService.set(
            'valid-entry',
            {
                name: 'Valid',
            },
        );

        const directoryPath = path.join(
            storagePath,
            'figma/nodes',
        );

        await writeFile(
            path.join(
                directoryPath,
                'corrupted-entry.json',
            ),
            '{ invalid json',
            'utf8',
        );

        const result =
            await cacheService.list();

        expect(result.total).toBe(3);
        expect(result.valid).toBe(1);
        expect(result.expired).toBe(1);
        expect(result.corrupted).toBe(1);
        expect(result.sizeInBytes).toBeGreaterThan(0);

        expect(result.entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'valid-entry',
                    status: 'valid',
                }),
                expect.objectContaining({
                    key: 'expired-entry',
                    status: 'expired',
                }),
                expect.objectContaining({
                    fileName:
                        'corrupted-entry.json',
                    status: 'corrupted',
                }),
            ]),
        );
    });

    it('returns an empty list when the cache directory does not exist', async () => {
        const result =
            await cacheService.list();

        expect(result).toEqual({
            total: 0,
            valid: 0,
            expired: 0,
            corrupted: 0,
            sizeInBytes: 0,
            entries: [],
        });
    });

    it('clears an entry by key', async () => {
        await cacheService.set(
            'node-to-remove',
            {
                name: 'Node',
            },
        );

        const result =
            await cacheService.clear({
                mode: 'key',
                key: 'node-to-remove',
            });

        expect(result).toEqual({
            mode: 'key',
            removed: 1,
            removedKeys: [
                'node-to-remove',
            ],
            removedFiles: [
                'node-to-remove.json',
            ],
        });

        await expect(
            cacheService.get(
                'node-to-remove',
            ),
        ).resolves.toEqual({
            hit: false,
        });
    });

    it('returns zero when clearing a key that does not exist', async () => {
        const result =
            await cacheService.clear({
                mode: 'key',
                key: 'missing-entry',
            });

        expect(result).toEqual({
            mode: 'key',
            removed: 0,
            removedKeys: [],
            removedFiles: [],
        });
    });

    it('rejects key mode without a key', async () => {
        await expect(
            cacheService.clear({
                mode: 'key',
            }),
        ).rejects.toThrow(
            'A chave é obrigatória',
        );
    });

    it('clears only expired entries', async () => {
        vi.useFakeTimers();

        vi.setSystemTime(
            new Date('2026-07-19T12:00:00.000Z'),
        );

        await cacheService.set(
            'expired-entry',
            {
                name: 'Expired',
            },
        );

        vi.setSystemTime(
            new Date('2026-07-19T12:01:01.000Z'),
        );

        await cacheService.set(
            'valid-entry',
            {
                name: 'Valid',
            },
        );

        const result =
            await cacheService.clear({
                mode: 'expired',
            });

        expect(result.removed).toBe(1);
        expect(result.removedKeys).toEqual([
            'expired-entry',
        ]);

        const remaining =
            await cacheService.list();

        expect(remaining.total).toBe(1);
        expect(remaining.valid).toBe(1);
        expect(remaining.entries[0]?.key).toBe(
            'valid-entry',
        );
    });

    it('clears only corrupted entries', async () => {
        await cacheService.set(
            'valid-entry',
            {
                name: 'Valid',
            },
        );

        const directoryPath = path.join(
            storagePath,
            'figma/nodes',
        );

        await writeFile(
            path.join(
                directoryPath,
                'corrupted-entry.json',
            ),
            '{ invalid json',
            'utf8',
        );

        const result =
            await cacheService.clear({
                mode: 'corrupted',
            });

        expect(result.removed).toBe(1);
        expect(result.removedFiles).toEqual([
            'corrupted-entry.json',
        ]);

        const remaining =
            await cacheService.list();

        expect(remaining.total).toBe(1);
        expect(remaining.valid).toBe(1);
    });

    it('clears all cache entries', async () => {
        await cacheService.set(
            'first-entry',
            {
                name: 'First',
            },
        );

        await cacheService.set(
            'second-entry',
            {
                name: 'Second',
            },
        );

        const result =
            await cacheService.clear({
                mode: 'all',
            });

        expect(result.removed).toBe(2);

        const remaining =
            await cacheService.list();

        expect(remaining.total).toBe(0);
    });
});
