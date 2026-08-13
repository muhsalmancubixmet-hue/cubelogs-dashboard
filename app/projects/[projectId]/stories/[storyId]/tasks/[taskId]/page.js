'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '../../../../../../../context/AppContext';
import { Send, Paperclip, X, MessageSquare } from 'lucide-react';
import { getBackendBaseUrl, generateUUID } from '../../../../../../../lib/api/apiClient';
import { projectService } from '../../../../../../../lib/services/projectService';
import { EditIcon, TrashIcon, EyeIcon, DownloadIcon } from '../../../../../../../components/Icons';
import { TiptapEditor, TiptapReadOnly } from '../../../../../../../components/rich-text';
import SingleMemberSelector from '../../../../../../../components/projects/SingleMemberSelector';
import { useChatWebSocket } from '../../../../../../../lib/hooks/useChatWebSocket';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

function normalizeFileUrl(rawUrl) {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  const baseUrl = getBackendBaseUrl();
  return `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { projectId, storyId, taskId } = params || {};

  const [task, setTask] = useState(null);
  const [parentStory, setParentStory] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Toast Banners
  const [successBanner, setSuccessBanner] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  // Rapid click tracking for subtasks & dev assignment
  const [pendingSubtasks, setPendingSubtasks] = useState(new Set());
  const [savingAssignee, setSavingAssignee] = useState(false);

  // Searchable Combobox for Assigned Developer
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [comboboxSearch, setComboboxSearch] = useState('');
  const comboboxRef = useRef(null);

  // Add Employee to Project Modal
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [autoAssignSelected, setAutoAssignSelected] = useState(true);
  const [submittingAddEmployee, setSubmittingAddEmployee] = useState(false);

  // Chat Stream & File Upload State
  const { currentUser } = useApp() || {};
  const chatFeedRef = useRef(null);
  const fileInputRef = useRef(null);

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingOlderComments, setLoadingOlderComments] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [draftToken, setDraftToken] = useState(() => generateUUID());

  const isTypingRef = useRef(false);
  const typingTimerRef = useRef(null);

  // Task Edit & Subtask Modals
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [newSubtask, setNewSubtask] = useState({ title: '', assigned_to: '', estimated_hours: 2 });
  const [submittingSubtask, setSubmittingSubtask] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTaskForm, setEditTaskForm] = useState({ title: '', description: '', priority: 'Medium', estimated_hours: 8, due_date: '', status: '' });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Click outside listener for combobox
  useEffect(() => {
    function handleClickOutside(event) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setIsComboboxOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, []);

  const imageAttachments = React.useMemo(() => {
    const list = [];
    (comments || []).forEach(msg => {
      if (Array.isArray(msg.attachments)) {
        msg.attachments.forEach(att => {
          const fn = (att.file_name || att.file || '').toLowerCase();
          const mime = (att.mime_type || '').toLowerCase();
          if (mime.startsWith('image/') || fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.png') || fn.endsWith('.webp') || fn.endsWith('.gif')) {
            list.push(att);
          }
        });
      }
    });
    return list;
  }, [comments]);

  const handlePrevLightbox = useCallback(() => {
    if (activeLightboxIndex === null || !imageAttachments.length) return;
    setActiveLightboxIndex((prev) => (prev > 0 ? prev - 1 : imageAttachments.length - 1));
  }, [activeLightboxIndex, imageAttachments]);

  const handleNextLightbox = useCallback(() => {
    if (activeLightboxIndex === null || !imageAttachments.length) return;
    setActiveLightboxIndex((prev) => (prev < imageAttachments.length - 1 ? prev + 1 : 0));
  }, [activeLightboxIndex, imageAttachments]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (activeLightboxIndex === null) return;
      if (e.key === 'Escape') setActiveLightboxIndex(null);
      if (e.key === 'ArrowLeft') handlePrevLightbox();
      if (e.key === 'ArrowRight') handleNextLightbox();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLightboxIndex, handleNextLightbox, handlePrevLightbox]);

  // Upload background file
  const startFileUpload = useCallback(async (item) => {
    try {
      const res = await projectService.uploadAttachment(
        { draft_token: draftToken, is_temporary: true, file: item.file },
        { signal: item.abortController.signal }
      );
      if (res && res.id) {
        setPendingFiles(prev => prev.map(p => p.id === item.id ? { ...p, status: 'completed', attachmentId: res.id } : p));
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setPendingFiles(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', errorMsg: err.message || 'Upload failed' } : p));
    }
  }, [draftToken]);

  const handleFileSelect = useCallback((fileOrList) => {
    if (!fileOrList) return;
    const files = Array.from(fileOrList.length !== undefined ? fileOrList : [fileOrList]);
    if (files.length === 0) return;

    files.forEach(file => {
      const pendingId = 'p-' + Math.random().toString(36).substring(2);
      const abortController = new AbortController();
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      const maxLimit = 10 * 1024 * 1024;
      const isTooLarge = file.size > maxLimit;

      const item = {
        id: pendingId,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: isTooLarge ? 'error' : 'uploading',
        attachmentId: null,
        previewUrl,
        abortController,
        errorMsg: isTooLarge ? 'File size exceeds 10MB limit.' : ''
      };

      setPendingFiles(prev => [...prev, item]);

      if (!isTooLarge) {
        startFileUpload(item);
      }
    });
  }, [startFileUpload]);

  const handleCancelPendingFile = useCallback((pendingId) => {
    setPendingFiles(prev => {
      const item = prev.find(p => p.id === pendingId);
      if (item) {
        if (item.status === 'uploading' && item.abortController) {
          try { item.abortController.abort(); } catch (e) {}
        }
        if (item.status === 'completed' && item.attachmentId) {
          projectService.deleteAttachment(item.attachmentId).catch(() => {});
        }
      }
      return prev.filter(p => p.id !== pendingId);
    });
  }, []);

  const handleRetryPendingFile = useCallback((pendingId) => {
    setPendingFiles(prev => {
      const item = prev.find(p => p.id === pendingId);
      if (!item) return prev;
      const newController = new AbortController();
      const updatedItem = { ...item, status: 'uploading', errorMsg: '', abortController: newController };
      startFileUpload(updatedItem);
      return prev.map(p => p.id === pendingId ? updatedItem : p);
    });
  }, [startFileUpload]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      handleFileSelect(e.clipboardData.files);
      e.preventDefault();
    }
  };

  const loadTaskData = useCallback(async () => {
    if (!taskId || !projectId) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const [tData, stData, cRes, statusList, memList, storyData] = await Promise.all([
        projectService.getTask(taskId),
        projectService.getSubtasks(taskId),
        projectService.getComments({ task_id: taskId, limit: 60 }),
        projectService.getProjectStatuses(),
        projectService.getProjectMembers(projectId),
        storyId ? projectService.getStory(storyId).catch(() => null) : Promise.resolve(null),
      ]);

      setTask(tData);
      setSubtasks(Array.isArray(stData) ? stData : []);
      
      if (cRes && typeof cRes === 'object' && Array.isArray(cRes.results)) {
        setComments(cRes.results);
        setHasMoreComments(!!cRes.has_more);
      } else if (Array.isArray(cRes)) {
        setComments(cRes);
        setHasMoreComments(false);
      }

      setStatuses(Array.isArray(statusList) ? statusList : []);
      setProjectMembers(Array.isArray(memList) ? memList : []);
      setParentStory(storyData);

      if (tData) {
        setEditTaskForm({
          title: tData.title || '',
          description: tData.description || '',
          priority: tData.priority || 'Medium',
          estimated_hours: tData.estimated_hours || 8,
          due_date: tData.due_date || '',
          status: tData.status ? String(tData.status) : '',
        });
      }

      setTimeout(scrollToBottom, 150);
    } catch (err) {
      console.error('Error loading task detail:', err);
      setErrorMsg('Failed to load task details.');
    } finally {
      setLoading(false);
    }
  }, [taskId, projectId, storyId, scrollToBottom]);

  useEffect(() => { loadTaskData(); }, [loadTaskData]);

  // Load older comments on scroll near top
  const handleScrollFeed = useCallback(async () => {
    if (!chatFeedRef.current || loadingOlderComments || !hasMoreComments || comments.length === 0) return;
    if (chatFeedRef.current.scrollTop < 60) {
      const firstComment = comments[0];
      if (!firstComment || !firstComment.id) return;

      try {
        setLoadingOlderComments(true);
        const prevScrollHeight = chatFeedRef.current.scrollHeight;
        const cRes = await projectService.getComments({
          task_id: taskId,
          limit: 30,
          before_id: firstComment.id,
          before_created_at: firstComment.created_at,
        });

        const olderList = (cRes && typeof cRes === 'object' && Array.isArray(cRes.results)) ? cRes.results : (Array.isArray(cRes) ? cRes : []);
        const moreAvailable = (cRes && typeof cRes === 'object') ? !!cRes.has_more : false;

        if (olderList.length > 0) {
          setComments(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const filtered = olderList.filter(c => !existingIds.has(c.id));
            return [...filtered, ...prev];
          });
          setHasMoreComments(moreAvailable);

          requestAnimationFrame(() => {
            if (chatFeedRef.current) {
              chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight - prevScrollHeight;
            }
          });
        } else {
          setHasMoreComments(false);
        }
      } catch (e) {
        console.error('Failed to load older comments:', e);
      } finally {
        setLoadingOlderComments(false);
      }
    }
  }, [comments, hasMoreComments, loadingOlderComments, taskId]);

  const handleWebSocketMessageCreated = useCallback((newComment) => {
    if (!newComment || !newComment.id) return;
    setComments((prevComments) => {
      const exists = prevComments.some(
        c => c.id === newComment.id || (newComment.client_message_id && c.client_message_id === newComment.client_message_id)
      );
      if (exists) {
        return prevComments.map(c =>
          (c.id === newComment.id || (newComment.client_message_id && c.client_message_id === newComment.client_message_id)) ? { ...c, ...newComment } : c
        );
      }
      return [...prevComments, newComment];
    });
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  const handleWebSocketMessageUpdated = useCallback((updatedComment) => {
    if (!updatedComment || !updatedComment.id) return;
    setComments((prevComments) =>
      prevComments.map((c) => (c.id === updatedComment.id ? { ...c, ...updatedComment } : c))
    );
  }, []);

  const handleWebSocketMessageDeleted = useCallback((deletedData) => {
    if (!deletedData || !deletedData.id) return;
    setComments((prevComments) =>
      prevComments.filter((c) => c.id !== deletedData.id)
    );
  }, []);

  const handleWebSocketTypingIndicator = useCallback((data) => {
    if (!data || !data.user_id) return;
    if (currentUser && (data.user_id === currentUser.id || data.user_id === currentUser.user_id)) return;
    setTypingUsers((prev) => {
      const copy = { ...prev };
      if (data.is_typing) {
        copy[data.user_id] = { user_name: data.user_name || 'Team member', timestamp: Date.now() };
      } else {
        delete copy[data.user_id];
      }
      return copy;
    });
  }, [currentUser]);

  const { connectionStatus, sendTypingStart, sendTypingStop } = useChatWebSocket({
    roomType: 'task',
    roomId: taskId,
    onMessageCreated: handleWebSocketMessageCreated,
    onMessageUpdated: handleWebSocketMessageUpdated,
    onMessageDeleted: handleWebSocketMessageDeleted,
    onTypingIndicator: handleWebSocketTypingIndicator,
  });

  const handleInputChange = (e) => {
    setCommentText(e.target.value);
    if (!isTypingRef.current) {
      sendTypingStart();
      isTypingRef.current = true;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTypingStop();
      isTypingRef.current = false;
    }, 2000);
  };

  const handleInputBlur = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      sendTypingStop();
      isTypingRef.current = false;
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (pendingFiles.some(f => f.status === 'uploading')) {
      alert('Please wait for file uploads to complete before sending.');
      return;
    }

    const completedAttachmentIds = pendingFiles.filter(f => f.status === 'completed' && f.attachmentId).map(f => f.attachmentId);
    const text = commentText.trim();

    if (!text && completedAttachmentIds.length === 0) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      sendTypingStop();
      isTypingRef.current = false;
    }

    const client_message_id = generateUUID();
    const currentDraftToken = draftToken;

    try {
      setSubmittingComment(true);
      setErrorBanner('');
      setCommentText('');
      setPendingFiles([]);
      setDraftToken(generateUUID());

      const createdComment = await projectService.createComment({
        task: Number(taskId),
        comment: text,
        attachment_ids: completedAttachmentIds,
        draft_token: currentDraftToken,
        client_message_id,
      });

      if (createdComment && createdComment.id) {
        setComments((prev) => {
          const exists = prev.some(c => c.id === createdComment.id || (createdComment.client_message_id && c.client_message_id === createdComment.client_message_id));
          if (exists) {
            return prev.map(c => (c.id === createdComment.id || (createdComment.client_message_id && c.client_message_id === createdComment.client_message_id)) ? createdComment : c);
          }
          return [...prev, createdComment];
        });
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Failed to post message:', err);
      setErrorBanner(err.message || 'Failed to post message.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteAttachment = async (commentId, attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      setErrorBanner('');
      await projectService.deleteAttachment(attachmentId);
      setComments(prev => prev.map(c => {
        if (c.id === commentId && Array.isArray(c.attachments)) {
          return { ...c, attachments: c.attachments.filter(a => a.id !== attachmentId) };
        }
        return c;
      }));
      setSuccessBanner('Attachment deleted.');
      setTimeout(() => setSuccessBanner(''), 3000);
    } catch (err) {
      setErrorBanner(err.message || 'Failed to delete attachment.');
    }
  };

  // Load eligible employees for "Add Employee to Project"
  const loadEligibleEmployees = async () => {
    try {
      setLoadingEligible(true);
      const list = await projectService.getEligibleProjectEmployees(projectId);
      setEligibleEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load eligible employees:', err);
    } finally {
      setLoadingEligible(false);
    }
  };

  const handleOpenAddEmployeeModal = () => {
    setSelectedEmployees([]);
    setEmployeeSearch('');
    loadEligibleEmployees();
    setShowAddEmployeeModal(true);
  };

  const handleAddEmployeesToProject = async () => {
    if (selectedEmployees.length === 0) return;
    try {
      setSubmittingAddEmployee(true);
      setErrorBanner('');
      let firstAddedUserId = null;

      for (const empId of selectedEmployees) {
        const memberRes = await projectService.addProjectMember(projectId, {
          user: Number(empId),
          project_role: 'Developer',
        });
        if (!firstAddedUserId && memberRes?.user) {
          firstAddedUserId = memberRes.user;
        }
      }

      setShowAddEmployeeModal(false);
      setSuccessBanner(`Added ${selectedEmployees.length} employee(s) to project.`);
      setTimeout(() => setSuccessBanner(''), 3000);

      // Auto-assign to task if enabled
      if (autoAssignSelected && (firstAddedUserId || selectedEmployees[0])) {
        const assignId = firstAddedUserId || Number(selectedEmployees[0]);
        await handleAssignDeveloper(assignId);
      } else {
        loadTaskData();
      }
    } catch (err) {
      setErrorBanner(err.message || 'Failed to add employee to project.');
    } finally {
      setSubmittingAddEmployee(false);
    }
  };

  const handleAssignDeveloper = async (userId) => {
    if (savingAssignee) return;
    const previousAssignee = task?.assigned_to;
    const targetId = userId ? Number(userId) : null;

    try {
      setSavingAssignee(true);
      setErrorBanner('');
      // Optimistic update
      setTask(prev => ({
        ...prev,
        assigned_to: targetId,
        assigned_to_name: targetId ? (projectMembers.find(m => m.user === targetId)?.user_name || 'Assigned') : null
      }));

      await projectService.updateTask(taskId, { assigned_to: targetId });
      setSuccessBanner(targetId ? 'Assigned developer updated successfully.' : 'Task assignment cleared.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadTaskData();
    } catch (err) {
      console.error('Assign developer error:', err);
      // Rollback
      setTask(prev => ({ ...prev, assigned_to: previousAssignee }));
      setErrorBanner(err.message || 'Failed to update assigned developer.');
    } finally {
      setSavingAssignee(false);
      setIsComboboxOpen(false);
    }
  };

  const handleStatusChange = async (newStatusId) => {
    try {
      setErrorBanner('');
      await projectService.updateProjectTaskStatus(taskId, newStatusId);
      setSuccessBanner('Task status updated successfully.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadTaskData();
    } catch (err) {
      setErrorBanner(err.message || 'Failed to update task status.');
    }
  };

  const handleEditTask = async (e) => {
    e.preventDefault();
    try {
      setSubmittingEdit(true);
      setErrorBanner('');
      await projectService.updateTask(taskId, {
        title: editTaskForm.title.trim(),
        description: editTaskForm.description.trim() || undefined,
        priority: editTaskForm.priority,
        estimated_hours: Number(editTaskForm.estimated_hours) || 8,
        due_date: editTaskForm.due_date || undefined,
        status: editTaskForm.status ? Number(editTaskForm.status) : undefined,
      });
      setShowEditModal(false);
      setSuccessBanner('Task updated successfully.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadTaskData();
    } catch (err) {
      setErrorBanner(err.message || 'Failed to update task.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm(`Are you sure you want to delete task ${task?.task_key || ''}?`)) return;
    try {
      setErrorBanner('');
      await projectService.deleteTask(taskId);
      router.push(`/projects/${projectId}/stories/${storyId}`);
    } catch (err) {
      setErrorBanner(err.message || 'Failed to delete task.');
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtask.title.trim()) return;
    try {
      setSubmittingSubtask(true);
      setErrorBanner('');
      await projectService.createSubtask({
        task: Number(taskId),
        title: newSubtask.title.trim(),
        assigned_to: newSubtask.assigned_to ? Number(newSubtask.assigned_to) : undefined,
        estimated_hours: Number(newSubtask.estimated_hours) || 2,
      });
      setShowSubtaskModal(false);
      setNewSubtask({ title: '', assigned_to: '', estimated_hours: 2 });
      setSuccessBanner('Subtask added successfully.');
      setTimeout(() => setSuccessBanner(''), 3000);
      loadTaskData();
    } catch (err) {
      setErrorBanner(err.message || 'Failed to create subtask.');
    } finally {
      setSubmittingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId, currentStatus) => {
    if (pendingSubtasks.has(subtaskId)) return;
    const newStatus = !currentStatus;

    // Optimistic UI update
    setPendingSubtasks(prev => new Set(prev).add(subtaskId));
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, is_completed: newStatus } : s));

    try {
      setErrorBanner('');
      await projectService.updateSubtaskStatus(subtaskId, newStatus);
      setSuccessBanner(`Subtask ${newStatus ? 'completed' : 'reopened'} successfully.`);
      setTimeout(() => setSuccessBanner(''), 3000);
      loadTaskData();
    } catch (err) {
      console.error('Subtask status update failed:', err);
      // Rollback optimistic state
      setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, is_completed: currentStatus } : s));
      setErrorBanner(err.message || 'Failed to update subtask status.');
    } finally {
      setPendingSubtasks(prev => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Task Details Workspace...</div>;
  if (errorMsg || !task) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
      <h3>{errorMsg || 'Task not found.'}</h3>
      <Link href={`/projects/${projectId}/stories/${storyId}`} style={{ color: '#2563eb', fontWeight: 600 }}>← Back to Parent Story</Link>
    </div>
  );

  // Subtask Telemetry
  const completedSubtasks = subtasks.filter(s => s.is_completed).length;
  const totalSubtasks = subtasks.length;
  const subtasksPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const isTaskCompleted = task.status_detail?.category === 'completed' || task.status === 'Completed';

  // Parent Story Members IDs for highlighting preferred assignees
  const parentStoryMemberUserIds = parentStory?.story_members ? parentStory.story_members.map(sm => sm.member?.user) : [];

  // Filtered Project Members for Combobox
  const filteredProjectMembers = projectMembers.filter((mem) => {
    const q = comboboxSearch.toLowerCase().trim();
    if (!q) return true;
    const name = (mem.user_name || '').toLowerCase();
    const email = (mem.user_email || '').toLowerCase();
    const role = (mem.designation || mem.project_role || '').toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q);
  }).sort((a, b) => {
    const aInStory = parentStoryMemberUserIds.includes(a.user);
    const bInStory = parentStoryMemberUserIds.includes(b.user);
    if (aInStory && !bInStory) return -1;
    if (!aInStory && bInStory) return 1;
    return 0;
  });

  // Current Assignee Member object
  const currentAssigneeMember = projectMembers.find(m => m.user === task.assigned_to);





  // Filtered Eligible Employees for Add Employee Modal
  const filteredEligibleEmployees = eligibleEmployees.filter(emp => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return true;
    return (emp.name || '').toLowerCase().includes(q) || (emp.email || '').toLowerCase().includes(q);
  });

  const checklistItems = [
    { label: 'Task Created', checked: true },
    { label: 'Create Subtasks', checked: totalSubtasks > 0 },
    { label: 'Complete Subtasks', checked: totalSubtasks > 0 && completedSubtasks === totalSubtasks },
    { label: 'Complete Task', checked: isTaskCompleted },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Breadcrumb & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href={`/projects/${projectId}`} style={{ color: '#2563eb', textDecoration: 'none' }}>Project</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}/stories`} style={{ color: '#2563eb', textDecoration: 'none' }}>Stories</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}/stories/${storyId}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
              {task.story_key || parentStory?.story_key || `ST-${storyId}`}
            </Link>
            <span>/</span>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>{task.task_key || `TASK-${task.id}`}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
              {task.task_key || `TASK-${task.id}`}
            </span>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3.5vw, 1.45rem)', fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {task.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
          <button
            onClick={() => setShowEditModal(true)}
            style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
          >
            <EditIcon size={14} /> Edit Task
          </button>
          <button
            onClick={() => {
              setNewSubtask({ title: '', assigned_to: '', estimated_hours: 2 });
              setShowSubtaskModal(true);
            }}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 44 }}
          >
            + Add Subtask
          </button>
          <button
            onClick={handleDeleteTask}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
          >
            <TrashIcon size={14} color="#dc2626" /> Delete
          </button>
        </div>
      </div>

      {successBanner && (
        <div style={{ padding: '10px 16px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          ✓ {successBanner}
        </div>
      )}

      {errorBanner && (
        <div style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorBanner}</span>
          <button onClick={() => setErrorBanner('')} style={{ background: 'none', border: 'none', color: '#991b1b', fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* 1. Workflow Progress Checklist Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
          📋 Task & Subtasks Execution Checklist
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 10 }}>
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                color: item.checked ? '#166534' : '#64748b',
                fontWeight: item.checked ? 600 : 400,
                background: item.checked ? '#f0fdf4' : '#f8fafc',
                padding: '8px 12px', borderRadius: 8, border: item.checked ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
              }}
            >
              <span>{item.checked ? '☑' : '☐'}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Next Recommended Action Panel */}
      <div>
        {totalSubtasks === 0 ? (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 14, color: '#1e40af', display: 'block' }}>💡 Next Guided Action: Add Subtasks</strong>
              <span style={{ fontSize: 12, color: '#2563eb' }}>Break this task down into subtasks (e.g. Create API, Create Serializer, Build UI).</span>
            </div>
            <button
              onClick={() => setShowSubtaskModal(true)}
              style={{ padding: '9px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}
            >
              + Add Subtask Now
            </button>
          </div>
        ) : completedSubtasks < totalSubtasks ? (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 14, color: '#9a3412', display: 'block' }}>💡 Subtasks In Progress ({completedSubtasks}/{totalSubtasks} Completed)</strong>
              <span style={{ fontSize: 12, color: '#c2410c' }}>Complete remaining subtasks as development work progresses.</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c', background: '#fff', padding: '6px 12px', borderRadius: 6, border: '1px solid #fed7aa' }}>
              {subtasksPct}% Complete
            </span>
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 14, color: '#166534', display: 'block' }}>🎉 All Subtasks Completed!</strong>
              <span style={{ fontSize: 12, color: '#15803d' }}>All child subtasks are finished. Update Task status to Completed.</span>
            </div>
            <select
              value={task.status || ''}
              onChange={(e) => handleStatusChange(Number(e.target.value))}
              style={{ padding: '9px 14px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 44 }}
            >
              {statuses.map((st) => (
                <option key={st.id} value={st.id} style={{ color: '#000' }}>Mark as {st.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Task Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20 }}>
        {/* Left Column: Description & Subtasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Task Description */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Task Description</h3>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', lineHeight: 1.6, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              <TiptapReadOnly content={task.description} />
            </div>
          </div>

          {/* Interactive Subtasks Section */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Interactive Subtasks
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {completedSubtasks} of {totalSubtasks} completed ({subtasksPct}%)
                </span>
              </div>

              <button
                onClick={() => setShowSubtaskModal(true)}
                style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, fontSize: 12, cursor: 'pointer', minHeight: 36 }}
              >
                + Add Subtask
              </button>
            </div>

            {/* Subtask Progress Bar */}
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ width: `${subtasksPct}%`, height: '100%', background: subtasksPct === 100 ? '#16a34a' : '#2563eb', transition: 'width 0.3s' }} />
            </div>

            {totalSubtasks === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: 13 }}>
                  No subtasks created yet. Add subtasks to break down task implementation.
                </p>
                <button
                  onClick={() => setShowSubtaskModal(true)}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 40 }}
                >
                  + Add First Subtask
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subtasks.map((sub) => {
                  const isPending = pendingSubtasks.has(sub.id);
                  return (
                    <div
                      key={sub.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                        padding: '10px 14px', background: sub.is_completed ? '#f0fdf4' : '#f8fafc',
                        border: sub.is_completed ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: 8, fontSize: 13,
                        opacity: isPending ? 0.6 : 1, pointerEvents: isPending ? 'none' : 'auto'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: isPending ? 'wait' : 'pointer', flex: 1, minWidth: 200 }}>
                        <input
                          type="checkbox"
                          disabled={isPending}
                          checked={sub.is_completed}
                          onChange={() => handleToggleSubtask(sub.id, sub.is_completed)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ textDecoration: sub.is_completed ? 'line-through' : 'none', color: sub.is_completed ? '#166534' : '#0f172a', fontWeight: sub.is_completed ? 600 : 500, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                          {sub.title}
                        </span>
                      </label>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {sub.assigned_to_name && (
                          <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: 4 }}>
                            👤 {sub.assigned_to_name}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{sub.estimated_hours || 0} hrs</span>
                        <button
                          onClick={() => handleDeleteSubtask(sub.id)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata & Searchable Developer Assignee */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Metadata Card with Searchable Combobox for Assigned Developer */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              ℹ️ Task Metadata & Assigned Developer
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
              {/* Searchable Assigned Developer Combobox */}
              <div ref={comboboxRef} style={{ position: 'relative' }}>
                <label style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Assigned Developer:</label>
                
                <button
                  type="button"
                  disabled={savingAssignee}
                  onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                    background: savingAssignee ? '#f1f5f9' : '#ffffff', textAlign: 'left', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', cursor: savingAssignee ? 'wait' : 'pointer', fontSize: 13, minHeight: 44
                  }}
                >
                  <span style={{ fontWeight: 600, color: task.assigned_to ? '#0f172a' : '#64748b', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {savingAssignee ? 'Saving...' : (
                      task.assigned_to ? (
                        currentAssigneeMember ? `${currentAssigneeMember.user_name} (${currentAssigneeMember.designation || currentAssigneeMember.project_role || 'Developer'})` : (task.assigned_to_name || 'Former Member')
                      ) : 'Unassigned'
                    )}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>▼</span>
                </button>

                {/* Combobox Dropdown Menu */}
                {isComboboxOpen && (
                  <div
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                      background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8,
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 280,
                      display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}
                  >
                    {/* Search Input */}
                    <div style={{ padding: 8, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        autoFocus
                        value={comboboxSearch}
                        onChange={(e) => setComboboxSearch(e.target.value)}
                        placeholder="Search by name, email, or role..."
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, minHeight: 38 }}
                      />
                    </div>

                    {/* Member Options List */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {/* Unassigned Option */}
                      <div
                        onClick={() => handleAssignDeveloper(null)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                          background: !task.assigned_to ? '#eff6ff' : 'transparent', fontSize: 13, color: '#64748b'
                        }}
                      >
                        Unassigned
                      </div>

                      {filteredProjectMembers.length === 0 ? (
                        <div style={{ padding: 14, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                          No eligible project members found.
                        </div>
                      ) : (
                        filteredProjectMembers.map((mem) => {
                          const isSelected = task.assigned_to === mem.user;
                          const isStoryMember = parentStoryMemberUserIds.includes(mem.user);
                          return (
                            <div
                              key={mem.id}
                              onClick={() => handleAssignDeveloper(mem.user)}
                              style={{
                                padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                background: isSelected ? '#eff6ff' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                              }}
                            >
                              <div>
                                <strong style={{ color: '#0f172a', display: 'block', fontSize: 13 }}>{mem.user_name}</strong>
                                <span style={{ color: '#64748b', fontSize: 11 }}>
                                  {mem.designation || mem.project_role || 'Developer'} · {mem.user_email}
                                </span>
                              </div>
                              {isStoryMember && (
                                <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                  Story Member
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer: + Add Employee to Project */}
                    <div
                      onClick={handleOpenAddEmployeeModal}
                      style={{
                        padding: '10px 12px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
                        color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer', textAlign: 'center'
                      }}
                    >
                      + Add Employee to Project
                    </div>
                  </div>
                )}
              </div>

              <div>
                <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>Status:</span>
                <select
                  value={task.status || ''}
                  onChange={(e) => handleStatusChange(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', fontWeight: 600, minHeight: 44 }}
                >
                  {statuses.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Priority:</span>
                <span style={{ fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 4 }}>
                  {task.priority || 'Medium'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Estimated Hours:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{task.estimated_hours || 0} hrs</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Logged Hours:</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{task.logged_hours || 0} hrs</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Due Date:</span>
                <span style={{ fontWeight: 600, color: task.due_date ? '#0f172a' : '#94a3b8' }}>
                  {task.due_date || 'Not Set'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── UNIFIED CHAT POOL & ACTIVITY STREAM ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px -2px rgba(15, 23, 42, 0.04)', marginTop: 20 }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} color="#2563eb" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Activity & Discussion
              </h3>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                {comments.length} messages shared by team
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              background: connectionStatus === 'connected' ? '#dcfce7' : (connectionStatus === 'connecting' ? '#fef3c7' : '#f1f5f9'),
              color: connectionStatus === 'connected' ? '#166534' : (connectionStatus === 'connecting' ? '#92400e' : '#475569'),
              border: `1px solid ${connectionStatus === 'connected' ? '#bbf7d0' : (connectionStatus === 'connecting' ? '#fde68a' : '#cbd5e1')}`,
              padding: '3px 10px',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: connectionStatus === 'connected' ? '#22c55e' : (connectionStatus === 'connecting' ? '#f59e0b' : '#94a3b8')
              }} />
              {connectionStatus === 'connected' ? 'Connected' : (connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected')}
            </span>
          </div>
        </div>

        {/* Chat Feed Scroll Area */}
        <div
          ref={chatFeedRef}
          onScroll={handleScrollFeed}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            height: comments.length === 0 ? 220 : 440,
            overflowY: 'auto',
            padding: comments.length === 0 ? '24px 20px' : 20,
            background: dragOver ? '#f0f9ff' : '#f8fafc',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            transition: 'background 0.2s'
          }}
        >
          {dragOver && (
            <div style={{
              position: 'absolute', inset: 12, background: 'rgba(239, 246, 255, 0.94)',
              border: '2px dashed #2563eb', borderRadius: 12, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 10
            }}>
              <span style={{ fontSize: 36 }}>📥</span>
              <strong style={{ fontSize: 16, color: '#1d4ed8' }}>Drop files here to attach to message!</strong>
              <span style={{ fontSize: 12, color: '#3b82f6' }}>Supports images, PDFs, documents up to 10MB</span>
            </div>
          )}

          {loadingOlderComments && (
            <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Loading older messages...
            </div>
          )}

          {comments.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>💬</div>
              <strong style={{ display: 'block', fontSize: 15, color: '#475569', marginBottom: 4 }}>No messages shared yet</strong>
              <span style={{ fontSize: 12.5 }}>Type a message below, attach files, or drag & drop / paste images (Ctrl+V)!</span>
            </div>
          ) : (
            comments.map((item) => {
              const isCurrentUser = currentUser && (
                (item.user && (item.user === currentUser.id || item.user.id === currentUser.id)) ||
                (item.user_id && item.user_id === currentUser.id) ||
                (item.user_name && currentUser.first_name && item.user_name.toLowerCase().includes(currentUser.first_name.toLowerCase()))
              );

              const timeStr = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
              const messageAttachments = Array.isArray(item.attachments) ? item.attachments : [];

              return (
                <div
                  key={item.id || item.client_message_id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                    maxWidth: '84%',
                    alignSelf: isCurrentUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11, color: '#64748b' }}>
                    <span style={{ fontWeight: 700, color: isCurrentUser ? '#2563eb' : '#334155' }}>
                      {isCurrentUser ? 'You' : (item.user_name || 'Team Member')}
                    </span>
                    <span>•</span>
                    <span>{dateStr} {timeStr}</span>
                  </div>

                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isCurrentUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      background: isCurrentUser ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#ffffff',
                      color: isCurrentUser ? '#ffffff' : '#0f172a',
                      border: isCurrentUser ? 'none' : '1px solid #cbd5e1',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      fontSize: 13.5,
                      lineHeight: 1.45,
                      width: '100%',
                      maxWidth: 360,
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word'
                    }}
                  >
                    {/* Message Body Text */}
                    {item.comment && (
                      <div style={{ marginBottom: messageAttachments.length > 0 ? 10 : 0 }}>
                        {item.comment}
                      </div>
                    )}

                    {/* Embedded Type-Based Attachments */}
                    {messageAttachments.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {messageAttachments.map((att) => {
                          const fullUrl = normalizeFileUrl(att.file_url || att.file);
                          const fn = (att.file_name || att.name || '').toLowerCase();
                          const mime = (att.mime_type || '').toLowerCase();
                          const isImage = mime.startsWith('image/') || fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.png') || fn.endsWith('.webp') || fn.endsWith('.gif');
                          const isPdf = mime === 'application/pdf' || fn.endsWith('.pdf');
                          const isDoc = fn.endsWith('.doc') || fn.endsWith('.docx');
                          const isXls = fn.endsWith('.xls') || fn.endsWith('.xlsx');
                          const isZip = fn.endsWith('.zip') || fn.endsWith('.tar') || fn.endsWith('.gz') || fn.endsWith('.rar');
                          const imgIdx = isImage ? imageAttachments.findIndex(i => i.id === att.id) : -1;

                          return (
                            <div
                              key={att.id}
                              style={{
                                padding: 8,
                                borderRadius: 10,
                                background: isCurrentUser ? 'rgba(255, 255, 255, 0.15)' : '#f8fafc',
                                border: isCurrentUser ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid #e2e8f0',
                                color: isCurrentUser ? '#ffffff' : '#0f172a'
                              }}
                            >
                              {/* Inline Image Preview */}
                              {isImage ? (
                                <div
                                  onClick={() => imgIdx !== -1 && setActiveLightboxIndex(imgIdx)}
                                  style={{ height: 160, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: '#000', position: 'relative', marginBottom: 6 }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={fullUrl} alt={att.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(15,23,42,0.8)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                                    Click to expand
                                  </div>
                                </div>
                              ) : (
                                <div style={{ height: 50, borderRadius: 6, background: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 6 }}>
                                  {isPdf ? '📕' : (isDoc ? '📄' : (isXls ? '📊' : (isZip ? '📦' : '📁')))}
                                </div>
                              )}

                              <div style={{ padding: '2px 4px' }}>
                                <strong style={{ fontSize: 12, display: 'block', overflowWrap: 'anywhere', wordBreak: 'break-word', color: isCurrentUser ? '#ffffff' : '#0f172a' }}>
                                  {att.file_name || att.name}
                                </strong>
                                <span style={{ fontSize: 10.5, color: isCurrentUser ? 'rgba(255,255,255,0.8)' : '#64748b' }}>
                                  {formatFileSize(att.size_bytes || att.file_size)}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTop: isCurrentUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  {isImage && (
                                    <button
                                      type="button"
                                      onClick={() => imgIdx !== -1 && setActiveLightboxIndex(imgIdx)}
                                      style={{ background: 'none', border: 'none', color: isCurrentUser ? '#ffffff' : '#2563eb', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                    >
                                      <EyeIcon size={12} color={isCurrentUser ? '#ffffff' : '#2563eb'} /> View
                                    </button>
                                  )}
                                  {isPdf && (
                                    <a
                                      href={fullUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: isCurrentUser ? '#ffffff' : '#2563eb', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                    >
                                      <EyeIcon size={12} color={isCurrentUser ? '#ffffff' : '#2563eb'} /> View PDF
                                    </a>
                                  )}
                                  <a
                                    href={fullUrl}
                                    download={att.file_name || att.name}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: isCurrentUser ? '#dcfce7' : '#059669', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                  >
                                    <DownloadIcon size={12} color={isCurrentUser ? '#dcfce7' : '#059669'} /> Download
                                  </a>
                                </div>

                                {isCurrentUser && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAttachment(item.id, att.id)}
                                    style={{ background: 'none', border: 'none', color: '#fca5a5', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Transient Typing Indicator Banner */}
        {Object.keys(typingUsers).length > 0 && (
          <div style={{ padding: '6px 18px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="typing-dots">💬</span>
            <span>
              {Object.values(typingUsers).map(u => u.user_name).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        {/* Chat Input & Attachment Toolbar */}
        <form onSubmit={handleSendChat} style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: 14 }}>
          
          {/* Pending Attachments Toolbar */}
          {pendingFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {pendingFiles.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px',
                    background: p.status === 'error' ? '#fef2f2' : (p.status === 'completed' ? '#f0fdf4' : '#eff6ff'),
                    border: `1px solid ${p.status === 'error' ? '#fecaca' : (p.status === 'completed' ? '#bbf7d0' : '#bfdbfe')}`,
                    borderRadius: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    {p.previewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.previewUrl} alt="Preview" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 16 }}>📄</span>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.status === 'error' ? '#991b1b' : (p.status === 'completed' ? '#166534' : '#1e40af'), display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 10.5, color: p.status === 'error' ? '#dc2626' : (p.status === 'completed' ? '#15803d' : '#3b82f6') }}>
                        {formatFileSize(p.size)} {p.status === 'uploading' ? '• Uploading...' : (p.status === 'completed' ? '• Ready' : `• ${p.errorMsg}`)}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => handleRetryPendingFile(p.id)}
                        style={{ border: 'none', background: '#dc2626', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCancelPendingFile(p.id)}
                      title="Cancel/Remove"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', padding: 2, display: 'flex' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Hidden File Input */}
            <input
              id="file-browse-input"
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />

            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file or image"
              style={{
                width: 40, height: 40, borderRadius: 8, border: '1px solid #cbd5e1',
                background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b', transition: 'all 0.15s', flexShrink: 0
              }}
            >
              <Paperclip size={18} color="#64748b" />
            </button>

            {/* Text Input with Typing & Paste listener */}
            <input
              type="text"
              value={commentText}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onPaste={handlePaste}
              placeholder="Write a message... (Paste images Ctrl+V, drag & drop files)"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1',
                fontSize: 13.5, outline: 'none', color: '#0f172a', background: '#ffffff'
              }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!commentText.trim() && pendingFiles.filter(f => f.status === 'completed').length === 0) || submittingComment || pendingFiles.some(f => f.status === 'uploading')}
              className="btn-white-text"
              style={{
                height: 40, padding: '0 18px', borderRadius: 8, border: 'none',
                background: ((!commentText.trim() && pendingFiles.filter(f => f.status === 'completed').length === 0) || pendingFiles.some(f => f.status === 'uploading')) ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff', fontWeight: 700, fontSize: 13, cursor: ((!commentText.trim() && pendingFiles.filter(f => f.status === 'completed').length === 0) || pendingFiles.some(f => f.status === 'uploading')) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Send size={15} color="#ffffff" />
              <span style={{ color: '#ffffff', fontWeight: 700 }}>
                {submittingComment ? 'Posting...' : 'Send'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* LIGHTBOX IMAGE PREVIEW MODAL */}
      {activeLightboxIndex !== null && imageAttachments[activeLightboxIndex] && (
        <div
          onClick={() => setActiveLightboxIndex(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f172a', borderRadius: 12, maxWidth: '95vw', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ padding: '12px 20px', background: '#1e293b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 14, display: 'block', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{imageAttachments[activeLightboxIndex].file_name}</strong>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Uploaded by {imageAttachments[activeLightboxIndex].uploaded_by_name || 'User'} ({activeLightboxIndex + 1} of {imageAttachments.length})
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <a
                  href={normalizeFileUrl(imageAttachments[activeLightboxIndex].file_url || imageAttachments[activeLightboxIndex].file)}
                  download={imageAttachments[activeLightboxIndex].file_name}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#38bdf8', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                >
                  ⬇️ Download
                </a>
                <button
                  onClick={() => setActiveLightboxIndex(null)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Image View Area */}
            <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 300, position: 'relative' }}>
              {imageAttachments.length > 1 && (
                <button
                  onClick={handlePrevLightbox}
                  style={{
                    position: 'absolute', left: 10, background: 'rgba(255,255,255,0.2)', border: 'none',
                    color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer'
                  }}
                >
                  ◀
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic lightbox preview */}
              <img
                src={normalizeFileUrl(imageAttachments[activeLightboxIndex].file_url || imageAttachments[activeLightboxIndex].file)}
                alt={imageAttachments[activeLightboxIndex].file_name}
                style={{ maxWidth: '85vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: 6 }}
              />

              {imageAttachments.length > 1 && (
                <button
                  onClick={handleNextLightbox}
                  style={{
                    position: 'absolute', right: 10, background: 'rgba(255,255,255,0.2)', border: 'none',
                    color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer'
                  }}
                >
                  ▶
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE TO PROJECT MODAL */}
      {showAddEmployeeModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>+ Add Company Employee to Project</h3>
              <button onClick={() => setShowAddEmployeeModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Select company employees to add as active members of this project and assign to this task.
              </p>

              <div>
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search active employees by name or email..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                />
              </div>

              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 6 }}>
                {loadingEligible ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading eligible employees...</div>
                ) : filteredEligibleEmployees.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No eligible active employees found in your company.
                  </div>
                ) : (
                  filteredEligibleEmployees.map((emp) => {
                    const isChecked = selectedEmployees.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                          cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: isChecked ? '#eff6ff' : 'transparent'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedEmployees(prev => prev.filter(id => id !== emp.id));
                            } else {
                              setSelectedEmployees(prev => [...prev, emp.id]);
                            }
                          }}
                        />
                        <div>
                          <strong style={{ fontSize: 13, color: '#0f172a', display: 'block', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{emp.name}</strong>
                          <span style={{ fontSize: 11, color: '#64748b', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{emp.role} · {emp.email}</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoAssignSelected}
                  onChange={(e) => setAutoAssignSelected(e.target.checked)}
                />
                <span>Automatically assign selected developer to current task after adding</span>
              </label>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowAddEmployeeModal(false)}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedEmployees.length === 0 || submittingAddEmployee}
                onClick={handleAddEmployeesToProject}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
              >
                {submittingAddEmployee ? 'Adding...' : `Add Selected (${selectedEmployees.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SUBTASK MODAL */}
      {showSubtaskModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Add Subtask</h3>
              <button onClick={() => setShowSubtaskModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleAddSubtask} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Subtask Title *</label>
                  <input
                    type="text"
                    required
                    value={newSubtask.title}
                    onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                    placeholder="e.g. Create Serializer field validation"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                  />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Assigned Developer</label>
                    <SingleMemberSelector
                      projectId={projectId}
                      selectedId={newSubtask.assigned_to}
                      onChange={(id) => setNewSubtask({ ...newSubtask, assigned_to: id })}
                      placeholder="Unassigned"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Est. Hours</label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={newSubtask.estimated_hours}
                      onChange={(e) => setNewSubtask({ ...newSubtask, estimated_hours: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowSubtaskModal(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                <button type="submit" disabled={submittingSubtask} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submittingSubtask ? 'Adding...' : 'Add Subtask'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Edit Task Details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleEditTask} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Task Title *</label>
                  <input type="text" required value={editTaskForm.title} onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Priority</label>
                    <select value={editTaskForm.priority} onChange={(e) => setEditTaskForm({ ...editTaskForm, priority: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}>
                      {PRIORITY_OPTIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Estimated Hours</label>
                    <input type="number" min="1" max="200" value={editTaskForm.estimated_hours} onChange={(e) => setEditTaskForm({ ...editTaskForm, estimated_hours: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Due Date</label>
                  <input type="date" value={editTaskForm.due_date} onChange={(e) => setEditTaskForm({ ...editTaskForm, due_date: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Task Description</label>
                  <TiptapEditor
                    preset="standard"
                    targetType="task"
                    taskId={taskId}
                    storyId={storyId}
                    value={editTaskForm.description}
                    onChange={(val) => setEditTaskForm({ ...editTaskForm, description: val })}
                    placeholder="Describe task implementation scope..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                <button type="submit" disabled={submittingEdit} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submittingEdit ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
