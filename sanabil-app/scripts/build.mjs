import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync} from 'node:fs';
const v=(process.env.GITHUB_SHA||'dev').slice(0,7);
let h=readFileSync('index.html','utf8').replaceAll('__VERSION__',v);
if(process.env.SENTRY_DSN)h=h.replaceAll('__BUILD_SENTRY_DSN__',process.env.SENTRY_DSN);
if(process.env.SENTRY_ORG)h=h.replaceAll('__BUILD_SENTRY_ORG__',process.env.SENTRY_ORG);
if(process.env.SENTRY_PROJECT)h=h.replaceAll('__BUILD_SENTRY_PROJECT__',process.env.SENTRY_PROJECT);
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');cpSync('public','dist',{recursive:true});writeFileSync('dist/index.html',h);
console.log('built dist/index.html',(h.length/1024).toFixed(0)+'KB',v);
