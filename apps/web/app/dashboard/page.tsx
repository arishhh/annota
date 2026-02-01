'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AppHeader from '../../components/AppHeader';
import CreateProjectModal from '../../components/CreateProjectModal';

export default function DashboardPage() {
    const router = useRouter();
    const [authEmail, setAuthEmail] = useState<string | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [creatingLink, setCreatingLink] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. Auth Check (Client-side simple check)
    useEffect(() => {
        const stored = localStorage.getItem('annota_owner_email');
        if (stored) {
            setAuthEmail(stored);
            fetchProjects(stored);
        } else {
            router.push('/login');
        }
    }, [router]);

    const fetchProjects = async (ownerEmail: string) => {
        setLoading(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${apiBase}/projects`, {
                headers: { 'x-owner-email': ownerEmail }
            });
            if (res.ok) {
                setProjects(await res.json());
            } else {
                console.error('Failed to fetch projects');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateLink = async (projectId: string) => {
        setCreatingLink(projectId);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            await fetch(`${apiBase}/projects/${projectId}/feedback-link`, {
                method: 'POST',
                headers: { 'x-owner-email': authEmail || '' }
            });
            fetchProjects(authEmail!);
            toast.success("Feedback link generated");
        } catch (e) {
            toast.error("Failed to generate link");
        } finally {
            setCreatingLink(null);
        }
    };

    const handleCreateProject = async (name: string, baseUrl: string) => {
        const ownerEmail = localStorage.getItem('annota_owner_email')?.trim().toLowerCase();

        if (!ownerEmail) {
            toast.error("Set your email first to create projects.");
            throw new Error("Owner email is missing");
        }

        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

        const res = await fetch(`${apiBase}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-owner-email': ownerEmail
            },
            body: JSON.stringify({ name, baseUrl })
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = data.message || "Failed to create project";
            toast.error(msg);
            throw new Error(msg);
        }

        toast.success("Project created successfully");
        setIsModalOpen(false);

        // Optimistic update or refetch
        // We'll refetch to be safe and simple since we have the function
        await fetchProjects(ownerEmail);
    };

    const handleLogout = () => {
        localStorage.removeItem('annota_owner_email');
        setAuthEmail(null);
        setProjects([]);
        toast.message("Logged out");
        router.push('/');
    };

    if (!authEmail) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)] font-sans selection:bg-[var(--accent-0)]/30">
            <AppHeader
                title="Dashboard"
                rightSlot={
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-primary text-xs py-2 px-4 shadow-[0_4px_14px_0_rgba(0,243,255,0.2)] hover:shadow-[0_6px_20px_rgba(0,243,255,0.35)]"
                        >
                            + New Project
                        </button>
                        <div className="h-6 w-px bg-white/10 mx-1"></div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-[var(--text-1)] hidden sm:inline-block">{authEmail}</span>
                            <button
                                onClick={handleLogout}
                                className="btn btn-secondary text-xs py-2 px-4"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                }
            />

            <main className="container mx-auto max-w-5xl px-6 py-12">
                {loading ? (
                    <div className="animate-pulse space-y-4 max-w-2xl mx-auto mt-10">
                        <div className="h-24 bg-[var(--bg-1)] rounded-xl border border-[var(--border-0)]"></div>
                        <div className="h-24 bg-[var(--bg-1)] rounded-xl border border-[var(--border-0)]"></div>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-24 glass-panel rounded-2xl border-dashed border-[var(--border-0)] max-w-2xl mx-auto mt-10">
                        <h3 className="text-lg font-bold mb-2">No projects found</h3>
                        <p className="text-[var(--text-1)]">Projects created via API will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 max-w-4xl mx-auto">
                        <div className="flex justify-between items-end mb-4 px-2">
                            <h2 className="text-sm font-bold text-[var(--text-1)] uppercase tracking-wider">Your Projects</h2>
                            <span className="text-xs text-[var(--text-1)]">{projects.length} Active</span>
                        </div>

                        {projects.map(p => (
                            <div key={p.id} className="glass-panel p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:translate-y-[-2px] transition-transform duration-300">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg text-[var(--text-0)] truncate">{p.name}</h3>
                                        {p.status === 'APPROVED' ? (
                                            <span className="text-[10px] bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20 font-bold tracking-wide">APPROVED</span>
                                        ) : (
                                            <span className="text-[10px] bg-[var(--bg-2)] text-[var(--text-1)] px-2.5 py-1 rounded-full border border-[var(--border-0)] font-bold tracking-wide">IN REVIEW</span>
                                        )}
                                    </div>
                                    <a href={p.baseUrl} target="_blank" className="flex items-center gap-1.5 text-xs text-[var(--text-1)] hover:text-[var(--accent-0)] transition-colors w-fit group/link">
                                        <span className="truncate max-w-[300px]">{p.baseUrl}</span>
                                        <span className="opacity-0 group-hover/link:opacity-100 transition-opacity">↗</span>
                                    </a>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                                    {p.feedbackLink ? (
                                        <>
                                            <a
                                                href={`/f/${p.feedbackLink.token}`}
                                                target="_blank"
                                                className="btn btn-secondary text-xs py-2 px-4 flex-1 md:flex-none text-center"
                                            >
                                                Open Review ↗
                                            </a>
                                            <Link
                                                href={`/dashboard/projects/${p.id}`}
                                                className="btn btn-primary text-xs py-2 px-5 flex-1 md:flex-none text-center shadow-[0_4px_14px_0_rgba(0,243,255,0.2)] hover:shadow-[0_6px_20px_rgba(0,243,255,0.35)]"
                                            >
                                                Manage
                                            </Link>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleGenerateLink(p.id)}
                                            disabled={!!creatingLink}
                                            className="btn btn-secondary text-xs py-2 px-4 w-full md:w-auto"
                                        >
                                            {creatingLink === p.id ? 'Generating...' : 'Generate Feedback Link'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <CreateProjectModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateProject}
            />
        </div>
    );
}
