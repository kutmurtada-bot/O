import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const el=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':k==='classList'?{add(){},remove(){},toggle(){}}:k==='style'?{setProperty(){}}:k==='dataset'?{}:k==='selectedOptions'?[{text:'',value:''}]:k==='options'?[]:el(),set:()=>true,apply:()=>el()});
const store={};const ctx=vm.createContext({document:{querySelector:()=>el(),querySelectorAll:()=>[],documentElement:el(),createElement:()=>el(),head:el(),body:el()},
 localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}},window:{},location:{hostname:''},navigator:{},addEventListener(){},setInterval(){},setTimeout(){},clearTimeout(){},scrollTo(){},console});
vm.runInContext((readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1]),ctx);const run=c=>vm.runInContext(c,ctx);
test('تفصيل الحصة بالأكياس',()=>{assert.equal(run('taf(90)'),'1 كيس و 40 كغم');assert.equal(run('taf(36)'),'0 كيس و 36 كغم');assert.equal(run('taf(50)'),'1 كيس و 0 كغم')});
test('حالات الاستلام: كامل / جزئي / لا شيء',()=>{
 run(`DB.dist={'2026-10':{recs:{a:{bag:1},b:{bag:1,extra:1},c:{extra:1}}}}`);
 const s=run(`JSON.stringify([[90,'a'],[90,'b'],[36,'c'],[90,'d']].map(([f,id])=>calc({id,flour:f,amount:f*250/9},'2026-10').s))`);
 assert.equal(s,'["part","full","full","none"]')});
test('المبلغ المستلم يتناسب مع الكمية',()=>{assert.equal(run(`calc({id:'a',flour:90,amount:2500},'2026-10').money`),1389);assert.equal(run(`calc({id:'z',flour:0,amount:0},'2026-10').money`),0)});
test('تطبيع البحث العربي',()=>{assert.ok(run(`norm('أحمد')===norm('احمد')`));assert.ok(run(`norm('فاطمة')===norm('فاطمه')`));assert.ok(run(`norm('عَلِي')===norm('علي')`))});
test('ترتيب رقم الصفحة',()=>{assert.equal(run(`pn({page:'12'})`),12);assert.equal(run(`pn({page:'ص 7'})`),7);assert.ok(run(`pn({page:''})`)>1e8)});
test('حماية من حقن HTML',()=>{assert.ok(!run(`esc('<img onerror=x>"')`).includes('<'))});
test('تنسيق الأرقام',()=>{assert.equal(run('n(1245)'),'1,245');assert.equal(run('n()'),'0')});
test('مركز الأخطاء يسجل ولا يكرر',()=>{run("LS.setItem('sanabil_errlog','[]');logErr(new Error('x1'),'t');logErr(new Error('x1'),'t')");assert.equal(run('errs().length'),1);assert.equal(run('errs()[0].m'),'x1');assert.equal(run('errs()[0].u'),0)});
test('الخطأ يُحسب كغير مقروء ثم يُصفّر عند العرض',()=>{assert.equal(run('errs().filter(x=>!x.u).length'),1)});

test('تنقية البيانات وحظر تسريب الرموز والمعلومات الشخصية (PII Redaction)',()=>{
 run(`DB.families = [{id:'f1', name:'حسين علي كاظم'}];`);
 const scrubbed = run(`scrubPii('خطأ عند معالجة العائلة حسين علي كاظم برقم 07801234567 والرمز a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2')`);
 assert.ok(!scrubbed.includes('حسين علي كاظم'));
 assert.ok(scrubbed.includes('[NAME_REDACTED]'));
 assert.ok(scrubbed.includes('[PHONE_REDACTED]'));
 assert.ok(scrubbed.includes('[AUTH_TOKEN_REDACTED]'));
});

test('توليد بصمة الخطأ (Fingerprint) وتجميع المشكلات المماثلة',()=>{
 const fp1 = run(`fingerprintOf(new TypeError('Cannot read properties of undefined'), 'calc')`);
 const fp2 = run(`fingerprintOf(new TypeError('Cannot read properties of undefined'), 'calc')`);
 assert.equal(fp1, fp2);
 assert.ok(fp1.startsWith('TypeError:'));
});

test('ترتيب وأولويات مشاكل Sentry (حسب التكرار والمستوى والبيئة)',()=>{
 const res = run(`
  const issues = [
   {id:'1', count:3, userCount:2, level:'error', env:'production', lastSeen:'2026-11-01T01:00:00Z'},
   {id:'2', count:15, userCount:8, level:'fatal', env:'production', lastSeen:'2026-11-01T02:00:00Z'},
   {id:'3', count:1, userCount:1, level:'warning', env:'development', lastSeen:'2026-11-01T03:00:00Z'}
  ];
  JSON.stringify({
   byFreq: prioritizeIssues(issues, 'freq', 'all', 'all').map(x=>x.id),
   byCrit: prioritizeIssues(issues, 'lastSeen', 'all', 'critical').map(x=>x.id),
   prodOnly: prioritizeIssues(issues, 'lastSeen', 'production', 'all').map(x=>x.id)
  })
 `);
 const parsed = JSON.parse(res);
 assert.deepEqual(parsed.byFreq, ['2', '1', '3']);
 assert.deepEqual(parsed.byCrit, ['2', '1']);
 assert.deepEqual(parsed.prodOnly, ['2', '1']);
});

test('حساب مؤشرات لوحة Sentry وتتبع الحالات',()=>{
 const metrics = run(`
  const list = [
   {status:'unresolved', level:'error', count:5, userCount:3, firstSeen:'2026-11-01T05:00:00Z'},
   {status:'unresolved', level:'fatal', count:1, userCount:1, firstSeen: new Date().toISOString()},
   {status:'resolved', level:'info', count:2, userCount:1, firstSeen:'2026-10-20T00:00:00Z'}
  ];
  calcIssueMetrics(list, [{m:'loc1'}, {m:'loc2'}]);
 `);
 assert.equal(metrics.totalUnres, 2);
 assert.equal(metrics.criticalCount, 2);
 assert.equal(metrics.resolvedCount, 1);
 assert.equal(metrics.totalEvents, 8);
 assert.equal(metrics.localCount, 2);
});

test('إعادة فتح المشكلة تلقائياً عند تكرار حدوثها بعد الحل',()=>{
 run(`
  LS.setItem('sanabil_errlog', JSON.stringify([{
   id:'loc_test', src:'app', m:'fail', status:'resolved', count:1, t:Date.now()-5000, lastSeen:Date.now()-5000
  }]));
  const err = new Error('fail'); err.name = 'CustomError';
  logErr(err, 'app');
 `);
 const list = run('errs()');
 assert.equal(list[0].status, 'unresolved');
 assert.equal(list[0].reopened, true);
 assert.equal(list[0].count, 2);
});

test('تطبيع وتحليل بيانات المشكلة من Sentry API (parseSentryIssue)',()=>{
 const parsed = run(`
  parseSentryIssue({
   id: '99881',
   shortId: 'SANABIL-7',
   title: 'Uncaught TypeError in renderDist',
   culprit: 'renderDist(index.html:184)',
   level: 'fatal',
   status: 'unresolved',
   count: '42',
   userCount: '19',
   firstSeen: '2026-10-25T10:00:00Z',
   lastSeen: '2026-11-01T07:00:00Z',
   permalink: 'https://sentry.io/organizations/my-org/issues/99881/'
  })
 `);
 assert.equal(parsed.id, '99881');
 assert.equal(parsed.shortId, 'SANABIL-7');
 assert.equal(parsed.level, 'fatal');
 assert.equal(parsed.count, 42);
 assert.equal(parsed.userCount, 19);
 assert.equal(parsed.reopened, true);
});

test('خطوات مسار التحقيق والحل (10 خطوات QA)',()=>{
 const steps = run(`getInvestigationSteps({id:'123', shortId:'#TEST-1', culprit:'main', status:'unresolved'})`);
 assert.equal(steps.length, 10);
 assert.equal(steps[0].ok, true);
 assert.equal(steps[8].t, 'إغلاق المشكلة في Sentry');
});

