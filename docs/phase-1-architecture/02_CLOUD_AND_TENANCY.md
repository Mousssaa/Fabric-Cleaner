# 02 — HakTrak Cloud Architecture, Account Model, Multi-Tenancy

> كله **[Design]**. لا backend متعمل، لا infrastructure متجهزة. أي ذكر لخدمات مزودين سحابيين هو مقارنة بدائل؛ القرار النهائي ينتظر OQ-05/OQ-06.

## 1. Cloud Architecture (Deliverable 4)

### 1.1 الحدود

- مستودع ومنتج منفصل (`haktrak-cloud`)، release cycle مستقل. الـ Desktop يتكلم معاه عبر API versioned (`/v1`) فقط.
- الـ Cloud **لا ينفذ أي شيء على الجهاز**؛ يخزن النية، يفوض، يوقع، يسجل. التنفيذ والتحقق والموافقة على الجهاز.
- Kudu Cloud لا يُستخدم ولا يُحاكى بروتوكوله.

### 1.2 المكونات العشرين — المسؤوليات والحدود والتوقيت

| # | المكون | المسؤولية | الحد (لا يفعل) | MVP backend؟ |
|---|---|---|---|---|
| 1 | Authentication & Identity | تسجيل، دخول، MFA، sessions، OIDC؛ SSO (SAML/OIDC) للمؤسسات | لا يقرر صلاحيات داخل الـ tenant | **نعم** (SSO لاحقاً) |
| 2 | Personal Accounts | tenant شخصي لكل مستخدم، إعدادات خصوصية، export/delete | لا يرى أجهزة غيره | **نعم** |
| 3 | Enterprise Organizations | إنشاء org، دعوات، domains، إعدادات | لا يتحكم في الحساب الشخصي للعضو | **نعم** (أساسي) |
| 4 | RBAC & Permissions | أدوار + صلاحيات + scopes (org/group/device) | لا يتجاوز سياسة الموافقة المحلية | **نعم** |
| 5 | Device Enrollment | enrollment tokens، ربط public key، unenroll | لا ينشئ هوية بدون private key على الجهاز | **نعم** |
| 6 | Device Identity | credential قصيرة العمر، تدوير، revocation | لا يقبل bearer-only | **نعم** |
| 7 | Device Inventory | OS/hardware/app version؛ software inventory **opt-in** | لا process list تلقائي | **نعم** (أساسي) |
| 8 | Health Monitoring | heartbeat، آخر scan، مساحة الديسك | لا telemetry كل دقيقة (Kudu كان 60s) | **نعم** (بسيط) |
| 9 | Security Posture | استقبال نتائج posture checks وتقييمها مقابل policy | لا "score" وهمي | Wave 6 |
| 10 | Threat Intelligence | واجهة للـ Gateway، ربط نتائج بالأجهزة/الحسابات | لا يكلم المزودين مباشرة | Wave 5 |
| 11 | Exposure Monitoring | مراقبة إيميلات/دومينات موثقة الملكية عبر LeakRadar | لا يبحث عن إيميل/دومين غير مثبت الملكية | Wave 8 (**BLOCKED**) |
| 12 | Centralized Alerts | normalization، dedup، severity، routing، ack | لا ينفذ remediation تلقائي | Wave 6 |
| 13 | Reporting | تقارير per-device/per-org، export | لا يخلط بيانات tenants | Wave 6 |
| 14 | Policy Management | سياسات org (scan schedule، allowed commands، data sharing، update channel) + توزيع signed rules | لا يجبر حذف بدون موافقة محلية | Wave 6 |
| 15 | Command Management | create→authorize→approve→sign→queue→status | لا shell، لا أوامر خارج allowlist | Wave 7 |
| 16 | API Gateway | authn، rate limit، tenant resolution، request size limits، versioning | لا business logic | **نعم** |
| 17 | Provider Integration Layer | = Layer C (03) | — | Wave 5 |
| 18 | Audit Logging | append-only، hash-chained، per tenant | لا يُعدل/يُحذف إلا بسياسة retention | **نعم** |
| 19 | Notifications | email + in-app (+ webhook للمؤسسات لاحقاً) | لا محتوى حساس في الإيميل | **نعم** (email أساسي) |
| 20 | Licensing & Entitlements | plans، seats، feature flags على السيرفر | لا يعطل Layer A المحلي | **نعم** (أساسي)؛ billing لاحقاً |

**الحد الأدنى للـ backend (Wave 4):** 1، 2، 3 (أساسي)، 4، 5، 6، 7 (أساسي)، 8 (بسيط)، 16، 18، 19 (email)، 20 (flags). **لاحقاً:** 9، 10، 12–15، 17 (W5–W7)، 11 (W8)، SSO وbilling وwebhooks.

### 1.3 مقارنة التقنيات (قبل أي اختيار)

| القرار | البدائل | المقارنة المختصرة | التوصية |
|---|---|---|---|
| **لغة الـ backend** | TypeScript (Fastify/NestJS) · Go · Python (FastAPI) · C#/.NET | TS: نفس لغة الـ desktop، مشاركة schemas/types (zod)، فريق واحد؛ Go: أداء وبساطة deployment أعلى، لغة ثانية؛ Python: أسرع للنماذج، أضعف في typing صارم؛ .NET: قوي في enterprise، بعيد عن الفريق | **TypeScript + Fastify** (ADR-011)، مع إمكانية Go للـ Gateway لو الحمل احتاج |
| **قاعدة البيانات** | PostgreSQL (shared schema + RLS) · DB per tenant · DynamoDB/Firestore | Postgres+RLS: علاقات قوية، عزل على مستوى DB، تكلفة معقولة؛ DB per tenant: عزل أقوى لكن تشغيل مكلف مع آلاف الحسابات الشخصية؛ NoSQL: صعوبة في RBAC/تقارير | **PostgreSQL + RLS**، مع خيار dedicated DB لعملاء enterprise كبار لاحقاً (ADR-013) |
| **Identity** | Managed (Auth0 / WorkOS / Microsoft Entra External ID / AWS Cognito / Firebase Auth) · Self-hosted (Keycloak / Zitadel / Ory) · بناء ذاتي | Managed: MFA/SSO جاهز، أسرع، تكلفة per-MAU، lock-in؛ Self-hosted: تحكم وdata residency، عبء تشغيل وأمان؛ بناء ذاتي: **مرفوض** (خطر أمني عالي) | **Managed IdP** يدعم OIDC + SAML + SCIM (OQ-05)؛ الـ authorization (RBAC) داخل HakTrak مش في الـ IdP (ADR-012) |
| **Hosting** | Managed containers (AWS ECS Fargate / GCP Cloud Run / Azure Container Apps) · Kubernetes · PaaS (Render/Fly) | Managed containers: تشغيل أقل، scaling كافي؛ K8s: مرونة عالية، عبء كبير بدري؛ PaaS: أسهل، أضعف في compliance/regions | **Managed containers** على مزود يحدده OQ-06 |
| **Queue/jobs** | Cloud queue (SQS/PubSub/Service Bus) · Redis Streams · Postgres-based (pg-boss/Graphile Worker) | Postgres-based: مكون أقل في MVP، transactional مع البيانات؛ cloud queue: scale أعلى | **Postgres-based في MVP** → cloud queue لما الحمل يزيد |
| **Cache/rate limit** | Redis · Postgres · in-memory | Redis قياسي للـ rate limit وintel cache | **Redis (managed)** |
| **Secrets/keys** | Cloud KMS + Secrets Manager · HashiCorp Vault | KMS: non-exportable keys، audit مدمج؛ Vault: محايد للمزود، عبء تشغيل | **Cloud KMS + Secrets Manager**؛ نوع خوارزمية التوقيع (Ed25519 أو ECDSA P-256) حسب دعم الـ KMS المختار — **يتأكد** |
| **Device↔Cloud transport** | HTTPS pull · WebSocket دائم · MQTT | Pull: بسيط، firewall-friendly، stateless؛ WS: فوري، stateful؛ MQTT: ممتاز للـ fleets الكبيرة، مكون إضافي | **HTTPS pull + wake hint اختياري** (ADR-014) |
| **Object storage** | S3/GCS/Azure Blob | متكافئين | حسب المزود؛ تشفير at-rest، per-tenant prefixes |
| **Observability** | OpenTelemetry → مزود managed | — | OTel من البداية، **بدون PII في الـ logs** |

### 1.4 خدمات منطقية (modular monolith أولاً)

**التوصية:** modular monolith (حدود modules واضحة: identity-adapter، tenancy، devices، posture، alerts، policy، commands، audit، notify، entitlements) + **Intelligence Gateway كخدمة منفصلة من البداية** (عزل المفاتيح وسطح الهجوم). التقسيم لـ microservices لاحقاً حسب الحاجة. السبب: فريق صغير، وتعقيد التشغيل الموزع غير مبرر في Wave 4.

### 1.5 API surface (مبدئي)

`/v1/auth/*` (عبر IdP) · `/v1/tenants/{t}` · `/v1/tenants/{t}/members` · `/v1/tenants/{t}/groups` · `/v1/enrollment/tokens` · `/v1/devices/enroll` · `/v1/devices/{d}/heartbeat` · `/v1/devices/{d}/inventory` · `/v1/devices/{d}/posture` · `/v1/devices/{d}/commands` (pull) · `/v1/devices/{d}/commands/{c}/result` · `/v1/tenants/{t}/policies` · `/v1/tenants/{t}/alerts` · `/v1/tenants/{t}/reports` · `/v1/intel/lookup` (→ Gateway) · `/v1/tenants/{t}/audit`.
كل endpoint: authn → tenant resolution من الـ token (مش من الـ URL وحده) → authz → schema validation → rate limit.

---

## 2. Personal & Enterprise Account Model (Deliverable 8)

### 2.1 الكيانات

```
User (identity في الـ IdP)
 ├─ owns 1 Personal Tenant (type=personal)          ← يتعمل تلقائياً عند التسجيل
 └─ Memberships *→ Enterprise Tenant (type=org)     ← بدعوة أو SSO/SCIM
Tenant
 ├─ Devices (كل جهاز ينتمي لـ tenant واحد بالظبط في نفس الوقت — OQ-04)
 ├─ Groups (enterprise فقط)
 ├─ Policies
 ├─ Entitlements (plan, seats)
 └─ Audit stream
```

### 2.2 مقارنة النموذجين

| البعد | Personal | Enterprise |
|---|---|---|
| Enrollment | اختياري، المستخدم يبدأه من التطبيق بنفسه | enrollment token من admin (أو MDM-deployed config لاحقاً)؛ المستخدم يشوف شاشة إفصاح واضحة "الجهاز ده هيتدار من org X" |
| مالك البيانات | المستخدم | المؤسسة (للبيانات المحددة في policy)، والمستخدم يُبلغ بما يُجمع |
| Data sharing defaults | **كله off** ما عدا heartbeat الأساسي؛ المستخدم يفعل كل نوع منفصل | تحددها policy، لكن الأنواع عالية الحساسية (software inventory، diagnostics) تتطلب policy صريحة + إفصاح على الجهاز؛ process list/file content **لا يُجمع إطلاقاً تلقائياً** |
| Remote operations | **off افتراضياً**؛ لو فعلها المستخدم: من أجهزته فقط، read-only + scan initiation | حسب RBAC وpolicy؛ الحساسة تتطلب موافقة المستخدم المحلي دائماً |
| الأدوار | Owner فقط (+ ربما "family" لاحقاً — مؤجل) | Org Owner، Org Admin، Security Analyst، Helpdesk Operator، Auditor (read-only)، Member |
| Account recovery | email + MFA recovery codes عبر IdP؛ الأجهزة تظل مسجلة؛ استرجاع لا يعطي remote control تلقائي (re-auth + MFA قبل أي أمر) | SSO/IdP المؤسسة؛ Owner احتياطي متعدد (≥2 owners موصى به)؛ break-glass موثق |
| الخروج | unenroll من التطبيق أو الويب → حذف بيانات الجهاز من الـ cloud حسب retention | المستخدم يقدر يشوف إن جهازه managed؛ unenroll محلي **ممكن** لكن يتبلغ للـ admin (لا نمنع المستخدم من التحكم في جهازه — قرار OQ: tamper-protection مؤجل) |
| Alerts | للمستخدم نفسه | للأدوار حسب routing |
| Billing | individual plan | per-seat/per-device (OQ-15) |

### 2.3 Organization membership

- دعوة بالإيميل (تنتهي صلاحيتها، مرة واحدة) أو domain verification + SSO JIT provisioning، أو SCIM لاحقاً.
- إزالة عضو: sessions تتلغي، أجهزته الـ enterprise تفضل ملك الـ org (لو enrolled بـ org token) أو تتفصل (لو BYOD — policy).
- **عضو في org لا يعطي الـ org أي وصول لـ Personal Tenant بتاعه.**

### 2.4 Device ownership

| السيناريو | السلوك |
|---|---|
| جهاز شخصي enrolled شخصياً، المستخدم انضم لـ org | لا يتنقل تلقائياً. لو عاوز يدخله الـ org: unenroll شخصي ثم enroll بـ org token (إفصاح جديد) |
| جهاز شركة | enrolled بـ org token؛ ملك الـ org |
| نقل جهاز بين tenants | unenroll + enroll، مفتاح جديد، تاريخ قديم لا ينتقل |
| بيع/إعادة تهيئة | revoke من الـ cloud؛ المفتاح المحلي يتمسح عند unenroll |

---

## 3. Multi-Tenant Data Architecture (Deliverable 9)

### 3.1 طبقات العزل (defense in depth)

1. **Token:** كل access token يحمل `sub` + `tenant_id` النشط + roles؛ device credentials تحمل `device_id` + `tenant_id`.
2. **API layer:** الـ tenant يُستخرج من الـ token؛ أي `tenant_id` في الـ URL يجب أن يطابق؛ عدم المطابقة = 404 (مش 403، لتجنب enumeration).
3. **Service layer:** كل repository method تأخذ `TenantContext` إجبارياً (type-level)؛ لا queries بدون tenant.
4. **DB layer:** كل جدول tenant-scoped فيه `tenant_id NOT NULL` + **Postgres Row-Level Security** policy `tenant_id = current_setting('app.tenant_id')`؛ الـ app role بدون `BYPASSRLS`؛ migrations role منفصل.
5. **Cache:** مفاتيح Redis بادئة `t:{tenant_id}:`؛ Intel cache **مشترك فقط** للنتائج العامة غير المرتبطة بشخص (مثلاً reputation لـ hash) — ونتائج exposure (إيميلات) **per-tenant دائماً**.
6. **Object storage:** prefix per tenant + signed URLs قصيرة.
7. **Audit:** stream per tenant.
8. **Keys:** اختياري لاحقاً: per-tenant data keys (envelope encryption) للمؤسسات.

### 3.2 مخطط البيانات الأساسي (مختصر)

| جدول | مفاتيح | ملاحظات |
|---|---|---|
| `tenants` | id، type(personal/org)، region | |
| `users` | id، idp_subject | لا كلمات سر عندنا |
| `memberships` | tenant_id، user_id، role | personal tenant: owner واحد |
| `groups`, `group_members` | tenant_id | enterprise |
| `devices` | tenant_id، id، public_key، status، enrolled_by | |
| `device_inventory` | tenant_id، device_id، collected_at، consent_scope | |
| `posture_results` | tenant_id، device_id، check_id، state، collected_at | |
| `alerts` | tenant_id، source، severity، dedup_key، state | |
| `policies` | tenant_id، version، signed_blob | |
| `commands` | tenant_id، id، device_id، type، params، issuer، approvals، signature، nonce، expires_at، status | |
| `intel_requests` | tenant_id، indicator_ref، provider، result_ref | |
| `audit_events` | tenant_id، seq، prev_hash، hash، actor، action، target | append-only |
| `entitlements` | tenant_id، plan، seats، features | |

### 3.3 اختبارات العزل الإلزامية (Wave 4)

- اختبار آلي لكل endpoint: token من tenant A يطلب مورد tenant B → 404.
- اختبار DB: session بـ `app.tenant_id=A` لا ترى صفوف B حتى بـ query خام.
- fuzz على `tenant_id`/`device_id` في الـ paths والـ bodies.
- مراجعة كل query تستخدم role مرتفعة.

### 3.4 Data residency

`tenants.region` من البداية؛ النشر الأول في region واحدة (OQ-06)، والتصميم يسمح بـ cell per region لاحقاً.
