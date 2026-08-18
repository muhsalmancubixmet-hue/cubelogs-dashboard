'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useApp, PERMISSION_FLAGS, MODULES_MAP } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import { 
  EmployeesIcon, 
  BackIcon, 
  EditIcon,
  CameraIcon
} from '@/components/Icons';

function EmployeeCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') || '';
  const { currentUser, authStatus } = useApp();

  // Local states
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employeePhotos, setEmployeePhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Core Personal Data fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null); // base64 data URI

  // Photo upload ref (profile)
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const photoInputRef = useRef(null);

  // Designation dropdown select
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleToggleRole = (role) => {
    const roles = designation.split(',').map(r => r.trim()).filter(Boolean);
    let newRoles;
    if (roles.includes(role)) {
      newRoles = roles.filter(r => r !== role);
    } else {
      newRoles = [...roles, role];
    }
    setDesignation(newRoles.join(', '));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Step 2 Override settings
  const [useDefault, setUseDefault] = useState(true);
  const [customPermissions, setCustomPermissions] = useState([]);
  const [activeModuleTab, setActiveModuleTab] = useState('all');
  
  // Status modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalState, setStatusModalState] = useState('loading'); // 'loading' | 'success' | 'error'
  const [statusModalMessage, setStatusModalMessage] = useState('');
  const [savedWorker, setSavedWorker] = useState(null);

  const [isEditing, setIsEditing] = useState(false);

  const isProjectEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_project_enabled;
  const isAttendanceEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_attendance_enabled;

  const visiblePermissionFlags = useMemo(() => {
    return PERMISSION_FLAGS.filter(flag => {
      if (!isProjectEnabled && MODULES_MAP.tasks?.ids.includes(flag.id)) {
        return false;
      }
      if (!isAttendanceEnabled && MODULES_MAP.attendance?.ids.includes(flag.id)) {
        return false;
      }
      return true;
    });
  }, [isProjectEnabled, isAttendanceEnabled]);

  const fetchOnboardingData = async () => {
    if (authStatus !== 'authenticated') return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [employeesData, rolesData] = await Promise.all([
        apiFetch('/employees/'),
        apiFetch('/roles/'),
      ]);
      
      const employeesList = Array.isArray(employeesData)
        ? employeesData
        : (employeesData && Array.isArray(employeesData.results))
        ? employeesData.results
        : [];

      const rolesList = Array.isArray(rolesData)
        ? rolesData
        : (rolesData && Array.isArray(rolesData.results))
        ? rolesData.results
        : [];

      const mappedEmployees = employeesList.map(emp => ({ ...emp, id: String(emp.id) }));
      const mappedTemplates = rolesList.map(r => ({
        ...r,
        id: String(r.id),
        name: r.name,
        permissions: Array.isArray(r.permissions) ? r.permissions : (r.permission_keys || [])
      }));

      const photoMap = {};
      mappedEmployees.forEach(emp => {
        if (emp.profilePhoto) {
          photoMap[emp.id] = emp.profilePhoto;
        }
      });

      setEmployees(mappedEmployees);
      setTemplates(mappedTemplates);
      setEmployeePhotos(photoMap);

      // Initialize form fields if editId is provided
      if (editId) {
        const emp = mappedEmployees.find(e => e.id === editId);
        if (emp) {
          setName(emp.name || '');
          setEmail(emp.email || '');
          setPhone(emp.phone || '');
          setDesignation(emp.designation || '');
          setUseDefault(emp.useDefaultPermissions);
          setCustomPermissions(emp.permissions || []);
          setProfilePhoto(photoMap[editId] || null);
          setIsEditing(true);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to initialize page data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchOnboardingData();
    }
  }, [editId, authStatus]);

  // Sync designation to load preset baseline template permissions
  useEffect(() => {
    if (useDefault && designation) {
      const roles = designation.split(',').map(r => r.trim()).filter(Boolean);
      const combinedPerms = new Set();
      
      roles.forEach(role => {
        if (role === 'Admin') {
          visiblePermissionFlags.forEach(p => combinedPerms.add(p.id));
        } else {
          const selectedTemplate = templates.find(t => t.name === role);
          if (selectedTemplate) {
            selectedTemplate.permissions.forEach(p => combinedPerms.add(p));
          }
        }
      });
      
      setCustomPermissions(Array.from(combinedPerms));
    }
  }, [designation, useDefault, templates, visiblePermissionFlags]);

  // Crop and compress image to a small square JPEG thumbnail before storing
  const cropAndCompressImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          const MAX_DIM = 200;
          const canvas = document.createElement('canvas');
          canvas.width = MAX_DIM;
          canvas.height = MAX_DIM;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_DIM, MAX_DIM);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(base64);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

  const recropBase64Image = (base64) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const MAX_DIM = 200;
        const canvas = document.createElement('canvas');
        canvas.width = MAX_DIM;
        canvas.height = MAX_DIM;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.beginPath();
        ctx.arc(MAX_DIM / 2, MAX_DIM / 2, MAX_DIM / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_DIM, MAX_DIM);
        ctx.restore();
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = base64;
    });

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await cropAndCompressImage(file);
      setProfilePhoto(processed);
    } catch {
      alert('Could not read the image file. Please try another.');
    }
  };

  const openCropModal = () => {
    if (!profilePhoto) return;
    setCropModalOpen(true);
  };

  const confirmCrop = async () => {
    if (!profilePhoto) return;
    try {
      const cropped = await recropBase64Image(profilePhoto);
      setProfilePhoto(cropped);
      setCropModalOpen(false);
    } catch {
      alert('Failed to crop the image.');
    }
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handlePermissionCheckbox = (id) => {
    if (useDefault) return; // Read-only if using defaults

    if (customPermissions.includes(id)) {
      setCustomPermissions(customPermissions.filter(p => p !== id));
    } else {
      setCustomPermissions([...customPermissions, id]);
    }
  };

  const handleOnboardAnother = () => {
    setName('');
    setEmail('');
    setPhone('');
    setDesignation('');
    setProfilePhoto(null);
    setUseDefault(true);
    setCustomPermissions([]);
    setStatusModalOpen(false);
    setSavedWorker(null);
  };

  const localSaveEmployee = async (employee) => {
    setStatusModalOpen(true);
    setStatusModalState('loading');
    setStatusModalMessage(employee.id ? 'Updating employee credentials...' : 'Registering and onboarding staff member...');
    setLoading(true);
    setErrorMsg('');

    try {
      let saved;
      if (employee.id) {
        saved = await apiFetch(`/employees/${employee.id}/`, {
          method: 'PUT',
          body: JSON.stringify(employee),
        });
      } else {
        const requestData = {
          ...employee,
        };
        saved = await apiFetch('/employees/', {
          method: 'POST',
          body: JSON.stringify(requestData),
        });
      }

      const mappedSaved = { ...saved, id: String(saved.id) };
      if (currentUser && currentUser.id === mappedSaved.id) {
        localStorage.setItem('cubelogs_active_user', JSON.stringify(mappedSaved));
      }

      setSavedWorker(mappedSaved);
      setStatusModalState('success');
      setStatusModalMessage(
        employee.id
          ? `Profile for ${mappedSaved.name || 'employee'} has been updated successfully.`
          : `Staff member ${mappedSaved.name || 'employee'} (${mappedSaved.email || ''}) has been registered successfully!`
      );
    } catch (err) {
      console.error(err);
      const msg = err.message || 'Failed to save employee profile.';
      setErrorMsg(msg);
      setStatusModalState('error');
      setStatusModalMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name || !email || !designation) return;

    const primaryDesignation = designation.split(',')[0].trim();
    const matchedRole = templates.find(t => 
      t.name === primaryDesignation || 
      t.label === primaryDesignation || 
      t.name?.toLowerCase() === primaryDesignation.toLowerCase()
    );

    const existingEmp = editId ? employees.find(e => e.id === editId) : null;
    const resolvedRoleId = matchedRole ? Number(matchedRole.id) : (existingEmp?.role ? Number(existingEmp.role) : null);

    const employeeData = {
      id: editId || null,
      name,
      email,
      phone,
      designation,
      role: resolvedRoleId,
      useDefaultPermissions: useDefault,
      permissions: customPermissions,
      profilePhoto: profilePhoto || null,
    };

    localSaveEmployee(employeeData);
  };

  if (loading && !currentUser) {
    return (
      <PageWrapper 
        title={isEditing ? 'Modify Staff Credentials' : 'Onboard New Employee'} 
        requiredPermission="admin:employees"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Loading onboarding form...</span>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUser) return null;

  return (
    <PageWrapper 
      title={isEditing ? 'Modify Staff Credentials' : 'Onboard New Employee'} 
      requiredPermission="admin:employees"
    >
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <span>{errorMsg}</span>
        </div>
      )}
      <div className="create-page-wrapper">
        <div className="back-link-row">
          <Link href="/admin/employees" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <BackIcon size={14} />
            <span>Back to Directory</span>
          </Link>
        </div>

        <div className="panel form-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? <EditIcon size={20} style={{ color: 'var(--primary)' }} /> : <EmployeesIcon size={20} style={{ color: 'var(--primary)' }} />}
            <span>{isEditing ? 'Edit Profile & Overrides' : 'Register Worker Details'}</span>
          </h3>


          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {isEditing ? 'Adjust details and custom route permission matrix.' : 'Onboard workers in two quick steps.'}
          </p>

          <form onSubmit={handleSave} className="employee-form">
            
            {/* STEP 1: Identification & Designation */}
            <div className="step-section">
              <span className="step-badge">Step 1</span>
              <span className="step-title">Core Personal Data & Designation</span>

              {/* Profile Photo Upload */}
              <div className="photo-upload-row">
                <div
                  className="photo-preview-circle"
                  onClick={() => photoInputRef.current?.click()}
                  title="Click to upload profile photo"
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile preview" className="photo-preview-img" />
                  ) : (
                    <div className="photo-placeholder">
                      <CameraIcon size={28} />
                      <span>Upload Photo</span>
                    </div>
                  )}
                </div>
                <div className="photo-upload-meta">
                  <p className="photo-label">Profile Picture</p>
                  <p className="photo-hint">JPG, PNG, or WebP · Max 5 MB</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {profilePhoto ? 'Change Photo' : 'Choose File'}
                  </button>
                  {profilePhoto && (
                    <>
                       <button
                         type="button"
                         className="btn btn-secondary btn-sm"
                         onClick={openCropModal}
                         style={{ marginLeft: '8px' }}
                       >
                         Crop
                       </button>
                       <button
                         type="button"
                         className="btn btn-secondary btn-sm"
                         onClick={handleRemovePhoto}
                         style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginLeft: '8px' }}
                       >
                         Remove
                       </button>
                    </>
                  )}

                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="emp-name">Full Name</label>
                  <input
                    id="emp-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rachel Green"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="emp-email">Email Address</label>
                  <input
                    id="emp-email"
                    type="email"
                    className="form-input"
                    placeholder="rachel@cubelogs.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="emp-phone">Phone Number</label>
                  <input
                    id="emp-phone"
                    type="text"
                    className="form-input"
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                  <label className="form-label" htmlFor="emp-designation">Designation Role(s)</label>
                  
                  {/* Multi-Select Dropdown Toggle Button */}
                  <div 
                    id="emp-designation"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      minHeight: '38px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {designation ? (
                        designation.split(',').map(r => r.trim()).filter(Boolean).map(role => (
                          <span key={role} className="badge badge-info" style={{ margin: 0, padding: '2px 8px', fontSize: '0.75rem', fontWeight: '600', color: '#1e40af', backgroundColor: '#dbeafe', border: '1px solid #93c5fd' }}>
                            {role}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-light)', opacity: 0.8 }}>Select Job Designation(s)...</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
                  </div>

                  {/* Dropdown Options Box */}
                  {dropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '8px'
                    }}>
                      {/* Admin Option */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.1s' }} className="hover-bg-light">
                        <input
                          type="checkbox"
                          checked={designation.split(',').map(r => r.trim()).includes('Admin')}
                          onChange={() => handleToggleRole('Admin')}
                          className="form-checkbox"
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Admin (Full Access)</span>
                      </label>

                      {/* Other Templates */}
                      {templates.map(t => {
                        const isChecked = designation.split(',').map(r => r.trim()).includes(t.name);
                        return (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.1s' }} className="hover-bg-light">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRole(t.name)}
                              className="form-checkbox"
                            />
                            <span style={{ fontSize: '0.85rem' }}>{t.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 2: Permissions Matrix & Custom Override Checkbox */}
            <div className="step-section">
              <span className="step-badge">Step 2</span>
              <span className="step-title">Default Template or Live Custom Override</span>
              
              <div className="override-toggle-box">
                <label className="form-checkbox-container">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={useDefault}
                    onChange={(e) => setUseDefault(e.target.checked)}
                  />
                  <strong>Use default page permissions for this profile</strong>
                </label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '26px', marginTop: '4px' }}>
                  {useDefault 
                    ? 'Permissions checklist is locked read-only. Standard role template values apply.'
                    : 'Override Mode enabled! Matrix unlocked. Customize permissions below for this staff member.'
                  }
                </p>
              </div>

              {/* Module Tabs Selector */}
              <div className="form-group" style={{ marginTop: '16px', marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Select Module to Configure</label>
                <div className="module-tabs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      background: activeModuleTab === 'all' ? 'var(--primary)' : 'var(--bg-app)',
                      color: activeModuleTab === 'all' ? '#ffffff' : 'var(--text-main)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.15s'
                    }}
                    onClick={() => setActiveModuleTab('all')}
                  >
                    All Modules
                  </button>
                  {Object.entries(MODULES_MAP)
                    .filter(([key, mod]) => visiblePermissionFlags.some(flag => mod.ids.includes(flag.id)))
                    .map(([key, mod]) => (
                      <button
                        key={key}
                        type="button"
                        className="btn btn-sm"
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          background: activeModuleTab === key ? 'var(--primary)' : 'var(--bg-app)',
                          color: activeModuleTab === key ? '#ffffff' : 'var(--text-main)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.15s'
                        }}
                        onClick={() => setActiveModuleTab(key)}
                      >
                        {mod.label}
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Checkbox Matrix Display */}
              <div className={`permissions-checklist-matrix ${useDefault ? 'locked' : 'unlocked'}`}>
                {visiblePermissionFlags
                  .filter(flag => activeModuleTab === 'all' || MODULES_MAP[activeModuleTab]?.ids.includes(flag.id))
                  .map(flag => {
                    const isChecked = customPermissions.includes(flag.id);
                    return (
                      <label 
                        className={`form-checkbox-container matrix-item ${isChecked ? 'active' : ''} ${useDefault ? 'disabled' : ''}`}
                        key={flag.id}
                      >
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={isChecked}
                          onChange={() => handlePermissionCheckbox(flag.id)}
                          disabled={useDefault}
                        />
                        <span>{flag.label}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {!isEditing && currentUser?.subscription && employees.length >= currentUser.subscription.employeeLimit && (
              <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.88rem' }}>
                <span>⚠️ Onboarding seat limit reached ({employees.length} / {currentUser.subscription.employeeLimit} slots). Please upgrade your subscription tier via settings to onboard more personnel.</span>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }} disabled={(!isEditing && currentUser?.subscription && employees.length >= currentUser.subscription.employeeLimit) || loading}>
                {isEditing ? 'Save Profile adjustments' : 'Onboard & Register Staff'}
              </button>
              <Link href="/admin/employees" className="btn btn-secondary" style={{ padding: '12px 24px' }}>
                Cancel
              </Link>
            </div>

           </form>

      {/* Crop Modals */}
      {cropModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '16px'
        }}>
          <div className="modal-content" style={{
            background: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Crop Profile Photo</h3>
            {profilePhoto && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <img src={profilePhoto} alt="Profile preview" style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-border)' }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-primary" onClick={confirmCrop} style={{ flex: 1, fontSize: '0.85rem', padding: '10px' }}>
                Save Photo
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setCropModalOpen(false)} style={{ flex: 1, fontSize: '0.85rem', padding: '10px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Status Modal */}
      {statusModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100,
          padding: '16px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-card)', padding: '28px 24px', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '100%',
            boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', textAlign: 'center'
          }}>
            {statusModalState === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {isEditing ? 'Updating Employee Profile...' : 'Registering & Onboarding Staff...'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Please wait while system credentials and route permission matrices are generated.
                  </p>
                </div>
              </div>
            )}

            {statusModalState === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: '#dcfce7', border: '2px solid #86efac',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.75rem', color: '#16a34a'
                }}>
                  ✓
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {isEditing ? 'Profile Updated Successfully!' : 'Employee Onboarded Successfully!'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {statusModalMessage}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => router.push('/admin/employees')}
                    style={{ width: '100%', padding: '12px', fontSize: '0.88rem', fontWeight: '600' }}
                  >
                    View Employee Directory
                  </button>
                  {!isEditing && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleOnboardAnother}
                      style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                    >
                      Onboard Another Employee
                    </button>
                  )}
                </div>
              </div>
            )}

            {statusModalState === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: '#fee2e2', border: '2px solid #fca5a5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.75rem', color: '#dc2626'
                }}>
                  ⚠️
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '700', color: '#dc2626' }}>
                    Onboarding Failed
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--bg-app)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {statusModalMessage}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStatusModalOpen(false)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.88rem', marginTop: '8px' }}
                >
                  Close & Fix Inputs
                </button>
              </div>
            )}
          </div>
        </div>
      )}

        </div>
      </div>

      <style jsx>{`
        .create-page-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .back-link-row {
          margin-bottom: 8px;
        }

        .form-panel {
          width: 100%;
        }

        .employee-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .step-section {
          background-color: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
        }

        .step-badge {
          background-color: var(--primary);
          color: white;
          font-weight: 700;
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          margin-right: 10px;
          vertical-align: middle;
        }

        .step-title {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-main);
          vertical-align: middle;
        }

        .photo-upload-row {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-top: 20px;
          margin-bottom: 8px;
          padding: 16px;
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          border-radius: var(--radius-md);
        }

        .photo-preview-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-light) 0%, #dbeafe 100%);
          border: 2px dashed var(--primary-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .photo-preview-circle:hover {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .photo-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .photo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0 8px;
          text-align: center;
          gap: 4px;
          color: var(--primary);
          opacity: 0.6;
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.2;
        }

        .photo-upload-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .photo-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .photo-hint {
          font-size: 0.75rem;
          color: var(--text-light);
          margin: 0 0 4px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-top: 18px;
        }

        .override-toggle-box {
          background-color: var(--primary-light);
          border: 1px solid var(--primary-border);
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          margin-top: 15px;
        }

        .permissions-checklist-matrix {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 10px 14px;
          align-items: center;
          margin-top: 15px;
          padding: 12px;
          border-radius: var(--radius-sm);
          transition: var(--transition-fast);
        }

        .permissions-checklist-matrix.locked {
          background-color: #f0f4f8;
          border: 1px dashed var(--border);
          opacity: 0.8;
        }

        .permissions-checklist-matrix.unlocked {
          background-color: white;
          border: 1px solid var(--border);
        }

        .matrix-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background-color: var(--bg-app);
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-main);
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition-fast);
        }

        .matrix-item:hover:not(.disabled) {
          border-color: var(--primary-border);
          background-color: var(--primary-light);
        }

        .matrix-item.active {
          border-color: var(--primary-border);
          background-color: var(--primary-light);
        }

        .matrix-item.disabled {
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          gap: 12px;
        }

        @media (max-width: 768px) {
          :global(.panel) {
            padding: 14px 12px !important;
          }
          .step-section {
            padding: 14px 12px;
          }
          .photo-upload-row {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
            padding: 12px;
          }
          .photo-upload-meta {
            align-items: center;
          }
          .photo-upload-meta div {
            justify-content: center;
          }
          .override-toggle-box {
            padding: 10px 12px;
          }
          .form-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .permissions-checklist-matrix {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            padding: 10px;
            max-height: 280px;
            overflow-y: auto;
            border: 1px solid var(--border);
          }
          .matrix-item {
            white-space: normal;
            width: 100%;
          }
          .permissions-checklist-matrix::-webkit-scrollbar {
            width: 4px;
          }
          .permissions-checklist-matrix::-webkit-scrollbar-track {
            background: transparent;
          }
          .permissions-checklist-matrix::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .form-actions {
            flex-direction: column;
            gap: 8px;
          }
          .form-actions .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </PageWrapper>
  );
}

export default function EmployeeCreate() {
  return (
    <Suspense fallback={
      <div className="loading-container">
        <div className="spinner"></div>
        <span className="loading-text">Loading Onboarding Center...</span>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            font-family: var(--font-sans);
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid var(--primary-border);
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          .loading-text {
            color: var(--primary-dark);
            font-weight: 600;
            font-size: 1.1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <EmployeeCreateContent />
    </Suspense>
  );
}
