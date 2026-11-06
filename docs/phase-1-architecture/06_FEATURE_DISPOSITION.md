# 06 — Complete Feature Disposition Matrix (Deliverable 15)

> مبني على الـ 61 ميزة في `EXISTING_FEATURES_MATRIX.md` (المرحلة 0) + V-1. **لا شيء هنا متجرب runtime.**
>
> **Local dispositions:** KEEP (كما هو + التوجيه عبر ExecutionEngine) · HARDEN (يفضل مع تغييرات أمان/سلامة) · REWORK (يتغير سلوكه جوهرياً) · DEFER · REMOVE.
> **Cloud dispositions (المطلوبة):** REBUILD (نبنيها على HakTrak Cloud) · REPLACE (بديل محلي/مختلف) · DEFER · REMOVE.

## A. Cleaning & storage

| # | Feature | Disposition | Wave | ملاحظات |
|---|---|---|---|---|
| 1 | System cleaner | HARDEN | W2 | ExecutionEngine + Trash-first + `dataClass` |
| 2 | Browser cleaner | HARDEN | W2 | إغلاق المتصفح بموافقة (موجود `cleaner-blockers.ts`) |
| 3 | App cache cleaner | HARDEN | W2 | تكافؤ قواعد mac/Linux تدريجي |
| 4 | Gaming cleaner | HARDEN | W2 | |
| 5 | Native maintenance ops | KEEP | W2 | via broker على Windows |
| 6 | Docker/journald cleanup | KEEP | W2 | journald via polkit broker |
| 7 | Recycle Bin/Trash empty | HARDEN | W2 | class `irreversible` + تأكيد ثاني |
| 8 | Uninstall leftovers | HARDEN | W2 | Windows فقط؛ backup + trash |
| 9 | Registry cleaner | HARDEN (Advanced) | W2 | backups إلزامية؛ عبر broker؛ OQ-12 |
| 10 | Context menu cleaner | HARDEN (Advanced) | W2 | |
| 11 | Environment (PATH) cleaner | DEFER | W8 | بلا tests؛ خطر كسر أدوات (OQ-12) |
| 12 | Network cleanup | HARDEN | W2 | Wi-Fi profiles = `user-data` + تحذير |
| 13 | Database optimizer | KEEP | W2 | التطبيقات مقفولة |
| 14 | Custom folders | KEEP | W2 | Trash بالفعل |
| 15 | Duplicate finder | KEEP | W2 | Trash بالفعل |
| 16 | Large file finder | KEEP | W2 | Trash بالفعل |
| 17 | Downloads review | KEEP | W2 | |
| 18 | Empty folder cleaner | KEEP | W2 | يستخدم ProtectedPathPolicy المركزي |
| 19 | Broken shortcut cleaner | HARDEN | W2 | + Linux `.desktop` (W8) |
| 20 | File shredder | REWORK | W2 | إفصاح SSD/CoW؛ class `irreversible` |
| 21 | Disk analyzer | KEEP | W2 | |
| 22 | App Space | KEEP | W2 | |
| 23 | Storage history | KEEP | W2 | |
| 24 | Disk repair | HARDEN | W2 (Win) / W8 (mac/Linux read-only) | |
| 25 | TRIM | KEEP | W2 | |

## B. System management

| # | Feature | Disposition | Wave | ملاحظات |
|---|---|---|---|---|
| 26 | Startup manager | HARDEN | W3 | + mac Login/Background Items (W8) |
| 27 | Service manager | HARDEN | W3 | via broker + recovery |
| 28 | Program uninstaller | HARDEN | W2 (Win) / W8 (mac/Linux execution) | |
| 29 | Debloater | HARDEN (Advanced) | W3 | تحذير عدم القابلية للاسترجاع لبعض الحزم |
| 30 | Driver manager | HARDEN (Advanced) | W3 | Windows Update sources فقط |
| 31 | Software updater | HARDEN | W3 | S-11 audit لـ elevated package installs |
| 32 | Windows Update | HARDEN | W3 | local فقط؛ لا remote install |
| 33 | Restore point | KEEP | W1 | قبل العمليات الخطرة |
| 34 | Recovery (settings) | REWORK → Recovery Center | W1 | توحيد مع Trash/quarantine |
| 35 | Receipts/History/Deletion log | REWORK | W1 | SQLite؛ ملخص بدون مسارات للـ cloud |
| 36 | Schedules | REWORK | W2 | scan&notify افتراضي؛ autoApply للـ cache فقط |

## C. Security & privacy

| # | Feature | Disposition | Wave | ملاحظات |
|---|---|---|---|---|
| 37 | Malware scanner | REWORK (rules) | W3 | قواعد مضمنة موقعة؛ إزالة polling Kudu؛ detection states |
| 38 | Privacy Shield | HARDEN | W3 | |
| 39 | Privacy traces | HARDEN | W2 | `user-data` class |
| 40 | App privacy audit | KEEP | W3 | Windows فقط |
| 41 | Firewall audit | KEEP | W3 | + posture على mac/Linux |
| 42 | Threat Monitor | **REPLACE** (local) | W8 | تفعيل محلي + blocklist مرخصة؛ domain/IP reputation اختياري عبر Gateway |
| 43 | CVE scanner | **REBUILD** (HakTrak Cloud CVE intelligence) | W8 | software inventory opt-in؛ مصدر بيانات (OSV/NVD) بترخيص؛ "possible match" |
| 44 | Breach monitor | **REBUILD** via LeakRadar | W8 (**BLOCKED**) | لا إرسال إيميلات لـ Kudu؛ verification إلزامي |
| 45 | Program/startup safety ratings | **REPLACE** (local KB + signatures) + اختياري hash reputation عبر VT | W3 / W5 | |
| 🆕 | **Local Security Posture** (V-1) | NEW from existing collectors | W3 | checklist، مش score |

## D. Performance & diagnostics

| # | Feature | Disposition | Wave | ملاحظات |
|---|---|---|---|---|
| 46 | Performance monitor | KEEP | W2 | |
| 47 | Performance diagnostics | **REPLACE** analysis محلي؛ **REBUILD** upload كـ `diagnostics.collect` بموافقة | W8 / W7 | لا upload لـ Kudu |
| 48 | Game Mode | REWORK | W2 | إزالة `mem-clear-standby` (OQ-13)؛ عمليات قابلة للقياس فقط |
| 49 | Dashboard health score | REWORK | W2 | حقائق قابلة للقياس بدل score |
| 50 | GPU fallback | KEEP | W1 | |

## E. Interfaces, cloud, platform

| # | Feature | Disposition | Wave | ملاحظات |
|---|---|---|---|---|
| 51 | CLI | HARDEN | W2 | `--yes` إجباري للتنفيذ؛ ExecutionEngine؛ إزالة `config set cloud.*` |
| 52 | Prometheus exporter | HARDEN | W1 | `127.0.0.1` افتراضياً |
| 53 | Headless daemon | **REMOVE** (Kudu) → **DEFER** HakTrak agent service | W7+ (ADR-015) | |
| 54 | Kudu Cloud link/remote commands/telemetry | **REMOVE** Kudu؛ **REBUILD** على HakTrak Cloud | W1 إزالة / W4–W7 بناء | بروتوكول جديد كلياً (04) |
| 55 | Auto-update | **REPLACE** feed | W1 (قرار) / W9 (تنفيذ) | لا build يُوزع قبل تغيير الـ feed |
| 56 | Run at startup / tray | HARDEN | W2 | Linux XDG autostart |
| 57 | Elevated relaunch | **REPLACE** بـ Privilege Broker | W1 | لا GUI كـ root |
| 58 | Localization (31) | KEEP | — | Arabic RTL verification في Phase 3 |
| 59 | Share cleanup result | DEFER (PD) | — | قرار منتج + brand |
| 60 | Onboarding | REWORK | W2 | permissions onboarding (FDA/polkit/UAC) + cloud اختياري |
| 61 | Portable mode | KEEP | W9 | بدون admin (asInvoker) |

## F. Cloud-dependent items (ملخص مطلوب)

| Kudu cloud item | Disposition |
|---|---|
| YARA rules polling `cloud.usekudu.com` | **REMOVE** → **REPLACE** بقواعد مضمنة موقعة + HakTrak feed اختياري |
| Device registration / telemetry / health | **REBUILD** (HakTrak, minimized, opt-in) |
| 36 remote commands | **REMOVE**؛ **REBUILD** 10 أوامر مقيدة فقط (04 §2) |
| Threat Monitor activation + blacklist | **REPLACE** محلي |
| CVE scanner | **REBUILD** |
| Breach monitor | **REBUILD** (LeakRadar — blocked) |
| Safety ratings | **REPLACE** |
| Diagnostics upload/analysis | **REPLACE** (local) + **REBUILD** (consented upload) |
| Daemon | **DEFER** |
| Cloud page, billing links, tier badges | **REMOVE**؛ صفحة HakTrak Cloud جديدة في W4 |

**الحصيلة:** 61/61 لها disposition. لا ميزة محلية قابلة للحياة اتشالت. المُزال فقط: ارتباطات Kudu Cloud، الـ daemon (مؤجل كـ HakTrak agent)، `mem-clear-standby`، وhealth score الحالي (يُستبدل).
