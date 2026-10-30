import type { PrdOutputs, PrdDesign, PrdTaskPhase, PrdArchitectureCanvas } from '@/types/prd';

export const generateAgentRules = (
    projectTitle: string,
    outputs: PrdOutputs,
    design?: PrdDesign | null,
) => {
    const title = projectTitle || 'Project';
    const chosenStyle =
        design?.chosen_style?.name || design?.primary_recommendation || 'Modern Minimal Clean';
    const palette = design?.chosen_style?.color_palette?.join(', ') || '#2563eb, #0a0a0a, #ffffff';

    const cursorrules = `# ${title} - AI Coding Agent Rules (.cursorrules)
You are an expert full-stack engineer building "${title}".

## Project Architecture & Standards
- Read and follow this specification closely.
- Do not introduce breaking changes or external packages unless specified.
- Prefer TypeScript with strict typing. Never use \`any\`.
- Keep components modular, accessible, and performant.

## Design & UI System
- Design Direction: ${chosenStyle}
- Preferred Color Palette: ${palette}
- Use Tailwind CSS with clean utility classes and dark/light mode consistency.

## Database & Schema Reference
${outputs.database_schema ? `\`\`\`mermaid\n${outputs.database_schema}\n\`\`\`` : 'Follow the schema provided in PRD.'}

## Page Flow Reference
${outputs.page_flow ? `\`\`\`mermaid\n${outputs.page_flow}\n\`\`\`` : 'Refer to PRD flow.'}

## Execution Rules
1. Implement code iteratively, verifying types and linters after each step.
2. Write self-contained and clean unit/integration tests for critical workflows.
3. Keep logs clean and remove temporary debug logs before finishing.
`;

    const claudeMd = `# CLAUDE.md for ${title}

## System Overview
${title} is built using modern full-stack practices.

## Guidelines & Constraints
- Language: TypeScript / Modern JavaScript
- Code style: Terse, modular, and functional where appropriate
- Always check schema references before writing backend queries or migrations.
- Verify existing conventions before creating duplicate components or utilities.

## Database Entities
${outputs.database_schema ? outputs.database_schema : 'Refer to PRD database specifications.'}

## Key Workflows
${outputs.page_flow ? outputs.page_flow : 'Refer to PRD page flows.'}
`;

    const agentsMd = `# AGENTS.md for ${title}

## Mission
Build and maintain "${title}" according to the verified PRD and architectural blueprint.

## Conventions
- Architecture: Feature-based or modular layer structure.
- UI Theme: ${chosenStyle} (Palette: ${palette}).
- Safety: Strictly protect environment variables and avoid committing secrets.
- Verification: Run linting and test suites before finalizing each task.
`;

    const systemPrompt = `You are the lead software architect and engineer for "${title}".
Your job is to implement features step-by-step strictly based on the following PRD:

---
${outputs.prd_markdown}
---

Always implement one step at a time, check schema consistency, and adhere to design guidelines.`;

    return { cursorrules, claudeMd, agentsMd, systemPrompt };
};

export const generatePrdTasks = (projectTitle: string, outputs: PrdOutputs): PrdTaskPhase[] => {
    const title = projectTitle || 'Project';

    return [
        {
            id: 'phase-1',
            phaseNumber: 1,
            phaseTitle: 'Phase 1: Environment & Project Foundation',
            summary: `Initialize codebase starter, configurations, linting, and design tokens for ${title}.`,
            tasks: [
                {
                    id: 't-1-1',
                    title: 'Project Scaffolding & Configs',
                    description:
                        'Set up repository structure, TypeScript config, Tailwind CSS, and linter/formatter.',
                    acceptanceCriteria: [
                        'Clean dev server start without errors',
                        'Tailwind and dark mode configured properly',
                        'Path aliases working as expected',
                    ],
                    promptForAgent: `Initialize the starter scaffold for "${title}". Set up TypeScript, Tailwind CSS, and alias imports. Verify npm run dev runs cleanly.`,
                    status: 'pending',
                    filesToTouch: ['package.json', 'tsconfig.json', 'src/App.tsx', 'src/index.css'],
                },
                {
                    id: 't-1-2',
                    title: 'Database Schema & ORM Setup',
                    description:
                        'Create initial database migrations/models based on the PRD ERD diagram.',
                    acceptanceCriteria: [
                        'Migrations execute successfully',
                        'Table relationships match ERD specification',
                        'Model types exported for frontend/backend',
                    ],
                    promptForAgent: `Generate the database models and migrations according to this schema:\n\n${outputs.database_schema}\n\nEnsure foreign keys and indexes are set correctly.`,
                    status: 'pending',
                    filesToTouch: ['src/models/*', 'migrations/*'],
                },
            ],
        },
        {
            id: 'phase-2',
            phaseNumber: 2,
            phaseTitle: 'Phase 2: Authentication & Core Architecture',
            summary: 'Implement secure authentication, session management, and base layouts.',
            tasks: [
                {
                    id: 't-2-1',
                    title: 'Auth Endpoints & User Session',
                    description:
                        'Set up login, register, token refresh, and auth middleware/context.',
                    acceptanceCriteria: [
                        'Users can register and log in with JWT or session',
                        'Protected routes redirect unauthenticated users',
                        'Auth tokens are securely stored',
                    ],
                    promptForAgent: `Implement authentication endpoints and client session provider for "${title}". Add login and register forms with client-side validation.`,
                    status: 'pending',
                    filesToTouch: ['src/routes/auth.*', 'src/context/AuthContext.*'],
                },
                {
                    id: 't-2-2',
                    title: 'Main Layout & Responsive Navigation',
                    description: 'Build main navigation bar, sidebar, footer, and theme toggle.',
                    acceptanceCriteria: [
                        'Fully responsive across mobile and desktop',
                        'Light and dark mode toggle smoothly',
                        'Routing structure mapped to all key pages',
                    ],
                    promptForAgent: `Build MainLayout with navigation matching the product flow:\n\n${outputs.page_flow}\n\nInclude responsive drawer for mobile.`,
                    status: 'pending',
                    filesToTouch: ['src/layouts/MainLayout.*', 'src/components/Navbar.*'],
                },
            ],
        },
        {
            id: 'phase-3',
            phaseNumber: 3,
            phaseTitle: 'Phase 3: Core Features & User Journeys',
            summary: 'Develop primary domain features and business logic described in the PRD.',
            tasks: [
                {
                    id: 't-3-1',
                    title: 'Core Domain Services & APIs',
                    description:
                        'Create backend endpoints, controllers, and services for main feature set.',
                    acceptanceCriteria: [
                        'API responses follow standardized contract { success, message, data }',
                        'Input validation schemas enforced',
                        'Error handling handles edge cases gracefully',
                    ],
                    promptForAgent: `Implement core API endpoints and controllers for "${title}" based on the specification:\n\n${outputs.prd_markdown.slice(0, 800)}...`,
                    status: 'pending',
                    filesToTouch: ['src/controllers/*', 'src/services/*'],
                },
                {
                    id: 't-3-2',
                    title: 'Interactive Frontend Pages & State',
                    description: 'Connect frontend UI with backend APIs and state management.',
                    acceptanceCriteria: [
                        'Loading, error, and empty states handled',
                        'Optimistic updates or fast feedback for user interactions',
                        'Data matches types generated in Phase 1',
                    ],
                    promptForAgent: `Build the main dashboard and page views with API integrations and optimistic state management.`,
                    status: 'pending',
                    filesToTouch: ['src/pages/*', 'src/store/*'],
                },
            ],
        },
        {
            id: 'phase-4',
            phaseNumber: 4,
            phaseTitle: 'Phase 4: Polish, Testing & Production Readiness',
            summary: 'Comprehensive testing, performance tuning, and deployment setup.',
            tasks: [
                {
                    id: 't-4-1',
                    title: 'Automated Tests & Quality Checks',
                    description:
                        'Write unit tests for business logic and integration tests for critical flows.',
                    acceptanceCriteria: [
                        'Test suite passes with high coverage on critical paths',
                        'Linter and typechecker pass with 0 errors',
                    ],
                    promptForAgent: `Write unit and integration tests for auth and main feature workflows. Run test suite to ensure green passing status.`,
                    status: 'pending',
                    filesToTouch: ['tests/*', 'src/**/*.test.*'],
                },
            ],
        },
    ];
};

export const parseArchitectureCanvas = (
    projectTitle: string,
    _outputs?: PrdOutputs,
): PrdArchitectureCanvas => {
    const title = projectTitle || 'System';

    return {
        nodes: [
            {
                id: 'n-user',
                label: 'End User / Client App',
                category: 'user',
                description: 'Web & Mobile clients accessing the platform',
                x: 60,
                y: 120,
            },
            {
                id: 'n-frontend',
                label: `${title} Web Frontend`,
                category: 'frontend',
                description: 'React / Next.js SPA with Tailwind CSS',
                x: 280,
                y: 120,
            },
            {
                id: 'n-backend',
                label: 'Core API Gateway & Backend',
                category: 'backend',
                description: 'RESTful API with Auth, Business Logic & SSE',
                x: 520,
                y: 120,
            },
            {
                id: 'n-database',
                label: 'Relational Database',
                category: 'database',
                description: 'PostgreSQL / MySQL storage schema',
                x: 760,
                y: 60,
            },
            {
                id: 'n-external',
                label: 'External Services & AI',
                category: 'external',
                description: 'AI inference providers, Auth & Object Storage',
                x: 760,
                y: 200,
            },
        ],
        edges: [
            { id: 'e1', from: 'n-user', to: 'n-frontend', label: 'HTTPS / UI Events' },
            { id: 'e2', from: 'n-frontend', to: 'n-backend', label: 'JSON API / SSE Stream' },
            { id: 'e3', from: 'n-backend', to: 'n-database', label: 'SQL Queries & Migrations' },
            { id: 'e4', from: 'n-backend', to: 'n-external', label: 'SDK & Webhooks' },
        ],
    };
};
