/**
 * Typed access to the preload bridge exposed by `contextBridge`.
 * Keeping it in one place means components never touch `window` directly.
 */
import type { IartyBridge } from '@shared/bridge';

export const bridge: IartyBridge = window.iarty;

export const hasBridge = typeof window !== 'undefined' && Boolean(window.iarty);
