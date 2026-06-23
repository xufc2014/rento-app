/**
 * Vercel Serverless Function — 接收备份数据并通过 Resend 发送邮件
 *
 * POST /api/send-backup
 * Body: { to, subject, html, attachmentBase64, fileName }
 *
 * 部署到 Vercel 后访问地址: https://你的项目.vercel.app/api/send-backup
 */

// 仅在服务端加载 Resend
let ResendModule
try {
  ResendModule = require('resend')
} catch (e) {
  // 本地开发 fallback
}

// Resend API Key（服务端环境变量优先）
const RESEND_API_KEY = process.env.RESEND_API_KEY || 'REDACTED'
const SENDER = '房东通备份 <onboarding@resend.dev>'

module.exports = async function handler(req, res) {
  // CORS — 允许 uni-app 跨域调用
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST' })
  }

  try {
    const { to, subject, html, attachmentBase64, fileName } = req.body

    if (!to) {
      return res.status(400).json({ error: '缺少收件人邮箱' })
    }

    // 构建邮件参数
    const emailParams = {
      from: SENDER,
      to: to,
      subject: subject || '房东通数据备份',
      html: html || '<p>房东通数据备份，请查收附件。</p>'
    }

    // 如果有附件
    if (attachmentBase64 && fileName) {
      emailParams.attachments = [{
        filename: fileName,
        content: attachmentBase64
      }]
    }

    // 检查 Resend 是否可用
    if (!ResendModule) {
      return res.status(500).json({ error: 'Resend 模块未加载' })
    }

    const Resend = ResendModule.Resend
    const resendClient = new Resend(RESEND_API_KEY)

    const { data, error } = await resendClient.emails.send(emailParams)

    if (error) {
      console.error('Resend 发送失败:', error)
      return res.status(500).json({ error: error.message || '邮件发送失败' })
    }

    return res.status(200).json({
      success: true,
      message: '备份邮件已发送',
      emailId: data?.id || 'unknown'
    })

  } catch (err) {
    console.error('函数异常:', err)
    return res.status(500).json({ error: err.message || '服务器内部错误' })
  }
}
