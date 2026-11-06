# 05 — Data Privacy & Governance Matrix, Security Threat Model

> **[Design]**. مدد الاحتفاظ مقترحة وتحتاج مراجعة قانونية (OQ-17، OQ-22).

## 1. Data Privacy & Governance Matrix (Deliverable 11)

الافتراض: **data minimization**. "Local" = لا يغادر الجهاز إطلاقاً. "Cloud (opt-in)" = بعد enrollment **و** consent للنوع ده تحديداً.

| البيان | لماذا | اختياري؟ | Local / Cloud | من يصل إليه | الاحتفاظ (cloud) | الحذف | الموافقة | تحكم Enterprise |
|---|---|---|---|---|---|---|---|---|
| **Device identity** (device_id، public key) | مصادقة الجهاز | إلزامي **للـ enrollment فقط** | Cloud بعد enrollment | النظام؛ admins يرون device_id | حتى unenroll + 30 يوم | unenroll → revoke + حذف | ضمني في enrollment (شاشة إفصاح) | لا (ضروري) |
| **Hostname** | التعرف على الجهاز في القائمة | اختياري (بديل: اسم يختاره المستخدم) | Cloud opt-in | owner/admins | مع الجهاز | مع الجهاز | Personal: off افتراضياً، يكتب اسم بنفسه؛ Enterprise: policy | policy |
| **OS information** (نوع، إصدار، build) | توافق، posture | مطلوب للـ cloud features | Cloud بعد enrollment | owner/admins/analysts | مع الجهاز | مع الجهاز | enrollment | لا |
| **Hardware information** (CPU model، RAM، disk size، arch) | inventory | اختياري | Local افتراضياً؛ Cloud opt-in | owner/admins | مع الجهاز | مع الجهاز | per-type | policy |
| **Software inventory** (اسم، publisher، إصدار) | CVE/vuln matching، inventory | **اختياري — حساس** | Local؛ Cloud opt-in | owner/admins/analysts | آخر snapshot + 90 يوم history | مع الجهاز أو يدوياً | **صريحة** (Personal)؛ policy + إفصاح على الجهاز (Enterprise) | policy |
| **Process list** | (Kudu كان يرفعه افتراضياً) | — | **Local فقط** | المستخدم | **لا يُرفع** | — | — | **لا يمكن تفعيل رفعه** في v1 |
| **File hashes** (SHA-256) | intel lookup | اختياري | Local؛ Cloud→Gateway عند الطلب | النظام؛ نتيجة للـ owner/analysts | 30 يوم (مع النتيجة) | تلقائي بعد TTL | per-action أو consent scope "hash lookups" | policy (يقدر يمنع) |
| **File content** | VT submission فقط | **اختياري جداً** | Local؛ يُرسل فقط بـ consent token لكل ملف | — (لا تخزين في HakTrak) | **0** (streaming + حذف فوري)؛ عند VT حسب شروطهم | غير ممكن عند الطرف الثالث — يُذكر في الموافقة | **صريحة لكل ملف** | يقدر **يمنع** فقط، لا يفرض |
| **Security findings** (detections، posture results) | تنبيهات، تقارير | اختياري | Local؛ Cloud opt-in | owner/admins/analysts | 1 سنة | مع الجهاز/يدوياً | per-type | policy |
| **Diagnostics** | دعم فني | اختياري | Local؛ Cloud per-request | owner/helpdesk/admins | 30 يوم | تلقائي | **دائماً per-request** + redaction (usernames، paths) | لا يمكن فرضه بدون موافقة |
| **User account info** (email، اسم، MFA) | الحساب | إلزامي للحساب | Cloud (IdP + HakTrak) | المستخدم؛ admins للأعضاء (email/اسم) | حتى حذف الحساب + فترة قانونية | حذف الحساب → حذف/anonymize | التسجيل | SSO/SCIM |
| **Exposure information** (LeakRadar) | exposure monitoring | اختياري | Cloud | owner؛ للمؤسسة: analysts للدومين | حسب شروط LeakRadar (**مجهول**) | يدوياً + عند إزالة المراقبة | **صريحة** + verification | domain monitoring بـ policy + إخطار |
| **Command history** | audit، أمان | إلزامي لو remote ops مفعلة | Cloud + Local | owner/admins/auditors | 1 سنة (enterprise قابل للتعديل) | حسب retention فقط (append-only) | ضمني في تفعيل remote ops | retention |
| **Cleanup history/receipts** (مسارات) | recovery، تقارير | — | **Local**؛ ملخص رقمي فقط للـ cloud opt-in (عدد/حجم، **بدون مسارات**) | المستخدم | ملخص: 1 سنة | مسح من الإعدادات | — | ملخص فقط |
| **Logs** (`*.log`) | debugging | — | Local | المستخدم | — | rotation + مسح | — | — |

**قواعد عامة:** كل consent له version؛ تغيير ما يُجمع = consent جديد. صفحة في التطبيق "What leaves this device" تعرض الحالة الحالية لكل نوع وآخر إرسال. Export/Delete للحساب الشخصي. لا PII في الـ logs (cloud وlocal) — مسارات المستخدم تُقنّع في logs (RFI من المرحلة 0).

## 2. Security Threat Model (Deliverable 12)

**Assets:** ملفات المستخدم، إعدادات النظام، صلاحيات admin/root، device private key، مفاتيح المزودين، مفاتيح التوقيع، بيانات الـ tenants، audit integrity.
**Trust boundaries:** (B1) Renderer↔Main · (B2) Main↔Broker · (B3) Device↔Cloud · (B4) Cloud↔Gateway · (B5) Gateway↔Providers · (B6) Tenant↔Tenant · (B7) Build/Update pipeline↔Device · (B8) Filesystem (attacker-controlled paths)↔Engine.

| # | التهديد | Boundary | السيناريو | Controls | Residual |
|---|---|---|---|---|---|
| T-01 | Renderer compromise | B1 | XSS/dep مخترق ينفذ JS في الـ renderer | sandbox دائم، CSP صارم، no Node، no HTML sinks، navigation guards، typed preload، main لا يثق في الـ renderer، **asInvoker** (الضرر = صلاحيات مستخدم، مش admin)، confirm tokens يصدرها main | Medium: المهاجم يقدر يطلب scans ويعرض UI مضلل؛ التنفيذ المدمر يحتاج confirm من شاشة… لكن نفس الـ renderer — **mitigation إضافي:** تأكيد العمليات الـ privileged عبر OS prompt (UAC/polkit) خارج سيطرة الـ renderer |
| T-02 | IPC abuse | B1 | frame/صفحة أخرى تستدعي channels، أو مدخلات مشوهة | `SecureIpcRouter` (sender origin + main frame)، schemas لكل channel، IDs بدل paths، capability tags، rate limits، fuzz tests | Low |
| T-03 | Cloud account compromise | B3/B6 | سرقة حساب admin | MFA إلزامي للأدوار الإدارية، step-up لأوامر mutating، 2-person approval، blast-radius limits، **موافقة محلية للحساس**، إشعارات، audit | Medium: المهاجم يقدر يقرأ inventory/posture المسموح بها |
| T-04 | API credential exposure | B4/B5 | تسريب مفتاح VT/LeakRadar | المفاتيح في Secrets Manager داخل Gateway فقط، لا في Desktop/repo/logs، تدوير، secret scanning في CI، least-privilege IAM | Low |
| T-05 | Tenant isolation failure | B6 | bug يرجع بيانات tenant آخر | 8 طبقات (02 §3.1)، RLS، اختبارات cross-tenant آلية، 404 بدل 403، cache keys per tenant | Low-Medium |
| T-06 | Device impersonation | B3 | جهاز مزيف يبعت بيانات أو يسحب أوامر جهاز آخر | private key محلي (safeStorage، لاحقاً TPM/SE)، proof-of-possession لكل request، enrollment tokens قصيرة ومرة واحدة، revocation، لا bearer UUID | Medium: malware على نفس الجهاز بصلاحيات المستخدم قد يقرأ المفتاح المحمي بـ DPAPI للمستخدم → hardware-backed لاحقاً |
| T-07 | Remote command injection | B3 | params تحتوي shell metacharacters أو paths | لا shell، allowlist ثابتة، typed params بدون strings حرة، paths لا تُقبل من الأمر (categories/IDs فقط)، `execFile` فقط، broker لا يقبل strings | Low |
| T-08 | Replay attacks | B3 | إعادة إرسال أمر قديم موقع | nonce + ledger، seq monotonic، expiry قصير، device/tenant binding | Low |
| T-09 | Malicious rules | B7 | rule bundle خبيث (YARA/KB/cleaner) يسبب false positives → حذف | Ed25519 signed bundles بمفاتيح مثبتة، rollback protection، schema + size limits، **cleaner rules لا تأتي remotely** (مضمنة فقط)، detections لا تؤدي لإجراء تلقائي، YARA-X لا ينفذ كود | Low-Medium |
| T-10 | Supply-chain attacks | B7 | dependency/CI مخترق | lockfile، `npm ci`، actions pinned SHAs (موجود [Verified] المرحلة 0)، license gate (موجود)، SBOM، provenance للـ native modules (`@litko/yara-x`)، code signing، reproducible builds حيث ممكن، 2-person release | Medium |
| T-11 | Data exposure | B3/B6 | تسريب بيانات من cloud أو logs | minimization (05 §1)، تشفير at-rest/in-transit، لا PII في logs، retention، access reviews | Low-Medium |
| T-12 | Unauthorized privilege escalation | B2 | استخدام الـ broker لتنفيذ شيء غير مقصود | broker قصير العمر، ACL على الـ pipe/XPC code-sign check/polkit، typed allowlist، يعيد فحص policy، لا strings تنفيذية، كل invocation يحتاج OS prompt | Low-Medium |
| T-13 | Path traversal | B8 | `..`، مسارات نسبية، UNC، device paths (`\\?\`) | canonicalize + realpath، رفض UNC/device paths، المقارنة بالنطاق المعتمد بعد التطبيع، targets من main cache فقط | Low |
| T-14 | Symlink & junction attacks | B8 | تبديل مجلد بـ link لنقطة محمية بين scan وexecute | lstat + identity، عدم اتباع links (موجود [Verified])، reparse points كـ links، realpath للأب، ProtectedPathPolicy في الـ broker | Low-Medium (intermediate component races — RFI) |
| T-15 | Race conditions (TOCTOU) | B8 | تعديل الملف بين التحقق والتنفيذ | revalidation فوري، handle-based ops على Windows حيث ممكن، identity checks، فشل بدل تنفيذ عند الشك | Medium (لا حل كامل على كل الأنظمة) |
| T-16 | Unsafe shell execution | B1/B2 | interpolation في PowerShell | `execFile` فقط (موجود — 0 `shell: true` [Verified])، audit الـ 62 PowerShell `-Command` site (S-11) والانتقال لـ `-EncodedCommand` + JSON params، lint rule | Medium حتى انتهاء الـ audit |
| T-17 | Update hijack | B7 | feed مزيف | HTTPS، code signature verification (Win/mac)، Linux AppImage signature (OQ)، لا feed من طرف ثالث | Medium على Linux |
| T-18 | Local network exposure | — | Prometheus على كل الواجهات | bind `127.0.0.1` افتراضياً، opt-in للـ LAN مع token | Low |
| T-19 | Intel provider abuse/poisoning | B5 | نتيجة خاطئة من مزود | attribution، "not definitive"، لا auto-action، thresholds | Low |
| T-20 | Insider / admin overreach (enterprise) | B3 | admin يجمع أكثر من اللازم | data types محددة في allowlist، لا process list/file content، إفصاح على الجهاز، audit يراه الـ auditor | Low-Medium |

**Controls لكل boundary (ملخص):** B1 → sandbox/CSP/guards/router/confirm tokens · B2 → short-lived broker/OS prompt/ACL/typed ops · B3 → TLS + device PoP + signed commands + local verification + local approval · B4 → mTLS/service identity + tenant ctx + entitlements · B5 → secrets manager + quotas + circuit breakers + normalization · B6 → RLS + typed tenant ctx + tests · B7 → signing + pinned keys + SBOM + pinned CI · B8 → ExecutionEngine + ProtectedPathPolicy + revalidation.
