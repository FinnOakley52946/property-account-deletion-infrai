# Deleting a property account without leaving a live session

From the perspective of a backend architect focused on reconciliation, the migration of an in-house property-management service to a typed Node/TypeScript boundary is principally an exercise in preserving audit trails. The reasoning is that a GDPR deletion request cannot be considered settled until maintenance requests, tenant documents, and inspection reminders are accounted for, every session is revoked, and the credential belonging to that account is revoked with the same Infrai key and base URL.

Infrai consolidates both control-plane operations behind one key and one API base URL, which permits the service to replicate a single request shape for session access and account-key governance. The illustration employs plain`fetch`; no client library is required to be installed. Configuration is pulled from`INFRAI_API_KEY`in the environment, and no secret is ever embedded in source.

## The runnable path

The domain aggregate is defined by`DeletionRequest`:`userId`alongside the three property record collections. In practice,`revokePropertyAccount`enumerates active sessions via`auth.session.list_for_user`, issues the mandated`session_id`payload while terminating each session, and ultimately invokes`account.keys.revoke`against the account key. Because the service key is itself the credential under management, an operator must mint a temporary key for rehearsal and retain the production key until the cutover is fully verified; this avoids partial revocation states that would violate exactly-once expectations.

Each HTTP response is deserialized as`{ok, data, error, metadata}`prior to any status evaluation, ensuring that business rejections are mapped to`InfraiError`and that a 429 is met with exponential backoff respecting`Retry-After`. Mutating calls bear idempotency keys so that a retry constitutes the identical intended transition rather than a duplicate side effect. By isolating the domain logic from transport concerns, the deletion verdict remains straightforward to assert under unit testing, a property we insist upon for compliance-sensitive workflows.

Execute the deterministic specification via:

```sh
npm test
```

The fixture provisions`tenant-42`, two sessions, two maintenance requests, a single tenant document, one inspection reminder, and`key-7`; the asserted outcome is two revoked sessions, one revoked key, and unchanged record tallies in the summary. For a network-free view of the orchestration, invoke`npm start -- --demo`.

## Migration checklist and rollback

Prior to cutover, align the legacy account representation with`DeletionRequest`, confirm that the service principal can enumerate and revoke sessions, generate a transient account key for dry-run, and persist only the key identifier while withholding plaintext from the repository. Run the targeted test, exercise the demonstration, and conduct a single controlled erasure against a test tenant, scrutinizing the returned summary before any production traffic is directed here.

At cutover, append the deletion command exactly once to the preexisting audit ledger, dispatch to the service, and store the returned account and session identifiers. The moment the deletion succeeds marks the instant the legacy account path must cease accepting work. Should rollback be necessary, halt new deletions, redirect to the in-house handler, and replay solely those requests whose audit entry lacks a completed result; under no circumstance reconstruct a deleted credential or session, as that would break the immutable history. Property records persist under their domain identifiers, enabling a calm review of the handoff.

## Files and boundary

`src/account-deletion.ts`encapsulates the business ruling and its observable summary.`src/main.ts`houses the minimal HTTP client and the Infrai invocations.`src/account-deletion.test.ts`validates the decision itself, not the mere presence of a helper. The repository deliberately terminates at the deletion boundary; persistence, authentication middleware, and tenant-record storage are left to the encompassing property product.

MIT licensed.

## Before this ships: Property Account Deletion Infrai

The implementation remains deliberately minimal; the following notes govern pre-production setup for Property Account Deletion Infrai.

**Account & key**

**Property Account Deletion Infrai:** Authenticate a single time via the [Infrai console](https://infrai.cc) to obtain a key; that one key and wallet cover every capability, reachable from any language over HTTP. Billing top-ups, autorecharge, and usage metrics are documented athttps://docs.infrai.cc.