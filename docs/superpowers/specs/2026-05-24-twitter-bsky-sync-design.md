# Twitter → Bluesky 同步设计方案

## 概述

用户日常在 Twitter/X 上发推文，希望通过已有的 Bluesky → 网站同步管道，让推文自动出现在个人网站的"碎碎念"页面上。

## 现状

- 网站已有 `scripts/fetch-thoughts.py`，在 CI 构建时从 Bluesky 拉取最新推文生成 `docs/thoughts.md`
- 用户有 Twitter/X 和 Bluesky 账号，但主阵地是 Twitter/X
- 用户手机只装了 Twitter/X，未装 Bluesky App

## 方案：Moa 桥接

使用开源跨发服务 [Moa](https://moa.party) 将 Twitter 推文自动同步到 Bluesky。

### 数据流

```
Twitter/X（手机发文）
    ↓  Moa 实时跨发
Bluesky（自动接收）
    ↓  fetch-thoughts.py（CI 构建时）
docs/thoughts.md
    ↓  mkdocs build
GitHub Pages 部署
```

### 优点

- **零代码改动**：不需要修改 site 的任何代码、CI 配置或脚本
- **现有管道复用**：`fetch-thoughts.py` 已处理图片、文字渲染等
- **双向兼容**：如果未来偶用 Bluesky 发文，也会被同步，不需额外配置

### 配置步骤

1. 访问 [moa.party](https://moa.party)
2. 点击 "Sign in with Twitter" 授权 Twitter 账号
3. 再 "Sign in with Bluesky" 授权 Bluesky 账号
4. 设置同步方向：Twitter → Bluesky
5. 保存配置

### 边界情况

- **图片**：Moa 会同步图片附件，现有脚本支持渲染
- **回复**：当前脚本 `filter=posts_no_replies` 过滤回复，不影响
- **删除**：Moa 会同步删除，但网站只以 Bluesky feed 为准，不需额外处理

## 不采用方案

- Twitter API 直连：免费层配额极低（每月 100 次读取），需申请 Developer 账号，维护成本高
- RSS 桥接：Nitter 等第三方实例不稳定
