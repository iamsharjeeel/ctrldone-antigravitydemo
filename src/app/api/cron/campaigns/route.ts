import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addWait } from "@/lib/timezone";
import { applyMergeTags, sendViaAccount } from "@/lib/email/send";
import { sendViaSmsAccount } from "@/lib/sms/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: due } = await admin
    .from("campaign_enrollments")
    .select("id")
    .in("status", ["pending", "waiting"])
    .lte("next_run_at", now)
    .limit(50);

  let processed = 0;

  for (const row of due || []) {
    const { data: claimed } = await admin.rpc("claim_enrollment", {
      p_id: row.id,
    });
    if (!claimed) continue;

    const enrollment = claimed as {
      id: string;
      org_id: string;
      campaign_id: string;
      contact_id: string;
      current_step_id: string | null;
    };

    const { data: campaign } = await admin
      .from("campaigns")
      .select("*")
      .eq("id", enrollment.campaign_id)
      .single();
    if (!campaign || campaign.status !== "active") {
      await admin
        .from("campaign_enrollments")
        .update({ status: "waiting", locked_at: null })
        .eq("id", enrollment.id);
      continue;
    }

    const { data: org } = await admin
      .from("orgs")
      .select("*")
      .eq("id", enrollment.org_id)
      .single();
    const { data: contact } = await admin
      .from("contacts")
      .select("*")
      .eq("id", enrollment.contact_id)
      .single();
    if (!org || !contact) continue;

    const stepId = enrollment.current_step_id;
    if (!stepId) {
      await admin
        .from("campaign_enrollments")
        .update({ status: "completed", locked_at: null })
        .eq("id", enrollment.id);
      continue;
    }

    const { data: step } = await admin
      .from("campaign_steps")
      .select("*")
      .eq("id", stepId)
      .single();
    if (!step) {
      await admin
        .from("campaign_enrollments")
        .update({ status: "failed", locked_at: null })
        .eq("id", enrollment.id);
      continue;
    }

    if (step.type === "wait") {
      const next = addWait(
        new Date(),
        step.config as { duration_hours?: number; until?: string },
        org,
        contact.timezone
      );
      await admin
        .from("campaign_enrollments")
        .update({
          status: "waiting",
          current_step_id: step.next_step_id,
          next_run_at: next.toISOString(),
          locked_at: null,
        })
        .eq("id", enrollment.id);
      processed++;
      continue;
    }

    if (step.type === "email") {
      if (contact.email) {
        const { data: suppressed } = await admin
          .from("suppression_list")
          .select("id")
          .eq("org_id", enrollment.org_id)
          .ilike("email", contact.email)
          .maybeSingle();
        if (suppressed) {
          await admin
            .from("campaign_enrollments")
            .update({ status: "exited", locked_at: null })
            .eq("id", enrollment.id);
          continue;
        }
      }

      const { data: account } = await admin
        .from("email_accounts")
        .select("*")
        .eq("id", campaign.email_account_id)
        .single();

      if (!account || !contact.email) {
        await admin
          .from("campaign_enrollments")
          .update({ status: "failed", locked_at: null })
          .eq("id", enrollment.id);
        continue;
      }

      const { error: insertErr } = await admin.from("campaign_sends").insert({
        org_id: enrollment.org_id,
        enrollment_id: enrollment.id,
        step_id: step.id,
        status: "sending",
      });
      if (insertErr) {
        await admin
          .from("campaign_enrollments")
          .update({
            status: "pending",
            current_step_id: step.next_step_id,
            next_run_at: now,
            locked_at: null,
          })
          .eq("id", enrollment.id);
        continue;
      }

      const result = await sendViaAccount({
        account,
        to: contact.email,
        subject: applyMergeTags(String(step.config.subject || ""), contact),
        body: applyMergeTags(String(step.config.body || ""), contact),
      });

      if (!result.ok) {
        await admin
          .from("campaign_sends")
          .update({ status: "failed", error: result.error })
          .eq("enrollment_id", enrollment.id)
          .eq("step_id", step.id);
        await admin
          .from("campaign_enrollments")
          .update({
            status: result.reauth ? "waiting" : "failed",
            locked_at: null,
          })
          .eq("id", enrollment.id);
        continue;
      }

      await admin
        .from("campaign_sends")
        .update({
          status: "sent",
          provider_message_id: result.id ? result.id.toLowerCase() : null,
          provider_thread_id: result.threadId || null,
        })
        .eq("enrollment_id", enrollment.id)
        .eq("step_id", step.id);

      await admin.from("activities").insert({
        org_id: enrollment.org_id,
        contact_id: contact.id,
        type: "email_sent",
        body: String(step.config.subject || "Campaign email"),
        meta: { campaign_id: campaign.id, step_id: step.id },
      });

      const done = !step.next_step_id;
      await admin
        .from("campaign_enrollments")
        .update({
          status: done ? "completed" : "pending",
          current_step_id: step.next_step_id,
          next_run_at: done ? null : now,
          locked_at: null,
        })
        .eq("id", enrollment.id);
      processed++;
      continue;
    }

    if (step.type === "sms") {
      if (!contact.phone) {
        await admin.from("campaign_sends").insert({
          org_id: enrollment.org_id,
          enrollment_id: enrollment.id,
          step_id: step.id,
          status: "failed",
          error: "missing_phone",
        });
        await admin
          .from("campaign_enrollments")
          .update({ status: "failed", locked_at: null })
          .eq("id", enrollment.id);
        continue;
      }

      if (contact.email) {
        const { data: suppressed } = await admin
          .from("suppression_list")
          .select("id")
          .eq("org_id", enrollment.org_id)
          .ilike("email", contact.email)
          .maybeSingle();
        if (suppressed) {
          await admin
            .from("campaign_enrollments")
            .update({ status: "exited", locked_at: null })
            .eq("id", enrollment.id);
          continue;
        }
      }

      const { data: smsAccount } = await admin
        .from("sms_accounts")
        .select("*")
        .eq("org_id", enrollment.org_id)
        .limit(1)
        .maybeSingle();

      if (!smsAccount) {
        await admin.from("campaign_sends").insert({
          org_id: enrollment.org_id,
          enrollment_id: enrollment.id,
          step_id: step.id,
          status: "failed",
          error: "no_sms_account",
        });
        await admin
          .from("campaign_enrollments")
          .update({ status: "failed", locked_at: null })
          .eq("id", enrollment.id);
        continue;
      }

      const { error: smsInsertErr } = await admin.from("campaign_sends").insert({
        org_id: enrollment.org_id,
        enrollment_id: enrollment.id,
        step_id: step.id,
        status: "sending",
      });
      if (smsInsertErr) {
        await admin
          .from("campaign_enrollments")
          .update({
            status: "pending",
            current_step_id: step.next_step_id,
            next_run_at: now,
            locked_at: null,
          })
          .eq("id", enrollment.id);
        continue;
      }

      const smsResult = await sendViaSmsAccount({
        account: smsAccount,
        to: contact.phone,
        body: applyMergeTags(String(step.config.body || ""), contact),
      });

      if (!smsResult.ok) {
        await admin
          .from("campaign_sends")
          .update({ status: "failed", error: smsResult.error })
          .eq("enrollment_id", enrollment.id)
          .eq("step_id", step.id);
        await admin
          .from("campaign_enrollments")
          .update({ status: "failed", locked_at: null })
          .eq("id", enrollment.id);
        continue;
      }

      await admin
        .from("campaign_sends")
        .update({ status: "sent", provider_message_id: smsResult.id || null })
        .eq("enrollment_id", enrollment.id)
        .eq("step_id", step.id);

      await admin.from("activities").insert({
        org_id: enrollment.org_id,
        contact_id: contact.id,
        type: "note",
        body: "Campaign SMS sent",
        meta: { campaign_id: campaign.id, step_id: step.id, channel: "sms" },
      });

      const smsDone = !step.next_step_id;
      await admin
        .from("campaign_enrollments")
        .update({
          status: smsDone ? "completed" : "pending",
          current_step_id: step.next_step_id,
          next_run_at: smsDone ? null : now,
          locked_at: null,
        })
        .eq("id", enrollment.id);
      processed++;
      continue;
    }

    if (step.type === "condition") {
      await admin
        .from("campaign_enrollments")
        .update({
          status: step.next_step_id ? "pending" : "completed",
          current_step_id: step.next_step_id,
          next_run_at: now,
          locked_at: null,
        })
        .eq("id", enrollment.id);
      processed++;
    }
  }

  return NextResponse.json({ ok: true, processed });
}
