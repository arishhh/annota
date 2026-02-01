'use client';
import { useState, useRef, useEffect } from 'react';

interface CreateProjectModalProps {
    open: boolean;
    onClose: () => void;
    onCreate: (name: string, baseUrl: string) => Promise<void>;
}

export default function CreateProjectModal({ open, onClose, onCreate }: CreateProjectModalProps) {
    const [name, setName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on open
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
        // Reset state on open
        if (open) {
            setName('');
            setBaseUrl('');
            setError(null);
            setIsSubmitting(false);
        }
    }, [open]);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (open && e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 1. Normalize
        const safeName = name.trim();
        const safeUrl = baseUrl.trim().replace(/\/+$/, '');

        // 2. Validate
        if (safeName.length < 2) {
            setError("Project name must be at least 2 characters.");
            return;
        }
        if (!/^https?:\/\//.test(safeUrl)) {
            setError("Website URL must start with http:// or https://");
            return;
        }

        // 3. Submit
        setIsSubmitting(true);
        try {
            await onCreate(safeName, safeUrl);
            // Parent handles closing on success usually, but we assume success if no error thrown
        } catch (err: any) {
            setError(err.message || "Failed to create project");
            setIsSubmitting(false); // Only re-enable if failed
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Panel */}
            <div className="glass-panel--strong relative w-full max-w-md rounded-2xl p-8 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border border-white/10">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-0)] mb-1">New Project</h2>
                    <p className="text-sm text-[var(--text-1)]">Add a client website to start reviewing.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[var(--text-1)] uppercase tracking-wide">Project Name</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Acme Corp Redesign"
                            className="w-full bg-black border border-[var(--border-0)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-0)]/50 transition-all text-white placeholder:text-[var(--text-1)]/50"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[var(--text-1)] uppercase tracking-wide">Website URL</label>
                        <input
                            type="text"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full bg-black border border-[var(--border-0)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-0)]/50 transition-all text-white placeholder:text-[var(--text-1)]/50 font-mono"
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium flex items-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost text-xs hover:bg-white/5"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary text-xs shadow-[0_0_15px_rgba(0,243,255,0.15)]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
