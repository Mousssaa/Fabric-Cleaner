# HakTrak — Phase 1 Scope Alignment Addendum

> **مراجعة وتصحيح فقط.** الملف ده بيكمّل وثائق المرحلة 1 الموجودة وبيصححها، ومش بيحل محلها. لم يتم تعديل أو حذف أي وثيقة سابقة، ولا أي كود أو إعدادات، ولا commit ولا push.
>
> التاريخ: 2026-11-02. مصدر الأدلة: نسخة read-only من `AdventDevInc/kudu` على `main @ 942af64` (= `v3.11.0` + 6 commits) — نفس baseline المرحلتين 0 و1.
> اصطلاحات: **[Verified]** اتقرا في الكود · **[Inference]** استنتاج بدون تشغيل · **[Design]** تصميم، مش متنفذ.

---

## 1. Completed Phase 1 Deliverable Inventory

اتأكدت من وجود كل ملف وقريت محتواه (مش من ملخص المحادثة). موجودين في مكانين **متطابقين** (`diff -rq` بدون فروق): مجلد المشروع، وفرع `docs/phase-0-1-architecture` في `Mousssaa/Fabric-Cleaner` (PR #1، لسه مفتوح ومش merged).

| # | الملف | المرحلة | موجود | الحالة بعد المراجعة |
|---|---|---|---|---|
| 1 | `docs/phase-0-audit/PROJECT_AUDIT.md` | 0 | ✅ | سليم. §8 "local-only v1" اتجاوزه قرار Hybrid (C-1) |
| 2 | `docs/phase-0-audit/EXISTING_FEATURES_MATRIX.md` | 0 | ✅ | سليم. ناقصه ميزة Security Posture (V-1) |
| 3 | `docs/phase-0-audit/CLOUD_DEPENDENCIES_AUDIT.md` | 0 | ✅ | §4/§8 فيها "Remove from v1" بصياغة local-only. خريطة الـ consumers ناقصة (V-2). §4 بيقترح HIBP وabuse.ch وOSV/NVD (مزودين مش معتمدين، §10-C2) |
| 4 | `docs/phase-0-audit/PLATFORM_COMPATIBILITY.md` | 0 | ✅ | سليم. محتاج إضافة سياسة جهاز التطوير (macOS Intel، §12-D) |
| 5 | `docs/phase-0-audit/SECURITY_RISK_ASSESSMENT.md` | 0 | ✅ | سليم |
| 6 | `docs/phase-0-audit/BRANDING_MIGRATION_PLAN.md` | 0 | ✅ | متوافق (مفيش أصول متخترعة) |
| 7 | `docs/phase-0-audit/PRODUCT_OPPORTUNITIES.md` | 0 | ✅ | فيه مقترحات مزودين/feeds خارجية لازم تتوسم "future, not in scope" |
| 8 | `docs/phase-0-audit/IMPLEMENTATION_ROADMAP.md` | 0 | ✅ | **اتجاوزه** roadmap المرحلة 1 والتصحيح هنا (§9) |
| 9 | `docs/phase-0-audit/BASELINE_TEST_REPORT.md` | 0 | ✅ | سليم. الـ checks لسه **NOT RUN** |
| 10 | `docs/phase-1-architecture/00_EXECUTIVE_SUMMARY_AND_INDEX.md` | 1 | ✅ | محتاج تصحيحات المصطلحات والـ roadmap (§10) |
| 11 | `…/01_DESKTOP_ARCHITECTURE.md` | 1 | ✅ | محتاج تصحيح: إعادة الهيكلة تبقى تدريجية، والـ broker يمتد من abstraction موجودة، والـ SQLite يتأجل (§10) |
| 12 | `…/02_CLOUD_AND_TENANCY.md` | 1 | ✅ | سليم كتصميم مستقبلي. محتاج توضيح إنه **Stage 4+، مش الشغل الحالي** |
| 13 | `…/03_INTELLIGENCE_INTEGRATIONS.md` | 1 | ✅ | محتاج تغيير المسمى لـ PENDING API DOCUMENTATION، والإشارة لـ HIBP تتشال |
| 14 | `…/04_REMOTE_MANAGEMENT.md` | 1 | ✅ | متوافق. محتاج يتوضح إن الحجب في الـ Stage 7 هو أسس Stages 4–6 |
| 15 | `…/05_SECURITY_AND_PRIVACY.md` | 1 | ✅ | متوافق |
| 16 | `…/06_FEATURE_DISPOSITION.md` | 1 | ✅ | المصطلحات (HARDEN/REWORK) لازم تتحول للتصنيف المعتمد (§4) |
| 17 | `…/07_IMPLEMENTATION_ROADMAP.md` | 1 | ✅ | لازم يتعاد ترتيبه على Stages 1–9 (§9) |
| 18 | `…/08_ADR_AND_RISKS.md` | 1 | ✅ | ADR-006 وADR-011 والإشارات لمزودين محتاجة تصحيح (§10) |
| — | `docs/HAKTRAK_MASTER_PROMPT.md` | — | ✅ | مرجع، ومش محتاج تعديل |

**غير موجود (وده متوقع، مش ناقص):**
- `docs/architecture/*` و`docs/security/*` و`docs/roadmap/*` و`docs/architecture/ADR/` كانوا **مسارات مقترحة بس**، وما اتعملوش بناءً على طلبك.
- مفيش أي وثائق لـ LeakRadar أو VirusTotal في المشروع.
- **مستودع `Fabric-Cleaner` مفيهوش كود Kudu.** فيه `README.md` (initial commit) وفرع الوثائق بس. ده أهم فجوة عملية (§12-D1).

---

## 2. Executive Review of the Existing Architecture

**الخلاصة:** وثائق المرحلة 1 **اتجاهها صح**. هي فعلاً مبنية على تطوير Kudu، و`01 §1.1` البند 5 بيقول صراحةً "إعادة استخدام الكود الحالي حيث هو قوي". ومفيش أي وثيقة بتقترح إعادة كتابة الـ Desktop أو تغيير Electron/React/TypeScript.

لكن فيه **5 مشاكل في التقديم والتسلسل** ممكن تتفهم غلط، وتصحيحها هو هدف الملف ده:

1. **المصطلحات:** عمود "من كود Kudu / التغيير المطلوب" في 01، وتصنيفات 06 (KEEP / HARDEN / REWORK)، مش متطابقين مع التصنيف المعتمد KEEP / REFACTOR / REBUILD / REPLACE / REMOVE / DEFER. وكمان بعض قرارات REBUILD/REPLACE من غير دليل صريح. **التصحيح في §4.**
2. **وزن الـ Cloud:** ملف كامل (02) وWaves 4–7 متفصلين بنفس مستوى تفاصيل شغل الـ Desktop. ده ممكن يدّي انطباع إن الـ cloud جزء من الشغل القريب، وهو مش كده. **التصحيح:** الـ cloud تصميم مرجعي لـ Stage 4+ بس.
3. **إعادة هيكلة المجلدات** في `01 §1.3` (`core/`، `broker/`، `cloud/`، `db/`) ممكن تتقرا كـ restructure شامل. **التصحيح:** التغيير ده يحصل بالتدريج مع كل مهمة بس، ومن غير أي نقل جماعي للملفات.
4. **ترحيل JSON → SQLite** (ADR-006، T-1.07) **مالوش دليل كفاية** على إنه ضروري في Stage 2. Kudu عنده stores شغالة: `settings-store.ts` بيستخدم `runLocked`، وفيه `history.json` و`recovery/changes.json` [Verified]. **التصحيح:** KEEP في Stage 2، والقرار يتأجل لحد ما يظهر احتياج فعلي (§10-C5).
5. **Privilege Broker** اتوصف كمكوّن "جديد". **الدليل:** فيه abstraction موجودة `PlatformElevation` في `platform/types.ts:208-211` (`isAdmin()` بس)، وimplementations لكل OS في `platform/{win32,darwin,linux}/`. **التصحيح:** REFACTOR (توسيع الـ abstraction دي)، مع REBUILD لآلية الـ relaunch بس (§4).

**اللي يفضل كما هو (متوافق مع التوجيه):**
- Hybrid
- Local Core مستقل عن الـ cloud
- Trash-first وfail-closed
- `ExecutionEngine` كغلاف حوالين `safeDelete`/`cleanItems` الموجودين
- نموذج الأوامر الموقّعة بدون shell
- عدم وجود أي مفاتيح مزودين في Electron
- hash-first لـ VirusTotal
- فصل Personal عن Enterprise
- الثلاث أنظمة

---

## 3. Confirmed Kudu-to-HakTrak Evolution Strategy

> **HakTrak Desktop = مستودع Kudu نفسه، بيتطور بخطوات صغيرة متحكَّم فيها.** مفيش تطبيق desktop جديد، ولا framework جديد، ولا codebase منفصل لكل نظام.

| المبدأ | التطبيق |
|---|---|
| Reuse what is good | الـ deletion pipeline (scan-ID binding وrevalidation وsymlink handling: `file-utils.ts`)، وrules engine وschema، والـ platform abstraction (`PlatformImpl`)، وYARA-X engine/worker، والـ quarantine، وrecovery-store، وregistry backups + seals، والـ 31 locale، والـ CLI، وCI على 3 أنظمة، والـ packaging لكل الأنظمة، والـ 216 test file |
| Refactor what is weak | الصلاحيات (Windows admin دايماً)، وIPC (من غير sender validation)، والحذف النهائي، والـ protected paths المتفرقة، ومنطق Windows اللي جوه ملفات IPC، والـ PowerShell interpolation |
| Rebuild what is missing | تحديد الـ elevation بقناة typed، والتحقق من توقيع القواعد، وRecovery Center موحد، وonboarding للصلاحيات |
| Remove what is unnecessary | ارتباط Kudu Cloud (agent، daemon، صفحات الـ cloud، billing links، YARA polling)، و`mem-clear-standby`، وhealth score المبني على الاستخدام |
| Future (منفصل) | HakTrak Cloud backend وIntelligence Gateway: **مستودع/خدمة مستقلة** بتتكلم مع الـ Desktop عبر واجهة موثقة |

**ترتيب التحول:** المستودع يتنقل للـ HakTrak repo بكل تاريخه → baseline يتشغل → تقوية الأمان والموثوقية → الـ branding والـ UX → وبعد كده، وبشكل منفصل تماماً، الـ cloud.

**الـ branding:** Kudu أساس تقني فقط. كل الأسماء والأصول تتغير بعد وصول الـ Brand Kit، حسب `BRANDING_MIGRATION_PLAN.md` (§5–6). مفيش ألوان ولا خطوط ولا لوجو متخترعين. المعرّفات التقنية (appId، `KuduStartup`، `--kudu-data-dir`، registry seal key) تتغير في PR واحد مع اختبارات على الثلاث أنظمة. وترخيص MIT (Advent Development Inc) والـ attribution لازم يفضلوا موجودين.

---

## 4. Component Reuse / Refactor / Rebuild / Remove Matrix

> أي REBUILD أو REPLACE أو REMOVE معاه الدليل وسبب إن إعادة الاستخدام مش مناسبة.

### 4.1 البنية الأساسية

| المكوّن | المسار (Kudu) | القرار | الدليل / السبب |
|---|---|---|---|
| Electron main + mode dispatch | `src/main/index.ts` | REFACTOR | سليم بشكل عام. ناقصه `will-navigate`/`web-contents-created`/`setPermissionRequestHandler` (0 نتائج [Verified]). وmode `--daemon` بيتشال مع الـ daemon |
| BrowserWindow security flags | `index.ts` (`contextIsolation`, `nodeIntegration:false`, `sandbox:!isRoot`) | REFACTOR | `sandbox` يفضل `true` دايماً بعد إلغاء تشغيل الـ GUI كـ root |
| Preload API (`window.kudu`) | `src/preload/index.ts` (197 `invoke`) | KEEP → REFACTOR بسيط | typed فعلاً ومفيهوش generic invoke. التغيير: تقسيم لـ namespaces + rename لما يجي الـ branding |
| CSP | `src/renderer/index.html:6-9` | KEEP | صارم فعلاً [Verified] |
| IPC hub + handlers | `src/main/ipc/index.ts`، 43 module، 224 channel | REFACTOR | wrapper للتحقق من الـ sender وschema لكل channel. **مش** إعادة كتابة للـ handlers |
| IPC validation | `services/ipc-validation.ts` | KEEP + توسيع | موجود وعليه tests |
| Renderer (React 19، 38 page، Zustand، i18n) | `src/renderer/src` | KEEP → REFACTOR (UX/brand في Stage 3) | لا يوجد سبب تقني لإعادة الكتابة |
| Platform abstraction | `src/main/platform/{types,win32,darwin,linux}` | KEEP + REFACTOR | نقل منطق Windows من ملفات IPC لـ `platform/win32` (التدفق العكسي `require()` في `win32/startup.ts`، `services.ts`) |
| Settings store | `services/settings-store.ts` (`runLocked`) | REFACTOR | إزالة `cloud.*` وplaintext fallback (`:159-170`) |
| Persistence (JSON stores) | `history-store.ts`، `recovery-store.ts`، `cleanup-receipts.ts`، `deletion-log-store.ts`، `storage-history-store.ts`، `trim-history-store.ts` | **KEEP** (تصحيح لـ ADR-006) | شغالين وعليهم tests. SQLite يتأجل (§10-C5) |
| Workers | `workers/yara-worker.ts`، `database-worker.ts` | KEEP | |
| Logger | `services/logger.ts` | REFACTOR | إزالة `cloud-agent.log` (`:36-39`) + مراجعة PII (RFI) |
| GPU fallback / renderer diagnostics | `services/gpu-fallback.ts` | KEEP | |
| Scheduler | `services/scheduler.ts`، `shared/schedule-policy.ts` | REFACTOR | الافتراضي يبقى scan&notify، و`autoApply` للـ cache بس |
| CLI | `src/main/cli.ts` | REFACTOR | إزالة `config set cloud.*`، و`--yes` للتنفيذ، والتنفيذ عبر الـ engine، وPrometheus على `127.0.0.1` (`cli.ts:2071`) |
| Auto-updater | `services/auto-updater.ts` | REFACTOR (feed) | الكود صالح. اللي بيتغير الـ feed (GitHub `AdventDevInc/kudu` ← HakTrak) واحترام إعداد المستخدم |
| Packaging | `electron-builder*.yml` | REFACTOR | `requireAdministrator` ← `asInvoker` (`:38`، `:57`). المعرّفات تتغير مع الـ branding |
| CI | `.github/workflows/*` | KEEP + REFACTOR | الـ matrix windows/macos/ubuntu موجودة [Verified `ci.yml:64`]. يتضاف smoke packaged لـ macOS وLinux x64 |

### 4.2 الحذف والاسترجاع

| المكوّن | القرار | الدليل / السبب |
|---|---|---|
| Deletion pipeline (`file-utils.ts`: `scanDirectory`، `cleanItems`، `safeDelete`) | **KEEP** (القلب) + REFACTOR | scan-ID binding وrevalidation وsymlink/hard-link handling قويين [Verified]. اللي بيتغير الـ primitive من `rm` ← Trash للـ classes المناسبة |
| `ExecutionEngine` | REFACTOR (غلاف حوالين الموجود) | **مش** محرك جديد. ده نقطة دخول موحدة بتستدعي `cleanItems`/`safeDelete` الموجودين، وتفرض الـ policy |
| Trash usage | KEEP + تعميم | 6 modules بتستخدم `shell.trashItem` فعلاً، ونمط fail-closed موجود (`malware-scanner.ipc.ts:2470-2475`) |
| Protected paths | REFACTOR (توحيد) | القوائم متفرقة: `file-shredder.ipc.ts:15-97`، وguard في empty-folders `:125`، وWindows probe `file-utils.ts:518-541` → module واحد |
| `DeletionPolicy` / `dataClass` | REBUILD (إضافة) | `rules.schema.json` مفيهوش تصنيف بيانات [Verified]. ده **حقل جديد** في schema موجود، مش schema جديد |
| Recovery (`recovery-store`، registry backups، seals، quarantine manifest) | KEEP | |
| Recovery Center (UI موحد) | REBUILD (ناقص) | مفيش واجهة بتجمع Trash + quarantine + snapshots |
| Receipts / History | KEEP | سجل صادق بالنتائج (deleted/failed/skipped) |

### 4.3 الصلاحيات

| المكوّن | القرار | الدليل / السبب |
|---|---|---|
| `PlatformElevation` (`platform/types.ts:208-211`) + `services/elevation.ts` | REFACTOR (توسيع) | موجود فيه `isAdmin()` بس. هيتضاف `runPrivileged(typedOp)` |
| Windows: `requireAdministrator` | **REMOVE** (الإعداد) | `electron-builder.yml:38,57` [Verified]. التطبيق كله، بما فيه الـ renderer و224 channel، بيشتغل admin. ده بيخالف Least Privilege المعتمد |
| Windows elevated helper | REBUILD (ناقص) | مفيش أي helper حالياً لأن التطبيق كله admin. **اللازم ده:** 42 rule target `needsAdmin` على Windows، و62 استدعاء PowerShell `-Command`، و18 ملف بيعمل `isAdmin` checks [Verified بالعدّ] |
| macOS/Linux elevated relaunch | REBUILD | `platform/linux/elevation.ts:39-52` بيعيد تشغيل الـ GUI كله كـ root بـ `--no-sandbox` [Verified]. ده بيقفل الـ sandbox ومينفعش يفضل |

### 4.4 الأمان المحلي

| المكوّن | القرار | الدليل / السبب |
|---|---|---|
| YARA-X engine + worker (`@litko/yara-x`) | KEEP | محلي، ومش بينفذ كود |
| YARA rule source (`yara-rules-store.ts`) | **REPLACE** (المصدر) + KEEP (الـ store logic) | بيعمل polling لـ `cloud.usekudu.com` لكل المستخدمين كل 6 ساعات (`malware-scanner.ipc.ts:2682-2683`، `yara-rules-store.ts:21,335`)، والـ integrity self-attested (`:236-237`). يتحول لـ bundle مضمن موقّع |
| PE heuristics / publisher trust / Authenticode | KEEP | |
| Quarantine | KEEP | |
| Security posture collectors | **KEEP** + REFACTOR (فك الـ type coupling) | موجودين لكل OS (`platform/types.ts:217-228`)، بس مستخدمين من الـ cloud agent بس. النوع `HealthReport` جاي من `cloud-agent-types` |
| Firewall audit، Privacy Shield، traces، app privacy | KEEP (+ REFACTOR عبر الـ engine) | |
| Threat Monitor engine | KEEP (الـ engine) | `services/threat-monitor.ts` محلي. التفعيل حالياً من `cloud-agent.ts:1610` بس، فالتفعيل يبقى محلي |
| Service safety KB | KEEP | `shared/service-safety-kb.ts` |
| Signature verification (Ed25519) | REBUILD (ناقص) | 0 استخدام لـ `crypto.verify`/Ed25519 في `src/main` [Verified] |

### 4.5 Kudu Cloud (REMOVE — بأدلة)

| المكوّن | القرار | الدليل / لماذا مش مناسب لإعادة الاستخدام |
|---|---|---|
| `services/cloud-agent.ts` (4,040 سطر) + `ipc/cloud-agent.ipc.ts` | **REMOVE** | (1) مربوط بخدمة تجارية تملكها Advent (`cloud.usekudu.com`)، والترخيص MIT مش بيغطيها. (2) 36 نوع أمر، منهم `shutdown` و`driver-update-install` و`run-dism`، وبتتصادق بالـ API key بس. مفيش signature/nonce/expiry (0 نتائج [Verified]). (3) بيرفع process list وdisk health افتراضياً (`settings-store.ts:83-85`). **اللي يتاخد كأنماط:** فحوص SSRF/DNS-rebinding (`:3800-3850`) وقيود التزامن |
| `daemon.ts` + `scripts/install.sh` daemon | REMOVE (Kudu) / DEFER (HakTrak agent — ADR-015) | نفس الـ agent، ومعاه `--api-key` على command line |
| `services/diagnostics-cloud.ts` | REMOVE | رفع لـ `cloud.usekudu.com` |
| `threat-blacklist-store.ts` (المصدر السحابي) | REPLACE (المصدر) | الـ validation فيه ممكن يتعاد استخدامه |
| Cloud pages: `CloudPage`، `CveScannerPage`، `BreachMonitorPage`، `ThreatMonitorPage` (جزء الـ upsell)، و`PerformanceDiagnosticsPage` (جزء الرفع) | REMOVE (Cloud/billing) / REFACTOR (Threat Monitor وDiagnostics كميزات محلية) / DEFER (CVE وBreach) | 7 روابط billing لـ Kudu |
| `program-safety.ipc.ts`، `startup-safety.ipc.ts` | REPLACE | بيرجعوا ratings من `cloudAgent` (`:7`) → KB محلي |
| Type coupling: `platform/*/security.ts` و`platform/types.ts` ← `cloud-agent-types` | REFACTOR | لازم يتفك **قبل** حذف الـ agent، وإلا الـ build هيقع (V-1/V-2) |

### 4.6 الميزات (تحويل 06 للتصنيف المعتمد)

قاعدة التحويل: **HARDEN ← REFACTOR**. **REWORK ← REFACTOR**، إلا لو الدليل بيثبت إن السلوك نفسه غلط، فساعتها REBUILD أو REMOVE.

| ميزات 06 | التصنيف المعتمد |
|---|---|
| #1–4، 7–10، 12، 19، 24، 26–32، 36، 38–39، 51–52، 56، 60 | **REFACTOR** |
| #5، 6، 13–18، 21–23، 25، 33، 40، 41، 46، 50، 58، 61 | **KEEP** |
| #20 File shredder | REFACTOR (إفصاح SSD/CoW + class `irreversible`) |
| #34 Recovery، #35 Receipts | KEEP (المنطق) + REBUILD (Recovery Center UI) |
| #37 Malware scanner | KEEP (engine) + REPLACE (rule source) |
| #42 Threat Monitor | KEEP (engine) + REFACTOR (تفعيل محلي) + DEFER (blocklist الخارجية: محتاجة موافقة على مزود) |
| #43 CVE scanner | REMOVE (مسار Kudu) + **DEFER** (Stage 8: مصدر بيانات الثغرات **مزود غير معتمد**) |
| #44 Breach monitor | REMOVE (مسار Kudu) + DEFER (Stage 5/6 عبر LeakRadar: PENDING API DOCUMENTATION) |
| #45 Safety ratings | REPLACE (KB محلي) |
| #47 Perf diagnostics | KEEP (التسجيل المحلي) + REPLACE (التحليل يبقى محلي) + REMOVE (الرفع لـ Kudu) |
| #48 Game Mode | REFACTOR + **REMOVE** `mem-clear-standby` (`game-mode.ipc.ts:422-428` بيشغّل `GC.Collect` في PowerShell منفصل، وده مش بيأثر على standby list بتاعة النظام) |
| #49 Health score | **REBUILD** (`DashboardPage.tsx:326-349`: 60 نقطة على استخدام الأدوات، فمش قياس للصحة) |
| #11 Environment cleaner | DEFER (مفيش tests) |
| #53 Daemon | REMOVE / DEFER |
| #54 Kudu Cloud | REMOVE |
| #55 Auto-update | REFACTOR (الـ feed) |
| #57 Elevated relaunch | REBUILD (§4.3) |
| #59 Share result | DEFER (قرار منتج) |
| 🆕 Local Security Posture | KEEP (collectors) + REBUILD (واجهة محلية) |

**النتيجة:** مفيش ولا ميزة محلية صالحة اتشالت. الـ REMOVE مقصور على 3 حاجات: ارتباط Kudu Cloud، و`mem-clear-standby`، و`requireAdministrator`.

---

## 5. Corrected Desktop and Cloud Boundaries

```
 TODAY (Kudu 942af64)                         HAKTRAK DESKTOP (Stages 1–3)            FUTURE (Stage 4+)
 ─────────────────────                        ─────────────────────────────           ──────────────────
 Electron/React/TS app ──────────────────────▶ same app, refactored in place
 requireAdministrator ───────────────────────▶ asInvoker + PlatformElevation helper
 rm-based cleaners ──────────────────────────▶ same cleaners → ExecutionEngine (Trash-first)
 YARA rules from cloud.usekudu.com ──────────▶ signed bundled rules (offline)
 posture collectors (cloud-only use) ────────▶ Local Security Posture page
 cloud-agent.ts / daemon / Cloud pages ──X──▶ removed                                 ┌─ HakTrak Cloud (separate repo)
                                                (no cloud code in Stages 1–3)          │  identity, tenants, devices,
                                              optional Cloud Connector module ◀───────┤  policy, commands, audit
                                                (feature-flagged, OFF by default,     │       │
                                                 added only in Stage 4)               │       ▼
                                                                                       └─ Intelligence Gateway
                                                                                            └─ adapters: VirusTotal, LeakRadar
```

| الطبقة | فيها إيه | مفيهاش إيه | متى |
|---|---|---|---|
| **Desktop (Kudu اللي اتطور)** | كل التنظيف والتحليل والاسترجاع وإدارة النظام والأمان المحلي والقواعد الموقعة | أي مفتاح مزود، أي اتصال بمزود مباشر، أي dependency على الـ cloud | Stages 1–3 (الشغل الحالي) |
| **Cloud Connector (جوه الـ Desktop)** | enrollment وsync للبيانات الموافق عليها وpull للأوامر والتحقق المحلي منها | منطق business للـ cloud | Stage 4 (مقفول افتراضياً) |
| **HakTrak Cloud** | 02 كله | تنفيذ على الجهاز | Stage 4+ |
| **Intelligence Gateway** | 03 §1 | endpoint عام | Stage 5 |

**واجهة الاتصال:** HTTPS API بإصدار (`/v1`، 02 §1.5)، وكل request موقع بمفتاح الجهاز، والأوامر بـ pull (ADR-014). **لو الـ cloud وقع، الـ Desktop بيكمل شغل 100% في كل وظائفه المحلية.** والفحص بيكون اختبار egress في VM: مفيش أي اتصال بدون موافقة (T-1.08 القديمة).

---

## 6. Corrected API Integration Strategy

| الفئة | المحتوى | الحالة |
|---|---|---|
| **A. وظائف محلية موجودة** | YARA وheuristics والـ posture والـ firewall والـ KB المحلي والقواعد الموقعة. محتاجة **صفر** مزودين خارجيين | Stages 2–3 |
| **B. وظائف backend مستقبلية** | الهوية والأجهزة والسياسات والتنبيهات والتقارير والأوامر | Stage 4+ |
| **C. تكاملات مزودين مستقبلية** | VirusTotal وLeakRadar فقط، عبر الـ Gateway | Stage 5. **غير مصرّح بالتنفيذ** |

**قواعد ثابتة:**
- الـ Desktop مش بيعرف أسماء المزودين.
- مفيش أي مفتاح في Electron أو logs أو docs أو config الـ client.
- المفاتيح في secrets manager في الـ backend بس.
- rate limits وcache وauthz وaudit على كل طلب.
- مفيش رفع ملفات تلقائي.
- الـ hash lookup والـ file submission عمليتين منفصلتين.
- الـ attribution والـ timestamps إلزاميين.

**ملحوظة عن الأسرار الموجودة:** `VIRUSTOTAL_API_KEY` في `distribute-release.yml` تبع CI بتاع Kudu، وده **اسم secret بس** لرفع ملفات الـ release. مش جزء من المنتج، ولازم يتشال أو يتستبدل في Stage 9، ومش هيتعاد استخدامه كمفتاح للمنتج.

---

## 7. Confirmed LeakRadar and VirusTotal Placement

| المزود | الدور | الموقع | الحالة | ترتيب التنفيذ |
|---|---|---|---|---|
| **VirusTotal** | Reputation للـ hash/URL/domain/IP (الـ submission استثناء بموافقة لكل ملف) | Adapter في Intelligence Gateway | **PENDING API DOCUMENTATION** (نوع الاشتراك، الحصص، الاستخدام التجاري، سياسة الملفات المرفوعة) | الأول في Stage 5: lookup للـ hash، وبعده submission |
| **LeakRadar** | Exposure للإيميل/الدومين لحسابات اتأكدت ملكيتها | Adapter في Intelligence Gateway | **PENDING API DOCUMENTATION** (المعلومات الـ 12 الناقصة في `03 §2`) | التاني في Stage 5، وExposure Monitoring في Stage 6/8 |

**تصحيح المسمى:** "BLOCKED BY API DOCUMENTATION" (في 00 و03 و07 و08) يتغير لـ **PENDING API DOCUMENTATION**. المعنى واحد، والمسمى الجديد هو المعتمد.

**شروط بدء أي adapter:** وثائق رسمية + تأكيد الترخيص والـ entitlements + الـ Cloud foundation شغالة (Stage 4) + موافقتك الصريحة.

---

## 8. Future Provider Extension Design

- **العقد:** `IntelProviderAdapter` (`03 §1.2`) و`NormalizedIntelResult` (`03 §1.3`) هما الواجهة الوحيدة. أي مزود جديد = adapter + config في الـ Gateway، **من غير أي تغيير في الـ Desktop**.
- **التسجيل:** registry للـ adapters فيه `id` وsupported indicator types/operations وlimits جاية من الوثائق، و`enabled` per tenant. الافتراضي **disabled**.
- **البوابة الإدارية لإضافة مزود:**
  1. موافقة صريحة منك.
  2. وثائق رسمية.
  3. مراجعة الترخيص والشروط.
  4. تقييم خصوصية (إيه اللي بيتبعت).
  5. threat model للـ adapter.
  6. اختبارات عقد (contract tests) بـ mock.
- **ممنوع:**
  - أي import لمكتبة مزود في feature modules الـ Desktop.
  - أي مزود إلزامي لوظيفة محلية.
  - أي مزود خارج VirusTotal/LeakRadar في النطاق الحالي.
- **مرشحين اتذكروا في وثائق سابقة وبقوا Stage 8 فقط (مش معتمدين):** HIBP، abuse.ch (URLhaus/ThreatFox)، OSV، NVD. ومصادر قواعد YARA (YARA-Forge، signature-base) **مش** runtime providers، دي **محتوى مضمن** محتاج مراجعة ترخيص (OQ-11).

---

## 9. Corrected Implementation Roadmap

**التعديل الأساسي:** Waves 1–9 القديمة تتعاد ترتيبها على Stages 1–9 المعتمدة. المهام نفسها (T-x.xx في 07) **فاضلة**. اللي بيتغير ترتيبها وتجميعها، وكمان إضافة Stage 1 صريحة.

| Stage | المحتوى | مهام 07 المرتبطة | التغيير عن 07 |
|---|---|---|---|
| **1 — Existing Kudu Foundation** | نقل Kudu للمستودع، baseline، خريطة الـ modules، تحديد حدود الترحيل | T-1.01، T-1.03 + **جديد:** S1-a نقل التاريخ، S1-b inventory للعمليات المرتفعة، S1-c فك الـ type coupling بتاع الـ cloud | Stage مستقلة. **مفيش أي تغيير في السلوك** |
| **2 — Desktop Security & Reliability** | IPC وguards وLeast Privilege وExecutionEngine وProtected paths وTrash-first وRecovery وstorage آمن وسجل العمليات | T-1.02، 1.04، 1.05، 1.06، 1.09، 1.10، 1.11، 1.12، **T-1.08 (إزالة Kudu Cloud)**، T-3.07 (PowerShell) | T-1.07 (SQLite) ← DEFER. إزالة Kudu Cloud هنا لأنها أمنية (S-02/S-05) |
| **3 — HakTrak Desktop Transformation** | الـ branding المتحكم فيه (محتاج Brand Kit)، UX، تحسين الميزات (W2)، تكافؤ الأنظمة، الأمان المحلي، القواعد الموقعة | T-2.01…2.09، T-3.01…3.06، Phase 2/3 من Master | الـ branding جزء صريح من الـ Stage. **مفيش استبدال للتطبيق** |
| **4 — HakTrak Cloud Foundation** | 02 | T-4.01…4.10 | **تنفيذ مستقبلي.** مش جزء من الشغل الحالي |
| **5 — First Intelligence Integrations** | VirusTotal ثم LeakRadar | T-5.01…5.07 | بعد Stage 4 والوثائق |
| **6 — Device Management** | inventory وhealth وposture وalerts وpolicies وreports | T-6.01…6.07 | — |
| **7 — Controlled Remote Management** | 04 | T-7.01…7.07 | بعد ما الأسس (4–6) تتحقق |
| **8 — Additional External Services** | مزودين جداد عبر الـ adapters + الميزات المتقدمة اللي محتاجاهم (CVE وblocklists) | T-8.01، 8.03 (بعد موافقة على مزود)، T-8.02 (exposure) | CVE وthreat feeds اتنقلوا هنا لأنهم بيعتمدوا على مزودين غير معتمدين |
| **9 — Production Readiness** | 07 Wave 9 | T-9.01…9.07 | بتتكرر قبل كل إصدار |

**مهام ملهاش مزود خارجي ومش لازم تستنى Stage 8** (اقتراح، بدليل الاعتماديات): الـ platform gaps في T-8.07 (macOS/Linux uninstaller، Linux `.desktop`، macOS Login Items، Linux autostart). دي **محلية بحتة**، فأنا شايف إنها تتنقل لـ **Stage 3** (تكافؤ الأنظمة). وT-8.08 (مفاتيح hardware) تفضل مع Stage 4+.

**الإصدارات:** R1 = Stages 1–3 (منتج HakTrak Desktop محلي كامل). وباقي الـ stages كل واحدة إصدار أو أكتر بعدها.

**لكل مهمة تنفيذ (سياسة جهاز التطوير):** لازم تتحدد الحاجات دي: shared code، والكود الخاص بكل من Windows وmacOS وLinux، والصلاحيات، والـ native deps، ومتطلبات البناء، والاختبارات على كل نظام. **Build ناجح على macOS مش دليل إنه هيشتغل على Windows أو Linux.**

---

## 10. Contradictions and Risks Found in Previous Phase 1 Work

### 10.1 تعارضات وتصحيحات مقترحة (بالملف والقسم)

| # | الموقع | المشكلة | التصحيح المقترح (من غير ما أعيد كتابة الوثيقة) |
|---|---|---|---|
| C-1 | `00 §6` + `00` نهايته + `03 §2` + `07 T-5.06` + `08 R-05` | "BLOCKED BY API DOCUMENTATION" | يتغير لـ "PENDING API DOCUMENTATION" |
| C-2 | `00 OQ-14`، `08 R-05`، `CLOUD_DEPENDENCIES_AUDIT §4`، `PRODUCT_OPPORTUNITIES #6/#13` | ذكر HIBP وabuse.ch وOSV/NVD كبدائل | إضافة "Future provider — not in current scope, requires approval (Stage 8)" |
| C-3 | `06` الـ legend | KEEP/HARDEN/REWORK | الجدول في §4.6 هنا هو المرجع، وHARDEN/REWORK يتفهموا REFACTOR |
| C-4 | `01 §1.2` (Privilege Broker "جديد") و`01 §1.7` | بيتجاهل `PlatformElevation` الموجود | "REFACTOR: extend `PlatformElevation` (`platform/types.ts:208`)، وREBUILD لآلية الـ relaunch بس" |
| C-5 | `01 §1.2` (Local DB)، `ADR-006`، `07 T-1.07` | ترحيل JSON → SQLite بدري من غير دليل احتياج | ADR-006 ← **Deferred**. الـ JSON stores الحالية تفضل (KEEP) في Stages 1–3. SQLite يتعاد تقييمه لو الـ command ledger أو intel cache في Stage 4+ احتاجوه |
| C-6 | `01 §1.3` | هيكل مجلدات جديد ممكن يتفهم restructure شامل | "Target layout reached incrementally per task; no bulk file moves" |
| C-7 | `07 §0` + Waves | الترتيب Waves 1–9 | يتستبدل بـ §9 هنا |
| C-8 | `07 W1` (T-1.08 في نفس الـ wave مع الـ broker) | مفيش خطوة "فك الـ type coupling" قبل الحذف | S1-c في Stage 1 |
| C-9 | `08 ADR-011` (TypeScript backend) | قرار backend بدري مش محتاج دلوقتي | ADR-011 يفضل **Proposed — decide at Stage 4 start** |
| C-10 | `00 §1` (الملخص) | بيبدأ بالـ 3 طبقات بنفس الوزن | جملة أولى صريحة: "HakTrak Desktop = Kudu codebase evolved in place؛ Cloud = future separate product" |
| C-11 | `02` كله | ممكن يتفهم إنه شغل حالي | ملاحظة في الأول: "Reference design for Stage 4+. Not authorized for implementation." |
| C-12 | `03 §3.2` البند 7 (signed upload URL من الـ Desktop مباشرة) | ممكن يفتح اتصال مباشر من الـ Desktop لمزود | يتشال كبديل. الرفع يبقى عبر HakTrak backend **فقط**، عشان يطابق تدفق الـ API المعتمد |
| C-13 | `07 T-8.07` | تكافؤ الأنظمة المحلي اتأجل لـ Stage 8 | ينتقل لـ Stage 3 (§9) |
| C-14 | `PLATFORM_COMPATIBILITY.md` | مفيش ذكر لجهاز التطوير | إضافة: التطوير على macOS Intel، والتحقق من Windows/Linux عبر CI runners أو VMs أو أجهزة حقيقية |

### 10.2 مخاطر جديدة / متحدّثة

| ID | الخطر | الأثر | Mitigation |
|---|---|---|---|
| R-23 | جهاز التطوير macOS Intel: الـ Windows broker وUAC وregistry وservices **مستحيل يتختبروا محلياً** | High | Windows VM أو CI runner (`windows-latest` موجود في `ci.yml`) + جهاز Windows حقيقي للعمليات المدمرة. ممنوع الإعلان عن دعم Windows من build على mac |
| R-24 | macOS Intel: لازم أتأكد إن Electron 45 والـ native modules (`better-sqlite3`، `@litko/yara-x` darwin-x64) لسه بيدعموا x64 والإصدار الحالي من macOS | Medium | T-1.01 على الجهاز نفسه. **[Unverified]** |
| R-25 | مستودع `Fabric-Cleaner` من غير كود Kudu. لو الكود اتنقل من غير التاريخ، الـ attribution والـ cherry-pick من upstream هيضيعوا | Medium | نقل التاريخ كامل + `upstream` remote (§12-D1) |
| R-26 | التضخم: تفاصيل الـ cloud ممكن تسحب الجهد بدري | Medium | الـ cloud مقفول حتى Stage 4 بقرار صريح |
| R-27 | إزالة Kudu Cloud بتلمس 17 ملف، ومن غير فك الـ types الـ build هيقع | Medium | S1-c قبل T-1.08 |

---

## 11. Missing Technical Evidence

| # | الدليل الناقص | ليه مهم | كيف يتجاب | Stage |
|---|---|---|---|---|
| E-01 | **Baseline run** (`npm ci`، `npm run check`، build، CLI smoke) على 3 أنظمة | كل قرار KEEP مبني على قراءة الكود بس، من غير تشغيل | T-1.01. على macOS Intel محلياً + CI لـ Windows/Linux | 1 |
| E-02 | Inventory لكل عملية بتحتاج admin على Windows | حجم شغل `asInvoker` | البداية [Verified]: 42 `needsAdmin` rule، و62 PowerShell `-Command`، و18 ملف `isAdmin`. لسه ناقص ربطها بالـ IPC channels | 1 |
| E-03 | Per-channel IPC inventory (224) | الـ IPC hardening | T-1.03 | 1 |
| E-04 | Output الـ posture collectors على كل نظام | ميزة Local Posture | تشغيل read-only في VMs | 1–3 |
| E-05 | Offline fresh install والـ YARA (U-1) | إثبات المشكلة | VM من غير شبكة | 1 |
| E-06 | Linux autostart no-op (U-2) | الـ schedules | VM reboot | 1 |
| E-07 | macOS Trash restore (مفيش API رسمي) | Recovery Center | تجربة على mac | 2 |
| E-08 | Electron 45 على macOS Intel/الإصدار الحالي | جهاز التطوير | T-1.01 | 1 |
| E-09 | PowerShell interpolation audit (S-11) | الأمان | T-3.07 | 2 |
| E-10 | AppImage update signature (U-3) | التحديثات | Stage 9 | 9 |
| E-11 | وثائق LeakRadar | Stage 5 | منك | 5 |
| E-12 | وثائق/عقد VirusTotal | Stage 5 | منك | 5 |
| E-13 | ترخيص قواعد YARA المضمنة | Stage 3 | مراجعة ترخيص | 3 |

---

## 12. Decisions Still Required

| ID | القرار | التوصية | يحجب |
|---|---|---|---|
| **D1** | إزاي كود Kudu يدخل `Mousssaa/Fabric-Cleaner`؟ (أ) push لتاريخ Kudu كامل عند `v3.11.0` في `main` + remote `upstream` · (ب) GitHub fork · (ج) نسخ من غير تاريخ | **(أ)**: بيحافظ على التاريخ والـ attribution والقدرة على cherry-pick، والمستودع يفضل private | Stage 1 كلها |
| D2 | Fork عند `v3.11.0` ولا `942af64`؟ | `v3.11.0` + cherry-pick للـ commits الستة بعد مراجعتها | D1 |
| D3 | OQ-01: الـ cache يروح الـ Trash افتراضياً؟ | أيوه. والحذف النهائي اختيار صريح لكل عملية (مش تلقائي، وده متوافق مع "No automatic permanent deletion") | Stage 2 |
| D4 | ADR-006: تأجيل SQLite؟ | أيوه (C-5) | Stage 2 |
| D5 | OQ-12/13: registry cleaner والـ debloater والـ drivers تحت "Advanced"، وإزالة `mem-clear-standby` | أيوه | Stage 2–3 |
| D6 | نقل platform gaps لـ Stage 3 (C-13) | أيوه | Stage 3 |
| D7 | مصادر قواعد YARA المضمنة (OQ-11) | مراجعة ترخيص قبل Stage 3 | Stage 3 |
| D8 | الحد الأدنى للأنظمة (OQ-10) + بيئات الاختبار (Windows VM أو جهاز، Linux VM) | تحددهم قبل Stage 2 | Stage 2 |
| D9 | Brand Kit | — | branding في Stage 3 |
| D10 | قرارات الـ cloud (OQ-04، 05، 06، 08، 15، 18، 22) | **تتأجل لبداية Stage 4.** مش محتاجينها دلوقتي | Stage 4 |
| D11 | PR #1 (الوثائق): merge؟ وهل الـ addendum ده يتضاف له؟ | أيوه للاتنين، بموافقتك (الـ addendum لسه مش committed) | — |

---

## 13. Recommended Next Development Stage

**Stage 1 — Existing Kudu Foundation.** بعد موافقتك الصريحة بس، وبعد قرار D1 وD2.

النطاق المقترح لـ Stage 1، **من غير أي تغيير في سلوك التطبيق**:
1. نقل تاريخ Kudu لـ `Fabric-Cleaner` عند `v3.11.0` + `UPSTREAM.md` + `upstream` remote (D1/D2).
2. Baseline run: على macOS Intel محلياً، وعلى Windows/Linux عبر CI. والنتائج تتسجل بأمانة (E-01، E-08).
3. خريطة الـ modules الكاملة + inventory للعمليات المرتفعة (E-02) + inventory للـ IPC (E-03).
4. تحديد حدود الترحيل: خطة فك الـ `cloud-agent-types` coupling (S1-c) وترتيب PRs الـ Stage 2.
5. التحقق من الـ inferences: U-1، U-2، والـ posture output (E-04 إلى E-06).

**مخرجات Stage 1:** تقرير baseline حقيقي + خرائط + خطة PRs لـ Stage 2. ولسه **مفيش** أي تعديل على الحذف أو الصلاحيات أو الـ cloud.

---

## Final Quality Check

| البند | ✓ |
|---|---|
| HakTrak Desktop بيتطور من مستودع Kudu نفسه | ✅ §3، §5 |
| مفيش إعادة كتابة للـ Desktop من غير دليل. كل REBUILD/REPLACE/REMOVE معاه دليل | ✅ §4 |
| الميزات المحلية الصالحة محفوظة | ✅ §4.6 |
| الـ Local Core مش معتمد على الـ Cloud | ✅ §5 |
| Kudu Cloud مش مستخدم | ✅ §4.5 |
| Hybrid لسه المعمارية المعتمدة | ✅ §5 |
| LeakRadar وVirusTotal أول مرشحين، وحالتهم PENDING API DOCUMENTATION | ✅ §7 |
| المزودين الآخرين امتداد مستقبلي (Stage 8)، مش النطاق الحالي | ✅ §8، C-2 |
| مفاتيح المزودين مش في Electron | ✅ §6، C-12 |
| تنفيذ الـ Cloud منفصل عن تحويل الـ Desktop | ✅ §5، §9، C-11 |
| الـ Remote Management مش بيتخطى الأمان المحلي | ✅ (`04` بدون تغيير، §9 Stage 7) |
| النطاق الكامل متغطي في الـ roadmap | ✅ §9 |
| Windows وmacOS وLinux كلهم في النطاق | ✅ §9، R-23 |
| مفيش تعديل في الكود أو الإعدادات | ✅ |

REVIEW STATUS: COMPLETE
(المراجعة كاملة. التكاملين لسه PENDING API DOCUMENTATION، وده مش بيمنع المراجعة.)

DESKTOP STRATEGY: EVOLVE THE EXISTING KUDU CODEBASE — NOT A FROM-SCRATCH REWRITE.

NO APPLICATION SOURCE CODE OR CONFIGURATION FILES WERE MODIFIED.
