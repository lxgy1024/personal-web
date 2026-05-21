# 前端美化设计文档

## 概述

基于 Material for MkDocs 主题，对个人网站进行前端美化。风格定位：简洁干净，蓝粉白配色，参考 MtF.wiki 的视觉感觉。

## 配色方案

| 部位 | 值 |
|------|-----|
| 主题 Primary | `indigo` |
| 主题 Accent | `pink` |
| Hero 渐变起点 | `#4facfe` (blue-400) |
| Hero 渐变终点 | `#f093fb` (pink-400) |
| 链接悬浮色 | 粉色系 |
| 卡片背景 | 白色 |
| 卡片边框 | 淡蓝/淡粉 |
| 代码块 | Material 默认暗色 |
| 背景色 | `#f8f9fa` (淡灰) |

## 字体

- 正文: [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC) — 清晰的中文无衬线字体
- 代码: [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — 等宽编程字体

## 启用的主题特性

```yaml
theme:
  features:
    - navigation.tabs          # 导航标签
    - navigation.tabs.sticky   # 导航标签置顶
    - navigation.top           # 回到顶部按钮
    - navigation.indexes       # 索引页作为 section 概览
    - toc.follow               # 目录自动高亮当前项
    - content.code.copy        # 代码块复制按钮
    - content.code.annotate    # 代码注释
    - search.highlight         # 搜索高亮
    - search.share             # 搜索分享
```

## 组件设计

### 首页 Hero

- 全宽渐变背景 `#4facfe → #f093fb`，斜向 135°
- 白色文字：标题 + tagline
- 三个白色半透明入口卡片（博客、项目、GitHub），带悬浮效果

### 博客分类页

当前为纯文字列表，改为卡片列表：
- 白色卡片，圆角 8px
- 卡片标题 + 摘要（1-2 行）
- 底部标签（粉色 pill） + 日期（灰色小字）
- 悬浮时轻微上移 + 阴影加深

### 文章页

- 标题底部蓝粉渐变装饰线
- 标签使用粉色 pill 样式
- 日期右上方灰色小字
- 正文宽版排版，行高 1.8

### 全局

- 自定义滚动条：蓝粉色系
- 卡片悬浮阴影过渡
- `a:hover` 粉色
- 选中文字背景色：淡粉
