'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import ReviewInterface from '../../../components/ReviewInterface';


export default function FeedbackPage({ params }: { params: { token: string } }) {
    const [currentPath, setCurrentPath] = useState('/');
    const [project, setProject] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const apiBase = '/api';

    const fetchData = async (pageUrl: string = '/') => {
        try {
            const resProject = await fetch(`${apiBase}/f/${params.token}`);
            if (!resProject.ok) throw new Error('Invalid or inactive link');
            const dataProject = await resProject.json();
            setProject(dataProject.project);

            // Fetch comments for SPECIFIC page
            const resComments = await fetch(`${apiBase}/f/${params.token}/comments?pageUrl=${encodeURIComponent(pageUrl)}`);
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
        fetchData(currentPath);
    }, [params.token]);

    const handlePathChange = (newPath: string) => {
        if (newPath !== currentPath) {
            setCurrentPath(newPath);
            fetchData(newPath);
        }
    };

    const handleCreateComment = async (payload: { x: number; y: number; message: string; pageUrl: string }) => {
        // Strict Locking: Client cannot comment if approved
        if (project?.status === 'APPROVED') {
            toast.message('Project is approved — comments are closed');
            return;
        }

        const res = await fetch(`${apiBase}/f/${params.token}/comments`, {
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

        if (!res.ok) throw new Error('Failed to post comment');

        // Refresh
        const resComments = await fetch(`${apiBase}/f/${params.token}/comments?pageUrl=${encodeURIComponent(payload.pageUrl)}`);
        if (resComments.ok) setComments(await resComments.json());
        toast.success('Comment added');
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-[var(--muted)]">Loading project...</div>;
    if (error) return <div className="h-screen flex items-center justify-center text-red-500 font-bold">{error === 'Invalid or inactive link' ? 'Link not found' : error}</div>;
    if (!project) return null; // Should be handled by loading/error, but safe guard

    return (
        <ReviewInterface
            mode="client"
            project={project}
            comments={comments}
            onCreateComment={handleCreateComment}
            onPathChange={handlePathChange}
        // No onUpdateCommentStatus for client
        />
    );
}
