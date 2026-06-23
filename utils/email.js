/**
 * 邮件备份工具 — 通过 Resend REST API 直接发送备份邮件
 *
 * 用于生成账单后自动将数据备份发送到指定邮箱
 */

const SENDER = '房东通备份 <onboarding@resend.dev>'
const API_URL = 'https://api.resend.com/emails'

// ============ 纯 JS Base64 编码（兼容 APP-PLUS 无 window.btoa）============
function stringToBase64(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  // UTF-8 encode
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0
    result += chars.charAt(b1 >> 2)
    result += chars.charAt(((b1 & 3) << 4) | (b2 >> 4))
    result += i + 1 < bytes.length ? chars.charAt(((b2 & 15) << 2) | (b3 >> 6)) : '='
    result += i + 2 < bytes.length ? chars.charAt(b3 & 63) : '='
  }
  return result
}

// ============ Promise 化 uni.request ============
function uniRequest(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      success(res) {
        console.log('[备份邮件] HTTP 响应状态:', res.statusCode)
        console.log('[备份邮件] HTTP 响应体:', JSON.stringify(res.data))
        resolve(res)
      },
      fail(err) {
        console.error('[备份邮件] HTTP 请求失败:', JSON.stringify(err))
        reject(err)
      }
    })
  })
}

// ============ 发送备份邮件 ============

/**
 * 向指定邮箱发送备份数据
 * @param {string} toEmail - 接收备份的邮箱
 * @param {string} apiKey - Resend API 密钥
 * @param {object} backupData - 完整备份数据对象
 * @param {string} fileName - 附件文件名
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendBackupEmail(toEmail, apiKey, backupData, fileName) {
  console.log('========================================')
  console.log('[备份邮件] ====== 开始发送邮件备份 ======')
  console.log('[备份邮件] 收件人:', toEmail)
  console.log('[备份邮件] 文件名:', fileName)
  console.log('[备份邮件] 数据键数量:', Object.keys(backupData).length)

  if (!toEmail) {
    console.warn('[备份邮件] 收件人为空，跳过发送')
    return { success: false, message: '未配置备份邮箱' }
  }

  if (!apiKey) {
    console.warn('[备份邮件] API Key 为空，跳过发送')
    return { success: false, message: '未配置 Resend API 密钥' }
  }

  try {
    // 将备份数据序列化为 JSON
    const jsonStr = JSON.stringify(backupData, null, 2)
    const dataSize = jsonStr.length
    console.log('[备份邮件] JSON 大小:', dataSize, 'bytes')

    // Base64 编码
    const base64Content = stringToBase64(jsonStr)
    console.log('[备份邮件] Base64 编码完成，长度:', base64Content.length)

    // 构建数据摘要
    const buildingCount = backupData.BUILDINGS?.length || 0
    const roomCount = backupData.ROOMS?.length || 0
    const tenantCount = backupData.TENANTS?.length || 0
    const billCount = backupData.BILLS?.length || 0
    const readingCount = backupData.METER_READINGS?.length || 0

    console.log('[备份邮件] 数据摘要:', {
      楼栋: buildingCount,
      房间: roomCount,
      租客: tenantCount,
      账单: billCount,
      抄表记录: readingCount
    })

    const now = new Date()
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

    const body = {
      from: SENDER,
      to: toEmail,
      subject: `🏠 房东通数据备份 ${dateStr}`,
      html: [
        '<div style="font-family:Arial,sans-serif;padding:16px;">',
        '<h2 style="color:#333;">房东通数据备份</h2>',
        `<p>备份时间：<strong>${dateStr}</strong></p>`,
        '<hr style="border:1px solid #eee;">',
        '<h3>数据概览</h3>',
        '<table style="border-collapse:collapse;width:100%;">',
        `<tr><td style="padding:6px;border:1px solid #eee;">🏢 楼栋</td><td style="padding:6px;border:1px solid #eee;"><strong>${buildingCount}</strong></td></tr>`,
        `<tr><td style="padding:6px;border:1px solid #eee;">🚪 房间</td><td style="padding:6px;border:1px solid #eee;"><strong>${roomCount}</strong></td></tr>`,
        `<tr><td style="padding:6px;border:1px solid #eee;">👤 租客</td><td style="padding:6px;border:1px solid #eee;"><strong>${tenantCount}</strong></td></tr>`,
        `<tr><td style="padding:6px;border:1px solid #eee;">📋 账单</td><td style="padding:6px;border:1px solid #eee;"><strong>${billCount}</strong></td></tr>`,
        `<tr><td style="padding:6px;border:1px solid #eee;">⚡ 抄表记录</td><td style="padding:6px;border:1px solid #eee;"><strong>${readingCount}</strong></td></tr>`,
        '</table>',
        '<p style="color:#999;margin-top:20px;font-size:12px;">此邮件由房东通 App 自动发送</p>',
        '</div>'
      ].join(''),
      attachments: [{
        filename: fileName,
        content: base64Content
      }]
    }

    console.log('[备份邮件] 正在调用 Resend API...')
    console.log('[备份邮件] 请求 URL:', API_URL)

    const res = await uniRequest({
      url: API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: body,
      timeout: 20000
    })

    console.log('[备份邮件] HTTP 状态码:', res.statusCode)

    if (res.statusCode === 200) {
      console.log('[备份邮件] ✅ 邮件发送成功！')
      console.log('[备份邮件] 响应:', JSON.stringify(res.data))
      return { success: true, message: '备份邮件已发送', emailId: res.data?.id }
    } else {
      console.error('[备份邮件] ❌ 邮件发送失败，状态码:', res.statusCode)
      console.error('[备份邮件] 响应:', JSON.stringify(res.data))
      return { success: false, message: `发送失败: ${res.data?.message || res.statusCode}` }
    }

  } catch (err) {
    console.error('[备份邮件] ❌ 异常:', JSON.stringify(err))
    console.error('[备份邮件] 异常详情:', err)
    return { success: false, message: `发送异常: ${err.errMsg || err.message || '未知错误'}` }
  } finally {
    console.log('[备份邮件] ====== 邮件发送流程结束 ======')
    console.log('========================================')
  }
}
