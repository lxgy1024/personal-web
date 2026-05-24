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
  index.md              # 首页（Hero + 入口卡片）
  about.md              # 关于页
  blog/
    index.md            # 博客入口（分类卡片）
    tags.md             # 标签聚合页
    随笔/
      index.md          # 随笔分类页（卡片列表）
      *.md              # 5 篇文章
    人物/
      index.md          # 人物分类页（卡片列表）
      *.md              # 2 篇文章
    创作/
      index.md          # 创作分类页（卡片列表）
      *.md              # 1 篇文章
    posts/              # blog 插件目录（当前为空）
  projects/
    index.md            # 项目列表
    mc-mod.md           # MC Mod 详情（待填充）
    crawler.md          # 爬虫工具详情（待填充）
  stylesheets/
    extra.css           # 蓝粉白主题自定义样式
  js/katex.js           # KaTeX 配置
  assets/images/        # 图片资源
.github/workflows/      # GitHub Actions 部署
```

## Key Configuration

- **Theme**: Material for MkDocs (`language: zh`), 明暗色模式切换
- **Header**: 蓝粉渐变背景，白色文字，药丸形标签
- **Footer**: 蓝粉渐变底栏，深色导航区
- **TOC**: 蓝色激活项 + 蓝粉渐变竖线
- **Tags**: `<!-- material/tags -->` 标记在 tags.md，文章 frontmatter 已有 tags
- **Plugins**: `search`, `blog`, `tags`
- **Markdown extensions**: `pymdownx.arithmatex` (KaTeX), `pymdownx.highlight`, `pymdownx.superfences`, `admonition`, `tasklist`, `attr_list`

## Important Notes

- user 在杭州，不是东京
- 用户：赶月喵 / 赶月めいり，transfem，MtF，OIer
- 直接 push 上 GitHub，不需要问
- 项目页面（mc-mod.md, crawler.md）还是占位符，待填充
