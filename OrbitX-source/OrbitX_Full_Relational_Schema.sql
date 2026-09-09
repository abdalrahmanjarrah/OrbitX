/* 
=========================================================================
               مخطط قاعدة البيانات الكامل والعلائقي لمنصة OrbitX
                    OrbitX Full Relational Database Schema
=========================================================================
 Description: This SQL file contains the FULL relational database schema
 designed specifically for Supabase (PostgreSQL). It represents every
 core feature of OrbitX with native relational tables, proper foreign keys,
 indexes, triggers, and Row Level Security (RLS) policies.
=========================================================================
*/

-- تفعيل إضافات الـ UUID لتوليد المعرفات الفرعية تلقائياً إذا لزم الأمر
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول المستخدمين والملفات الشخصية (users)
CREATE TABLE IF NOT EXISTS public.users (
    uid TEXT PRIMARY KEY,                            -- المعرف الفريد القادم من نظام المصادقة (Auth UID)
    display_name TEXT NOT NULL,                      -- اسم العرض الفريد بالمنصة
    email TEXT UNIQUE NOT NULL,                      -- البريد الإلكتروني للرائد
    photo_url TEXT,                                  -- رابط الصورة الرمزية للمستخدم (Avatar)
    bio TEXT,                                        -- النبذة الشخصية وعالم الرائد الخاص به
    level INTEGER DEFAULT 1 NOT NULL,                -- المستوى الحالي للرائد في الفضاء
    xp INTEGER DEFAULT 0 NOT NULL,                  -- نقاط الخبرة التراكمية (Experience Points)
    hearts INTEGER DEFAULT 5 NOT NULL,               -- عدد القلوب المتبقية للمذاكرة والتركيز
    coins INTEGER DEFAULT 100 NOT NULL,              -- عملات أوربت الذهبية المكتسبة
    role TEXT DEFAULT 'user'::text NOT NULL,         -- الصلاحية داخل التطبيق (user, admin)
    inventory JSONB DEFAULT '[]'::jsonb NOT NULL,    -- الأدوات والمظاهر التي اشتراها الرائد من المتجر
    equipped_items JSONB DEFAULT '{}'::jsonb NOT NULL,-- الأدوات والمظاهر المرتداة حالياً (المظهر، الرأس، الإكسسوار)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشرات الأداء لجدول المستخدمين
CREATE INDEX IF NOT EXISTS idx_users_xp ON public.users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. جدول غرف الدراسة والتركيز المشتركة (rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- معرف الغرفة الفريد
    name TEXT NOT NULL,                               -- اسم الغرفة الكونية
    task TEXT NOT NULL,                               -- المادة أو المهمة المحددة للتركيز فيها
    creator_id TEXT REFERENCES public.users(uid) ON DELETE SET NULL, -- معرف المنشئ للغرفة
    creator_name TEXT NOT NULL,                       -- اسم منشئ الغرفة
    max_participants INTEGER DEFAULT 8 NOT NULL,      -- الحد الأقصى للرواد داخل الغرفة
    participants JSONB DEFAULT '[]'::jsonb NOT NULL,  -- قائمة الرواد المتواجدين حالياً بالداخل
    timer_status TEXT DEFAULT 'idle'::text NOT NULL,  -- حالة مؤقت الغرفة (idle, focus, break)
    timer_duration INTEGER DEFAULT 25 NOT NULL,       -- مدة جلسة التركيز بالدقائق (مثال: 25 دقيقة بومودورو)
    break_duration INTEGER DEFAULT 5 NOT NULL,        -- مدة جلسة الاستراحة بالدقائق (مثال: 5 دقائق استراحة)
    is_challenge BOOLEAN DEFAULT false NOT NULL,      -- هل الغرفة عبارة عن تحدي دراسي تنافسي؟
    challenge_id TEXT,                                -- معرف التحدي المرتبط بها إن وجد
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشر البحث لغرف المذاكرة
CREATE INDEX IF NOT EXISTS idx_rooms_timer_status ON public.rooms(timer_status);

-- 3. جدول رسائل غرف الدراسة (room_messages)
CREATE TABLE IF NOT EXISTS public.room_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(room_id) ON DELETE CASCADE, -- الغرفة التابع لها الرسالة
    sender_id TEXT REFERENCES public.users(uid) ON DELETE SET NULL, -- مرسل الرسالة
    sender_name TEXT NOT NULL,                         -- اسم مرسل الرسالة لتسريع الاستعلام
    sender_avatar TEXT,                                -- صورة مرسل الرسالة للتسهيل البصري
    text TEXT,                                         -- نص الرسالة المرسلة
    image_url TEXT,                                    -- رابط الصورة إن أرفق صورة بالدردشة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشرات الدردشة للتصفح اللحظي والسريع للرسائل مرتبة تنازلياً حسب الوقت
CREATE INDEX IF NOT EXISTS idx_room_messages_room_time ON public.room_messages(room_id, created_at DESC);

-- 4. دردشة المجرة الكونية العامة (global_chat)
CREATE TABLE IF NOT EXISTS public.global_chat (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT,
    text TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشر الوقت للدردشة العامة لجلب آخر الرسائل فورياً
CREATE INDEX IF NOT EXISTS idx_global_chat_time ON public.global_chat(created_at DESC);

-- 5. منتدى النقاشات الفضائية (discussions)
CREATE TABLE IF NOT EXISTS public.discussions (
    discussion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,                               -- عنوان النقاش المطروح
    category TEXT DEFAULT 'general'::text NOT NULL,    -- تصنيف النقاش (برمجة، فيزياء، لغات، إلخ)
    content TEXT NOT NULL,                             -- محتوى النقاش التفصيلي بالماركداون
    creator_id TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
    creator_name TEXT NOT NULL,
    creator_avatar TEXT,
    likes_count INTEGER DEFAULT 0 NOT NULL,            -- عدد الإعجابات التي حصل عليها النقاش
    likes_users JSONB DEFAULT '[]'::jsonb NOT NULL,    -- قائمة بمعرفات الرواد المعجبين بالنقاش لمنع تكرار الإعجاب
    replies_count INTEGER DEFAULT 0 NOT NULL,          -- عدد الردود المتوفرة بالنقاش حالياً
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشر البحث السريع حسب التصنيف
CREATE INDEX IF NOT EXISTS idx_discussions_category ON public.discussions(category);

-- 6. ردود منتدى النقاشات (discussion_replies)
CREATE TABLE IF NOT EXISTS public.discussion_replies (
    reply_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID REFERENCES public.discussions(discussion_id) ON DELETE CASCADE, -- النقاش التابع له الرد
    creator_id TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
    creator_name TEXT NOT NULL,
    creator_avatar TEXT,
    content TEXT NOT NULL,                             -- نص الرد المقترح
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشر الاستعلام عن ردود نقاش معين
CREATE INDEX IF NOT EXISTS idx_replies_discussion_id ON public.discussion_replies(discussion_id, created_at ASC);

-- 7. جدول تحديات الرواد الثنائية (challenges)
CREATE TABLE IF NOT EXISTS public.challenges (
    challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id TEXT REFERENCES public.users(uid) ON DELETE CASCADE,  -- الرائد المتحدي
    creator_name TEXT NOT NULL,
    opponent_id TEXT REFERENCES public.users(uid) ON DELETE CASCADE, -- الرائد المتحدَّى
    opponent_name TEXT NOT NULL,
    task TEXT NOT NULL,                                 -- مادة أو موضوع التحدي
    duration_minutes INTEGER DEFAULT 25 NOT NULL,       -- وقت التحدي الإجمالي بالدقائق
    status TEXT DEFAULT 'pending'::text NOT NULL,       -- حالة التحدي (pending, active, completed, declined)
    winner_id TEXT,                                     -- معرف الرائد الفائز بالتحدي
    creator_xp_earned INTEGER DEFAULT 0 NOT NULL,       -- نقاط الخبرة التي كسبها المتحدي
    opponent_xp_earned INTEGER DEFAULT 0 NOT NULL,      -- نقاط الخبرة التي كسبها الخصم
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشرات الأداء لاستعلامات التحديات لكل مستخدم
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON public.challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_opponent ON public.challenges(opponent_id);

-- 8. معرض إنجازات الرواد الفني والدراسي (exhibitions)
CREATE TABLE IF NOT EXISTS public.exhibitions (
    exhibition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id TEXT REFERENCES public.users(uid) ON DELETE CASCADE,
    creator_name TEXT NOT NULL,
    creator_avatar TEXT,
    image_url TEXT NOT NULL,                            -- صورة لوحة الدراسة أو الإنجاز
    caption TEXT,                                       -- التعليق المرافق للصورة
    likes INTEGER DEFAULT 0 NOT NULL,                   -- عدد الإعجابات العامة للوحة
    likes_users JSONB DEFAULT '[]'::jsonb NOT NULL,     -- قائمة الرواد المتفاعلين بالقلب مع الإنجاز
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشر تصفح معرض الصور التنازلي
CREATE INDEX IF NOT EXISTS idx_exhibitions_time ON public.exhibitions(created_at DESC);

-- 9. المقترحات والدعم الفني للمركبة (suggestions)
CREATE TABLE IF NOT EXISTS public.suggestions (
    suggestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
    creator_name TEXT NOT NULL,
    title TEXT NOT NULL,                                -- عنوان المقترح المطروح للتطوير
    content TEXT NOT NULL,                              -- تفاصيل الاقتراح والمميزات المقترحة
    status TEXT DEFAULT 'pending'::text NOT NULL,       -- حالة المقترح (pending, review, implemented, rejected)
    votes INTEGER DEFAULT 0 NOT NULL,                   -- نقاط التصويت على المقترح
    voted_users JSONB DEFAULT '[]'::jsonb NOT NULL,     -- قائمة المستخدمين الذين صوتوا لدعم المقترح
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. إشارات الوعي والتركيز والمقالات (awareness_signals)
CREATE TABLE IF NOT EXISTS public.awareness_signals (
    signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,                                -- عنوان المقال التوعوي عن الإنتاجية
    category TEXT DEFAULT 'mindfulness'::text NOT NULL, -- تصنيف المقال (صحة نفسية، تقنيات تركيز، علم نفس)
    summary TEXT NOT NULL,                              -- ملخص مبسط للمقال
    content TEXT NOT NULL,                              -- المقال الكامل منسقاً بالـ Markdown
    image_url TEXT,                                     -- الصورة التعبيرية المرافقة للمقال
    likes INTEGER DEFAULT 0 NOT NULL,                   -- تفاعلات الإعجاب بالمقال
    read_time_minutes INTEGER DEFAULT 3 NOT NULL,       -- الوقت المقدر للقراءة بالدقائق
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. إشعارات التنبيه الكونية (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id TEXT REFERENCES public.users(uid) ON DELETE CASCADE, -- المستلم للتنبيه
    sender_id TEXT,                                      -- مرسل الإشعار إن وجد
    sender_name TEXT,                                    -- اسم المرسل للتسهيل البصري
    type TEXT NOT NULL,                                  -- نوع الإشعار (challenge_invite, room_alert, admin_message)
    title TEXT NOT NULL,                                 -- عنوان الإشعار
    message TEXT NOT NULL,                               -- محتوى ومضمون الإشعار بالكامل
    is_read BOOLEAN DEFAULT false NOT NULL,              -- هل تم قراءة الإشعار؟
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,         -- بيانات برمجية إضافية مرافقة للإشعار
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- مؤشر مخصص لجلب الإشعارات غير المقروءة بسرعة فائقة
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read) WHERE is_read = false;

-- الآليات البرمجية التلقائية والـ Triggers والمؤثرات اللحظية

-- 1. تحديث حقل التوقيت المحدث (updated_at) تلقائياً عند إجراء أي تعديل بجدول المستخدمين
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER trigger_update_users_timestamp
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. تحديث حقل التوقيت المحدث (updated_at) تلقائياً لغرف التركيز
CREATE OR REPLACE TRIGGER trigger_update_rooms_timestamp
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. تحديث حقل التوقيت المحدث (updated_at) تلقائياً للمنتديات والنقاشات
CREATE OR REPLACE TRIGGER trigger_update_discussions_timestamp
    BEFORE UPDATE ON public.discussions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- تفعيل البث اللحظي والتفاعلي (Supabase Realtime)
-- هذا القسم يؤمن استقبال الرواد للتنبيهات والرسائل والعدادات التنازلية
-- لحظة بلحظة دون الحاجة لطلب تحديث يدوي للصفحة نهائياً!

ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exhibitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- لوائح الأمان وحماية البيانات والرواد (RLS Policies)
-- تفعيل سياسات الحماية على الجداول لحماية خصوصية بيانات المستخدمين

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awareness_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- أمثلة على سياسات أمان ذكية وتفاعلية:

-- سياسة الأمان لجدول المستخدمين: السماح للجميع برؤية بعضهم البعض، ولكن التعديل للذات فقط
CREATE POLICY "Users profiles are visible to all crew members" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can only update their own cosmic profile" ON public.users FOR UPDATE USING (auth.uid()::text = uid);

-- سياسة الأمان لدردشة المجرة العامة: الجميع يمكنه القراءة، والمسجلون يمكنهم الإرسال
CREATE POLICY "Global chat is readable by everyone" ON public.global_chat FOR SELECT USING (true);
CREATE POLICY "Authenticated users can transmit to global chat" ON public.global_chat FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- سياسة الأمان للإشعارات: المستخدم لا يمكنه رؤية أو تعديل سوى الإشعارات الموجهة إليه خصيصاً لحفظ الخصوصية
CREATE POLICY "Users can view their own cosmic notifications" ON public.notifications FOR SELECT USING (auth.uid()::text = recipient_id);
CREATE POLICY "Users can update (read/delete) their own notifications" ON public.notifications FOR UPDATE USING (auth.uid()::text = recipient_id);

-- تهانينا! المخطط الفضائي لقاعدتك جاهز تماماً
