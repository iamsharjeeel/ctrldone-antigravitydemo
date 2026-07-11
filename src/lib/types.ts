export type OrgRole = "owner" | "admin" | "member";

export type Contact = {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  tags: string[];
  source: string | null;
  owner_id: string | null;
  timezone: string | null;
  custom_fields: Record<string, unknown>;
  score: number;
  created_at: string;
  updated_at: string;
};

export type Deal = {
  id: string;
  org_id: string;
  pipeline_id: string;
  stage_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  currency: string;
  expected_close: string | null;
  owner_id: string | null;
  stage_entered_at: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  org_id: string;
  title: string;
  due_at: string | null;
  assignee_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  status: "open" | "done" | "cancelled";
  created_at: string;
  updated_at: string;
};

export type Campaign = {
  id: string;
  org_id: string;
  name: string;
  status: "draft" | "active" | "paused" | "archived";
  email_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignStep = {
  id: string;
  org_id: string;
  campaign_id: string;
  type: "email" | "sms" | "wait" | "condition";
  config: Record<string, unknown>;
  position: number;
  next_step_id: string | null;
  canvas_x: number;
  canvas_y: number;
};

export type EmailAccount = {
  id: string;
  org_id: string;
  provider: "google" | "microsoft";
  from_email: string;
  status: "connected" | "disconnected" | "needs_reauth";
};
