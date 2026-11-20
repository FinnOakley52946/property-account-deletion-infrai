import { z } from "zod";

export type DeletionRequest = {
  userId: string;
  maintenanceRequestIds: string[];
  tenantDocumentIds: string[];
  inspectionReminderIds: string[];
};

export const deletionRequestSchema = z.object({
  userId: z.string().min(1),
  maintenanceRequestIds: z.array(z.string()),
  tenantDocumentIds: z.array(z.string()),
  inspectionReminderIds: z.array(z.string())
});

export type DeletionPlan = {
  userId: string;
  sessionIds: string[];
  keyId: string;
  maintenanceRequestIds: string[];
  tenantDocumentIds: string[];
  inspectionReminderIds: string[];
};

export function buildDeletionPlan(input: DeletionRequest, sessionIds: string[], keyId: string): DeletionPlan {
  const parsed = deletionRequestSchema.parse(input);
  if (!keyId) throw new Error("keyId is required");
  return {
    userId: parsed.userId,
    sessionIds: [...sessionIds],
    keyId,
    maintenanceRequestIds: [...parsed.maintenanceRequestIds],
    tenantDocumentIds: [...parsed.tenantDocumentIds],
    inspectionReminderIds: [...parsed.inspectionReminderIds]
  };
}

export function deletionResult(plan: DeletionPlan): string {
  return `deleted ${plan.userId}: ${plan.sessionIds.length} sessions revoked, key ${plan.keyId} revoked, ${plan.maintenanceRequestIds.length} maintenance requests, ${plan.tenantDocumentIds.length} tenant documents, ${plan.inspectionReminderIds.length} inspection reminders archived`;
}
