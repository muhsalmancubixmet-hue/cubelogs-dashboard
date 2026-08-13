'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectService } from '../../lib/services/projectService';
import { SearchIcon, CloseIcon } from '../Icons';

export default function AssignedMembersSelector({
  projectId,
  selectedIds = [],
  onChange,
  initialEmployees = []
}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);

  const initialEmployeesRef = useRef(initialEmployees);
  useEffect(() => {
    initialEmployeesRef.current = initialEmployees;
  }, [initialEmployees]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch employees from API
  const fetchEmployees = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await projectService.getEligibleStoryMembers(projectId, {
        page,
        page_size: pageSize,
        search: debouncedSearch
      });

      let list = [];
      let count = 0;

      if (Array.isArray(res)) {
        list = res;
        count = res.length;
      } else if (res && Array.isArray(res.results)) {
        list = res.results;
        count = res.count !== undefined ? res.count : res.results.length;
      } else if (res && Array.isArray(res.data)) {
        list = res.data;
        count = res.count !== undefined ? res.count : res.data.length;
      }

      setEmployees(list);
      setTotalCount(count);
    } catch (err) {
      console.error('Error loading eligible story members:', err);
      if (initialEmployeesRef.current && initialEmployeesRef.current.length > 0) {
        setEmployees(initialEmployeesRef.current);
        setTotalCount(initialEmployeesRef.current.length);
      } else {
        setErrorMsg('Unable to load employees. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Member toggle handler (preserves selections across pages)
  const handleToggle = (id) => {
    const targetId = Number(id);
    if (selectedIds.includes(targetId)) {
      onChange(selectedIds.filter(i => Number(i) !== targetId));
    } else {
      onChange([...selectedIds, targetId]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getInitials = (name) => (name || 'U').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getBadgeStyle = (emp) => {
    if (emp.is_project_manager || emp.project_role === 'Project Manager') {
      return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
    }
    if (emp.is_team_lead || emp.project_role === 'Team Lead') {
      return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
    }
    if (emp.designation?.toLowerCase().includes('qa') || emp.project_role?.toLowerCase().includes('qa')) {
      return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
    }
    if (emp.designation?.toLowerCase().includes('design') || emp.project_role?.toLowerCase().includes('design')) {
      return { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
    }
    return { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRange = Math.min(page * pageSize, totalCount);

  return (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#ffffff', overflow: 'hidden' }}>
      {/* Header & Search */}
      <div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Assigned Members</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>
              {selectedIds.length} selected
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#dc2626',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          padding: '6px 10px'
        }}>
          <SearchIcon size={14} color="#94a3b8" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0f172a' }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
            >
              <CloseIcon size={12} color="#94a3b8" />
            </button>
          )}
        </div>
      </div>

      {/* Employee List */}
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px 16px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
            Loading employees...
          </div>
        ) : errorMsg ? (
          <div style={{ padding: '20px 16px', fontSize: 13, color: '#ef4444', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={fetchEmployees}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '24px 16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
            {debouncedSearch ? 'No employees match your search.' : 'No eligible employees found for this company.'}
          </div>
        ) : (
          employees.map((emp) => {
            const isSelected = selectedIds.includes(Number(emp.id));
            const photo = emp.profilePhoto || emp.profile_image;
            const initials = getInitials(emp.full_name || emp.name || emp.email);
            const badgeStyle = getBadgeStyle(emp);

            return (
              <div
                key={emp.id}
                onClick={() => handleToggle(emp.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2563eb' }}
                  />

                  <div className="avatar-circle" style={{
                    width: 34, height: 34, borderRadius: '50%', overflow: 'hidden',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0
                  }}>
                    {photo ? (
                      <img src={photo} alt={emp.full_name || emp.name || emp.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      initials
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {emp.full_name || emp.name || emp.email}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 4,
                        ...badgeStyle
                      }}>
                        {emp.project_role || emp.designation || 'Employee'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      {emp.email}
                    </div>
                  </div>
                </div>

                {emp.is_project_member && (
                  <span style={{ fontSize: 10, color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                    Project Member
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div style={{
        padding: '8px 14px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        color: '#64748b'
      }}>
        <div>
          Showing {startRange}–{endRange} of {totalCount} employees
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', fontSize: 11, background: '#fff' }}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
          </select>

          {/* Page Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 8px', fontSize: 11,
                background: page <= 1 ? '#f1f5f9' : '#fff', color: page <= 1 ? '#94a3b8' : '#334155',
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Prev
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', padding: '0 4px' }}>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 8px', fontSize: 11,
                background: page >= totalPages ? '#f1f5f9' : '#fff', color: page >= totalPages ? '#94a3b8' : '#334155',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
