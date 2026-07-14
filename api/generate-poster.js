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
