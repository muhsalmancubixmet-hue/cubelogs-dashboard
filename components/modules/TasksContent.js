'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import { 
  EmployeesIcon, 
  TasksIcon, 
  AddIcon, 
  EditIcon, 
  DeleteIcon, 
  CloseIcon 
} from '@/components/Icons';
import ConfirmModal from '@/components/ConfirmModal';

function TasksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Local states
  const [currentUser, setCurrentUser] = useState(null);
  const [cachedEmployees, setCachedEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Derive unique employees from tasks data and combine with cached employees
  const derivedEmployees = Array.from(
    new Map(tasks.map(t => [t.assignedTo, { id: t.assignedTo, name: t.assignedName || `Employee ${t.assignedTo}` }])).values()
  );
  const employees = Array.from(
    new Map([
      ...cachedEmployees.map(e => [e.id, e]),
      ...derivedEmployees.map(e => [e.id, e])
    ]).values()
  );

  const employeePhotos = {};
  employees.forEach(emp => {
    if (emp.profilePhoto) {
      employeePhotos[emp.id] = emp.profilePhoto;
    }
  });

  // Tab State
  const activeTab = searchParams.get('tab') || 'my';

  // Task creation state (Admin Workspace)
  const [selectedTask, setSelectedTask] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('Pending');
  const [isEditing, setIsEditing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });

  // Filter tasks
  const filterAssignee = searchParams.get('assignee') || '';

  const fetchTasksData = useCallback(async () => {
    if (currentUser) {
      const isProjectEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_project_enabled;
      if (!isProjectEnabled) return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (currentUser?.id) {
        const assignmentsData = await projectService.getEmployeeAssignments(currentUser.id);
        const mappedTasks = (assignmentsData?.tasks || []).map(t => ({
          ...t,
          id: String(t.id),
          assignedTo: String(currentUser.id)
        }));
        setTasks(mappedTasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error(err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Sync session & cached employees on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeUserStr = localStorage.getItem('cubelogs_active_user');
      if (activeUserStr) {
        try {
          const user = JSON.parse(activeUserStr);
          setCurrentUser({ ...user, id: String(user.id) });
        } catch (e) {
          console.warn('Failed to parse active user');
        }
      }

      const cachedEmployeesStr = localStorage.getItem('cubelogs_employees');
      if (cachedEmployeesStr) {
        try {
          setCachedEmployees(JSON.parse(cachedEmployeesStr));
        } catch (e) {
          console.warn('Failed to parse cached employees');
        }
      }
    }

    const loadEmployees = async () => {
      try {
        const empData = await apiFetch('/employees/');
        const empList = Array.isArray(empData) ? empData : (empData?.results || []);
        setCachedEmployees(empList.map(emp => ({ ...emp, id: String(emp.id) })));
      } catch (err) {
        console.error('Failed to load tasks employees:', err);
      }
    };
    loadEmployees();
  }, [router]);

  // Redirect if project management is not purchased
  useEffect(() => {
    if (currentUser) {
      const isProjectEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_project_enabled;
      if (!isProjectEnabled) {
        router.push('/dashboard');
      }
    }
  }, [currentUser, router]);

  // Re-fetch tasks when statusFilter or filterAssignee changes
  useEffect(() => {
    fetchTasksData();
  }, [statusFilter, filterAssignee, fetchTasksData]);

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
  };

  // Sync edits
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title || '');
      setDescription(selectedTask.description || '');
      setAssignedTo(selectedTask.assignedTo || '');
      setDueDate(selectedTask.dueDate || '');
      setStatus(selectedTask.status || 'Pending');
      setIsEditing(true);
    } else {
      resetForm();
    }
  }, [selectedTask]);

  const resetForm = () => {
    setSelectedTask(null);
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setDueDate('');
    setStatus('Pending');
    setIsEditing(false);
  };

  const handleTabChange = (tabName) => {
    router.push(`/tasks?tab=${tabName}`);
  };

  const localSaveTask = async (task) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const employee = employees.find(e => e.id === String(task.assignedTo));
      const payload = {
        title: task.title,
        description: task.description,
        assignedTo: parseInt(task.assignedTo),
        assignedName: employee ? employee.name : 'Employee',
        dueDate: task.dueDate,
        status: task.status,
      };

      let saved;
      if (task.id) {
        saved = await projectService.updateTask(task.id, {
          title: task.title,
          description: task.description,
          due_date: task.dueDate,
          status: task.status
        });
      } else {
        saved = { ...payload, id: Date.now() };
      }

      const mappedTask = {
        ...saved,
        id: String(saved.id),
        assignedTo: String(saved.assignedTo || task.assignedTo)
      };

      if (task.id) {
        setTasks(prev => prev.map(t => t.id === task.id ? mappedTask : t));
      } else {
        setTasks(prev => [mappedTask, ...prev]);
      }
      await fetchTasksData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = (e) => {
    e.preventDefault();
    if (!title || !assignedTo || !dueDate) return;

    const taskData = {
      id: selectedTask ? selectedTask.id : null,
      title,
      description,
      assignedTo,
      dueDate,
      status,
    };

    localSaveTask(taskData);
    resetForm();
  };

  const localDeleteTask = async (id) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await projectService.deleteTask(id);

      setTasks(prev => prev.filter(t => t.id !== id));
      await fetchTasksData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to delete task.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = (id) => {
    setConfirmModal({ open: true, id });
  };

  const confirmDeleteTask = () => {
    localDeleteTask(confirmModal.id);
    setConfirmModal({ open: false, id: null });
  };

  const handleEmployeeStatusChange = (task, newStatus) => {
    const updatedTask = {
      ...task,
      status: newStatus,
    };
    localSaveTask(updatedTask);
  };

  // Filter tasks
  const filteredEmployee = employees.find(e => e.id === filterAssignee);

  if (loading && !currentUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span>Loading tasks...</span>
      </div>
    );
  }

  if (!currentUser) return null;

  const isProjectEnabled = currentUser?.isSuperAdmin || currentUser?.subscription?.is_project_enabled;
  if (!isProjectEnabled) return null;

  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id);
  const canAddTasks = hasPermission('tasks:create');
  const canViewMyTasks = hasPermission('tasks:view');

  const displayTasks = tasks.filter(t => {
    const matchesAssignee = !filterAssignee || t.assignedTo === filterAssignee;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesAssignee && matchesStatus;
  });

  return (
    <React.Fragment>
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <span>{errorMsg}</span>
        </div>
      )}
      
      {/* TABS NAVIGATION BAR */}
      <div className="tab-navigation-bar">
        {canViewMyTasks && (
          <button 
            className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => handleTabChange('my')}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <EmployeesIcon size={16} />
              <span>My Assigned Tasks ({myTasks.length})</span>
            </div>
          </button>
        )}
        {canAddTasks && (
          <>
            <button 
              className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => handleTabChange('add')}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <AddIcon size={16} />
                <span>Manage & Assign Tasks ({tasks.length})</span>
              </div>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
              onClick={() => handleTabChange('directory')}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <TasksIcon size={16} />
                <span>Task Registry Directory</span>
              </div>
            </button>
          </>
        )}
      </div>

      <div className="tab-contents-container">
        
        {/* VIEW 1: MY TASKS VIEW */}
        {activeTab === 'my' && canViewMyTasks && (
          <div className="tab-panel-wrapper fade-in">
            <div className="panel">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <EmployeesIcon size={20} style={{ color: 'var(--primary)' }} />
                <span>My Task Objectives</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Track your deliverables and toggle operational status.
              </p>

              <div className="tasks-board-grid">
                {myTasks.length === 0 ? (
                  <p className="no-data-text">No tasks are currently assigned to you.</p>
                ) : (
                  myTasks.map(task => (
                    <div className={`task-card-item status-${task.status.toLowerCase().replace(' ', '-')}`} key={task.id}>
                      <div className="card-top">
                        <h4>{task.title}</h4>
                        <span className="date-badge">Due: {task.dueDate}</span>
                      </div>
                      
                      <p className="task-desc">{task.description || 'No description provided.'}</p>
                      
                      <div className="task-status-row">
                        <span className="lbl">Update Progress:</span>
                        <select 
                          className="form-input status-select"
                          value={task.status}
                          onChange={(e) => handleEmployeeStatusChange(task, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: ADD TASK WORKSPACE (ADMIN) */}
        {activeTab === 'add' && canAddTasks && (
          <div className="tab-panel-wrapper fade-in">
            <div className="tasks-admin-flex">
              
              {/* Creator Form */}
              <div className="panel form-column">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TasksIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>{isEditing ? 'Modify Assigned Task' : 'Create System Task'}</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Assign objectives to developers or cleaning staff.
                </p>

                <form onSubmit={handleSaveTask} className="task-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="task-title">Task Title</label>
                    <input
                      id="task-title"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Test login screen boundaries"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="task-desc">Description (Details)</label>
                    <textarea
                      id="task-desc"
                      rows="3"
                      className="form-input"
                      style={{ resize: 'vertical' }}
                      placeholder="Provide detailed project requirements..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="task-assignee">Assign Employee</label>
                      <select
                        id="task-assignee"
                        className="form-input"
                        style={{ appearance: 'auto' }}
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        required
                      >
                        <option value="" disabled>Select Staff member...</option>
                        {employees.map((emp, idx) => (
                          <option key={emp.id ? `${emp.id}-${idx}` : idx} value={emp.id}>{emp.name} ({emp.designation})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="task-due">Due Date</label>
                      <input
                        id="task-due"
                        type="date"
                        className="form-input"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="form-group">
                      <label className="form-label">Task Status</label>
                      <select
                        className="form-input"
                        style={{ appearance: 'auto' }}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  )}

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      {isEditing ? 'Save Objectives' : 'Assign Objective'}
                    </button>
                    {isEditing && (
                      <button type="button" className="btn btn-secondary" onClick={resetForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Compact Tasks Registry List */}
              <div className="panel list-column">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TasksIcon size={20} style={{ color: 'var(--primary)' }} />
                    <span>Task Assignments Directory</span>
                  </h3>
                  <Link href="/tasks?tab=directory" className="btn btn-secondary btn-sm">
                    View All
                  </Link>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Compact view of corporate task assignments. Click View All to search and filter.
                </p>

                <div className="task-registry-list" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tasks.length === 0 ? (
                    <p className="no-data-text">No corporate tasks created yet.</p>
                  ) : (
                    tasks.map(task => (
                      <div className="task-admin-card-row" key={task.id} style={{ padding: '12px 14px' }}>
                        <div className="row-details" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                            {employeePhotos[task.assignedTo] ? (
                              /* eslint-disable-next-line @next/next/no-img-element -- Dynamic employee avatar */
                              <img src={employeePhotos[task.assignedTo]} alt={task.assignedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              task.assignedName ? task.assignedName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'
                            )}
                          </div>
                          <div>
                            <h4 style={{ fontSize: '0.88rem', margin: 0 }}>{task.title}</h4>
                            <div className="meta-details" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                              <span className="assignee">Assignee: <strong>{task.assignedName}</strong></span>
                              <span className="sep">•</span>
                              <span className="due">Due: {task.dueDate}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="row-actions" style={{ minWidth: '100px' }}>
                          <span className={`badge ${task.status === 'Completed' ? 'badge-success' : task.status === 'In Progress' ? 'badge-info' : 'badge-pending'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {task.status}
                          </span>
                          
                          <div className="btn-group-horizontal" style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTask(task)} style={{ padding: '3px 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <EditIcon size={10} />
                              <span>Edit</span>
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)} style={{ padding: '3px 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <DeleteIcon size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 3: FULL SCREEN TASK DIRECTORY VIEWER */}
        {activeTab === 'directory' && canAddTasks && (
          <div className="tab-panel-wrapper fade-in">
            <div className="panel" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TasksIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>Task Assignments Directory</span>
                </h3>
                {(filterAssignee || statusFilter !== 'All') && (
                  <button 
                    onClick={() => {
                      router.push('/tasks?tab=directory');
                      setStatusFilter('All');
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
                {filterAssignee && filteredEmployee 
                  ? `Showing only tasks assigned to ${filteredEmployee.name} (${filteredEmployee.designation}).`
                  : 'Track development states of all organizational tasks.'}
              </p>

              {/* Interactive Filter Bar */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Employee</label>
                  <select
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto' }}
                    value={filterAssignee}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        router.push(`/tasks?tab=directory&assignee=${val}`);
                      } else {
                        router.push(`/tasks?tab=directory`);
                      }
                    }}
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp, idx) => (
                      <option key={emp.id ? `${emp.id}-${idx}` : idx} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block', fontWeight: '600' }}>Filter by Status</label>
                  <select
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.82rem', height: '36px', appearance: 'auto' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="task-registry-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {displayTasks.length === 0 ? (
                  <p className="no-data-text" style={{ gridColumn: '1 / -1' }}>
                    {filterAssignee || statusFilter !== 'All'
                      ? 'No tasks matching the selected filters.' 
                      : 'No corporate tasks created yet.'}
                  </p>
                ) : (
                  displayTasks.map(task => (
                    <div className="task-admin-card-row" key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', justifyContent: 'space-between', padding: '16px' }}>
                      <div className="row-details">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.98rem' }}>{task.title}</h4>
                          <span className={`badge ${task.status === 'Completed' ? 'badge-success' : task.status === 'In Progress' ? 'badge-info' : 'badge-pending'}`}>
                            {task.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 10px' }}>{task.description || 'No description provided.'}</p>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: 'auto' }}>
                        <div className="meta-details" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', overflow: 'hidden', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                            {employeePhotos[task.assignedTo] ? (
                              /* eslint-disable-next-line @next/next/no-img-element -- Dynamic employee avatar */
                              <img src={employeePhotos[task.assignedTo]} alt={task.assignedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              task.assignedName ? task.assignedName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="assignee" style={{ fontSize: '0.78rem' }}>Assignee: <strong>{task.assignedName}</strong></span>
                            <span className="due" style={{ fontSize: '0.72rem' }}>Due: {task.dueDate}</span>
                          </div>
                        </div>
                        
                        <div className="btn-group-horizontal" style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedTask(task); handleTabChange('add'); }} style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <EditIcon size={12} />
                            <span>Edit</span>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)} style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <DeleteIcon size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
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

        /* My Tasks Board */
        .tasks-board-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
        }

        .task-card-item {
          background-color: white;
          border: 1px solid var(--border);
          border-left: 5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 18px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: var(--transition-normal);
        }

        .task-card-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .task-card-item.status-pending { border-left-color: var(--warning); }
        .task-card-item.status-in-progress { border-left-color: var(--info); }
        .task-card-item.status-completed { border-left-color: var(--success); }

        .card-top h4 {
          font-size: 1rem;
          color: var(--text-main);
          margin-bottom: 4px;
        }

        .date-badge {
          font-size: 0.72rem;
          color: var(--text-light);
        }

        .task-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.4;
          flex: 1;
        }

        .task-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border);
          padding-top: 12px;
          margin-top: 8px;
        }

        .task-status-row .lbl {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .status-select {
          width: 130px;
          padding: 6px 10px;
          font-size: 0.82rem;
          border-radius: var(--radius-sm);
        }

        /* Admin Tasks flex layout */
        .tasks-admin-flex {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .form-column {
          flex: 1;
          min-width: 320px;
        }

        .list-column {
          flex: 1.4;
          min-width: 380px;
        }

        .task-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* Registry list items */
        .task-registry-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-admin-card-row {
          background-color: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          transition: var(--transition-fast);
        }

        .task-admin-card-row:hover {
          border-color: var(--primary-border);
        }

        .row-details h4 {
          font-size: 0.95rem;
          color: var(--text-main);
        }

        .meta-details {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: var(--text-light);
          margin-top: 4px;
        }

        .row-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 120px;
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
          .form-grid-2 {
            grid-template-columns: 1fr;
            gap: 12px;
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
          .tasks-board-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete Task"
        danger={true}
        onConfirm={confirmDeleteTask}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />
    </React.Fragment>
  );
}

export default TasksContent;
