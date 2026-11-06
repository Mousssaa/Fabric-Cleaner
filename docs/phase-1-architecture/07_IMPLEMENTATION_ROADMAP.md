# 07 — Updated Implementation Roadmap (Deliverable 16)

> خطة فقط. **لا تبدأ أي مهمة بدون موافقة صريحة من Fox.** لا تواريخ ولا افتراض حجم فريق. الـ Waves ليست إصداراً واحداً.
>
> Risk/Complexity: L / M / H. Platform: W=Windows, M=macOS, L=Linux, All, Cloud.

## 0. الربط بمراحل Master Instructions

| Master Phase | Waves |
|---|---|
| Phase 2 (Brand) | بالتوازي مع W1–W2؛ محجوب بالـ Brand Kit |
| Phase 3 (Core UI) | يبدأ بعد W1، بالتوازي مع W2–W3 |
| Phase 4 (Features) | W2، W3، W5، W6، W7، W8 |
| Phase 5 (Security hardening) | W1 (الأساسي) + مراجعة شاملة في W9 |
| Phase 6 (QA) | مستمر + W9 |
| Phase 7 (Release) | W9 |

**الإصدارات المقترحة:** **R1 = W1+W2+W3** (منتج محلي كامل، بدون cloud) · **R2 = W4+W5 (+VT)** · **R3 = W6+W7** · **R4 = W8**. W9 تتكرر قبل كل إصدار.

**شرط مسبق لكل التنفيذ:** مستودع HakTrak fork (E-7) + baseline run (T-1.01).

## Wave 1 — Foundation & Security

| ID | Description | Deps | Components | Platform | Risk | Cx | Acceptance criteria | Tests | Blockers |
|---|---|---|---|---|---|---|---|---|---|
| T-1.01 | Fork عند `v3.11.0`، `UPSTREAM.md`، baseline run (`npm ci`, `npm run check`, build, CLI smoke) على 3 VMs | E-7 | repo, CI | All | L | L | نتائج exit codes موثقة؛ أي فشل مسجل بصدق | الموجودة | لا يوجد repo |
| T-1.02 | `SecureIpcRouter` + navigation/permission guards + sandbox دائم | T-1.01 | main, preload | All | M | M | كل الـ 224 channel مسجلة عبر الـ router بـ schema + capability؛ non-app frame مرفوض | IPC security tests، fuzz للـ validators | — |
| T-1.03 | Per-channel IPC inventory (RFI المرحلة 0) | T-1.01 | docs+tests | All | L | M | جدول 224 channel: input، validator، capability | اختبار يفشل لو channel بدون schema | — |
| T-1.04 | `ExecutionEngine` + `OperationPlan` + confirm tokens + Trash adapters fail-closed | T-1.02 | core | All | H | H | لا module خارج `core/` يحذف (lint + CI grep)؛ trash-unavailable = fail | fixture trees (symlinks، junctions، hard links، long paths، locked، EPERM) per OS في VMs | OQ-01 |
| T-1.05 | `DeletionPolicy` + `dataClass` في `rules.schema.json` + تصنيف كل القواعد | T-1.04 | rules, core | All | M | M | 100% من القواعد مصنفة | schema validation + parity | — |
| T-1.06 | `ProtectedPathPolicy` مركزي (يستبدل قوائم shredder/empty-folders) | T-1.04 | core, broker | All | M | M | كل الأدوات المدمرة تستخدمه؛ نفس النتائج في broker | table-driven tests لكل OS | — |
| T-1.07 | Local DB (SQLite) + migrations + ترحيل history/receipts/recovery من JSON | T-1.01 | db | All | M | M | لا فقدان بيانات في الترحيل؛ rollback | migration tests | OQ-07 |
| T-1.08 | **إزالة Kudu Cloud**: 17 ملف (V-2)، daemon، cloud pages، billing links، YARA polling، `--api-key`؛ فك `HealthReport` type coupling | T-1.01 | main, renderer, cli | All | H | H | `rg -i 'usekudu\|cloud-agent'` = attribution فقط؛ صفر اتصالات شبكة عند التشغيل بدون موافقة | network-egress test في VM (لا اتصال) | — |
| T-1.09 | Privilege Broker — Windows (`asInvoker` + UAC helper) | T-1.04 | broker, packaging | W | H | H | التطبيق يشتغل بدون admin؛ العمليات المرتفعة تطلب UAC وتنجح؛ broker يخرج بعد batch | elevation tests في VM، negative tests (pipe من process آخر) | Windows signing لاحقاً |
| T-1.10 | Privilege Broker — macOS/Linux (helper عبر osascript/pkexec ثم SMAppService/polkit)؛ إلغاء root GUI | T-1.04 | broker | M, L | H | H | لا renderer كـ root؛ sandbox دائماً on | VM tests | Apple Developer ID للـ SMAppService |
| T-1.11 | Recovery Center (Trash records + quarantine + registry/service snapshots) | T-1.04, T-1.07 | core, renderer | All | M | M | كل عملية Trash قابلة للاسترجاع من التطبيق حيث المدعوم | restore tests per OS | macOS Put Back غير رسمي |
| T-1.12 | Quick fixes: Prometheus `127.0.0.1`، update check يحترم الإعداد، plaintext key fallback يتشال | T-1.08 | cli, updater | All | L | L | | unit | — |

## Wave 2 — Local Core

| ID | Description | Deps | Components | Platform | Risk | Cx | Acceptance | Tests | Blockers |
|---|---|---|---|---|---|---|---|---|---|
| T-2.01 | System/browser/app/gaming cleaners → OperationPlan + ExecutionEngine | W1 | cleaners | All | M | M | لا حذف خارج engine؛ receipts صادقة | fixture + receipt tests | — |
| T-2.02 | Storage analysis، duplicates، large files، downloads، empty folders عبر engine | W1 | services | All | L | M | Trash + recovery | fixture | — |
| T-2.03 | Privacy traces + network cleanup بـ `user-data` class | W1 | services | All | M | M | تحذير واضح لـ Wi-Fi | fixture | — |
| T-2.04 | Uninstaller/leftovers/registry/context menu عبر broker + backups | T-1.09 | win32 | W | H | M | backup قبل كل تغيير، restore ناجح | VM | — |
| T-2.05 | Permissions onboarding (FDA، polkit، UAC) | T-1.10 | renderer, platform | All | M | M | حالة الصلاحية ظاهرة لكل ميزة | manual + unit | — |
| T-2.06 | Schedules: scan&notify، autoApply للـ cache، Linux XDG autostart | T-2.01 | scheduler | All (L fix) | M | M | schedules تشتغل بعد reboot على 3 أنظمة | VM reboot test | — |
| T-2.07 | Dashboard: حقائق قابلة للقياس بدل score | — | renderer | All | L | L | كل رقم له مصدر | unit | Brand Kit للتصميم النهائي |
| T-2.08 | Game Mode rework (إزالة standby op) | — | win32 | W | L | L | | unit | OQ-13 |
| T-2.09 | CLI عبر engine + `--yes` | T-2.01 | cli | All | M | M | | CLI smoke | OQ-16 |

## Wave 3 — Local Security

| ID | Description | Deps | Components | Platform | Risk | Cx | Acceptance | Tests | Blockers |
|---|---|---|---|---|---|---|---|---|---|
| T-3.01 | Signed bundle format + Ed25519 verify + pinned keys + rollback protection | W1 | local-intel | All | M | M | bundle معدل/قديم/غير موقع مرفوض | crypto + tamper tests | OQ-20 (مالك المفاتيح) |
| T-3.02 | YARA rule set مضمن (بعد مراجعة ترخيص) | T-3.01 | security | All (glibc) | M | M | scan يعمل offline على fresh install | offline VM test (يغلق U-1) | OQ-11 |
| T-3.03 | Detection states + quarantine افتراضي | T-3.02 | security, renderer | All | M | M | heuristic ≠ malware في الواجهة | unit + UI | — |
| T-3.04 | Local Security Posture من collectors الموجودة | T-1.08 | platform/security | All | L | M | كل check: pass/fail/n.a./unknown/needs-permission | unit per OS | — |
| T-3.05 | Firewall audit + startup safety KB محلي + program safety | T-3.01 | security | All | M | M | لا اتصال cloud | unit | — |
| T-3.06 | Rule-signing pipeline (offline root، signing key، release tooling) | T-3.01 | CI/infra | — | H | M | مفاتيح خارج الـ repo، 2-person | process review | OQ-20 |
| T-3.07 | PowerShell interpolation audit (S-11) → `-EncodedCommand`/params | W1 | win32 | W | M | M | 62 site موثقة/مرحلة | injection tests | — |

## Wave 4 — Cloud Foundation

| ID | Description | Deps | Components | Platform | Risk | Cx | Acceptance | Tests | Blockers |
|---|---|---|---|---|---|---|---|---|---|
| T-4.01 | Repo `haktrak-cloud`، IaC، envs (dev/stage/prod)، OTel | قرارات OQ-05/06/18 | infra | Cloud | M | M | deploy قابل للتكرار | IaC plan review | OQ-06 |
| T-4.02 | IdP integration (OIDC، MFA) | T-4.01 | identity | Cloud | H | M | MFA إلزامي للـ admin roles | auth tests | OQ-05 |
| T-4.03 | Tenancy: personal tenant تلقائي، orgs، invitations، memberships | T-4.02 | tenancy | Cloud | H | M | | cross-tenant tests | — |
| T-4.04 | RBAC + scopes | T-4.03 | authz | Cloud | H | M | مصفوفة 04 §6 مطبقة | authz matrix tests | — |
| T-4.05 | Device enrollment + identity (Ed25519 + safeStorage، PoP) — cloud + desktop connector | T-4.03, T-1.08 | devices, cloud connector | All + Cloud | H | H | enrollment يرفض بدون keystore آمن؛ revocation فعال | e2e enrollment، impersonation negative tests | OQ-04 |
| T-4.06 | API Gateway (rate limits، size limits، versioning) | T-4.02 | edge | Cloud | M | M | | load smoke | — |
| T-4.07 | Postgres RLS + `TenantContext` typed + اختبارات عزل | T-4.03 | data | Cloud | H | M | 0 تسريب في اختبارات cross-tenant | automated isolation suite | — |
| T-4.08 | Audit log (append-only، hash chain) | T-4.03 | audit | Cloud | M | M | أي تعديل يُكتشف | integrity tests | — |
| T-4.09 | Entitlements (flags) — بدون billing | T-4.03 | licensing | Cloud | L | L | Layer A لا يتأثر بالـ entitlements | unit | OQ-15 |
| T-4.10 | Consent model + "What leaves this device" page | T-4.05 | desktop, cloud | All | M | M | كل نوع بيانات off حتى consent | e2e | OQ-17 |

## Wave 5 — Intelligence Integrations

| ID | Description | Deps | Components | Platform | Risk | Cx | Acceptance | Tests | Blockers |
|---|---|---|---|---|---|---|---|---|---|
| T-5.01 | Intelligence Gateway service + adapter interface + NormalizedIntelResult | W4 | gateway | Cloud | M | M | | contract tests | — |
| T-5.02 | Secrets Manager integration + key rotation | T-5.01 | gateway | Cloud | M | L | لا مفاتيح خارج الـ Gateway | secret scanning | — |
| T-5.03 | Cache + quotas + rate limits + circuit breakers | T-5.01 | gateway | Cloud | M | M | | load + chaos tests | شروط caching للمزودين |
| T-5.04 | VirusTotal adapter: hash lookup | T-5.01 | gateway, desktop | All + Cloud | M | M | hash فقط؛ attribution + timestamps | mocked provider tests | **OQ-03** (plan/terms) |
| T-5.05 | VirusTotal file submission + consent token | T-5.04 | gateway, desktop | All + Cloud | H | M | لا رفع بدون token صالح؛ enterprise block يعمل | negative tests (no token، expired، reused) | OQ-03 |
| T-5.06 | LeakRadar adapter | T-5.01 | gateway | Cloud | ? | ? | يُحدد بعد الوثائق | — | **BLOCKED BY API DOCUMENTATION** (OQ-02) |
| T-5.07 | Privacy controls (enterprise block/allow per provider) | T-5.01 | policy | Cloud | M | L | | unit | — |

## Wave 6 — Device Management

| ID | Description | Deps | Components | Platform | Risk | Cx | Acceptance | Tests | Blockers |
|---|---|---|---|---|---|---|---|---|---|
| T-6.01 | Inventory (opt-in software inventory) | W4 | devices | All + Cloud | M | M | لا process list | e2e | — |
| T-6.02 | Health monitoring (heartbeat بفاصل معقول) | W4 | health | All + Cloud | L | L | | | — |
| T-6.03 | Security posture ingest + policy evaluation | T-3.04, W4 | posture | Cloud | M | M | لا score؛ حالات واضحة | unit | — |
| T-6.04 | Alerts (normalize، dedup، routing، ack) + notifications | T-6.03 | alerts, notify | Cloud | M | M | | unit + e2e | — |
| T-6.05 | Device grouping | W4 | tenancy | Cloud | L | L | | | — |
| T-6.06 | Signed policies + distribution + local apply | T-3.01, W4 | policy, desktop | All + Cloud | H | M | policy لا تزيد جمع البيانات بدون إفصاح محلي | tamper tests | — |
| T-6.07 | Reports (per device/org، export) | T-6.03 | reporting | Cloud | L | M | | | — |

## Wave 7 — Controlled Remote Management

| ID | Description | Deps | Components | Platform | Risk | Cx | Acceptance | Tests | Blockers |
|---|---|---|---|---|---|---|---|---|---|
| T-7.01 | Command service: create/authorize/approve/sign (KMS) | W6 | commands | Cloud | H | H | 2-person للـ mutating؛ step-up MFA | authz tests | KMS algorithm (ADR-016) |
| T-7.02 | Desktop Command Verifier (sig، keyId، expiry، nonce ledger، seq، allowlist، schema) | T-7.01 | cloud connector | All | H | M | كل الحالات في 04 §5 مُختبرة | replay/expired/bad-sig/unauthorized tests | — |
| T-7.03 | Local approval UI + activity log | T-7.02 | renderer | All | M | M | لا تنفيذ حساس بدون موافقة | e2e | Brand Kit |
| T-7.04 | تنفيذ الـ allowlist (10 أوامر) عبر ExecutionEngine | T-7.02 | core | All | H | M | لا مسار لـ shell | CI grep + negative tests | OQ-09 |
| T-7.05 | Status/result reporting موقع + cloud audit | T-7.04 | commands, audit | All + Cloud | M | M | | integrity | — |
| T-7.06 | Offline/reconnect behavior | T-7.02 | connector | All | M | M | | network-partition tests | — |
| T-7.07 | ADR-015 evaluation: هل محتاجين agent service؟ | T-7.04 | — | All | H | — | قرار موثق | — | OQ-08 |

## Wave 8 — Advanced Features

| ID | Description | Deps | Risk | Cx | Blockers |
|---|---|---|---|---|---|
| T-8.01 | CVE intelligence (inventory + OSV/NVD، "possible match") | T-6.01 | M | H | ترخيص/شروط مصادر البيانات |
| T-8.02 | Exposure monitoring (LeakRadar) | T-5.06 | M | M | **BLOCKED** |
| T-8.03 | Local Threat Monitor + licensed blocklist | T-3.01 | M | M | ترخيص الـ feeds |
| T-8.04 | Automation (enterprise playbooks — read-only/scan فقط) | W7 | M | M | — |
| T-8.05 | Advanced diagnostics (local analysis + consented upload) | W7 | M | M | — |
| T-8.06 | Enterprise reporting (scheduled، compliance exports) | T-6.07 | L | M | — |
| T-8.07 | Platform gaps: mac/Linux uninstaller، mac Login Items، disk repair read-only، Linux `.desktop` shortcuts، flatpak/snap، environment cleaner | W2 | M | M | — |
| T-8.08 | Hardware-backed device keys (TPM/Secure Enclave) | T-4.05 | M | H | native module |

(Acceptance/tests لكل مهمة W8 تتحدد عند تخطيطها التفصيلي — قاعدة: نفس معايير W1–W7.)

## Wave 9 — Production Readiness

| ID | Description | Platform | Risk | Acceptance | Blockers |
|---|---|---|---|---|---|
| T-9.01 | Cross-platform validation matrix (Win10/11 x64+ARM64، macOS Intel+AS، Ubuntu/Debian/Fedora) | All | H | كل ميزة لها حالة tested/not tested حقيقية | أجهزة/VMs، OQ-10 |
| T-9.02 | Security testing: pentest خارجي، IPC fuzz، tenant isolation، command signing | All + Cloud | H | لا High/Critical مفتوحة | — |
| T-9.03 | Load testing (cloud + gateway) | Cloud | M | SLOs متفق عليها | — |
| T-9.04 | Privacy review + DPA + privacy policy | — | M | موافقة قانونية | OQ-22 |
| T-9.05 | Packaging + HakTrak identifiers + signing (Authenticode، notarization، Linux) | All | H | packaged smoke على كل OS/arch | Brand Kit، شهادات |
| T-9.06 | Update infra + rollback | All | H | update من إصدار لإصدار ناجح + توقيع | — |
| T-9.07 | Release process (SBOM، THIRD_PARTY_NOTICES، Kudu MIT attribution، 2-person release) | All | M | LICENSE محفوظ، About/Legal attribution | — |
