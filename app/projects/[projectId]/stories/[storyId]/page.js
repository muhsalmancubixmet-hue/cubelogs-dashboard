'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '../../../../../context/AppContext';
import { Send, Paperclip, X, Users, MessageSquare } from 'lucide-react';
import { getBackendBaseUrl, generateUUID } from '../../../../../lib/api/apiClient';
import { projectService } from '../../../../../lib/services/projectService';
import { EditIcon, SprintIcon, TrashIcon, CheckIcon, EyeIcon, DownloadIcon } from '../../../../../components/Icons';
import { TiptapEditor, TiptapReadOnly } from '../../../../../components/rich-text';
import AssignedMembersSelector from '../../../../../components/projects/AssignedMembersSelector';
import { useChatWebSocket } from '../../../../../lib/hooks/useChatWebSocket';

const WORK_TYPE_OPTIONS = ['Feature', 'Bug', 'Improvement', 'Research'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(id) {
  const colors = [
    'linear-gradient(135deg, #6366f1, #4f46e5)',
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #f59e0b, #b45309)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  ];
  const index = Math.abs(typeof id === 'number' ? id : String(id).charCodeAt(0) || 0) % colors.length;
  return colors[index];
}

function normalizeFileUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const url = rawUrl.trim();
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const baseUrl = getBackendBaseUrl();
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  if (url.startsWith('/media/')) return `${base}${url}`;
  return `${base}/${url.replace(/^\/+/, '')}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;
  const storyId = params?.storyId;

  const [story, setStory] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [epics, setEpics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [comments, setComments] = useState([]);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingOlderComments, setLoadingOlderComments] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Chat Stream & File Upload State
  const { currentUser } = useApp() || {};
  const chatFeedRef = useRef(null);
  const fileInputRef = useRef(null);

  const [commentText, setCommentText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [draftToken, setDraftToken] = useState(() => generateUUID());
  const [taskDraftToken, setTaskDraftToken] = useState(() => generateUUID());

  const isTypingRef = useRef(false);
  const typingTimerRef = useRef(null);

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', assigned_to: '', priority: 'Medium', estimated_hours: 8, due_date: '', description: '', status: ''
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editStoryForm, setEditStoryForm] = useState({
    title: '', work_type: 'Feature', priority: 'Medium', story_points: 3, epic: '', acceptance_criteria: '', description: '', due_date: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [submittingMembers, setSubmittingMembers] = useState(false);

  const [showMoveSprintModal, setShowMoveSprintModal] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [submittingMoveSprint, setSubmittingMoveSprint] = useState(false);

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

  const loadStoryDetails = useCallback(async () => {
    if (!storyId || !projectId) return;
    try {
      setLoading(true);
      setErrorMsg('');

      const [sData, tData, eData, spData, mData, stData, cRes] = await Promise.all([
        projectService.getStory(storyId),
        projectService.getStoryTasks(storyId),
        projectService.getEpics(projectId),
        projectService.getSprints(projectId),
        projectService.getProjectMembers(projectId),
        projectService.getProjectStatuses(),
        projectService.getComments({ story_id: storyId, limit: 60 }),
      ]);

      setStory(sData);
      setTasks(Array.isArray(tData) ? tData : (tData?.results || []));
      setEpics(Array.isArray(eData) ? eData : []);
      setSprints(Array.isArray(spData) ? spData : []);
      setProjectMembers(Array.isArray(mData) ? mData : []);
      setStatuses(Array.isArray(stData) ? stData : []);

      if (cRes && typeof cRes === 'object' && Array.isArray(cRes.results)) {
        setComments(cRes.results);
        setHasMoreComments(!!cRes.has_more);
      } else if (Array.isArray(cRes)) {
        setComments(cRes);
        setHasMoreComments(false);
      }

      if (sData) {
        setEditStoryForm({
          title: sData.title || '',
          work_type: sData.work_type || 'Feature',
          priority: sData.priority || 'Medium',
          story_points: sData.story_points || 3,
          epic: sData.epic ? String(sData.epic) : '',
          acceptance_criteria: sData.acceptance_criteria || '',
          description: sData.description || '',
          due_date: sData.due_date || '',
        });
        setSelectedMemberIds(Array.isArray(sData.story_members) ? sData.story_members.map(m => m.user || m.member) : []);
        setSelectedSprintId(sData.sprint ? String(sData.sprint) : '');
      }

      setTimeout(scrollToBottom, 150);
    } catch (err) {
      console.error('Error loading story details:', err);
      setErrorMsg('Failed to load story details.');
    } finally {
      setLoading(false);
    }
  }, [storyId, projectId, scrollToBottom]);

  useEffect(() => { loadStoryDetails(); }, [loadStoryDetails]);

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
          story_id: storyId,
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
  }, [comments, hasMoreComments, loadingOlderComments, storyId]);

  const handleEditStory = async (e) => {
    e.preventDefault();
    try {
      setSubmittingEdit(true);
      await projectService.updateStory(storyId, {
        title: editStoryForm.title.trim(),
        work_type: editStoryForm.work_type,
        priority: editStoryForm.priority,
        story_points: Number(editStoryForm.story_points),
        epic: editStoryForm.epic ? Number(editStoryForm.epic) : null,
        acceptance_criteria: editStoryForm.acceptance_criteria.trim() || undefined,
        description: editStoryForm.description.trim() || undefined,
        due_date: editStoryForm.due_date || undefined,
      });
      setShowEditModal(false);
      setSuccessBanner('Story details updated successfully.');
      setTimeout(() => setSuccessBanner(''), 4000);
      loadStoryDetails();
    } catch (err) {
      alert(err.message || 'Failed to update story.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleAssignMembers = async (e) => {
    e.preventDefault();
    try {
      setSubmittingMembers(true);
      await projectService.updateStory(storyId, { members: selectedMemberIds });
      setShowMembersModal(false);
      setSuccessBanner('Assigned members updated.');
      setTimeout(() => setSuccessBanner(''), 4000);
      loadStoryDetails();
    } catch (err) {
      alert(err.message || 'Failed to assign members.');
    } finally {
      setSubmittingMembers(false);
    }
  };

  const handleMoveSprint = async (e) => {
    e.preventDefault();
    try {
      setSubmittingMoveSprint(true);
      await projectService.moveStorySprint(storyId, selectedSprintId ? Number(selectedSprintId) : null);
      setShowMoveSprintModal(false);
      setSuccessBanner('Story sprint assignment updated.');
      setTimeout(() => setSuccessBanner(''), 4000);
      loadStoryDetails();
    } catch (err) {
      alert(err.message || 'Failed to move story sprint.');
    } finally {
      setSubmittingMoveSprint(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!confirm(`Are you sure you want to delete story ${story?.story_key || ''}?`)) return;
    try {
      await projectService.deleteStory(storyId);
      router.push(`/projects/${projectId}/stories`);
    } catch (err) {
      alert(err.message || 'Failed to delete story.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    try {
      setSubmittingTask(true);
      const selectedMembers = (newTask.assigned_members && newTask.assigned_members.length > 0)
        ? newTask.assigned_members
        : (newTask.assigned_to ? [Number(newTask.assigned_to)] : []);

      const payload = {
        story: Number(storyId),
        title: newTask.title.trim(),
        assigned_to: selectedMembers.length > 0 ? Number(selectedMembers[0]) : null,
        priority: newTask.priority || 'Medium',
        estimated_hours: Number(newTask.estimated_hours) || 8,
        due_date: newTask.due_date || null,
        description: newTask.description ? newTask.description.trim() : '',
        status: newTask.status ? Number(newTask.status) : undefined,
      };

      if (taskDraftToken) {
        payload.draft_token = taskDraftToken;
      }

      await projectService.createProjectTask(payload);
      setShowTaskModal(false);
      setNewTask({ title: '', assigned_to: '', assigned_members: [], priority: 'Medium', estimated_hours: 8, due_date: '', description: '', status: '' });
      setTaskDraftToken(generateUUID());
      const tData = await projectService.getStoryTasks(storyId);
      setTasks(Array.isArray(tData) ? tData : []);
    } catch (err) {
      alert(err.message || 'Failed to create task.');
    } finally {
      setSubmittingTask(false);
    }
  };

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
    roomType: 'story',
    roomId: storyId,
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
      setCommentText('');
      setPendingFiles([]);
      setDraftToken(generateUUID());

      const createdComment = await projectService.createComment({
        story: Number(storyId),
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
      alert(err.message || 'Failed to post message.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteAttachment = async (commentId, attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await projectService.deleteAttachment(attachmentId);
      setComments(prev => prev.map(c => {
        if (c.id === commentId && Array.isArray(c.attachments)) {
          return { ...c, attachments: c.attachments.filter(a => a.id !== attachmentId) };
        }
        return c;
      }));
    } catch (err) {
      alert('Failed to delete attachment.');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Story Workspace...</div>;
  if (errorMsg || !story) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
      <h3>{errorMsg || 'Story not found.'}</h3>
      <Link href={`/projects/${projectId}/stories`} style={{ color: '#2563eb', fontWeight: 600 }}>← Back to Stories</Link>
    </div>
  );

  // Scrum Telemetry & Task Calculations
  const completedTasks = tasks.filter(t => {
    const cat = (t.status_detail?.category || '').toLowerCase();
    const name = (t.status_detail?.name || t.status_name || t.status || '').toString().toLowerCase();
    return cat === 'completed' || name === 'completed' || name === 'done' || t.is_completed === true;
  }).length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const isStoryCompleted = story.status_detail?.category === 'completed' || progressPct === 100;
  const hasTasks = totalTasks > 0;
  const inSprint = !!story.sprint;
  const isSprintActive = story.sprint_detail?.status === 'active';

  // Checklist Items
  const checklistItems = [
    { label: 'Story Created', checked: true },
    { label: 'Create Tasks', checked: hasTasks },
    { label: 'Move to Sprint', checked: inSprint },
    { label: 'Start Sprint', checked: isSprintActive },
    { label: 'Complete Story', checked: isStoryCompleted },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Breadcrumb & Actions Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link href={`/projects/${projectId}/stories`} style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Stories List
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
              {story.story_key || `ST-${story.id}`}
            </span>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 3.5vw, 1.45rem)', fontWeight: 700, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {story.title}
            </h1>
          </div>
        </div>

        {/* Story Action Bar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
          <button
            onClick={() => setShowEditModal(true)}
            style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
          >
            <EditIcon size={14} /> Edit Story
          </button>
          <button
            onClick={() => setShowMembersModal(true)}
            style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
          >
            <Users size={14} /> Assign Members
          </button>
          <button
            onClick={() => setShowMoveSprintModal(true)}
            style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}
          >
            <SprintIcon size={14} /> Move Sprint
          </button>
          <button
            onClick={() => {
              setNewTask({ title: '', assigned_to: '', priority: 'Medium', estimated_hours: 8, due_date: '', description: '', status: '' });
              setTaskDraftToken(generateUUID());
              setShowTaskModal(true);
            }}
            className="btn-white-text"
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 600, fontSize: 13, cursor: 'pointer', minHeight: 44 }}
          >
            + Create Task
          </button>
          <button
            onClick={handleDeleteStory}
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

      {/* 1. Workflow Progress Checklist Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
          Story Workflow Progress
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 10 }}>
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                color: item.checked ? '#15803d' : '#64748b',
                fontWeight: item.checked ? 600 : 400,
                background: item.checked ? '#f0fdf4' : '#f8fafc',
                padding: '8px 12px', borderRadius: 8, border: item.checked ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
              }}
            >
              {item.checked ? <CheckIcon size={14} color="#16a34a" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #cbd5e1' }} />}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Action Status Banner */}
      <div>
        {!hasTasks ? (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 14, color: '#1e40af', display: 'block' }}>Next Action: Create Tasks</strong>
              <span style={{ fontSize: 12, color: '#2563eb' }}>Break this user story down into actionable developer tasks.</span>
            </div>
            <button
              onClick={() => {
                setTaskDraftToken(generateUUID());
                setShowTaskModal(true);
              }}
              className="btn-white-text"
              style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 40 }}
            >
              + Create Task Now
            </button>
          </div>
        ) : !inSprint ? (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 14, color: '#9a3412', display: 'block' }}>Next Action: Move to Sprint</strong>
              <span style={{ fontSize: 12, color: '#c2410c' }}>This story is currently in the Product Backlog. Assign it to a Sprint to start development.</span>
            </div>
            <button
              onClick={() => setShowMoveSprintModal(true)}
              className="btn-white-text"
              style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: '#ea580c', color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 40 }}
            >
              Move to Sprint →
            </button>
          </div>
        ) : !isSprintActive ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 14, color: '#166534', display: 'block' }}>Next Action: Start Sprint</strong>
              <span style={{ fontSize: 12, color: '#15803d' }}>Story is assigned to {story.sprint_detail?.name || 'Sprint'}. Start the sprint from Sprint Planning.</span>
            </div>
            <Link
              href={`/projects/${projectId}/sprints`}
              className="btn-white-text"
              style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#ffffff', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', minHeight: 40, display: 'inline-flex', alignItems: 'center' }}
            >
              Go to Sprint Planning →
            </Link>
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 14, color: '#166534', display: 'block' }}>Sprint Active & In Progress</strong>
              <span style={{ fontSize: 12, color: '#15803d' }}>Update task statuses from the Scrum Board or individual Task detail views.</span>
            </div>
            <Link
              href={`/projects/${projectId}/board`}
              className="btn-white-text"
              style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#ffffff', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', minHeight: 40, display: 'inline-flex', alignItems: 'center' }}
            >
              Open Scrum Board →
            </Link>
          </div>
        )}
      </div>

      {/* 3. Story Details & Information Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16, alignItems: 'flex-start' }}>
        {/* Left Column: Requirements & Acceptance Criteria */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Story Criteria & Description Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Acceptance Criteria</h3>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', lineHeight: 1.6, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              <TiptapReadOnly content={story.acceptance_criteria} />
            </div>

            <h3 style={{ margin: '16px 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Description</h3>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', lineHeight: 1.6, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              <TiptapReadOnly content={story.description} />
            </div>
          </div>

          {/* Task Progress Section */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Tasks Progress</h3>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 12 }}>
                {completedTasks} of {totalTasks} Completed ({progressPct}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct === 100 ? '#16a34a' : '#2563eb', transition: 'width 0.3s' }} />
            </div>

            {/* Clickable Tasks Cards */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#475569' }}>Task List</h4>
              <button
                onClick={() => setShowTaskModal(true)}
                className="btn-white-text"
                style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36 }}
              >
                + Add Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>
                No tasks created yet for this story.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => router.push(`/projects/${projectId}/stories/${storyId}/tasks/${task.id}`)}
                    style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                      cursor: 'pointer', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
                          {task.task_key || `TSK-${task.id}`}
                        </span>
                        <strong style={{ fontSize: 14, color: '#0f172a', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{task.title}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Assignee: <strong style={{ color: '#334155' }}>{task.assigned_to_name || 'Unassigned'}</strong> • Est: {task.estimated_hours || 0} hrs
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 10 }}>
                        {task.status_detail?.name || task.status || 'Pending'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 10 }}>
                        {task.priority || 'Medium'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Read-Only Information Panel & Feeds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Story Information Panel */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Story Metadata & Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              {/* Read-Only Sprint Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Sprint Assignment:</span>
                <span style={{ fontSize: 12, fontWeight: 700, background: story.sprint ? '#f0fdf4' : '#f1f5f9', color: story.sprint ? '#15803d' : '#475569', padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  {story.sprint_detail ? `${story.sprint_detail.name} (${story.sprint_detail.status})` : 'Product Backlog'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Work Type:</span>
                <span style={{ fontWeight: 600, color: '#334155', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                  {story.work_type || 'Feature'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Priority:</span>
                <span style={{ fontWeight: 700, color: '#b45309' }}>
                  {story.priority || 'Medium'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Story Points:</span>
                <span style={{ fontWeight: 700, color: '#0f172a', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12 }}>
                  {story.story_points || 0} Points
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Created On:</span>
                <span style={{ color: '#334155' }}>
                  {story.created_at ? new Date(story.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Due Date:</span>
                <span style={{ fontWeight: 600, color: story.due_date ? '#0f172a' : '#94a3b8' }}>
                  {story.due_date || 'Not Set'}
                </span>
              </div>

              <div style={{ marginTop: 6 }}>
                <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Assigned Members:</span>
                {Array.isArray(story.story_members) && story.story_members.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {story.story_members.map((mem, idx) => {
                      const name = mem.user_name || mem.member_user_name || 'Member';
                      const photo = mem.user_photo || mem.member_user_photo;
                      const uid = mem.user || mem.member || mem.id || idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px 3px 4px',
                            borderRadius: 16,
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1e293b'
                          }}
                        >
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: getGradient(uid),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#fff',
                            flexShrink: 0
                          }}>
                            {photo ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={normalizeFileUrl(photo)} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getInitials(name)
                            )}
                          </div>
                          <span>{name}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>No members assigned</span>
                )}
              </div>

              {Array.isArray(story.labels) && story.labels.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>Labels:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {story.labels.map((lbl, idx) => (
                      <span key={idx} style={{ fontSize: 11, background: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        #{lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── UNIFIED CHAT POOL & ACTIVITY STREAM ── */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px -2px rgba(15, 23, 42, 0.04)' }}>
        
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
        </div>
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

            {/* Image display */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', minHeight: 300 }}>
              {imageAttachments.length > 1 && (
                <button
                  onClick={handlePrevLightbox}
                  style={{
                    position: 'absolute', left: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                    width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  ❮
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={normalizeFileUrl(imageAttachments[activeLightboxIndex].file_url || imageAttachments[activeLightboxIndex].file)}
                alt={imageAttachments[activeLightboxIndex].file_name}
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 6 }}
              />

              {imageAttachments.length > 1 && (
                <button
                  onClick={handleNextLightbox}
                  style={{
                    position: 'absolute', right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                    width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  ❯
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Create Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 700 }}>Create Task for Story</h3>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Task Title *</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Create Employee API Endpoint"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                  />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Initial Status</label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                    >
                      <option value="">Default (Pending)</option>
                      {statuses.map((st) => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                    >
                      {PRIORITY_OPTIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Estimated Hours</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Assign Developers / Team Members</label>
                  <AssignedMembersSelector
                    projectId={projectId}
                    selectedIds={newTask.assigned_members || (newTask.assigned_to ? [Number(newTask.assigned_to)] : [])}
                    onChange={(selectedIds) => setNewTask({
                      ...newTask,
                      assigned_members: selectedIds,
                      assigned_to: selectedIds.length > 0 ? selectedIds[0] : ''
                    })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Due Date (Optional)</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Task Description</label>
                  <TiptapEditor
                    preset="standard"
                    targetType="task"
                    taskId={null}
                    draftToken={taskDraftToken}
                    storyId={storyId}
                    value={newTask.description}
                    onChange={(val) => setNewTask({ ...newTask, description: val })}
                    placeholder="Task implementation details..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowTaskModal(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                <button type="submit" disabled={submittingTask} className="btn-primary" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submittingTask ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Story Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Edit Story Details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleEditStory} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Story Title *</label>
                  <input type="text" required value={editStoryForm.title} onChange={(e) => setEditStoryForm({ ...editStoryForm, title: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, minHeight: 44 }} />
                </div>

                <div className="form-grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Work Type</label>
                    <select value={editStoryForm.work_type} onChange={(e) => setEditStoryForm({ ...editStoryForm, work_type: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}>
                      {WORK_TYPE_OPTIONS.map((wt) => (<option key={wt} value={wt}>{wt}</option>))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Priority</label>
                    <select value={editStoryForm.priority} onChange={(e) => setEditStoryForm({ ...editStoryForm, priority: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}>
                      {PRIORITY_OPTIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Story Points</label>
                    <select value={editStoryForm.story_points} onChange={(e) => setEditStoryForm({ ...editStoryForm, story_points: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}>
                      {FIBONACCI_STORY_POINTS.map((pt) => (<option key={pt} value={pt}>{pt} Points</option>))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Epic</label>
                    <select value={editStoryForm.epic} onChange={(e) => setEditStoryForm({ ...editStoryForm, epic: e.target.value })} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}>
                      <option value="">No Epic</option>
                      {epics.map((ep) => (<option key={ep.id} value={ep.id}>{ep.title}</option>))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Acceptance Criteria</label>
                  <TiptapEditor
                    preset="standard"
                    targetType="story"
                    storyId={storyId}
                    value={editStoryForm.acceptance_criteria}
                    onChange={(val) => setEditStoryForm({ ...editStoryForm, acceptance_criteria: val })}
                    placeholder="Define acceptance criteria..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Story Description</label>
                  <TiptapEditor
                    preset="standard"
                    targetType="story"
                    storyId={storyId}
                    value={editStoryForm.description}
                    onChange={(val) => setEditStoryForm({ ...editStoryForm, description: val })}
                    placeholder="Describe user story details..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                <button type="submit" disabled={submittingEdit} className="btn-primary" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submittingEdit ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Members Modal */}
      {showMembersModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Assign Story Members</h3>
              <button onClick={() => setShowMembersModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleAssignMembers} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body">
                <AssignedMembersSelector
                  projectId={projectId}
                  selectedIds={selectedMemberIds}
                  onChange={(ids) => setSelectedMemberIds(ids)}
                  initialEmployees={projectMembers}
                />
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowMembersModal(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                <button type="submit" disabled={submittingMembers} className="btn-primary" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submittingMembers ? 'Saving...' : 'Save Members'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move to Sprint Modal */}
      {showMoveSprintModal && (
        <div className="modal-overlay">
          <div className="modal-shell" style={{ width: '100%', maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Move Story to Sprint</h3>
              <button onClick={() => setShowMoveSprintModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>✕</button>
            </div>
            <form onSubmit={handleMoveSprint} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div className="modal-body">
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Select Target Sprint</label>
                <select
                  value={selectedSprintId}
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', minHeight: 44 }}
                >
                  <option value="">Product Backlog (No Sprint)</option>
                  {sprints.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name} ({sp.status})</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowMoveSprintModal(false)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', minHeight: 44 }}>Cancel</button>
                <button type="submit" disabled={submittingMoveSprint} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{submittingMoveSprint ? 'Moving...' : 'Move Story'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
