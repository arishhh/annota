'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
    const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');

    useEffect(() => {
        const checkApi = async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
                const res = await fetch(`${baseUrl}/health`);
                const data = await res.json();
                if (data.ok) {
                    setApiStatus('connected');
                } else {
                    setApiStatus('error');
                }
            } catch (e) {
                setApiStatus('error');
            }
        };
        checkApi();
    }, []);

    return (
        <main className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b border-[var(--border)] py-6">
                <div className="container flex justify-between items-center">
                    <h1 className="text-2xl font-bold tracking-tight">
                        Annota<span className="text-[var(--accent1)]">.</span>
                    </h1>
                    <nav>
                        <Link href="/login" className="btn btn-ghost text-sm py-2 px-4">
                            Login
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="flex-1 flex flex-col justify-center py-20">
                <div className="container text-center">
                    <div className="inline-block px-3 py-1 mb-6 rounded-full border border-[var(--accent1)] bg-[rgba(0,243,255,0.05)] text-[var(--accent1)] text-xs font-medium tracking-wider uppercase">
                        Beta Release
                    </div>
                    <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                        Feedback that <span className="gradient-text">glows</span>.
                    </h2>
                    <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10">
                        Streamline your website approval process with precise comments,
                        visual annotations, and instant approvals.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button className="btn btn-primary">Get Started</button>
                        <button className="btn btn-ghost">View Demo</button>
                    </div>
                </div>
            </section>

            {/* Features & API Status */}
            <section className="bg-[rgba(255,255,255,0.02)] py-20 border-t border-[var(--border)]">
                <div className="container">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        <div className="card">
                            <h3 className="text-xl font-bold mb-3">Visual Comments</h3>
                            <p className="text-[var(--muted)]">Click anywhere to leave feedback directly on the live site.</p>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-3">Shareable Links</h3>
                            <p className="text-[var(--muted)]">Send a magic link to clients. No login required for guests.</p>
                        </div>
                        <div className="card">
                            <h3 className="text-xl font-bold mb-3">Workflow status</h3>
                            <p className="text-[var(--muted)]">Track status from "In Review" to "Approved" seamlessly.</p>
                        </div>
                    </div>

                    {/* API Status Widget */}
                    <div className="flex justify-center">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-full px-6 py-2 flex items-center gap-3">
                            <span className="text-sm text-[var(--muted)] font-medium">System Status:</span>
                            {apiStatus === 'loading' && (
                                <span className="text-sm text-[var(--muted)]">Checking...</span>
                            )}
                            {apiStatus === 'connected' && (
                                <span className="flex items-center gap-2 text-sm text-[var(--accent1)] font-bold">
                                    <span className="w-2 h-2 rounded-full bg-[var(--accent1)] shadow-[0_0_8px_var(--accent1)]"></span>
                                    Connected
                                </span>
                            )}
                            {apiStatus === 'error' && (
                                <span className="flex items-center gap-2 text-sm text-red-500 font-bold">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Disconnected
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
