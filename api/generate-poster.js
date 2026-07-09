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

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const provider=(process.env.IMAGE_PROVIDER||'').toLowerCase()||((process.env.ARK_API_KEY||process.env.VOLCENGINE_API_KEY)?'ark':'openai');
  const arkKey=process.env.ARK_API_KEY||process.env.VOLCENGINE_API_KEY;
  const openaiKey=process.env.OPENAI_API_KEY;
  if(provider==='ark'&&!arkKey)return res.status(503).json({error:'ARK_API_KEY is not configured'});
  if(provider!=='ark'&&!openaiKey)return res.status(503).json({error:'OPENAI_API_KEY is not configured'});
  const {film,variant=0,style='场景电影',className='电影'}=req.body||{};
  if(!film?.title)return res.status(400).json({error:'Missing film data'});
  const composition=compositions[variant%compositions.length];
  const prompt=`Create a complete premium illustrated theatrical movie-poster image for an original film.
Film title for context only: ${film.title}. Do not render any text in the image.
Genre: ${film.genre}. Story tone: ${film.tone}. Key location: ${film.location}. Story object: ${film.object}.
Plot: ${film.summary}
Visual family: ${className}. Direction: ${classDirection[film.posterClass]||classDirection.youth}.
This generation must use: ${composition}. Poster method: ${style}.
Show a rich, believable real-life cinematic environment with foreground, midground and background; detailed everyday architecture or landscape; atmospheric lighting; tactile materials; environmental storytelling through ordinary objects; premium hand-painted anime-film illustration quality; emotionally memorable and suitable for a widely shared collectible movie poster.
No characters, people, portraits, faces, bodies, silhouettes or human reflections. Tell the story through the location and meaningful objects only.
Do not use science-fiction, futuristic, cyberpunk, fantasy, cosmic, magical, holographic, system-like or technology-driven visuals unless explicitly present in the plot.
Make this image fundamentally different from previous variants: use a new scene moment, camera angle, lens feeling, time of day, light source, object arrangement and color balance. Avoid abstract geometry, circles, frames, wire diagrams, icon-like shapes, flat gradients, UI graphics and empty vector design. The output must look like an actual illustrated movie scene, not a layout mockup. No typography, letters, logos or watermark.`;
  try{
    const endpoint=provider==='ark'
      ?`${process.env.ARK_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3'}/images/generations`
      :'https://api.openai.com/v1/images/generations';
    const body=provider==='ark'
      ?{
        model:process.env.ARK_IMAGE_MODEL||process.env.VOLCENGINE_IMAGE_MODEL||'doubao-seedream-3-0-t2i-250415',
        prompt,
        size:process.env.ARK_IMAGE_SIZE||'1024x1024',
        response_format:process.env.ARK_RESPONSE_FORMAT||'url',
        n:1
      }
      :{model:'gpt-image-2',prompt,size:'1024x1536',quality:'medium',n:1};
    const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${provider==='ark'?arkKey:openaiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok){
      const detail=[data.error?.type,data.error?.code,data.error?.message,data.message,data.msg].filter(Boolean).join(' · ');
      throw new Error(detail||`${provider==='ark'?'Volcengine Ark':'OpenAI'} image request failed with status ${response.status}`);
    }
    const item=data.data?.[0];
    const image=item?.b64_json?`data:image/png;base64,${item.b64_json}`:item?.url;
    if(!image)throw new Error('No image returned');
    return res.status(200).json({image});
  }catch(error){return res.status(500).json({error:error.message||'Poster generation failed'})}
}
