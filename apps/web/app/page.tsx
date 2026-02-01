'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
        <main className="min-h-screen flex flex-col bg-[var(--bg-0)] text-[var(--text-0)] overflow-x-hidden relative">
            {/* Background Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent-0)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent-1)] opacity-[0.03] blur-[100px] rounded-full pointer-events-none"></div>

            {/* Header */}
            <header className="border-b border-[var(--border)] py-6 glass-panel border-x-0 border-t-0 sticky top-0 z-50">
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center">
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
                    <nav>
                        <Link href="/login" className="btn btn-secondary text-sm py-2.5 px-6 hover:bg-white/5 border-[var(--border)] transition-all">
                            Login
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="flex-1 flex flex-col justify-center py-24 relative z-10">
                <div className="container mx-auto px-6 text-center">
                    <div className="inline-block px-4 py-1.5 mb-8 rounded-full border border-[var(--accent-0)]/20 bg-[var(--accent-0)]/5 text-[var(--accent-0)] text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,243,255,0.1)]">
                        Beta Release
                    </div>
                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight text-white leading-tight">
                        Feedback that <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-0)] to-[var(--accent-1)]">glows</span>.
                    </h2>
                    <p className="text-xl md:text-2xl text-[var(--text-1)] max-w-3xl mx-auto mb-12 leading-relaxed font-light">
                        Streamline your website approval process with precise comments,
                        visual annotations, and instant approvals.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-5 justify-center">
                        <Link href="/login" className="btn btn-primary px-10 py-4 text-base shadow-[0_0_20px_rgba(0,243,255,0.25)] hover:shadow-[0_0_35px_rgba(0,243,255,0.4)] transition-shadow">
                            Get Started
                        </Link>
                        <button className="btn btn-secondary px-10 py-4 text-base">View Demo</button>
                    </div>
                </div>
            </section>

            {/* Features & API Status */}
            <section className="bg-[var(--bg-1)]/50 py-24 border-t border-[var(--border)] relative z-10">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-6xl mx-auto">
                        <div className="card p-8 border border-[var(--border)] bg-[var(--bg-1)] hover:border-[var(--accent-0)]/30 transition-colors duration-300">
                            <h3 className="text-xl font-bold mb-3 text-white">Visual Comments</h3>
                            <p className="text-[var(--text-1)] leading-relaxed">Click anywhere to leave feedback directly on the live site.</p>
                        </div>
                        <div className="card p-8 border border-[var(--border)] bg-[var(--bg-1)] hover:border-[var(--accent-1)]/30 transition-colors duration-300">
                            <h3 className="text-xl font-bold mb-3 text-white">Shareable Links</h3>
                            <p className="text-[var(--text-1)] leading-relaxed">Send a magic link to clients. No login required for guests.</p>
                        </div>
                        <div className="card p-8 border border-[var(--border)] bg-[var(--bg-1)] hover:border-[var(--accent-0)]/30 transition-colors duration-300">
                            <h3 className="text-xl font-bold mb-3 text-white">Workflow Status</h3>
                            <p className="text-[var(--text-1)] leading-relaxed">Track status from "In Review" to "Approved" seamlessly.</p>
                        </div>
                    </div>

                    {/* API Status Widget */}
                    <div className="flex justify-center">
                        <div className="glass-panel rounded-full px-6 py-2 flex items-center gap-3 border border-[var(--border)]">
                            <span className="text-sm text-[var(--text-1)] font-medium">System Status:</span>
                            {apiStatus === 'loading' && (
                                <span className="text-sm text-[var(--text-1)] animate-pulse">Checking...</span>
                            )}
                            {apiStatus === 'connected' && (
                                <span className="flex items-center gap-2 text-sm text-[var(--accent-0)] font-bold">
                                    <span className="w-2 h-2 rounded-full bg-[var(--accent-0)] shadow-[0_0_8px_var(--accent-0)]"></span>
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
