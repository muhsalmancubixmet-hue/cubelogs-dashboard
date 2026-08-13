'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectEpicsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/backlog?filter=epics`);
    }
  }, [projectId, router]);

  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
      Redirecting to Backlog...
    </div>
  );
}
