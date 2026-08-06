# styles/
> L2 | 父级: ../AGENTS.md

成员清单
index.css: 唯一样式入口，严格保持 core → features → fixes 的级联顺序
core/: 页面基础、编辑视觉与开场体验
features/: 收藏、首映、动效、卡片、引导和分享功能样式
fixes/: 跨功能最终覆盖，只修正级联结果而不定义新业务组件

依赖边界：index.html 只加载 index.css；子模块不得互相 `@import`，避免循环和隐式顺序。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
