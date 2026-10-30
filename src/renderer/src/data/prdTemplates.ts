export interface PrdCommunityTemplate {
    id: string;
    slug: string;
    title: string;
    tagline: string;
    description?: string;
    category: 'SaaS' | 'E-Commerce' | 'AI & Tools' | 'Mobile App' | 'Marketplace';
    targetAudience: string;
    techStack: string[];
    features: string[];
    initialPrompt: string;
    databasePreview: string;
    flowPreview: string;
    recommendedStyle: string;
}

export const PRD_COMMUNITY_TEMPLATES: PrdCommunityTemplate[] = [
    {
        id: 'tmpl-b2b-saas-crm',
        slug: 'b2b-saas-crm',
        title: 'B2B Sales CRM & Lead Pipeline',
        tagline:
            'Modern sales workspace dengan pipeline visual, contact management, dan integrasi WhatsApp.',
        description:
            'Spesifikasi lengkap untuk CRM tim sales: lead tracking stage kanban, deal forecasting, activity log, automated follow-up reminder, dan multi-seat role hierarchy.',
        category: 'SaaS',
        targetAudience: 'Startup, agensi, dan tim sales B2B.',
        techStack: [
            'Next.js 15 (App Router)',
            'TypeScript',
            'Tailwind CSS v4',
            'PostgreSQL',
            'Prisma ORM',
        ],
        features: [
            'Kanban board pipeline dengan drag-and-drop deals',
            'Manajemen kontak, perusahaan, dan riwayat interaksi',
            'Multi-tenant workspace dengan RBAC (Admin, Manager, Rep)',
            'Export analytics & revenue forecasting chart',
        ],
        initialPrompt:
            'Buatkan PRD lengkap untuk platform B2B Sales CRM. Fitur utama mencakup lead pipeline Kanban, contact directory, activity logging, dan dashboard performa sales.',
        recommendedStyle: 'trusted-fintech',
        databasePreview: `erDiagram
    ORGANIZATION ||--o{ USER : has
    USER ||--o{ DEAL : owns
    COMPANY ||--o{ CONTACT : employs
    DEAL }o--|| COMPANY : belongs_to
    DEAL ||--o{ ACTIVITY : logs`,
        flowPreview: `graph TD
    A[Login / Invite] --> B[Dashboard Overview]
    B --> C[Pipeline Kanban]
    C --> D[Deal Details & Notes]
    B --> E[Contacts Directory]
    B --> F[Reports & Forecast]`,
    },
    {
        id: 'tmpl-ai-content-studio',
        slug: 'ai-content-studio',
        title: 'AI Copywriting & Asset Studio',
        tagline:
            'Platform pembuatan konten marketing instan didukung model frontier AI & multi-brand voice.',
        category: 'AI & Tools',
        targetAudience: 'Digital Marketer, Creator, dan Agency.',
        techStack: ['React 19 (Vite)', 'Express.js', 'Vercel AI SDK', 'Supabase', 'Tailwind CSS'],
        features: [
            'Generasi caption, blog post, dan ad copy berbasis persona',
            'Brand voice guideline storage per client workspace',
            'Streaming response dengan SSE dan markdown formatter',
            'Credit wallet & token-usage limiter per user',
        ],
        initialPrompt:
            'Rancang PRD untuk AI Marketing Content Generator yang memiliki fitur multi brand-voice profile, template prompt sosial media, dan sistem kuota kredit pengguna.',
        recommendedStyle: 'brutalist-pop-agency',
        databasePreview: `erDiagram
    USER ||--o{ BRAND_VOICE : creates
    USER ||--o{ GENERATION : runs
    USER ||--|| WALLET : owns
    GENERATION }o--|| TEMPLATE : uses`,
        flowPreview: `graph TD
    A[Select Template] --> B[Configure Brand Voice]
    B --> C[Input Topic & Tone]
    C --> D[Stream Generation]
    D --> E[Save / Export to Notion]`,
    },
    {
        id: 'tmpl-marketplace-freelance',
        slug: 'marketplace-freelance',
        title: 'Tech Freelance & Gig Marketplace',
        tagline:
            'Platform penghubung developer/designer dengan klien proyek lengkap dengan escrow payment.',
        category: 'Marketplace',
        targetAudience: 'Freelancer teknologi dan bisnis rintisan.',
        techStack: ['Next.js 15', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'Stripe / Midtrans'],
        features: [
            'Profil portofolio dengan verifikasi skill dan testimoni',
            'Milestone-based escrow payment & release approval',
            'Real-time proposal bidding and chat messaging',
            'Invoice generation otomatis dan settlement saldo',
        ],
        initialPrompt:
            'Buatkan PRD untuk marketplace freelance teknologi dengan sistem milestone escrow, proposal submission, review rating, dan payout otomatis.',
        recommendedStyle: 'quiet-luxury-fashion',
        databasePreview: `erDiagram
    USER ||--o{ PROJECT : posts
    USER ||--o{ PROPOSAL : submits
    PROJECT ||--o{ MILESTONE : contains
    MILESTONE ||--|| ESCROW_TRANSACTION : protects`,
        flowPreview: `graph TD
    A[Browse Projects] --> B[Submit Proposal]
    B --> C[Client Hire & Escrow Deposit]
    C --> D[Submit Work]
    D --> E[Approval & Payout]`,
    },
    {
        id: 'tmpl-ecommerce-headless',
        slug: 'ecommerce-headless',
        title: 'Modern D2C Headless Storefront',
        tagline:
            'Toko online D2C cepat dengan faceted catalog search, cart drawer, dan instant checkout.',
        category: 'E-Commerce',
        targetAudience: 'Brand fashion, merchandise, dan retail modern.',
        techStack: ['Next.js 15', 'Tailwind CSS', 'Medusa.js / Shopify', 'Redis', 'PostgreSQL'],
        features: [
            'Katalog produk cepat dengan filter kategori & ukuran',
            'Slide-out cart drawer dengan voucher diskon',
            'Multi-gateway payment (QRIS, VA, E-Wallet, Card)',
            'Order tracking portal dengan integrasi kurir pengiriman',
        ],
        initialPrompt:
            'Rancang PRD untuk toko online modern D2C dengan fitur instant checkout, cart drawer, integrasi ongkir pengiriman otomatis, dan order tracking.',
        recommendedStyle: 'handcrafted-language',
        databasePreview: `erDiagram
    PRODUCT ||--o{ VARIANT : has
    ORDER ||--o{ ORDER_ITEM : includes
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|| SHIPMENT : tracks`,
        flowPreview: `graph TD
    A[Catalog Listing] --> B[Product Details]
    B --> C[Cart Drawer]
    C --> D[Checkout & Shipping Rate]
    D --> E[Payment & Receipt]`,
    },
    {
        id: 'tmpl-micro-habit-tracker',
        slug: 'micro-habit-tracker',
        title: 'Micro-Habits & Daily Routine App',
        tagline:
            'Aplikasi pembangun rutinitas harian dengan streaks, gamifikasi, dan community accountability.',
        category: 'Mobile App',
        targetAudience: 'Individu yang ingin membangun produktivitas dan kebiasaan sehat.',
        techStack: ['Expo (React Native)', 'TypeScript', 'NativeWind', 'SQLite / Supabase'],
        features: [
            'Habit dashboard dengan daily completion checkbox',
            'Streak counter & badge reward system',
            'Smart notification reminder berbasis waktu aktif user',
            'Weekly & monthly progress analytics visual',
        ],
        initialPrompt:
            'Buatkan PRD untuk aplikasi mobile habit tracker dengan streak counters, daily routines, push notification reminders, dan offline-first sync.',
        recommendedStyle: 'playful-kids',
        databasePreview: `erDiagram
    USER ||--o{ HABIT : tracks
    HABIT ||--o{ HABIT_LOG : logs
    USER ||--o{ BADGE : earns`,
        flowPreview: `graph TD
    A[Today View] --> B[Toggle Complete]
    B --> C[Streak Celebration]
    A --> D[Weekly Insights]
    A --> E[Add Custom Habit]`,
    },
];
