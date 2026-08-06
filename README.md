# 如果我们的故事上映了

独响 App 内七夕电影活动页。用户选择主演并导入聊天后，浏览器生成电影故事、电影票和收藏卡；聊天截图 OCR 与电影海报生成在 test/prod 通过服务端调用模型。

技术栈：原生 HTML + 模块化 CSS + JavaScript + Node.js 20+ + Vercel Functions。

## 快速开始

```bash
npm ci
npm run dev
```

打开 <http://127.0.0.1:4173>。页面右下角应显示 `LOCAL · MOCK`，已经预置假角色、假聊天和本地海报，可以直接玩。

检查语法：

```bash
npm run check
```

## 三种运行环境

| 环境 | 命令/发布配置 | 数据与模型 | 硬边界 |
| --- | --- | --- | --- |
| local | `npm run dev` | 浏览器假角色、假聊天、静态 mock 海报 | 不需要 token；服务器拒绝真实 OCR/海报 API |
| test | 复制 `.env.example` 为 `.env.test` 后运行 `npm run dev:test` | 测试密钥调用真实 OCR/图像模型 | 失败直接报错，绝不回退 mock；必须使用隔离的测试账号和服务 |
| prod | 部署平台显式设置 `APP_ENV=prod`；本机仅可用 `.env.prod` + `npm start` 验证 | 正式服务端配置调用真实模型 | 不接受 URL 切换环境/API；密钥不下发浏览器 |

`APP_ENV` 必填且只接受 `local`、`test`、`prod`。没有配置时页面显示 `ENV · NOT CONFIGURED`，不会默认连接正式服务。

## 服务端变量

以 [.env.example](.env.example) 为模板。支持：

- OpenAI：`OPENAI_API_KEY`、`OPENAI_VISION_MODEL`。
- 火山引擎：`ARK_API_KEY`、`ARK_BASE_URL`、`ARK_IMAGE_MODEL`、`ARK_IMAGE_SIZE`、`ARK_VISION_MODEL`。
- provider：`IMAGE_PROVIDER=openai|ark`、`OCR_PROVIDER=openai|ark`。

`.env*`、token、真实聊天和任何模型密钥禁止提交。浏览器只会收到 `{ env, mock, remote }` 三个公开字段。

## 当前接口清单

| 动作 | 接口 | 请求 | 返回 | 状态 |
| --- | --- | --- | --- | --- |
| 读取公开模式 | `GET /api/runtime-config` | 无 | JS 运行配置 | 已实现 |
| 识别聊天截图 | `POST /api/recognize-chat` | `image`, `filename` | `text` 或 `error` | test/prod 已实现模型调用；local 禁止 |
| 提交海报任务 | `POST /api/poster-task` | `film`, `variant`, `style`, `className` | `taskId`, `status` | test/prod 已实现；local 禁止 |
| 查询海报任务 | `GET /api/poster-task?id=...` | 任务 ID | `queued/running/done/error/missing` | 已实现，但任务仅存进程内存 |
| 同步生成海报 | `POST /api/generate-poster` | 同海报任务 | `image`, `meta` | 兼容入口 |

HTTP 400 表示参数缺失，403 表示 local 越界调用，405 表示方法错误，503 表示 provider 密钥缺失，500 表示上游或服务端失败。

## 大模型边界

- 浏览器中的故事编排目前是确定性规则，不需要大语言模型。
- 图片聊天导入需要视觉 OCR；test/prod 会调用 OpenAI 或火山视觉模型。
- 电影海报需要图像模型；test/prod 会调用 OpenAI `gpt-image-2` 或配置的火山图像模型。
- local 的截图结果和海报均来自前端假数据，不产生模型费用。
- test/prod 调用失败时保留明确错误，不使用本地图片伪装成功。

## 尚未形成的正式能力

以下内容不能把现有前端模拟当作正式实现，均需要客户端与 event 服务开发确认：

- App 短期活动凭据、验签、刷新和最小用户资料。
- Android/iOS/鸿蒙统一的角色、聊天和广告 Bridge 协议。
- event 服务初始化、状态同步、提交动作、幂等与审计接口。
- 响石预占/提交/取消、真实余额、广告验真和对账。
- 海报异步任务的共享持久化存储；当前内存 Map 不适合多实例生产。

## 验收与回滚

- local：验证首次进入、导入、开始放映、生成 5 张 mock 海报、保存与刷新。
- test：使用隔离密钥验证 OCR/海报成功、密钥缺失、上游超时和错误提示，确认网络失败没有 mock 图。
- prod：先发布后端兼容接口，再发布静态页，最后开放 App 入口；记录前端提交号、配置和回滚点。
- 回滚：先关闭活动入口和写开关，再回滚静态资源/函数版本；不要手工删除业务或账本数据。

浏览器逻辑位于 [src/app.js](src/app.js)，本地服务器位于 [scripts/server.js](scripts/server.js)。架构地图见 [AGENTS.md](AGENTS.md)，API 成员与边界见 [api/AGENTS.md](api/AGENTS.md)。
样式由 [styles/index.css](styles/index.css) 按 `core → features → fixes` 顺序装配，模块职责见 [styles/AGENTS.md](styles/AGENTS.md)。
