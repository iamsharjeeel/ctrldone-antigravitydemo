import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";

export type AutomationContext = {
  orgId: string;
  triggerType: "deal_stage_changed" | "task_completed" | "contact_created";
  stageName?: string | null;
  stageId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  ownerId?: string | null;
  contactTags?: string[] | null;
};

type AutomationRule = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
};

function stageMatches(
  config: Record<string, unknown>,
  stageName?: string | null,
  stageId?: string | null
) {
  const wantName = typeof config.stage_name === "string" ? config.stage_name : null;
  const wantId = typeof config.stage_id === "string" ? config.stage_id : null;
  if (wantId && stageId && wantId === stageId) return true;
  if (wantName && stageName && wantName.toLowerCase() === stageName.toLowerCase()) {
    return true;
  }
  if (!wantName && !wantId) return true;
  return false;
}

export async function evaluateAutomations(
  supabase: SupabaseClient,
  ctx: AutomationContext
) {
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("id, name, trigger_type, trigger_config, action_type, action_config")
    .eq("org_id", ctx.orgId)
    .eq("trigger_type", ctx.triggerType)
    .eq("enabled", true);

  for (const rule of (rules as AutomationRule[]) || []) {
    const trigger = rule.trigger_config || {};
    if (
      ctx.triggerType === "deal_stage_changed" &&
      !stageMatches(trigger, ctx.stageName, ctx.stageId)
    ) {
      continue;
    }

    const action = rule.action_config || {};

    if (rule.action_type === "create_task") {
      const title =
        (typeof action.title === "string" && action.title.trim()) ||
        `Follow up: ${rule.name}`;
      await supabase.from("tasks").insert({
        org_id: ctx.orgId,
        title,
        deal_id: ctx.dealId || null,
        contact_id: ctx.contactId || null,
        assignee_id: ctx.ownerId || null,
        status: "open",
        due_at: new Date().toISOString(),
      });
    }

    if (rule.action_type === "send_notification" && ctx.ownerId) {
      await createNotification(supabase, {
        orgId: ctx.orgId,
        userId: ctx.ownerId,
        type: "automation",
        title:
          (typeof action.title === "string" && action.title.trim()) || rule.name,
        body:
          (typeof action.body === "string" && action.body) ||
          `Automation: ${rule.name}`,
        link: ctx.dealId ? `/app/pipelines` : ctx.contactId ? `/app/contacts/${ctx.contactId}` : "/app/tasks",
      });
    }

    if (rule.action_type === "add_tag" && ctx.contactId) {
      const tag =
        typeof action.tag === "string" ? action.tag.trim().toLowerCase() : "";
      if (!tag) continue;
      const { data: contact } = await supabase
        .from("contacts")
        .select("tags")
        .eq("id", ctx.contactId)
        .maybeSingle();
      const tags = Array.from(
        new Set([...(contact?.tags || []), tag].filter(Boolean))
      );
      await supabase.from("contacts").update({ tags }).eq("id", ctx.contactId);
    }
  }
}
