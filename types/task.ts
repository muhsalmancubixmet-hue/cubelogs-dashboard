export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  due_date?: string;
}
