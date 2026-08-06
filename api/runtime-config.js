/**
 * [INPUT]: 依赖 ./_runtime.js 的公开运行配置
 * [OUTPUT]: 对外提供浏览器可执行的 window.__QIXI_RUNTIME__ 配置脚本
 * [POS]: api 的公开配置入口，只暴露环境能力而不暴露服务端密钥
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import {publicRuntimeConfig} from './_runtime.js';

export default function handler(req,res){
  const body=`window.__QIXI_RUNTIME__=${JSON.stringify(publicRuntimeConfig())};`;
  res.setHeader('Content-Type','application/javascript; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.status(200).send(body);
}
