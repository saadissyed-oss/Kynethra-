export interface NotifyPayload {
  agent_id: string;
  agent_name?: string;
  action_type: string;
  payload: string;
  decision: string;
  guardrail_hit?: string;
  risk_score?: number;
  blast_radius?: string;
  reason?: string;
  decision_id: string;
  latency_ms: number;
}

export async function sendSlackNotification(data: NotifyPayload) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[Notify] SLACK_WEBHOOK_URL not set — skipping notification");
    return;
  }

  const blastColor = {
    none: "#10B981",
    limited: "#F59E0B",
    significant: "#EF4444",
    catastrophic: "#7C3AED",
  }[data.blast_radius || "none"] || "#F59E0B";

  const message = {
    text: `🚨 *Kynethra HOLD* — Action requires human review`,
    attachments: [
      {
        color: blastColor,
        blocks: [
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Decision*\n\`HOLD\`` },
              { type: "mrkdwn", text: `*Action Type*\n${data.action_type.toUpperCase()}` },
              { type: "mrkdwn", text: `*Guardrail*\n${data.guardrail_hit || "LLM eval"}` },
              { type: "mrkdwn", text: `*Blast Radius*\n${data.blast_radius || "unknown"}` },
              { type: "mrkdwn", text: `*Risk Score*\n${data.risk_score ?? "pending"}` },
              { type: "mrkdwn", text: `*Latency*\n${data.latency_ms}ms` },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Payload*\n\`\`\`${data.payload.slice(0, 300)}\`\`\``,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Reason*\n${data.reason || "Flagged for human review"}`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Review in Dashboard" },
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/approvals`,
                style: "primary",
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      console.error("[Notify] Slack webhook failed:", res.status);
    } else {
      console.log("[Notify] Slack notification sent");
    }
  } catch (err) {
    console.error("[Notify] Failed to send Slack notification:", err);
  }
}