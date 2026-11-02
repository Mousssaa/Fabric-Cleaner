# HakTrak — Phase 1: Hybrid Platform Architecture & Implementation Blueprint

> **وضع العمل: تخطيط فقط.** لم يتم تعديل أي كود أو إعدادات أو بنية تحتية. لا commits ولا push. الملفات دي مكتوبة في مجلد المشروع المشترك (`/mnt/project-files/haktrak-phase1-architecture/`) — **خارج أي مستودع** — والمسارات المقترحة تحت `docs/` في المستودع لسه ما اتعملتش زي ما طلبت.
>
> التاريخ: 2026-11-01. مصدر الحقيقة: نسخة read-only جديدة من `github.com/AdventDevInc/kudu` على `main @ 942af64` (= `v3.11.0` + 6 commits)، نفس baseline المرحلة 0.
>
> اصطلاحات الأدلة: **[Verified]** = اتقرا في الكود في المسار/السطر المذكور · **[Inference]** = استنتاج من الكود من غير تشغيل · **[Design]** = تصميم مقترح، **مش متنفذ ومش متجرب** · **[Unverified]** = معلومة عامة عن طرف خارجي محتاجة تأكيد من وثائق رسمية.

## فهرس المخرجات العشرين

| # | المخرج | الملف |
|---|---|---|
| 1 | Executive Summary | هذا الملف §1 |
| 2 | Final Architecture Diagram | هذا الملف §2 |
| — | Phase 0 Verification (القسم A) | هذا الملف §3 |
| 3 | Desktop Architecture | `01_DESKTOP_ARCHITECTURE.md` §1 |
| 13 | Cleanup & Recovery Architecture | `01_DESKTOP_ARCHITECTURE.md` §2 |
| 14 | Platform Compatibility Matrix | `01_DESKTOP_ARCHITECTURE.md` §3 |
| 4 | Cloud Architecture | `02_CLOUD_AND_TENANCY.md` §1 |
| 8 | Personal & Enterprise Account Model | `02_CLOUD_AND_TENANCY.md` §2 |
| 9 | Multi-Tenant Data Architecture | `02_CLOUD_AND_TENANCY.md` §3 |
| 5 | Intelligence Integration Architecture | `03_INTELLIGENCE_INTEGRATIONS.md` §1 |
| 6 | LeakRadar Integration Assessment | `03_INTELLIGENCE_INTEGRATIONS.md` §2 |
| 7 | VirusTotal Integration Assessment | `03_INTELLIGENCE_INTEGRATIONS.md` §3 |
| 10 | Controlled Remote Management Design | `04_REMOTE_MANAGEMENT.md` |
| 11 | Data Privacy & Governance Matrix | `05_SECURITY_AND_PRIVACY.md` §1 |
| 12 | Security Threat Model | `05_SECURITY_AND_PRIVACY.md` §2 |
| 15 | Complete Feature Disposition Matrix | `06_FEATURE_DISPOSITION.md` |
| 16 | Updated Implementation Roadmap | `07_IMPLEMENTATION_ROADMAP.md` |
| 17 | Architecture Decision Records | `08_ADR_AND_RISKS.md` §1 |
| 18 | Risk Register | `08_ADR_AND_RISKS.md` §2 |
| 19 | Open Questions | هذا الملف §5 |
| 20 | Phase 1 Exit Criteria | هذا الملف §6 |
| — | Final Review Checks (القسم 7 من الطلب) | هذا الملف §4 |

المسارات المقترحة مستقبلاً داخل المستودع (لم تُنشأ): `docs/architecture/TARGET_ARCHITECTURE.md` ← 00 · `DESKTOP_ARCHITECTURE.md` ← 01 · `CLOUD_ARCHITECTURE.md` ← 02 · `INTELLIGENCE_INTEGRATIONS.md` ← 03 · `REMOTE_MANAGEMENT.md` ← 04 · `docs/security/THREAT_MODEL.md` + `DATA_GOVERNANCE.md` ← 05 · `docs/architecture/PLATFORM_COMPATIBILITY.md` ← 01 §3 · `docs/roadmap/IMPLEMENTATION_BACKLOG.md` ← 07 · `docs/architecture/ADR/` ← 08 §1.

---

## 1. Executive Summary

**القرار المعماري:** HakTrak = ثلاث طبقات منفصلة وواضحة الحدود:

- **Layer A — Desktop Core (Electron):** كل وظائف التنظيف والتحليل والأمان المحلي تشتغل **بدون إنترنت وبدون حساب**. ده امتداد لكود Kudu الموجود بعد تقويته (least privilege، Trash-first، محرك تنفيذ مركزي، IPC مؤمَّن).
- **Layer B — HakTrak Cloud:** منتج backend منفصل (مستودع منفصل) للهوية، الحسابات الشخصية والمؤسسية، تسجيل الأجهزة، الجرد، الـ posture، التنبيهات، التقارير، السياسات، والإدارة عن بُعد المُتحكَّم فيها. **اختياري تماماً للمستخدم الشخصي.**
- **Layer C — Intelligence Gateway:** خدمة backend مستقلة عن مزودي الاستخبارات (LeakRadar، VirusTotal، ومستقبلاً غيرهم) عبر adapters. **مفاتيح المزودين لا تدخل تطبيق Electron أبداً.**

**أهم النتائج:**

1. **Kudu Cloud يُزال بالكامل** (`cloud-agent.ts` 4,040 سطر، daemon، صفحة Cloud، روابط billing، polling قواعد YARA) ويُستبدل لاحقاً بـ HakTrak Cloud — **مش بإعادة استخدام البروتوكول**؛ بروتوكول Kudu مفيهوش توقيع للأوامر ولا nonce ولا expiry ([Verified] `rg signature|hmac|nonce|ed25519` على `cloud-agent.ts` = 0 نتائج).
2. **Windows يتحول من `requireAdministrator` إلى `asInvoker`** + Privilege Broker قصير العمر عند الطلب. **لا خدمة privileged دائمة** في Waves 1–6؛ الـ Wave 7 (remote management) فيها ADR منفصل لو احتجنا agent service.
3. **محرك تنفيذ مركزي واحد** (`ExecutionEngine`) لكل عمليات الحذف/النقل/التعديل، مع `DeletionPolicy` و`ProtectedPathPolicy` مركزيين، **Trash-first وfail-closed** (مفيش رجوع صامت للحذف النهائي) — الكود الحالي للـ malware بيعمل كده بالفعل ([Verified] `malware-scanner.ipc.ts:2470-2475`) وهنعمّمه.
4. **اكتشاف جديد مهم:** فيه **مجمّعات Security Posture شغالة على الثلاث أنظمة** في `platform/{win32,darwin,linux}/security.ts` (antivirus، firewall، disk encryption، updates، screen lock، password policy، SSH، fail2ban، listening ports، auditd، SUID/SGID) لكنها مستخدمة **فقط** من الـ cloud agent ([Verified] `platform/types.ts:16,217-228`). دي تتحول لميزة **Local Security Posture** في Wave 3 من غير cloud.
5. **LeakRadar: BLOCKED BY API DOCUMENTATION.** مفيش أي وثائق أو credentials في مجلد المشروع (`uploads/` فاضي). مش هنفترض أي capability.
6. **VirusTotal: التصميم جاهز، القدرات PENDING VERIFICATION.** التصميم hash-first، رفع الملفات بموافقة صريحة لكل ملف فقط، وكل الطلبات من الـ backend. حدود الـ plan والترخيص التجاري لازم تتأكد من عقد/وثائق Fox.
7. **الإدارة عن بُعد:** allowlist مغلقة من 10 أوامر، كل أمر **موقّع** (KMS-held key) ومربوط بـ device + tenant + nonce + expiry + sequence، والجهاز يتحقق محلياً، والعمليات الحساسة **تتطلب موافقة المستخدم المحلي دائماً**. **لا shell عشوائي — ممنوع بالتصميم وبالكود.**

**ما لم يتم:** مفيش build، مفيش tests، مفيش `npm install`. كل baseline checks اللي محتاجة `node_modules` لسه **NOT RUN** (زي المرحلة 0). كل اللي هنا **تصميم** مش تنفيذ.

---

## 2. Final Architecture Diagram

```
┌──────────────────────────────── USER DEVICE (Windows / macOS / Linux) ───────────────────────────────┐
│                                                                                                      │
│  ┌──────────── Renderer (sandboxed, contextIsolation, CSP, no Node) ────────────┐                    │
│  │ React UI · Zustand · i18n (31 locales, RTL)                                  │                    │
│  └───────────────▲──────────────────────────────────────────────────────────────┘                    │
│                  │ typed preload API (window.<api>) — no generic invoke                              │
│  ┌───────────────┴─────────── Preload ──────────────┐                                                │
│  └───────────────▲───────────────────────────────────┘                                               │
│                  │ IPC: SecureIpcRouter (sender-origin check · schema validation · capability tag)   │
│  ┌───────────────┴────────────────────────── Main Process (user privilege, asInvoker) ────────────┐  │
│  │  Navigation/Permission guards     Settings & Consent Store      Local DB (SQLite, encrypted*) │  │
│  │                                                                                                │  │
│  │  ┌─ Scan Services ────────────┐   ┌─ ExecutionEngine (single choke point) ──────────────────┐ │  │
│  │  │ Cleaners (system/browser/  │   │ OperationPlan → PolicyCheck (DeletionPolicy,             │ │  │
│  │  │ app/gaming) · Storage ·    │──▶│ ProtectedPathPolicy, Exclusions) → Confirm token →       │ │  │
│  │  │ Duplicates · Large files · │   │ Revalidate (lstat/realpath/identity) → Execute via       │ │  │
│  │  │ Startup · Apps · Privacy   │   │ Trash/Quarantine/Backup adapters → Receipt → Recovery    │ │  │
│  │  └────────────────────────────┘   └───────────────┬──────────────────────────────────────────┘ │  │
│  │  ┌─ Security Engine ───────────┐                   │ privileged ops only                       │  │
│  │  │ YARA-X worker · PE heurist. │                   ▼                                           │  │
│  │  │ Posture collectors · FW     │   ┌─ Privilege Broker (on-demand, short-lived) ──────────────┐ │  │
│  │  │ audit · Startup safety KB   │   │ Win: UAC-elevated helper.exe (named pipe, ACL'd)         │ │  │
│  │  └─────────────────────────────┘   │ mac: SMAppService helper (XPC, code-sign check)          │ │  │
│  │  ┌─ Local Intelligence ────────┐   │ Linux: polkit action + helper (pkexec), no root GUI      │ │  │
│  │  │ Signed rule bundles (YARA,  │   │ Accepts only typed allowlisted ops from main; re-checks  │ │  │
│  │  │ startup KB, blocklists)     │   │ policy itself; exits after batch                         │ │  │
│  │  │ Ed25519 verify, pinned keys │   └──────────────────────────────────────────────────────────┘ │  │
│  │  └─────────────────────────────┘                                                                │  │
│  │  ┌─ Cloud Connector (OPTIONAL, off until enrollment) ─────────────────────────────────────────┐ │  │
│  │  │ Device Identity (Ed25519 key, OS keystore) · Sync outbox (consented data only) ·           │ │  │
│  │  │ Command Verifier (sig, nonce, expiry, seq, allowlist) → Local Approval UI → ExecutionEngine │ │  │
│  │  └──────────────────────────────────────────┬──────────────────────────────────────────────────┘ │  │
│  │  Update Manager (HakTrak feed, code-signature verified)                                          │  │
│  └─────────────────────────────────────────────┼────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────┼───────────────────────────────────────────────────────┘
                                                 │ HTTPS (TLS 1.2+/1.3), device-signed requests; pull + optional wake hint
┌────────────────────────────────────── HAKTRAK CLOUD (separate repo/product) ────────────────────────┐
│  Edge: WAF · API Gateway (authn, rate limit, tenant resolution)                                    │
│  ┌─ Identity Svc ─┐ ┌─ Tenant & RBAC ─┐ ┌─ Device Registry ─┐ ┌─ Posture/Health ─┐ ┌─ Alerts ─┐   │
│  │ OIDC IdP, MFA, │ │ personal/org,   │ │ enrollment, keys, │ │ ingest, evaluate │ │ normalize│   │
│  │ SSO (ent.)     │ │ roles, groups   │ │ inventory, status │ │ policy           │ │ route    │   │
│  └────────────────┘ └─────────────────┘ └───────────────────┘ └──────────────────┘ └──────────┘   │
│  ┌─ Policy Svc ─┐ ┌─ Command Svc ──────────────────┐ ┌─ Reporting ─┐ ┌─ Notifications ─┐          │
│  │ signed rules │ │ create→authorize→approve→SIGN  │ │ per tenant  │ │ email/in-app    │          │
│  │ distribution │ │ (KMS) → queue → status → audit │ └─────────────┘ └─────────────────┘          │
│  └──────────────┘ └────────────────────────────────┘                                              │
│  ┌─ Audit Log (append-only, hash-chained) ─┐ ┌─ Entitlements/Licensing ─┐                          │
│  └──────────────────────────────────────────┘ └──────────────────────────┘                          │
│  Data: PostgreSQL (tenant_id + RLS) · Redis (cache/rate) · Object storage (reports) · KMS/Secrets  │
└────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                 │ internal mTLS / service auth, tenant context propagated
┌──────────────────────────── LAYER C — INTELLIGENCE GATEWAY (separate service) ──────────────────────┐
│ AuthZ (tenant entitlement + consent) → Request normalizer → Cache lookup → Provider router         │
│   ├─ VirusTotal adapter (hash-first; file submit only with explicit consent token)  [PENDING VERIFY]│
│   ├─ LeakRadar adapter                                                         [BLOCKED BY DOCS]   │
│   └─ Future adapters (same interface)                                                              │
│ Per-provider: secret from Secrets Manager · quota/rate limiter · circuit breaker · retention TTL   │
│ → NormalizedIntelResult (provider attribution + timestamps + expiry + error states)                │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
           * تشفير الـ local DB: open question (OQ-07)
```

**قاعدة الاتجاهات:** Desktop ← لا يتصل بأي مزود خارجي مباشرة. Cloud ← هو الوحيد اللي بيكلم Gateway. Gateway ← هو الوحيد اللي معاه مفاتيح المزودين. **Desktop يفضل شغال 100% في وظائف Layer A لو Cloud وGateway وقعوا.**

---

## 3. Phase 0 Verification (Section A)

### 3.1 الوثائق

الوثائق التسعة **كلها موجودة** في `/mnt/project-files/kudu-phase0-audit/docs/` (لا يوجد ناقص منها). الوثائق **غير الموجودة** اللي Phase 1 محتاجها:

| الناقص | أثره |
|---|---|
| وثائق LeakRadar API + الترخيص + credentials config | LeakRadar **BLOCKED** |
| وثائق/عقد VirusTotal (نوع الـ plan، الحصص، شروط الاستخدام التجاري) | VirusTotal **PENDING VERIFICATION** |
| HakTrak Brand Kit | يحجب Phase 2 فقط (مش Phase 1) |
| مستودع HakTrak fork | يحجب أي تنفيذ؛ مش مطلوب للتخطيط |
| Baseline runtime results (`npm run check`، build، smoke) | لسه **NOT RUN**؛ مطلوب قبل Wave 1 (T-1.01) |
| Per-channel IPC inventory (224 channel) و PowerShell interpolation audit | RFIs من المرحلة 0؛ نُقلوا لـ Wave 1 |

### 3.2 ادعاءات تم التحقق منها في الكود (عينة مهمة)

| ادعاء المرحلة 0 | النتيجة | الدليل |
|---|---|---|
| Windows دايماً Admin | ✅ صحيح | `electron-builder.yml:38` `requireAdministrator`، `:49` `perMachine: true`، `:57` portable `admin` |
| `cloud-agent.ts` 4,040 سطر، 36 نوع أمر، بدون توقيع | ✅ صحيح | `wc -l`؛ `cloud-agent.ts:1785-1830` (36 قيمة فريدة)؛ 0 نتائج لـ signature/hmac/nonce |
| YARA rules polling لكل المستخدمين كل 6 ساعات | ✅ صحيح | `malware-scanner.ipc.ts:2682-2683`، `yara-rules-store.ts:21`، `:335` |
| Integrity الـ YARA self-attested | ✅ صحيح | `yara-rules-store.ts:236-237` (الـ hash جاي في نفس الـ payload) |
| الحذف الرئيسي نهائي | ✅ صحيح | `file-utils.ts` `safeDelete` → `rm(..., {force, recursive, maxRetries:3})` |
| لا navigation guards ولا sender validation | ✅ صحيح | 0 نتائج لـ `will-navigate|will-redirect|web-contents-created|setPermissionRequestHandler|senderFrame` في `src/` |
| `sandbox: !isRoot` | ✅ صحيح | `src/main/index.ts:473` تقريباً (block `webPreferences`) |
| Game Mode `mem-clear-standby` no-op | ✅ صحيح | `game-mode.ipc.ts:422-428` `[System.GC]::Collect()` |
| Linux autostart عبر `setLoginItemSettings` | ✅ الكود صحيح؛ كونه no-op لسه **[Inference]** | `index.ts:362-372` |
| Health score مبني على الاستخدام | ✅ صحيح | `DashboardPage.tsx:326-349` (60 نقطة tool coverage + 40 لو اتعمل malware scan) |
| Sharing defaults = true بعد الربط | ✅ صحيح | `settings-store.ts:83-85` |
| API key plaintext fallback | ✅ صحيح | `settings-store.ts:159-170` |
| Threat Monitor يبدأ فقط من cloud agent | ✅ صحيح | `cloud-agent.ts:746,1574,1610` (لا caller آخر) |
| Prometheus على كل الواجهات | ✅ صحيح | `cli.ts:2071` `server.listen(port)` بدون host |
| 224 channel، 43 IPC module، 38 page، 216 test file | ✅ صحيح | عدّ مباشر |
| `better-sqlite3` للـ VACUUM فقط | ✅ صحيح | المستخدم الوحيد `services/database-vacuum.ts` |

### 3.3 تصحيحات واكتشافات جديدة

| # | النوع | التفاصيل | الدليل | الأثر على Phase 1 |
|---|---|---|---|---|
| V-1 | **إغفال مهم** | مجمّعات Security Posture موجودة لكل OS، مستخدمة فقط من cloud agent، مش ظاهرة في الواجهة. بعضها بيرجع `null` على OS غير مناسب (مثلاً `collectSshHardening` على Windows) | `platform/types.ts:16,217-228`؛ `platform/win32/security.ts:313-315`؛ callers فقط في `cloud-agent.ts` | ميزة Local Security Posture تتعمل بإعادة استخدام (Wave 3). وخريطة إزالة الـ cloud لازم تشمل type coupling: `platform/*/security.ts` و`platform/types.ts` بيستوردوا `services/cloud-agent-types` |
| V-2 | إغفال | خريطة consumers الـ cloud في المرحلة 0 ناقصة: `services/logger.ts:36-39` (`cloud-agent.log`)، `platform/*/security.ts`، `platform/types.ts`، `ipc/cloud-agent.ipc.ts` | `rg -l cloud-agent\|cloudAgent src/main` = 17 ملف | خطة الإزالة (T-1.08) لازم تغطي الـ 17 ملف |
| V-3 | توضيح | `machineId` = `randomUUID()` في `config.json` — bearer identifier، **مش هوية تشفيرية** | `settings-store.ts:530-543` | ما ينفعش يبقى أساس Device Identity في HakTrak (ADR-009) |
| V-4 | تصحيح بسيط | "`rg trashItem` → 7 modules": واحد منهم (`cloud-agent.ts:2825`) false positive (اسم متغير `trashItemPaths`). المستخدمين الفعليين لـ `shell.trashItem` = 6 | grep | الاستنتاج ما اتغيرش |
| V-5 | تصحيح بسيط | "~235 typed wrappers": الفعلي 197 `ipcRenderer.invoke` + listeners (267 استدعاء `ipcRenderer.` إجمالاً) | `src/preload/index.ts` | مش جوهري |
| V-6 | نمط جيد غير مذكور | الـ malware recycle mode **fail-closed**: لو مفيش Trash، يفشل بدل ما يحذف نهائي | `malware-scanner.ipc.ts:2470-2475` | يتعمم في `ExecutionEngine` |
| V-7 | انحراف وثائق upstream | `docs/cloud-yara-rules-prompt.md` بيقول `libyara-wasm` بينما الـ dependency `@litko/yara-x` | الملف + `package.json` | توثيق فقط |
| V-8 | تأكيد | VirusTotal موجود **فقط** في CI (`distribute-release.yml:117-164`) لرفع ملفات الـ release نفسها بسر `VIRUSTOTAL_API_KEY`؛ لا client في التطبيق | grep | لا تعارض؛ ده رفع لملفاتنا مش ملفات العملاء |
| V-9 | لا توقيع محلي | لا يوجد أي استخدام لـ Ed25519/`crypto.verify` في `src/main` | grep = 0 | التحقق من التوقيع (rules/commands) بناء جديد بالكامل |
| V-10 | schema | `rules.schema.json` مفيهوش حقل تصنيف بيانات (cache/user-data/system) | `rules/schema/rules.schema.json` | لازم إضافة `dataClass` (T-1.05) |

### 3.4 تعارضات وافتراضات غير مدعومة

| # | البند | الحالة |
|---|---|---|
| C-1 | المرحلة 0 أوصت بـ "local-only v1 وإزالة الـ cloud" | **تم تجاوزه بقرار Fox (Hybrid).** يظل صحيح إن Kudu Cloud يتشال؛ الجديد إن HakTrak Cloud يتبني كمنتج منفصل |
| C-2 | Roadmap المرحلة 0 (Phases 2–8 من Master) مقابل Waves 1–9 الجديدة | الـ Waves تتم **داخل** Phase 4–7 من Master؛ Phase 2 (Brand) و Phase 3 (UI) بيتوازوا مع Waves 1–3. الربط في `07_IMPLEMENTATION_ROADMAP.md` §0 |
| C-3 | "Trash-first للـ user data، نهائي للـ cache" (المرحلة 0) مقابل "Trash-first" المعتمد | حُل في ADR-004: Trash افتراضي للكل، والحذف النهائي للـ cache **اختيار صريح مرئي** مش fallback. يحتاج تأكيد Fox (OQ-01) |
| U-1 | "fresh offline install بدون YARA rules" | لسه **[Inference]**، يتحقق في T-1.01 |
| U-2 | "Linux autostart no-op" | لسه **[Inference]** |
| U-3 | "AppImage updates بدون تحقق توقيع" | لسه **[Inference]** |
| U-4 | أي قدرة لـ LeakRadar | **لا يوجد دليل إطلاقاً** |

---

## 4. Final Review Checks (Section 7)

| الفحص | النتيجة | أين |
|---|---|---|
| تعارض Desktop/Cloud | لا تعارض: Desktop يملك **التنفيذ**؛ Cloud يملك **النية والتفويض والسجل**. الـ Cloud لا يحذف ولا ينفذ؛ يرسل طلب موقّع والجهاز يقرر محلياً | 01 §1، 04 |
| Offline | كل Layer A بدون شبكة؛ القواعد مضمنة وموقعة؛ cloud connector مقفول افتراضياً؛ الأوامر المعلقة تنتهي صلاحيتها | 01 §1.12 |
| Personal ≠ Enterprise | نموذجين منفصلين: Personal = المستخدم مالك البيانات والجهاز وفيه zero remote ops افتراضياً؛ Enterprise = سياسات المؤسسة لكن **بدون تجاوز الموافقة المحلية للعمليات الحساسة** | 02 §2 |
| Multi-tenant isolation | `tenant_id` إجباري + Postgres RLS + authz في التطبيق + مفاتيح cache مقسمة بالـ tenant + اختبارات cross-tenant | 02 §3 |
| API key security | المفاتيح في Secrets Manager داخل Gateway فقط؛ لا شيء في Electron؛ الـ CI secret الحالي لـ VT منفصل | 03 §1 |
| VT file-submission privacy | hash-first، رفع الملف = أمر منفصل يحتاج consent token لكل ملف، ممنوع آلياً، ممنوع من remote command | 03 §3 |
| LeakRadar مقابل وثائق | **لا وثائق** → BLOCKED، ولا ميزة مبنية على افتراض | 03 §2 |
| توقيع وتفويض الأوامر | KMS signing، envelope بـ nonce/expiry/seq/device/tenant، allowlist مغلقة، local approval | 04 |
| تغطية ميزات Kudu | 61 ميزة كلها ليها disposition | 06 |
| حدود الصلاحيات للثلاث أنظمة | Broker لكل OS، لا root GUI، لا خدمة دائمة | 01 §1.7، §3 |
| الاسترجاع | Trash-first + receipts + recovery center + fail-closed | 01 §2 |
| قرارات معلقة | 22 سؤال مفتوح | §5 |

---

## 5. Open Questions

| ID | السؤال | التوصية | يحجب |
|---|---|---|---|
| OQ-01 | الـ cache القابل للتجديد: Trash افتراضياً (مساحة ما بتتحررش لحد ما الـ Trash يتفضى) ولا خيار "حذف نهائي للكاش" مرئي في شاشة التأكيد؟ | Trash افتراضي + toggle صريح لكل عملية للـ cache فقط | T-1.04 |
| OQ-02 | وثائق LeakRadar: endpoints، auth، rate limits، ترخيص (هل يسمح بإعادة البيع/العرض لعملاء طرف ثالث؟)، الاحتفاظ بالبيانات، هل البحث بالإيميل/الدومين يحتاج إثبات ملكية | ارسالها في `uploads/` | Wave 5 LeakRadar |
| OQ-03 | VirusTotal: نوع الاشتراك (Public / Premium / Enterprise / Intelligence)، هل الاستخدام التجاري مسموح، الحصص، هل مسموح عرض النتائج للعملاء | Premium/commercial agreement مطلوب للمنتج | Wave 5 VT |
| OQ-04 | جهاز واحد في أكثر من tenant (شخصي + مؤسسة)؟ | لا: جهاز = tenant واحد في نفس الوقت | T-4.05 |
| OQ-05 | Identity: managed IdP (Auth0/WorkOS/Entra External ID/Cognito) ولا self-hosted (Keycloak/Zitadel)؟ | managed IdP للـ Wave 4 (تفاصيل ADR-012) | T-4.02 |
| OQ-06 | Cloud provider ومنطقة البيانات (data residency: مصر/الخليج/الاتحاد الأوروبي؟) | يحددها Fox حسب العملاء؛ التصميم cloud-agnostic | Wave 4 |
| OQ-07 | تشفير الـ local DB (SQLCipher = native dep جديد) ولا تشفير الحقول الحساسة فقط بـ `safeStorage`؟ | field-level بـ `safeStorage` في Wave 1 | T-1.07 |
| OQ-08 | Wave 7: هل المؤسسة محتاجة أوامر تشتغل والمستخدم مش موجود (unattended)؟ ده يحتاج service دائمة | لا في أول إصدار؛ الأوامر الحساسة تنتظر المستخدم | ADR-015 |
| OQ-09 | هل Enterprise admin يقدر يفرض auto-approve لأوامر read-only (health/inventory)؟ | نعم للـ read-only فقط، بإشعار مرئي للمستخدم | T-7.04 |
| OQ-10 | الحد الأدنى لإصدارات الأنظمة (Windows 10؟ macOS أقدم إصدار؟ distros) | Win10 22H2+/Win11، macOS آخر 3 إصدارات، Ubuntu LTS/Debian/Fedora | Wave 9 |
| OQ-11 | مصادر قواعد YARA وترخيصها التجاري (YARA-Forge، signature-base، قواعد خاصة) | مراجعة ترخيص قبل الدمج | T-3.02 |
| OQ-12 | Registry cleaner، debloater، driver cleanup، environment cleaner: تفضل في v1؟ | تفضل تحت "Advanced" مع backups؛ environment cleaner مؤجل لحد ما يتعمله tests | 06 |
| OQ-13 | Game Mode: إزالة `mem-clear-standby` نهائياً؟ | نعم، والإبقاء على العمليات القابلة للقياس فقط | T-2.08 |
| OQ-14 | Breach monitoring: LeakRadar فقط ولا كمان HIBP؟ | LeakRadar أولاً بعد الوثائق | Wave 5/8 |
| OQ-15 | نموذج الترخيص: free/personal pro/enterprise per-seat؟ ما الذي يكون مجاني؟ | كل Layer A مجاني أو ضمن الترخيص الأساسي؛ cloud features مدفوعة | T-4.09 |
| OQ-16 | CLI و`--clean` بدون تأكيد تفاعلي: يفضل؟ | يفضل مع `--yes` إجباري وTrash-first | T-2.09 |
| OQ-17 | الاحتفاظ بالبيانات الافتراضي في الـ cloud (90 يوم telemetry؟ سنة audit؟) | مقترح في 05 §1؛ يحتاج اعتماد قانوني | 05 |
| OQ-18 | هل الـ cloud backend مستودع منفصل؟ اللغة؟ | نعم منفصل؛ TypeScript (ADR-011) | Wave 4 |
| OQ-19 | Prometheus exporter: يفضل؟ | يفضل لكن bind على `127.0.0.1` افتراضياً | T-1.10 |
| OQ-20 | مين يملك signing keys (Windows cert، Apple Developer ID، rule-signing، command-signing)؟ | HakTrak Networks entity، مع HSM/KMS | Wave 9، T-3.06 |
| OQ-21 | Android: مؤكد خارج النطاق؟ | نعم (معتمد) | — |
| OQ-22 | الإطار القانوني للخصوصية المستهدف (GDPR؟ قانون حماية البيانات المصري 151/2020؟) | يحدده Fox مع مستشار قانوني | 05، Wave 9 |

---

## 6. Phase 1 Exit Criteria

| # | المعيار | الحالة الآن |
|---|---|---|
| E-1 | الـ 20 مخرج موجودين ومراجعين من Fox | ✅ مكتوبين / ⏳ مراجعة Fox |
| E-2 | ادعاءات المرحلة 0 الجوهرية متحققة والتصحيحات موثقة | ✅ |
| E-3 | ADRs الحرجة (001–010) معتمدة من Fox | ⏳ |
| E-4 | OQ-01، OQ-04، OQ-05، OQ-08، OQ-12، OQ-13 مجاوب عليهم (يحجبوا Waves 1–4) | ⏳ |
| E-5 | وثائق LeakRadar مستلمة **أو** قبول صريح إن LeakRadar يفضل blocked وWave 5 تبدأ بـ VT | ⏳ |
| E-6 | تأكيد نوع اشتراك VirusTotal وشروطه **أو** قبول إن VT يفضل pending | ⏳ |
| E-7 | مستودع HakTrak fork متعمل ومربوط بالمشروع (شرط لأي تنفيذ، مش للتخطيط) | ❌ غير موجود |
| E-8 | موافقة صريحة من Fox على بدء Wave 1 | ⏳ |

**ملحوظة:** E-1..E-2 مكتملين من جهتي. الباقي قرارات/مدخلات من Fox، فحالة المرحلة **PARTIALLY COMPLETE** (التخطيط كامل، ونقطتين تكامل محجوبتين بوثائق خارجية).

---

PHASE 1 STATUS: PARTIALLY COMPLETE
(التخطيط المعماري كامل؛ LeakRadar = BLOCKED BY API DOCUMENTATION، VirusTotal = PENDING VERIFICATION.)

NO APPLICATION SOURCE CODE OR CONFIGURATION FILES WERE MODIFIED.
