import {chromium} from 'playwright';import http from 'node:http';import {readFileSync} from 'node:fs';import {extname} from 'node:path';
const mime={'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{const u=q.url.split('?')[0],p='dist'+(u==='/'?'/index.html':u);try{const b=readFileSync(p);r.setHeader('content-type',mime[extname(p)]||'text/plain');r.end(b)}catch{r.statusCode=404;r.end()}}).listen(4173);
const b=await chromium.launch(),pg=await b.newPage({viewport:{width:390,height:800}}),errs=[];pg.on('pageerror',e=>errs.push(e.message));
try{await pg.goto('http://localhost:4173/',{waitUntil:'domcontentloaded'});
for(const p of ['fam','dist','stats','set','home'])await pg.click(`nav button[data-p=${p}]`);
await pg.evaluate(()=>report(new Error('e2e-test')));await pg.waitForSelector('#bellN:not([hidden])');await pg.click('#bell');if(!(await pg.textContent('#modal')).includes('e2e-test'))throw new Error('مركز الأخطاء لا يعرض الخطأ');await pg.click('#erX');
await pg.fill('#hName','عائلة اختبار');await pg.fill('#hMem','4');await pg.fill('#hPage','7');await pg.click('#hSave');
await pg.click('nav button[data-p=fam]');await pg.fill('#famQ','اختبار');
const t=await pg.textContent('#famList');if(!t.includes('36')||!t.includes('1,000'))throw new Error('حساب الحصة/المبلغ خاطئ: '+t);
await pg.click('nav button[data-p=dist]');await pg.fill('#dQ','اختبار');await pg.check('#dRes .cb-ex');await pg.click('#dRes [data-a=one]');
await pg.waitForSelector('#dRes .s-full',{timeout:5000});
if(errs.length)throw new Error('أخطاء JS: '+errs.join(' | '));console.log('✓ e2e ok')}
catch(e){await pg.screenshot({path:'e2e-fail.png'});console.error(e);process.exitCode=1}finally{await b.close();srv.close()}
