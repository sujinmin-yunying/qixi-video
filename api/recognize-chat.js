/**
 * [INPUT]: 依赖 ./_runtime.js 的远程环境守卫及服务端视觉模型配置
 * [OUTPUT]: 对外提供 POST /api/recognize-chat Vercel handler
 * [POS]: api 的聊天截图 OCR 入口，test/prod 失败时禁止降级到 mock
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import {assertRemoteEnv} from './_runtime.js';

export const config={maxDuration:60};

function json(res,status,payload){
  return res.status(status).json(payload);
}

function normalizeDataUrl(image=''){
  const s=String(image||'').trim();
  if(!s)return '';
  if(/^data:image\//i.test(s))return s;
  if(/^[A-Za-z0-9+/=]+$/.test(s.slice(0,80)))return `data:image/png;base64,${s}`;
  return s;
}

async function callOpenAI({image,key,model}){
  const response=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:model||process.env.OPENAI_VISION_MODEL||'gpt-4o-mini',
      temperature:0,
      messages:[{
        role:'user',
        content:[
          {type:'text',text:'请从这张聊天截图中提取可见的聊天文字。只输出聊天内容，尽量按原顺序换行。不要总结、不要改写、不要添加说明。如果无法识别，输出空字符串。'},
          {type:'image_url',image_url:{url:image}}
        ]
      }]
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error?.message||`OpenAI OCR failed: ${response.status}`);
  return data.choices?.[0]?.message?.content||'';
}

async function callArk({image,key,model}){
  const base=(process.env.ARK_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/,'');
  const response=await fetch(`${base}/chat/completions`,{
    method:'POST',
    headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:model||process.env.ARK_VISION_MODEL||process.env.ARK_CHAT_MODEL||'doubao-1-5-vision-pro-32k-250115',
      temperature:0,
      messages:[{
        role:'user',
        content:[
          {type:'text',text:'请从这张聊天截图中提取可见的聊天文字。只输出聊天内容，尽量按原顺序换行。不要总结、不要改写、不要添加说明。如果无法识别，输出空字符串。'},
          {type:'image_url',image_url:{url:image}}
        ]
      }]
    })
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const msg=[data.error?.message,data.message,data.msg].filter(Boolean).join(' · ');
    throw new Error(msg||`Ark OCR failed: ${response.status}`);
  }
  return data.choices?.[0]?.message?.content||'';
}

function cleanText(text=''){
  return String(text||'')
    .replace(/^```[\s\S]*?\n?/,'')
    .replace(/```$/,'')
    .replace(/^无法识别。?$|^空字符串。?$/,'')
    .trim();
}

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{assertRemoteEnv()}catch(error){return json(res,error.status||500,{error:error.message})}
  const image=normalizeDataUrl(req.body?.image);
  if(!image)return json(res,400,{error:'Missing image'});

  const provider=(process.env.OCR_PROVIDER||process.env.IMAGE_PROVIDER||'').toLowerCase()
    ||((process.env.ARK_API_KEY||process.env.VOLCENGINE_API_KEY)?'ark':'openai');
  const arkKey=process.env.ARK_API_KEY||process.env.VOLCENGINE_API_KEY;
  const openaiKey=process.env.OPENAI_API_KEY;

  try{
    let text='';
    if(provider==='ark'){
      if(!arkKey)return json(res,503,{error:'ARK_API_KEY is not configured for OCR'});
      text=await callArk({image,key:arkKey,model:process.env.ARK_VISION_MODEL});
    }else{
      if(!openaiKey)return json(res,503,{error:'OPENAI_API_KEY is not configured for OCR'});
      text=await callOpenAI({image,key:openaiKey,model:process.env.OPENAI_VISION_MODEL});
    }
    return json(res,200,{text:cleanText(text)});
  }catch(error){
    return json(res,500,{error:error.message||'Chat screenshot recognition failed'});
  }
}
