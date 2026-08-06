/**
 * [INPUT]: 依赖 ./_runtime.js 的远程环境守卫及服务端 OpenAI/火山配置
 * [OUTPUT]: 对外提供 getPosterProviderConfig、generatePosterImage
 * [POS]: api 的图像生成核心，被同步与异步海报入口复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import {assertRemoteEnv} from './_runtime.js';

const compositions=[
  'cinematic object-storytelling still life using several meaningful props from the plot',
  'full environmental movie scene showing the exact story location after an important event',
  'refined film archive collage combining scene fragments, props, tickets and analog film material',
  'one powerful symbolic story object surrounded by dramatic negative space',
  'realistic scrapbook-style life collage using receipts, tickets, notes and location details',
  'decorative window-light composition built from the movie location and everyday props',
  'top-down cinematic frame with story objects naturally left after the scene',
  'museum exhibition composition presenting story evidence as emotionally charged artifacts'
];

const classDirection={
  youth:'warm coming-of-age romance, creamy backlight, sunset campus or seaside atmosphere, analog film color, shallow depth of field',
  urban:'quiet modern urban healing romance, morning window light, warm white and sophisticated gray, glass reflections, cafe or bookstore atmosphere',
  fantasy:'quiet healing romance in an ordinary real place, soft night window light, flowers, rain marks, paper notes and warm practical lamps',
  suspense:'cold romantic suspense, rain night, blue-black shadows, volumetric fog, evidence-room tension, one restrained red accent',
  road:'expansive road romance, immense sky, warm sun, railway or bus journey, map and postcard details, nostalgic travel-film color',
  scifi:'realistic urban relationship film, convenience store, apartment corridor, subway entrance or office pantry, warm practical lighting and everyday props'
};

async function toDataUrl(url){
  if(!url||String(url).startsWith('data:'))return url;
  const response=await fetch(url);
  if(!response.ok)throw new Error(`Poster image download failed with status ${response.status}`);
  const contentType=response.headers.get('content-type')||'image/png';
  const arrayBuffer=await response.arrayBuffer();
  const base64=Buffer.from(arrayBuffer).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

function normalizeArkSize(rawSize){
  const requested=String(rawSize||'').trim();
  if(/^\d{3,5}x\d{3,5}$/i.test(requested))return{size:requested,requested,changed:false};
  return{size:'1536x2560',requested:requested||'(empty)',changed:!!requested};
}

function buildPrompt({film,variant=0,style='场景电影',className='电影'}){
  const composition=compositions[variant%compositions.length];
  return `Create a complete premium illustrated theatrical movie-poster image for an original film.
Film title for context only: ${film.title}. Do not render any text in the image.
Genre: ${film.genre}. Story tone: ${film.tone}. Key location: ${film.location}. Story object: ${film.object}.
Plot: ${film.summary}
Visual family: ${className}. Direction: ${classDirection[film.posterClass]||classDirection.youth}.
This generation must use: ${composition}. Poster method: ${style}.
Show a rich, believable real-life cinematic environment with foreground, midground and background; detailed everyday architecture or landscape; atmospheric lighting; tactile materials; environmental storytelling through ordinary objects; premium hand-painted anime-film illustration quality; emotionally memorable and suitable for a widely shared collectible movie poster.
This must be a full scene illustration, not a symbol poster. Include visible spatial depth, surfaces, furniture or architecture, light and shadow, foreground objects with volume, background details, and a clear cinematic camera angle. The image should feel like a finished anime movie key visual or an illustrated film still.
No characters, people, portraits, faces, bodies, silhouettes or human reflections. Tell the story through the location and meaningful objects only.
Do not use science-fiction, futuristic, cyberpunk, fantasy, cosmic, magical, holographic, system-like or technology-driven visuals unless explicitly present in the plot.
Make this image fundamentally different from previous variants: use a new scene moment, camera angle, lens feeling, time of day, light source, object arrangement and color balance.
Strictly avoid abstract geometry, simple line icons, outline-only objects, circles, frames, wire diagrams, flat gradients, UI graphics, empty vector design, minimal logo-like marks, decorative line art, and plain pattern backgrounds. The output must look like an actual illustrated movie scene with real visual content, not a layout mockup. No typography, letters, logos or watermark.`;
}

export function getPosterProviderConfig(){
  assertRemoteEnv();
  const provider=(process.env.IMAGE_PROVIDER||'').toLowerCase()||((process.env.ARK_API_KEY||process.env.VOLCENGINE_API_KEY)?'ark':'openai');
  const arkKey=process.env.ARK_API_KEY||process.env.VOLCENGINE_API_KEY;
  const openaiKey=process.env.OPENAI_API_KEY;
  const debugMeta={provider,hasArkKey:!!arkKey,hasOpenAIKey:!!openaiKey};
  if(provider==='ark'&&!arkKey)throw Object.assign(new Error('ARK_API_KEY is not configured'),{status:503,meta:debugMeta});
  if(provider!=='ark'&&!openaiKey)throw Object.assign(new Error('OPENAI_API_KEY is not configured'),{status:503,meta:debugMeta});
  return{provider,arkKey,openaiKey,debugMeta};
}

export async function generatePosterImage(payload){
  const {provider,arkKey,openaiKey}=getPosterProviderConfig();
  const {film,variant=0,style='场景电影',className='电影'}=payload||{};
  if(!film?.title)throw Object.assign(new Error('Missing film data'),{status:400});
  const prompt=buildPrompt({film,variant,style,className});
  const endpoint=provider==='ark'
    ?`${process.env.ARK_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3'}/images/generations`
    :'https://api.openai.com/v1/images/generations';
  let arkModel=process.env.ARK_IMAGE_MODEL||process.env.VOLCENGINE_IMAGE_MODEL||'doubao-seedream-3-0-t2i-250415';
  let arkSizeInfo=normalizeArkSize(process.env.ARK_IMAGE_SIZE||'1536x2560');
  let arkSize=arkSizeInfo.size;
  if(/^\d{3,5}x\d{3,5}$/i.test(arkModel)){
    arkSizeInfo=normalizeArkSize(arkModel);
    arkSize=arkSizeInfo.size;
    arkModel='doubao-seedream-3-0-t2i-250415';
  }
  const body=provider==='ark'
    ?{model:arkModel,prompt,size:arkSize,response_format:process.env.ARK_RESPONSE_FORMAT||'url',n:1}
    :{model:'gpt-image-2',prompt,size:'1024x1536',quality:'medium',n:1};
  const meta={provider,model:provider==='ark'?arkModel:'gpt-image-2',size:provider==='ark'?arkSize:'1024x1536',requestedSize:provider==='ark'?arkSizeInfo.requested:'1024x1536',sizeChanged:provider==='ark'?arkSizeInfo.changed:false,endpoint:provider==='ark'?'ark images/generations':'openai images/generations'};
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${provider==='ark'?arkKey:openaiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const detail=[data.error?.type,data.error?.code,data.error?.message,data.message,data.msg].filter(Boolean).join(' · ');
    if(/1536x2560|1024x1024|1024x1536|size/i.test(detail)&&/model|endpoint|not.?found/i.test(detail)){
      throw Object.assign(new Error('火山配置填错：你可能把图片尺寸填到了 ARK_IMAGE_MODEL。请设置 ARK_IMAGE_MODEL 为图像模型/接入点ID，把 1536x2560 填到 ARK_IMAGE_SIZE。'),{meta});
    }
    throw Object.assign(new Error(`${detail||`${provider==='ark'?'Volcengine Ark':'OpenAI'} image request failed with status ${response.status}`} · provider=${meta.provider} · model=${meta.model} · size=${meta.size}`),{meta,status:response.status});
  }
  const item=data.data?.[0];
  const image=item?.b64_json?`data:image/png;base64,${item.b64_json}`:await toDataUrl(item?.url);
  if(!image)throw Object.assign(new Error('No image returned'),{meta});
  return{image,meta};
}
