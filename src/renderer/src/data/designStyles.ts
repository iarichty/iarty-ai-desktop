/**
 * Curated catalog of 20 ready-made visual design styles for the PRD Builder.
 *
 * Each style is distilled from a hand-crafted landing page reference and ships
 * with real design tokens (palette, typography, motion, imagery cues) plus a
 * dummy Unsplash photo used to preview the mood to the user.
 *
 * The user picks ONE style here and the AI design step then *implements* that
 * chosen direction for the product instead of inventing styles from scratch.
 */

export interface DesignPalette {
    /** Hex color used as the page / canvas background. */
    background: string;
    /** Primary surface / card color sitting on top of the background. */
    surface: string;
    /** Main text color. */
    text: string;
    /** Signature brand accent color. */
    accent: string;
    /** Secondary accent (gradients, highlights). */
    secondary: string;
    /** Hairline border / divider color. */
    border: string;
}

export interface DesignTypography {
    /** Display / headline font family. */
    headline: string;
    /** Body font family. */
    body: string;
    /** Headline weight + casing description. */
    headline_style: string;
    /** Body weight + casing description. */
    body_style: string;
    /** Google Fonts families to load. */
    google_fonts: string[];
}

export interface DesignStyle {
    id: string;
    /** Numbered slot (1-20) matching the landing page reference. */
    order: number;
    name: string;
    tagline: string;
    description: string;
    /** Short slug of the visual mood, used as a chip. */
    mood: string;
    /** Industries / product types this style fits best. */
    best_for: string[];
    /** Raw hex palette swatches (matches DesignPalette, flattened). */
    color_palette: string[];
    palette: DesignPalette;
    typography: DesignTypography;
    /** Structural / layout rules the implementation must follow. */
    layout: string[];
    /** Decorative and motion rules. */
    motion: string[];
    /** Concrete implementation notes for the AI when building the UI. */
    implementation_notes: string[];
    /** Dummy Unsplash photo IDs (bare id, no prefix) for previews. */
    unsplash: string[];
    /** Reference landing page filename this style was distilled from. */
    reference: string;
}

export const UNSPLASH_PREFIX = 'https://images.unsplash.com/photo-';
export const UNSPLASH_SUFFIX = '?w=1000&q=70&auto=format&fit=crop';

/** Builds a full Unsplash URL from a bare photo id stored in the catalog. */
export const unsplashUrl = (id: string, width = 1000): string =>
    `${UNSPLASH_PREFIX}${id}?w=${width}&q=70&auto=format&fit=crop`;

export const DESIGN_STYLES: DesignStyle[] = [
    {
        id: 'quiet-luxury-fashion',
        order: 1,
        name: 'Quiet Luxury',
        tagline: 'Editorial serif, warm neutrals, slow fashion energy',
        description:
            'An understated editorial look built on warm paper tones, a high-contrast serif display face, and generous negative space. Feels like a timeless atelier — refined, calm, and expensive without shouting.',
        mood: 'Editorial · Refined',
        best_for: ['Fashion & apparel', 'Luxury goods', 'Editorial / lifestyle brands'],
        color_palette: ['#f4efe8', '#111111', '#8a6f4d', '#cdbba3', '#2b2118'],
        palette: {
            background: '#f4efe8',
            surface: '#ffffff',
            text: '#111111',
            accent: '#8a6f4d',
            secondary: '#cdbba3',
            border: '#11111120',
        },
        typography: {
            headline: "'Playfair Display', serif",
            body: "'Inter', sans-serif",
            headline_style: '500 weight serif, mixed roman + italic, very large scale',
            body_style: '300 weight sans-serif, 15px / 1.7 line-height',
            google_fonts: ['Playfair+Display:ital,wght@0,500;1,500', 'Inter:wght@300;400'],
        },
        layout: [
            'Asymmetric hero: 1.1fr text / 1fr tall 3:4 image',
            'Generous side padding (5vw), thin hairlines instead of heavy borders',
            'Product / feature grid in 3 columns with 4:5 media blocks',
        ],
        motion: [
            'Letters of headings slide up from a clip mask on scroll (yPercent 110)',
            'Cards fade + rise 50px with a 0.12s stagger on enter',
            'Hover: filled button inverts to solid ink with paper text',
        ],
        implementation_notes: [
            'Use a single italic accent word inside each headline colored with the accent tone',
            'All caps, letter-spaced micro-labels (0.2em) for nav and meta text',
            'Buttons are outlined by default and invert to solid on hover',
        ],
        unsplash: ['1469334031218-e382a71b716b', '1483985988355-763728e1935b', '1490481651871-ab68de25d43d'],
        reference: '1-fashion.html',
    },
    {
        id: 'brutalist-pop-agency',
        order: 2,
        name: 'Brutalist Pop',
        tagline: 'Thick black outlines, hard shadows, neon accents',
        description:
            'A loud, confident studio aesthetic: 4px black outlines, offset hard shadows, and unapologetic blocks of candy color. Everything snaps and shifts on hover. Built to be unignorable.',
        mood: 'Bold · Playful',
        best_for: ['Creative agencies', 'Portfolios', 'Event & pop-culture brands'],
        color_palette: ['#ffffff', '#000000', '#ffe600', '#ff5ca8', '#5cd0ff', '#9dff6b'],
        palette: {
            background: '#ffffff',
            surface: '#ffe600',
            text: '#000000',
            accent: '#ffe600',
            secondary: '#ff5ca8',
            border: '#000000',
        },
        typography: {
            headline: "'Space Grotesk', sans-serif",
            body: "'Space Grotesk', sans-serif",
            headline_style: '700 weight, uppercase, tight tracking (-0.04em), huge scale',
            body_style: '500 weight, 17px / 1.5',
            google_fonts: ['Space+Grotesk:wght@500;700'],
        },
        layout: [
            'Full-bleed uppercase headline with highlighted (box-shadow) accent words',
            '3-column card grid where each card is a different bright color',
            'Marquee ticker strip in inverted inks between sections',
        ],
        motion: [
            'Cards translate(-4px,-4px) on hover and grow their hard shadow 10px→14px',
            'Headline words rise from clip mask on scroll',
            'Hover states change fill instantly — no soft easing',
        ],
        implementation_notes: [
            'Borders: exactly 4px solid black everywhere; shadows are solid, never blurred',
            'Use accent word wrapped in a highlight box with 8px offset black shadow',
            'Keep bright colors flat — no gradients',
        ],
        unsplash: ['1522071820081-009f0129c71c', '1542744173-8e7e53415bb0', '1553877522-43269d4ea984'],
        reference: '2-agency.html',
    },
    {
        id: 'warm-cozy-cafe',
        order: 3,
        name: 'Warm & Cozy',
        tagline: 'Cream + brown, soft blobs, rounded everything',
        description:
            'A friendly, appetizing aesthetic with warm cream backgrounds, caramel accents, and organic blob shapes. Playful rounded cards and pill buttons make it feel hand-made and welcoming.',
        mood: 'Warm · Friendly',
        best_for: ['Cafés & restaurants', 'Food brands', 'Local businesses'],
        color_palette: ['#f6ead9', '#4a2c1a', '#d9772b', '#fff8ee', '#2f1a0e'],
        palette: {
            background: '#f6ead9',
            surface: '#fff8ee',
            text: '#4a2c1a',
            accent: '#d9772b',
            secondary: '#4a2c1a',
            border: '#4a2c1a30',
        },
        typography: {
            headline: "'Fraunces', serif",
            body: "'DM Sans', sans-serif",
            headline_style: '800 weight Fraunces, large, with one colored italic word',
            body_style: '400 weight, 17px / 1.6',
            google_fonts: ['Fraunces:wght@600;800', 'DM+Sans:wght@400;500'],
        },
        layout: [
            'Centered hero with an organic blob-shaped image behind an emoji/icon',
            '3-column menu cards on light cream surfaces',
            'Full-width dark footer section with rounded top corners',
        ],
        motion: [
            'Cards fade + rise on scroll with stagger',
            'Headline words rise from clip mask',
            'Subtle hover lift on cards',
        ],
        implementation_notes: [
            'Blob shape: border-radius 62% 38% 55% 45% / 50% 55% 45% 50%',
            'Buttons and chips are fully rounded (99px) pills in accent color',
            'Cards use 28px radius and a soft cream fill',
        ],
        unsplash: ['1495474472287-4d71bcdd2085', '1509042239860-f550ce710b93'],
        reference: '3-cafe.html',
    },
    {
        id: 'romantic-wedding',
        order: 4,
        name: 'Romantic Elegance',
        tagline: 'Ivory + sage, engraved serif, slow cinematic fades',
        description:
            'A timeless invitation-style look: ivory paper, deep forest and clay accents, and a delicate Cormorant serif. Imagery parallaxes gently and typography fades in like a ceremony unfolding.',
        mood: 'Romantic · Timeless',
        best_for: ['Weddings', 'Event invitations', 'Boutique hospitality'],
        color_palette: ['#f2ece1', '#2b2a24', '#33402f', '#b0664a', '#cdbfa8'],
        palette: {
            background: '#f2ece1',
            surface: '#e8dfcf',
            text: '#2b2a24',
            accent: '#33402f',
            secondary: '#b0664a',
            border: '#2b2a2440',
        },
        typography: {
            headline: "'Cormorant Garamond', serif",
            body: "'Jost', sans-serif",
            headline_style: 'Italic 400 Cormorant, clamp up to 190px for hero names',
            body_style: '300 weight Jost, wide, 16px / 1.8',
            google_fonts: ['Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600', 'Jost:wght@300;400'],
        },
        layout: [
            'Full-bleed cinematic hero with dark overlay and centered serif title',
            'Fixed transparent nav that blends with imagery (mix-blend-mode: difference)',
            'Alternating editorial story blocks and a masonry photo gallery',
        ],
        motion: [
            'Background photos parallax (yPercent -6 → 6) tied to scroll',
            'Headline letters fade/rise with a slow stagger',
            'Sections fade in gently (opacity + y 50)',
        ],
        implementation_notes: [
            'Wide letter-spaced uppercase micro-labels (0.3em) for dates and meta',
            'Roman numerals or serif markers for event / step cards',
            'Borders are thin (1px) hairlines, never heavy',
        ],
        unsplash: ['1519741497674-611481863552', '1511285560929-80b456fea0bc', '1465495976277-4387d4b0b4c6'],
        reference: '4-wedding.html',
    },
    {
        id: 'serene-wellness-spa',
        order: 5,
        name: 'Serene Wellness',
        tagline: 'Soft sage, arched imagery, breathing whitespace',
        description:
            'A calm sanctuary aesthetic with muted sage greens, rounded arch images, and flowing serif headings. Every element is spaced to slow the reader down and feel restorative.',
        mood: 'Calm · Organic',
        best_for: ['Spas & wellness', 'Health apps', 'Meditation / mindfulness'],
        color_palette: ['#eef2ea', '#34423a', '#7b9a82', '#f9faf6', '#dfe8d6'],
        palette: {
            background: '#eef2ea',
            surface: '#f9faf6',
            text: '#34423a',
            accent: '#7b9a82',
            secondary: '#a9c0ae',
            border: '#34423a20',
        },
        typography: {
            headline: "'Cormorant Garamond', serif",
            body: "'Nunito', sans-serif",
            headline_style: '500 Cormorant, large, one sage accent word',
            body_style: '300 Nunito, airy, 17px / 1.8',
            google_fonts: ['Cormorant+Garamond:wght@500;600', 'Nunito:wght@300;400;600'],
        },
        layout: [
            'Two-column hero with a tall arch-shaped image (radius 999px top)',
            '3-column treatment cards on light surface with rounded 26px corners',
            'Dark rounded booking band as a focal CTA',
        ],
        motion: [
            'Sections and cards fade + rise on scroll',
            'Headline words rise from clip mask',
            'Gentle hover elevation on cards',
        ],
        implementation_notes: [
            'Use arch shapes (border-radius 999px 999px 24px 24px) for hero imagery',
            'Feature cards: rounded 26px, soft surface color, centered icons',
            'Accent buttons are pill-shaped in sage with white text',
        ],
        unsplash: ['1544161515-4ab6ce6db874', '1540555700478-4be289fbecef'],
        reference: '5-wellness.html',
    },
    {
        id: 'architectural-property',
        order: 6,
        name: 'Architectural',
        tagline: 'Massive grotesque type, ultra-minimal, grid-true',
        description:
            'A composition-led look with an oversized Archivo headline at near-hundred-percent width, strict grids, and hairlines. Photography is treated as architectural material, not decoration.',
        mood: 'Minimal · Structural',
        best_for: ['Real estate', 'Architecture studios', 'Premium listings'],
        color_palette: ['#f4f3ef', '#111111', '#8c8c8c', '#d8d6cf', '#2a2a2a'],
        palette: {
            background: '#f4f3ef',
            surface: '#ffffff',
            text: '#111111',
            accent: '#111111',
            secondary: '#8c8c8c',
            border: '#11111120',
        },
        typography: {
            headline: "'Archivo', sans-serif",
            body: "'Archivo', sans-serif",
            headline_style: '800 Archivo, letterspacing -0.05em, up to 170px',
            body_style: '400 Archivo, 16px / 1.6',
            google_fonts: ['Archivo:wght@400;800'],
        },
        layout: [
            'Full-width hero headline spanning nearly the whole viewport',
            'Strict 3-column property grid with consistent aspect ratios',
            'Generous 6-7vw section padding and thin divider lines',
        ],
        motion: [
            'Headline words rise from clip mask on scroll',
            'Property cards fade + rise with stagger',
        ],
        implementation_notes: [
            'Let the hero headline dominate — large type is the primary graphic',
            'Use hairlines (1px, ~12% opacity) instead of boxes',
            'Neutral monochrome palette; photography supplies all color',
        ],
        unsplash: ['1600596542815-ffad4c1539a9', '1512917774080-9991f1c4c750', '1486406146926-c627a92ad1ab'],
        reference: '6-property.html',
    },
    {
        id: 'high-energy-gym',
        order: 7,
        name: 'High-Energy Athletic',
        tagline: 'Black canvas, acid-lime, condensed display type',
        description:
            'A pure-motion aesthetic: near-black background, a single acid-lime accent, and huge condensed Anton headlines. Diagonal clip-path section breaks add speed and aggression.',
        mood: 'Intense · Kinetic',
        best_for: ['Fitness & gyms', 'Sports brands', 'Performance apps'],
        color_palette: ['#0b0b0b', '#f2f2f2', '#c8ff00', '#1a1a1a', '#8a8a8a'],
        palette: {
            background: '#0b0b0b',
            surface: '#1a1a1a',
            text: '#f2f2f2',
            accent: '#c8ff00',
            secondary: '#c8ff00',
            border: '#ffffff18',
        },
        typography: {
            headline: "'Anton', sans-serif",
            body: "'Barlow', sans-serif",
            headline_style: '400 Anton, uppercase, up to 180px, line-height .92',
            body_style: '400 Barlow, 17px / 1.6',
            google_fonts: ['Anton', 'Barlow:wght@400;600'],
        },
        layout: [
            'Full-viewport hero anchored to the bottom-left with overlay text',
            'Diagonal section break using clip-path polygon',
            'Bold on-black accent blocks between program sections',
        ],
        motion: [
            'Headline words slide up from a clip mask',
            'Sections fade + rise on scroll',
        ],
        implementation_notes: [
            'One accent color only (acid lime) used sparingly for impact',
            'Diagonal cut: clip-path polygon(0 8%, 100% 0, 100% 100%, 0 100%)',
            'Nav CTA is a solid lime block with black uppercase text',
        ],
        unsplash: ['1534438327276-14e5300c3a48', '1571019613454-1cb2f99b2d8b', '1517836357463-d25dfeac3438'],
        reference: '7-gym.html',
    },
    {
        id: 'wanderlust-travel',
        order: 8,
        name: 'Wanderlust',
        tagline: 'Cream + teal, fat-featured display, pill outline buttons',
        description:
            'A postcard-inspired look with cream paper, a warm teal headline and coral accents. Abril Fatface display type and outlined pill buttons give it a joyful editorial travel feel.',
        mood: 'Editorial · Adventurous',
        best_for: ['Travel & tourism', 'Hospitality', 'Discovery apps'],
        color_palette: ['#f6f1e7', '#2a2118', '#1f6f6b', '#eb6a3a', '#ffffff'],
        palette: {
            background: '#f6f1e7',
            surface: '#ffffff',
            text: '#2a2118',
            accent: '#1f6f6b',
            secondary: '#eb6a3a',
            border: '#2a211830',
        },
        typography: {
            headline: "'Abril Fatface', serif",
            body: "'Work Sans', sans-serif",
            headline_style: '400 Abril Fatface, teal, up to 100px, one coral accent word',
            body_style: '400 Work Sans, 17px / 1.6',
            google_fonts: ['Abril+Fatface', 'Work+Sans:wght@400;600'],
        },
        layout: [
            'Split hero with editorial copy and a 4:5 destination photo',
            '3-column destination cards',
            'Coral full-width CTA band',
        ],
        motion: [
            'Headline words rise from clip mask',
            'Cards fade + rise with stagger',
        ],
        implementation_notes: [
            'Outline pill buttons with 2px border for secondary actions',
            'Teal for headlines, coral reserved for primary CTA',
            'Use rounded destination cards with photo headers',
        ],
        unsplash: ['1537996194471-e657df975ab4', '1518548419970-58e3b4079ab2', '1506905925346-21bda4d32df4'],
        reference: '8-travel.html',
    },
    {
        id: 'prestige-law',
        order: 9,
        name: 'Prestige & Trust',
        tagline: 'Navy + gold, classic serif, inset photo frames',
        description:
            'A dignified professional look: deep navy panels, antique-gold rules, and a Baskerville serif. Portraits sit inside double inset frames, signalling authority and tradition.',
        mood: 'Professional · Established',
        best_for: ['Law firms', 'Financial services', 'Consulting'],
        color_palette: ['#faf8f3', '#1d2433', '#1b2c4d', '#b08d57', '#0e1b33'],
        palette: {
            background: '#faf8f3',
            surface: '#1b2c4d',
            text: '#1d2433',
            accent: '#b08d57',
            secondary: '#1b2c4d',
            border: '#1d243330',
        },
        typography: {
            headline: "'Libre Baskerville', serif",
            body: "'Source Sans 3', sans-serif",
            headline_style: '700 Libre Baskerville, up to 72px, gold-highlighted italic word',
            body_style: '400 Source Sans 3, 17px / 1.7',
            google_fonts: ['Libre+Baskerville:wght@400;700', 'Source+Sans+3:wght@400;600'],
        },
        layout: [
            'Navy hero split with inset-framed portrait (aspect 4/5)',
            'Team grid with framed portraits',
            'Quiet cream body sections with uppercase micro-labels',
        ],
        motion: ['Sections fade + rise on scroll', 'Headline words rise from clip mask'],
        implementation_notes: [
            'Inset photo frame: 1px gold border with 12px inset outline (outline-offset -24px)',
            'Uppercase letter-spaced (0.15em) micro-labels in gold',
            'Use navy panels for emphasis sections, cream for body',
        ],
        unsplash: ['1589829545856-d10d557cf95f', '1560250097-0b93528c311a', '1573496359142-b8d87734a5a2'],
        reference: '9-law.html',
    },
    {
        id: 'playful-kids',
        order: 10,
        name: 'Playful & Bright',
        tagline: 'Candy colors, chunky rounded type, candy blobs',
        description:
            'A cheerful, tactile look with butter-yellow backgrounds, candy pink and mint accents, and chunky Fredoka type. Blob imagery and 3D-lifted buttons make everything feel edible and fun.',
        mood: 'Fun · Cheerful',
        best_for: ['Kids & family apps', 'Education', 'Games'],
        color_palette: ['#fff7e0', '#2b2b4a', '#ff6fa5', '#ffd86b', '#3ccf91'],
        palette: {
            background: '#fff7e0',
            surface: '#ffffff',
            text: '#2b2b4a',
            accent: '#ff6fa5',
            secondary: '#3ccf91',
            border: '#2b2b4a20',
        },
        typography: {
            headline: "'Fredoka', sans-serif",
            body: "'Fredoka', sans-serif",
            headline_style: '600 Fredoka, up to 84px, one pink accent word',
            body_style: '400 Fredoka, rounded, 18px / 1.6',
            google_fonts: ['Fredoka:wght@400;600'],
        },
        layout: [
            'Centered hero with a blob/rounded image and playful icon',
            '3-column rounded package cards',
            'Mint full-width CTA band',
        ],
        motion: ['Cards pop + rise on scroll', 'Headline words rise from clip mask'],
        implementation_notes: [
            'Buttons get a solid bottom shadow (box-shadow 0 4px 0 darker) for a 3D feel',
            'Blob imagery: border-radius 63% 37% 54% 46% / 55% 48% 52% 45% with thick white border',
            'Fully rounded pill buttons and chips',
        ],
        unsplash: ['1503454537195-1dcabb73ffb9', '1503676260728-1c00da094a0b', '1509062522246-3755977927d7'],
        reference: '10-kids.html',
    },
    {
        id: 'festival-poster',
        order: 11,
        name: 'Festival Poster',
        tagline: 'Electric blue + hot pink, mono, stadium-scale type',
        description:
            'A poster-like aesthetic built for impact: electric blue on warm paper, hot-pink CTA blocks, and enormous Bowlby One display type with tight leading. Monospace body copy adds a printed-program feel.',
        mood: 'Loud · Graphic',
        best_for: ['Festivals & events', 'Music & culture', 'Tickets & lineups'],
        color_palette: ['#f2ede4', '#2b35ff', '#ff4fa0', '#ffffff', '#111111'],
        palette: {
            background: '#f2ede4',
            surface: '#2b35ff',
            text: '#2b35ff',
            accent: '#ff4fa0',
            secondary: '#2b35ff',
            border: '#2b35ff40',
        },
        typography: {
            headline: "'Bowlby One', sans-serif",
            body: "'DM Mono', monospace",
            headline_style: '400 Bowlby One, uppercase, up to 230px, line-height .85',
            body_style: '400 DM Mono, 16px / 1.6',
            google_fonts: ['Bowlby+One', 'DM+Mono:wght@400;500'],
        },
        layout: [
            'Giant display headline filling the width',
            'Wide 21:9 hero image with a 2px colored border',
            'Stacked lineup / schedule rows in monospace',
        ],
        motion: ['Headline words rise from clip mask', 'Sections fade + rise'],
        implementation_notes: [
            'Body text uses a monospace face for a printed-program vibe',
            'Hot-pink CTA band with white text as the primary conversion block',
            'Keep it flat: two ink colors on paper, no gradients',
        ],
        unsplash: ['1459749411175-04bf5292ceea', '1470229722913-7c0e2dbbafd3', '1514525253161-7a46d19cd819'],
        reference: '11-festival.html',
    },
    {
        id: 'zen-omakase',
        order: 12,
        name: 'Zen Minimal',
        tagline: 'Vertical type, vast whitespace, muted naturalism',
        description:
            'A quiet, gallery-like aesthetic with vertical writing-mode headlines, wide tracking, and muted clay and ash tones. Negative space is the subject; typography behaves like a scroll painting.',
        mood: 'Serene · Cultured',
        best_for: ['Fine dining', 'Craft & artisan brands', 'Art galleries'],
        color_palette: ['#f5f1ea', '#1c1c1c', '#d9d1c2', '#6b6b6b', '#8f8577'],
        palette: {
            background: '#f5f1ea',
            surface: '#d9d1c2',
            text: '#1c1c1c',
            accent: '#8f8577',
            secondary: '#6b6b6b',
            border: '#1c1c1c25',
        },
        typography: {
            headline: "'Shippori Mincho', serif",
            body: "'Shippori Mincho', serif",
            headline_style: '600 Shippori Mincho, vertical-rl writing mode, 0.15em tracking',
            body_style: '400 Shippori Mincho, 17px / 1.9 line-height',
            google_fonts: ['Shippori+Mincho:wght@400;600'],
        },
        layout: [
            'Three-column hero: vertical headline / tall image / vertical caption aside',
            'Ultra-generous padding and min-height 70vh imagery',
            'Sparse content rows with wide letter-spacing',
        ],
        motion: ['Very subtle fades — restrain motion', 'Sections fade + rise slowly'],
        implementation_notes: [
            'Use writing-mode: vertical-rl for the primary headline',
            'Keep the palette muted and low-contrast (ash / clay)',
            'Treat imagery as tall, framed panels rather than full-bleed sweeps',
        ],
        unsplash: ['1579871494447-9811cf80d66c', '1580822184713-fc5400e7fe10'],
        reference: '12-omakase.html',
    },
    {
        id: 'terminal-devtool',
        order: 13,
        name: 'Terminal / Devtool',
        tagline: 'Mono type, paper grid, brutalist shadows',
        description:
            'A no-nonsense developer aesthetic: paper-cream background, IBM Plex Mono everywhere, sharp 1px borders, and offset brutalist shadows with a lemon-yellow CTA. Looks like good documentation.',
        mood: 'Technical · Honest',
        best_for: ['Developer tools', 'Docs & APIs', 'SaaS dev platforms'],
        color_palette: ['#fbfaf5', '#111111', '#ffe14d', '#e6e3d6', '#556b2f'],
        palette: {
            background: '#fbfaf5',
            surface: '#e6e3d6',
            text: '#111111',
            accent: '#ffe14d',
            secondary: '#111111',
            border: '#111111',
        },
        typography: {
            headline: "'IBM Plex Mono', monospace",
            body: "'IBM Plex Mono', monospace",
            headline_style: '600 IBM Plex Mono, tracking -0.04em, up to 64px',
            body_style: '400 IBM Plex Mono, 15px / 1.7',
            google_fonts: ['IBM+Plex+Mono:wght@400;600'],
        },
        layout: [
            'Split hero with copy and a bordered product screenshot (shadow 10px 10px)',
            'Github-style code / metric cards',
            'Lemon-yellow CTA band with a 1px top border',
        ],
        motion: ['Sections fade + rise', 'Subtle code-block hover'],
        implementation_notes: [
            'Use IBM Plex Mono for BOTH headline and body for a terminal feel',
            'Product visuals: 1px border + solid 10px offset black shadow',
            'Lemon-yellow reserved for CTAs / highlights only',
        ],
        unsplash: ['1555066931-4365d14bab8c'],
        reference: '13-devtool.html',
    },
    {
        id: 'premium-ev',
        order: 14,
        name: 'Premium Futurist',
        tagline: 'Deep black, ultra-light type, cinematic gradients',
        description:
            'A luxe automotive aesthetic: pure black canvas, ultra-thin 200-weight headline type, and a cinematic bottom gradient over full-bleed imagery. Restraint and scale signal sophistication.',
        mood: 'Premium · Futuristic',
        best_for: ['Automotive / EV', 'Hardware', 'Luxury tech'],
        color_palette: ['#0a0a0a', '#eeeeee', '#1a1a1a', '#333333', '#bbbbbb'],
        palette: {
            background: '#0a0a0a',
            surface: '#1a1a1a',
            text: '#eeeeee',
            accent: '#eeeeee',
            secondary: '#bbbbbb',
            border: '#ffffff18',
        },
        typography: {
            headline: "'Outfit', sans-serif",
            body: "'Outfit', sans-serif",
            headline_style: '200 Outfit, tracking -0.03em, up to 120px, near-light',
            body_style: '300 Outfit, 17px / 1.7, muted',
            google_fonts: ['Outfit:wght@200;300;400'],
        },
        layout: [
            'Full-viewport hero photo with bottom-anchored copy and gradient',
            'Centered feature metrics / specs strip',
            'Thin 1px border CTA band',
        ],
        motion: ['Slow parallax on hero imagery', 'Sections fade + rise'],
        implementation_notes: [
            'Hero overlay: linear-gradient(0deg, #0a0a0a 5%, transparent 60%)',
            'Headline weight is ultra-light (200) — contrast comes from scale, not weight',
            'Borders are hairline 1px in ~10% white',
        ],
        unsplash: ['1617788138017-80ad40651399', '1593941707882-a5bba14938c7', '1503376780353-7e6692767b70'],
        reference: '14-ev.html',
    },
    {
        id: 'literary-books',
        order: 15,
        name: 'Literary Classic',
        tagline: 'Newsprint cream, bookish serif, deep red rules',
        description:
            'A printed-page aesthetic with aged paper, an Old Standard TT display face, and deep oxblood accents. Feels like a well-set book or a serious literary magazine.',
        mood: 'Classic · Intellectual',
        best_for: ['Publishing', 'Bookstores', 'Editorial & newsletters'],
        color_palette: ['#efe8d8', '#1a1a1a', '#b11d1d', '#d8cdb5', '#6b5f4a'],
        palette: {
            background: '#efe8d8',
            surface: '#f6f0e2',
            text: '#1a1a1a',
            accent: '#b11d1d',
            secondary: '#6b5f4a',
            border: '#1a1a1a25',
        },
        typography: {
            headline: "'Old Standard TT', serif",
            body: "'Libre Franklin', sans-serif",
            headline_style: '700 Old Standard TT, up to 170px, tight tracking',
            body_style: '400 Libre Franklin, 16px / 1.65',
            google_fonts: ['Old+Standard+TT:wght@400;700', 'Libre+Franklin:wght@400;600'],
        },
        layout: [
            'Editorial hero with a large book/cover image and column of type',
            'Grid of cover tiles with hairline captions',
            'Red rule dividers between sections',
        ],
        motion: ['Sections fade + rise', 'Headline words rise from clip mask'],
        implementation_notes: [
            'Sections separated by thin dark-red rules',
            'Serif display for headlines, clean sans for body',
            'Keep the palette paper-warm; red used only as an ink accent',
        ],
        unsplash: ['1521587760476-6c12a4b040da', '1512820790803-83ca734da794', '1495446815901-a7297e633e8d'],
        reference: '15-books.html',
    },
    {
        id: 'monochrome-photography',
        order: 16,
        name: 'Monochrome Studio',
        tagline: 'Near-black gallery, all-caps mono, photo-first',
        description:
            'A gallery-dark portfolio aesthetic where photography carries everything: pure near-black canvas, all-caps Space Mono headlines, and off-white text. Imagery is framed with tight, even gutters.',
        mood: 'Dramatic · Photo-first',
        best_for: ['Photographers', 'Portfolios', 'Creative studios'],
        color_palette: ['#0c0c0c', '#e8e6df', '#aaaaaa', '#1c1c1c', '#4a4a4a'],
        palette: {
            background: '#0c0c0c',
            surface: '#1c1c1c',
            text: '#e8e6df',
            accent: '#e8e6df',
            secondary: '#aaaaaa',
            border: '#ffffff14',
        },
        typography: {
            headline: "'Space Mono', monospace",
            body: "'Inter', sans-serif",
            headline_style: '700 Space Mono, uppercase, tracking -0.05em, up to 160px',
            body_style: '300 Inter, 16px / 1.7, muted grey',
            google_fonts: ['Space+Mono:wght@400;700', 'Inter:wght@300;400'],
        },
        layout: [
            'Dark hero with a large framed photo grid',
            'Tight, even-gutter photo mosaic',
            'Minimal captions in muted grey',
        ],
        motion: ['Photos fade + rise on scroll', 'Subtle hover zoom on tiles'],
        implementation_notes: [
            'Let photography dominate; UI chrome stays minimal and dark',
            'All-caps monospace headlines as the signature move',
            'Text in off-white (#e8e6df), body in muted grey',
        ],
        unsplash: ['1452587925148-ce544e77e70d', '1469474968028-56623f02e42e', '1472214103451-9374bd1c798e'],
        reference: '16-photographer.html',
    },
    {
        id: 'trusted-fintech',
        order: 17,
        name: 'Trusted Fintech',
        tagline: 'Clean white, confident green, hard-shadow buttons',
        description:
            'A crisp, credible fintech look: off-white canvas, deep-ink text, and a confident emerald accent. Manrope headings with tight tracking and buttons with solid bottom shadows signal reliability.',
        mood: 'Trustworthy · Modern',
        best_for: ['Fintech & banking', 'Insurance', 'B2B platforms'],
        color_palette: ['#f6f7f2', '#0f1e1a', '#00a86b', '#ffffff', '#d5dacb'],
        palette: {
            background: '#f6f7f2',
            surface: '#ffffff',
            text: '#0f1e1a',
            accent: '#00a86b',
            secondary: '#0f1e1a',
            border: '#0f1e1a20',
        },
        typography: {
            headline: "'Manrope', sans-serif",
            body: "'Manrope', sans-serif",
            headline_style: '800 Manrope, tracking -0.04em, up to 84px',
            body_style: '400 Manrope, 17px / 1.6',
            google_fonts: ['Manrope:wght@400;800'],
        },
        layout: [
            'Split hero with product/security illustration',
            '3-column trust / feature cards',
            'Emerald full-width CTA band with solid-ink button',
        ],
        motion: ['Sections fade + rise', 'Metric numbers count up on enter'],
        implementation_notes: [
            'Primary buttons: dark ink with solid bottom shadow (0 4px 0)',
            'Emerald reserved for trust indicators and the CTA band',
            'Roundness is subtle — 12-16px, not pill',
        ],
        unsplash: ['1556742049-0cfed4f6a45d'],
        reference: '17-fintech.html',
    },
    {
        id: 'craft-brewery',
        order: 18,
        name: 'Artisan Craft',
        tagline: 'Kraft paper, deep green + amber, slab display type',
        description:
            'A handcrafted goods aesthetic: kraft-paper background, deep bottle-green headlines in Alfa Slab One, and warm amber accents. Everything feels printed, tactile, and small-batch.',
        mood: 'Rustic · Craft',
        best_for: ['Craft food & drink', 'Breweries', 'Artisan retail'],
        color_palette: ['#e9dfc7', '#1f3a2b', '#d98a1c', '#2a2418', '#fffaf0'],
        palette: {
            background: '#e9dfc7',
            surface: '#fffaf0',
            text: '#2a2418',
            accent: '#d98a1c',
            secondary: '#1f3a2b',
            border: '#2a241830',
        },
        typography: {
            headline: "'Alfa Slab One', serif",
            body: "'Karla', sans-serif",
            headline_style: '400 Alfa Slab One, uppercase, deep green, up to 120px',
            body_style: '400 Karla, 17px / 1.65',
            google_fonts: ['Alfa+Slab+One', 'Karla:wght@400;600'],
        },
        layout: [
            'Split hero with a bottle/product photo',
            '3-column product cards on cream surface',
            'Amber full-width CTA band',
        ],
        motion: ['Sections fade + rise', 'Headline words rise from clip mask'],
        implementation_notes: [
            'Slab-serif display headings in deep green',
            'Amber for primary CTAs and price highlights',
            'Cream surface cards with slightly rounded corners',
        ],
        unsplash: ['1535958636474-b021ee887b13', '1608270586620-248524c67de9', '1575037614876-c38a4d44f5b8'],
        reference: '18-brewery.html',
    },
    {
        id: 'deep-ocean',
        order: 19,
        name: 'Deep Ocean',
        tagline: 'Navy immersion, serif display, coral accents',
        description:
            'An immersive, atmospheric look: a deep navy hero that fills the viewport with a bottom gradient, DM Serif Display headlines, and warm coral accents against cool blue.',
        mood: 'Immersive · Calm-bold',
        best_for: ['Marine & travel', 'SaaS with depth', 'Nonprofits'],
        color_palette: ['#ffffff', '#12233f', '#0b3d91', '#ff6b4a', '#061a3a'],
        palette: {
            background: '#ffffff',
            surface: '#0b2a5c',
            text: '#12233f',
            accent: '#ff6b4a',
            secondary: '#0b3d91',
            border: '#12233f20',
        },
        typography: {
            headline: "'DM Serif Display', serif",
            body: "'Public Sans', sans-serif",
            headline_style: '400 DM Serif Display, up to 120px',
            body_style: '400 Public Sans, 17px / 1.65',
            google_fonts: ['DM+Serif+Display', 'Public+Sans:wght@400;600'],
        },
        layout: [
            'Full-viewport navy hero with bottom gradient and anchored copy',
            'White content sections with ocean photography',
            'Coral full-width CTA band',
        ],
        motion: ['Hero parallax', 'Sections fade + rise'],
        implementation_notes: [
            'Hero overlay: linear-gradient(0deg, #061a3a 0%, rgba(6,26,58,.13) 70%)',
            'Serif display headlines in navy on white sections',
            'Coral is the single warm accent against the blue system',
        ],
        unsplash: ['1559827260-dc66d52bef19', '1544551763-46a013bb70d5', '1507525428034-b723cf961d3e'],
        reference: '19-ocean.html',
    },
    {
        id: 'handcrafted-language',
        order: 20,
        name: 'Handcrafted Notebook',
        tagline: 'Deep green, handwritten type, dotted-grid paper',
        description:
            'A playful study-notebook aesthetic: deep-green paper with a dot grid, handwritten Caveat headings, and stickered polaroid-style photos that sit slightly rotated for a scrapbook feel.',
        mood: 'Hand-drawn · Personal',
        best_for: ['Education & language', 'Note-taking apps', 'Kids learning'],
        color_palette: ['#233a2f', '#f1f0e6', '#f7d95a', '#f7a8c4', '#385a49'],
        palette: {
            background: '#233a2f',
            surface: '#385a49',
            text: '#f1f0e6',
            accent: '#f7d95a',
            secondary: '#f7a8c4',
            border: '#f1f0e640',
        },
        typography: {
            headline: "'Caveat', cursive",
            body: "'Karla', sans-serif",
            headline_style: '700 Caveat, handwritten, up to 130px',
            body_style: '400 Karla, 17px / 1.7',
            google_fonts: ['Caveat:wght@400;700', 'Karla:wght@400;600'],
        },
        layout: [
            'Split hero with a rotated, taped photo (aspect 4/3)',
            '3-column teacher / feature cards',
            'Dot-grid paper background texture',
        ],
        motion: ['Cards fade + rise', 'Subtle doodle wiggle on hover'],
        implementation_notes: [
            'Background: radial dot grid (radial-gradient dot 1px, size 6px 6px)',
            'Photos sit in white-framed, slightly rotated polaroid frames with hard offset shadows',
            'Use yellow and pink sticky-note accents for highlights',
        ],
        unsplash: ['1523240795612-9a054b0db644', '1573496359142-b8d87734a5a2', '1519085360753-af0119f7cbe7'],
        reference: '20-language.html',
    },
];

/** Look up a style by id (returns undefined if not found). */
export const getDesignStyleById = (id: string): DesignStyle | undefined =>
    DESIGN_STYLES.find((s) => s.id === id);
