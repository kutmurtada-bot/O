import {readFileSync,existsSync} from 'node:fs';
let bad=0;const fail=m=>{console.error('✗',m);bad++};
import vm from 'node:vm';
const html=readFileSync('index.html','utf8'),js=(html.match(/<script>([\s\S]*?)<\/script>/)||[])[1]||'';
if(!js)fail('لم يتم العثور على كود JavaScript داخل index.html');else try{new vm.Script(js)}catch(e){fail('خطأ في صياغة JavaScript: '+e.message)}
if(/href="style\.css"|src="app\.js"/.test(html))fail('index.html يجب أن يكون ملفاً واحداً بدون ملفات خارجية');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1])),dyn=new Set(['y','x','eN','eM','eP','eT','eS','vI','vN','vA','vD','lQ','lL','lS','erC','erX','snQ','snSort','snEnv','snLevel','snTabSentry','snTabLocal','snTabWf','snTabTest','snGenType','snGenRef','snGenProm','snGenNet','snGenCust','snTgAlert','snOpenDash','snCloseInsp','snInspClose','snResBtn','snIgnBtn','snUnresBtn','snCopyTest']);
for(const m of js.matchAll(/\$\('#([\w-]+)'\)/g))if(!ids.has(m[1])&&!dyn.has(m[1]))fail('عنصر مفقود في HTML: #'+m[1]);
if(/\d{8,10}:[A-Za-z0-9_-]{35}/.test(html+js))fail('يوجد رمز Telegram داخل الكود!');
const man=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
for(const i of man.icons)if(!existsSync('public/'+i.src))fail('أيقونة مفقودة: '+i.src);
for(const f of [...readFileSync('public/sw.js','utf8').matchAll(/'([\w.\-]+\.\w+)'/g)].map(m=>m[1]))if(f!=='index.html'||0)if(!existsSync('public/'+f)&&f!=='index.html')fail('ملف في كاش sw.js غير موجود: '+f);
if(bad){console.error(`فشل الفحص (${bad})`);process.exit(1)}console.log('✓ الفحص الثابت سليم');
