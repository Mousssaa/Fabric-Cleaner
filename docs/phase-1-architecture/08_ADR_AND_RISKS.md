# 08 — Architecture Decision Records & Risk Register

> كل الـ ADRs حالتها **Proposed** — تنتظر اعتماد Fox. القرارات المعتمدة من Fox بالفعل (Hybrid، Controlled RM، Personal+Enterprise، Least Privilege، Trash-first، 3 أنظمة، Android خارج النطاق، MIT) مُسجلة كـ **Accepted (by Fox)**.

## 1. Architecture Decision Records (Deliverable 17)

| ADR | العنوان | الحالة | القرار | البدائل المرفوضة | السبب / العواقب |
|---|---|---|---|---|---|
| ADR-001 | Hybrid: Local Core + HakTrak Cloud | **Accepted (by Fox)** | 3 طبقات A/B/C؛ Layer A مستقل تماماً | local-only (المرحلة 0)؛ cloud-first | offline إلزامي؛ Cloud منتج منفصل |
| ADR-002 | Windows least privilege | **Accepted (by Fox)** + تفاصيل Proposed | `asInvoker` + broker قصير العمر عبر UAC؛ لا service دائمة | `requireAdministrator`؛ Windows service | يقلل أثر T-01؛ يحتاج إعادة توجيه كل العمليات الـ HKLM/services/drivers للـ broker (عمل كبير) |
| ADR-003 | Privilege model mac/Linux | Proposed | helper (SMAppService/polkit)؛ لا GUI كـ root | relaunch الحالي بـ `--no-sandbox` | sandbox دائم؛ SMAppService يحتاج توقيع Apple |
| ADR-004 | Trash-first, fail-closed | **Accepted (by Fox)** + تفاصيل Proposed | Trash افتراضي لكل الـ classes؛ لا fallback صامت؛ permanent للـ cache اختيار صريح فقط | permanent افتراضي (Kudu) | استرجاع ممكن؛ المساحة لا تتحرر حتى تفريغ الـ Trash — يُعرض بصدق (OQ-01) |
| ADR-005 | Single ExecutionEngine | Proposed | كل الحذف/التعديل عبر `core/execution-engine`؛ enforced بـ lint + CI | الإبقاء على الحذف المحلي في كل module | نقطة واحدة للمراجعة والاختبار |
| ADR-006 | Local persistence = SQLite (`better-sqlite3`) | Proposed | DB واحدة لـ history/receipts/recovery/ledger/consents؛ `config.json` يفضل | JSON files (الحالي)؛ LevelDB؛ IndexedDB في الـ renderer | dependency موجود بالفعل (native rebuild موجود)؛ transactions؛ تشفير الحقول الحساسة بـ safeStorage (OQ-07) |
| ADR-007 | Signed local content | Proposed | Ed25519، root offline + signing keys، pinned، rollback protection؛ **cleaner rules مضمنة فقط** | hash في نفس الـ payload (Kudu)؛ لا توقيع | يسد S-05/S-06 |
| ADR-008 | Kudu Cloud removal | Proposed | إزالة كاملة (17 ملف)؛ لا إعادة استخدام للبروتوكول | تعديل الـ server URL فقط | البروتوكول بدون توقيع/nonce؛ شروط Advent |
| ADR-009 | Device identity | Proposed | Ed25519 keypair محلي في keystore؛ PoP لكل request؛ رفض enrollment بدون keystore آمن | UUID bearer (Kudu)؛ API key مشترك | hardware-backed لاحقاً (T-8.08) |
| ADR-010 | Command security model | Proposed | allowlist مغلقة 10 أوامر؛ envelope موقع؛ nonce/seq/expiry؛ local approval للحساس؛ **no shell** | نموذج Kudu (36 أمر، API key فقط) | 04 بالكامل |
| ADR-011 | Backend language | Proposed | TypeScript (Fastify) modular monolith + Gateway منفصل | Go، Python، .NET، microservices من البداية | مشاركة types مع الـ desktop؛ فريق واحد |
| ADR-012 | Identity provider | Proposed | managed IdP (OIDC/SAML/SCIM)؛ RBAC داخل HakTrak | self-hosted Keycloak/Zitadel؛ بناء ذاتي | سرعة وأمان؛ lock-in مقبول؛ يحدده OQ-05 |
| ADR-013 | Multi-tenancy | Proposed | Postgres shared schema + `tenant_id` + RLS + typed TenantContext؛ dedicated DB لاحقاً للمؤسسات الكبيرة | DB per tenant للكل؛ NoSQL | تكلفة/تشغيل معقول مع آلاف الحسابات الشخصية |
| ADR-014 | Device↔Cloud transport | Proposed | HTTPS pull + wake hint اختياري بدون payload | WebSocket دائم (Kudu/Reverb)؛ MQTT | stateless، firewall-friendly، أوامر لا تمر في قناة push |
| ADR-015 | Persistent agent service | **Deferred** | لا في Waves 1–6؛ يُقيم في T-7.07 فقط لو OQ-08 = نعم، مع threat model منفصل | تضمينه مبكراً | least privilege؛ سطح هجوم دائم |
| ADR-016 | Command/rule signing keys | Proposed | KMS non-exportable، مفاتيح منفصلة (command / rule / policy / release)؛ الخوارزمية حسب دعم الـ KMS (Ed25519 أو ECDSA P-256) | مفتاح واحد لكل شيء؛ مفاتيح في ملفات | فصل الأضرار |
| ADR-017 | Intelligence via backend only | **Accepted (by Fox)** | لا مفاتيح في Electron؛ Gateway منفصل | client-side API calls | — |
| ADR-018 | VT hash-first, consented submission | **Accepted (by Fox)** + تفاصيل Proposed | consent token لكل ملف؛ enterprise يمنع ولا يفرض؛ لا رفع من remote/schedule | رفع تلقائي للـ unknown files | سرية بيانات العملاء |
| ADR-019 | Android | **Accepted (by Fox)** | خارج النطاق | — | — |
| ADR-020 | Licensing obligations | **Accepted (by Fox)** | الحفاظ على `LICENSE` MIT (Advent Development Inc) + THIRD_PARTY_NOTICES + About/Legal attribution | — | — |

## 2. Risk Register (Deliverable 18)

Likelihood/Impact: L/M/H.

| ID | الخطر | L | I | Mitigation | Owner (مقترح) | مرتبط |
|---|---|---|---|---|---|---|
| R-01 | التحول لـ `asInvoker` يكسر ميزات Windows كثيرة تفترض admin | H | H | inventory للعمليات المرتفعة في T-1.09؛ broker تدريجي؛ اختبارات VM | Desktop lead | ADR-002 |
| R-02 | coupling `cloud-agent.ts` (4,040 سطر، 17 ملف) يجعل الإزالة تكسر ميزات | M | H | إزالة مع tests؛ فك `HealthReport` types أولاً | Desktop lead | V-1, V-2 |
| R-03 | Trash-first يُفهم كـ "التنظيف لا يحرر مساحة" | H | M | UX صادق + toggle صريح للـ cache + Recovery Center | Product | OQ-01 |
| R-04 | macOS Trash restore بدون API رسمي | M | M | سجل دقيق + نقل يدوي؛ إفصاح | Desktop | T-1.11 |
| R-05 | LeakRadar قد لا يدعم المطلوب أو ترخيصه يمنع | M | H | blocked حتى الوثائق؛ بدائل (HIBP) تقيم لاحقاً | Product | OQ-02 |
| R-06 | VirusTotal public key غير مسموح تجارياً؛ تكلفة premium | H | H | لا إطلاق قبل عقد؛ hash cache لتقليل الاستهلاك | Product | OQ-03 |
| R-07 | tenant isolation bug | L | H | 8 طبقات + اختبارات آلية + pentest | Cloud lead | ADR-013 |
| R-08 | سرقة حساب admin enterprise | M | H | MFA، step-up، 2-person، local approval | Cloud | T-03 |
| R-09 | سرقة device key على جهاز مخترق | M | M | revocation، PoP، hardware keys لاحقاً | Security | T-06 |
| R-10 | فقدان/تسريب signing keys | L | H | KMS، offline root، rotation، revocation lists | Security | ADR-016 |
| R-11 | ترخيص YARA rules/feeds يمنع الاستخدام التجاري | M | M | مراجعة ترخيص؛ قواعد خاصة | Security | OQ-11 |
| R-12 | baseline tests لسه NOT RUN — مشاكل مخفية | M | M | T-1.01 أول مهمة | QA | — |
| R-13 | TOCTOU/junction races على Windows | M | H | handle-based ops، revalidation، fixtures | Desktop | T-14/T-15 |
| R-14 | PowerShell interpolation (62 site) | M | H | T-3.07 | Desktop | S-11 |
| R-15 | انحراف عن upstream Kudu وفقد security fixes | H | M | `UPSTREAM.md` + cherry-pick policy + مراقبة advisories | Maintainer | T-1.01 |
| R-16 | قوانين الخصوصية (GDPR/قانون 151/2020) غير محددة | M | H | مراجعة قانونية قبل W4 production | Legal | OQ-22 |
| R-17 | تعقيد Personal+Enterprise يبطئ W4 | M | M | personal tenant كحالة خاصة من نفس النموذج | Cloud | 02 §2 |
| R-18 | macOS SMAppService يحتاج Developer ID + notarization من البداية | M | M | helper مؤقت عبر osascript CLI | Desktop | ADR-003 |
| R-19 | Linux بدون keyring آمن → لا enrollment | M | L | إفصاح واضح؛ دليل تثبيت libsecret | Desktop | ADR-009 |
| R-20 | Brand Kit متأخر يأخر الواجهات (Recovery Center، approval UI) | M | M | تنفيذ المنطق أولاً بواجهات وظيفية مؤقتة موسومة | Product | Phase 2 |
| R-21 | Linux AppImage updates بدون توقيع | M | M | تقييم في W9 | Release | U-3 |
| R-22 | Enterprise تطلب unattended ops → ضغط لإضافة service دائمة | M | H | ADR-015 + threat model منفصل | Architecture | OQ-08 |
