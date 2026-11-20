import assert from "node:assert/strict";
import { buildDeletionPlan, deletionResult } from "./account-deletion.ts";

const plan = buildDeletionPlan(
  { userId: "tenant-42", maintenanceRequestIds: ["m1", "m2"], tenantDocumentIds: ["d1"], inspectionReminderIds: ["i1"] },
  ["s1", "s2"],
  "key-7"
);
assert.deepEqual(plan.sessionIds, ["s1", "s2"]);
assert.equal(deletionResult(plan), "deleted tenant-42: 2 sessions revoked, key key-7 revoked, 2 maintenance requests, 1 tenant documents, 1 inspection reminders archived");
console.log("account deletion decision test passed");
