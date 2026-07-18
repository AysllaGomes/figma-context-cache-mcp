import path from 'node:path';

export interface AppConfig {
    figmaApiKey: string;
    figmaApiBaseUrl: string;
    storagePath: string;
    cacheTtlSeconds: number;
}

function requireEnvironmentVariable(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(
            `A variável de ambiente ${name} não foi configurada.`,
        );
    }

    return value;
}

function getPositiveInteger(
    name: string,
    defaultValue: number,
): number {
    const rawValue = process.env[name]?.trim();

    if (!rawValue) {
        return defaultValue;
    }

    const parsedValue = Number(rawValue);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new Error(
            `A variável ${name} deve ser um número inteiro positivo.`,
        );
    }

    return parsedValue;
}

export function loadConfig(): AppConfig {
    return {
        figmaApiKey: requireEnvironmentVariable('FIGMA_API_KEY'),

        figmaApiBaseUrl:
            process.env.FIGMA_API_BASE_URL?.trim() ||
            'https://api.figma.com/v1',

        storagePath:
            process.env.STORAGE_PATH?.trim() ||
            path.resolve(process.cwd(), 'storage'),

        cacheTtlSeconds: getPositiveInteger(
            'CACHE_TTL_SECONDS',
            3600,
        ),
    };
}
