export interface GitHubExportOptions {
    token: string;
    repoName: string;
    description?: string;
    isPrivate?: boolean;
}

export interface GitHubExportResult {
    success: boolean;
    repoUrl?: string;
    error?: string;
}

export interface FileToCommit {
    path: string;
    content: string;
}

/**
 * Pushes a complete PRD blueprint directly into a newly created (or existing) GitHub repository.
 */
export async function pushBlueprintToGitHub(
    options: GitHubExportOptions,
    files: FileToCommit[],
): Promise<GitHubExportResult> {
    const {
        token,
        repoName,
        description = 'PRD Blueprint created with IARTY AI',
        isPrivate = false,
    } = options;

    if (!token || !repoName) {
        return {
            success: false,
            error: 'GitHub Personal Access Token and repository name are required.',
        };
    }

    const headers = {
        Authorization: `token ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
    };

    try {
        // 1. Get authenticated user profile
        const userRes = await fetch('https://api.github.com/user', { headers });
        if (!userRes.ok) {
            const err = await userRes.json().catch(() => ({}));
            return {
                success: false,
                error:
                    (err as { message?: string })?.message ||
                    'Invalid GitHub token or insufficient permissions.',
            };
        }
        const userData = (await userRes.json()) as { login: string; html_url: string };
        const owner = userData.login;

        // 2. Create the repository or check if already exists
        const createRepoRes = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: repoName.trim(),
                description,
                private: isPrivate,
                auto_init: true, // creates default main branch with initial commit
            }),
        });

        let repoHtmlUrl = `https://github.com/${owner}/${repoName.trim()}`;

        if (!createRepoRes.ok) {
            const createErr = (await createRepoRes.json().catch(() => ({}))) as {
                message?: string;
                errors?: Array<{ message: string }>;
            };
            // If repository already exists, check if accessible
            const checkExisting = await fetch(
                `https://api.github.com/repos/${owner}/${repoName.trim()}`,
                { headers },
            );
            if (!checkExisting.ok) {
                return {
                    success: false,
                    error: createErr.message || 'Failed to create or access the GitHub repository.',
                };
            }
        } else {
            const repoData = (await createRepoRes.json()) as { html_url: string };
            repoHtmlUrl = repoData.html_url;
            // Short wait for GitHub git tree initialization
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        // 3. Commit files sequentially via GitHub Contents API
        for (const file of files) {
            const filePath = encodeURIComponent(file.path).replace(/%2F/g, '/');
            const getFileRes = await fetch(
                `https://api.github.com/repos/${owner}/${repoName.trim()}/contents/${filePath}`,
                { headers },
            );

            let sha: string | undefined = undefined;
            if (getFileRes.ok) {
                const existingFile = (await getFileRes.json()) as { sha: string };
                sha = existingFile.sha;
            }

            // UTF-8 base64 encoding safe for unicode strings
            const utf8Bytes = new TextEncoder().encode(file.content);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...utf8Bytes.subarray(i, i + chunkSize));
            }
            const base64Content = btoa(binary);

            // Small delay to prevent rapid-fire commit conflicts on GitHub git refs
            await new Promise((resolve) => setTimeout(resolve, 300));

            let putRes: Response | null = null;
            let retries = 3;
            while (retries > 0) {
                putRes = await fetch(
                    `https://api.github.com/repos/${owner}/${repoName.trim()}/contents/${filePath}`,
                    {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({
                            message: `feat(spec): add/update ${file.path} via IARTY AI`,
                            content: base64Content,
                            sha,
                        }),
                    },
                );

                if (putRes.status === 409) {
                    await new Promise((resolve) => setTimeout(resolve, 800));
                    const refetch = await fetch(
                        `https://api.github.com/repos/${owner}/${repoName.trim()}/contents/${filePath}`,
                        { headers },
                    );
                    if (refetch.ok) {
                        const updated = (await refetch.json()) as { sha: string };
                        sha = updated.sha;
                    }
                    retries--;
                } else {
                    break;
                }
            }

            if (!putRes || !putRes.ok) {
                const putErr = (await putRes?.json().catch(() => ({}))) as
                    | { message?: string }
                    | undefined;
                return {
                    success: false,
                    error: `Failed to commit ${file.path}: ${putErr?.message || 'API error'}`,
                };
            }
        }

        return {
            success: true,
            repoUrl: repoHtmlUrl,
        };
    } catch (e) {
        return {
            success: false,
            error: (e as Error).message || 'Network error while contacting GitHub API.',
        };
    }
}
