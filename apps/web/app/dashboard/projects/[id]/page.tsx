'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import ReviewInterface from '../../../../components/ReviewInterface';


export default function ProjectDashboard({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [currentPath, setCurrentPath] = useState('/');
    const [authEmail, setAuthEmail] = useState<string | null>(null);
    const [project, setProject] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

    useEffect(() => {
        const stored = localStorage.getItem('annota_owner_email');
        if (!stored) {
            router.push('/login');
        } else {
            setAuthEmail(stored);
            fetchData(stored, currentPath);
        }
    }, [params.id]);

    const fetchData = async (email: string, pageUrl: string = '/') => {
        try {
            // Fetch Project (only once if optimized, but here we can refetch)
            const resProj = await fetch(`${apiBase}/projects/${params.id}`, {
                headers: { 'x-owner-email': email }
            });
            if (!resProj.ok) throw new Error('Failed to load project');
            const projData = await resProj.json();
            setProject(projData);

            // Fetch Comments for SPECIFIC page
            const resComments = await fetch(`${apiBase}/comments/projects/${params.id}?pageUrl=${encodeURIComponent(pageUrl)}`, {
                headers: { 'x-owner-email': email }
            });
            if (resComments.ok) {
                setComments(await resComments.json());
            }

        } catch (e) {
            console.error(e);
            toast.error('Failed to load project data');
            router.push('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handlePathChange = (newPath: string) => {
        if (newPath !== currentPath) {
            setCurrentPath(newPath);
            if (authEmail) fetchData(authEmail, newPath);
        }
    };

    const handleUpdateStatus = async (commentId: string, status: 'OPEN' | 'RESOLVED') => {
        // Optimistic
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, status } : c));

        try {
            await fetch(`${apiBase}/comments/${commentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-owner-email': authEmail || ''
                },
                body: JSON.stringify({ status })
            });
            toast.success(status === 'RESOLVED' ? 'Marked as resolved' : 'Comment reopened');
        } catch (e) {
            toast.error('Failed to update status');
            fetchData(authEmail!, currentPath); // Revert
        }
    };

    const handleCreateComment = async (payload: { x: number; y: number; message: string; pageUrl: string }) => {
        if (!project?.feedbackLink?.token) return;

        const res = await fetch(`${apiBase}/f/${project.feedbackLink.token}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pageUrl: payload.pageUrl,
                clickX: payload.x,
                clickY: payload.y,
                message: payload.message,
                screenshotUrl: null
            })
        });

        if (res.ok) {
            const resComments = await fetch(`${apiBase}/comments/projects/${params.id}?pageUrl=${encodeURIComponent(payload.pageUrl)}`, {
                headers: { 'x-owner-email': authEmail! }
            });
            if (resComments.ok) setComments(await resComments.json());
            toast.success('Comment added');
        } else {
            toast.error('Failed to create comment');
        }
    };

    // ... (rest of the file)


    const handleRequestApproval = async () => {
        if (!confirm('Send approval request email to yourself?')) return;
        setRequesting(true);
        try {
            const res = await fetch(`${apiBase}/approval/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-owner-email': authEmail!
                },
                body: JSON.stringify({ projectId: project.id })
            });

            if (res.ok) {
                toast.success('Approval request sent! Check your email.');
            } else {
                toast.error('Failed to send request');
            }
        } catch (e) {
            toast.error('Error sending request');
        } finally {
            setRequesting(false);
        }
    };

    if (loading && !project) return <div className="p-10 text-center text-[var(--muted)]">Loading project...</div>;
    if (!project) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">


            {/* Reused Interface in Agency Mode */}
            <div className="flex-1 relative">
                <ReviewInterface
                    mode="agency"
                    project={project}
                    comments={comments}
                    onCreateComment={handleCreateComment}
                    onUpdateCommentStatus={handleUpdateStatus}
                    onPathChange={handlePathChange}
                />
            </div>
        </div>
    );
}
