/**
 * electron-builder configuration.
 * Builds installers for Windows, macOS and Linux from the electron-vite output.
 */
export default {
    appId: 'id.iarty.desktop',
    productName: 'IARTY AI',
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
    win: {
        icon: 'build/icon.ico',
        target: [{ target: 'nsis', arch: ['x64'] }],
    },
    nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        perMachine: false,
    },
    mac: {
        icon: 'build/icon.png',
        target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
        category: 'public.app-category.productivity',
    },
    linux: {
        icon: 'build/icon.png',
        target: ['AppImage', 'deb'],
        category: 'Utility',
    },
};
