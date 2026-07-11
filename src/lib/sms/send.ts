import { decryptSecret } from "@/lib/crypto";

export type SmsAccount = {
  id: string;
  org_id: string;
  provider: "twilio";
  account_sid: string;
  auth_token_encrypted: string;
  from_number: string;
};

export async function sendViaSmsAccount(opts: {
  account: SmsAccount;
  to: string;
  body: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  try {
    const token = decryptSecret(opts.account.auth_token_encrypted);
    const sid = opts.account.account_sid;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: opts.to,
          From: opts.account.from_number,
          Body: opts.body,
        }),
      }
    );
    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    const json = await res.json();
    return { ok: true, id: json.sid as string };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "sms_send_failed",
    };
  }
}
