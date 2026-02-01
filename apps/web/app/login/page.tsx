'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const safeEmail = email.trim().toLowerCase();

        // Basic validation
        if (!safeEmail.includes('@') || !safeEmail.includes('.') || safeEmail.length < 5) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsSubmitting(true);

        try {
            // MVP Auth: Just store locally and redirect
            localStorage.setItem("annota_owner_email", safeEmail);
            toast.success("Logged in successfully");

            // Artificial delay for feel
            await new Promise(r => setTimeout(r, 500));

            router.push("/dashboard");
        } catch (err) {
            toast.error("Something went wrong");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-0)] text-[var(--text-0)] relative overflow-hidden p-6">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent-0)] opacity-[0.05] blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent-1)] opacity-[0.05] blur-[120px] rounded-full pointer-events-none"></div>

            <div className="glass-panel p-10 rounded-2xl w-full max-w-sm relative z-10 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
                    <p className="text-sm text-[var(--text-1)]">Enter your email to access your dashboard.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[var(--text-1)] uppercase tracking-wide">Email Address</label>
                        <input
                            className="w-full bg-black border border-[var(--border-0)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-0)]/50 transition-all placeholder:text-[var(--text-1)] text-white"
                            placeholder="you@company.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary w-full py-3 justify-center shadow-[0_0_20px_rgba(0,243,255,0.15)]"
                    >
                        {isSubmitting ? 'Logging in...' : 'Continue'}
                    </button>

                    <p className="text-[10px] text-center text-[var(--text-1)] opacity-70">
                        Beta auth: we use your email to scope projects locally.
                    </p>
                </form>
            </div>
        </div>
    );
}
