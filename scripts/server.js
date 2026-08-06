/**
 * [INPUT]: 依赖 Node.js HTTP/FS 模块、根目录静态资源与 api/ Vercel handlers
 * [OUTPUT]: 对外提供 local/test/prod 一致的本地 HTTP 运行入口
 * [POS]: 项目开发服务器，local 阻断真实 API，test/prod 转发服务端 handler
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {getAppEnv} from '../api/_runtime.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const port=Number(process.env.PORT||4173);
const mime={'.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};

function send(res,status,body,headers={}){
  res.writeHead(status,{'Cache-Control':'no-store',...headers});
  res.end(body);
}

async function readBody(req){
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  if(!chunks.length)return {};
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return {}}
}

function responseAdapter(res){
  let statusCode=200;
  return{
    setHeader:(name,value)=>res.setHeader(name,value),
    status(code){statusCode=code;return this},
    json(value){send(res,statusCode,JSON.stringify(value),{'Content-Type':'application/json; charset=utf-8'});return this},
    send(value){send(res,statusCode,value);return this}
  };
}

async function serveApi(req,res,url){
  const name=url.pathname.slice('/api/'.length).replace(/\.js$/,'');
  if(!/^[a-z0-9-]+$/i.test(name))return send(res,404,'Not found');
  if(getAppEnv()==='local'&&name!=='runtime-config')return send(res,403,JSON.stringify({error:'local 模式禁止调用真实 API'}),{'Content-Type':'application/json; charset=utf-8'});
  try{
    const mod=await import(pathToFileURL(join(root,'api',`${name}.js`)).href);
    req.body=await readBody(req);
    req.query=Object.fromEntries(url.searchParams);
    await mod.default(req,responseAdapter(res));
  }catch(error){
    if(!res.headersSent)send(res,error.code==='ERR_MODULE_NOT_FOUND'?404:500,JSON.stringify({error:error.message}),{'Content-Type':'application/json; charset=utf-8'});
  }
}

async function serveStatic(res,url){
  const requested=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  const safe=normalize(requested).replace(/^(\.\.(\/|\\|$))+/,'');
  const file=join(root,safe);
  if(!file.startsWith(root))return send(res,403,'Forbidden');
  try{
    if(!(await stat(file)).isFile())throw Object.assign(new Error('Not found'),{code:'ENOENT'});
    send(res,200,await readFile(file),{'Content-Type':mime[extname(file)]||'application/octet-stream'});
  }catch(error){send(res,error.code==='ENOENT'?404:500,error.code==='ENOENT'?'Not found':error.message)}
}

createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/'))return serveApi(req,res,url);
  return serveStatic(res,url);
}).listen(port,'127.0.0.1',()=>{
  console.log(`qixi-video ${getAppEnv()} → http://127.0.0.1:${port}`);
});
