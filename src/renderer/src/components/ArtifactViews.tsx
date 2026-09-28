import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
    TbDatabase,
    TbArrowNarrowRight,
    TbKey,
    TbLink,
    TbPlus,
    TbMinus,
    TbFocusCentered,
} from 'react-icons/tb';
import type { DbTable, DbRelationship, ParsedErDiagram, ParsedFlow, FlowStep } from '@/types/prd';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

interface FlowLevel {
    depth: number;
    nodes: FlowStep[];
}

/** Smooth cubic bezier between two points, curving horizontally. */
const smoothPath = (x1: number, y1: number, x2: number, y2: number): string => {
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

/** Orthogonal elbow path with rounded corners (for DB relationships). */
const roundedElbowPath = (x1: number, y1: number, x2: number, y2: number, radius = 12): string => {
    const midX = (x1 + x2) / 2;
    if (Math.abs(y1 - y2) < 0.5) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const r = Math.min(radius, Math.abs(midX - x1) / 2, Math.abs(y2 - y1) / 2);
    const dirY = y2 > y1 ? 1 : -1;
    return [
        `M ${x1} ${y1}`,
        `L ${midX - r} ${y1}`,
        `Q ${midX} ${y1} ${midX} ${y1 + dirY * r}`,
        `L ${midX} ${y2 - dirY * r}`,
        `Q ${midX} ${y2} ${midX + r} ${y2}`,
        `L ${x2} ${y2}`,
    ].join(' ');
};

/** Split mermaid cardinality token e.g. "||--o{" into [left, right]. */
const splitCardinality = (cardinality: string): [string, string] => {
    const [left = '', right = ''] = cardinality.split('--');
    return [left.replace(/[^\w|o{}]/g, ''), right.replace(/[^\w|o{}]/g, '')];
};

/** Human label for a mermaid ER cardinality endpoint token. */
const cardinalityLabel = (token: string, isLeft: boolean): string => {
    const normalized = token.trim();
    if (!normalized) return '';
    if (normalized === '||') return 'one';
    if (normalized === 'o|' || normalized === '|o') return 'zero or one';
    if (normalized === '}o' || normalized === 'o{') return 'zero or many';
    if (normalized === '}|' || normalized === '|{') return 'one or many';
    return isLeft ? 'one' : 'many';
};

const isManyToken = (token: string): boolean => /[{}]/.test(token);
const isOptionalToken = (token: string): boolean => /o/.test(token);

/** Crow's-foot cardinality marker at (cx, cy). dir=1 points right, -1 left. */
function CardinalityMarker({
    cx,
    cy,
    dir,
    token,
}: {
    cx: number;
    cy: number;
    dir: 1 | -1;
    token: string;
}): JSX.Element {
    const many = isManyToken(token);
    const optional = isOptionalToken(token);
    const cls = 'stroke-neutral-900 dark:stroke-white';
    const len = 12;
    return (
        <g>
            {optional && (
                <circle
                    cx={cx - dir * 4}
                    cy={cy}
                    r={3.5}
                    fill="none"
                    strokeWidth={1.8}
                    className={cls}
                />
            )}
            {many ? (
                <g className={cls} strokeWidth={1.8}>
                    <line x1={cx} y1={cy} x2={cx - dir * len} y2={cy - 7} />
                    <line x1={cx} y1={cy} x2={cx - dir * len} y2={cy} />
                    <line x1={cx} y1={cy} x2={cx - dir * len} y2={cy + 7} />
                </g>
            ) : (
                <line
                    x1={cx - dir * 5}
                    y1={cy - 7}
                    x2={cx - dir * 5}
                    y2={cy + 7}
                    strokeWidth={2}
                    className={cls}
                />
            )}
        </g>
    );
}

/* ── Pan/zoom canvas viewport with grid background ───────────────────────── */

function CanvasViewport({
    children,
    toolbar,
}: {
    children: ReactNode;
    toolbar?: ReactNode;
}): JSX.Element {
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const dragState = useRef({
        dragging: false,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
    });

    const clampScale = (s: number): number => Math.min(2, Math.max(0.4, s));

    const onPointerDown = (e: React.PointerEvent): void => {
        if (e.button !== 0) return;
        dragState.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            originX: transform.x,
            originY: transform.y,
        };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent): void => {
        if (!dragState.current.dragging) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        setTransform((t) => ({
            ...t,
            x: dragState.current.originX + dx,
            y: dragState.current.originY + dy,
        }));
    };
    const onPointerUp = (): void => {
        dragState.current.dragging = false;
    };
    const onWheel = (e: React.WheelEvent): void => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        setTransform((t) => ({ ...t, scale: clampScale(t.scale * (e.deltaY < 0 ? 1.1 : 0.9)) }));
    };

    const zoom = (factor: number): void =>
        setTransform((t) => ({ ...t, scale: clampScale(t.scale * factor) }));
    const reset = (): void => setTransform({ x: 0, y: 0, scale: 1 });

    return (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]">
            <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
                {toolbar}
                <button
                    onClick={() => zoom(1.15)}
                    className="cursor-pointer rounded-lg border border-border bg-[color:var(--surface)]/90 p-1.5 text-text transition-colors hover:text-text-h"
                    title="Zoom in"
                >
                    <TbPlus className="h-4 w-4" />
                </button>
                <button
                    onClick={() => zoom(0.87)}
                    className="cursor-pointer rounded-lg border border-border bg-[color:var(--surface)]/90 p-1.5 text-text transition-colors hover:text-text-h"
                    title="Zoom out"
                >
                    <TbMinus className="h-4 w-4" />
                </button>
                <button
                    onClick={reset}
                    className="cursor-pointer rounded-lg border border-border bg-[color:var(--surface)]/90 p-1.5 text-text transition-colors hover:text-text-h"
                    title="Reset view"
                >
                    <TbFocusCentered className="h-4 w-4" />
                </button>
            </div>

            <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onWheel={onWheel}
                className="relative cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
                style={{
                    backgroundColor: 'transparent',
                    backgroundImage:
                        'linear-gradient(to right, rgba(120,120,120,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,120,120,0.18) 1px, transparent 1px)',
                    backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
                    backgroundPosition: `${transform.x}px ${transform.y}px`,
                    height: 520,
                }}
            >
                <div
                    style={{
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        transformOrigin: '0 0',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

const buildFlowLevels = (flow: ParsedFlow): FlowLevel[] => {
    const incoming = new Map<string, number>();
    flow.steps.forEach((s) => incoming.set(s.id, 0));
    flow.transitions.forEach((t) => {
        if (incoming.has(t.to)) incoming.set(t.to, (incoming.get(t.to) || 0) + 1);
    });

    const depth = new Map<string, number>();
    const queue: string[] = flow.steps
        .filter((s) => (incoming.get(s.id) || 0) === 0)
        .map((s) => s.id);
    if (queue.length === 0 && flow.steps.length > 0) queue.push(flow.steps[0].id);
    queue.forEach((id) => depth.set(id, 0));

    const adjacency = new Map<string, string[]>();
    flow.transitions.forEach((t) => {
        if (!adjacency.has(t.from)) adjacency.set(t.from, []);
        adjacency.get(t.from)!.push(t.to);
    });

    const visited = new Set<string>();
    const processQueue = [...queue];
    while (processQueue.length > 0) {
        const id = processQueue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const currentDepth = depth.get(id) || 0;
        (adjacency.get(id) || []).forEach((next) => {
            const existing = depth.get(next);
            if (existing === undefined || existing < currentDepth + 1) {
                depth.set(next, currentDepth + 1);
            }
            processQueue.push(next);
        });
    }

    flow.steps.forEach((s) => {
        if (!depth.has(s.id)) depth.set(s.id, 0);
    });

    const maxDepth = Math.max(0, ...Array.from(depth.values()));
    const levels: FlowLevel[] = [];
    for (let i = 0; i <= maxDepth; i += 1) {
        const nodes = flow.steps.filter((s) => depth.get(s.id) === i);
        if (nodes.length > 0) levels.push({ depth: i, nodes });
    }

    const placed = new Set(levels.flatMap((l) => l.nodes.map((n) => n.id)));
    const leftovers = flow.steps.filter((s) => !placed.has(s.id));
    if (leftovers.length > 0) levels.push({ depth: maxDepth + 1, nodes: leftovers });

    return levels;
};

/* ── Database: relationship graph with SVG connectors ────────────────────── */

function TableCard({
    table,
    highlight,
    index,
    nodeRef,
    columnRef,
}: {
    table: DbTable;
    highlight: boolean;
    index: number;
    nodeRef: (el: HTMLDivElement | null) => void;
    columnRef: (columnName: string, el: HTMLDivElement | null) => void;
}): JSX.Element {
    return (
        <motion.div
            ref={nodeRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            className={`w-60 shrink-0 overflow-hidden rounded-2xl border bg-[color:var(--surface)] shadow-sm transition-shadow ${
                highlight ? 'border-neutral-900 shadow-lg dark:border-white' : 'border-border'
            }`}
        >
            <div className="flex items-center gap-2 bg-neutral-900 px-4 py-3 dark:bg-white">
                <TbDatabase className="h-4 w-4 shrink-0 text-white dark:text-neutral-900" />
                <h4 className="truncate font-mono text-sm font-black text-white dark:text-neutral-900">
                    {table.name}
                </h4>
                <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/60 dark:text-neutral-900/60">
                    {table.columns.length}
                </span>
            </div>
            <div className="divide-y divide-border/60">
                {table.columns.map((col) => {
                    const isPk = /PK|PRIMARY/i.test(col.constraints);
                    const isFk = /FK|FOREIGN/i.test(col.constraints);
                    return (
                        <div
                            key={`${table.name}.${col.name}`}
                            ref={(el) => columnRef(col.name, el)}
                            className="flex h-8 items-center gap-2 px-4 text-xs"
                        >
                            {isPk ? (
                                <TbKey className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            ) : isFk ? (
                                <TbLink className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            ) : (
                                <span className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span className="whitespace-nowrap font-mono font-semibold text-text-h">
                                {col.name}
                            </span>
                            <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-text">
                                {col.type}
                            </span>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

const TABLE_COL_GAP = 110;
const TABLE_ROW_GAP = 32;

const buildTableColumns = (tables: DbTable[], relationships: DbRelationship[]): DbTable[][] => {
    const incoming = new Map<string, number>();
    tables.forEach((t) => incoming.set(t.name, 0));
    relationships.forEach((r) => {
        if (incoming.has(r.to)) incoming.set(r.to, (incoming.get(r.to) || 0) + 1);
    });

    const depth = new Map<string, number>();
    const roots = tables.filter((t) => (incoming.get(t.name) || 0) === 0).map((t) => t.name);
    const start = roots.length > 0 ? roots : tables.length > 0 ? [tables[0].name] : [];
    start.forEach((id) => depth.set(id, 0));

    const adjacency = new Map<string, string[]>();
    relationships.forEach((r) => {
        if (!adjacency.has(r.from)) adjacency.set(r.from, []);
        adjacency.get(r.from)!.push(r.to);
    });

    const queue = [...start];
    const visited = new Set<string>();
    while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const d = depth.get(id) || 0;
        (adjacency.get(id) || []).forEach((next) => {
            const existing = depth.get(next);
            if (existing === undefined || existing < d + 1) depth.set(next, d + 1);
            queue.push(next);
        });
    }
    tables.forEach((t) => {
        if (!depth.has(t.name)) depth.set(t.name, 0);
    });

    const maxDepth = Math.max(0, ...Array.from(depth.values()));
    const cols: DbTable[][] = [];
    for (let i = 0; i <= maxDepth; i += 1) {
        const nodes = tables.filter((t) => depth.get(t.name) === i);
        if (nodes.length > 0) cols.push(nodes);
    }
    return cols;
};

interface Edge {
    from: string;
    to: string;
    cardinality: string;
    label?: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export function DatabaseTableView({
    parsed,
}: {
    parsed: ParsedErDiagram | null;
}): JSX.Element {
    const tables = parsed?.tables ?? [];
    const relationships = parsed?.relationships ?? [];
    const columns = useMemo(() => buildTableColumns(tables, relationships), [tables, relationships]);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [edges, setEdges] = useState<Edge[]>([]);

    const measure = useCallback(() => {
        const content = contentRef.current;
        if (!content) return;
        const cRect = content.getBoundingClientRect();
        const scale = cRect.width / (content.offsetWidth || cRect.width) || 1;

        const toLocal = (el: HTMLElement): { x: number; y: number; w: number; h: number } => {
            const r = el.getBoundingClientRect();
            return {
                x: (r.left - cRect.left) / scale,
                y: (r.top - cRect.top) / scale,
                w: r.width / scale,
                h: r.height / scale,
            };
        };

        const tableBoxes = new Map<string, { x: number; y: number; w: number; h: number }>();
        nodeRefs.current.forEach((el, id) => tableBoxes.set(id, toLocal(el)));
        const colBoxes = new Map<string, { x: number; y: number; w: number; h: number }>();
        columnRefs.current.forEach((el, key) => colBoxes.set(key, toLocal(el)));

        const findFkColumn = (table: string, targetTable: string): string | null => {
            const t = tables.find((tb) => tb.name === table);
            if (!t) return null;
            const fk = t.columns.find(
                (c) =>
                    /FK|FOREIGN/i.test(c.constraints) &&
                    c.name.toLowerCase().includes(targetTable.toLowerCase().slice(0, -1)),
            );
            if (fk) return fk.name;
            const anyFk = t.columns.find((c) => /FK|FOREIGN/i.test(c.constraints));
            if (anyFk) return anyFk.name;
            const pk = t.columns.find((c) => /PK|PRIMARY/i.test(c.constraints));
            return pk ? pk.name : (t.columns[0]?.name ?? null);
        };
        const findPkColumn = (table: string): string | null => {
            const t = tables.find((tb) => tb.name === table);
            if (!t) return null;
            const pk = t.columns.find((c) => /PK|PRIMARY/i.test(c.constraints));
            return pk ? pk.name : (t.columns[0]?.name ?? null);
        };

        const next: Edge[] = [];
        relationships.forEach((rel) => {
            const aBox = tableBoxes.get(rel.from);
            const bBox = tableBoxes.get(rel.to);
            if (!aBox || !bBox) return;

            const fkName = findFkColumn(rel.from, rel.to);
            const pkName = findPkColumn(rel.to);
            const fkBox = fkName ? colBoxes.get(`${rel.from}.${fkName}`) : undefined;
            const pkBox = pkName ? colBoxes.get(`${rel.to}.${pkName}`) : undefined;

            const aRight = aBox.x + aBox.w;
            const bLeft = bBox.x;
            const fromRight = bLeft > aRight;

            next.push({
                from: rel.from,
                to: rel.to,
                cardinality: rel.cardinality,
                label: rel.label,
                x1: fromRight ? aRight : aBox.x,
                y1: fkBox ? fkBox.y + fkBox.h / 2 : aBox.y + aBox.h / 2,
                x2: fromRight ? bLeft : bBox.x + bBox.w,
                y2: pkBox ? pkBox.y + pkBox.h / 2 : bBox.y + bBox.h / 2,
            });
        });
        setEdges(next);
        setSize({ width: content.offsetWidth, height: content.offsetHeight });
    }, [relationships, tables]);

    useEffect(() => {
        const raf = requestAnimationFrame(() => measure());
        const ro = new ResizeObserver(() => measure());
        if (contentRef.current) ro.observe(contentRef.current);
        const t = window.setTimeout(measure, 320);
        window.addEventListener('resize', measure);
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(t);
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    if (tables.length === 0) {
        return (
            <p className="py-12 text-center text-sm text-text">No database schema was generated.</p>
        );
    }

    const relatedTables = new Set<string>();
    relationships.forEach((r) => {
        relatedTables.add(r.from);
        relatedTables.add(r.to);
    });
    const cols = Math.max(1, columns.length);

    return (
        <div className="space-y-6">
            <CanvasViewport
                toolbar={
                    <span className="hidden h-7 items-center rounded-lg border border-border bg-[color:var(--surface)]/90 px-2.5 text-[10px] font-bold text-text sm:flex">
                        {tables.length} tables · {relationships.length} links
                    </span>
                }
            >
                <div
                    ref={contentRef}
                    className="relative p-6"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, 240px)`,
                        columnGap: TABLE_COL_GAP,
                        rowGap: TABLE_ROW_GAP,
                        justifyContent: 'start',
                        alignItems: 'start',
                        width: 'max-content',
                    }}
                >
                    <svg
                        className="pointer-events-none absolute inset-0"
                        width={size.width}
                        height={size.height}
                        style={{ overflow: 'visible' }}
                    >
                        {edges.map((e, i) => {
                            const midX = (e.x1 + e.x2) / 2;
                            const d = roundedElbowPath(e.x1, e.y1, e.x2, e.y2);
                            const [leftToken, rightToken] = splitCardinality(e.cardinality);
                            return (
                                <g key={`${e.from}-${e.to}-${i}`}>
                                    <path
                                        d={d}
                                        fill="none"
                                        strokeWidth={2}
                                        className="stroke-neutral-900 dark:stroke-white"
                                        strokeLinecap="round"
                                    />
                                    <CardinalityMarker cx={e.x1} cy={e.y1} dir={1} token={leftToken} />
                                    <CardinalityMarker cx={e.x2} cy={e.y2} dir={-1} token={rightToken} />
                                    <g transform={`translate(${midX}, ${(e.y1 + e.y2) / 2})`}>
                                        <rect
                                            x={-64}
                                            y={-11}
                                            width={128}
                                            height={22}
                                            rx={11}
                                            className="fill-[color:var(--surface)] stroke-border"
                                        />
                                        <text
                                            x={0}
                                            y={4}
                                            textAnchor="middle"
                                            className="fill-neutral-900 dark:fill-white"
                                            style={{ fontSize: 10, fontWeight: 700 }}
                                        >
                                            {cardinalityLabel(leftToken, true)} →{' '}
                                            {cardinalityLabel(rightToken, false)}
                                        </text>
                                    </g>
                                </g>
                            );
                        })}
                    </svg>

                    {columns.map((colTables, colIdx) =>
                        colTables.map((table, rowIdx) => (
                            <div key={table.name} style={{ gridColumn: colIdx + 1, gridRow: rowIdx + 1 }}>
                                <TableCard
                                    table={table}
                                    index={colIdx + rowIdx}
                                    highlight={relatedTables.has(table.name)}
                                    nodeRef={(el) => {
                                        if (el) nodeRefs.current.set(table.name, el);
                                        else nodeRefs.current.delete(table.name);
                                    }}
                                    columnRef={(columnName, el) => {
                                        const key = `${table.name}.${columnName}`;
                                        if (el) columnRefs.current.set(key, el);
                                        else columnRefs.current.delete(key);
                                    }}
                                />
                            </div>
                        )),
                    )}
                </div>
            </CanvasViewport>

            {relationships.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]">
                    <div className="flex items-center gap-2 bg-neutral-900 px-4 py-3 dark:bg-white">
                        <TbLink className="h-4 w-4 shrink-0 text-white dark:text-neutral-900" />
                        <h4 className="text-sm font-black text-white dark:text-neutral-900">
                            Relationship List
                        </h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max text-xs">
                            <thead>
                                <tr className="border-b border-border text-left text-text">
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide">
                                        From
                                    </th>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide">
                                        Type
                                    </th>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide">
                                        To
                                    </th>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide">
                                        Label
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {relationships.map((rel, i) => {
                                    const [leftToken, rightToken] = splitCardinality(rel.cardinality);
                                    return (
                                        <tr
                                            key={`${rel.from}-${rel.to}-${i}`}
                                            className="border-b border-border/60 last:border-0"
                                        >
                                            <td className="whitespace-nowrap px-4 py-2 font-mono font-semibold text-text-h">
                                                {rel.from}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="font-mono text-[10px] text-text">
                                                        {rel.cardinality}
                                                    </span>
                                                    <span className="font-semibold text-text-h">
                                                        {cardinalityLabel(leftToken, true)} →{' '}
                                                        {cardinalityLabel(rightToken, false)}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2 font-mono font-semibold text-text-h">
                                                {rel.to}
                                            </td>
                                            <td className="px-4 py-2 text-text">{rel.label || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Page Flow: left-to-right graph with SVG connectors ──────────────────── */

function FlowNodeBox({
    step,
    number,
    nodeRef,
}: {
    step: FlowStep;
    number: number;
    nodeRef: (el: HTMLDivElement | null) => void;
}): JSX.Element {
    return (
        <div
            ref={nodeRef}
            className="flex w-52 items-center gap-2 rounded-2xl border-2 border-border bg-[color:var(--surface)] px-4 py-3 shadow-sm"
        >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-black text-white dark:bg-white dark:text-neutral-900">
                {number}
            </span>
            <span className="text-xs font-bold leading-tight text-text-h">{step.label}</span>
        </div>
    );
}

const NODE_W = 208;
const COL_GAP = 96;
const ROW_GAP = 28;

export function PageFlowView({ parsed }: { parsed: ParsedFlow | null }): JSX.Element {
    const flow = parsed ?? { steps: [], transitions: [] };
    const levels = useMemo(() => buildFlowLevels(flow), [flow]);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [edges, setEdges] = useState<
        Array<{ from: string; to: string; condition?: string; x1: number; y1: number; x2: number; y2: number }>
    >([]);

    const labelFor = (id: string): string => flow.steps.find((s) => s.id === id)?.label || id;
    const flatOrder = levels.flatMap((l) => l.nodes);

    const measure = useCallback(() => {
        const content = contentRef.current;
        if (!content) return;
        const cRect = content.getBoundingClientRect();
        const scale = cRect.width / (content.offsetWidth || cRect.width) || 1;
        const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
        nodeRefs.current.forEach((el, id) => {
            const r = el.getBoundingClientRect();
            positions.set(id, {
                x: (r.left - cRect.left) / scale,
                y: (r.top - cRect.top) / scale,
                w: r.width / scale,
                h: r.height / scale,
            });
        });

        const next: typeof edges = [];
        flow.transitions.forEach((t) => {
            const a = positions.get(t.from);
            const b = positions.get(t.to);
            if (!a || !b) return;
            next.push({
                from: t.from,
                to: t.to,
                condition: t.condition,
                x1: a.x + a.w,
                y1: a.y + a.h / 2,
                x2: b.x,
                y2: b.y + b.h / 2,
            });
        });
        setEdges(next);
        setSize({ width: content.offsetWidth, height: content.offsetHeight });
    }, [flow.transitions]);

    useEffect(() => {
        const raf = requestAnimationFrame(() => measure());
        const ro = new ResizeObserver(() => measure());
        if (contentRef.current) ro.observe(contentRef.current);
        const t = window.setTimeout(measure, 320);
        window.addEventListener('resize', measure);
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(t);
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    if (flow.steps.length === 0) {
        return <p className="py-12 text-center text-sm text-text">No page flow was generated.</p>;
    }

    const cols = Math.max(1, levels.length);

    return (
        <div className="space-y-6">
            <CanvasViewport
                toolbar={
                    <span className="hidden h-7 items-center rounded-lg border border-border bg-[color:var(--surface)]/90 px-2.5 text-[10px] font-bold text-text sm:flex">
                        {flow.steps.length} pages
                    </span>
                }
            >
                <div
                    ref={contentRef}
                    className="relative p-6"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, ${NODE_W}px)`,
                        columnGap: COL_GAP,
                        rowGap: ROW_GAP,
                        justifyContent: 'start',
                        width: 'max-content',
                    }}
                >
                    <svg
                        className="pointer-events-none absolute inset-0"
                        width={size.width}
                        height={size.height}
                        style={{ overflow: 'visible' }}
                    >
                        <defs>
                            <marker
                                id="pf-arrow"
                                viewBox="0 0 10 10"
                                refX="8"
                                refY="5"
                                markerWidth="7"
                                markerHeight="7"
                                orient="auto-start-reverse"
                            >
                                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-neutral-900 dark:fill-white" />
                            </marker>
                        </defs>
                        {edges.map((e, i) => {
                            const midX = (e.x1 + e.x2) / 2;
                            const d = smoothPath(e.x1, e.y1, e.x2, e.y2);
                            return (
                                <g key={`${e.from}-${e.to}-${i}`}>
                                    <path
                                        d={d}
                                        fill="none"
                                        strokeWidth={2}
                                        className="stroke-neutral-900 dark:stroke-white"
                                        markerEnd="url(#pf-arrow)"
                                        strokeLinecap="round"
                                    />
                                    {e.condition && (
                                        <g transform={`translate(${midX}, ${(e.y1 + e.y2) / 2})`}>
                                            <rect
                                                x={-34}
                                                y={-9}
                                                width={68}
                                                height={18}
                                                rx={9}
                                                className="fill-[color:var(--surface)] stroke-border"
                                            />
                                            <text
                                                x={0}
                                                y={4}
                                                textAnchor="middle"
                                                className="fill-neutral-900 dark:fill-white"
                                                style={{ fontSize: 10, fontWeight: 700 }}
                                            >
                                                {e.condition.length > 14
                                                    ? `${e.condition.slice(0, 13)}…`
                                                    : e.condition}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {levels.map((level) =>
                        level.nodes.map((node, rowIdx) => (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: level.depth * 0.08 + rowIdx * 0.05 }}
                                style={{ gridColumn: level.depth + 1, gridRow: rowIdx + 1 }}
                            >
                                <FlowNodeBox
                                    step={node}
                                    number={flatOrder.findIndex((s) => s.id === node.id) + 1}
                                    nodeRef={(el) => {
                                        if (el) nodeRefs.current.set(node.id, el);
                                        else nodeRefs.current.delete(node.id);
                                    }}
                                />
                            </motion.div>
                        )),
                    )}
                </div>
            </CanvasViewport>

            {flow.transitions.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]">
                    <div className="flex items-center gap-2 bg-neutral-900 px-4 py-3 dark:bg-white">
                        <TbArrowNarrowRight className="h-4 w-4 shrink-0 text-white dark:text-neutral-900" />
                        <h4 className="text-sm font-black text-white dark:text-neutral-900">
                            Transitions
                        </h4>
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-white/60 dark:text-neutral-900/60">
                            {flow.transitions.length} edges
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max text-xs">
                            <thead>
                                <tr className="border-b border-border text-left text-text">
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide">
                                        From
                                    </th>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide">
                                        To
                                    </th>
                                    <th className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide">
                                        Condition
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {flow.transitions.map((t, i) => (
                                    <tr
                                        key={`${t.from}-${t.to}-${i}`}
                                        className="border-b border-border/60 last:border-0"
                                    >
                                        <td className="whitespace-nowrap px-4 py-2 font-semibold text-text-h">
                                            {labelFor(t.from)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2">
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-text-h">
                                                <TbArrowNarrowRight className="h-3.5 w-3.5 shrink-0 text-text" />
                                                {labelFor(t.to)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-text">{t.condition || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
