import type { IconType } from 'react-icons';

interface Props {
    icon: IconType;
    title: string;
    description: string;
}

/**
 * Gradient hero header shared by the simpler feature views (Minutes, Study,
 * Roasts) so they match the visual language of the Chat and PRD pages.
 */
export default function FeatureHero({ icon: Icon, title, description }: Props): JSX.Element {
    return (
        <div className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-[color:var(--accent-contrast)] shadow-lg shadow-accent/20">
                    <Icon className="h-6 w-6" />
                </div>
            </div>
            <h1 className="bg-gradient-to-br from-accent via-accent to-accent-2 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-5xl">
                {title}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text md:text-base">{description}</p>
        </div>
    );
}
