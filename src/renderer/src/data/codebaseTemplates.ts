import type { CodebaseTemplate } from '@/types/prd';

export const CODEBASE_TEMPLATES: CodebaseTemplate[] = [
    {
        id: 'nextjs-saas-starter',
        name: 'Next.js 15 + Supabase + Tailwind',
        tagline:
            'Modern production-ready SaaS starter dengan Auth, Database & Stripe billing terintegrasi.',
        category: 'Fullstack',
        techStack: [
            'Next.js 15 (App Router)',
            'TypeScript',
            'Tailwind CSS v4',
            'Supabase (PostgreSQL)',
            'Shadcn UI',
        ],
        features: [
            'Built-in Supabase Auth (OAuth & Email/Password)',
            'Strict TypeScript types & server actions',
            'Pre-configured dark/light mode toggle',
            'Irit token: struktur modular per feature folder',
        ],
        githubUrl: 'https://github.com/shadcn/next-template',
        setupCommand: 'npx create-next-app@latest my-app --typescript --tailwind --eslint',
        recommendedFor: 'Cocok untuk web application, SaaS, dan MVP cepat.',
    },
    {
        id: 'vite-react-express',
        name: 'React (Vite) + Express + Sequelize/Prisma',
        tagline:
            'Klasik decoupled architecture untuk frontend SPA berkinerja tinggi dan scalable backend.',
        category: 'Fullstack',
        techStack: ['React 19', 'Vite', 'Express.js', 'Sequelize / Prisma', 'Tailwind CSS'],
        features: [
            'Separation of concerns (API RESTful + SPA)',
            'JWT & Refresh Token cookie security pattern',
            'Fast HMR dengan Vite bundler',
            'Mudah di-host di VPS / Railway / Render',
        ],
        setupCommand: 'npm create vite@latest frontend -- --template react-ts',
        recommendedFor: 'Aplikasi dengan dashboard kompleks, real-time socket, atau multi-tenant.',
    },
    {
        id: 'react-native-expo',
        name: 'Expo Mobile App Starter (Universal)',
        tagline: 'Aplikasi mobile iOS & Android cross-platform siap rilis dengan Expo Router.',
        category: 'Mobile',
        techStack: ['Expo (React Native)', 'TypeScript', 'NativeWind (Tailwind)', 'Zustand'],
        features: [
            'File-based routing dengan Expo Router',
            'Offline-first caching & storage',
            'Native components & camera/location ready',
        ],
        setupCommand: 'npx create-expo-app@latest -t tabs',
        recommendedFor: 'Aplikasi mobile consumer atau companion app dari produk PRD.',
    },
    {
        id: 'ai-agent-microservice',
        name: 'FastAPI / Express AI Microservice',
        tagline: 'Lightweight streaming backend untuk LLM, tool-calling, RAG, dan vector database.',
        category: 'Backend',
        techStack: [
            'Node.js / Python FastAPI',
            'Vercel AI SDK',
            'OpenAI/Anthropic',
            'Pinecone / pgvector',
        ],
        features: [
            'Server-Sent Events (SSE) streaming siap pakai',
            'Rate limiting & token usage budget guard',
            'Zero boilerplate model fallback runner',
        ],
        setupCommand: 'npm init -y && npm i ai @ai-sdk/openai express cors dotenv',
        recommendedFor: 'Layanan AI agent, automated pipeline, atau chatbot engine.',
    },
];
