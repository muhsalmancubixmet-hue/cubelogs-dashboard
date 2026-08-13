'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { projectService } from '../../../../lib/services/projectService';
import ContextualScrumGuide from '../../../../components/scrum/ContextualScrumGuide';
import AddProjectMemberModal from '../../../../components/projects/AddProjectMemberModal';

export default function ProjectTeamPage() {
  const params = useParams();
  const projectId = params?.projectId;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const pageSize = 8;

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await projectService.getProjectOverview(projectId);
      if (res && Array.isArray(res.team_members)) {
        setMembers(res.team_members);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Filter members by search and role
  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.designation && m.designation.toLowerCase().includes(q)) ||
      (m.project_role && m.project_role.toLowerCase().includes(q));

    const matchRole =
      roleFilter === 'ALL' ||
      (m.project_role && m.project_role.toLowerCase() === roleFilter.toLowerCase());

    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);

  const getRoleBadgeStyle = (role) => {
    const r = (role || '').toLowerCase();
    if (r.includes('manager') || r.includes('pm')) {
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    } else if (r.includes('lead')) {
      return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
    } else if (r.includes('qa')) {
      return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    } else if (r.includes('design')) {
      return { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' };
    }
    return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      <ContextualScrumGuide
        pageTitle="Project Team Directory"
        whyText="Central directory of all engineers, product managers, and team leads assigned to this project workspace."
        whenText="Review during onboarding, sprint planning, and task assignment to identify team allocation."
        nextText="Assign backlog stories and sprint tasks to active team members."
        nextLink={`/projects/${projectId}/backlog`}
        nextLinkText="Go to Product Backlog"
      />

      {showAddMemberModal && (
        <AddProjectMemberModal
          projectId={projectId}
          onClose={() => setShowAddMemberModal(false)}
          onMemberAdded={fetchMembers}
        />
      )}

      {/* Header & Controls */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Link
              href={`/projects/${projectId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 8,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#2563eb',
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: 'none',
                marginBottom: 10,
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeft size={14} color="#2563eb" />
              <span>Back to Project Overview</span>
            </Link>

            <h1 style={{ fontSize: 'clamp(1.2rem, 3.5vw, 1.45rem)', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              Project Team Members Directory
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              Directory of employees and assigned roles in this project workspace ({members.length} Total Members).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          {/* Search bar */}
          <div style={{ flex: 1, minWidth: '100%', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search member by name, role, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                background: '#ffffff'
              }}
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              background: '#ffffff',
              outline: 'none',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Team Lead">Team Lead</option>
            <option value="Developer">Developer</option>
            <option value="QA Engineer">QA Engineer</option>
            <option value="Designer">Designer</option>
          </select>

          <button
            onClick={() => setShowAddMemberModal(true)}
            style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#ffffff',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', width: '100%', minHeight: 44
            }}
          >
            + Add Team Member
          </button>
        </div>
      </div>

      {/* Member Cards Grid */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          Loading Team Members...
        </div>
      ) : paginatedMembers.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
          gap: 18
        }}>
          {paginatedMembers.map((member) => {
            const roleStyle = getRoleBadgeStyle(member.project_role);
            return (
              <div key={member.id} style={{
                background: '#ffffff',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                padding: 20,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {member.profile_photo ? (
                      <img src={member.profile_photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    )}
                  </div>

                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 2, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {member.designation || 'Team Member'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Project Role</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
                      background: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.border}`
                    }}>
                      {member.project_role}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Department</span>
                    <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                      {member.department || 'Engineering'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Email</span>
                    <a href={`mailto:${member.email}`} style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, textDecoration: 'none', overflowWrap: 'anywhere', wordBreak: 'break-word', textAlign: 'right' }}>
                      {member.email}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
          <h3 style={{ fontSize: 16, color: '#0f172a', fontWeight: 700, margin: '0 0 4px' }}>No Team Members Found</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Try adjusting your search query or role filter.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff',
              fontSize: 13, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff',
              fontSize: 13, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
