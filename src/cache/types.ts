export interface CacheEntry<T> {
    key: string;
    createdAt: string;
    expiresAt: string;
    data: T;
}

export interface CacheResult<T> {
    hit: boolean;
    entry?: CacheEntry<T>;
}

export type CacheEntryStatus =
    | 'valid'
    | 'expired'
    | 'corrupted';

export interface CacheEntrySummary {
    fileName: string;
    key?: string;
    createdAt?: string;
    expiresAt?: string;
    expired: boolean;
    sizeInBytes: number;
    status: CacheEntryStatus;
}

export interface CacheListResult {
    total: number;
    valid: number;
    expired: number;
    corrupted: number;
    sizeInBytes: number;
    entries: CacheEntrySummary[];
}

export type CacheClearMode =
    | 'all'
    | 'expired'
    | 'corrupted'
    | 'key';

export interface CacheClearOptions {
    mode: CacheClearMode;
    key?: string;
}

export interface CacheClearResult {
    mode: CacheClearMode;
    removed: number;
    removedKeys: string[];
    removedFiles: string[];
}
