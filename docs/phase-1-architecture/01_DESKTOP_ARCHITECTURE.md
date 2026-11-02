# 01 — Desktop Architecture, Cleanup & Recovery, Platform Compatibility

> كل ما هنا **[Design]** ما لم يُذكر **[Verified]**. لا شيء متنفذ أو متجرب.

## 1. Desktop Target Architecture (Deliverable 3)

### 1.1 المبادئ

1. **Main process يشتغل بصلاحيات المستخدم العادي** على كل الأنظمة (Windows `asInvoker`). الصلاحيات المرتفعة فقط عبر Privilege Broker قصير العمر.
2. **Renderer غير موثوق:** أي قرار أمني يتاخد في main. الـ renderer يبعت IDs ونوايا، مش مسارات وأوامر.
3. **نقطة تنفيذ واحدة** لأي تغيير على النظام: `ExecutionEngine`.
4. **Cloud اختياري ومعزول:** وحدة `CloudConnector` مقفولة لحد التسجيل، ولا تملك صلاحية تنفيذ مباشرة؛ بتسلّم أوامر موثّقة لنفس `ExecutionEngine` عبر نفس السياسات + موافقة محلية.
5. **إعادة استخدام الكود الحالي** حيث هو قوي (scan-ID binding، revalidation، receipts، recovery-store، quarantine manifest) بدل إعادة الكتابة.

### 1.2 المكونات

| المكون | المسؤولية | من كود Kudu | التغيير المطلوب |
|---|---|---|---|
| **Electron Main** | lifecycle، نوافذ، tray، تسجيل IPC، scheduler | `src/main/index.ts`، `ipc/index.ts`، `services/scheduler.ts` | إضافة guards (1.4)، إزالة mode `--daemon`، فصل منطق الـ Windows من ملفات IPC إلى `platform/win32` |
| **Renderer** | واجهة فقط | `src/renderer/src` (38 page) | إزالة صفحات Kudu Cloud؛ لا منطق أمني |
| **Preload** | API مكتوب الأنواع، لا generic invoke | `src/preload/index.ts` (197 invoke) | تقسيم الـ API لـ namespaces حسب capability (`clean`, `security`, `cloud`…)، وإخفاء namespace الـ cloud لو مش enrolled |
| **SecureIpcRouter** | wrapper حوالين `ipcMain.handle` | جديد (حالياً validation per handler: `services/ipc-validation.ts`) | (أ) sender check: `event.senderFrame.url` لازم = app origin والـ frame = main frame؛ (ب) schema validation إجباري لكل channel (zod/valibot أو validators الحالية)؛ (ج) capability tag لكل channel (`read`, `mutate`, `privileged`, `cloud`)؛ (د) rate-limit للعمليات الثقيلة |
| **Local DB** | تاريخ، receipts، recovery index، consent، command ledger، cache للـ intel | حالياً JSON files (`history.json`، `recovery/changes.json`، `deleted-files*.jsonl`…) | SQLite عبر `better-sqlite3` (موجود بالفعل كـ dependency) — ADR-006. ترحيل تدريجي؛ `config.json` يفضل JSON |
| **Cleaning Engine** | scanners لكل فئة + rules loader | `services/file-utils.ts`، `rules/loader.ts`، `ipc/*-cleaner.ipc.ts` | الـ scanners تنتج `OperationPlan` فقط؛ لا تحذف بنفسها |
| **ExecutionEngine** | المنفذ الوحيد | جديد، يغلّف `safeDelete`/`cleanItems` الحاليين | §2 |
| **Security Engine** | YARA-X worker، PE heuristics، publisher trust، quarantine، posture collectors، firewall audit، startup safety KB | `services/yara-engine.ts`، `workers/yara-worker.ts`، `ipc/malware-*.ts`، `platform/*/security.ts` | فصل posture عن `cloud-agent-types` (V-1)؛ startup/program safety من KB محلي بدل cloud |
| **Privilege Broker** | تنفيذ عمليات مرتفعة الصلاحية | حالياً: Windows كله admin؛ mac/Linux relaunch GUI كـ root بـ `--no-sandbox` (`platform/linux/elevation.ts:39-52`) | §1.7 |
| **Recovery Subsystem** | Trash records، quarantine، registry/service backups، restore | `services/recovery*.ts`، `registry-backups.ts`، `registry-backup-seal.ts`، quarantine | توحيد في Recovery Center (§2.6) |
| **Local Intelligence** | قواعد موقعة: YARA، startup/program KB، blocklists، protected-path updates | `yara-rules-store.ts` (cloud)، `shared/service-safety-kb.ts` | bundles موقعة Ed25519 مضمنة في الإصدار + تحديث اختياري من HakTrak feed (§1.9) |
| **Device Identity** | زوج مفاتيح الجهاز | `getMachineId()` UUID فقط (V-3) | §1.10 |
| **Cloud Connector** | enrollment، sync outbox، command pull، posture upload | `cloud-agent.ts` (يُحذف) | بناء جديد صغير؛ off افتراضياً |
| **Update Manager** | تحديثات التطبيق | `services/auto-updater.ts` (GitHub `AdventDevInc/kudu`) | HakTrak feed؛ لا check بدون موافقة لو المستخدم قفل التحديثات (حالياً الـ check بيشتغل دايماً) |

### 1.3 هيكل المجلدات المقترح (داخل المستودع لاحقاً — لم يُنشأ)

```
src/main/
  core/            execution-engine/, policy/ (deletion-policy, protected-paths), receipts/, recovery/
  ipc/             thin handlers only → call core/services
  services/        scanners, security engine, scheduler, local-intel
  platform/        win32|darwin|linux/ (+ permissions, trash, broker-client, uninstaller, disk-repair)
  broker/          privileged helper entrypoints per OS (separate build target)
  cloud/           connector, identity, command-verifier, outbox   (feature-flagged)
  db/              sqlite schema + migrations
src/shared/        types, ipc schemas, policy enums
```

### 1.4 Electron hardening (يسد S-03، S-17)

- `app.on('web-contents-created')`: منع `<webview>`، `setWindowOpenHandler → deny` (موجود للنافذة الرئيسية)، `will-navigate` و`will-redirect` → `preventDefault()` لأي URL غير `file://…/renderer/index.html`.
- `session.setPermissionRequestHandler` و`setPermissionCheckHandler` → deny-all (ما عدا ما يتوثق).
- `SecureIpcRouter` يرفض أي sender مش main frame للتطبيق.
- إبقاء CSP الحالي (`src/renderer/index.html:6-9` [Verified]) و`contextIsolation`، `nodeIntegration:false`، **و`sandbox:true` دائماً** (بعد إلغاء تشغيل الـ GUI كـ root).
- Electron Fuses: تعطيل `RunAsNode`، `EnableNodeCliInspectArguments`، تفعيل `EnableEmbeddedAsarIntegrityValidation` و`OnlyLoadAppFromAsar` (لازم تتأكد من دعمها على كل OS في Wave 9).

### 1.5 IPC capability model

| Tag | مثال | شرط |
|---|---|---|
| `read` | scan، list startup items | sender valid + schema |
| `mutate` | تنفيذ OperationPlan | + confirm token صادر من main لنفس الـ plan hash، صالح دقائق، مرة واحدة |
| `privileged` | HKLM، services، drivers | + broker + UAC/polkit/admin prompt |
| `cloud` | enroll، sync | + cloud enabled + consent |

### 1.6 Local data model (SQLite) — جداول أساسية

`operations` (plan id، نوع، hash، الحالة) · `operation_items` (target، class، action، result، reason) · `receipts` · `recovery_entries` (نوع الاسترجاع: trash/quarantine/registry-backup/service-snapshot، original path، location، expiry) · `scan_cache` (TTL) · `consents` (scope، version، granted_at، revoked_at) · `command_ledger` (command_id، nonce، seq، status، hash) · `intel_cache` (indicator ref، provider، result، expires_at) · `rule_bundles` (type، version، signer key id، verified_at) · `audit_local` (append-only، hash chain).

قاعدة: **لا محتوى ملفات** في الـ DB؛ المسارات فقط، وقابلة للمسح من الإعدادات.

### 1.7 Privilege Broker

| OS | التصميم الموصى به | البدائل المرفوضة | السبب |
|---|---|---|---|
| Windows | `haktrak-broker.exe` منفصل، manifest `requireAdministrator`، يتشغل عند الطلب بـ `ShellExecute runas` (UAC prompt)، قناة named pipe بـ ACL للمستخدم الحالي + nonce مولد من main، ينفذ batch من عمليات typed allowlisted ثم يخرج | (أ) Windows Service دائمة: سطح هجوم دائم بـ SYSTEM؛ (ب) إبقاء `requireAdministrator` | least privilege؛ ADR-002 |
| macOS | privileged helper عبر `SMAppService` (macOS 13+) بـ XPC وتحقق code-signing requirement للعميل؛ لحد ما يتبني: `osascript … with administrator privileges` لتشغيل helper CLI قصير (**مش** إعادة تشغيل الـ GUI كـ root) | relaunch GUI كـ root (الحالي) | الحالي يعطل sandbox الـ renderer (S-04) |
| Linux | polkit action (`org.haktrak.broker.*`) + helper بـ `pkexec`، typed JSON على stdin، يخرج بعد batch | relaunch GUI كـ root بـ `--no-sandbox` (الحالي) | نفس السبب |

قواعد مشتركة: الـ broker **يعيد** فحص `ProtectedPathPolicy` بنفسه (لا يثق في main)، لا يقبل shell strings، كل عملية لها schema، لا شبكة، يسجل في audit المحلي، timeout.
**"لا خدمة privileged دائمة"** — أي استثناء (مثلاً unattended enterprise ops) يحتاج ADR-015 منفصل.

### 1.8 Security Engine

- **Detection states إلزامية:** `detected` (signature match) · `suspicious` (heuristic) · `unknown` · `clean-for-checked-scope`. ممنوع عرض heuristic كـ malware مؤكد.
- **Actions:** quarantine افتراضي، delete = Trash عبر `ExecutionEngine`، لا auto-action.
- **Posture:** إعادة استخدام collectors الحالية (V-1) بنوع `SecurityPosture` محلي جديد بدل `HealthReport`؛ كل check ليه حالة `pass/fail/not-applicable/unknown/needs-permission` — **مش score**.
- **YARA:** قواعد مضمنة موقعة في كل إصدار (يسد U-1/S-05/S-06).

### 1.9 Local Intelligence & signed content

- صيغة bundle: `manifest.json` (type، version، created_at، min_app_version، files[sha256]) + `manifest.sig` (Ed25519). المفاتيح العامة **مثبتة في التطبيق** (root key offline + signing key قابل للتدوير موقع من الـ root).
- تحقق: signature → hashes → schema → حدود الحجم/العدد → rollback protection (version لا يقل) → تفعيل atomic مع الاحتفاظ بالنسخة السابقة.
- مصادر: (1) مضمن في الإصدار — يكفي offline؛ (2) HakTrak feed اختياري (opt-in للمستخدم الشخصي، policy للمؤسسة).

### 1.10 Device Identity

- عند enrollment فقط: توليد Ed25519 keypair محلياً (Node `crypto`)، تخزين الـ private key مشفر بـ `safeStorage` (DPAPI/Keychain/libsecret). **لو `safeStorage` مش متاح أو backend = `basic_text` → enrollment يرفض** (نمط موجود: `ipc/performance-diagnostics.ipc.ts:16-24` [Verified]).
- لاحقاً (Wave 8/9): hardware-backed (TPM عبر CNG، Secure Enclave) كتحسين — يحتاج native module.
- Cloud يصدر `device_id` + شهادة/credential قصيرة العمر مربوطة بالـ public key. كل request موقع (proof-of-possession) + TLS.
- `machineId` الحالي لا يُرسل للـ cloud.

### 1.11 Cloud Communication

- HTTPS فقط، TLS 1.2+، cert validation عادي (pinning للـ API اختياري — OQ مؤجل، خطر الـ bricking).
- **Pull model:** الجهاز يسأل `/v1/devices/{id}/commands` كل N دقائق مع backoff؛ WebSocket/SSE اختياري كـ "wake hint" **بدون payload أوامر** (ADR-014).
- Outbox محلي للبيانات الموافق عليها فقط، مع retry وحد أقصى للحجم.

### 1.12 Offline Operation

| الحالة | السلوك |
|---|---|
| أول تشغيل بدون شبكة | كل Layer A يعمل؛ YARA بقواعد مضمنة؛ لا محاولة اتصال إلا update check لو المستخدم مفعله |
| Cloud مسجل والشبكة مقطوعة | لا تأثير على الوظائف المحلية؛ الـ outbox يتراكم لحد حد أقصى ثم يسقط الأقدم مع تسجيل |
| أمر وصل قبل الانقطاع | ينفذ فقط لو لسه صالح (expiry) ومتوافق عليه محلياً |
| Intel lookups | تظهر "غير متاح offline" — لا نتائج قديمة بدون ختم الوقت |

### 1.13 Update Management

- electron-updater على HakTrak feed (GitHub Releases لريبو HakTrak أو HTTPS server)، توقيع Windows (Authenticode) ومacOS (notarization) إلزامي؛ Linux AppImage: توقيع منفصل (OQ في Wave 9، U-3).
- update check يحترم إعداد المستخدم (حالياً بيشتغل دايماً — [Verified] المرحلة 0 `auto-updater.ts:127`).
- Enterprise: قناة/تأجيل عبر policy.

---

## 2. Cleanup & Recovery Architecture (Deliverable 13)

### 2.1 Workflow

```
Scan ─▶ Review ─▶ Confirm ─▶ Revalidate ─▶ Execute ─▶ Report ─▶ Recover
 │        │          │           │            │          │          │
 │ main   │ renderer │ main      │ main/      │ adapters │ receipt  │ Recovery Center
 │ builds │ shows    │ issues    │ broker     │ (trash/  │ (actual  │ (trash restore,
 │ Plan   │ items +  │ one-time  │ re-lstat,  │ quarant./│ results, │ quarantine,
 │ (IDs)  │ class +  │ token for │ realpath,  │ backup)  │ partial  │ registry/service
 │        │ why safe │ plan hash │ identity,  │          │ failures)│ snapshots)
```

### 2.2 `ExecutionEngine` — قواعد ثابتة

1. **لا cleaner module يحذف بنفسه.** أي `rm`/`unlink`/`shell.trashItem`/`reg delete`/service change خارج `core/` يُمنع بـ ESLint rule (`no-restricted-imports`/`no-restricted-syntax`) + اختبار CI بيعمل grep.
2. المدخل: `OperationPlan { planId, createdAt, items[{ itemId, target, class, action, expectedIdentity(dev,ino,size,mtime) }], hash }`.
3. شروط التنفيذ: confirm token صالح لنفس الـ hash · كل item يعدي `ProtectedPathPolicy` و exclusions (realpath) و identity check · action مسموح للـ class.
4. **Trash-first:** الـ action الافتراضي `trash`. لو الـ Trash مش متاح (headless Linux، network drive، volume بدون trash) → **item يفشل بسبب `trash-unavailable`** ويظهر للمستخدم؛ الحذف النهائي لا يحصل إلا بموافقة صريحة منفصلة على قائمة محددة.
5. لا اتباع symlinks/junctions؛ `nlink>1` يتسجل؛ reparse points على Windows تتعامل كـ link.
6. نتيجة كل item حقيقية: `trashed | quarantined | deleted | skipped(reason) | failed(reason)`. لا "success" لو فيه فشل.

### 2.3 `DeletionPolicy` classes

| Class | أمثلة | Action افتراضي | Action بديل مسموح |
|---|---|---|---|
| `regenerable-cache` | browser cache، shader cache، temp | trash | permanent (اختيار صريح مرئي، OQ-01) |
| `user-data` | downloads، duplicates، large files، privacy traces، Wi-Fi profiles | trash | لا |
| `app-config` | leftovers، context menu entries | backup + trash/remove | لا |
| `system-config` | registry، services، startup، privacy policies | snapshot (recovery-store) ثم تغيير | لا |
| `security-quarantine` | malware | quarantine | trash بعد مراجعة |
| `irreversible` | Recycle Bin empty، shredder | تحذير صريح "غير قابل للاسترجاع" + تأكيد ثاني | — |

يضاف حقل `dataClass` لـ `rules.schema.json` (V-10) وكل rule حالية تتصنف مع اختبار يفرض وجوده.

### 2.4 `ProtectedPathPolicy` (مركزي)

- مصدر واحد لكل الأدوات (يحل محل قوائم الـ shredder `file-shredder.ipc.ts:15-97` والـ guard في empty-folders).
- يشمل: جذور النظام، home root نفسه، مجلدات المستخدم الأساسية كجذور (Documents/Desktop/Pictures…)، مجلدات التطبيق نفسه، مجلد quarantine، cloud sync roots (OneDrive/iCloud/Dropbox) كتحذير.
- يُطبق في main **و** في الـ broker.

### 2.5 Revalidation و TOCTOU

- قبل كل item: `lstat` + مقارنة identity المسجلة وقت الـ scan + `realpath` للأب ومطابقته للنطاق المعتمد.
- Windows: فتح بـ handle وفحص reparse قبل العملية (Wave 1 تحقيق، RFI من المرحلة 0 حول intermediate-component races).
- لو اتغير أي شيء → `skipped: changed-since-scan`.

### 2.6 Recovery Center

| نوع | المصدر | الاسترجاع |
|---|---|---|
| Trash | سجل `recovery_entries` (original path + trash location/name) | Windows: Shell API restore (يحتاج تحقق)؛ macOS: لا API رسمي للـ "Put Back" → نقل من `~/.Trash` بالاسم المسجل؛ Linux: XDG `.trashinfo` | 
| Quarantine | manifest موجود | restore للمسار الأصلي بعد تأكيد |
| Registry | `registry-backups.ts` + seals | import |
| Services/startup/privacy | `recovery-store.ts` | restore snapshot |
| Permanent | — | **غير قابل للاسترجاع**، ويُكتب ده في الـ receipt |

الـ Recovery Center يعرض: ما الذي يمكن استرجاعه، المساحة اللي لسه مش متحررة (داخل الـ Trash)، وزر "Empty HakTrak-moved items from Trash" اختياري.

### 2.7 الجدولة و CLI

- Schedules: الافتراضي "scan & notify"؛ `autoApply` مسموح فقط لـ `regenerable-cache` وبـ trash.
- CLI `--clean`: يتطلب `--yes`، ونفس `ExecutionEngine`.
- Remote: أي cleanup جاي من الـ cloud = OperationPlan **يتعرض على المستخدم ويحتاج موافقة محلية** (04).

---

## 3. Platform Compatibility Matrix (Deliverable 14)

Legend: ✅ code path exists (Kudu) · ⚠️ partial · ❌ none · 🆕 new work · 🔒 needs elevation/permission · **NT** = not tested at runtime (ينطبق على كل ✅ — مفيش أي تشغيل حصل).

| Feature | Windows | macOS | Linux | متطلبات/قيود خاصة بالنظام |
|---|---|---|---|---|
| System cleaner | ✅ (بعض الأهداف 🔒) | ✅ ⚠️ TCC/FDA | ✅ (journald 🔒) | mac: لازم onboarding لـ Full Disk Access (🆕) |
| Browser cleaner | ✅ | ✅ ⚠️ Safari يحتاج FDA | ✅ | إغلاق المتصفح بموافقة |
| App cache cleaner | ✅ 175 app | ⚠️ 104 | ⚠️ 99 | تكافؤ القواعد |
| Gaming cleaner | ✅ | ⚠️ | ⚠️ | |
| Native maintenance (DISM/DO/uv/pnpm) | ✅ DISM 🔒 | ✅ uv/pnpm | ✅ uv/pnpm | |
| Recycle Bin/Trash | ✅ | ✅ | ✅ XDG | Trash غير متاح على بعض الـ mounts → fail-closed |
| Trash restore (Recovery) | 🆕 | 🆕 ⚠️ لا API رسمي | 🆕 XDG | **unverified** |
| Uninstall leftovers | ✅ | ❌ | ❌ | |
| Registry cleaner | ✅ 🔒 | n/a | n/a | |
| Context menu / Environment | ✅ 🔒 | n/a | n/a | env cleaner بلا tests |
| Network cleanup | ✅ | ⚠️ | ⚠️ | |
| DB optimizer | ✅ | ✅ | ✅ | التطبيقات لازم تكون مقفولة |
| Custom folders / Duplicates / Large files / Downloads / Empty folders | ✅ | ✅ ⚠️ FDA | ✅ | Trash بالفعل |
| Shortcut cleaner | ✅ | ✅ | ❌ (`.desktop` 🆕) | |
| File shredder | ✅ | ✅ | ✅ | غير مضمون على SSD/APFS/Btrfs — إفصاح |
| Disk analyzer / App Space / Storage history | ✅ | ✅ ⚠️ FDA | ✅ | |
| Disk repair | ✅ 🔒 | ❌ (🆕 `diskutil verifyVolume`) | ❌ (🆕 read-only guidance) | |
| TRIM | ✅ 🔒 | ⚠️ info only | ✅ `fstrim` 🔒 | |
| Startup manager | ✅ (HKLM 🔒) | ✅ LaunchAgents؛ ❌ Login/Background Items (🆕) | ✅ XDG/systemd/cron | |
| HakTrak autostart | ✅ scheduled task | ✅ | ⚠️ غالباً no-op (🆕 XDG `.desktop`) | **[Inference]** |
| Services | ✅ 🔒 | ✅ launchctl 🔒 | ✅ systemctl 🔒 | |
| Uninstaller | ✅ | ⚠️ list only (🆕) | ⚠️ list only (🆕 pkg managers) | |
| Debloater / Drivers / Restore point / Windows Update | ✅ 🔒 | n/a | n/a | |
| Software updater | ✅ winget/choco/scoop/npm | ✅ brew | ✅ apt/dnf/pacman (flatpak/snap 🆕) | |
| Malware scanner (YARA-X) | ✅ | ✅ | ✅ glibc فقط | musl غير مدعوم |
| Local security posture | ✅ collectors (🆕 UI) | ✅ collectors (🆕 UI) | ✅ collectors (🆕 UI) | بعض الـ checks `null` حسب OS |
| Firewall audit | ✅ | ❌ (posture فقط) | ❌ (posture: `collectLinuxFirewallStatus`) | |
| Privacy Shield / traces | ✅ | ✅ | ✅ | |
| App privacy audit | ✅ | ❌ (TCC.db غير موثق) | ❌ | |
| Threat monitor (local) | ✅ engine | ✅ engine | ✅ engine | 🆕 تفعيل محلي + blocklist مرخصة |
| Perf monitor | ✅ | ✅ | ✅ | الحرارة حسب الهاردوير |
| Game Mode | ⚠️ (rework) | n/a | n/a | |
| CLI | ✅ | ✅ | ✅ | |
| Privilege Broker | 🆕 UAC helper | 🆕 SMAppService | 🆕 polkit | **أكبر عنصر غير متحقق** |
| Device identity keystore | 🆕 DPAPI | 🆕 Keychain | 🆕 libsecret؛ ❌ لو `basic_text` | |
| Cloud connector | 🆕 | 🆕 | 🆕 | |
| Auto-update | ✅ NSIS | ✅ | ⚠️ AppImage فقط | |

**حدود الصلاحيات:** Windows = UAC (لا تجاوز، لا auto-elevation)؛ macOS = TCC/FDA لا يُمنح برمجياً (deep-link لـ System Settings فقط)، SIP لا يُلمس؛ Linux = polkit، لا تشغيل GUI كـ root.
