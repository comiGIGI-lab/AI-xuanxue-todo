// ============================================
// weekly-send Edge Function
// Cron: 每小时执行，查询匹配订阅，生成七日宜忌，发送邮件
// GET ?preview=1&token=xxx: 预览专属 weekly 页面
// ============================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const ZODIAC_SIGNS = [
  { name: '摩羯座', start: [12, 22], end: [1, 19] },
  { name: '水瓶座', start: [1, 20], end: [2, 18] },
  { name: '双鱼座', start: [2, 19], end: [3, 20] },
  { name: '白羊座', start: [3, 21], end: [4, 19] },
  { name: '金牛座', start: [4, 20], end: [5, 20] },
  { name: '双子座', start: [5, 21], end: [6, 20] },
  { name: '巨蟹座', start: [6, 21], end: [7, 22] },
  { name: '狮子座', start: [7, 23], end: [8, 22] },
  { name: '处女座', start: [8, 23], end: [9, 22] },
  { name: '天秤座', start: [9, 23], end: [10, 22] },
  { name: '天蝎座', start: [10, 23], end: [11, 21] },
  { name: '射手座', start: [11, 22], end: [12, 21] },
]

function getSunSign(month: number, day: number): string {
  for (const sign of ZODIAC_SIGNS) {
    const [sm, sd] = sign.start
    const [em, ed] = sign.end
    if (sm === 12) {
      if ((month === 12 && day >= sd) || (month === 1 && day <= ed)) return sign.name
    } else {
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return sign.name
    }
  }
  return '摩羯座'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const isPreview = url.searchParams.get('preview') === '1'
  const previewToken = url.searchParams.get('token')

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
  const CREO4U_API_KEY = Deno.env.get('CREO4U_API_KEY')!

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 预览模式：返回专属 weekly HTML 页面
  if (isPreview && previewToken) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('unsubscribe_token', previewToken)
      .single()

    if (!sub) {
      return new Response('<h1>未找到订阅记录</h1>', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const weeklyContent = await generateWeeklyContent(sub, CREO4U_API_KEY)
    const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?token=${previewToken}`
    const html = buildWeeklyPage(sub, weeklyContent, unsubscribeUrl)

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Cron 模式：查询当前小时+星期匹配的订阅，批量发送
  const now = new Date()
  const currentWeekday = now.getUTCDay() // 0=周日
  const currentHour = now.getUTCHours() + 8 // 转为北京时间
  const bjHour = currentHour >= 24 ? currentHour - 24 : currentHour
  const bjWeekday = currentHour >= 24 ? (currentWeekday + 1) % 7 : currentWeekday

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('send_weekday', bjWeekday)
    .eq('send_hour', bjHour)

  if (error) {
    console.error('Query error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders })
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ message: `No subscriptions for weekday=${bjWeekday} hour=${bjHour}`, sent: 0 }), {
      status: 200, headers: jsonHeaders,
    })
  }

  let sent = 0
  const errors: string[] = []

  for (const sub of subs) {
    try {
      const weeklyContent = await generateWeeklyContent(sub, CREO4U_API_KEY)
      const weeklyUrl = `${SUPABASE_URL}/functions/v1/weekly-send?preview=1&token=${sub.unsubscribe_token}`
      const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?token=${sub.unsubscribe_token}`

      const emailHtml = buildEmailHtml(sub, weeklyContent, weeklyUrl, unsubscribeUrl)

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Rowangie <onboarding@resend.dev>',
          to: [sub.email],
          subject: `✦ 玄学宜do · 你的每周宜忌来了（${WEEKDAY_NAMES[sub.send_weekday]}）`,
          html: emailHtml,
        }),
      })

      if (resendRes.ok) {
        sent++
      } else {
        const err = await resendRes.text()
        errors.push(`${sub.email}: ${err}`)
      }
    } catch (e) {
      errors.push(`${sub.email}: ${e.message}`)
    }
  }

  return new Response(JSON.stringify({ sent, total: subs.length, errors }), { status: 200, headers: jsonHeaders })
})

async function generateWeeklyContent(sub: Record<string, unknown>, apiKey: string): Promise<string> {
  const { birth_year, birth_month, birth_day } = sub as { birth_year: number; birth_month: number; birth_day: number }
  const sunSign = getSunSign(birth_month, birth_day)

  const today = new Date()
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(`${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAY_NAMES[d.getDay()]})`)
  }

  const prompt = `你是一位融合西方占星、中国八字五行和MBTI的玄学顾问。
用户出生于${birth_year}年${birth_month}月${birth_day}日，太阳星座为${sunSign}。
请为用户生成未来7天（${days.join('、')}）的每日宜忌简报，每天包含：
- 今日宜：1-2件适合做的事（吃/玩/学/工作/社交任选）
- 今日忌：1件需要注意的事
- 一句话运势
格式简洁，每天不超过80字，语气温暖有趣，带一点玄学神秘感。`

  try {
    const res = await fetch(
      'https://creo4u.com/autoagent/api/proxy/044b4dba-ec0f-4779-998c-e8a7893253cd/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3.5-plus',
          enable_thinking: false,
          messages: [{ role: 'user', content: prompt }],
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('AI error:', err)
      return `（AI生成失败，请直接访问玄学宜do网站查看每日宜忌）`
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || '（内容生成中，请稍后访问网站查看）'
  } catch (e) {
    console.error('AI fetch error:', e)
    return `（AI生成失败：${e.message}）`
  }
}

function buildWeeklyPage(sub: Record<string, unknown>, content: string, unsubscribeUrl: string): string {
  const { birth_year, birth_month, birth_day, send_weekday, email } = sub as {
    birth_year: number; birth_month: number; birth_day: number; send_weekday: number; email: string
  }
  const sunSign = getSunSign(birth_month, birth_day)
  const contentHtml = content.replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>玄学宜do · 你的每周宜忌</title>
<style>
  body { margin: 0; min-height: 100vh; background: #0a0a12; font-family: 'Helvetica Neue', Arial, sans-serif; color: #e8e6f0; }
  .container { max-width: 700px; margin: 0 auto; padding: 32px 16px; }
  .header { text-align: center; padding: 40px 0 32px; border-bottom: 1px solid #2a2a40; margin-bottom: 32px; }
  .header h1 { margin: 0 0 8px; font-size: 32px; color: #e8e6f0; }
  .header p { margin: 0; font-size: 14px; color: #8b87a8; }
  .info { background: #1a1a2e; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; border-left: 3px solid #7c5cbf; }
  .info p { margin: 6px 0; font-size: 14px; color: #8b87a8; }
  .info strong { color: #d4a5ff; }
  .content { background: #12121f; border-radius: 12px; padding: 28px; border: 1px solid #2a2a40; line-height: 2; font-size: 15px; color: #e8e6f0; margin-bottom: 24px; }
  .footer { text-align: center; padding: 24px 0; border-top: 1px solid #2a2a40; }
  .footer p { margin: 4px 0; font-size: 12px; color: #8b87a8; }
  .footer a { color: #7c5cbf; text-decoration: none; }
  .back-btn { display: inline-block; margin-top: 16px; padding: 10px 24px; background: #7c5cbf; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>✦ 玄学宜do</h1>
    <p>一个不需要具体出生时刻的综合占星平台与每日宜忌</p>
  </div>
  <div class="info">
    <p>📅 出生日期：<strong>${birth_year}年${birth_month}月${birth_day}日</strong></p>
    <p>⭐ 太阳星座：<strong>${sunSign}</strong></p>
    <p>📧 订阅邮箱：<strong>${email}</strong></p>
    <p>⏰ 每${WEEKDAY_NAMES[send_weekday]}发送</p>
  </div>
  <div class="content">${contentHtml}</div>
  <div class="footer">
    <p>由 <strong>Rowangie</strong> 用爱发电 · 玄学宜do</p>
    <p>如不想继续接收，<a href="${unsubscribeUrl}">点击退订</a></p>
    <a class="back-btn" href="https://supabase-api-202605292104-eg9drdty.creo4u.com">返回玄学宜do</a>
  </div>
</div>
</body>
</html>`
}

function buildEmailHtml(
  sub: Record<string, unknown>,
  weeklyContent: string,
  weeklyUrl: string,
  unsubscribeUrl: string
): string {
  const { birth_year, birth_month, birth_day, send_weekday } = sub as {
    birth_year: number; birth_month: number; birth_day: number; send_weekday: number
  }
  const sunSign = getSunSign(birth_month, birth_day)
  const preview = weeklyContent.slice(0, 200).replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>玄学宜do · 每周宜忌</title>
<style>
  body { margin: 0; padding: 0; background: #0a0a12; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; background: #12121f; border-radius: 16px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #1a1a3e 0%, #0a0a12 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #2a2a40; }
  .header h1 { margin: 0 0 8px; font-size: 28px; color: #e8e6f0; font-weight: 700; }
  .header p { margin: 0; font-size: 14px; color: #8b87a8; }
  .badge { display: inline-block; background: rgba(212,165,255,0.15); color: #d4a5ff; border: 1px solid #d4a5ff; border-radius: 20px; padding: 4px 16px; font-size: 12px; margin-top: 12px; }
  .body { padding: 32px; }
  .info-box { background: #1a1a2e; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; border-left: 3px solid #7c5cbf; }
  .info-box p { margin: 6px 0; font-size: 14px; color: #8b87a8; }
  .info-box strong { color: #d4a5ff; }
  .preview-box { background: #1a1a2e; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; border: 1px solid #2a2a40; font-size: 14px; color: #e8e6f0; line-height: 1.8; }
  .cta-btn { display: block; width: fit-content; margin: 0 auto 24px; padding: 14px 32px; background: #7c5cbf; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; text-align: center; }
  .footer { padding: 24px 32px; text-align: center; border-top: 1px solid #2a2a40; }
  .footer p { margin: 4px 0; font-size: 12px; color: #8b87a8; }
  .footer a { color: #7c5cbf; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>✦ 玄学宜do</h1>
    <p>一个不需要具体出生时刻的综合占星平台与每日宜忌</p>
    <span class="badge">✦ 每${WEEKDAY_NAMES[send_weekday]}宜忌</span>
  </div>
  <div class="body">
    <div class="info-box">
      <p>📅 出生日期：<strong>${birth_year}年${birth_month}月${birth_day}日</strong></p>
      <p>⭐ 太阳星座：<strong>${sunSign}</strong></p>
    </div>
    <div class="preview-box">${preview}…</div>
    <a class="cta-btn" href="${weeklyUrl}">✦ 查看完整七日宜忌</a>
  </div>
  <div class="footer">
    <p>由 <strong>Rowangie</strong> 用爱发电 · 玄学宜do</p>
    <p>如不想继续接收，<a href="${unsubscribeUrl}">点击退订</a></p>
  </div>
</div>
</body>
</html>`
}
