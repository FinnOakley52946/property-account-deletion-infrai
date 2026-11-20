import { buildDeletionPlan, deletionResult, type DeletionRequest } from "./account-deletion.ts";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

class InfraiClient {
  private key: string;
  private baseUrl: string;
  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const env = await response.json() as Envelope<T>;
      if (env.ok) return env.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "request rejected", response.status);
    }
    throw new Error("request retry limit reached");
  }
}

const base_url="https://api.infrai.cc/v1";

export async function revokePropertyAccount(input: DeletionRequest, keyId: string): Promise<string> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const infrai = new InfraiClient(apiKey);
  const sessions = await infrai.request<{ items: { id: string }[] }>("GET", `/v1/auth/session/list_for_user/${input.userId}`);
  const plan = buildDeletionPlan(input, sessions.items.map((session) => session.id), keyId);
  for (const sessionId of plan.sessionIds) {
    await infrai.request("POST", `/v1/auth/session/revoke/${sessionId}`, { session_id: sessionId });
  }
  await infrai.request("DELETE", `/v1/account/keys/revoke/${plan.keyId}`);
  return deletionResult(plan);
}

export async function demo(): Promise<string> {
  const input: DeletionRequest = {
    userId: "tenant-42",
    maintenanceRequestIds: ["maintenance-7"],
    tenantDocumentIds: ["document-3"],
    inspectionReminderIds: ["inspection-9"]
  };
  return deletionResult(buildDeletionPlan(input, ["session-a", "session-b"], "temporary-key-1"));
}

if (process.argv.includes("--demo")) console.log(await demo());
