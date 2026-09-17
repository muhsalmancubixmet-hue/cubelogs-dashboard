import dynamic from 'next/dynamic';

// Use dynamic imports so they are only loaded when matched
const ModuleRegistry = {
  attendance: dynamic(() => import('./modules/AttendanceModule')),
  project_management: dynamic(() => import('./modules/ProjectsModule')),
  payroll: dynamic(() => import('./modules/PayrollContent')),
};

export default ModuleRegistry;
