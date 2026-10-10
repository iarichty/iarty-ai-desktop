/**
 * Slash commands available in the chat composer.
 *
 * Typing `/` at the start of the input opens an autocomplete menu; selecting a
 * command (or typing it in full and pressing Enter) runs the mapped action
 * instead of sending the text as a normal message.
 *
 * All user-facing copy lives in the `commands` translation namespace so the
 * menu follows the active language.
 */
export type SlashCommandKey = 'new' | 'clear' | 'compact';

export interface SlashCommand {
    /** Command key (matches the text typed after `/`). */
    key: SlashCommandKey;
    /** Translation keys under `commands` for the menu row. */
    titleKey: string;
    descKey: string;
    /** True when the command runs a hidden instruction through the chat pipeline. */
    isPrompt?: boolean;
}

export const SLASH_COMMANDS: SlashCommand[] = [
    { key: 'new', titleKey: 'commands.newTitle', descKey: 'commands.newDesc' },
    { key: 'clear', titleKey: 'commands.clearTitle', descKey: 'commands.clearDesc' },
    {
        key: 'compact',
        titleKey: 'commands.compactTitle',
        descKey: 'commands.compactDesc',
        isPrompt: true,
    },
];

/**
 * Match the raw composer input against the command list.
 *
 *  - `matches`: commands whose name starts with what follows `/` (popup rows).
 *  - `exact`: the command whose name equals the typed token exactly (run on Enter).
 */
export const matchSlashCommand = (
    input: string,
): { isCommand: boolean; token: string; matches: SlashCommand[]; exact: SlashCommand | null } => {
    if (!input.startsWith('/')) {
        return { isCommand: false, token: '', matches: [], exact: null };
    }

    const body = input.slice(1);
    const token = body.split(/\s+/)[0].toLowerCase();
    const exact = SLASH_COMMANDS.find((cmd) => cmd.key === token) ?? null;
    const matches = SLASH_COMMANDS.filter((cmd) => cmd.key.startsWith(token));
    return { isCommand: true, token, matches, exact };
};
