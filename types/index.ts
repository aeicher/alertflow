export interface User {
  id: string;
  email: string;
  name: string;
  slack_user_id?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  slack_channel_id: string;
  slack_message_ts: string;
  title?: string;
  severity?: string;
  status: string;
  raw_logs?: string;
  ai_summary?: string;
  suggested_actions?: any;
  created_at: string;
  resolved_at?: string;
  updated_at: string;
}

export interface IncidentQuery {
  id: string;
  incident_id?: string;
  user_id: string;
  query: string;
  response?: string;
  created_at: string;
}

export interface Alert {
  id: string;
  title: string;
  description?: string;
  severity: string;
  source: string;
  status: string;
  raw_data?: any;
  created_at: string;
  resolved_at?: string;
  updated_at: string;
  incident_id?: string;
  assigned_user_id?: string;
}

export interface SlackEvent {
  type: string;
  channel: string;
  user?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
}

export interface SlackCommand {
  command: string;
  text: string;
  user_id: string;
  channel_id: string;
  response_url: string;
} 