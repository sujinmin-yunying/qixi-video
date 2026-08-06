/**
 * [INPUT]: 依赖 ./_poster-core.js 的海报生成能力与服务配置
 * [OUTPUT]: 对外提供 POST /api/generate-poster Vercel handler
 * [POS]: api 的同步海报兼容入口，主要流程使用 poster-task
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import {generatePosterImage,getPosterProviderConfig} from './_poster-core.js';

export const config={maxDuration:60};

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const result=await generatePosterImage(req.body||{});
    return res.status(200).json(result);
  }catch(error){
    let meta=error.meta;
    if(!meta){
      try{meta=getPosterProviderConfig().debugMeta}catch(e){meta={}}
    }
    return res.status(error.status||500).json({error:error.message||'Poster generation failed',meta});
  }
}
