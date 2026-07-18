export class FigmaApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly responseBody?: string,
    ) {
        super(message);
        this.name = 'FigmaApiError';
    }
}
