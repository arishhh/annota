import Link from 'next/link';
import Image from 'next/image';

interface AppHeaderProps {
    rightSlot?: React.ReactNode;
    title?: string;
    description?: React.ReactNode;
    logoHref?: string;
}

export default function AppHeader({ rightSlot, title, description, logoHref }: AppHeaderProps) {
    const Logo = (
        <Image
            src="/brand/annota-logo.png"
            alt="Annota"
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: 'auto', height: '60px' }}
            className="rounded-2xl"
        />
    );

    return (
        <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex justify-between items-center rounded-none border-t-0 border-x-0 bg-[#0B0D12]/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    {logoHref ? (
                        <Link href={logoHref} className="hover:opacity-80 transition-opacity">
                            {Logo}
                        </Link>
                    ) : (
                        Logo
                    )}
                    {/* EARLY ACCESS BADGE */}
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#00F3FF] border border-[#00F3FF]/20 px-1.5 py-0.5 rounded bg-[#00F3FF]/5 shadow-[0_0_10px_rgba(0,243,255,0.1)]">
                        Early Access
                    </span>
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
