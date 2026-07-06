'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  HolidaysIcon, 
  BrandLogo, 
  CloseIcon, 
  EditIcon, 
  DeleteIcon,
  WarningIcon
} from '@/components/Icons';
import ConfirmModal from '@/components/ConfirmModal';

function HolidaysContent() {
  const { currentUser, hasPermission } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab State
  const activeTab = searchParams.get('tab') || 'holidays-view';

  // Local Data Fetching States
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // CRUD state
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [banner, setBanner] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });

  const fileInputRef = useRef(null);

  const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api';

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cubelogs_access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchHolidays = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/holidays/`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to fetch holidays');
      }
      const data = await res.json();
      const mapped = data.map(h => ({ ...h, id: String(h.id) }));
      setHolidays(mapped);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  // Restore user session locally
  const [weeklyHolidays, setWeeklyHolidays] = useState(['Sunday']);
  const [monthlyRules, setMonthlyRules] = useState([]);
  const [yearlyRules, setYearlyRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  // States for adding rules
  const [tempMonthlyWeek, setTempMonthlyWeek] = useState(1);
  const [tempMonthlyDay, setTempMonthlyDay] = useState('Saturday');
  const [tempYearlyName, setTempYearlyName] = useState('');
  const [tempYearlyMonth, setTempYearlyMonth] = useState(1);
  const [tempYearlyDay, setTempYearlyDay] = useState(1);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/holidays/`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklyHolidays(data.default_weekly_holidays || ['Sunday']);
        setMonthlyRules(data.monthly_recurring_holidays || []);
        setYearlyRules(data.yearly_recurring_holidays || []);
      }
    } catch (err) {
      console.error("Failed to load holiday rules settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const canManageHolidays = hasPermission('holidays:manage');

  useEffect(() => {
    if (canManageHolidays) {
      fetchSettings();
    }
  }, [canManageHolidays]);

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/holidays/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          default_weekly_holidays: weeklyHolidays,
          monthly_recurring_holidays: monthlyRules,
          yearly_recurring_holidays: yearlyRules,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to save rules');
      }
      alert('Holiday Rules Engine configured successfully!');
      // Reload holidays to pick up recalculated dates
      fetchHolidays();
    } catch (err) {
      alert(err.message || 'Failed to save rules');
    } finally {
      setSavingRules(false);
    }
  };

  // Sync edits
  useEffect(() => {
    if (selectedHoliday) {
      setName(selectedHoliday.name || '');
      setDate(selectedHoliday.date || '');
      setDescription(selectedHoliday.description || '');
      setBanner(selectedHoliday.banner || '');
      setIsEditing(true);
    } else {
      resetForm();
    }
  }, [selectedHoliday]);

  const resetForm = () => {
    setSelectedHoliday(null);
    setName('');
    setDate('');
    setDescription('');
    setBanner('');
    setIsEditing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTabChange = (tabName) => {
    router.push(`${window.location.pathname}?tab=${tabName}`);
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!name || !date) return;

    const holidayData = {
      name,
      date,
      description,
      banner,
    };

    setLoading(true);
    setErrorMsg('');
    try {
      const method = selectedHoliday ? 'PUT' : 'POST';
      const url = selectedHoliday 
        ? `${API_BASE_URL}/holidays/${selectedHoliday.id}/` 
        : `${API_BASE_URL}/holidays/`;

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(holidayData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to save holiday');
      }

      await fetchHolidays();
      resetForm();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = (id) => {
    setConfirmModal({ open: true, id });
  };

  const confirmDeleteHoliday = async () => {
    const idToDelete = confirmModal.id;
    if (!idToDelete) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/holidays/${idToDelete}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Failed to delete holiday');
      }

      await fetchHolidays();
      setConfirmModal({ open: false, id: null });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to delete holiday');
    } finally {
      setLoading(false);
    }
  };

  const canViewHolidays = hasPermission('holidays:view');

  const displayHolidays = holidays.filter(hol => {
    // Exclude weekly off-days from listing views to prevent clutter
    if (hol.name && hol.name.includes('Weekly Off')) {
      return false;
    }

    const matchesSearch = !searchQuery || 
      hol.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (hol.description && hol.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesMonth = true;
    if (monthFilter !== 'All') {
      const eventDate = new Date(hol.date);
      const monthIndex = eventDate.getMonth();
      matchesMonth = monthIndex === parseInt(monthFilter);
    }
    
    return matchesSearch && matchesMonth;
  });

  const nonWeeklyHolidaysCount = holidays.filter(hol => !hol.name || !hol.name.includes('Weekly Off')).length;

  return (
    <PageWrapper title="Corporate Holiday Calendar" requiredPermission={['holidays:view', 'holidays:manage', 'attendance:staff']}>
      
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <WarningIcon size={16} style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: '0.88rem' }}>{errorMsg}</span>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem', marginBottom: '16px' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <span>Syncing calendar logs...</span>
        </div>
      )}
      
      {/* TABS NAVIGATION BAR */}
      <div className="tab-navigation-bar">
        {canViewHolidays && (
          <button 
            className={`tab-btn ${activeTab === 'holidays-view' || activeTab === 'view' ? 'active' : ''}`}
            onClick={() => handleTabChange('holidays-view')}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <HolidaysIcon size={16} />
              <span>View Holiday Calendar ({nonWeeklyHolidaysCount})</span>
            </div>
          </button>
        )}
        {canManageHolidays && (
          <button 
            className={`tab-btn ${activeTab === 'holidays-manage' || activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => handleTabChange('holidays-manage')}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <BrandLogo size={16} />
              <span>Configure System Holidays</span>
            </div>
          </button>
        )}
        {canManageHolidays && (
          <button 
            className={`tab-btn ${activeTab === 'holidays-rules' || activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => handleTabChange('holidays-rules')}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <BrandLogo size={16} />
              <span>Holiday Rules Engine</span>
            </div>
          </button>
        )}
      </div>

      <div className="tab-contents-container">
        
        {/* VIEW 1: READ-ONLY CALENDAR CARDS */}
        {(activeTab === 'holidays-view' || activeTab === 'view') && canViewHolidays && (
          <div className="tab-panel-wrapper fade-in">
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HolidaysIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>Annual Holiday Schedule</span>
                </h3>
                {(searchQuery || monthFilter !== 'All') && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setMonthFilter('All');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>Clear Filters</span>
                    <CloseIcon size={12} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '22px' }}>
                Upcoming corporate office closures and national observances.
              </p>

              {/* Interactive Filter Bar */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Search Holidays</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by holiday title or notes..."
                    style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Month</label>
                  <select
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto' }}
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                  >
                    <option value="All">All Months</option>
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                </div>
              </div>

              <div className="holidays-grid-view">
                {displayHolidays.length === 0 ? (
                  <p className="no-data-text">
                    {searchQuery || monthFilter !== 'All' 
                      ? 'No holidays matching the selected filters.' 
                      : 'No corporate holidays registered.'}
                  </p>
                ) : (
                  [...displayHolidays].sort((a,b) => new Date(a.date) - new Date(b.date)).map(hol => {
                    const eventDate = new Date(hol.date);
                    const month = eventDate.toLocaleString('default', { month: 'short' });
                    const day = eventDate.getDate();

                    return (
                      <div className="holiday-schedule-card-visual" key={hol.id}>
                        {hol.banner ? (
                          <img className="holiday-card-banner-img" src={hol.banner} alt={hol.name} />
                        ) : (
                          <div className="holiday-card-banner-img holiday-card-banner-fallback" />
                        )}
                        <div className="holiday-card-dark-overlay" />
                        <div className="holiday-visual-content">
                          <div className="calendar-badge">
                            <span className="cal-month">{month}</span>
                            <span className="cal-day">{day}</span>
                          </div>
                          <div className="holiday-text-info">
                            <h4>{hol.name}</h4>
                            <span className="formatted-date">{hol.date}</span>
                          </div>
                        </div>
                        
                        {/* Hover Tooltip Popover */}
                        <div className="holiday-tooltip">
                          <h5>{hol.name}</h5>
                          <p>{hol.description || 'No closure notes provided.'}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CRUD HOLIDAY SETUP (ADMIN) */}
        {(activeTab === 'holidays-manage' || activeTab === 'manage') && canManageHolidays && (
          <div className="tab-panel-wrapper fade-in">
            <div className="holidays-admin-flex">
              
              {/* Creator Form */}
              <div className="panel form-column">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HolidaysIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>{isEditing ? 'Edit Holiday Closure' : 'Register Holiday Closure'}</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Register closures and calendar events.
                </p>

                <form onSubmit={handleSaveHoliday} className="holiday-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="holiday-name">Holiday Title</label>
                    <input
                      id="holiday-name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Labor Day"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="holiday-date">Closure Date</label>
                    <input
                      id="holiday-date"
                      type="date"
                      className="form-input"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="holiday-desc">Description (Details)</label>
                    <textarea
                      id="holiday-desc"
                      rows="3"
                      className="form-input"
                      style={{ resize: 'vertical' }}
                      placeholder="Add corporate policy details (e.g. Paid holiday)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>
 
                  <div className="form-group">
                    <label className="form-label" htmlFor="holiday-banner">Holiday Banner Image</label>
                    <input
                      id="holiday-banner"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="form-input"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const MAX_WIDTH = 600;
                              const MAX_HEIGHT = 400;
                              let width = img.width;
                              let height = img.height;

                              if (width > height) {
                                if (width > MAX_WIDTH) {
                                  height *= MAX_WIDTH / width;
                                  width = MAX_WIDTH;
                                }
                              } else {
                                if (height > MAX_HEIGHT) {
                                  width *= MAX_HEIGHT / height;
                                  height = MAX_HEIGHT;
                                }
                              }

                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(img, 0, 0, width, height);

                              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                              setBanner(dataUrl);
                            };
                            img.src = event.target.result;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {banner && (
                      <div className="banner-preview" style={{ marginTop: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>Banner Preview:</span>
                        <img src={banner} alt="Preview" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      {isEditing ? 'Save Holiday details' : 'Add Holiday Closure'}
                    </button>
                    {isEditing && (
                      <button type="button" className="btn btn-secondary" onClick={resetForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Holidays Table Registry */}
              <div className="panel list-column">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BrandLogo size={20} style={{ color: 'var(--primary)' }} />
                    <span>Global Holidays Table Registry</span>
                  </h3>
                  {(searchQuery || monthFilter !== 'All') && (
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setMonthFilter('All');
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>Clear Filters</span>
                      <CloseIcon size={12} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Manage and override holiday records.
                </p>

                {/* Interactive Filter Bar */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1.5, minWidth: '150px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Search title/policy</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search title or notes..."
                      style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Month</label>
                    <select
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto' }}
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                    >
                      <option value="All">All Months</option>
                      <option value="0">Jan</option>
                      <option value="1">Feb</option>
                      <option value="2">Mar</option>
                      <option value="3">Apr</option>
                      <option value="4">May</option>
                      <option value="5">Jun</option>
                      <option value="6">Jul</option>
                      <option value="7">Aug</option>
                      <option value="8">Sep</option>
                      <option value="9">Oct</option>
                      <option value="10">Nov</option>
                      <option value="11">Dec</option>
                    </select>
                  </div>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Banner</th>
                        <th>Date</th>
                        <th>Holiday Title</th>
                        <th>Brief Policy</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayHolidays.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="no-data-text">
                            {searchQuery || monthFilter !== 'All' 
                              ? 'No holidays matching the selected filters.' 
                              : 'No corporate closures registered.'}
                          </td>
                        </tr>
                      ) : (
                        displayHolidays.map(hol => (
                          <tr key={hol.id}>
                            <td>
                              {hol.banner ? (
                                <img src={hol.banner} alt={hol.name} style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                              ) : (
                                <div style={{ width: '48px', height: '32px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: 'var(--radius-sm)' }}></div>
                              )}
                            </td>
                            <td><strong>{hol.date}</strong></td>
                            <td>{hol.name}</td>
                            <td style={{ fontSize: '0.82rem' }}>{hol.description || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedHoliday(hol)} style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <EditIcon size={12} />
                                  <span>Edit</span>
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHoliday(hol.id)} style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <DeleteIcon size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DYNAMIC HOLIDAY RULES ENGINE */}
        {(activeTab === 'holidays-rules' || activeTab === 'rules') && canManageHolidays && (
          <div className="tab-panel-wrapper fade-in">
            <div className="holidays-admin-flex" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
              
              {/* Weekly Rules Card */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <HolidaysIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>Weekly Recurring Off-Days</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Select days of the week that are standard non-working holidays.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const checked = weeklyHolidays.includes(day);
                    return (
                      <label key={day} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: checked ? 'rgba(16, 185, 129, 0.12)' : '#f1f5f9',
                        border: checked ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                        color: checked ? '#065f46' : '#475569',
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setWeeklyHolidays(prev => 
                              prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                            );
                          }}
                          style={{ display: 'none' }}
                        />
                        {checked && '✓ '}
                        {day}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Rules Card */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <BrandLogo size={20} style={{ color: 'var(--primary)' }} />
                  <span>Monthly Recurring Rules</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Configure specific monthly off-days (e.g. 2nd Saturdays).
                </p>
                
                <div style={{ background: 'var(--primary-light)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Week Occurrence</label>
                    <select
                      className="form-input"
                      value={tempMonthlyWeek}
                      onChange={(e) => setTempMonthlyWeek(parseInt(e.target.value))}
                      style={{ height: '36px', padding: '6px 10px', fontSize: '0.82rem', appearance: 'auto' }}
                    >
                      <option value={1}>First (1st)</option>
                      <option value={2}>Second (2nd)</option>
                      <option value={3}>Third (3rd)</option>
                      <option value={4}>Fourth (4th)</option>
                      <option value={-1}>Last</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Day of Week</label>
                    <select
                      className="form-input"
                      value={tempMonthlyDay}
                      onChange={(e) => setTempMonthlyDay(e.target.value)}
                      style={{ height: '36px', padding: '6px 10px', fontSize: '0.82rem', appearance: 'auto' }}
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '8px', marginTop: '4px' }}
                    onClick={() => {
                      if (monthlyRules.some(r => r.week_number === tempMonthlyWeek && r.day === tempMonthlyDay)) {
                        alert("This monthly rule already exists.");
                        return;
                      }
                      setMonthlyRules(prev => [...prev, { week_number: tempMonthlyWeek, day: tempMonthlyDay }]);
                    }}
                  >
                    Add Monthly Rule
                  </button>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', margin: '0 0 10px 0', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Rules</h4>
                  {monthlyRules.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', margin: 0, fontStyle: 'italic' }}>No monthly rules configured.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {monthlyRules.map((rule, idx) => {
                        const suffix = rule.week_number === 1 ? 'st' : rule.week_number === 2 ? 'nd' : rule.week_number === 3 ? 'rd' : rule.week_number === 4 ? 'th' : ' Last';
                        const label = rule.week_number > 0 ? `${rule.week_number}${suffix} ${rule.day}` : `Last ${rule.day}`;
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>{label}</span>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                              onClick={() => {
                                setMonthlyRules(prev => prev.filter((_, i) => i !== idx));
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Yearly Rules Card */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <HolidaysIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>Yearly Recurring Holidays</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add festive dates recurring every year (e.g. Christmas on Dec 25).
                </p>

                <div style={{ background: 'var(--primary-light)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Holiday Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tempYearlyName}
                      onChange={(e) => setTempYearlyName(e.target.value)}
                      placeholder="e.g. Christmas"
                      style={{ height: '36px', padding: '6px 10px', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1.5 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Month</label>
                      <select
                        className="form-input"
                        value={tempYearlyMonth}
                        onChange={(e) => setTempYearlyMonth(parseInt(e.target.value))}
                        style={{ height: '36px', padding: '6px 10px', fontSize: '0.82rem', appearance: 'auto' }}
                      >
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Day</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        className="form-input"
                        value={tempYearlyDay}
                        onChange={(e) => setTempYearlyDay(parseInt(e.target.value))}
                        style={{ height: '36px', padding: '6px 10px', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '8px', marginTop: '4px' }}
                    onClick={() => {
                      if (!tempYearlyName.trim()) {
                        alert("Please enter a holiday name.");
                        return;
                      }
                      if (yearlyRules.some(r => r.month === tempYearlyMonth && r.day === tempYearlyDay)) {
                        alert("A yearly rule already exists for this date.");
                        return;
                      }
                      setYearlyRules(prev => [...prev, { month: tempYearlyMonth, day: tempYearlyDay, name: tempYearlyName.trim() }]);
                      setTempYearlyName('');
                    }}
                  >
                    Add Yearly Rule
                  </button>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', margin: '0 0 10px 0', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Rules</h4>
                  {yearlyRules.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', margin: 0, fontStyle: 'italic' }}>No yearly rules configured.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {yearlyRules.map((rule, idx) => {
                        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][rule.month - 1];
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)' }}>
                            <div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{rule.name}</strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginLeft: '8px' }}>({monthName} {rule.day})</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                              onClick={() => {
                                setYearlyRules(prev => prev.filter((_, i) => i !== idx));
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Save Config Control Panel */}
            <div className="panel" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1.5px solid #93c5fd' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1d4ed8' }}>Deploy Holiday Rules Engine Changes</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#1e40af' }}>Recalculates all occurrences of weekly, monthly, and yearly holidays across the workspace calendar system.</p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveRules}
                disabled={savingRules}
                style={{ padding: '10px 24px', fontSize: '0.9rem', minWidth: '160px' }}
              >
                {savingRules ? 'Saving Engine...' : 'Save Rules Engine Config'}
              </button>
            </div>

          </div>
        )}
      </div>

      <style jsx>{`
        .tab-navigation-bar {
          display: flex;
          gap: 12px;
          border-bottom: 2px solid var(--border);
          margin-bottom: 24px;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 12px 20px;
          font-family: var(--font-sans);
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-light);
          cursor: pointer;
          position: relative;
          transition: var(--transition-fast);
        }

        .tab-btn:hover {
          color: var(--primary);
        }

        .tab-btn.active {
          color: var(--primary);
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--primary);
        }

        /* Holiday Cards Grid */
        .holidays-grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        /* Visual Holiday Cards */
        .holiday-schedule-card-visual {
          position: relative;
          height: 180px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
        }
        .holiday-card-banner-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 1;
        }
        .holiday-card-banner-fallback {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        }
        .holiday-card-dark-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.75));
          z-index: 2;
        }

        .holiday-schedule-card-visual:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary-border);
        }

        .holiday-visual-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 18px;
          background: transparent;
          z-index: 5;
        }

        .calendar-badge {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .cal-month {
          font-size: 0.65rem;
          text-transform: uppercase;
          font-weight: 700;
          opacity: 0.85;
          letter-spacing: 0.05em;
        }

        .cal-day {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          line-height: 1.1;
        }

        .holiday-text-info h4 {
          font-size: 1.05rem;
          color: white;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .holiday-text-info .formatted-date {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.85);
          margin-top: 4px;
          display: block;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Hover Tooltip Popover */
        .holiday-tooltip {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(12px);
          color: white;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
          z-index: 20;
        }

        .holiday-schedule-card-visual:hover .holiday-tooltip {
          opacity: 1;
          visibility: visible;
        }

        .holiday-tooltip h5 {
          font-size: 1rem;
          margin: 0 0 8px 0;
          font-weight: 700;
          color: var(--primary-light);
        }

        .holiday-tooltip p {
          font-size: 0.84rem;
          line-height: 1.4;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
        }

        /* Holiday admin flex layout */
        .holidays-admin-flex {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .form-column {
          flex: 1;
          min-width: 320px;
        }

        .list-column {
          flex: 1.5;
          min-width: 380px;
        }

        .holiday-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .fade-in {
          animation: fadeIn 0.3s ease;
        }

        .no-data-text {
          font-size: 0.88rem;
          color: var(--text-light);
          text-align: center;
          padding: 40px 0;
          width: 100%;
        }

        @media (max-width: 768px) {
          .form-column, .list-column {
            min-width: 0 !important;
            width: 100% !important;
            flex: 1 1 100% !important;
          }
          .tab-navigation-bar {
            gap: 6px;
            flex-wrap: wrap;
          }
          .tab-btn {
            width: 100%;
            text-align: center;
            padding: 10px 14px;
          }
        }
      `}</style>
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Holiday"
        message="Are you sure you want to delete this holiday from the corporate calendar? This action cannot be undone."
        confirmLabel="Delete Holiday"
        danger={true}
        onConfirm={confirmDeleteHoliday}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />
    </PageWrapper>
  );
}

export default HolidaysContent;
