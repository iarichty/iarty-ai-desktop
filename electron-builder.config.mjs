/**
 * electron-builder configuration.
 *
 * Produces installers for Windows, macOS and Linux from the electron-vite
 * output (`out/`). Releases are published to GitHub Releases by CI
 * (see .github/workflows/release.yml).
 */
export default {
    appId: 'id.iarty.desktop',
    productName: 'IARTY AI',
    copyright: 'Copyright © IARTY',
    directories: {
        output: 'release/${version}',
        buildResources: 'build',
    },
    // Ship the window icon + the built bundles.
    files: ['out/**/*', 'build/icon.png', 'package.json'],
    extraResources: [{ from: 'build/icon.png', to: 'build/icon.png' }],
    icon: 'build/icon.png',
    protocols: [
        {
            name: 'IARTY AI',
            schemes: ['iarty'],
        },
    ],
    // Where `--publish always` uploads artifacts.
    publish: [
        {
            provider: 'github',
            owner: 'iarichty',
            repo: 'iarty-ai-desktop',
            releaseType: 'release',
        },
    ],
    // Windows: code-sign the installer/exe when a certificate is provided via
    // the standard electron-builder env vars (CSC_LINK / CSC_KEY_PASSWORD, or
    // WIN_CSC_LINK / WIN_CSC_KEY_PASSWORD). When no certificate is present,
    // electron-builder skips signing and produces an unsigned artifact — the
    // CI workflow logs which mode is active.
    win: {
        icon: 'build/icon.ico',
        target: [{ target: 'nsis', arch: ['x64'] }],
        artifactName: 'iarty-ai-desktop-${version}-win-${arch}.${ext}',
        // `signAndEditExecutable` stays on by default; when no cert is
        // configured electron-builder simply omits the signature.
    },
    nsis: {
        oneClick: false,
        perMachine: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: 'IARTY AI',
    },
    mac: {
        icon: 'build/icon.png',
        category: 'public.app-category.productivity',
        // Hardened runtime + notarization are required for a distribution-ready
        // macOS build. Both are activated only when the relevant secrets are
        // present (CSC_LINK + notarization credentials); otherwise the build
        // falls back to an unsigned zip — see .github/workflows/release.yml.
        hardenedRuntime: true,
        gatekeeperAssess: false,
        entitlements: 'build/entitlements.mac.plist',
        entitlementsInherit: 'build/entitlements.mac.plist',
        notarize: false, // enabled dynamically in CI when Apple credentials exist
        // Ship a zip on CI: the DMG step mounts a volume named after
        // productName ("IARTY AI"), and `hdiutil detach` flakes on the space
        // on GitHub's macOS runners. A zip is a valid, reliable mac artifact
        // (extract and drag the .app to /Applications).
        target: [{ target: 'zip', arch: ['x64', 'arm64'] }],
        artifactName: 'iarty-ai-desktop-${version}-mac-${arch}.${ext}',
    },
    linux: {
        icon: 'build/icon.png',
        category: 'Utility',
        target: ['AppImage', 'deb'],
        artifactName: 'iarty-ai-desktop-${version}-linux-${arch}.${ext}',
    },
};
