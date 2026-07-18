import {
    mkdir,
    readFile,
    rename,
    unlink,
    writeFile,
} from 'node:fs/promises';

import path from 'node:path';

import type {
    CacheEntry,
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
