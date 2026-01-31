'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

type Project = {
    id: string;
    name: string;
    baseUrl: string;
    status: 'IN_REVIEW' | 'APPROVED';
    createdAt: string;
    feedbackLink: {
        token: string;
        isActive: boolean;
    } | null;
};

export default function DashboardPage() {
    const [email, setEmail] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);

    // Create State
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');

    // Approval Modal State
    const [approvalModal, setApprovalModal] = useState<{ open: boolean; projectId: string | null }>({ open: false, projectId: null });
    const [clientEmail, setClientEmail] = useState('');
    const [sendingApproval, setSendingApproval] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('agency_email');
        if (stored) {
            setEmail(stored);
            setIsLoggedIn(true);
            fetchProjects(stored);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            localStorage.setItem('agency_email', email);
            setIsLoggedIn(true);
            fetchProjects(email);
        }
    };

    const fetchProjects = async (userEmail: string) => {
        setLoading(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${apiBase}/projects`, {
                headers: { 'x-owner-email': userEmail }
            });
            if (res.ok) {
                setProjects(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newUrl) return;

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${apiBase}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-owner-email': email
                },
                body: JSON.stringify({ name: newName, baseUrl: newUrl })
            });

            if (res.ok) {
                const project = await res.json();
                // Ensure link is created immediately for convenience
                await fetch(`${apiBase}/projects/${project.id}/feedback-link`, {
                    method: 'POST',
                    headers: { 'x-owner-email': email }
                });

                setNewName('');
                setNewUrl('');
                fetchProjects(email);
            } else {
                alert('Failed to create project');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRequestApproval = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!approvalModal.projectId || !clientEmail) return;

        setSendingApproval(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${apiBase}/approval/request/${approvalModal.projectId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-owner-email': email
                },
                body: JSON.stringify({ email: clientEmail })
            });

            if (res.ok) {
                alert('Approval request sent!');
                setApprovalModal({ open: false, projectId: null });
                setClientEmail('');
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (err) {
            console.error('Approval request failed', err);
            alert('Failed to send request');
        } finally {
            setSendingApproval(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className={styles.container}>
                <div className={styles.loginContainer}>
                    <h1 className="text-2xl font-bold mb-4">Agency Login</h1>
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="input bg-[var(--bg-dark)] border border-[var(--border)] p-2 rounded text-white"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                        <button className="btn btn-primary w-full">Access Dashboard</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.dashboardHeader}>
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-[var(--muted)]">Welcome, {email}</p>
                </div>
                <button
                    className="btn btn-ghost text-sm"
                    onClick={() => {
                        localStorage.removeItem('agency_email');
                        setIsLoggedIn(false);
                        setEmail('');
                    }}
                >
                    Logout
                </button>
            </header>

            {/* Create Project */}
            <form onSubmit={handleCreate} className={styles.createForm}>
                <input
                    type="text"
                    placeholder="Project Name"
                    className="bg-transparent border border-[var(--border)] p-2 rounded text-white flex-1"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                />
                <input
                    type="url"
                    placeholder="Website URL (https://...)"
                    className="bg-transparent border border-[var(--border)] p-2 rounded text-white flex-1"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    required
                />
                <button className="btn btn-primary whitespace-nowrap">
                    + Create Project
                </button>
            </form>

            {/* Project List */}
            {loading ? (
                <div className="text-center text-[var(--muted)]">Loading projects...</div>
            ) : (
                <div className={styles.projectsGrid}>
                    {projects.map(p => (
                        <div key={p.id} className={styles.projectCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.projectName}>{p.name}</h3>
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${p.status === 'APPROVED' ? 'border-green-800 text-green-400' : 'border-[var(--accent2)] text-[var(--accent2)]'}`}>
                                    {p.status}
                                </span>
                            </div>
                            <a href={p.baseUrl} target="_blank" className={styles.projectUrl}>
                                {p.baseUrl} ↗
                            </a>

                            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/10">
                                {p.feedbackLink ? (
                                    <a
                                        href={`/f/${p.feedbackLink.token}`}
                                        className="btn btn-primary text-center py-2 text-sm w-full"
                                    >
                                        Open Review Tool
                                    </a>
                                ) : (
                                    <button className="btn btn-ghost text-xs w-full">
                                        Generate Link
                                    </button>
                                )}

                                <button
                                    className="btn btn-ghost border border-white/20 text-sm hover:bg-white/10 w-full"
                                    onClick={() => setApprovalModal({ open: true, projectId: p.id })}
                                    disabled={p.status === 'APPROVED'}
                                >
                                    {p.status === 'APPROVED' ? '✓ Approved' : '✉ Request Approval'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Modal */}
            {approvalModal.open && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div className={styles.loginContainer} style={{ margin: 0, minWidth: '400px' }}>
                        <h2 className="text-xl font-bold mb-4">Request Client Approval</h2>
                        <form onSubmit={handleRequestApproval} className="flex flex-col gap-4">
                            <input
                                type="email"
                                placeholder="Client Email"
                                className="input bg-[var(--bg-dark)] border border-[var(--border)] p-2 rounded text-white"
                                value={clientEmail}
                                onChange={e => setClientEmail(e.target.value)}
                                autoFocus
                                required
                            />
                            <div className="flex gap-2 justify-end mt-2">
                                <button
                                    type="button"
                                    className="btn btn-ghost text-sm"
                                    onClick={() => setApprovalModal({ open: false, projectId: null })}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    disabled={sendingApproval}
                                >
                                    {sendingApproval ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
