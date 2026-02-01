import Image from 'next/image';

interface AppHeaderProps {
    rightSlot?: React.ReactNode;
    title?: string;
    description?: React.ReactNode;
}

export default function AppHeader({ rightSlot, title, description }: AppHeaderProps) {
    return (
        <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex justify-between items-center rounded-none border-t-0 border-x-0 bg-[#0B0D12]/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <Image
                        src="/brand/annota-logo.png"
                        alt="Annota"
                        width={0}
                        height={0}
                        sizes="100vw"
                        style={{ width: 'auto', height: '60px' }}
                        className="rounded-2xl"
                    />
                </div>
                {title && (
                    <>
                        <div className="h-4 w-px bg-white/10 mx-2"></div>
                        <div className="flex flex-col justify-center">
                            <span className="text-sm font-medium text-[var(--text-0)] leading-none">{title}</span>
                            {description && <span className="text-[10px] text-[var(--text-1)] uppercase tracking-wider mt-0.5">{description}</span>}
                        </div>
                    </>
                )}
            </div>
            {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
        </header>
    );
}
