# 03 — Intelligence Integration Architecture, LeakRadar, VirusTotal

> **حالة المدخلات:** فحصت مجلد المشروع بالكامل (`/mnt/project-files/` و`uploads/` و`uploads/.incoming/`) — **لا توجد أي وثائق أو credentials لـ LeakRadar أو VirusTotal.** لم أعرض أو أنسخ أي secret. الموجود الوحيد لـ VirusTotal هو اسم secret في CI الخاص بـ Kudu (`VIRUSTOTAL_API_KEY` في `.github/workflows/distribute-release.yml:20,139`) لرفع ملفات release — بدون قيمة، وخارج نطاق المنتج.

## 1. Unified Intelligence Gateway (Deliverables 5 + G)

### 1.1 التدفق

```
Desktop (user action)            Cloud module (policy/schedule)
        │ device-signed request          │ service token + tenant ctx
        └──────────────┬─────────────────┘
                       ▼
          HakTrak API Gateway  ── authn (user/device) ── tenant resolution
                       ▼
          Cloud: Intel module ── authz: role/scope + entitlement(plan) + consent(scope, version)
                       ▼
          INTELLIGENCE GATEWAY (separate service, internal only)
            1. Validate & normalize indicator (type detection, canonicalize, hash/HMAC for refs)
            2. Policy: is this indicator type allowed for this provider? (e.g. no file upload w/o consent token)
            3. Cache lookup  (key = provider|type|canonical_value_hash [+ tenant for private types])
            4. Quota & rate limiter (per provider key, per tenant, per user)
            5. Provider router → Adapter
            6. Adapter: auth (secret from Secrets Manager), call, timeout, retry w/ jitter, circuit breaker
            7. Map → NormalizedIntelResult ; store in cache w/ TTL ; write audit
                       ▼
          Cloud: Alerts / Reports / Dashboard  ──▶  Desktop shows result w/ provider + timestamp
```

**قواعد ثابتة:**
- الـ Gateway **ليس له endpoint عام**؛ يُستدعى فقط من الـ Cloud داخلياً (mTLS/service auth).
- مفاتيح المزودين في Secrets Manager، تُقرأ وقت التشغيل، تتدور، لا تظهر في logs/errors/responses.
- الـ Desktop لا يعرف أي مزود موجود؛ يطلب "lookup hash" ويستلم نتيجة normalized. **إضافة مزود جديد = adapter جديد في الـ Gateway بدون أي تغيير في Desktop.**
- Offline: الـ Desktop يعرض "intel unavailable"، والكشف المحلي (YARA/heuristics) شغال.

### 1.2 Adapter interface

```ts
interface IntelProviderAdapter {
  id: string                                   // 'virustotal' | 'leakradar' | ...
  supports(type: IndicatorType, op: IntelOperation): boolean
  lookup(req: NormalizedIntelRequest, ctx: ProviderCallContext): Promise<NormalizedIntelResult>
  submit?(req: SubmissionRequest, consent: ConsentToken, ctx): Promise<SubmissionReceipt>  // optional
  health(): Promise<ProviderHealth>
  limits(): ProviderLimits                     // from config, sourced from verified docs/contract
}
type IndicatorType = 'file-hash' | 'url' | 'domain' | 'ip' | 'email' | 'credential-ref' | 'org-domain'
type IntelOperation = 'reputation' | 'exposure-search' | 'analysis-status' | 'file-submit'
```

### 1.3 NormalizedIntelResult

| الحقل | النوع | ملاحظات |
|---|---|---|
| `indicatorType` | enum | |
| `indicatorRef` | string | **privacy-safe**: للـ hashes = القيمة نفسها؛ للـ email/credential = HMAC(tenant_key, value) + عرض مُقنّع (`f***@domain.com`) |
| `provider` | string | إلزامي (attribution) |
| `providerReference` | string? | رابط/ID عند المزود لو مسموح بعرضه |
| `verdict` | `malicious` / `suspicious` / `harmless` / `undetected` / `exposed` / `not-found` / `unknown` | **ليس حكماً نهائياً** — الواجهة تقول "according to {provider} at {time}" |
| `detectionStats` | object? | مثلاً `{malicious: n, suspicious: n, total: n}` لو المزود يوفر |
| `confidence` | `high/medium/low/unknown` | من قواعد mapping موثقة لكل مزود، مش من خيالنا |
| `severity` | `critical/high/medium/low/info` | من سياسة HakTrak، قابلة للتعديل للمؤسسة |
| `firstSeen` / `lastSeen` | timestamp? | من المزود |
| `analysisTimestamp` | timestamp | وقت تحليل المزود |
| `retrievedAt` | timestamp | وقت سؤالنا |
| `expiresAt` | timestamp | TTL الـ cache |
| `status` | `ok` / `not-found` / `rate-limited` / `provider-error` / `unauthorized` / `unsupported` / `consent-required` / `blocked-by-docs` | |
| `error` | object? | رسالة آمنة، بدون أسرار |
| `rawRetention` | `none` / `ttl` | هل خزنا الـ raw response ولمدة كام |

### 1.4 Caching & retention (افتراضي — يُعدل بعد قراءة شروط المزودين)

| النوع | Cache scope | TTL مقترح | Raw response |
|---|---|---|---|
| file-hash reputation | مشترك بين tenants (معلومة عامة) | 24h لـ malicious/harmless، 6h لـ not-found | لا (normalized فقط) |
| url/domain/ip | مشترك | 6–24h | لا |
| email/credential exposure | **per tenant فقط** | حسب شروط LeakRadar (مجهولة) | لا |
| file submission receipts | per tenant | حتى انتهاء التحليل + 30 يوم | لا |

**تحفظ:** شروط بعض المزودين قد تمنع مشاركة النتائج بين عملاء أو تخزينها — الـ cache المشترك **مشروط** بمراجعة الشروط.

### 1.5 Rate limiting & errors

- Token bucket لكل (provider key) + حصص لكل tenant (fair share) + لكل user.
- 429 من المزود → backoff + `status: rate-limited` + `retryAfter`؛ لا retry storms.
- Circuit breaker لكل مزود؛ فشل مزود لا يكسر غيره ولا يكسر الـ Desktop.
- كل طلب في audit: tenant، actor، indicator_ref (مش القيمة الخام للبيانات الشخصية)، provider، status.

---

## 2. LeakRadar Integration Assessment (Deliverable 6)

### الحالة: **BLOCKED BY API DOCUMENTATION**

لم يتم توفير أي وثائق API أو إعدادات credentials. **لن أفترض** أي endpoint أو capability أو سعر أو شروط ترخيص. كل الاستخدامات أدناه **مرشحة** وغير مؤكدة.

| Use case مرشح | الحالة |
|---|---|
| Credential exposure monitoring | ⛔ غير متحقق |
| Email exposure | ⛔ غير متحقق |
| Domain exposure | ⛔ غير متحقق |
| Breach intelligence | ⛔ غير متحقق |
| Leak alerts (push/webhook أو polling) | ⛔ غير متحقق |
| Exposure history | ⛔ غير متحقق |
| Organization-level monitoring | ⛔ غير متحقق |

### المعلومات الناقصة بالظبط (مطلوبة من Fox)

1. **Authentication:** نوع (API key / OAuth2 / HMAC)، مكان إرساله (header؟)، تدوير، هل فيه keys متعددة/sub-accounts per customer.
2. **Endpoints:** القائمة الكاملة + base URL + versioning.
3. **Request schemas:** لكل endpoint — نوع المؤشر (email/domain/username/password hash؟)، هل يقبل hashed/k-anonymity queries أو لازم القيمة الخام.
4. **Response schemas:** الحقول، breach metadata، هل يرجع كلمات سر (plaintext/hashed/masked)، تواريخ (first/last seen، breach date)، مصادر.
5. **Rate limits & quotas:** لكل دقيقة/يوم/شهر، per key أم per account، سلوك تجاوزها.
6. **Error model:** أكواد الأخطاء وشكلها.
7. **Monitoring:** هل فيه watchlists/subscriptions وwebhooks؟ توقيع الـ webhooks؟
8. **Ownership verification:** هل LeakRadar يشترط إثبات ملكية الدومين/الإيميل قبل البحث؟ (لو لا — HakTrak **لازم** يفرضه بنفسه: email verification لكل إيميل، DNS TXT للدومين).
9. **Licensing:** هل مسموح استخدام النتائج في منتج تجاري لعملاء نهائيين؟ إعادة توزيع؟ عرض بيانات حساسة للمستخدم؟ تخزين؟ مدة؟
10. **Data retention/processing terms:** هل LeakRadar يخزن الاستعلامات؟ DPA متاح؟ موقع المعالجة؟
11. **Pricing model:** per query / per monitored identity / flat.
12. **Credentials config:** كيف ستُسلم (لا تُرسل في الشات؛ تُضاف لاحقاً في Secrets Manager مباشرة).

### التصميم المشروط (يتفعّل فقط بعد الوثائق)

- Adapter `leakradar` في الـ Gateway.
- **Consent:** المستخدم الشخصي يضيف إيميل → verification link → consent على "monitor this email via LeakRadar". المؤسسة: domain verification (DNS TXT) + سياسة مكتوبة + إخطار الأعضاء.
- **Tenant isolation:** watchlists ونتائج per tenant فقط؛ لا cache مشترك.
- **Alert normalization:** `indicatorType=email|org-domain`، `verdict=exposed|not-found`، severity حسب نوع البيانات المسربة (credential > PII > email only) — mapping يُكتب بعد رؤية الـ schema.
- **لا نعرض كلمات سر مسربة** أبداً؛ فقط "credential exposed in {source} on {date}" + توصية تغيير.
- **Attribution:** "Source: LeakRadar" + timestamp في كل تنبيه.

---

## 3. VirusTotal Integration Assessment (Deliverable 7)

### الحالة: **DESIGN READY — CAPABILITIES PENDING VERIFICATION**

لا توجد وثائق/عقد مقدم من Fox. المعلومات في عمود "معروف عامة" مصدرها معرفتي العامة عن VirusTotal API v3 وهي **[Unverified]** — لازم تتأكد من الوثائق الرسمية ومن الـ plan الفعلي قبل البناء.

### 3.1 القدرات المرشحة

| القدرة | معروف عامة [Unverified] | HakTrak قرار | الحالة |
|---|---|---|---|
| File hash lookup | API v3 فيه lookup لملف بالـ hash (MD5/SHA-1/SHA-256) | **الوضع الافتراضي** والوحيد التلقائي (بموافقة على مشاركة الـ hashes) | Pending verification |
| File reputation / detection results | نتائج محركات متعددة + إحصاءات | نعرض الإحصاءات + "according to VirusTotal at {time}" | Pending |
| URL analysis | lookup وتحليل URL | يدوي من المستخدم فقط (URL قد يحتوي tokens/PII) | Pending |
| Domain reputation | lookup لدومين | من Threat Monitor المحلي لاحقاً، بموافقة | Pending |
| IP reputation | lookup لـ IP | نفس السابق | Pending |
| Analysis status | استعلام عن تحليل مُرسل | فقط لعمليات submit صريحة | Pending |
| File submission | رفع ملف للتحليل | **استثناء** بموافقة صريحة لكل ملف | Pending + privacy gate |
| Quotas | الـ public API له حصص منخفضة جداً، والـ premium له حصص حسب العقد | لازم الرقم من العقد | **مجهول** |
| Commercial use | شروط الـ public API — حسب فهمي العام — **لا تسمح** بالاستخدام في منتج تجاري؛ المنتجات التجارية تحتاج اشتراك premium/اتفاق | **ممنوع البناء على public API key** | **يحجب الإطلاق** حتى تأكيد (OQ-03) |

### 3.2 قواعد الخصوصية والأمان (غير قابلة للتفاوض)

1. **لا رفع تلقائي للملفات أبداً** — لا من scan، ولا schedule، ولا policy مؤسسة، ولا remote command.
2. **Hash-first:** الـ Desktop يحسب SHA-256 محلياً ويرسل الـ hash فقط (عبر HakTrak Cloud → Gateway).
3. **تمييز واضح في الواجهة:** زرين مختلفين ونصين مختلفين: "Check reputation (sends only a fingerprint)" مقابل "Upload file to VirusTotal (sends the full file)".
4. **File submission consent:** dialog لكل ملف يوضح:
   - الملف بالكامل سيُرسل لطرف ثالث (VirusTotal / Google).
   - الملفات المرفوعة لـ VirusTotal — حسب سياسة VirusTotal المعلنة كما أفهمها [Unverified] — **قد تصبح متاحة لمشتركين آخرين في خدماتها** وقد لا يمكن حذفها.
   - لا ترفع مستندات، عقود، ملفات تحتوي بيانات شخصية أو أسرار.
   - checkbox "I understand" + اسم الملف + الحجم + الـ hash.
   - الموافقة تُنتج **consent token** مربوط بـ (file hash، user، device، expiry 10 دقائق، استخدام واحد)؛ الـ Gateway يرفض أي submit بدون token صالح.
5. **Enterprise:** admin يقدر **يمنع** file submission للـ org كلها (افتراضي: ممنوع للـ enterprise لحد ما يفعله admin)، ولا يقدر **يفرضه**.
6. **أحجام:** حد أقصى للرفع (حسب الوثائق) + الرفض المحلي قبل الإرسال.
7. **مسار الرفع:** Desktop → HakTrak Cloud (streaming، لا تخزين دائم؛ حذف بعد الإرسال) → Gateway → VT. بديل يستحق التقييم: signed upload URL من VT مباشرة من الـ Desktop **بدون** API key — يعتمد على دعم VT (Pending).
8. **المفتاح:** في Secrets Manager داخل الـ Gateway فقط. **مفتاح الـ CI الحالي منفصل تماماً** ولا يُعاد استخدامه للمنتج.
9. **النتائج ليست أحكاماً نهائية:** `verdict` يُعرض مع العدد ("5/70 engines flagged") والوقت والمصدر، ولا يؤدي لأي إجراء تلقائي؛ الإجراء (quarantine) قرار المستخدم عبر `ExecutionEngine`.
10. **Timestamps + attribution** محفوظة دائماً في الـ cache والتقارير.

### 3.3 Normalization mapping (مبدئي، يتعدل بعد الوثائق)

| VT result [Unverified fields] | HakTrak verdict | confidence |
|---|---|---|
| malicious ≥ threshold (configurable، مثلاً ≥3) | `malicious` | medium→high حسب العدد |
| malicious 1–2 أو suspicious > 0 | `suspicious` | low |
| 0 detections, analyzed | `undetected` (مش "clean") | low |
| hash not found | `not-found` | — |

### 3.4 المعلومات المطلوبة لإزالة الـ Pending

نوع الـ plan، الحصص الفعلية، شروط الاستخدام التجاري وعرض النتائج للعملاء، endpoints المسموحة في الـ plan، حدود حجم الرفع، سياسة الخصوصية للملفات المرفوعة، شروط الـ caching/المشاركة بين العملاء، شروط attribution (شعار/نص).
