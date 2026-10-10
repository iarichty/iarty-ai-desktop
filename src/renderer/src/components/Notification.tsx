import { motion, AnimatePresence } from 'framer-motion';
import { TbCheck, TbX, TbAlertTriangle, TbInfoCircle } from 'react-icons/tb';
import { useNotification, type NotificationType } from '@/context/NotificationContext';
import { useLanguage } from '@/context/useLanguage';

const ICONS: Record<NotificationType, JSX.Element> = {
    success: <TbCheck className="text-emerald-500" />,
    error: <TbX className="text-rose-500" />,
    warning: <TbAlertTriangle className="text-amber-500" />,
    info: <TbInfoCircle className="text-blue-500" />,
};

const COLORS: Record<NotificationType, string> = {
    success: 'border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-500/10',
    error: 'border-rose-500/20 bg-rose-50/80 dark:bg-rose-500/10',
    warning: 'border-amber-500/20 bg-amber-50/80 dark:bg-amber-500/10',
    info: 'border-blue-500/20 bg-blue-50/80 dark:bg-blue-500/10',
};

function NotificationItem({
    id,
    message,
    type,
}: {
    id: string;
    message: string;
    type: NotificationType;
}): JSX.Element {
    const { removeNotification } = useNotification();
    const { t } = useLanguage();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className={`pointer-events-auto mb-3 flex min-w-[320px] max-w-[420px] items-center gap-3 rounded-3xl border px-5 py-4 shadow-2xl backdrop-blur-2xl last:mb-0 ${COLORS[type]}`}
        >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                <span className="text-xl">{ICONS[type]}</span>
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-[13px] font-bold leading-snug text-gray-800 dark:text-gray-100">
                    {message}
                </p>
            </div>
            <button
                onClick={() => removeNotification(id)}
                className="shrink-0 rounded-xl p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                aria-label={t('notification.dismiss')}
            >
                <TbX className="text-gray-400" />
            </button>
        </motion.div>
    );
}

/** Fixed bottom-center toast stack, identical placement to the web app. */
export function NotificationContainer(): JSX.Element {
    const { notifications } = useNotification();

    return (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-[10000] flex -translate-x-1/2 flex-col items-center">
            <AnimatePresence>
                {notifications.map((n) => (
                    <NotificationItem key={n.id} {...n} />
                ))}
            </AnimatePresence>
        </div>
    );
}
