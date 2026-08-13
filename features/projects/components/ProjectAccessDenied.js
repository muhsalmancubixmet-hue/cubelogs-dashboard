'use client';

import React from 'react';
import PageWrapper from '../../../components/PageWrapper';

export default function ProjectAccessDenied({ reason = 'disabled' }) {
  return (
    <PageWrapper title="Project Management" requiredPermission="">
      <div className="access-denied-container">
        <div className="icon-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2>{reason === 'disabled' ? 'Module Not Available' : 'Permission Denied'}</h2>
        <p>
          {reason === 'disabled'
            ? 'Project Management is not enabled for your organization subscription plan. Please contact your company administrator to upgrade.'
            : 'You do not have the required permissions to view Projects.'}
        </p>
        <style jsx>{`
          .access-denied-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px 24px;
            background: white;
            border-radius: var(--radius-lg, 12px);
            border: 1px solid var(--border, #e2e8f0);
            text-align: center;
            max-width: 540px;
            margin: 40px auto;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          }
          .icon-badge {
            background: #fee2e2;
            color: #ef4444;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
          }
          h2 {
            font-size: 1.5rem;
            color: var(--text-main, #0f172a);
            margin-bottom: 12px;
            font-weight: 600;
          }
          p {
            color: var(--text-muted, #64748b);
            font-size: 0.95rem;
            line-height: 1.5;
          }
        `}</style>
      </div>
    </PageWrapper>
  );
}
