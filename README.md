# ✦ 玄学宜do

> 一个不需要具体出生时刻的综合占星平台与每日宜忌

[![GitHub Stars](https://img.shields.io/github/stars/comiGIGI-lab/AI-xuanxue-todo?style=social)](https://github.com/comiGIGI-lab/AI-xuanxue-todo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
`Agent应用` · `AI+垂直场景` · `RAG知识库` · `Vibe Coding工具`

---

## 🔮 项目简介

**玄学宜do** 是一个融合西方占星、中国八字五行与 MBTI 性格分析的 AI 每日宜忌平台。

传统占星/命理需要精确的出生时辰，门槛高、记忆负担重。**玄学宜do 只需输入公历出生年月日**，即可自动推算星盘、八字六字、MBTI 荣格八维概率，并结合 RAG 知识库与黄历规则，由大模型生成温暖有人文关怀的每日宜忌与综合分析。

---

## 🎯 解决了什么问题

- 传统命理/占星需要精确出生时辰，大多数人并不知道自己的出生时辰
- 现有工具要么门槛高（需要专业知识），要么内容空洞（千人一面）
- 本项目仅需出生日期，结合 AI 生成**个性化**、**有温度**的每日宜忌内容

---

## 👥 面向用户 / 场景

- 对玄学、占星、命理感兴趣的普通用户
- 黑客松 Demo 展示
- 独立开发者项目展示

---

## ✨ 核心功能

| 功能模块 | 说明 |
|---|---|
| 🌟 星盘推算 | 11 颗行星落位（太阳/月亮/上升/水星/金星/火星/木星/土星/天王/海王/冥王），含占卜方向解读 |
| ☯ 八字六字 | 公历转农历，推算年柱/月柱/日柱及五行属性，主导五行分析 |
| 🧠 MBTI 荣格八维 | 综合星盘与五行推算荣格八维（Ni/Ne/Si/Se/Ti/Te/Fi/Fe）概率，输出全部 16 种 MBTI 类型置信度排名，支持用户手动确认 |
| ✨ AI 每日宜忌 | 结合 120 条黄历宜忌规则 + 78 条 RAG 知识库，生成今日适合吃/玩/学/不宜等多维度推荐，支持近 7 日切换 |
| 🔮 综合分析 | 性格特征、伴侣画像、职业发展、五行缺失、健康建议、财运分析 |
| ✉ 邮件订阅 | 订阅每周七日宜忌，自定义发送星期与时间，含一键直达专属页面链接与退订功能 |
| ☕ 打赏 & Star | 微信打赏二维码 + GitHub Star 区块 |

---

## 🛠 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | 原生 HTML / CSS / JavaScript（单页面，无框架） |
| 后端 | Supabase Edge Functions（Deno/TypeScript） |
| 大模型 | qwen3.5-plus（通过 Creo4U 插件代理调用） |
| 邮件服务 | Resend API |
| 数据库 | Supabase PostgreSQL（仅用于邮件订阅存储） |
| 部署 | 静态前端 + Supabase 托管 |

### AI 能力调用说明

大模型通过插件代理调用，接口兼容 OpenAI Chat Completions 格式：

```
POST https://creo4u.com/autoagent/api/proxy/<plugin_id>/compatible-mode/v1/chat/completions
Authorization: Bearer ${CREO4U_API_KEY}
Body: { model: "qwen3.5-plus", enable_thinking: false, messages: [...] }
```

- **ai-recommend**：内嵌 120 条黄历宜忌规则 + 78 条 RAG 知识库文档，生成每日宜忌
- **ai-comprehensive**：内嵌日柱/年柱/月柱/五行/健康/财运分析规则，生成综合分析
- **weekly-send**：每周定时生成七日宜忌并通过 Resend 发送邮件

---

## 🚀 本地运行说明

### 前端

```bash
bash frontend_start.sh
```

启动后访问 `http://localhost:5173`

### Edge Functions（本地调试）

```bash
supabase functions serve
```

需要在 `supabase/functions/.env` 中配置：

```env
SUPABASE_URL=<your_supabase_url>
SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
CREO4U_API_KEY=<your_api_key>
RESEND_API_KEY=<your_resend_api_key>
```

### 数据库（邮件订阅功能）

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  birth_year int NOT NULL,
  birth_month int NOT NULL,
  birth_day int NOT NULL,
  send_weekday int NOT NULL,
  send_hour int NOT NULL,
  created_at timestamptz DEFAULT now(),
  unsubscribe_token uuid DEFAULT gen_random_uuid()
);
```

---

## 📊 当前完成度

- [x] 星盘推算（11 颗行星）
- [x] 八字六字（年/月/日柱 + 五行）
- [x] MBTI 荣格八维概率 + 16 种类型置信度排名
- [x] AI 每日宜忌（RAG + 黄历规则 + 大模型）
- [x] 近 7 日日期切换
- [x] 综合分析（性格/伴侣/职业/五行/健康/财运）
- [x] 邮件订阅（Resend + Supabase DB）
- [x] 打赏区 + GitHub Star 区块
- [x] PWA 支持

---

## 🔭 后续优化方向

- Resend 域名验证后邮件订阅完整上线
- 增加出生地/时辰可选输入，提升星盘精度
- 移动端适配优化
- 更丰富的 RAG 知识库（增加更多占星/命理文献）
- 支持分享功能（生成专属分享卡片）

---

## 🔗 链接

- **GitHub**：[https://github.com/comiGIGI-lab/AI-xuanxue-todo](https://github.com/comiGIGI-lab/AI-xuanxue-todo)
- **作者**：Rowangie

---

## 📜 License

本项目采用 [MIT License](LICENSE) 开源协议。

Copyright (c) 2026 Rowangie

---

> ✦ 愿你在这段玄学之旅中，收获的不只是好奇与乐趣，更是对自己的温柔理解与勇敢前行。
