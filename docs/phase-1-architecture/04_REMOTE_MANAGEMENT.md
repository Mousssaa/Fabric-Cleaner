# 04 — Controlled Remote Management Design (Deliverable 10)

> **[Design]** فقط. يستبدل نموذج Kudu Cloud (36 أمر، authenticated by API key فقط، بدون توقيع/nonce/expiry — [Verified] `cloud-agent.ts:1785-1830`، 0 نتائج لـ signature/nonce) بنموذج موقّع ومقيد.

## 1. المبادئ

1. **لا shell عشوائي.** لا نوع أمر يقبل command string أو script أو مسار تنفيذي. ممنوع على مستوى: schema (لا حقل حر)، الـ agent (allowlist ثابتة في الكود)، الـ broker (لا يقبل strings للتنفيذ)، والمراجعة (اختبار CI يفشل لو ظهر `exec`/`spawn` بمدخلات من payload الأمر).
2. **الجهاز هو صاحب القرار الأخير:** التحقق والتفويض والموافقة يتعادوا محلياً، حتى لو الـ cloud قال "approved".
3. **الأوامر الحساسة لا تتخطى حماية المستخدم المحلي أبداً** — نفس `ExecutionEngine`، نفس `ProtectedPathPolicy`، Trash-first، ونفس UAC/polkit.
4. **Personal: remote ops off افتراضياً.**

## 2. Command Allowlist (مغلقة، versioned)

| Command type | الفئة | Params المسموحة (typed) | موافقة محلية | Privilege | Personal | Enterprise |
|---|---|---|---|---|---|---|
| `health.collect` | read | `sections: enum[]` (disk, os, app_version, last_scan) | لا (إشعار في سجل النشاط) | user | ✅ لو مفعّل | ✅ |
| `inventory.software.collect` | read-sensitive | none | **مرة واحدة** (consent scope) أو policy+إفصاح | user | opt-in | policy |
| `posture.assess` | read | `checks: enum[]` | لا | user (بعض الـ checks → "needs-permission") | ✅ لو مفعّل | ✅ |
| `scan.start` | local action | `scanType: enum(quick, malware, cleaner-preview)` | لا (الـ scan غير مدمر) | user | ✅ | ✅ |
| `diagnostics.collect` | read-sensitive | `profile: enum(basic)`، redaction إلزامي | **دائماً** | user | ✅ بموافقة | ✅ بموافقة |
| `rules.update` | content | `bundleType: enum`، `version`، `bundleRef` (يُحمّل ويُتحقق بتوقيع rule-signing key مستقل) | لا | user | ✅ | ✅ |
| `cleanup.propose` | mutating | `categories: enum[]` (من الـ classes المسموحة)، `maxItems`، `dataClass ∈ {regenerable-cache}` فقط في v1 | **دائماً** — يعرض OperationPlan كامل | user (+UAC لو مطلوب) | ✅ بموافقة | ✅ بموافقة |
| `quarantine.propose` | mutating | `detectionIds: string[]` (لازم تطابق detections محلية حديثة) | **دائماً** | user/broker | ✅ بموافقة | ✅ بموافقة |
| `policy.apply` | config | `policyVersion`، `policyRef` (موقع) | لا للـ settings غير الحساسة؛ نعم لأي شيء يزيد جمع البيانات | user | n/a | ✅ |
| `agent.unenroll` | lifecycle | none | إشعار | user | ✅ | ✅ |

**ممنوع صراحةً (غير موجود ولن يُضاف بدون Phase gate + ADR):** shell/script/PowerShell، تثبيت/إزالة برامج، driver/Windows Update install، registry edit، service changes، shutdown/restart، file read/upload، file submission لـ VT، process list، screen/keyboard، تعطيل الحماية.
(Kudu كان يسمح بـ `driver-update-install`، `windows-update-install`، `run-sfc`، `run-dism`، `service-apply`، `registry-fix`، `shutdown`، `restart`… — كلها مستبعدة.)

## 3. Command Envelope

```json
{
  "v": 1,
  "commandId": "cmd_01J…",            // ULID, unique
  "tenantId": "ten_…",
  "deviceId": "dev_…",                 // target; must equal local enrolled id
  "issuer": { "type": "user|policy", "id": "usr_…", "role": "org_admin" },
  "type": "cleanup.propose",           // must be in local allowlist for this app version
  "params": { … },                     // validated against local schema for type
  "scope": "device:dev_… / group:grp_…",
  "approval": { "cloudApprovals": ["usr_…"], "localApprovalRequired": true },
  "issuedAt": "2026-11-01T19:00:00Z",
  "notBefore": "2026-11-01T19:00:00Z",
  "expiresAt": "2026-11-01T20:00:00Z", // short; per-type max (e.g. read 24h, mutating 1h)
  "nonce": "base64(16 random bytes)",
  "seq": 1042,                          // per-device monotonic
  "keyId": "cmdsig-2026-11",
  "sig": "base64(signature over JCS-canonical JSON of all fields except sig)"
}
```

- التوقيع بمفتاح **Command Signing** داخل KMS (non-exportable)، **منفصل** عن مفتاح rule-signing ومفتاح policy-signing.
- الجهاز يعرف المفاتيح العامة المسموحة: root مثبت في التطبيق + signing keys موقعة من الـ root (تدوير بدون تحديث التطبيق، revocation list موقعة).
- Canonicalization: JCS (RFC 8785).

## 4. Lifecycle

```
Create ──▶ Authorize ──▶ (Cloud approval if required) ──▶ Sign ──▶ Queue ──▶ Deliver (device pull)
   │           │                    │                       │                     │
 issuer     RBAC + scope +       2nd admin for          KMS sign            device fetches over
 via UI/API  policy + entitlement  sensitive types       envelope            device-authenticated TLS
                                                                                  ▼
Audit ◀── Report ◀── Execute ◀── Approve locally (if required) ◀── Verify locally
  │         │          │                │                              │
 cloud    signed     ExecutionEngine   user sees plain-language        sig, keyId, tenant, device,
 append-  result     (same policies,   summary + OperationPlan;        expiry, notBefore, nonce unseen,
 only +   (device    Trash-first,      approve / deny / ignore          seq > last, type in allowlist,
 local    key)       broker/UAC)       (timeout = expire)               params schema, local policy
```

حالات الأمر: `created → authorized → [pending_cloud_approval] → signed → queued → delivered → verified → [pending_local_approval] → executing → succeeded | partially_succeeded | failed | rejected(reason) | expired | cancelled`.

## 5. سلوك الـ agent المحلي في الحالات الخاصة

| الحالة | السلوك |
|---|---|
| **Offline** | لا شيء يتنفذ؛ الأوامر تفضل في الـ cloud queue لحد `expiresAt`؛ بعدها `expired` في الـ cloud بدون تسليم |
| **Reconnected** | pull بالترتيب حسب `seq`؛ كل أمر يتحقق فردياً؛ المنتهي يُرفض محلياً ويُبلغ `expired`؛ لا "burst" تنفيذ للأوامر الحساسة — كلها تنتظر موافقة فردية |
| **Expired command** | rejected `expired` (مع سماحية clock skew ±5 دقائق، والساعة المحلية تُقارن بوقت السيرفر من آخر response موقع) |
| **Duplicate (نفس commandId أو nonce)** | rejected `replay`؛ ledger محلي في SQLite يحفظ nonces حتى `expiresAt + skew` |
| **seq أقل من أو يساوي آخر seq** | rejected `out-of-order/replay` |
| **Invalid signature / keyId مجهول أو ملغي** | rejected `bad-signature`؛ لا يُعرض للمستخدم كأمر؛ يُسجل security event محلي + يُبلغ الـ cloud؛ بعد N مرات → إيقاف الـ connector وتنبيه المستخدم |
| **Unauthorized** (type خارج allowlist، device/tenant مش مطابق، params فاشلة، local policy تمنع — مثلاً personal user قفل remote ops) | rejected `unauthorized` مع السبب |
| **Lacking local permission** (يحتاج UAC/polkit/FDA) | يطلب الصلاحية من المستخدم لو موجود؛ لو رفض أو مش موجود → `failed: needs-permission`؛ **لا** محاولة تجاوز |
| **المستخدم مش موجود** والأمر يحتاج موافقة | ينتظر لحد `expiresAt` ثم `expired` |
| **المستخدم رفض** | `rejected: user-denied` — نهائي |

## 6. التفويض في الـ Cloud

| Role | health/posture/scan | inventory | diagnostics | cleanup/quarantine propose | policy | rules |
|---|---|---|---|---|---|---|
| Org Owner | ✅ | ✅ | ✅ | ✅ (2nd approver) | ✅ | ✅ |
| Org Admin | ✅ | ✅ | ✅ | ✅ (2nd approver) | ✅ | ✅ |
| Security Analyst | ✅ | ✅ | ✅ | quarantine فقط (2nd approver) | ❌ | ❌ |
| Helpdesk | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Auditor | ❌ (قراءة النتائج فقط) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Personal Owner | ✅ أجهزته | ✅ أجهزته | ✅ | ✅ | n/a | n/a |

إضافي: step-up MFA قبل أي أمر mutating؛ حد أقصى لعدد الأجهزة في أمر واحد (blast radius) مع تأكيد إضافي فوق حد معين؛ rate limit لكل issuer.

## 7. Audit

- Cloud: event لكل انتقال حالة (actor، وقت، IP، hash الـ envelope)، append-only، hash-chained per tenant، قابل للتصدير.
- Device: سجل محلي مرئي للمستخدم "Activity from HakTrak Cloud" بكل أمر وصل ونتيجته (حتى المرفوض)، مع زر تعطيل الـ remote ops.
- النتائج موقعة بمفتاح الجهاز.
