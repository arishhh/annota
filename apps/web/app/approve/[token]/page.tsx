'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';

export default function ApprovalPage() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState<any>(null);
    const [commentToken, setCommentToken] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [pin, setPin] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Auto-redirect state
    const [redirectIn, setRedirectIn] = useState<number | null>(null);
    const [redirectCancelled, setRedirectCancelled] = useState(false);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const apiBase = '/api';
                const res = await fetch(`${apiBase}/approval/${params.token}`);
                if (res.ok) {
                    const data = await res.json();
                    setProject(data.project);
                    setCommentToken(data.commentToken);

                    if (data.project.status === 'APPROVED') {
                        setSuccess(true);
                    }
                } else {
                    const err = await res.json();
                    setError(err.error || 'Invalid link');
                }
            } catch (e) {
                setError('Failed to load approval info');
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, [params.token]);

    // Handle Auto-Redirect Timer
    useEffect(() => {
        if (success && commentToken && !redirectCancelled) {
            setRedirectIn(5); // Start 5s countdown (slightly longer for ceremony)
            const timer = setInterval(() => {
                setRedirectIn((prev) => {
                    if (prev === 1) {
                        clearInterval(timer);
                        window.location.href = `/f/${commentToken}`;
                        return 0;
                    }
                    return (prev || 0) - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [success, commentToken, redirectCancelled]);

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const apiBase = '/api';
            const res = await fetch(`${apiBase}/approval/${params.token}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });

            if (res.ok) {
                // Determine approvedAt time locally if just approved, or use existing
                if (!project.approvedAt) {
                    setProject((prev: any) => ({ ...prev, approvedAt: new Date().toISOString() }));
                }
                setSuccess(true);
            } else {
                const err = await res.json();
                setError(err.error || 'Verification failed');
            }
        } catch (e) {
            setError('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.container}>Loading...</div>;
    }

    if (!project && error) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h1 className={styles.title}>Link Expired</h1>
                    <p className={styles.subtitle}>{error === 'Not found' ? 'This link is invalid or has expired.' : error}</p>
                </div>
            </div>
        );
    }

    if (success) {
        const approvedDate = project.approvedAt ? new Date(project.approvedAt).toLocaleDateString() : 'Just now';

        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    {/* Ceremonial Checkmark */}
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-[scaleIn_0.4s_ease-out]">
                        <svg className="w-10 h-10 text-black drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className={styles.title}>Project Approved</h1>
                    <p className={styles.subtitle}>
                        Thanks for reviewing the changes. Your approval has been recorded.
                        <br />
                        <span className="text-xs text-[var(--muted)] block mt-2 opacity-60 uppercase tracking-widest font-bold">
                            Approved on {approvedDate}
                        </span>
                    </p>

                    <div className="flex flex-col gap-3 mt-8 w-full max-w-xs mx-auto">
                        {commentToken && (
                            <a
                                href={`/f/${commentToken}`}
                                className={styles.button}
                                onClick={() => setRedirectCancelled(true)}
                            >
                                Return to Feedback
                            </a>
                        )}

                        <a
                            href={project.baseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--muted)] hover:text-white transition-colors py-2"
                            onClick={() => setRedirectCancelled(true)}
                        >
                            Open Website ↗
                        </a>
                    </div>

                    {redirectIn !== null && redirectIn > 0 && !redirectCancelled && (
                        <div className="mt-6 text-[10px] text-[var(--muted)] opacity-50">
                            Redirecting to feedback in {redirectIn}s...
                            <button
                                onClick={() => setRedirectCancelled(true)}
                                className="ml-1 underline hover:text-white cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Approve Project</h1>
                <p className={styles.subtitle}>
                    Please enter the 6-digit PIN sent to your email to approve <strong>{project.name}</strong>.
                </p>

                <form onSubmit={handleConfirm}>
                    <input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        className={styles.pinInput}
                        value={pin}
                        onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                        autoFocus
                    />

                    <button
                        className={styles.button}
                        disabled={submitting || pin.length !== 6}
                    >
                        {submitting ? 'Verifying...' : 'Confirm Approval'}
                    </button>

                    {error && <div className={styles.error}>{error}</div>}
                </form>

                <div className="mt-8 pt-4 border-t border-white/10 text-xs text-[var(--muted)] opacity-50">
                    Project URL: {project.baseUrl}
                </div>
            </div>
            {/* Minimal footer for trust */}
            <div className="absolute bottom-4 left-0 w-full text-center">
                <span className="text-[9px] text-[var(--muted)] opacity-20 uppercase tracking-widest">
                    Secure Approval by Annota
                </span>
            </div>
        </div>
    );
}
