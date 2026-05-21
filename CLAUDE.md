# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Build site (strict mode)
mkdocs build --strict

# Local dev server
mkdocs serve

# Clean build artifacts
rm -rf site/ .cache/
```

## Project Structure

个人网站 — 基于 MkDocs + Material for MkDocs 的静态站点，部署于 GitHub Pages。

```
mkdocs.yml              # 主配置（导航、主题、插件、扩展）
docs/
  index.md              # 首页
  blog/
    index.md            # 博客入口（blog 插件自动填充列表）
    posts/              # 博客文章 .md
  projects/
    index.md            # 项目列表
    mc-mod.md           # MC Mod 详情（待创建）
    crawler.md          # 爬虫工具详情（待创建）
  assets/images/        # 图片资源
  js/katex.js           # KaTeX 配置（待创建）
overrides/              # Material 主题自定义
.github/workflows/      # GitHub Actions 部署（待创建）
```

## Key Configuration

- **Theme**: Material for MkDocs (`language: zh`), 明暗色模式切换
- **Plugins**: `search`, `blog`, `tags`
- **Markdown extensions**: `pymdownx.arithmatex` (KaTeX), `pymdownx.highlight`, `pymdownx.superfences`, `admonition`, `tasklist`, `attr_list`
- **Blog plugin**: `blog_dir: blog`, `post_dir: blog/posts`

## Status

- Task 1 ✅ 项目初始化 (mkdocs.yml, requirements.txt, .gitignore)
- Task 6 ✅ GitHub Actions 部署 (`.github/workflows/ci.yml`)
- 全局占位符已替换（GitHub 相关）
- Task 2–4: 首页/博客/项目页面为占位内容，待填充
- Task 5: KaTeX 支持待添加 (`docs/js/katex.js`，需在 `mkdocs.yml` 恢复 `extra_javascript`)

部署后需在 GitHub 仓库 Settings > Pages 中设置 Source 为 "GitHub Actions"。

## Spec & Plan

设计和实现计划见 `docs/superpowers/specs/` 和 `docs/superpowers/plans/`。
