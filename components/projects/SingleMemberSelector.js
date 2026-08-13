'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { projectService } from '../../lib/services/projectService';
import { SearchIcon, CloseIcon } from '../Icons';

/**
 * SingleMemberSelector
 * Searchable dropdown to pick ONE project member. Shows avatars + role badge + search.
 */
export default function SingleMemberSelector({
  projectId,
  selectedId = '',
  onChange,
  placeholder = 'Unassigned',
}) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalCount, setTotalCount] = useState(0);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-focus search on open
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const fetchEmployees = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await projectService.getEligibleStoryMembers(projectId, {
        page,
        page_size: pageSize,
        search: debouncedSearch,
      });
      let list = [], count = 0;
      if (Array.isArray(res)) { list = res; count = res.length; }
      else if (res && Array.isArray(res.results)) { list = res.results; count = res.count ?? res.results.length; }
      else if (res && Array.isArray(res.data)) { list = res.data; count = res.count ?? res.data.length; }
      setEmployees(list);
      setTotalCount(count);
    } catch (err) {
      console.error('SingleMemberSelector:', err);
      setErrorMsg('Unable to load members.');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, debouncedSearch]);

  useEffect(() => { if (open) fetchEmployees(); }, [open, fetchEmployees]);

  const getInitials = (name) =>
    (name || 'U').split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getGradient = (id) => {
    const list = [
      'linear-gradient(135deg,#3b82f6,#1d4ed8)',
      'linear-gradient(135deg,#8b5cf6,#6d28d9)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
      'linear-gradient(135deg,#ef4444,#dc2626)',
      'linear-gradient(135deg,#06b6d4,#0891b2)',
    ];
    return list[(Number(id) || 0) % list.length];
  };

  const handleSelect = (emp) => {
    onChange(Number(emp.id) === Number(selectedId) ? '' : Number(emp.id));
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const selEmp = employees.find((e) => Number(e.id) === Number(selectedId));
  const selName = selEmp
    ? (selEmp.full_name || selEmp.name || selEmp.email)
    : (selectedId ? `User #${selectedId}` : '');
  const selPhoto = selEmp && (selEmp.profilePhoto || selEmp.profile_image);

  const triggerStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 8,
    border: open ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
    background: '#ffffff',
    cursor: 'pointer',
    minHeight: 44,
    boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.10)' : 'none',
    transition: 'border 0.15s,box-shadow 0.15s',
    textAlign: 'left',
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button type="button" onClick={() => setOpen((v) => !v)} style={triggerStyle}>
        {selectedId ? (
          <>
            <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: getGradient(selectedId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {selPhoto ? <img src={selPhoto} alt={selName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(selName)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1 }}>{selName}</span>
            <button type="button" onClick={handleClear} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <CloseIcon size={13} color="#94a3b8" />
            </button>
          </>
        ) : (
          <>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#94a3b8', flexShrink: 0 }}>
              ?
            </div>
            <span style={{ fontSize: 13, color: '#94a3b8', flex: 1 }}>{placeholder}</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>&#9660;</span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px' }}>
              <SearchIcon size={13} color="#94a3b8" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0f172a' }}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <CloseIcon size={12} color="#94a3b8" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {/* Unassigned row */}
            <div
              onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', background: !selectedId ? '#eff6ff' : '#ffffff' }}
              onMouseEnter={(e) => { if (selectedId) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { if (selectedId) e.currentTarget.style.background = '#ffffff'; }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#94a3b8' }}>
                ?
              </div>
              <span style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', flex: 1 }}>Unassigned</span>
              {!selectedId && <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>&#10003;</span>}
            </div>

            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#64748b' }}>Loading members...</div>
            ) : errorMsg ? (
              <div style={{ padding: '16px', fontSize: 13, color: '#ef4444', textAlign: 'center' }}>
                {errorMsg}
                <button type="button" onClick={fetchEmployees} style={{ display: 'block', margin: '8px auto 0', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Retry</button>
              </div>
            ) : employees.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                {debouncedSearch ? 'No members match your search.' : 'No members found.'}
              </div>
            ) : (
              employees.map((emp) => {
                const isSel = Number(emp.id) === Number(selectedId);
                const photo = emp.profilePhoto || emp.profile_image;
                const name = emp.full_name || emp.name || emp.email;
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', background: isSel ? '#eff6ff' : '#ffffff', transition: 'background 0.12s' }}
                    onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: getGradient(emp.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                          {emp.project_role || emp.designation || 'Member'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</div>
                    </div>
                    {isSel && <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 800, flexShrink: 0 }}>&#10003;</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', fontSize: 11, color: '#64748b' }}>
              <span>{(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, totalCount)} of {totalCount}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', fontSize: 11, background: page <= 1 ? '#f1f5f9' : '#fff', color: page <= 1 ? '#94a3b8' : '#334155', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
                <span style={{ padding: '2px 6px', fontWeight: 600, color: '#334155' }}>{page}/{totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', fontSize: 11, background: page >= totalPages ? '#f1f5f9' : '#fff', color: page >= totalPages ? '#94a3b8' : '#334155', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
