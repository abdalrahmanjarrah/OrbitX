#!/bin/bash
# فحص قاعدة البيانات OrbitX - آمن، لا يعرض مفتاح service_role
# فقط اضغط يشغّل وهذا الفحص بالترمينال

cd "$(dirname "$0")"
read -s -p "الصق مفتاح service_role ثم Enter: " KEY
echo ""
echo "=== فحص قاعدة البيانات ==="

node -e '
const url = process.env.URL;
const k = process.env.KEY;
(async () => {
  const r = await fetch(`${url}/rest/v1/documents?select=collection&limit=2000`, {
    headers: { apikey: k, Authorization: `Bearer ${k}` }
  });
  const t = await r.text();
  let b; try { b = JSON.parse(t); } catch { b = t; }
  console.log("status:", r.status);
  if (Array.isArray(b)) {
    const c = {};
    b.forEach(d => c[d.collection] = (c[d.collection] || 0) + 1);
    console.log("collections:", JSON.stringify(c, null, 1));
    console.log("total rows:", b.length);
  } else {
    console.log("response:", JSON.stringify(b).slice(0, 400));
  }
})();
' URL="$VITE_SUPABASE_URL"
# نمرر الـ key كمتغير بيئة سرّي
URL="$(grep VITE_SUPABASE_URL .env | cut -d= -f2)" KEY="$KEY" node --input-type=module -e '
const url = process.env.URL; const k = process.env.KEY;
const r = await fetch(`${url}/rest/v1/documents?select=collection&limit=2000`, { headers: { apikey: k, Authorization: `Bearer ${k}` } });
const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; }
console.log("status:", r.status);
if (Array.isArray(b)) { const c={}; b.forEach(d=>c[d.collection]=(c[d.collection]||0)+1); console.log("cols:", JSON.stringify(c,null,1)); console.log("total:", b.length); } else console.log("resp:", JSON.stringify(b).slice(0,400));
' 2>/dev/null
