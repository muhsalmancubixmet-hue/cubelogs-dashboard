import React from 'react';
import { useApp } from '../context/AppContext';

// Common base wrapper
const SvgBase = ({ size = 20, children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

export const DashboardIcon = (props) => (
  <SvgBase {...props}>
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </SvgBase>
);

export const TemplatesIcon = (props) => (
  <SvgBase {...props}>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </SvgBase>
);

export const EmployeesIcon = (props) => (
  <SvgBase {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </SvgBase>
);

export const AttendanceIcon = (props) => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </SvgBase>
);

export const TasksIcon = (props) => (
  <SvgBase {...props}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </SvgBase>
);

export const LeavesIcon = (props) => (
  <SvgBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </SvgBase>
);

export const HolidaysIcon = (props) => (
  <SvgBase {...props}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </SvgBase>
);

export const LogoutIcon = (props) => (
  <SvgBase {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </SvgBase>
);

export const PayrollIcon = (props) => (
  <SvgBase {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <circle cx="7" cy="15" r="1" />
  </SvgBase>
);

export const BrandLogo = ({ size = 20, style, ...props }) => {
  let customLogo = null;
  try {
    const context = useApp();
    if (context) {
      customLogo = context.brandLogo;
    }
  } catch (e) {
    // Graceful fallback during static render or outside Provider
  }

  // Fallback to localStorage directly disabled as per storage removal request

  if (customLogo) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- Dynamic custom logo data URL */
      <img
        src={customLogo}
        alt="Brand Logo"
        height={size}
        style={{ width: 'auto', maxHeight: size, objectFit: 'contain', borderRadius: '4px', ...style }}
        {...props}
      />
    );
  }

  return (
    <SvgBase size={size} style={style} {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </SvgBase>
  );
};

export const ChevronIcon = ({ direction = 'down', ...props }) => {
  const pointsMap = {
    down: "6 9 12 15 18 9",
    up: "18 15 12 9 6 15",
    right: "9 18 15 12 9 6",
    left: "15 18 9 12 15 6"
  };
  return (
    <SvgBase {...props}>
      <polyline points={pointsMap[direction]} />
    </SvgBase>
  );
};

export const EditIcon = (props) => (
  <SvgBase {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </SvgBase>
);

export const DeleteIcon = (props) => (
  <SvgBase {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </SvgBase>
);

export const AddIcon = (props) => (
  <SvgBase {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </SvgBase>
);

export const WarningIcon = (props) => (
  <SvgBase {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </SvgBase>
);

export const CheckIcon = (props) => (
  <SvgBase {...props}>
    <polyline points="20 6 9 17 4 12" />
  </SvgBase>
);

export const DeclineIcon = (props) => (
  <SvgBase {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </SvgBase>
);

export const ChangeIcon = (props) => (
  <SvgBase {...props}>
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </SvgBase>
);

export const BackIcon = (props) => (
  <SvgBase {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </SvgBase>
);

export const SearchIcon = (props) => (
  <SvgBase {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </SvgBase>
);

export const CloseIcon = (props) => (
  <SvgBase {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </SvgBase>
);

export const PhoneIcon = (props) => (
  <SvgBase {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </SvgBase>
);

export const MailIcon = (props) => (
  <SvgBase {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </SvgBase>
);

export const ShieldIcon = (props) => (
  <SvgBase {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </SvgBase>
);

export const MenuIcon = (props) => (
  <SvgBase {...props}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </SvgBase>
);

export const ClockIcon = (props) => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </SvgBase>
);

export const BreakIcon = (props) => (
  <SvgBase {...props}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </SvgBase>
);

export const LocationIcon = (props) => (
  <SvgBase {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </SvgBase>
);

export const CameraIcon = (props) => (
  <SvgBase {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </SvgBase>
);

export const AuditIcon = (props) => (
  <SvgBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </SvgBase>
);

export const EyeIcon = (props) => (
  <SvgBase {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </SvgBase>
);

export const EyeOffIcon = (props) => (
  <SvgBase {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </SvgBase>
);

export const UploadIcon = (props) => (
  <SvgBase {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </SvgBase>
);

export const ExcelIcon = (props) => (
  <SvgBase {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="12" x2="15" y2="18" />
    <line x1="15" y1="12" x2="9" y2="18" />
  </SvgBase>
);

export const CrownIcon = (props) => (
  <SvgBase {...props}>
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <circle cx="12" cy="18" r="1" />
  </SvgBase>
);

export const StarIcon = (props) => (
  <SvgBase {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </SvgBase>
);

export const BriefcaseIcon = (props) => (
  <SvgBase {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </SvgBase>
);

export const CalendarIcon = (props) => (
  <SvgBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </SvgBase>
);

export const TargetIcon = (props) => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </SvgBase>
);

export const BarChartIcon = (props) => (
  <SvgBase {...props}>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </SvgBase>
);

export const FlameIcon = (props) => (
  <SvgBase {...props}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
  </SvgBase>
);

export const ZapIcon = (props) => (
  <SvgBase {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </SvgBase>
);

export const ArrowRightIcon = (props) => (
  <SvgBase {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </SvgBase>
);

export const SprintIcon = (props) => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 15 15" />
  </SvgBase>
);

export const StoryIcon = (props) => (
  <SvgBase {...props}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </SvgBase>
);

export const BoardIcon = (props) => (
  <SvgBase {...props}>
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="10" y="3" width="5" height="12" rx="1" />
    <rect x="17" y="3" width="5" height="15" rx="1" />
  </SvgBase>
);

export const BacklogIcon = (props) => (
  <SvgBase {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </SvgBase>
);

export const EpicIcon = (props) => (
  <SvgBase {...props}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </SvgBase>
);

export const TaskCheckIcon = (props) => (
  <SvgBase {...props}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </SvgBase>
);

export const SubtaskIcon = (props) => (
  <SvgBase {...props}>
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M6 9h9a3 3 0 0 1 3 3v3" />
  </SvgBase>
);

export const RocketIcon = (props) => (
  <SvgBase {...props}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.79-1.81l-1.98-1.98s-1.1.08-1.81.79z" />
    <path d="M15 5s-6 2-8.5 4.5c-1.3 1.3-1.6 3.1-1.3 4.5l6.3 6.3c1.4.3 3.2 0 4.5-1.3C18.5 16.5 20.5 10.5 20.5 10.5L15 5z" />
    <circle cx="15" cy="9" r="1" />
  </SvgBase>
);

export const TrashIcon = DeleteIcon;

export const SettingsIcon = (props) => (
  <SvgBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </SvgBase>
);

export const DownloadIcon = (props) => (
  <SvgBase {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </SvgBase>
);

export const PlusIcon = (props) => (
  <SvgBase {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </SvgBase>
);

export const ActivityIcon = (props) => (
  <SvgBase {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </SvgBase>
);

export const FolderIcon = (props) => (
  <SvgBase {...props}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </SvgBase>
);

export const UserCheckIcon = (props) => (
  <SvgBase {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </SvgBase>
);

export const DollarIcon = (props) => (
  <SvgBase {...props}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </SvgBase>
);

export const ChevronLeftIcon = (props) => (
  <SvgBase {...props}>
    <polyline points="15 18 9 12 15 6" />
  </SvgBase>
);

export const ChevronRightIcon = (props) => (
  <SvgBase {...props}>
    <polyline points="9 18 15 12 9 6" />
  </SvgBase>
);

export const ReceiptIcon = (props) => (
  <SvgBase {...props}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="12" y2="14" />
  </SvgBase>
);




