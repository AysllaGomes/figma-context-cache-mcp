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
