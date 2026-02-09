'use client';

import ReviewInterface from '../../components/ReviewInterface';

export default function TestReviewPage() {
  const project = {
    id: 'test-project',
    name: 'Test Project',
    baseUrl: 'http://localhost:3000/test-frame.html',
    status: 'IN_REVIEW' as const,
  };

  const comments = [
    {
      id: 'c1',
      message: 'Top Pin',
      status: 'OPEN' as const,
      createdAt: new Date().toISOString(),
      clickX: 100,
      clickY: 100, // Absolute pixels
      pageUrl: '/test-frame.html',
    },
    {
        id: 'c2',
        message: 'Bottom Pin',
        status: 'OPEN' as const,
        createdAt: new Date().toISOString(),
        clickX: 150,
        clickY: 1800, // Absolute pixels (should be far down)
        pageUrl: '/test-frame.html',
      },
  ];

  return (
    <ReviewInterface
      mode="agency"
      project={project}
      comments={comments}
      onCreateComment={async (payload) => {
        console.log('Created comment:', payload);
        alert(`Created comment at ${payload.x}, ${payload.y}`);
      }}
      onPathChange={(path) => console.log('Path changed:', path)}
    />
  );
}
