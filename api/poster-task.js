import {generatePosterImage,getPosterProviderConfig} from './_poster-core.js';

export const config={maxDuration:300};

const tasks=globalThis.__qixiPosterTasks||new Map();
globalThis.__qixiPosterTasks=tasks;

function now(){return Date.now()}
function json(res,status,body){return res.status(status).json(body)}
function makeId(){return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}
function cleanup(){
  const t=now();
  for(const [id,task] of tasks){
    if(task.expiresAt&&task.expiresAt<t)tasks.delete(id);
  }
}

async function getWaitUntil(){
  try{
    const mod=await import('@vercel/functions');
    return mod.waitUntil||null;
  }catch(e){
    return null;
  }
}

async function runTask(id,payload){
  const task=tasks.get(id);
  if(!task)return;
  task.status='running';
  task.updatedAt=now();
  try{
    const result=await generatePosterImage(payload);
    tasks.set(id,{...task,status:'done',image:result.image,meta:result.meta,updatedAt:now(),expiresAt:now()+15*60*1000});
  }catch(error){
    let meta=error.meta;
    if(!meta){
      try{meta=getPosterProviderConfig().debugMeta}catch(e){meta={}}
    }
    tasks.set(id,{...task,status:'error',error:error.message||'Poster generation failed',meta,updatedAt:now(),expiresAt:now()+10*60*1000});
  }
}

export default async function handler(req,res){
  cleanup();
  if(req.method==='POST'){
    const id=makeId();
    const payload=req.body||{};
    const task={id,status:'queued',createdAt:now(),updatedAt:now(),expiresAt:now()+20*60*1000};
    tasks.set(id,task);
    const promise=runTask(id,payload);
    const waitUntil=await getWaitUntil();
    if(waitUntil)waitUntil(promise);
    else promise.catch(()=>{});
    return json(res,202,{taskId:id,status:'queued',pollAfter:2500,mode:waitUntil?'vercel-waitUntil':'best-effort'});
  }
  if(req.method==='GET'){
    const id=String(req.query?.id||'');
    if(!id)return json(res,400,{status:'error',error:'Missing task id'});
    const task=tasks.get(id);
    if(!task)return json(res,404,{status:'missing',error:'任务状态已过期或被新的 Vercel 实例接管，请重新生成一次。'});
    if(task.status==='done')return json(res,200,{status:'done',image:task.image,meta:task.meta});
    if(task.status==='error')return json(res,200,{status:'error',error:task.error,meta:task.meta});
    return json(res,200,{status:task.status||'queued',updatedAt:task.updatedAt,pollAfter:3000});
  }
  return json(res,405,{error:'Method not allowed'});
}
