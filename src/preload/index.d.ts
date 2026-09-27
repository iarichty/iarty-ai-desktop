import type { IartyBridge } from '@shared/bridge';

declare global {
    interface Window {
        iarty: IartyBridge;
    }
}

export {};
