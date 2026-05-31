# ✦ 玄学宜do — 技术文档

> 一个不需要具体出生时刻的综合占星平台与每日宜忌

---

## 1. 技术栈

| 层级 | 技术 | 说明 |
|---|---|---|
| 前端 | HTML / CSS / JavaScript | 单页面应用，无框架，纯原生实现 |
| 后端 | Supabase Edge Functions | Deno / TypeScript 运行时 |
| 大模型 | qwen3.5-plus | 通过平台插件 `044b4dba-ec0f-4779-998c-e8a7893253cd` 调用 |
| 邮件服务 | Resend API | 订阅确认邮件 + 每周宜忌邮件 |
| 数据库 | Supabase PostgreSQL | 仅用于邮件订阅功能（subscriptions 表） |
| 部署 | 静态前端 + Supabase 托管 | 前端端口 5173 |

---

## 2. 架构说明

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    浏览器（前端）                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │astrology │  │  bazi    │  │     mbti         │   │
│  │  .js     │  │  .js     │  │     .js          │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │                 │             │
│       └──────────────┴─────────────────┘             │
│                          │                           │
│                    ┌─────▼─────┐                     │
│                    │  app.js   │ ← 主控逻辑           │
│                    └─────┬─────┘                     │
│                          │ fetch                     │
└──────────────────────────┼───────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────┐
│              Supabase Edge Functions                  │
│                          │                           │
│  ┌──────────────┐  ┌─────▼──────┐  ┌──────────────┐  │
│  │ai-recommend  │  │ai-compre-  │  │  subscribe   │  │
│  │              │  │  hensive   │  │  unsubscribe │  │
│  └──────┬───────┘  └─────┬──────┘  │  weekly-send │  │
│         │                │         └──────┬───────┘  │
│         │                │                │          │
│  ┌──────▼────────────────▼────────────────▼───────┐  │
│  │           大模型 (qwen3.5-plus)                 │  │
│  │  通过插件 044b4dba-ec0f-4779-998c-e8a7893253cd  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Supabase PostgreSQL (subscriptions 表)       │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 2.2 前端架构

- **纯 JS 实现所有计算逻辑**（星盘/八字/MBTI），不依赖外部库
- `astrology.js`：11 颗行星落位计算（含年份查表与可能范围推算）
- `bazi.js`：公历转农历、年月日柱计算、五行分析及当日干支推算
- `mbti.js`：荣格八维概率计算，综合八维推导全部 16 种 MBTI 类型及置信度
- `app.js`：主控逻辑，负责模块动画、API 调用编排、折叠交互、日期切换
- `supabase.js`：Supabase 客户端封装，Edge Function URL 构建

### 2.3 后端架构

- **Edge Function 内嵌 RAG 知识库**：78 条文档 + 120 条黄历规则
- **Prompt 结构严格区分确定行星与不确定行星**：确定行星直接注入知识库，不确定行星标注范围
- **大模型输出严禁 Markdown 格式符号**：返回纯文本，前端自行解析渲染
- **MBTI 优雅降级**：mbti 为空时自动跳过 MBTI 知识库，注入降级提示

---

## 3. 数据流转

```
用户输入出生日期（yyyy/mm/dd）
    ↓
前端 JS 计算命盘
  ├── astrology.js → 11 颗行星落位
  ├── bazi.js → 年柱/月柱/日柱 + 五行
  └── mbti.js → 荣格八维 + 16 种 MBTI 类型
    ↓
用户确认/校准 MBTI（点击或选择"我不知道"）
    ↓
前端发送 POST 请求到 Edge Function
  ├── ai-recommend（每日宜忌）
  └── ai-comprehensive（综合分析）
    ↓
Edge Function 处理
  ├── RAG 检索（78 条知识库 + 120 条黄历规则）
  ├── 构建 Prompt（区分确定/不确定行星）
  └── 调用 qwen3.5-plus
    ↓
大模型返回纯文本
    ↓
前端解析并渲染为折叠卡片
  ├── 吃/玩/学/不宜 → 默认展开
  └── 其他维度 → 默认折叠
```

---

## 4. Edge Functions 列表

| 函数名 | 方法 | 功能 | 依赖 |
|---|---|---|---|
| `ai-recommend` | POST | 每日宜忌生成 | 大模型 + RAG + 黄历规则 |
| `ai-comprehensive` | POST | 综合分析生成 | 大模型 + 日柱/年柱/五行规则 |
| `subscribe` | POST | 订阅写入 + 发送测试邮件 | Supabase DB + Resend |
| `unsubscribe` | GET | 退订（删除订阅记录） | Supabase DB |
| `weekly-send` | GET/Cron | 定时发送每周宜忌 | Supabase DB + Resend + 大模型 |

### 4.1 ai-recommend

- 输入：`{ astrology, bazi, mbti?, targetDate }`
- 输出：`{ recommendation: string }`（纯文本）
- 内嵌 120 条黄历宜忌规则 + 78 条 RAG 知识库文档
- Prompt 区分确定/不确定行星，mbti 为空时自动降级

### 4.2 ai-comprehensive

- 输入：`{ astrology, bazi, mbti? }`
- 输出：`{ analysis: string }`（纯文本）
- 内嵌日柱/年柱/月柱/五行/健康/财运分析规则
- mbti 为空时安全跳过 MBTI 维度

### 4.3 subscribe

- 输入：`{ email, birth_year, birth_month, birth_day, send_weekday, send_hour }`
- 输出：`{ success, message }`
- 校验输入 → 写入 subscriptions 表 → 调用 Resend 发测试邮件

### 4.4 unsubscribe

- 输入：`GET ?token=xxx`
- 输出：HTML 退订确认页
- 根据 token 查找并删除订阅记录

### 4.5 weekly-send

- 模式 1（Cron）：每小时执行，查询匹配 weekday+hour 的订阅，批量生成七日宜忌并发送邮件
- 模式 2（Preview）：`GET ?preview=1&token=xxx`，返回专属 weekly HTML 页面
- 调用大模型生成七日宜忌，通过 Resend 发送

---

## 5. 数据库设计

### subscriptions 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid | 主键，自动生成 |
| email | text | 订阅邮箱（NOT NULL） |
| birth_year | int | 出生年（NOT NULL） |
| birth_month | int | 出生月（NOT NULL） |
| birth_day | int | 出生日（NOT NULL） |
| send_weekday | int | 发送星期 0=周日,1=周一,...,6=周六（NOT NULL） |
| send_hour | int | 发送时间 0-23（NOT NULL） |
| created_at | timestamptz | 创建时间，默认 now() |
| unsubscribe_token | uuid | 退订令牌，自动生成 |

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

CREATE INDEX subscriptions_email_idx ON subscriptions(email);
CREATE INDEX subscriptions_send_weekday_hour_idx ON subscriptions(send_weekday, send_hour);
```

---

## 6. 大模型调用方式

通过平台插件代理调用，接口兼容 OpenAI Chat Completions 格式：

```
POST https://creo4u.com/autoagent/api/proxy/044b4dba-ec0f-4779-998c-e8a7893253cd/compatible-mode/v1/chat/completions
Authorization: Bearer ${CREO4U_API_KEY}
Content-Type: application/json

{
  "model": "qwen3.5-plus",
  "enable_thinking": false,
  "messages": [{ "role": "user", "content": "<prompt>" }]
}
```

---

## 7. 本地运行说明

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

## 8. 安全说明

| 项目 | 说明 |
|---|---|
| API Key 管理 | 由平台环境变量注入，前端不暴露任何密钥 |
| Resend API Key | 存储在 `supabase/functions/.env`，仅 Edge Function 服务端可访问 |
| Supabase Service Role Key | 仅用于 Edge Function 服务端，不暴露给前端 |
| 前端 Supabase 客户端 | 仅使用 anon key，受 RLS 策略保护 |
| 隐私保护 | 仅收集出生年月日（精确到日），不收集时辰、姓名、出生地 |
| 数据不持久化 | 主页面计算结果不存储，仅邮件订阅功能使用数据库 |

---

## 9. 项目文件结构

```
.
├── README.md                          # 项目说明
├── prd.md                             # 产品需求文档
├── tech-doc.md                        # 技术文档
├── LICENSE                            # MIT License
├── frontend_start.sh                  # 前端启动脚本
├── project/frontend/
│   ├── index.html                     # 单页应用入口
│   ├── css/styles.css                 # 样式文件
│   ├── js/
│   │   ├── app.js                     # 主控逻辑
│   │   ├── astrology.js               # 星盘计算
│   │   ├── bazi.js                    # 八字计算
│   │   ├── mbti.js                    # MBTI 计算
│   │   └── supabase.js                # Supabase 客户端
│   └── assets/
│       └── reward-qr.jpg              # 打赏二维码
├── supabase/functions/
│   ├── .env                           # 环境变量
│   ├── _shared/cors.ts                # CORS 配置
│   ├── ai-recommend/index.ts          # 每日宜忌
│   ├── ai-comprehensive/index.ts      # 综合分析
│   ├── subscribe/index.ts             # 订阅
│   ├── unsubscribe/index.ts           # 退订
│   └── weekly-send/index.ts           # 定时发送
└── plugins/
    └── 044b4dba-ec0f-4779-998c-e8a7893253cd.md  # 大模型插件文档
```

