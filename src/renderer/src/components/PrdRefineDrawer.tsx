import React, { useState } from 'react';
import {
    TbSparkles,
    TbX,
    TbArrowRight,
    TbDatabase,
    TbCode,
    TbShieldLock,
    TbCreditCard,
} from 'react-icons/tb';
import Loader from './Loader';

interface PrdRefineDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onRefineSubmit: (instruction: string) => Promise<void>;
    isRefining: boolean;
}

const QUICK_PROMPTS = [
    {
        icon: TbCode,
        label: 'Ganti Stack ke Next.js 15 + Supabase',
        prompt: 'Tolong modifikasi tech stack dalam PRD ini menjadi Next.js 15 (App Router), Supabase (Auth & Postgres), Tailwind CSS v4, dan sesuaikan arsitektur serta instruksi agent rules-nya.',
    },
    {
        icon: TbCreditCard,
        label: 'Tambah Payment Gateway & Escrow',
        prompt: 'Tambahkan modul pembayaran otomatis lengkap: integrasi payment gateway Midtrans / Stripe, sistem escrow payment untuk transaksi aman, dan endpoint webhook settlement.',
    },
    {
        icon: TbShieldLock,
        label: 'Perketat RBAC & Auth Security',
        prompt: 'Perkuat spesifikasi otentikasi dengan multi-tenant RBAC (Superadmin, Tenant Admin, Member), verifikasi email OTP, refresh token rotation, dan audit trail log.',
    },
    {
        icon: TbDatabase,
        label: 'Detailkan Skema DB & Relasi',
        prompt: 'Perluas diagram database schema ERD dengan relasi antar tabel secara lengkap, tipe data PostgreSQL yang presisi, indexing penting, dan soft delete columns.',
    },
];

export const PrdRefineDrawer: React.FC<PrdRefineDrawerProps> = ({
    isOpen,
    onClose,
    onRefineSubmit,
    isRefining,
}) => {
    const [instruction, setInstruction] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!instruction.trim() || isRefining) return;
        await onRefineSubmit(instruction.trim());
        setInstruction('');
    };

    const handleSelectQuickPrompt = (promptText: string) => {
        setInstruction(promptText);
    };

    return (
        <div className="fixed inset-0 z-70 bg-black/50 backdrop-blur-xs flex justify-end">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                            <TbSparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                Iterate with AI
                            </h3>
                            <p className="text-[11px] text-neutral-500">
                                Berikan instruksi untuk menyempurnakan PRD hasil.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <TbX className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                    {/* Quick chips */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                            Quick Refinements
                        </label>
                        <div className="space-y-2">
                            {QUICK_PROMPTS.map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectQuickPrompt(item.prompt)}
                                        className="cursor-pointer w-full text-left p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all flex items-start gap-2.5 group"
                                    >
                                        <Icon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                {item.label}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom instruction form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                            Instruksi Tambahan / Custom
                        </label>
                        <textarea
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="Contoh: Tambahkan fitur multi-currency (IDR, USD), integrasi OAuth Google, dan ganti Tailwind v3 ke v4..."
                            rows={5}
                            disabled={isRefining}
                            className="w-full p-3 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-hidden focus:border-blue-500 text-neutral-900 dark:text-white leading-relaxed resize-none"
                        />
                        <button
                            type="submit"
                            disabled={!instruction.trim() || isRefining}
                            className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {isRefining ? (
                                <>
                                    <Loader className="w-3.5 h-3.5" />
                                    <span>Sedang Memperbarui PRD...</span>
                                </>
                            ) : (
                                <>
                                    <TbSparkles className="w-3.5 h-3.5" />
                                    <span>Terapkan Perubahan dengan AI</span>
                                    <TbArrowRight className="w-3.5 h-3.5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
export default PrdRefineDrawer;
