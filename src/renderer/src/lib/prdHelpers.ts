import type {
    PrdDesign,
    PrdOutputs,
    PrdSuggestion,
    ParsedErDiagram,
    DbTable,
    DbRelationship,
    ParsedFlow,
    FlowStep,
    FlowTransition,
} from '@/types/prd';

export const uuid = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const toIsoNow = (): string => new Date().toISOString();

export const MIN_USER_TURNS_FOR_GENERATE = 2;

/** Extracts the balanced JSON object starting at the first "{". */
const extractJsonObject = (raw: string): string | null => {
    const start = raw.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < raw.length; i += 1) {
        const char = raw[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === '"') inString = false;
            continue;
        }
        if (char === '"') inString = true;
        else if (char === '{') depth += 1;
        else if (char === '}') {
            depth -= 1;
            if (depth === 0) return raw.slice(start, i + 1);
        }
    }
    return raw.slice(start);
};

const normalizePrdMarkdown = (value: string): string => {
    if (!value) return value;
    const hasEscaped = /\\n|\\r|\\t|\\"/.test(value);
    const hasRealNewlines = value.includes('\n');
    if (hasEscaped && !hasRealNewlines) {
        return value
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"');
    }
    return value;
};

export const parsePrdOutput = (
    raw: string,
): (PrdOutputs & { project_title?: string }) | null => {
    if (!raw) return null;
    const candidates: string[] = [];
    const fenced = raw.match(/```prd-output\s*([\s\S]*?)(?:```|$)/);
    if (fenced) candidates.push(fenced[1].trim());
    const anyFence = raw.match(/```[a-zA-Z-]*\s*([\s\S]*?)(?:```|$)/);
    if (anyFence) candidates.push(anyFence[1].trim());
    const extracted = extractJsonObject(raw);
    if (extracted) candidates.push(extracted);
    candidates.push(raw.trim());

    for (const candidate of candidates) {
        for (const attempt of [candidate, extractJsonObject(candidate) ?? '']) {
            if (!attempt) continue;
            try {
                const parsed = JSON.parse(attempt) as Record<string, unknown>;
                if (typeof parsed !== 'object' || parsed === null) continue;
                const hasAnyKey =
                    typeof parsed.prd_markdown === 'string' ||
                    typeof parsed.database_schema === 'string' ||
                    typeof parsed.page_flow === 'string';
                if (!hasAnyKey) continue;
                return {
                    project_title:
                        typeof parsed.project_title === 'string' ? parsed.project_title : undefined,
                    prd_markdown: normalizePrdMarkdown(
                        typeof parsed.prd_markdown === 'string' ? parsed.prd_markdown : '',
                    ),
                    database_schema:
                        typeof parsed.database_schema === 'string' ? parsed.database_schema : '',
                    page_flow: typeof parsed.page_flow === 'string' ? parsed.page_flow : '',
                };
            } catch {
                /* try next */
            }
        }
    }
    return null;
};

export const parseDesignOutput = (raw: string): PrdDesign | null => {
    if (!raw) return null;
    const candidates: string[] = [];
    const fenced = raw.match(/```design-output\s*([\s\S]*?)(?:```|$)/);
    if (fenced) candidates.push(fenced[1].trim());
    const anyFence = raw.match(/```[a-zA-Z-]*\s*([\s\S]*?)(?:```|$)/);
    if (anyFence) candidates.push(anyFence[1].trim());
    const extracted = extractJsonObject(raw);
    if (extracted) candidates.push(extracted);
    candidates.push(raw.trim());

    let parsed: Record<string, unknown> | null = null;
    for (const candidate of candidates) {
        for (const attempt of [candidate, extractJsonObject(candidate) ?? '']) {
            if (!attempt) continue;
            try {
                const obj = JSON.parse(attempt) as Record<string, unknown>;
                if (obj && typeof obj === 'object' && Array.isArray(obj.design_styles)) {
                    parsed = obj;
                    break;
                }
            } catch {
                /* try next */
            }
        }
        if (parsed) break;
    }
    if (!parsed) return null;

    const rawStyles = Array.isArray(parsed.design_styles) ? parsed.design_styles : [];
    const styles = rawStyles
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .map((s) => ({
            id: typeof s.id === 'string' ? s.id : uuid(),
            name: typeof s.name === 'string' ? s.name : 'Untitled style',
            tagline: typeof s.tagline === 'string' ? s.tagline : '',
            description: typeof s.description === 'string' ? s.description : '',
            best_for: Array.isArray(s.best_for)
                ? s.best_for.filter((v): v is string => typeof v === 'string')
                : [],
            color_palette: Array.isArray(s.color_palette)
                ? s.color_palette.filter((v): v is string => typeof v === 'string')
                : [],
            typography: {
                headline:
                    typeof (s.typography as Record<string, unknown> | undefined)?.headline ===
                    'string'
                        ? (s.typography as Record<string, string>).headline
                        : 'Inter, sans-serif',
                body:
                    typeof (s.typography as Record<string, unknown> | undefined)?.body === 'string'
                        ? (s.typography as Record<string, string>).body
                        : 'Inter, sans-serif',
            },
            key_principles: Array.isArray(s.key_principles)
                ? s.key_principles.filter((v): v is string => typeof v === 'string')
                : [],
            examples: Array.isArray(s.examples)
                ? s.examples.filter((v): v is string => typeof v === 'string')
                : [],
        }));

    if (styles.length === 0) return null;
    return {
        design_styles: styles,
        primary_recommendation:
            typeof parsed.primary_recommendation === 'string'
                ? parsed.primary_recommendation
                : styles[0].id,
        design_summary: typeof parsed.design_summary === 'string' ? parsed.design_summary : '',
    };
};

export const parseSuggestionOutput = (raw: string): PrdSuggestion[] | null => {
    if (!raw) return null;
    const candidates: string[] = [];
    const fenced = raw.match(/```prd-suggestions\s*([\s\S]*?)(?:```|$)/);
    if (fenced) candidates.push(fenced[1].trim());
    const anyFence = raw.match(/```[a-zA-Z-]*\s*([\s\S]*?)(?:```|$)/);
    if (anyFence) candidates.push(anyFence[1].trim());
    const extracted = extractJsonObject(raw);
    if (extracted) candidates.push(extracted);
    candidates.push(raw.trim());

    for (const candidate of candidates) {
        for (const attempt of [candidate, extractJsonObject(candidate) ?? '']) {
            if (!attempt) continue;
            try {
                const obj = JSON.parse(attempt) as Record<string, unknown>;
                if (!obj || typeof obj !== 'object' || !Array.isArray(obj.suggestions)) continue;
                const seen = new Set<string>();
                const suggestions: PrdSuggestion[] = [];
                for (const item of obj.suggestions) {
                    if (typeof item !== 'object' || item === null) continue;
                    const record = item as Record<string, unknown>;
                    const text = typeof record.text === 'string' ? record.text.trim() : '';
                    if (!text) continue;
                    const key = text.toLowerCase();
                    if (seen.has(key)) continue;
                    seen.add(key);
                    const label =
                        typeof record.label === 'string' && record.label.trim()
                            ? record.label.trim()
                            : text.split(/\s+/).slice(0, 3).join(' ');
                    suggestions.push({ label, text });
                    if (suggestions.length >= 4) break;
                }
                if (suggestions.length >= 2) return suggestions;
            } catch {
                /* try next */
            }
        }
    }
    return null;
};

const cleanMermaid = (raw: string): string => {
    const match = raw.match(/```mermaid([\s\S]*?)```/);
    if (match) return match[1].trim();
    return raw.replace(/```mermaid/g, '').replace(/```/g, '').trim();
};

const unquote = (value: string): string => value.trim().replace(/^["']|["']$/g, '');

export const parseErDiagram = (raw: string): ParsedErDiagram => {
    const allLines = cleanMermaid(raw)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('%%') && !line.startsWith('erDiagram'));

    const tables: DbTable[] = [];
    let current: DbTable | null = null;
    let depth = 0;

    for (const line of allLines) {
        if (!current && line.endsWith('{')) {
            const name = unquote(line.slice(0, -1).trim());
            if (name) {
                current = { name, columns: [] };
                depth = 1;
            }
            continue;
        }
        if (current) {
            if (line === '}') {
                depth -= 1;
                if (depth <= 0) {
                    tables.push(current);
                    current = null;
                }
                continue;
            }
            const trimmed = line.endsWith(',') ? line.slice(0, -1) : line;
            const tokens = trimmed.split(/\s+/);
            const type = tokens.shift() || 'string';
            const name = unquote(tokens.shift() || 'column');
            const constraints = tokens.join(' ').replace(/^["']|["']$/g, '').trim();
            current.columns.push({ name, type, constraints });
        }
    }
    if (current) tables.push(current);

    const relationships: DbRelationship[] = [];
    const relRegex =
        /([\w-]+)\s+([|}][o|]{1,2})--([o|]{1,2}[|{])\s+([\w-]+)\s*:\s*"?([^"\n]*)"?/g;
    const relEndpointsRegex = /([\w-]+)\s+([|}][o|]{1,2})--([o|]{1,2}[|{])\s+([\w-]+)/g;
    const joined = allLines.join('\n');
    let match: RegExpExecArray | null;
    while ((match = relRegex.exec(joined)) !== null) {
        relationships.push({
            from: unquote(match[1]),
            to: unquote(match[4]),
            cardinality: `${unquote(match[2])}--${unquote(match[3])}`,
            label: match[5] ? match[5].trim() : undefined,
        });
    }
    if (relationships.length === 0) {
        while ((match = relEndpointsRegex.exec(joined)) !== null) {
            relationships.push({
                from: unquote(match[1]),
                to: unquote(match[4]),
                cardinality: `${unquote(match[2])}--${unquote(match[3])}`,
            });
        }
    }
    return { tables, relationships };
};

export const parseFlowchart = (raw: string): ParsedFlow => {
    const clean = cleanMermaid(raw);
    const nodeLabel = (id: string, rest: string): FlowStep => {
        const normId = unquote(id);
        let label = rest.trim();
        if (!label) return { id: normId, label: normId };
        const bracket = label.match(/[[({>]+([\s\S]*?)[\])}]+/);
        if (bracket) label = bracket[1];
        return {
            id: normId,
            label:
                unquote(label)
                    .replace(/<br\s*\/?>/gi, ' ')
                    .trim() || normId,
        };
    };

    const steps: FlowStep[] = [];
    const seen = new Set<string>();
    const addNode = (node: FlowStep): void => {
        if (!seen.has(node.id)) {
            seen.add(node.id);
            steps.push(node);
        }
    };

    const transitions: FlowTransition[] = [];
    const edgeRegex =
        /([\w-]+)\s*(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|>([^\]]*)\])?\s*(-->|-.->|==>|--[^>]*->|---)(?:\|([^|]*)\|)?\s*([\w-]+)\s*(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\})?/g;

    let match: RegExpExecArray | null;
    while ((match = edgeRegex.exec(clean)) !== null) {
        const fromLabel = match[2] ?? match[3] ?? match[4] ?? match[5] ?? '';
        const toLabel = match[9] ?? match[10] ?? match[11] ?? '';
        const fromNode = nodeLabel(match[1], fromLabel);
        const toNode = nodeLabel(match[8], toLabel);
        addNode(fromNode);
        addNode(toNode);
        transitions.push({
            from: fromNode.id,
            to: toNode.id,
            condition: match[7] ? unquote(match[7]) : undefined,
        });
    }
    return { steps, transitions };
};

/**
 * True when the text looks like it contains (or is still streaming) a
 * machine-readable PRD/design output payload — with OR without the
 * ```prd-output fence. Used to keep that JSON out of the chat transcript.
 */
export const containsPrdOutput = (raw: string): boolean => {
    if (!raw) return false;
    return (
        raw.includes('```prd-output') ||
        /"prd_markdown"\s*:/.test(raw) ||
        /"database_schema"\s*:/.test(raw) ||
        /"page_flow"\s*:/.test(raw)
    );
};

/**
 * Returns the human-readable part of an assistant turn, stripping the
 * machine-readable payload (fenced ```prd-output block or a bare JSON object
 * carrying the PRD keys) so it never renders as raw code in the chat.
 */
export const stripPrdPayload = (raw: string): string => {
    if (!raw) return raw;
    let text = raw.includes('[READY_TO_GENERATE]')
        ? raw.split('[READY_TO_GENERATE]')[0]
        : raw;

    const fenceIdx = text.indexOf('```prd-output');
    if (fenceIdx !== -1) {
        return text.slice(0, fenceIdx).trim();
    }
    if (containsPrdOutput(text)) {
        const jsonIdx = text.search(/\{[\s\S]*?"(prd_markdown|database_schema|page_flow)"\s*:/);
        if (jsonIdx !== -1) text = text.slice(0, jsonIdx);
    }
    return text.trim();
};

export const countUserTurns = (msgs: { role: string; content: string }[]): number =>
    msgs.filter((m) => m.role === 'user' && m.content.trim().length > 0).length;

export const isPrdReadyToGenerate = (msgs: { role: string; content: string }[]): boolean => {
    const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant?.content.includes('[READY_TO_GENERATE]')) return true;
    return countUserTurns(msgs) >= MIN_USER_TURNS_FOR_GENERATE;
};

export const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.startsWith('audio/')) return '🎵';
    if (type.startsWith('video/')) return '🎬';
    return '📎';
};
