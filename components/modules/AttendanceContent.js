'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageWrapper from '@/components/PageWrapper';
import VerifierModal from './attendance/VerifierModal';
import PhotoViewerModal from './attendance/PhotoViewerModal';
import { useApp } from '@/context/AppContext';
import { API_BASE_URL, apiFetch } from '@/lib/api';
import { 
  ClockIcon, 
  HolidaysIcon, 
  EmployeesIcon, 
  WarningIcon, 
  EditIcon, 
  BrandLogo, 
  CloseIcon, 
  TasksIcon,
  LeavesIcon,
  SearchIcon,
  LocationIcon,
  CameraIcon,
  CheckIcon
} from '@/components/Icons';

function AttendanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showAlert } = useApp();
  const [officeLocations, setOfficeLocations] = useState([]);

  // Local state for attendance data
  const [currentUser, setCurrentUser] = useState(null);
  const [cachedEmployees, setCachedEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [schedules, setSchedules] = useState([
    { id: '1', designation: 'Developer', shiftStart: '09:00', shiftEnd: '17:00' },
    { id: '2', designation: 'Designer', shiftStart: '09:00', shiftEnd: '17:00' },
    { id: '3', designation: 'Manager', shiftStart: '09:00', shiftEnd: '17:00' },
    { id: '4', designation: 'Staff', shiftStart: '08:00', shiftEnd: '16:00' },
  ]);
  const [facingMode, setFacingMode] = useState('user');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected month & year defined at the top for fetch visibility
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const employees = cachedEmployees;

  // Map employee photo paths
  const employeePhotos = {};
  employees.forEach(emp => {
    if (emp.profilePhoto) {
      employeePhotos[emp.id] = emp.profilePhoto;
    }
  });

  // Lock to prevent double-firing Clock-In API
  const clockingInProgress = useRef(false);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cubelogs_access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchAttendanceData = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMsg('');
    try {
      let path = `/attendance/?month=${selectedMonth + 1}&year=${selectedYear}`;
      if (!hasPermission('attendance:admin')) {
        path += `&employee_id=${currentUser.id}`;
      }
      const data = await apiFetch(path);
      const mappedAttendance = data.map(log => ({
        ...log,
        id: String(log.id),
        employeeId: String(log.employee)
      }));
      setAttendanceLogs(mappedAttendance);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const localClockIn = async (employeeId, verificationData) => {
    if (clockingInProgress.current) return { success: false, error: 'Clock-in in progress.' };
    clockingInProgress.current = true;
    setVerifierLoading(true);
    setVerifierError('');

    try {
      const responseLog = await apiFetch('/attendance/clock-in/', {
        method: 'POST',
        body: JSON.stringify({ employeeId: parseInt(employeeId), verificationData }),
      });

      setAttendanceLogs(prev => [
        { ...responseLog, id: String(responseLog.id), employeeId: String(responseLog.employee) },
        ...prev
      ]);
      await fetchAttendanceData();
      return { success: true };
    } catch (err) {
      console.warn('Clock-in error:', err.message);
      const errMsg = err.message || 'Clock-in failed.';
      setVerifierError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setVerifierLoading(false);
      setTimeout(() => {
        clockingInProgress.current = false;
      }, 1000);
    }
  };

  const localClockOut = async (employeeId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const responseLog = await apiFetch('/attendance/clock-out/', {
        method: 'POST',
        body: JSON.stringify({ employeeId: parseInt(employeeId) }),
      });

      setAttendanceLogs(prev => prev.map(log => 
        (log.employeeId === String(employeeId) && !log.clockOut) 
          ? { ...responseLog, id: String(responseLog.id), employeeId: String(responseLog.employee) } 
          : log
      ));
      await fetchAttendanceData();
    } catch (err) {
      console.warn('Clock-out error:', err.message);
      setErrorMsg(err.message || 'Clock-out failed.');
    } finally {
      setLoading(false);
    }
  };

  const localSaveSchedule = async (scheduleData) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const exists = schedules.find(s => s.designation === scheduleData.designation);
      let saved;
      if (exists) {
        saved = await apiFetch(`/schedules/${exists.id}/`, {
          method: 'PUT',
          body: JSON.stringify(scheduleData),
        });
      } else {
        saved = await apiFetch('/schedules/', {
          method: 'POST',
          body: JSON.stringify(scheduleData),
        });
      }

      const mappedSaved = { ...saved, id: String(saved.id) };
      
      if (exists) {
        setSchedules(prev => prev.map(s => s.designation === scheduleData.designation ? mappedSaved : s));
      } else {
        setSchedules(prev => [...prev, mappedSaved]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save schedule.');
    } finally {
      setLoading(false);
    }
  };

  const primaryPremises = officeLocations.find(loc => loc.isPrimary) || officeLocations[0] || { lat: 11.1143, lon: 76.2274 };
  const officePremises = { lat: primaryPremises.lat, lon: primaryPremises.lon };

  // Sync session & cached data on mount
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

    const loadDependencies = async () => {
      try {
        const [locsData, empsData, schedsData] = await Promise.all([
          apiFetch('/locations/'),
          apiFetch('/employees/'),
          apiFetch('/schedules/')
        ]);
        setOfficeLocations(locsData.map(loc => ({ ...loc, id: String(loc.id) })));
        setCachedEmployees(empsData.map(emp => ({ ...emp, id: String(emp.id) })));
        setSchedules(schedsData.map(sched => ({ ...sched, id: String(sched.id) })));
      } catch (err) {
        console.error('Failed to load attendance dependencies:', err);
      }
    };
    loadDependencies();
  }, [router]);

  // Re-fetch attendance when selectedMonth, selectedYear, or currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchAttendanceData();
    }
  }, [selectedMonth, selectedYear, currentUser]);

  // Live local system clock state
  const [currentTime, setCurrentTime] = useState(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formatLocalTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Scheduler configuration state
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [schedShiftStart, setSchedShiftStart] = useState('09:00');
  const [schedShiftEnd, setSchedShiftEnd] = useState('17:00');

  // Admin view tabs and Monthly punch directory state
  const [adminTab, setAdminTab] = useState('realtime'); // 'realtime' or 'monthly'
  const [monthSearch, setMonthSearch] = useState('');
  const [monthDesignation, setMonthDesignation] = useState('All');
  
  // Table search queries
  const [myAttendanceSearchQuery, setMyAttendanceSearchQuery] = useState('');
  const [realtimeSearchQuery, setRealtimeSearchQuery] = useState('');
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');

  // Geofencing and webcam verification state
  const [showVerifierModal, setShowVerifierModal] = useState(false);
  const [verifierStep, setVerifierStep] = useState('checking'); // 'checking', 'success', 'failed', 'camera'
  const [activePhotoModal, setActivePhotoModal] = useState(null);
  const [activePhotoLocation, setActivePhotoLocation] = useState(null);
  const [verifierLoading, setVerifierLoading] = useState(false);
  const [verifierError, setVerifierError] = useState('');
  const [verifierLocation, setVerifierLocation] = useState(null);
  const [verifierDistance, setVerifierDistance] = useState(null);
  const [verifierPhoto, setVerifierPhoto] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [closestLocation, setClosestLocation] = useState(null);

  const videoRef = useRef(null);
  // Guard flag: prevents React Strict Mode's double-invocation from triggering the modal twice
  const autoTriggeredRef = useRef(false);

  // Read search params for auto-trigger of clock-in modal

  // Auto-trigger clock-in verifier modal if ?triggerClockIn=true in URL
  useEffect(() => {
    // Guard: only fire once even in React Strict Mode (which double-invokes effects in dev)
    if (autoTriggeredRef.current) return;
    const triggerParam = searchParams?.get('triggerClockIn');
    if (triggerParam === 'true') {
      autoTriggeredRef.current = true;
      // Clean the URL immediately so refresh doesn't re-trigger
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/attendance');
      }
      // Only open the modal if not already clocked in today
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const alreadyClockedIn = attendanceLogs.some(
        l => l.employeeId === currentUser?.id && l.date === today && !l.clockOut
      );
      if (!alreadyClockedIn && currentUser) {
        handleClockIn();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Active user ticking timers (work)
  const [activeLog, setActiveLog] = useState(null);
  const [workSeconds, setWorkSeconds] = useState(0);
  const timerRef = useRef(null);

  // Sync timers
  useEffect(() => {
    if (!currentUser) return;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const log = attendanceLogs.find(
      l => l.employeeId === currentUser.id && l.date === today && !l.clockOut
    );
    setActiveLog(log || null);

    if (timerRef.current) clearInterval(timerRef.current);

    if (log) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const inTime = new Date(log.clockIn);
        
        let totalElapsedMs = now - inTime;
        setWorkSeconds(Math.max(0, Math.floor(totalElapsedMs / 1000)));
      }, 1000);
    } else {
      setWorkSeconds(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attendanceLogs, currentUser]);

  if (!currentUser) return null;

  // Format Helper
  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Haversine distance calculator
  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getCoordinates = (timeoutMs = 10000) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          resolve({
            coords: {
              latitude: officePremises?.lat || 11.1143,
              longitude: officePremises?.lon || 76.2274,
              accuracy: 10,
            }
          });
          return;
        }
        const error = new Error('Geolocation is not supported by your browser.');
        error.code = 0;
        reject(error);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          console.warn('High accuracy geolocation failed, trying fallback with low accuracy...', err);
          navigator.geolocation.getCurrentPosition(
            resolve,
            (fallbackErr) => {
              if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.warn('Localhost detected: resolving with mock coordinates matching office premises.');
                resolve({
                  coords: {
                    latitude: officePremises?.lat || 11.1143,
                    longitude: officePremises?.lon || 76.2274,
                    accuracy: 10,
                  }
                });
              } else {
                reject(fallbackErr);
              }
            },
            { enableHighAccuracy: false, timeout: timeoutMs }
          );
        },
        { enableHighAccuracy: true, timeout: timeoutMs }
      );
    });
  };

  const fetchAndVerifyLocation = () => {
    return new Promise((resolve, reject) => {
      getCoordinates(8000).then(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const dist = getDistanceInMeters(lat, lon, officePremises.lat, officePremises.lon);
          
          setVerifierLocation({ lat, lon });
          setVerifierDistance(dist);

          if (dist > 100) {
            reject(new Error(`Outside corporate premises. Distance: ${dist.toFixed(1)} meters. Validation requires being within 100 meters.`));
          } else {
            resolve({ lat, lon, dist });
          }
        },
        (err) => {
          const codeMap = {
            1: 'PERMISSION_DENIED',
            2: 'POSITION_UNAVAILABLE',
            3: 'TIMEOUT',
          };
          console.warn(`Geolocation failed [${codeMap[err.code] || err.code}]: ${err.message}`);
          let msg = 'Failed to fetch location. Please enable location access services.';
          if (err.code === 1) {
            msg = 'Location access denied. Please allow location access in your browser settings to punch in.';
          } else if (err.code === 2) {
            msg = 'Location unavailable. Ensure your device GPS or network location is active.';
          } else if (err.code === 3) {
            msg = 'Location request timed out. Check your connection and try again.';
          }
          reject(new Error(msg));
        }
      );
    });
  };

  const startWebcam = async (currentMode = facingMode) => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    try {
      setVerifierLoading(true);
      setVerifierError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 300, facingMode: currentMode },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.warn("Video playback interrupted by stream update:", err);
        });
      }
      setVerifierLoading(false);
    } catch (err) {
      console.error(err);
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('Localhost detected: generating a mock canvas fallback image because camera is unavailable.');
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 300;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const grad = ctx.createLinearGradient(0, 0, 400, 300);
            grad.addColorStop(0, '#3b82f6');
            grad.addColorStop(1, '#1d4ed8');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 400, 300);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('MOCK WEBCAM FEED', 200, 130);
            ctx.font = '16px sans-serif';
            ctx.fillText('Local development camera fallback active', 200, 165);
            ctx.fillText(`Punch-in User: ${currentUser?.email || 'Admin'}`, 200, 195);

            const mockPhotoData = canvas.toDataURL('image/jpeg');
            setVerifierPhoto(mockPhotoData);
            setVerifierError('');
            setVerifierLoading(false);
            return;
          }
        } catch (canvasErr) {
          console.error("Failed to generate mock canvas photo:", canvasErr);
        }
      }
      setVerifierError('Camera access denied or unavailable. A live camera feed is required to punch in.');
      setVerifierLoading(false);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startWebcam(nextMode);
  };

  const stopWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL('image/jpeg');
    setVerifierPhoto(photoData);
    return photoData;
  };

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result;
      setVerifierPhoto(base64Data);
      stopWebcam();
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyAndPunch = async () => {
    setVerifierLoading(true);
    setVerifierError('');
    
    try {
      const photo = verifierPhoto || capturePhoto();
      if (!photo) {
        throw new Error('Could not capture photo. Ensure live camera is active or upload a photo file.');
      }

      let coords = null;
      if (verifierLocation) {
        coords = {
          lat: verifierLocation.lat,
          lon: verifierLocation.lon,
          distance: verifierDistance,
          locationName: closestLocation?.name || 'Office'
        };
      } else if (navigator.geolocation) {
        try {
          const pos = await getCoordinates(6000);
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          
          let minDistance = Infinity;
          let closestLocObj = null;
          officeLocations.forEach(loc => {
            const dist = getDistanceInMeters(lat, lon, loc.lat, loc.lon);
            if (dist < minDistance) {
              minDistance = dist;
              closestLocObj = loc;
            }
          });

          coords = { lat, lon, distance: minDistance, locationName: closestLocObj?.name || 'Office' };
          setVerifierLocation({ lat, lon });
          setVerifierDistance(minDistance);
          setClosestLocation(closestLocObj);
        } catch (e) {
          console.warn('Geolocation failed during webcam punch-in:', e);
        }
      }

      const result = await localClockIn(currentUser.id, {
        photo,
        coords: coords || { lat: 0, lon: 0, distance: 9999, locationName: 'Unknown' }
      });

      if (result.success) {
        stopWebcam();
        setVerifierStep('success');
      } else {
        setVerifierStep('failed');
      }
    } catch (err) {
      setVerifierError(err.message || 'Verification failed.');
    } finally {
      setVerifierLoading(false);
    }
  };

  const handleCloseVerifier = () => {
    stopWebcam();
    setShowVerifierModal(false);
  };

  // Clock Actions
  async function handleClockIn() {
    setShowVerifierModal(true);
    setVerifierStep('checking');
    setVerifierError('');
    setVerifierLocation(null);
    setVerifierDistance(null);
    setVerifierPhoto(null);
    setClosestLocation(null);
    stopWebcam();

    if (!navigator.geolocation) {
      setVerifierError('Geolocation is not supported by your browser.');
      setVerifierStep('failed');
      return;
    }

    getCoordinates(8000).then(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        let minDistance = Infinity;
        let closestLocObj = null;
        let isWithinGeofence = false;

        if (officeLocations && officeLocations.length > 0) {
          officeLocations.forEach(loc => {
            const dist = getDistanceInMeters(lat, lon, loc.lat, loc.lon);
            if (dist < minDistance) {
              minDistance = dist;
              closestLocObj = loc;
            }
            if (dist <= loc.radius) {
              isWithinGeofence = true;
            }
          });

          setVerifierLocation({ lat, lon });
          setVerifierDistance(minDistance);
          setClosestLocation(closestLocObj);

          if (isWithinGeofence) {
            localClockIn(currentUser.id, {
              photo: null,
              coords: { lat, lon, distance: minDistance, locationName: closestLocObj?.name || 'Office' }
            }).then(result => {
              if (result.success) {
                setVerifierStep('success');
              } else {
                setVerifierStep('failed');
              }
            });
          } else {
            setVerifierError(`You are outside the geofence boundary. Closest location: ${closestLocObj?.name || 'Office'} is ${minDistance.toFixed(1)}m away (limit is ${closestLocObj?.radius || 100}m).`);
            setVerifierStep('failed');
          }
        } else {
          localClockIn(currentUser.id, {
            photo: null,
            coords: { lat, lon, distance: 0, locationName: 'Remote/Direct' }
          }).then(result => {
            if (result.success) {
              setVerifierStep('success');
            } else {
              setVerifierStep('failed');
            }
          });
        }
      },
      (err) => {
        let msg = 'Failed to verify location.';
        if (err.code === 1) {
          msg = 'Location permission denied. Please allow location access in your browser settings to verify your coordinates.';
        } else if (err.code === 2) {
          msg = 'Location unavailable. GPS or network positioning is disabled or inactive on your device.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please check your network and GPS signal.';
        } else {
          msg = `Failed to fetch location: ${err.message}`;
        }
        setVerifierError(msg);
        setVerifierStep('failed');
        setClosestLocation(null);
      }
    );
  }
  const handleClockOut = () => localClockOut(currentUser.id);

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    return currentUser.permissions && currentUser.permissions.includes(permission);
  };

  const isStaffView = true;
  const isAdminView = hasPermission('attendance:admin');

  // Helper calculations for Schedules & Compliance
  const getEmpSchedule = (empDesignation) => {
    return schedules?.find(s => s.designation === empDesignation) || {
      shiftStart: "09:00",
      shiftEnd: "17:00"
    };
  };

  const isLateClockIn = (clockInIso, shiftStartStr) => {
    if (!clockInIso || !shiftStartStr) return false;
    const d = new Date(clockInIso);
    const inMinutes = d.getHours() * 60 + d.getMinutes();
    
    const [startH, startM] = shiftStartStr.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    
    return inMinutes > startMinutes;
  };

  const handleEditScheduleClick = (sch) => {
    setEditingSchedule(sch);
    setSchedShiftStart(sch.shiftStart || '09:00');
    setSchedShiftEnd(sch.shiftEnd || '17:00');
  };

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    if (!editingSchedule) return;

    localSaveSchedule({
      designation: editingSchedule.designation,
      shiftStart: schedShiftStart,
      shiftEnd: schedShiftEnd,
    });
    setEditingSchedule(null);
  };

  // Filter lists for active user
  const myLogs = attendanceLogs.filter(l => l.employeeId === currentUser.id);

  // 30-day sequential calendar generator
  const get30DayCalendar = () => {
    const days = [];
    for (let i = 0; i < 30; i++) {
      const dayNum = i + 1;
      const dateObj = new Date(selectedYear, selectedMonth, dayNum);
      const yearStr = dateObj.getFullYear();
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ dayNum, dateKey, weekday });
    }
    return days;
  };

  const formatClockTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  const filteredEmployeesForGrid = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(monthSearch.toLowerCase());
    const matchesDesignation = monthDesignation === 'All' || emp.designation === monthDesignation;
    return matchesSearch && matchesDesignation;
  });

  if (loading && !currentUser) {
    return (
      <PageWrapper title="Attendance Monitor & Logger">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '32px', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Syncing attendance configurations...</span>
        </div>
      </PageWrapper>
    );
  }

  if (!currentUser) return null;

  return (
    <PageWrapper title="Attendance Monitor & Logger">
      
      {errorMsg && (
        <div className="alert-box alert-box-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', marginBottom: '20px' }}>
          <WarningIcon size={16} style={{ color: 'var(--danger)' }} />
          <span style={{ fontSize: '0.88rem' }}>{errorMsg}</span>
        </div>
      )}

      <div className="attendance-layout-grid">
        
        {/* LEFT COLUMN: Punch Clock Actions for standard users */}
        {isStaffView && (
          <div className="panel action-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClockIcon size={20} style={{ color: 'var(--primary)' }} />
              <span>Shift Clock Punch</span>
            </h3>
            
            {/* Scheduled hours reminder */}
            {(() => {
              const sch = getEmpSchedule(currentUser.designation);
              return (
                <div className="shift-hours-details">
                  <span className="shift-hours-item">
                    <HolidaysIcon size={14} />
                    <strong>Shift:</strong> {sch.shiftStart} - {sch.shiftEnd}
                  </span>
                </div>
              );
            })()}

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '32px' }}>
              Submit clock actions to record shift duration live.
            </p>

            <div className="realtime-clock-display">
              <ClockIcon size={16} />
              <span>Live System Time:</span>
              <span className="clock-time-val">
                {formatLocalTime(currentTime) || 'Loading...'}
              </span>
            </div>

            {activeLog ? (
              <div className="status-timer-container">
                <div className="active-badge success">
                  Active Working Shift
                </div>
                
                <div className="timers-display">
                  <div className="timer-box">
                    <span className="lbl">Work Duration</span>
                    <span className="val">{formatTime(workSeconds)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="inactive-clock-panel" style={{ color: 'var(--text-light)' }}>
                <ClockIcon size={36} style={{ marginBottom: '8px', opacity: 0.7 }} />
                <h4>No Active Session</h4>
                <p>Register work hours by punching clock in.</p>
              </div>
            )}

            <div className="actions-button-grid">
              {!activeLog ? (
                <button 
                  className="btn btn-primary btn-lg" 
                  onClick={handleClockIn}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Clock In
                </button>
              ) : (
                <button className="btn btn-danger btn-lg" onClick={handleClockOut}>
                  Clock Out
                </button>
              )}
            </div>

            {/* Employee's Own Logs List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '56px', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <h4 style={{ margin: 0 }}>My Recent Punch History</h4>
              <input
                type="text"
                className="form-input"
                placeholder="Search history by date..."
                value={myAttendanceSearchQuery}
                onChange={(e) => setMyAttendanceSearchQuery(e.target.value)}
                style={{ width: '250px', padding: '6px 12px', fontSize: '0.85rem' }}
              />
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {myLogs.filter(log => !myAttendanceSearchQuery || log.date.includes(myAttendanceSearchQuery)).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="no-data-text" style={{ padding: '20px 0' }}>No logs recorded matching search.</td>
                    </tr>
                  ) : (
                    myLogs.filter(log => !myAttendanceSearchQuery || log.date.includes(myAttendanceSearchQuery)).map(log => (
                      <tr key={log.id}>
                        <td>{log.date}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {log.verificationPhoto && (
                              <button 
                                type="button"
                                title="View Punch-In Photo Verification" 
                                onClick={() => {
                                  setActivePhotoModal(log.verificationPhoto);
                                  setActivePhotoLocation(log.verificationLocation);
                                }}
                                style={{ 
                                  display: 'inline-flex', 
                                  color: 'var(--primary)', 
                                  cursor: 'pointer',
                                  background: 'none',
                                  border: 'none',
                                  padding: 0
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                  <circle cx="12" cy="13" r="4" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td>{log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="badge badge-success">Active</span>}</td>
                        <td>{log.clockOut ? formatTime(log.totalDuration) : 'Ticking...'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Admin Monitors & Monthly Punch Grid */}
        {isAdminView && (
          <div className="admin-view-wrapper">
            {/* Admin Tabs */}
            <div className="admin-tabs-container">
              <button 
                type="button"
                className={`tab-btn ${adminTab === 'realtime' ? 'active' : ''}`}
                onClick={() => setAdminTab('realtime')}
              >
                <EmployeesIcon size={16} />
                <span>Real-Time Board</span>
              </button>
              <button 
                type="button"
                className={`tab-btn ${adminTab === 'monthly' ? 'active' : ''}`}
                onClick={() => setAdminTab('monthly')}
              >
                <LeavesIcon size={16} />
                <span>Monthly Directory Grid</span>
              </button>
            </div>

            {adminTab === 'realtime' ? (
              <>
                <div className="panel admin-panel">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <EmployeesIcon size={20} style={{ color: 'var(--primary)' }} />
                    <span>Personnel Operations Punch Board</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Click any worker's name to view detailed logs, assigned tasks, or manually adjust times.
                  </p>

                  <div style={{ marginBottom: '24px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search employees by name or designation..."
                      value={realtimeSearchQuery}
                      onChange={(e) => setRealtimeSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Employee Name</th>
                          <th>Designation</th>
                          <th>Shift Status</th>
                          <th>Active Session Duration</th>
                          <th>Override Log Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees
                          .filter(emp => {
                            if (!realtimeSearchQuery) return true;
                            const term = realtimeSearchQuery.toLowerCase();
                            return emp.name.toLowerCase().includes(term) || (emp.designation && emp.designation.toLowerCase().includes(term));
                          })
                          .map(emp => {
                          const d = new Date();
                          const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          const activeShift = attendanceLogs.find(l => l.employeeId === emp.id && l.date === today && !l.clockOut);
                          const isWorking = !!activeShift;

                          const empSch = getEmpSchedule(emp.designation);
                          const todaysLogs = attendanceLogs.filter(l => l.employeeId === emp.id && l.date === today);
                          
                          const hasLateCheckIn = todaysLogs.some(l => isLateClockIn(l.clockIn, empSch.shiftStart));

                          return (
                            <tr key={emp.id}>
                              <td>
                                <button
                                  className="link-btn-name"
                                  onClick={() => router.push(`/admin/employees/profile?id=${emp.id}`)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                  <div style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '700',
                                    fontSize: '0.7rem',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                  }}>
                                    {employeePhotos[emp.id] ? (
                                      <img src={employeePhotos[emp.id]} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                                    ) : (
                                      emp.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                    )}
                                  </div>
                                  <strong>{emp.name}</strong>
                                </button>
                              </td>
                              <td><span className="badge badge-info">{emp.designation}</span></td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {isWorking ? (
                                    <span className="badge badge-success" style={{ width: 'fit-content' }}>Active Work</span>
                                  ) : (
                                    <span className="badge" style={{ backgroundColor: '#f0f4f8', color: 'var(--text-light)', border: '1px solid var(--border)', width: 'fit-content' }}>Inactive</span>
                                  )}
                                  
                                  {/* Compliance Badges */}
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {hasLateCheckIn && (
                                      <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <ClockIcon size={10} />
                                        <span>Late check-in</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                {isWorking ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>Ticking...</span>
                                    {activeShift.verificationPhoto && (
                                      <button 
                                        type="button"
                                        title="View Punch-In Photo Verification" 
                                        onClick={() => {
                                          setActivePhotoModal(activeShift.verificationPhoto);
                                          setActivePhotoLocation(activeShift.verificationLocation);
                                        }}
                                        style={{ 
                                          display: 'inline-flex', 
                                          color: 'var(--success)', 
                                          cursor: 'pointer',
                                          background: 'none',
                                          border: 'none',
                                          padding: 0
                                        }}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                          <circle cx="12" cy="13" r="4" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                ) : '—'}
                              </td>
                              <td>
                                <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/admin/employees/profile?id=${emp.id}`)}>
                                  Inspect / Override
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* operational Scheduler settings for administrators */}
                <div className="panel admin-panel" style={{ marginTop: '56px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BrandLogo size={20} style={{ color: 'var(--primary)' }} />
                    <span>Operational Shift & Break Scheduler</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Configure default work hours and maximum break durations per job designation.
                  </p>
                  
                  {editingSchedule ? (
                    <form onSubmit={handleSaveSchedule} className="adjust-log-form">
                      <h4 style={{ marginBottom: '24px' }}>Edit Schedule: {editingSchedule.designation}</h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Shift Start Time</label>
                          <input 
                            type="time" 
                            className="form-input" 
                            value={schedShiftStart} 
                            onChange={(e) => setSchedShiftStart(e.target.value)} 
                            required 
                          />
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Shift End Time</label>
                          <input 
                            type="time" 
                            className="form-input" 
                            value={schedShiftEnd} 
                            onChange={(e) => setSchedShiftEnd(e.target.value)} 
                            required 
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <button type="submit" className="btn btn-primary btn-sm">Save Schedule</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingSchedule(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Search designations..."
                          value={scheduleSearchQuery}
                          onChange={(e) => setScheduleSearchQuery(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div className="table-container">
                        <table className="data-table">
                        <thead>
                          <tr>
                            <th>Designation</th>
                            <th>Shift Hours</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedules
                            ?.filter(sch => !scheduleSearchQuery || sch.designation.toLowerCase().includes(scheduleSearchQuery.toLowerCase()))
                            .map(sch => (
                              <tr key={sch.designation}>
                              <td><strong>{sch.designation}</strong></td>
                              <td>{sch.shiftStart} - {sch.shiftEnd}</td>
                              <td>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleEditScheduleClick(sch)}>
                                  Edit Timing
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                  )}
                </div>
              </>
            ) : (
              <div className="panel admin-panel" style={{ width: '100%' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LeavesIcon size={20} style={{ color: 'var(--primary)' }} />
                  <span>Monthly Punch Directory Grid</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '32px' }}>
                  Track punch details of all employees grouped by month. Click an employee's name or any day cell to view customized logs.
                </p>

                {/* Filters */}
                <div className="filters-row">
                  <div className="filter-group search-emp">
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--primary-dark)' }}>Search Employee</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name..."
                        value={monthSearch}
                        onChange={(e) => setMonthSearch(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                      />
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', display: 'flex', alignItems: 'center' }}>
                        <SearchIcon size={16} />
                      </span>
                    </div>
                  </div>

                  <div className="filter-group">
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--primary-dark)' }}>Designation</label>
                    <select
                      className="form-input"
                      value={monthDesignation}
                      onChange={(e) => setMonthDesignation(e.target.value)}
                    >
                      <option value="All">All Designations</option>
                      {Array.from(new Set(employees.map(e => e.designation))).map(des => (
                        <option key={des} value={des}>{des}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group month-sel">
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--primary-dark)' }}>Month</label>
                    <select
                      className="form-input"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                      {[
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group year-sel">
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--primary-dark)' }}>Year</label>
                    <select
                      className="form-input"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                      {[2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group action-btn">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setMonthSearch('');
                        setMonthDesignation('All');
                        setSelectedMonth(new Date().getMonth());
                        setSelectedYear(new Date().getFullYear());
                      }}
                      style={{ height: '46px', width: '100%' }}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>

                {/* Horizontal Scroll Grid Table */}
                <div className="monthly-table-wrapper">
                  <table className="data-table monthly-grid-table">
                    <thead>
                      <tr>
                        <th className="sticky-col">Employee</th>
                        {get30DayCalendar().map(day => (
                          <th key={day.dayNum} className="monthly-cell">
                            <div style={{ fontSize: '0.8rem', fontWeight: '800' }}>Day {day.dayNum}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: '500', opacity: 0.7, textTransform: 'none' }}>{day.weekday}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployeesForGrid.length === 0 ? (
                        <tr>
                          <td colSpan={31} className="no-data-text" style={{ padding: '40px 0', textAlign: 'center' }}>
                            No employees matched the filters.
                          </td>
                        </tr>
                      ) : (
                        filteredEmployeesForGrid.map(emp => {
                          const calendarDays = get30DayCalendar();
                          return (
                            <tr key={emp.id}>
                              <td className="sticky-col">
                                <button
                                  type="button"
                                  className="link-btn-name"
                                  onClick={() => router.push(`/admin/employees/profile?id=${emp.id}`)}
                                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}
                                >
                                  <strong>{emp.name}</strong>
                                  <span className="badge badge-info" style={{ fontSize: '0.65rem', width: 'fit-content' }}>
                                    {emp.designation}
                                  </span>
                                </button>
                              </td>
                              {calendarDays.map(day => {
                                const dayLogs = attendanceLogs.filter(
                                  l => l.employeeId === emp.id && l.date === day.dateKey
                                );
                                
                                return (
                                  <td key={day.dayNum} className="monthly-cell" onClick={() => router.push(`/admin/employees/profile?id=${emp.id}`)}>
                                    {dayLogs.length === 0 ? (
                                      <span className="absent-cell">—</span>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {dayLogs.map(log => (
                                          <div key={log.id} className="time-badge">
                                            <span className="time-in">↓ {formatClockTime(log.clockIn)}</span>
                                            {log.clockOut ? (
                                              <span className="time-out">↑ {formatClockTime(log.clockOut)}</span>
                                            ) : (
                                              <span className="time-out-active">Active</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Geofence Premises Coordinates Settings */}
                <div className="panel admin-panel" style={{ marginTop: '56px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BrandLogo size={20} style={{ color: 'var(--primary)' }} />
                    <span>Company Premises Geofence Settings</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    Corporate office premises currently active on the system. Shift punches within geofence boundaries bypass photo verification.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    {officeLocations?.map((loc) => (
                      <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <strong style={{ color: 'var(--text-main)' }}>{loc.name}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '4px', fontFamily: 'monospace' }}>
                            {loc.lat.toFixed(5)}° N, {loc.lon.toFixed(5)}° E
                          </div>
                        </div>
                        <span className="badge badge-info" style={{ height: 'fit-content' }}>
                          Radius: {loc.radius}m
                        </span>
                      </div>
                    ))}
                  </div>

                  {hasPermission('locations:manage') && (
                    <div>
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        onClick={() => router.push('/admin/locations')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <LocationIcon size={14} />
                        <span>Manage Office Locations Panel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <VerifierModal
        showVerifierModal={showVerifierModal}
        verifierStep={verifierStep}
        verifierLoading={verifierLoading}
        verifierError={verifierError}
        verifierLocation={verifierLocation}
        verifierDistance={verifierDistance}
        verifierPhoto={verifierPhoto}
        cameraStream={cameraStream}
        facingMode={facingMode}
        closestLocation={closestLocation}
        videoRef={videoRef}
        handleCloseVerifier={handleCloseVerifier}
        toggleFacingMode={toggleFacingMode}
        startWebcam={startWebcam}
        handlePhotoFileChange={handlePhotoFileChange}
        handleVerifyAndPunch={handleVerifyAndPunch}
      />

      <PhotoViewerModal
        activePhotoModal={activePhotoModal}
        setActivePhotoModal={setActivePhotoModal}
        activePhotoLocation={activePhotoLocation}
        setActivePhotoLocation={setActivePhotoLocation}
      />

      <style jsx>{`
        .verifier-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border);
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .attendance-layout-grid {
          display: flex;
          gap: 48px;
          flex-wrap: wrap;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 32px;
          background: var(--primary-light);
          padding: 24px;
          border-radius: var(--radius-md);
          border: 1px solid var(--primary-border);
          width: 100%;
        }

        .filter-group {
          flex: 1;
          min-width: 150px;
        }

        .filter-group.search-emp {
          min-width: 200px;
        }

        .filter-group.month-sel,
        .filter-group.year-sel {
          flex: 0.8;
          min-width: 100px;
        }

        .filter-group.action-btn {
          display: flex;
          align-items: flex-end;
        }

        .action-panel {
          flex: 1;
          min-width: 0;
          max-width: 100%;
          padding: 24px !important;
          box-sizing: border-box;
        }

        .admin-view-wrapper {
          flex: 1.5;
          min-width: 0;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .admin-panel {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          padding: 24px !important;
          box-sizing: border-box;
        }

        /* Secure verifier modal styles */
        .secure-verifier-modal {
          max-width: 420px !important;
          width: 95% !important;
          padding: 32px !important;
        }
        .camera-refresh-btn:hover {
          background-color: var(--primary) !important;
        }
        .camera-activation-btn:hover {
          transform: scale(1.05);
        }

        .panel h3 {
          margin-bottom: 24px;
        }

        /* Clock timers styling */
        .status-timer-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          margin: 40px 0;
        }

        .active-badge {
          font-weight: 700;
          font-size: 0.95rem;
          padding: 8px 18px;
          border-radius: var(--radius-full);
          text-align: center;
        }
        .active-badge.success {
          background-color: var(--success-light);
          color: var(--success);
          border: 1px solid var(--primary-border);
        }
        .active-badge.danger {
          background-color: var(--danger-light);
          color: var(--danger);
          border: 1px solid var(--border);
        }

        .timers-display {
          display: flex;
          gap: 32px;
          width: 100%;
          justify-content: center;
        }

        .timer-box {
          background: white;
          border: 2px solid var(--primary-border);
          border-radius: var(--radius-md);
          padding: 20px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 150px;
          animation: pulseActiveWork 2s infinite;
        }

        .timer-box.break {
          border-color: var(--danger);
          animation: pulseTimer 2s infinite;
        }

        .timer-box .lbl {
          font-size: 0.72rem;
          color: var(--text-light);
          text-transform: uppercase;
          font-weight: 600;
        }

        .timer-box .val {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-main);
          margin-top: 6px;
        }

        .inactive-clock-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 32px;
          border: 1.5px dashed var(--border);
          border-radius: var(--radius-md);
          margin: 40px 0;
          background-color: white;
          width: 100%;
        }

        .actions-button-grid {
          display: flex;
          gap: 20px;
          width: 100%;
          justify-content: center;
        }

        .btn-lg {
          padding: 16px 36px;
          font-size: 1.05rem;
        }

        .link-btn-name {
          background: none;
          border: none;
          color: var(--primary);
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 0.92rem;
          padding: 0;
          text-align: left;
        }
        .link-btn-name:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }



        .shift-hours-details {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-bottom: 28px;
          background: var(--primary-light);
          padding: 16px 24px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--primary-border);
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
        }

        .shift-hours-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .shift-hours-separator {
          color: var(--primary-border);
        }

        .realtime-clock-display {
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          color: var(--primary);
          padding: 12px 24px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-sm);
          flex-wrap: wrap;
        }

        .clock-time-val {
          font-family: monospace;
          letter-spacing: 0.05em;
        }

        /* Monthly grid styles */
        .admin-tabs-container {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          border-bottom: 1.5px solid var(--border);
          padding-bottom: 16px;
          width: 100%;
        }

        .tab-btn {
          background: transparent;
          color: var(--text-muted);
          border: 1px solid transparent;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.95rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
        }

        .tab-btn:hover {
          color: var(--primary);
          background-color: var(--primary-light);
        }

        .tab-btn.active {
          background-color: var(--primary-light);
          color: var(--primary-dark);
          border-color: var(--primary-border);
        }

        .monthly-table-wrapper {
          overflow-x: auto;
          max-width: 100%;
          position: relative;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }

        .monthly-grid-table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
        }

        .monthly-grid-table th,
        .monthly-grid-table td {
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }

        .monthly-grid-table th:last-child,
        .monthly-grid-table td:last-child {
          border-right: none;
        }

        .monthly-grid-table tr:last-child td {
          border-bottom: none;
        }

        .sticky-col {
          position: sticky;
          left: 0;
          background: white;
          z-index: 10;
          box-shadow: 4px 0 10px rgba(0, 0, 0, 0.04);
          border-right: 1px solid var(--border);
          min-width: 180px;
        }

        th.sticky-col {
          background: var(--primary-light) !important;
          z-index: 11;
          color: var(--primary-dark);
        }

        tr:hover td.sticky-col {
          background: #f8fafc;
        }

        .monthly-cell {
          min-width: 115px;
          text-align: center;
          font-size: 0.8rem;
          padding: 12px 8px !important;
          vertical-align: middle;
        }

        .time-badge {
          background: var(--primary-light);
          border: 1px solid var(--primary-border);
          border-radius: var(--radius-sm);
          padding: 6px;
          display: inline-flex;
          flex-direction: column;
          gap: 3px;
          width: 100%;
          color: var(--primary-dark);
          font-weight: 500;
          font-family: monospace;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }

        .time-badge:hover {
          background: rgba(37, 99, 235, 0.12);
          transform: translateY(-1px);
        }

        .time-in {
          color: var(--success);
        }

        .time-out {
          color: var(--primary);
        }

        .time-out-active {
          background-color: var(--success-light);
          color: var(--success);
          border-radius: var(--radius-sm);
          padding: 1px 4px;
          font-size: 0.7rem;
          font-weight: bold;
          text-align: center;
        }

        .absent-cell {
          color: var(--text-light);
          opacity: 0.45;
          font-weight: normal;
        }

        /* Overlay modal specific classes */
        .modal-close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-light);
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: var(--radius-sm);
        }
        .modal-close-btn:hover {
          color: var(--text-main);
          background-color: var(--primary-light);
        }

        .modal-profile-header {
          margin-bottom: 24px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border);
        }

        .details-panel-box {
          background-color: var(--bg-app);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 0.88rem;
        }

        .modal-task-scroll,
        .modal-logs-scroll {
          max-height: 220px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          background-color: white;
        }

        .modal-task-item {
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          background-color: var(--bg-app);
        }

        .modal-log-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 10px;
          border-bottom: 1px solid var(--border);
          font-size: 0.85rem;
        }

        .modal-log-item:last-child {
          border-bottom: none;
        }

        .adjust-log-form {
          border: 1px solid var(--primary-border);
          border-radius: var(--radius-md);
          padding: 24px;
          background-color: var(--primary-light);
          animation: fadeIn 0.2s ease;
        }
        .adjust-log-form .form-group {
          margin-bottom: 20px;
        }
        .adjust-log-form h5 {
          margin-bottom: 18px;
        }
        .form-actions-row {
          margin-top: 24px;
        }

        .modal-no-data {
          font-size: 0.82rem;
          color: var(--text-light);
          text-align: center;
          padding: 16px 0;
        }

        @media (max-width: 768px) {
          .attendance-layout-grid {
            gap: 20px;
          }
          .action-panel, .admin-panel, .admin-view-wrapper {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            flex: 1 1 100% !important;
            box-sizing: border-box !important;
          }
          .action-panel, .admin-panel {
            padding: 20px !important;
          }
          .monthly-table-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: auto !important;
          }
          .timers-display {
            flex-direction: column;
            gap: 16px;
            align-items: center;
          }
          .timer-box {
            width: 100%;
            min-width: 0;
            padding: 16px 20px;
          }
          .actions-button-grid {
            flex-direction: column;
            gap: 12px;
          }
          .actions-button-grid button {
            width: 100% !important;
          }
          .btn-lg {
            width: 100%;
            padding: 12px 24px;
          }
          .admin-tabs-container {
            margin-bottom: 20px;
            gap: 8px;
            flex-wrap: wrap;
          }
          .tab-btn {
            width: 100%;
            justify-content: center;
            padding: 8px 16px;
          }
          .shift-hours-details {
            padding: 12px 16px !important;
            gap: 10px !important;
            margin-bottom: 20px !important;
          }
          .shift-hours-separator {
            display: none !important;
          }
          .realtime-clock-display {
            padding: 10px 16px !important;
            font-size: 0.82rem !important;
            gap: 8px !important;
            margin-bottom: 20px !important;
          }
          .data-table th,
          .data-table td {
            padding: 10px 12px !important;
            font-size: 0.8rem !important;
          }
          .secure-verifier-modal {
            padding: 20px 16px !important;
          }
          .filters-row {
            padding: 16px !important;
            gap: 12px !important;
          }
          .filter-group {
            min-width: 100% !important;
            flex: 1 1 100% !important;
          }
          .filter-group.month-sel,
          .filter-group.year-sel {
            flex: 1 1 100% !important;
            min-width: 100% !important;
          }
        }

        @media (max-width: 350px) {
          .action-panel, .admin-panel {
            padding: 12px !important;
          }
          .data-table th,
          .data-table td {
            padding: 8px 6px !important;
            font-size: 0.72rem !important;
          }
          .secure-verifier-modal {
            padding: 12px 10px !important;
          }
          .realtime-clock-display {
            padding: 8px 10px !important;
            font-size: 0.78rem !important;
          }
          .shift-hours-details {
            padding: 10px 12px !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </PageWrapper>
  );
}

export default AttendanceContent;
