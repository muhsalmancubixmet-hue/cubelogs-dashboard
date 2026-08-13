export interface ProjectMember {
  id: string | number;
  project: number;
  user: number;
  user_email: string;
  user_name: string;
  project_role: string;
  department?: string;
  is_active: boolean;
  joined_at: string;
}

export interface Project {
  id: number;
  company: number;
  name: string;
  description?: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed';
  start_date?: string;
  end_date?: string;
  progress: number;
  project_manager?: number;
  project_manager_name?: string;
  team_lead?: number;
  team_lead_name?: string;
  members_count?: number;
  stories_count?: number;
  members?: ProjectMember[];
  created_at: string;
  updated_at?: string;
}

export interface ProjectStory {
  id: number;
  project: number;
  project_name?: string;
  title: string;
  description?: string;
  department?: string;
  status: 'Todo' | 'In Progress' | 'Done';
  order: number;
  progress: number;
  tasks_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface ProjectTask {
  id: number;
  story: number;
  story_title?: string;
  project_id?: number;
  project_name?: string;
  title: string;
  description?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_to_email?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed';
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}
