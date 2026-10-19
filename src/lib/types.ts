export type Frequency = "daily" | "weekly" | "monthly";
export type LogStatus = "done" | "frozen";

export interface Profile {
  id: string;
  display_name: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  color: string;
  frequency: Frequency;
  /** Dni tygodnia dla nawyku dziennego (0 = niedziela … 6 = sobota); null = codziennie. */
  days: number[] | null;
  position: number;
  start_date: string;
  created_at: string;
}

export interface HabitLog {
  habit_id: string;
  date: string;
  status: LogStatus;
}

export interface Task {
  id: string;
  user_id: string;
  date: string;
  title: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface Mindset {
  date: string;
  energy: number | null;
  focus: number | null;
  motivation: number | null;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export type GoalStatus = "in_progress" | "achieved";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  area: string;
  deadline: string | null;
  progress: number;
  status: GoalStatus;
  pinned: boolean;
  milestones: Milestone[];
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
}

export interface TeamTask {
  id: string;
  workspace_id: string;
  created_by: string | null;
  assignee: string | null;
  /** null = backlog (bez terminu) */
  date: string | null;
  title: string;
  notes: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface DayStat {
  day: string;
  total: number;
  done: number;
}
