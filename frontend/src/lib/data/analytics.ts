import type { SafeAuditEvent, SavedChatRecord } from "@/lib/data/local-data";

export interface FindingRecord {
  id: string;
  requestId: string;
  summary: string;
  receivedAt: string;
  provider: string | null;
  modelId: string;
  policyAction: string;
  outputAction: string;
}

export interface AuditRecord {
  id: string;
  event: SafeAuditEvent;
  receivedAt: string;
  modelId: string;
}

export function deriveFindings(chats: SavedChatRecord[]): FindingRecord[] {
  return chats.flatMap((chat) => chat.safeFindings.map((summary, index) => ({
    id: `${chat.requestId}:${index}`,
    requestId: chat.requestId,
    summary,
    receivedAt: chat.receivedAt,
    provider: chat.provider,
    modelId: chat.modelId,
    policyAction: chat.policyAction,
    outputAction: chat.outputAction,
  }))).sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));
}

export function deriveAuditRecords(chats: SavedChatRecord[]): AuditRecord[] {
  return chats.flatMap((chat) => chat.auditEvent ? [{
    id: chat.requestId,
    event: chat.auditEvent,
    receivedAt: chat.receivedAt,
    modelId: chat.modelId,
  }] : []).sort((left, right) => right.event.timestamp.localeCompare(left.event.timestamp));
}

export function deriveChatMetrics(chats: SavedChatRecord[]) {
  const policies = new Map<string, number>();
  const outputs = new Map<string, number>();
  for (const chat of chats) {
    policies.set(chat.policyAction, (policies.get(chat.policyAction) ?? 0) + 1);
    outputs.set(chat.outputAction, (outputs.get(chat.outputAction) ?? 0) + 1);
  }
  return {
    responses: chats.length,
    conversations: new Set(chats.map((chat) => chat.conversationId)).size,
    auditEvents: chats.filter((chat) => chat.auditEvent !== null).length,
    safeFindings: chats.reduce((total, chat) => total + chat.safeFindings.length, 0),
    policyActions: [...policies.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => a.label.localeCompare(b.label)),
    outputActions: [...outputs.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export interface DailyActivity {
  key: string;
  label: string;
  count: number;
}

export function deriveDailyActivity(chats: SavedChatRecord[], now: Date): DailyActivity[] {
  const days: DailyActivity[] = [];
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const count = chats.filter((chat) => {
      const submitted = new Date(chat.submittedAt);
      return submitted.getFullYear() === date.getFullYear()
        && submitted.getMonth() === date.getMonth()
        && submitted.getDate() === date.getDate();
    }).length;
    days.push({ key, label: formatter.format(date), count });
  }
  return days;
}
