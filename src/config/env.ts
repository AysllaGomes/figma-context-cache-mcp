export interface AppConfig {
    figmaApiKey: string;
    figmaApiBaseUrl: string;
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

export function loadConfig(): AppConfig {
    return {
        figmaApiKey: requireEnvironmentVariable('FIGMA_API_KEY'),
        figmaApiBaseUrl:
            process.env.FIGMA_API_BASE_URL?.trim() ||
            'https://api.figma.com/v1',
    };
}
