import {
    mkdir,
    readFile,
    readdir,
    rename,
    stat,
    unlink,
    writeFile,
} from 'node:fs/promises';

import path from 'node:path';

import type {
    CacheEntry,
    CacheEntrySummary,
    CacheListResult,
    CacheResult,
} from './types.js';

export interface CacheServiceOptions {
    storagePath: string;
    namespace: string;
    ttlSeconds: number;
}

export class CacheService {
    private readonly directoryPath: string;

    constructor(
        private readonly options: CacheServiceOptions,
    ) {
        this.directoryPath = path.join(
            options.storagePath,
            options.namespace,
        );
    }

    async get<T>(key: string): Promise<CacheResult<T>> {
        const filePath = this.getFilePath(key);

        try {
            const content = await readFile(filePath, 'utf8');
            const entry = JSON.parse(content) as CacheEntry<T>;

            if (this.isExpired(entry)) {
                await this.remove(key);

                return {
                    hit: false,
                };
            }

            return {
                hit: true,
                entry,
            };
        } catch (error: unknown) {
            if (isNodeError(error) && error.code === 'ENOENT') {
                return {
                    hit: false,
                };
            }

            if (error instanceof SyntaxError) {
                await this.remove(key);

                return {
                    hit: false,
                };
            }

            throw error;
        }
    }

    async set<T>(
        key: string,
        data: T,
    ): Promise<CacheEntry<T>> {
        await mkdir(this.directoryPath, {
            recursive: true,
        });

        const createdAt = new Date();
        const expiresAt = new Date(
            createdAt.getTime() +
            this.options.ttlSeconds * 1000,
        );

        const entry: CacheEntry<T> = {
            key,
            createdAt: createdAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            data,
        };

        const filePath = this.getFilePath(key);
        const temporaryFilePath = `${filePath}.tmp`;

        await writeFile(
            temporaryFilePath,
            JSON.stringify(entry, null, 2),
            'utf8',
        );

        await rename(temporaryFilePath, filePath);

        return entry;
    }

    async remove(key: string): Promise<void> {
        const filePath = this.getFilePath(key);

        try {
            await unlink(filePath);
        } catch (error: unknown) {
            if (isNodeError(error) && error.code === 'ENOENT') {
                return;
            }

            throw error;
        }
    }

    async list(): Promise<CacheListResult> {
        try {
            const directoryEntries = await readdir(
                this.directoryPath,
                {
                    withFileTypes: true,
                },
            );

            const cacheFiles = directoryEntries.filter(
                (entry) =>
                    entry.isFile() &&
                    entry.name.endsWith('.json'),
            );

            const entries = await Promise.all(
                cacheFiles.map((entry) =>
                    this.createEntrySummary(entry.name),
                ),
            );

            entries.sort((first, second) => {
                const firstCreatedAt =
                    first.createdAt ?? '';

                const secondCreatedAt =
                    second.createdAt ?? '';

                return secondCreatedAt.localeCompare(
                    firstCreatedAt,
                );
            });

            return {
                total: entries.length,

                valid: entries.filter(
                    (entry) => entry.status === 'valid',
                ).length,

                expired: entries.filter(
                    (entry) => entry.status === 'expired',
                ).length,

                corrupted: entries.filter(
                    (entry) => entry.status === 'corrupted',
                ).length,

                sizeInBytes: entries.reduce(
                    (total, entry) =>
                        total + entry.sizeInBytes,
                    0,
                ),

                entries,
            };
        } catch (error: unknown) {
            if (
                isNodeError(error) &&
                error.code === 'ENOENT'
            ) {
                return {
                    total: 0,
                    valid: 0,
                    expired: 0,
                    corrupted: 0,
                    sizeInBytes: 0,
                    entries: [],
                };
            }

            throw error;
        }
    }

    private async createEntrySummary(fileName: string): Promise<CacheEntrySummary> {
        const filePath = path.join(
            this.directoryPath,
            fileName,
        );

        const fileStats = await stat(filePath);

        try {
            const content = await readFile(
                filePath,
                'utf8',
            );

            const parsedEntry: unknown =
                JSON.parse(content);

            if (!isCacheEntry(parsedEntry)) {
                return {
                    fileName,
                    expired: false,
                    sizeInBytes: fileStats.size,
                    status: 'corrupted',
                };
            }

            const expired =
                this.isExpired(parsedEntry);

            return {
                fileName,
                key: parsedEntry.key,
                createdAt: parsedEntry.createdAt,
                expiresAt: parsedEntry.expiresAt,
                expired,
                sizeInBytes: fileStats.size,
                status: expired
                    ? 'expired'
                    : 'valid',
            };
        } catch (error: unknown) {
            if (error instanceof SyntaxError) {
                return {
                    fileName,
                    expired: false,
                    sizeInBytes: fileStats.size,
                    status: 'corrupted',
                };
            }

            throw error;
        }
    }

    private getFilePath(key: string): string {
        const safeKey = sanitizeCacheKey(key);

        return path.join(
            this.directoryPath,
            `${safeKey}.json`,
        );
    }

    private isExpired<T>(entry: CacheEntry<T>): boolean {
        const expiresAt = new Date(
            entry.expiresAt,
        ).getTime();

        return (
            Number.isNaN(expiresAt) ||
            expiresAt <= Date.now()
        );
    }
}

function sanitizeCacheKey(key: string): string {
    return key
        .trim()
        .replaceAll(':', '-')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
}

function isNodeError(
    error: unknown,
): error is NodeJS.ErrnoException {
    return error instanceof Error && 'code' in error;
}

function isCacheEntry(
    value: unknown,
): value is CacheEntry<unknown> {
    if (
        typeof value !== 'object' ||
        value === null
    ) {
        return false;
    }

    const candidate =
        value as Record<string, unknown>;

    return (
        typeof candidate.key === 'string' &&
        typeof candidate.createdAt === 'string' &&
        typeof candidate.expiresAt === 'string' &&
        'data' in candidate
    );
}