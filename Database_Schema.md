# هيكل قاعدة بيانات أوربت إكس (OrbitX Database Schema)

يحتوي هذا الملف على الهيكل الكامل لقاعدة البيانات الخاصة بتطبيق **أوربت إكس (OrbitX)**. تم تصميم قاعدة البيانات لتكون متوافقة بالكامل مع كل من **Supabase (PostgreSQL)** كطبقة توافقية مرنة (JSONB)، ومع **Firebase (Firestore)** كبنية مستندات NoSQL.

---

## 1. كود سكربت Supabase SQL (`supabaseSchema.sql`)
إذا كنت تستخدم **Supabase** كقاعدة بيانات خلفية، يمكنك نسخ هذا السكربت بالكامل وتشغيله في مفسر الـ SQL (SQL Editor) داخل لوحة تحكم Supabase الخاصة بك:

```sql
-- =========================================================================
-- ORBITX SUPABASE DATABASE SCHEMA MIGRATION SCRIPT
-- =========================================================================
-- Description: This script sets up a highly optimized, fully compatible
-- NoSQL-on-PostgreSQL compatibility layer using JSONB storage.
-- It maps all hierarchical Firestore collections (including subcollections)
-- onto a single high-performance 'documents' table.
--
-- Instructions:
-- 1. Go to your Supabase Dashboard: https://supabase.com
-- 2. Select your OrbitX project.
-- 3. Click on "SQL Editor" in the left-hand sidebar navigation.
-- 4. Create a "New Query", paste this entire script, and click "Run".
-- =========================================================================

-- 1. Create the unified documents table
CREATE TABLE IF NOT EXISTS public.documents (
    path TEXT PRIMARY KEY,                       -- Full unique path of document (e.g. "users/123", "rooms/room_abc/messages/msg_xyz")
    collection TEXT NOT NULL,                    -- The parent collection name (e.g. "users", "global_chat", "messages")
    id TEXT NOT NULL,                            -- Only the document ID portion (e.g. "123", "msg_xyz")
    data JSONB NOT NULL DEFAULT '{}'::jsonb,     -- Flexible document fields stored as high-performance binary JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add high-performance indexes
-- Index for lightning-fast queries by collection (e.g. fetching all posts in global_chat)
CREATE INDEX IF NOT EXISTS idx_documents_collection ON public.documents(collection);

-- GIN (Generalized Inverted Index) for high-performance key searches inside JSONB data fields (e.g., where 'userId' == 'xyz')
CREATE INDEX IF NOT EXISTS idx_documents_data_gin ON public.documents USING gin (data);

-- 3. Enable Realtime Replication for the table
-- This enables live instant chat updates, active study room timers, and visual focus metrics!
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 5. Define access policies for the compat layer
-- Read Policy: Allow anyone (anonymous or authenticated) to read data for testing and seamless transition
CREATE POLICY "Allow public read access" 
ON public.documents 
FOR SELECT 
USING (true);

-- Insert/Update/Delete Policy: Allow anyone to perform mutations
CREATE POLICY "Allow public write mutations" 
ON public.documents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update mutations" 
ON public.documents 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete mutations" 
ON public.documents 
FOR DELETE 
USING (true);

-- 6. Automatically update 'updated_at' column on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER trigger_update_documents_timestamp
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- Done! Your Supabase Postgres database is now ready for OrbitX.
-- =========================================================================
```

---

## 2. هيكل مجموعات وحقول البيانات (Firestore / NoSQL Collections)
تعتمد بنية مستندات التطبيق على الهيكلية التالية لحفظ البيانات، والمطابقة للمخطط الموجود في `firebase-blueprint.json`:

### المجموعات الرئيسية (Main Collections):

1. **`users` (الملفات الشخصية الخاصة)**
   - `uid` (string): معرف المستخدم الفريد.
   - `displayName` (string): اسم المستخدم.
   - `email` (string): البريد الإلكتروني.
   - `photoURL` (string): رابط الصورة الشخصية.
   - `bio` (string): النبذة الشخصية.
   - `level` (number): المستوى الحالي للمستخدم.
   - `xp` (number): نقاط الخبرة.
   - `hearts` (number): القلوب المتبقية.
   - `coins` (number): العملات المعدنية المجمعة.
   - `role` (string): الصلاحية (`admin` أو `user`).
   - `inventory` (array): قائمة الأدوات والمعدات المملوكة.
   - `equippedItems` (object): المعدات المرتداة (المظهر، الرأس، الإكسسوارات).

2. **`profiles` (الملفات الشخصية العامة)**
   - نسخة عامة خالية من البيانات الحساسة لعرضها في المتصدرين وقوائم الأصدقاء.

3. **`rooms` (غرف الدراسة والمذاكرة المشتركة)**
   - `name` (string): اسم الغرفة.
   - `task` (string): المهمة أو المادة المحددة للمذاكرة.
   - `creatorId` (string): معرف منشئ الغرفة.
   - `creatorName` (string): اسم المنشئ.
   - `participants` (array): قائمة بـ `uid` المشاركين النشطين.
   - `maxParticipants` (number): الحد الأقصى للمشاركين.
   - `timerStatus` (string): حالة المؤقت (`idle`, `focus`, `break`).
   - `timerDuration` (number): مدة التركيز بالدقائق.
   - `breakDuration` (number): مدة الاستراحة بالدقائق.
   - `createdAt` (datetime): وقت إنشاء الغرفة.
   
   * المجموعات الفرعية للغرف:*
   - **`rooms/{roomId}/messages`**: المحادثات المباشرة داخل الغرفة.

4. **`global_chat` (المحادثة الكونية العامة)**
   - رسائل يتبادلها جميع رواد فضاء المنصة بشكل لحظي.

5. **`discussions` (منتدى النقاشات الفضائية)**
   - مواضيع ونقاشات يطرحها المستخدمون لمشاركة المعرفة.
   
   * المجموعات الفرعية للنقاشات:*
   - **`discussions/{discussionId}/replies`**: الردود على الموضوع المطروح.

6. **`challenges` (التحديات الثنائية)**
   - تحديات التركيز والمنافسة بين الأصدقاء.

7. **`exhibitions` (معرض إنجازات الرواد)**
   - صور لوحات وصور دراسة يشاركها الرواد في المعرض العام.

8. **`suggestions` (المقترحات والدعم الفني)**
   - المقترحات والأفكار المرسلة من الرواد لتحسين المركبة.

9. **`awareness_signals` (إشارات الوعي والتركيز)**
   - نصائح ومقالات علمية توعوية عن الانتاجية والتركيز.
