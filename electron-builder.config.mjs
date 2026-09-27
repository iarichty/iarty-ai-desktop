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
    win: {
        icon: 'build/icon.ico',
        target: [{ target: 'nsis', arch: ['x64'] }],
        artifactName: 'iarty-ai-desktop-${version}-win-${arch}.${ext}',
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
        target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
        artifactName: 'iarty-ai-desktop-${version}-mac-${arch}.${ext}',
    },
    dmg: {
        title: 'IARTY AI ${version}',
    },
    linux: {
        icon: 'build/icon.png',
        category: 'Utility',
        target: ['AppImage', 'deb'],
        artifactName: 'iarty-ai-desktop-${version}-linux-${arch}.${ext}',
    },
};
