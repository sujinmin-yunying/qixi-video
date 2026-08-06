/**
 * [INPUT]: 依赖 process.env 的 APP_ENV 与 Vercel 提供的 VERCEL_ENV
 * [OUTPUT]: 对外提供 getAppEnv、assertRemoteEnv、publicRuntimeConfig
 * [POS]: api 的环境单一真相源，被所有真实服务入口消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const environments=new Set(['local','test','prod']);
const vercelEnvironments=Object.freeze({development:'local',preview:'test',production:'prod'});

export function getAppEnv(){
  const platformEnv=vercelEnvironments[String(process.env.VERCEL_ENV||'').toLowerCase()];
  const value=String(process.env.APP_ENV||platformEnv||'').toLowerCase();
  if(!value)throw Object.assign(new Error('APP_ENV is required; use local, test or prod'),{status:500});
  if(!environments.has(value))throw Object.assign(new Error(`Invalid APP_ENV: ${value}`),{status:500});
  return value;
}

export function assertRemoteEnv(){
  const env=getAppEnv();
  if(env==='local')throw Object.assign(new Error('local 模式禁止调用真实服务'),{status:403});
  return env;
}

export function publicRuntimeConfig(){
  const env=getAppEnv();
  return Object.freeze({env,mock:env==='local',remote:env!=='local'});
}
