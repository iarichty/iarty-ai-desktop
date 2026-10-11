export type PrdSessionStatus = 'refining' | 'generating' | 'generated';

export interface PrdMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    ai_model: string | null;
    attached_files: string[];
    failed?: boolean;
}

export interface PrdOutputs {
    prd_markdown: string;
    database_schema: string;
    page_flow: string;
}

export interface PrdDesignStyle {
    id: string;
    name: string;
    tagline: string;
    description: string;
    best_for: string[];
    color_palette: string[];
    typography: { headline: string; body: string };
    key_principles: string[];
    examples: string[];
}

export interface PrdDesign {
    design_styles: PrdDesignStyle[];
    primary_recommendation: string;
    design_summary: string;
    /**
     * When the user picked a curated style from the catalog, it is echoed back
     * here (with full implementation detail) so the UI shows exactly which
     * catalog style was implemented.
     */
    chosen_style?: DesignStyleSelection | null;
}

/**
 * A curated design style chosen by the user from the 20-style catalog. The
 * AI's design step must implement THIS style for the product.
 */
export interface DesignStyleSelection {
    id: string;
    name: string;
    tagline: string;
    mood: string;
    color_palette: string[];
    typography: {
        headline: string;
        body: string;
        headline_style: string;
        body_style: string;
        google_fonts: string[];
    };
    layout: string[];
    motion: string[];
    implementation_notes: string[];
    unsplash: string[];
    palette: {
        background: string;
        surface: string;
        text: string;
        accent: string;
        secondary: string;
        border: string;
    };
}

export interface PrdSuggestion {
    label: string;
    text: string;
}

export type PrdOutputTab = 'prd' | 'database' | 'flow' | 'design';

export interface DbColumn {
    name: string;
    type: string;
    constraints: string;
}

export interface DbTable {
    name: string;
    columns: DbColumn[];
}

export interface DbRelationship {
    from: string;
    to: string;
    cardinality: string;
    label?: string;
}

export interface ParsedErDiagram {
    tables: DbTable[];
    relationships: DbRelationship[];
}

export interface FlowStep {
    id: string;
    label: string;
}

export interface FlowTransition {
    from: string;
    to: string;
    condition?: string;
}

export interface ParsedFlow {
    steps: FlowStep[];
    transitions: FlowTransition[];
}
