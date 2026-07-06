import dynamic from 'next/dynamic';

// Use dynamic imports so they are only loaded when matched
const ModuleRegistry = {
  attendance: dynamic(() => import('./modules/AttendanceModule')),
  tasks: dynamic(() => import('./modules/TasksModule')),
};

export default ModuleRegistry;
