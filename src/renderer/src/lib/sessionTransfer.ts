/**
 * Session import/export helpers shared by the chat and PRD Builder views.
 *
 * The web app packages sessions as ZIP archives (`chat.json` + a `files/`
 * folder for chat, `session.json` + `files/` for PRD Builder). Older exports
 * and some tools produce plain JSON. These helpers accept BOTH forms so a
 * session exported from the web app, from the desktop app, or hand-written as
 * JSON all import cleanly — and our exports round-trip back into the web app.
 */
import JSZip from 'jszip';
import type { ChatMessage, MessageFile } from '@shared/types';

/** A live attachment recovered alongside an imported message. */
export interface ImportedFile {
    /** Index of the message the file belongs to. */
    index: number;
    file: File;
}

/** Result of parsing a chat session file (JSON or ZIP). */
export interface ParsedChatSession {
    messages: ChatMessage[];
    /** Reconstructed `File` objects, keyed by message index. */
    files: Map<number, File>;
}

const CHAT_FILES_FOLDER = 'files';

/** True when a file looks like a ZIP archive (by extension or magic bytes). */
async function isZip(file: File): Promise<boolean> {
    if (file.name.toLowerCase().endsWith('.zip')) return true;
    if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        return true;
    }
    try {
        const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
        // Local file header signature: PK\x03\x04
        return head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
    } catch {
        return false;
    }
}

/**
 * Restores every `message.file` that references an entry inside the ZIP and
 * returns the resulting `File` objects keyed by message index. Mutates the
 * passed messages so their `file.url` points at a usable object URL.
 */
async function restoreZipAttachments(
    zip: JSZip,
    messages: ChatMessage[],
): Promise<Map<number, File>> {
    const restored = new Map<number, File>();
    await Promise.all(
        messages.map(async (msg, index) => {
            const meta = msg.file as MessageFile | undefined;
            if (!meta?.internalPath) return;
            const entry = zip.file(meta.internalPath);
            if (!entry) return;
            const blob = await entry.async('blob');
            const file = new File([blob], meta.name || `attachment_${index}`, {
                type: meta.type || blob.type || 'application/octet-stream',
            });
            restored.set(index, file);
            msg.file = {
                ...meta,
                url: URL.createObjectURL(file),
            };
        }),
    );
    return restored;
}

/**
 * Parses a chat session from either a plain-JSON file (`Message[]` or
 * `{ messages: Message[] }`) or a ZIP package containing `chat.json`.
 */
export async function parseChatSession(file: File): Promise<ParsedChatSession> {
    if (await isZip(file)) {
        const zip = await JSZip.loadAsync(file);
        const chatJson = zip.file('chat.json');
        if (!chatJson) throw new Error('chat.json not found in ZIP');
        const raw = await chatJson.async('string');
        const parsed = JSON.parse(raw) as ChatMessage[] | { messages?: ChatMessage[] };
        const messages = Array.isArray(parsed) ? parsed : (parsed.messages ?? []);
        if (!Array.isArray(messages)) throw new Error('Invalid chat.json format');
        const files = await restoreZipAttachments(zip, messages);
        return { messages, files };
    }

    const text = await file.text();
    const parsed = JSON.parse(text) as ChatMessage[] | { messages?: ChatMessage[] };
    const messages = Array.isArray(parsed) ? parsed : (parsed.messages ?? []);
    if (!Array.isArray(messages)) throw new Error('Invalid JSON format');
    return { messages, files: new Map() };
}

/**
 * Builds a web-compatible chat ZIP: `chat.json` holds the message list and any
 * attached `File`s are written to `files/` with matching `internalPath`s.
 */
export async function buildChatArchive(
    messages: ChatMessage[],
    filesByIndex: Map<number, File>,
): Promise<Blob> {
    const zip = new JSZip();
    const filesFolder = zip.folder(CHAT_FILES_FOLDER);
    const exported: ChatMessage[] = [];

    for (let i = 0; i < messages.length; i += 1) {
        const msg = messages[i];
        const copy: ChatMessage = { ...msg };
        const live = filesByIndex.get(i);
        if (live) {
            const ext = live.name.split('.').pop() || 'bin';
            const internalName = `file_${i}_${Date.now()}.${ext}`;
            const buf = await live.arrayBuffer();
            filesFolder?.file(internalName, buf);
            copy.file = {
                name: live.name,
                type: live.type,
                url: '',
                size: live.size,
                internalPath: `${CHAT_FILES_FOLDER}/${internalName}`,
            };
        } else if (copy.file) {
            // No live blob to embed — keep metadata but drop the stale blob URL.
            copy.file = { ...copy.file, url: '' };
        }
        delete (copy as { originalFile?: unknown }).originalFile;
        exported.push(copy);
    }

    zip.file('chat.json', JSON.stringify(exported, null, 2));
    return zip.generateAsync({ type: 'blob' });
}

/* ── PRD Builder ─────────────────────────────────────────────────────────── */

/** Web-compatible PRD session package shape. */
export interface PrdSessionPackage {
    schema_type?: string;
    schema_version?: number;
    export_date?: string;
    metadata?: {
        project_title?: string;
        status?: string;
        message_count?: number;
        has_outputs?: boolean;
        has_design?: boolean;
    };
    messages: unknown[];
    outputs: { prd_markdown: string; database_schema: string; page_flow: string };
    design?: unknown;
}

/** Result of parsing a PRD session file (JSON or ZIP). */
export interface ParsedPrdSession {
    session: PrdSessionPackage;
    /** Blob URLs created for restored attachment files, keyed by message index. */
    restoredUrls: Map<number, string>;
}

/** Parses a PRD session from a plain-JSON file or a ZIP containing `session.json`. */
export async function parsePrdSession(file: File): Promise<ParsedPrdSession> {
    const restoredUrls = new Map<number, string>();

    if (await isZip(file)) {
        const zip = await JSZip.loadAsync(file);
        const entry = zip.file('session.json') ?? zip.file('prd-session.json');
        if (!entry) throw new Error('session.json not found in ZIP');
        const session = JSON.parse(await entry.async('string')) as PrdSessionPackage;

        if (session.schema_type && session.schema_type !== 'prd') {
            throw new Error(`Incompatible session type: "${session.schema_type}"`);
        }

        await Promise.all(
            (session.messages ?? []).map(async (raw, index) => {
                const msg = raw as { file?: MessageFile };
                if (!msg.file?.internalPath) return;
                const fileEntry = zip.file(msg.file.internalPath);
                if (!fileEntry) return;
                const blob = await fileEntry.async('blob');
                const url = URL.createObjectURL(blob);
                restoredUrls.set(index, url);
                msg.file = { ...msg.file, url };
            }),
        );

        return { session, restoredUrls };
    }

    const text = await file.text();
    const session = JSON.parse(text) as PrdSessionPackage;
    if (session.schema_type && session.schema_type !== 'prd') {
        throw new Error(`Incompatible session type: "${session.schema_type}"`);
    }
    return { session, restoredUrls };
}

/** Builds a web-compatible PRD ZIP: `session.json` + any attachment files. */
export async function buildPrdArchive(
    session: PrdSessionPackage,
    filesByIndex: Map<number, { file: File; name: string; type: string }>,
): Promise<Blob> {
    const zip = new JSZip();
    const filesFolder = zip.folder(CHAT_FILES_FOLDER);
    const exported = JSON.parse(JSON.stringify(session)) as PrdSessionPackage;

    for (const [index, entry] of filesByIndex) {
        const msg = exported.messages[index] as { file?: MessageFile } | undefined;
        if (!msg) continue;
        const ext = entry.name.split('.').pop() || 'bin';
        const internalName = `file_${index}.${ext}`;
        const buf = await entry.file.arrayBuffer();
        filesFolder?.file(internalName, buf);
        msg.file = {
            name: entry.name,
            type: entry.type,
            url: '',
            size: entry.file.size,
            internalPath: `${CHAT_FILES_FOLDER}/${internalName}`,
        };
    }

    zip.file('session.json', JSON.stringify(exported, null, 2));
    return zip.generateAsync({ type: 'blob' });
}

/** Triggers a browser download for a Blob with the given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
