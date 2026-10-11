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
