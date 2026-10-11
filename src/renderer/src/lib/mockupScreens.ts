/**
 * Derives a de-duplicated list of screen/page names to generate UI mockups for,
 * using (in priority order): parsed flow-step labels, mermaid node labels from
 * the raw page flow, then screen-looking markdown headings from the PRD.
 */
export const deriveScreenNames = (
    prdMarkdown: string,
    pageFlow: string,
    flowLabels: string[] = [],
): string[] => {
    const names = new Set<string>();

    // 1. Prefer explicit flow step labels when available.
    flowLabels.forEach((l) => {
        const clean = l.trim();
        if (clean && clean.length <= 60) names.add(clean);
    });

    // 2. Fall back to parsing mermaid node labels out of the raw page-flow
    //    source, e.g. `A[Home Screen]` or `B{Login?}`.
    if (names.size < 4 && pageFlow) {
        const nodeRe = /[A-Za-z0-9_]+(?:\[|\(|{)([^\])}]{2,60})(?:\]|\)|})/g;
        let n: RegExpExecArray | null;
        while ((n = nodeRe.exec(pageFlow)) !== null) {
            const label = n[1].replace(/["'`]/g, '').trim();
            if (label && label.length <= 60) names.add(label);
            if (names.size >= 10) break;
        }
    }

    // 3. Look for markdown "##" / "###" headings that look like screens/pages.
    if (names.size < 4) {
        const re = /^#{2,3}\s+(.+)$/gm;
        let m: RegExpExecArray | null;
        while ((m = re.exec(prdMarkdown)) !== null) {
            const h = m[1].replace(/[*_`]/g, '').trim();
            if (
                h.length <= 60 &&
                /(screen|page|dashboard|home|profile|settings|login|sign|checkout|list|detail|onboard|search|admin|cart|feed)/i.test(
                    h,
                )
            ) {
                names.add(h);
            }
            if (names.size >= 10) break;
        }
    }

    return Array.from(names).slice(0, 10);
};

/** The kind of page a mockup target represents, used to guide layout density. */
export type MockupPageCategory = 'landing' | 'dashboard' | 'main' | 'other';

/** A single screen to generate a mockup for, with its auto-detected category. */
export interface MockupTarget {
    name: string;
    category: MockupPageCategory;
}

/** Human labels for each page category (UI-facing). */
export const MOCKUP_CATEGORY_LABELS: Record<MockupPageCategory, string> = {
    landing: 'Landing page',
    dashboard: 'Dashboard',
    main: 'Main screen',
    other: 'Other screen',
};

/** Order categories are listed in the picker. */
export const MOCKUP_CATEGORY_ORDER: MockupPageCategory[] = [
    'landing',
    'dashboard',
    'main',
    'other',
];

/**
 * Classifies a single screen name into a page category using keyword heuristics.
 * Landing = public marketing pages, Dashboard = authenticated app shell, Main =
 * the product's core working screen; anything else falls back to `other`.
 */
export const classifyPage = (name: string): MockupPageCategory => {
    const n = name.toLowerCase();

    // Landing / public marketing surface.
    if (
        /(landing|marketing|home\s*page|homepage|^home$|^beranda$|halaman\s*utama|hero|pricing|^pricing|about|^about$|features?\b|public|^index$|waitlist|coming\s*soon|tentang)/i.test(
            n,
        )
    ) {
        return 'landing';
    }

    // Dashboard / authenticated app shell.
    if (
        /(dashboard|admin|analytics|overview|metric|kpi|report|insight|console|panel\s*admin|back\s*office)/i.test(
            n,
        )
    ) {
        return 'dashboard';
    }

    // Core working screen (feed, list, detail, editor, checkout, settings…).
    if (
        /(shop|store|catalog|product|cart|checkout|order|list|feed|detail|profile|settings|inbox|chat|message|calendar|kanban|board|editor|form|table|search|hasil|katalog|daftar|pesanan|pengaturan|profil)/i.test(
            n,
        )
    ) {
        return 'main';
    }

    return 'other';
};

/**
 * Builds the list of mockup targets for the PRD: every derived screen name
 * tagged with its auto-detected category. Order is preserved (flow order first).
 */
export const derivePageTargets = (
    prdMarkdown: string,
    pageFlow: string,
    flowLabels: string[] = [],
): MockupTarget[] =>
    deriveScreenNames(prdMarkdown, pageFlow, flowLabels).map((name) => ({
        name,
        category: classifyPage(name),
    }));

/**
 * Detects which page categories actually exist in the PRD, so the UI can offer
 * only the relevant options (e.g. no dashboard page → no Dashboard checkbox).
 */
export const detectAvailableCategories = (targets: MockupTarget[]): MockupPageCategory[] => {
    const present = new Set(targets.map((t) => t.category));
    return MOCKUP_CATEGORY_ORDER.filter((c) => present.has(c));
};
