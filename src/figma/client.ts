import type { AppConfig } from '../config/env.js';

import { FigmaApiError } from "./errors.js";
import type { FigmaNodesResponse } from './types.js';

export interface GetNodeOptions {
    depth?: number;
}

export class FigmaClient {
    constructor(private readonly config: AppConfig) {}

    async getNode(
        fileKey: string,
        nodeId: string,
        options: GetNodeOptions = {},
    ): Promise<FigmaNodesResponse> {
        const normalizedFileKey = fileKey.trim();
        const normalizedNodeId = normalizeNodeId(nodeId);

        const url = new URL(
            `${this.config.figmaApiBaseUrl}/files/${encodeURIComponent(normalizedFileKey)}/nodes`,
        );

        url.searchParams.set('ids', normalizedNodeId);

        if (options.depth !== undefined) {
            url.searchParams.set('depth', String(options.depth));
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'X-Figma-Token': this.config.figmaApiKey,
            },
            signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
            const responseBody = await response.text();

            throw new FigmaApiError(
                buildFigmaErrorMessage(response.status),
                response.status,
                responseBody,
            );
        }

        return (await response.json()) as FigmaNodesResponse;
    }
}

function normalizeNodeId(nodeId: string): string {
    return nodeId.trim().replaceAll('-', ':');
}

function buildFigmaErrorMessage(status: number): string {
    switch (status) {
        case 400:
            return 'O Figma rejeitou os parâmetros enviados.';
        case 403:
            return 'O token do Figma é inválido, expirou ou não possui acesso ao arquivo.';
        case 404:
            return 'O arquivo ou nó solicitado não foi encontrado no Figma.';
        case 429:
            return 'O limite de requisições da API do Figma foi atingido.';
        default:
            return `A API do Figma respondeu com o status ${status}.`;
    }
}
