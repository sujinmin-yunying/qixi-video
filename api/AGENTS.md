# api/
> L2 | 父级: ../AGENTS.md

成员清单
_runtime.js: 优先解析 APP_ENV，并将 Vercel development/preview/production 映射为 local/test/prod，提供服务端环境守卫
runtime-config.js: 向浏览器输出无密钥的运行模式配置
_poster-core.js: 组装海报提示词并调用 OpenAI 或火山图像服务
generate-poster.js: 同步海报生成 HTTP 入口
poster-task.js: 内存态异步海报任务提交与轮询入口
recognize-chat.js: 调用 OpenAI 或火山视觉模型识别聊天截图

依赖边界：公开接口只接受动作数据；密钥、provider 和模型选择均来自服务端环境。local 除 runtime-config 外不得进入真实 API。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
