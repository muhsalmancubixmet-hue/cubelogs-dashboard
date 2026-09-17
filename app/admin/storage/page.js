'use client';

import React from 'react';
import PageWrapper from '@/components/PageWrapper';
import StorageMediaSection from '@/components/admin/settings/StorageMediaSection';
import { FolderIcon } from '@/components/Icons';

export default function StorageMediaPage() {
  return (
    <PageWrapper title="Storage & Media" requiredPermission="settings:billing">
      <div className="settings-single-card">
        <div className="panel settings-panel-card" style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px 0' }}>
              <FolderIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>Storage & Media</span>
            </h3>
            <p className="tab-desc" style={{ margin: 0 }}>
              View storage usage, billing credits, file activity, and daily history.
            </p>
          </div>

          <StorageMediaSection />
        </div>
      </div>
    </PageWrapper>
  );
}
