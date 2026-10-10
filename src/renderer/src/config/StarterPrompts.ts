/**
 * Starter prompts shown in the chat empty state.
 *
 * Purpose: shorten time-to-first-value for new users. Rather than facing a
 * blank box, they can tap a use-case and get a ready-to-send prompt.
 */
export interface StarterPrompt {
    /** Translation key under `chatHero` for the short chip label. */
    labelKey: string;
    /** Translation key under `chatHero` for the prompt inserted into the composer. */
    promptKey: string;
}

export const STARTER_PROMPTS: StarterPrompt[] = [
    { labelKey: 'chatHero.starterSummarize', promptKey: 'chatHero.starterSummarizePrompt' },
    { labelKey: 'chatHero.starterEmail', promptKey: 'chatHero.starterEmailPrompt' },
    { labelKey: 'chatHero.starterExplain', promptKey: 'chatHero.starterExplainPrompt' },
    { labelKey: 'chatHero.starterStudyPlan', promptKey: 'chatHero.starterStudyPlanPrompt' },
    { labelKey: 'chatHero.starterAnalyze', promptKey: 'chatHero.starterAnalyzePrompt' },
    { labelKey: 'chatHero.starterImage', promptKey: 'chatHero.starterImagePrompt' },
];
