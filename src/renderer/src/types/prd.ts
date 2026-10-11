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

export type PrdOutputTab = 'prd' | 'database' | 'flow' | 'design' | 'mockup';

/** A single generated per-page UI mockup (self-contained HTML document). */
export interface PrdMockupPage {
    id: string;
    name: string;
    description: string;
    /** Full standalone HTML document. */
    html: string;
}

/**
 * Live progress for a mockup generation run that renders one page per AI call,
 * so the UI can show which page is in flight and how many credits have been
 * spent so far.
 */
export interface PrdMockupProgress {
    /** Total pages queued for this run. */
    total: number;
    /** How many pages have finished (successfully) so far. */
    completed: number;
    /** Name of the page currently being generated, if any. */
    current: string | null;
    /** Credits charged per page (base cost advertised to the user). */
    creditsPerPage: number;
}

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
