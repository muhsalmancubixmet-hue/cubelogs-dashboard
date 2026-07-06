'use client';

import React, { useState, useEffect, useRef } from 'react';
import PageWrapper from '@/components/PageWrapper';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { 
  EmployeesIcon, 
  AddIcon, 
  EditIcon, 
  DeleteIcon 
} from '@/components/Icons';
import ConfirmModal from '@/components/ConfirmModal';

export default function Employees() {
  const router = useRouter();

  // Local states
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeePhotos, setEmployeePhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Server-Side Search Filter (State updates trigger refetch)
  const [searchQuery, setSearchQuery] = useState('');

  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });

  // Bulk Upload states
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [partialFailures, setPartialFailures] = useState([]);
  const [successSummary, setSuccessSummary] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setPartialFailures([]);
    setSuccessSummary(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const token = typeof window !== 'undefined' ? localStorage.getItem('cubelogs_access_token') : null;

    try {
      const res = await fetch(`${API_BASE_URL}/employees/bulk-upload/`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to upload files.');
      }

      const result = await res.json();
      setSuccessSummary(result);
      if (result.failures && result.failures.length > 0) {
        setPartialFailures(result.failures);
      }
      setSelectedFile(null);
      
      // Refresh directory list
      fetchEmployeesData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred during bulk upload.');
    } finally {
      setUploading(false);
    }
  };

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cubelogs_access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchEmployeesData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const url = `${API_BASE_URL}/employees/?search=${encodeURIComponent(searchQuery)}`;
      const [res, meRes] = await Promise.all([
        fetch(url, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/auth/me/`, { headers: getAuthHeaders() })
      ]);

      if (!res.ok || !meRes.ok) {
        throw new Error('Failed to fetch employee directory data');
      }

      const employeesData = await res.json();
      const meData = await meRes.json();
      
      const mappedEmployees = employeesData.map(emp => ({ ...emp, id: String(emp.id) }));

      const photoMap = {};
      mappedEmployees.forEach(emp => {
        if (emp.profilePhoto) {
          photoMap[emp.id] = emp.profilePhoto;
        }
      });

      setEmployees(mappedEmployees);
      setEmployeePhotos(photoMap);
      setCurrentUser({ ...meData, id: String(meData.id) });

      // Cache employees and active user to localStorage
      localStorage.setItem('cubelogs_employees', JSON.stringify(mappedEmployees));
      localStorage.setItem('cubelogs_active_user', JSON.stringify(meData));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load employee list.');
    } finally {
      setLoading(false);
    }
  };

  // Sync session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cubelogs_access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const activeUserStr = localStorage.getItem('cubelogs_active_user');
      if (activeUserStr) {
        try {
          const user = JSON.parse(activeUserStr);
          setCurrentUser({ ...user, id: String(user.id) });
        } catch (e) {
          console.warn('Failed to parse active user');
        }
      }
    }
  }, [router]);

  // Trigger main fetch when search query changes (debounced by 400ms)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchEmployeesData();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const localDeleteEmployee = async (id) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to delete employee.');
      }

      setEmployees(prev => prev.filter(emp => emp.id !== id));
      setEmployeePhotos(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await fetchEmployeesData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to delete employee.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({ open: true, id });
  };

  const confirmDelete = () => {
    localDeleteEmployee(confirmModal.id);
    setConfirmModal({ open: false, id: null });
  };

  const handleEdit = (id) => {
    router.push(`/admin/employees/create?id=${id}`);
  };

  const handleRowClick = (e, empId) => {
    if (e.target.closest('.action-btns-cell') || e.target.closest('button')) {
      return;
    }
    router.push(`/admin/employees/profile?id=${empId}`);
  };

  if (loading && !currentUser) {
    return (
      <PageWrapper title="Employee Directory Manager" requiredPermission="admin:employees">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Loading employee directory...</span>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUser) return null;

  return (
    <PageWrapper title="Employee Directory Manager" requiredPermission="admin:employees">
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <span>{errorMsg}</span>
        </div>
      )}
      <div className="employee-page-grid">
        
        {/* Onboarding action header */}
        <div className="panel header-actions-panel">
          <div className="action-header-text">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EmployeesIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>Personnel Registry</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Onboard new workers, configure custom access override matrices, and manage active system accounts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              📁 Bulk Upload (Excel/CSV)
            </button>
            {currentUser?.subscription && employees.length >= currentUser.subscription.employeeLimit ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                <button className="btn btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AddIcon size={16} />
                  <span>Onboard New Employee</span>
                </button>
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>
                  ⚠️ Seat limit reached ({employees.length} / {currentUser.subscription.employeeLimit} allowed).
                </span>
              </div>
            ) : (
              <Link href="/admin/employees/create" className="btn btn-primary">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AddIcon size={16} />
                  <span>Onboard New Employee</span>
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Staff registry listing */}
        <div className="panel list-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EmployeesIcon size={20} style={{ color: 'var(--primary)' }} />
            <span>Active Workspace Directory</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
            List of all registered employees and their template override statuses.
          </p>

          {/* Interactive Search Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Search Registry</label>
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px' }}
                placeholder="Search by name, email, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee Profile</th>
                  <th>Contact Details</th>
                  <th>Designation</th>
                  <th>Overrides</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} onClick={(e) => handleRowClick(e, emp.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-circle" style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.78rem',
                          fontFamily: 'var(--font-heading)',
                          flexShrink: 0,
                          overflow: 'hidden',
                          boxShadow: '0 2px 6px rgba(37,99,235,0.18)'
                        }}>
                          {employeePhotos[emp.id] ? (
                            <img src={employeePhotos[emp.id]} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                          ) : (
                            emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          )}
                        </div>
                        <div>
                          <Link href={`/admin/employees/profile?id=${emp.id}`} className="profile-link">
                            <strong>{emp.name}</strong>
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{emp.phone || 'No phone'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(emp.designation || '').split(',').map(r => r.trim()).filter(Boolean).map(role => (
                          <span key={role} className="badge badge-info" style={{ whiteSpace: 'nowrap' }}>{role}</span>
                        ))}
                        {!(emp.designation || '').trim() && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {emp.isSuperAdmin ? (
                        <span className="badge badge-success">System Admin</span>
                      ) : emp.useDefaultPermissions ? (
                        <span className="badge badge-default">Template Defaults</span>
                      ) : (
                        <span className="badge badge-pending">Custom Override</span>
                      )}
                    </td>
                    <td>
                      <div className="action-btns-cell">
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleEdit(emp.id)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <EditIcon size={12} />
                          <span>Edit Profile</span>
                        </button>
                        {!emp.isSuperAdmin && (
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDelete(emp.id)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <DeleteIcon size={12} />
                            <span>Offboard</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style jsx>{`
        .employee-page-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .header-actions-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          padding: 20px 24px;
        }

        .action-header-text {
          flex: 1;
          min-width: 250px;
        }

        .list-panel {
          width: 100%;
        }

        .action-btns-cell {
          display: flex;
          gap: 6px;
        }

        .profile-link {
          color: var(--primary);
          transition: var(--transition-fast);
        }

        .profile-link:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        :global(.data-table tbody tr) {
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        :global(.data-table tbody tr:hover) {
          background-color: rgba(37, 99, 235, 0.05);
        }
      `}</style>
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Offboard Employee"
        message="Are you sure you want to offboard this employee? All logs, leaves and tasks records will remain."
        confirmLabel="Offboard"
        danger={true}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />

      {bulkModalOpen && (
        <div className="modal-overlay" onClick={() => {
          setBulkModalOpen(false);
          setPartialFailures([]);
          setSuccessSummary(null);
          setSelectedFile(null);
        }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', background: 'var(--surface)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-premium)', width: '100%', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
            <h3 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EmployeesIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>Bulk Onboard Employees</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Upload an Excel (.xlsx/.xls) or CSV (.csv) file containing columns: <strong>Full Name</strong>, <strong>Email Address</strong>, <strong>Phone Number</strong>, and <strong>Designation Role(s)</strong>.
            </p>

            {/* Template download block */}
            <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--text-main)' }}>Need a template?</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Use our structured template to organize your directory.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a 
                  href="/Download_Employee_Template.csv" 
                  download 
                  className="btn btn-secondary btn-sm" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  📥 Download CSV
                </a>
                <a 
                  href="/Download_Employee_Template.xlsx" 
                  download 
                  className="btn btn-secondary btn-sm" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  📥 Download Excel
                </a>
              </div>
            </div>

            {/* Dropzone */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{
                border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '36px 16px',
                textAlign: 'center',
                backgroundColor: isDragging ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '20px'
              }}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>📁</div>
              <p style={{ fontWeight: '600', marginBottom: '4px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                {selectedFile ? selectedFile.name : 'Drag & drop Excel/CSV file here, or click to browse'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                Supports .xlsx, .xls, and .csv files (Max size: 5MB)
              </p>
            </div>

            {/* Uploading progress indicator */}
            {uploading && (
              <div style={{ textAlign: 'center', margin: '20px 0', padding: '10px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block' }}>⚙️ Parsing spreadsheet rows & sending credential emails...</span>
              </div>
            )}

            {/* Success Summary Alert Box */}
            {successSummary && (
              <div className="alert-box" style={{ margin: '15px 0', padding: '14px', borderLeft: '4px solid var(--success)', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--primary)', marginBottom: '4px' }}>File Processed Successfully</p>
                <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>Total rows analyzed: <strong>{successSummary.total_processed}</strong></span>
                  <span>Successfully created: <strong style={{ color: 'var(--success)' }}>{successSummary.inserted_count} employees</strong></span>
                  {successSummary.failed_count > 0 && (
                    <span style={{ color: '#ef4444' }}>Skipped/failed rows: <strong>{successSummary.failed_count}</strong></span>
                  )}
                </div>
              </div>
            )}

            {/* Failed rows error table */}
            {partialFailures.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div className="alert-box alert-box-danger" style={{ display: 'flex', flexDirection: 'column', padding: '14px', margin: '0 0 10px 0', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ef4444' }}>⚠️ Some employees could not be onboarded. Please check the errors below:</span>
                </div>
                <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 8px', fontSize: '0.78rem' }}>Row</th>
                        <th style={{ padding: '6px 8px', fontSize: '0.78rem' }}>Email</th>
                        <th style={{ padding: '6px 8px', fontSize: '0.78rem' }}>Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partialFailures.map((fail, i) => (
                        <tr key={i} style={{ cursor: 'default', background: 'transparent' }}>
                          <td style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)' }}>{fail.row}</td>
                          <td style={{ padding: '6px 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fail.email || '—'}</td>
                          <td style={{ padding: '6px 8px', fontSize: '0.8rem', color: '#ef4444', fontWeight: '500' }}>{fail.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setBulkModalOpen(false);
                  setPartialFailures([]);
                  setSuccessSummary(null);
                  setSelectedFile(null);
                }}
              >
                Close
              </button>
              {selectedFile && !uploading && (
                <button className="btn btn-primary" onClick={handleUploadSubmit}>
                  Upload and Process
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
