# 前端美化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对个人网站进行蓝粉白简洁风格的前端美化

**Architecture:** 全部通过配置文件 + 自定义 CSS 实现，不覆盖主题模板。使用 Material for MkDocs 内置的 grid cards 组件搭配 extra_css 实现卡片布局和 Hero 区。

**Tech Stack:** Material for MkDocs theme features, custom CSS, Google Fonts (Noto Sans SC + JetBrains Mono)

---

### Task 1: 更新 mkdocs.yml 配置

**Files:**
- Modify: `mkdocs.yml`

- [ ] **Step 1: 更新 theme.features**

添加 `navigation.tabs.sticky`、`navigation.indexes`、`toc.follow`、`content.code.annotate`

查找 `theme:` 下的 `features:` 区块，改为：

```yaml
theme:
  name: material
  language: zh
  features:
    - navigation.tabs
    - navigation.tabs.sticky
    - navigation.top
    - navigation.indexes
    - toc.follow
    - content.code.copy
    - content.code.annotate
    - search.highlight
    - search.share
```

- [ ] **Step 2: 配置字体**

在 `theme:` 块末尾（`palette:` 之后）、`plugins:` 之前添加：

```yaml
  font:
    text: Noto Sans SC
    code: JetBrains Mono
```

- [ ] **Step 3: 添加 extra_css**

在 `extra_javascript` 块之后添加：

```yaml
extra_css:
  - stylesheets/extra.css
```

- [ ] **Step 4: 验证配置可加载**

```bash
mkdocs build --strict
```
Expected: Build 成功，无报错

- [ ] **Step 5: Commit**

```bash
git add mkdocs.yml
git commit -m "feat(theme): update features, fonts, and add custom CSS entry"
```

---

### Task 2: 创建自定义 CSS

**Files:**
- Create: `docs/stylesheets/extra.css`

- [ ] **Step 1: 创建 extra.css 文件**

```css
/* ============================================
   个人网站 - 前端美化自定义样式
   蓝粉白简洁风格
   ============================================ */

/* === 全局基础 === */

/* 选中文字颜色 */
::selection {
  background-color: rgba(236, 72, 153, 0.2); /* pink-500 低透明度 */
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9; /* slate-100 */
}
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #93c5fd, #f9a8d4); /* blue-300 → pink-300 */
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #60a5fa, #f472b6); /* blue-400 → pink-400 */
}

/* === 链接 === */
.md-typeset a {
  transition: color 0.2s ease;
}
.md-typeset a:hover {
  color: #ec4899 !important; /* pink-500 */
}

/* === 首页 Hero === */
.hero-section {
  text-align: center;
  padding: 3rem 1rem 2rem;
  margin: -1.6rem -1.6rem 2rem;
  background: linear-gradient(135deg, #4facfe 0%, #f093fb 100%);
  border-radius: 0 0 24px 24px;
  color: #fff;
}
.hero-section h1 {
  color: #fff !important;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.hero-section .hero-tagline {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 2rem;
}

/* Hero 入口卡片 */
.hero-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
}
.hero-cards a {
  display: block;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  color: #fff !important;
  text-align: center;
  text-decoration: none !important;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.hero-cards a:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-4px);
  color: #fff !important;
}
.hero-cards .card-title {
  font-size: 1rem;
  font-weight: 600;
}
.hero-cards .card-desc {
  font-size: 0.8rem;
  opacity: 0.85;
}

/* === 分类页卡片 === */
.category-card {
  display: block;
  padding: 1.2rem 1.5rem;
  margin-bottom: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  transition: all 0.3s ease;
  text-decoration: none !important;
  color: inherit !important;
}
.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.12), 0 2px 8px rgba(240, 147, 251, 0.08);
  border-color: transparent;
}
.category-card .card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.3rem;
}
.category-card:hover .card-title {
  color: #3b82f6; /* blue-500 */
}
.category-card .card-excerpt {
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.6;
}
.category-card .card-meta {
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

/* === 标签 === */
.tag {
  display: inline-block;
  padding: 0.15em 0.6em;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 999px;
  background: linear-gradient(135deg, #dbeafe, #fce7f3); /* blue-100 → pink-100 */
  color: #7c3aed !important;
  margin-right: 0.3rem;
  transition: all 0.2s ease;
}
.tag:hover {
  background: linear-gradient(135deg, #93c5fd, #f9a8d4);
  color: #fff !important;
}

/* === 文章页 === */
/* 标题底部蓝粉装饰线 */
.md-typeset h1 {
  border-bottom: 3px solid;
  border-image: linear-gradient(90deg, #4facfe, #f093fb) 1;
  padding-bottom: 0.3rem;
}

/* 文章正文行距 */
.md-typeset {
  line-height: 1.8;
}

/* === 卡片悬浮效果（通用） === */
.md-typeset .grid.cards > ol > li,
.md-typeset .grid.cards > ul > li,
.md-typeset .grid.cards > li {
  transition: all 0.3s ease;
  border-color: #e2e8f0;
}
.md-typeset .grid.cards > ol > li:hover,
.md-typeset .grid.cards > ul > li:hover,
.md-typeset .grid.cards > li:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79, 172, 254, 0.12), 0 2px 8px rgba(240, 147, 251, 0.08);
}

/* === 导航高亮 === */
.md-tabs__link--active {
  color: #ec4899 !important; /* pink-500 */
}
```

- [ ] **Step 2: 验证 CSS 被正确加载**

```bash
mkdocs build --strict
```
Expected: Build 成功，`site/stylesheets/extra.css` 存在

- [ ] **Step 3: Commit**

```bash
git add docs/stylesheets/extra.css
git commit -m "feat(styles): add custom CSS with blue-pink theme, hero, cards, tags"
```

---

### Task 3: 首页 Hero 重设计

**Files:**
- Modify: `docs/index.md`

- [ ] **Step 1: 重构首页内容**

```markdown
<div class="hero-section" markdown>

# 你好，我是赶月喵

<p class="hero-tagline">OIer · MtF · 二次元爱好者 · 数学物理大好き</p>

<div class="hero-cards">

<a href="blog/index.md">
  <div class="card-title">📝 博客</div>
  <div class="card-desc">8 篇文章</div>
</a>

<a href="projects/index.md">
  <div class="card-title">💻 项目</div>
  <div class="card-desc">2 个项目</div>
</a>

<a href="https://github.com/lxgy1024">
  <div class="card-title">🐙 GitHub</div>
  <div class="card-desc">开源代码</div>
</a>

</div>

</div>

## 关于我

一只来自杭州、现在东京的 transfem OIer 喵。喜欢算法竞赛、二次元、数学和物理。刚踏上 HRT 之旅，正在探索真实的自己。

## 我的项目

- [MC Mod](projects/mc-mod.md) — 我的世界模组
- [爬虫工具](projects/crawler.md) — 数据采集工具

## 找到我

- [GitHub](https://github.com/lxgy1024)
```

- [ ] **Step 2: 验证首页渲染**

```bash
mkdocs build --strict
```
Expected: Build 成功，首页 Hero 区正确渲染

- [ ] **Step 3: Commit**

```bash
git add docs/index.md
git commit -m "feat(home): redesign with gradient hero section and entry cards"
```

---

### Task 4: 博客分类页卡片化

**Files:**
- Modify: `docs/blog/随笔/index.md`
- Modify: `docs/blog/人物/index.md`
- Modify: `docs/blog/创作/index.md`

- [ ] **Step 1: 重构随笔分类页为卡片列表**

改为使用 category-card 样式：

```markdown
# 随笔

生活感悟 · 随笔散文 · 行记

---

<a href="h-city-after-sunset.md" class="category-card">
  <div class="card-title">H 城日落之后</div>
  <div class="card-excerpt">初冬的 H 城，W 湖畔的日落时分。关于离别、自卑与自我怀疑的独白。</div>
  <div class="card-meta">
    <span class="tag">随笔</span>
    <span class="tag">情感</span>
    <span class="tag">杭州</span>
    <span style="color:#94a3b8;float:right;">2026-01-20</span>
  </div>
</a>

<a href="chasing-wind-and-moon.md" class="category-card">
  <div class="card-title">追风赶月莫停留</div>
  <div class="card-excerpt">"平芜尽处是春山"——关于追求、自由与释然的哲学随笔。</div>
  <div class="card-meta">
    <span class="tag">随笔</span>
    <span class="tag">感悟</span>
    <span class="tag">成长</span>
    <span style="color:#94a3b8;float:right;">2025-04-16</span>
  </div>
</a>

<a href="pe-exam-simulation.md" class="category-card">
  <div class="card-title">体考模拟感想</div>
  <div class="card-excerpt">体考模拟日，遇见学姐单珈慧，关于回忆与传承。</div>
  <div class="card-meta">
    <span class="tag">随笔</span>
    <span class="tag">青春</span>
    <span class="tag">回忆</span>
    <span style="color:#94a3b8;float:right;">2025-03-10</span>
  </div>
</a>

<a href="zju-and-me.md" class="category-card">
  <div class="card-title">ZJU 与我</div>
  <div class="card-excerpt">浙大玉泉与紫金港，两场探访，梦想与现实的交织。</div>
  <div class="card-meta">
    <span class="tag">随笔</span>
    <span class="tag">ZJU</span>
    <span class="tag">梦想</span>
    <span style="color:#94a3b8;float:right;">2025-08-22</span>
  </div>
</a>

<a href="surrender-in-jinan-winter.md" class="category-card">
  <div class="card-title">济南冬风里的降书</div>
  <div class="card-excerpt">济南凛冽的冬风里，关于出柜、自卑与真实自我的剖白。</div>
  <div class="card-meta">
    <span class="tag">随笔</span>
    <span class="tag">情感</span>
    <span class="tag">自我</span>
    <span style="color:#94a3b8;float:right;">2026-02-20</span>
  </div>
</a>
```

- [ ] **Step 2: 重构人物分类页**

```markdown
# 人物

人物特写 · 青春记事

---

<a href="the-person-i-admire-most.md" class="category-card">
  <div class="card-title">我最佩服的人</div>
  <div class="card-excerpt">柳颖同学——她始终如一。关于"美"的理解，关于孤独，关于这个时代的独行。</div>
  <div class="card-meta">
    <span class="tag">随笔</span>
    <span class="tag">人物</span>
    <span class="tag">柳颖</span>
    <span style="color:#94a3b8;float:right;">2025-03-03</span>
  </div>
</a>

<a href="hundred-day-pledge.md" class="category-card">
  <div class="card-title">百日誓师？</div>
  <div class="card-excerpt">阿聪——他的水笔芯能钉进水泥墙三厘米，草稿纸一天能过他膝盖。</div>
  <div class="card-meta">
    <span class="tag">随笔</span>
    <span class="tag">人物</span>
    <span class="tag">阿聪</span>
    <span style="color:#94a3b8;float:right;">2025-03-23</span>
  </div>
</a>
```

- [ ] **Step 3: 重构创作分类页**

```markdown
# 创作

故事 · 音乐

---

<a href="chasing-the-wind-flying-bird.md" class="category-card">
  <div class="card-title">开始，追风飞鸟</div>
  <div class="card-excerpt">"终会遗忘，终将消逝"——关于中考、离别与自我救赎的故事。还有一首歌。</div>
  <div class="card-meta">
    <span class="tag">故事</span>
    <span class="tag">青春</span>
    <span class="tag">成长</span>
    <span style="color:#94a3b8;float:right;">2025-06-15</span>
  </div>
</a>
```

- [ ] **Step 4: 验证分类页渲染**

```bash
mkdocs build --strict
```
Expected: Build 成功，卡片样式正确

- [ ] **Step 5: Commit**

```bash
git add docs/blog/
git commit -m "feat(blog): convert category pages to card-style layout"
```

---

### Task 5: 最终验证

- [ ] **Step 1: 全量构建检查**

```bash
mkdocs build --strict
```
Expected: 无 error、无 warning

- [ ] **Step 2: 验证输出结构**

检查 `site/` 输出：
- `site/stylesheets/extra.css` 存在
- 所有文章页面正常生成
- 首页 hero 区包含三个入口卡片

```bash
ls site/stylesheets/extra.css && echo "CSS OK" && ls site/blog/随笔/ | head -3
```
Expected: extra.css 存在，文章页面正常

- [ ] **Step 3: 提交最终版本**

```bash
git add -A
git commit -m "chore: finalize frontend beautification"
```
