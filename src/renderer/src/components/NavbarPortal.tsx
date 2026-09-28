import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { NAVBAR_SLOT_ID } from './Navbar';

/**
 * Renders `children` into the navbar's session-controls slot. Falls back to
 * inline rendering if the slot isn't mounted (e.g. during the fade transition
 * when the active view changes).
 */
export function NavbarPortal({ children }: { children: ReactNode }): JSX.Element | null {
    const [slot, setSlot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const find = (): void => {
            setSlot(document.getElementById(NAVBAR_SLOT_ID));
        };
        find();
        // The navbar (and its slot) mounts once; a short retry covers timing.
        const t = window.setTimeout(find, 50);
        return () => window.clearTimeout(t);
    }, []);

    if (!slot) return null;
    return createPortal(children, slot);
}
