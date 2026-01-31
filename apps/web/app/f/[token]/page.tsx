'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

type Project = {
    id: string;
    name: string;
    baseUrl: string;
    status: 'IN_REVIEW' | 'APPROVED';
};

type Comment = {
    id: string;
    message: string;
    status: 'OPEN' | 'RESOLVED';
    createdAt: string;
    clickX: number;
    clickY: number;
};

export default function FeedbackPage({ params }: { params: { token: string } }) {
    // Data State
    const [project, setProject] = useState<Project | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // UI State
    const [commentMode, setCommentMode] = useState(false);
    const [iframeStatus, setIframeStatus] = useState<'LOADING' | 'LOADED' | 'ERROR'>('LOADING');
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN');

    // Popover State
    const [popover, setPopover] = useState<{ x: number; y: number; isOpen: boolean }>({
        x: 0,
        y: 0,
        isOpen: false,
    });
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Refs
    const overlayRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // --- 1. Fetch Data ---
    const fetchData = async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

            const resProject = await fetch(`${apiBase}/f/${params.token}`);
            if (!resProject.ok) throw new Error('Invalid or inactive link');
            const dataProject = await resProject.json();
            setProject(dataProject.project);

            const resComments = await fetch(`${apiBase}/f/${params.token}/comments`);
            if (resComments.ok) {
                setComments(await resComments.json());
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [params.token]);

    // --- 2. Iframe Monitoring ---
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (project && iframeStatus === 'LOADING') {
            // If load event doesn't fire in 4s, assume strict X-Frame-Options
            timer = setTimeout(() => {
                if (iframeStatus === 'LOADING') {
                    setIframeStatus('ERROR');
                }
            }, 4000);
        }
        return () => clearTimeout(timer);
    }, [project, iframeStatus]);

    // --- 3. Interaction Handlers ---
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (!commentMode || !overlayRef.current) return;
        if (popover.isOpen) {
            setPopover({ ...popover, isOpen: false });
            return;
        }

        const rect = overlayRef.current.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);

        // Clamp to container bounds
        const clampedX = Math.max(0, Math.min(x, rect.width));
        const clampedY = Math.max(0, Math.min(y, rect.height));

        setPopover({ x: clampedX, y: clampedY, isOpen: true });
        // Reset inputs
        setCommentText('');
    };

    const handleCancel = (e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent overlay click from re-triggering?
        setPopover({ ...popover, isOpen: false });
        setCommentText('');
    };

    const handleSubmit = async () => {
        if (!commentText.trim()) return;
        setSubmitting(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${apiBase}/f/${params.token}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageUrl: '/', // Placeholder for MVP
                    clickX: popover.x,
                    clickY: popover.y,
                    message: commentText,
                    screenshotUrl: null
                })
            });

            if (!res.ok) throw new Error('Failed to post comment');

            // Success
            handleCancel();
            // Refresh comments
            const resComments = await fetch(`${apiBase}/f/${params.token}/comments`);
            if (resComments.ok) setComments(await resComments.json());

            // Switch to Pending view to see new comment
            setFilterStatus('OPEN');

        } catch (err) {
            alert('Failed to submit comment');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Close popover on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && popover.isOpen) handleCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [popover.isOpen]);


    const handleResolve = async (commentId: string, currentStatus: 'OPEN' | 'RESOLVED') => {
        const newStatus = currentStatus === 'OPEN' ? 'RESOLVED' : 'OPEN';

        // Optimistic UI Update
        setComments(prev => prev.map(c =>
            c.id === commentId ? { ...c, status: newStatus } : c
        ));

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            await fetch(`${apiBase}/f/${params.token}/comments/${commentId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (err) {
            console.error('Resolve failed', err);
            // Revert on error could go here
        }
    };


    if (loading) return <div className="p-8 text-center text-[var(--muted)]">Loading...</div>;
    if (error || !project) return <div className="p-8 text-center text-red-500 font-bold">{error || 'Project not found'}</div>;

    // Derived State
    const openCount = comments.filter(c => c.status === 'OPEN').length;
    const resolvedCount = comments.filter(c => c.status === 'RESOLVED').length;

    const displayedComments = comments
        .filter(c => c.status === filterStatus)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first

    return (
        <div className={styles.pageContainer}>

            {/* Main Area: Header + Preview */}
            <div className={styles.mainArea}>
                <header className={styles.header}>
                    <div className="flex items-center gap-4">
                        <span className={styles.brand}>Annota</span>
                        <span className="text-[var(--muted)]">/ {project?.name}</span>
                        {project && (
                            <a href={project.baseUrl} target="_blank" className="text-sm text-[var(--accent1)] opacity-70 hover:opacity-100 flex items-center gap-1">
                                {new URL(project.baseUrl).hostname} ↗
                            </a>
                        )}
                    </div>

                    <div className={styles.headerActions}>
                        {project?.status === 'APPROVED' ? (
                            <span className="px-3 py-1 bg-green-900 text-green-300 rounded-full text-sm font-bold border border-green-700">
                                ✓ Approved
                            </span>
                        ) : (
                            <>
                                <button
                                    className={`btn ${commentMode ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setCommentMode(!commentMode)}
                                >
                                    {commentMode ? '● Comment Mode' : '○ Browse Mode'}
                                </button>
                            </>
                        )}
                    </div>
                </header>

                <div className={styles.previewContainer}>
                    {/* 1. Iframe */}
                    <iframe
                        src={project?.baseUrl}
                        className={styles.iframe}
                        onLoad={() => setIframeStatus('LOADED')}
                    // Allow interaction only in browse mode
                    />

                    {/* 2. Fallback State */}
                    {iframeStatus === 'ERROR' && (
                        <div className={styles.fallback}>
                            <h3 className="text-xl mb-4 font-bold">Preview Unavailable</h3>
                            <p className="mb-6 max-w-md">
                                This website blocks embedded previews (X-Frame-Options).
                                You can still view the site in a new tab.
                            </p>
                            <a href={project?.baseUrl} target="_blank" className="btn btn-primary">
                                Open Website ↗
                            </a>
                        </div>
                    )}

                    {/* 3. Pins Layer (Always Visible based on filter) */}
                    {iframeStatus !== 'ERROR' && displayedComments.map((comment, i) => (
                        <div
                            key={comment.id}
                            className={`${styles.pin} ${activeCommentId === comment.id ? styles.pinActive : ''}`}
                            style={{
                                left: comment.clickX,
                                top: comment.clickY,
                                pointerEvents: commentMode ? 'auto' : 'none',
                                opacity: comment.status === 'RESOLVED' ? 0.3 : 1, // Dim resolved pins
                                filter: comment.status === 'RESOLVED' ? 'grayscale(100%)' : 'none',
                                display: filterStatus === comment.status ? 'flex' : 'none' // Only show pins for current filter
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveCommentId(comment.id);
                                document.getElementById(`comment-${comment.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            onMouseEnter={() => setActiveCommentId(comment.id)}
                            onMouseLeave={() => setActiveCommentId(null)}
                        >
                            {/* Number logic: Index in displayed list + 1 */}
                            {i + 1}

                            {/* Tooltip on Hover */}
                            {activeCommentId === comment.id && (
                                <div className={styles.pinTooltip}>
                                    <span className={styles.tooltipStatus}>{comment.status}</span>
                                    <div className="line-clamp-3 overflow-hidden text-ellipsis">
                                        {comment.message}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* 4. Interaction Overlay (Comment Mode Only) */}
                    {commentMode && project?.status !== 'APPROVED' && iframeStatus !== 'ERROR' && (
                        <div
                            ref={overlayRef}
                            className={styles.overlay}
                            onClick={handleOverlayClick}
                        >
                            {/* Helper Text */}
                            {!popover.isOpen && (
                                <div className={styles.helperText}>
                                    Click anywhere to leave a comment
                                </div>
                            )}

                            {/* Popover */}
                            {popover.isOpen && (
                                <div
                                    ref={popoverRef}
                                    className={styles.popover}
                                    style={{ left: popover.x, top: popover.y }}
                                    onClick={(e) => e.stopPropagation()} // Don't close when clicking inside
                                >
                                    <textarea
                                        autoFocus
                                        placeholder="Add a comment..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
                                        }}
                                    />
                                    <div className={styles.popoverActions}>
                                        <button
                                            className="btn btn-ghost py-1 px-3 text-sm"
                                            onClick={(e) => handleCancel(e)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-primary py-1 px-3 text-sm"
                                            onClick={handleSubmit}
                                            disabled={submitting || !commentText.trim()}
                                        >
                                            {submitting ? '...' : 'Post'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar: Comments Feed */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>

                    {/* Status Pills */}
                    <div className="flex bg-[var(--surface)] p-1 rounded-lg">
                        <button
                            className={`flex-1 py-1.5 text-xs text-center rounded-md transition-all font-medium ${filterStatus === 'OPEN' ? 'bg-[var(--accent1)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-white'}`}
                            onClick={() => setFilterStatus('OPEN')}
                        >
                            Pending ({openCount})
                        </button>
                        <button
                            className={`flex-1 py-1.5 text-xs text-center rounded-md transition-all font-medium ${filterStatus === 'RESOLVED' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--muted)] hover:text-white'}`}
                            onClick={() => setFilterStatus('RESOLVED')}
                        >
                            Resolved ({resolvedCount})
                        </button>
                    </div>
                </div>

                <div className={styles.commentList}>
                    {displayedComments.length === 0 ? (
                        <div className={styles.emptyState}>
                            {filterStatus === 'OPEN' ? (
                                <>
                                    <p>No pending feedback.</p>
                                    <p className="text-sm mt-2">Everything looks good! Switch to <b>Comment Mode</b> to add more.</p>
                                </>
                            ) : (
                                <p>No resolved items yet.</p>
                            )}
                        </div>
                    ) : (
                        displayedComments.map((c, i) => (
                            <div
                                key={c.id}
                                id={`comment-${c.id}`}
                                className={`${styles.commentCard} ${activeCommentId === c.id ? styles.cardActive : ''}`}
                                style={{
                                    opacity: c.status === 'RESOLVED' ? 0.6 : 1,
                                }}
                                onMouseEnter={() => setActiveCommentId(c.id)}
                                onMouseLeave={() => setActiveCommentId(null)}
                                onClick={() => setActiveCommentId(c.id)}
                            >
                                <div className={styles.commentHeader}>
                                    <div className="flex items-center gap-2">
                                        <span className={`border rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold ${c.status === 'RESOLVED' ? 'bg-green-900 border-green-700 text-green-200' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
                                            {c.status === 'RESOLVED' ? '✓' : i + 1}
                                        </span>
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${c.status === 'RESOLVED' ? 'bg-white/5 text-[var(--muted)]' : 'bg-[var(--surface)] text-[var(--muted)]'}`}>
                                            {c.status}
                                        </span>
                                    </div>

                                    {/* Actions: Client can Resolve OPEN items, but CANNOT UNRESOLVE */}
                                    {c.status === 'OPEN' && (
                                        <button
                                            className="text-[var(--muted)] hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                                            title="Mark Resolved"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleResolve(c.id, c.status);
                                            }}
                                        >
                                            ✓
                                        </button>
                                    )}
                                </div>

                                <div className="whitespace-pre-wrap mt-2 text-sm leading-relaxed">{c.message}</div>

                                <div className="flex justify-between items-center mt-3">
                                    <div className="text-[10px] text-[var(--muted)]">
                                        {new Date(c.createdAt).toLocaleDateString()}
                                    </div>

                                    {/* "Not Fixed?" Action for Resolved Items */}
                                    {c.status === 'RESOLVED' && (
                                        <button
                                            className="text-[10px] text-[var(--accent1)] hover:underline opacity-80 hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFilterStatus('OPEN');
                                                setCommentMode(true);
                                            }}
                                        >
                                            Not fixed? Add new comment
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}
