# qixi-video - 独响 App 内七夕电影活动
原生 HTML + CSS + JavaScript + Node.js + Vercel Functions

<directory>
api/ - 服务端能力边界：运行配置、截图 OCR、海报生成与异步任务
assets/ - 活动静态视觉素材与本地 mock 海报
docs/ - 内容生成与交接规则
scripts/ - 本地开发和验证工具
src/ - 浏览器业务源码
styles/ - 模块化页面视觉：core、features、fixes 三层级联
</directory>

<config>
index.html - 单页活动入口，先加载运行配置再加载业务脚本
src/app.js - 当前正式前端逻辑；故事编排在浏览器完成，大模型只经 `/api` 调用
styles/index.css - 唯一样式入口，保持模块级联顺序
scripts/server.js - 零依赖本地服务器，承载静态资源与 Vercel 风格 API
package.json - local/test/prod 启动命令与 Node 版本约束
package-lock.json - 固定可重复安装的依赖版本与完整性哈希
.env.example - test/prod 服务端变量模板，不含任何密钥
vercel.json - 正式静态资源缓存策略
README.md - 三环境运行、能力边界、交接和回滚说明
</config>

## 架构决策

- `APP_ENV` 是环境单一真相源，只接受 `local`、`test`、`prod`；必须显式设置，避免误连正式服务。
- local 的 OCR 和海报都由浏览器 mock，服务端拒绝除运行配置外的 `/api` 请求。
- test 与 prod 必须调用真实服务；失败直接暴露，不得退回 mock。
- 浏览器永远不持有模型密钥；OpenAI/火山密钥只存在服务端环境变量。
- App Bridge、event 服务、真实身份和响石账本尚未接入，接口名称与安全协议需要开发确认。
- 样式遵循 `core → features → fixes` 单向级联；根目录不保留历史 JS 或样式副本。

## 开发规范

- 修改业务文件时同步检查 L3 契约与本文件；修改 `api/` 时再检查 `api/AGENTS.md`。
- 禁止提交 `.env.local`、`.env.test`、`.env.prod`、token、模型密钥或真实聊天数据。
- test/prod 禁止静默降级；所有写操作未来必须由 event 服务鉴权、幂等并落库。

## 变更日志

- 2026-08-06：播种 GEB 文档系统；建立 local/test/prod 三态边界与本地服务器。
- 2026-08-06：删除四份未引用的历史脚本；将 6182 行单体样式拆为职责明确且均小于 800 行的模块。
- 2026-08-06：浏览器源码、开发脚本和内容规则分别归入 src、scripts、docs，清空根目录职责混杂。
- 2026-08-06：删除旧票据画布、同步海报和旧海报画布三段零调用 Legacy 实现。
- 2026-08-06：mock 海报按 warm、urban、dramatic 三类归档，消除资源目录平铺。
