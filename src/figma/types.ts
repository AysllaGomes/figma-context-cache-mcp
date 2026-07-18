export interface FigmaNode {
    id: string;
    name: string;
    type: string;
    visible?: boolean;
    children?: FigmaNode[];

    [property: string]: unknown;
}

export interface FigmaNodeEntry {
    document: FigmaNode | null;
    components?: Record<string, unknown>;
    componentSets?: Record<string, unknown>;
    schemaVersion?: number;
    styles?: Record<string, unknown>;
}

export interface FigmaNodesResponse {
    name: string;
    lastModified: string;
    thumbnailUrl?: string;
    version: string;
    role?: string;
    editorType?: string;
    linkAccess?: string;
    nodes: Record<string, FigmaNodeEntry | null>;
}
