import { TbCheck, TbUserSearch, TbRestore } from 'react-icons/tb';
import Modal from './Modal';
import { OFFICIAL_ROLES, type RoleTemplate } from '@/data/roles';

interface Props {
    isOpen: boolean;
    selectedRole: RoleTemplate | null;
    onClose: () => void;
    onSelect: (role: RoleTemplate | null) => void;
}

/** Role preset picker, mirroring the web app's `RoleSelectionModal`. */
export default function RoleSelectionModal({
    isOpen,
    selectedRole,
    onClose,
    onSelect,
}: Props): JSX.Element {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Choose a Role"
            subtitle="Activate a specialized persona for your AI assistant"
            icon={TbUserSearch}
            accent="text-blue-500"
        >
            <div className="grid grid-cols-1 gap-3">
                <button
                    onClick={() => {
                        onSelect(null);
                        onClose();
                    }}
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                        !selectedRole
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                            : 'border-border hover:border-blue-200 dark:hover:border-blue-800'
                    }`}
                >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--surface-2)]">
                        <TbRestore className="text-text" />
                    </div>
                    <div>
                        <span className="block text-sm font-bold text-text-h">
                            No Role (Default)
                        </span>
                        <span className="text-[10px] text-text">
                            Standard AI assistant without a persona
                        </span>
                    </div>
                </button>

                <div className="my-2 h-px bg-border" />

                {OFFICIAL_ROLES.map((role) => {
                    const isSelected = selectedRole?.id === role.id;
                    return (
                        <button
                            key={role.id}
                            onClick={() => {
                                onSelect(role);
                                onClose();
                            }}
                            className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                                isSelected
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                    : 'border-border hover:border-blue-200 dark:hover:border-blue-800'
                            }`}
                        >
                            <div
                                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all ${
                                    isSelected
                                        ? 'bg-blue-500 text-white shadow-lg'
                                        : 'bg-[color:var(--surface-2)] text-blue-500'
                                }`}
                            >
                                <TbUserSearch />
                            </div>
                            <div className="flex-1">
                                <span className="block text-sm font-bold text-text-h">
                                    {role.name}
                                </span>
                                <span className="line-clamp-2 text-[10px] text-text">
                                    {role.description}
                                </span>
                            </div>
                            {isSelected && (
                                <div className="grid h-5 w-5 place-items-center rounded-full bg-blue-500 text-white shadow-sm">
                                    <TbCheck className="h-3 w-3" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </Modal>
    );
}
