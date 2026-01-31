import Link from 'next/link';

export default function Login() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="text-2xl font-bold tracking-tight mb-2 inline-block">
                        Annota<span className="text-[var(--accent1)]">.</span>
                    </Link>
                    <h2 className="text-xl font-semibold">Welcome back</h2>
                    <p className="text-[var(--muted)] text-sm mt-1">Sign in to your account</p>
                </div>

                <form className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1 text-[var(--muted)]">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            placeholder="you@example.com"
                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--accent1)]"
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-full">
                        Continue with Email
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/" className="text-sm text-[var(--muted)] hover:text-white transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
