/**
 * 日期工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 格式化日期为 YYYY年MM月DD日
 */
export function formatDateCN(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 获取当前月份字符串 YYYY-MM
 */
export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 获取下个月字符串 YYYY-MM
 */
export function getNextMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number)
  if (month === 12) {
    return `${year + 1}-01`
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/**
 * 计算两个日期之间的天数
 */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.floor((d2 - d1) / (24 * 60 * 60 * 1000))
}

/**
 * 距今天还有多少天
 */
export function daysFromNow(date) {
  return daysBetween(new Date(), date)
}

/**
 * 判断合同是否即将到期
 * @param {string} endDate - 合同结束日期
 * @param {number} threshold - 提前天数
 */
export function isContractExpiringSoon(endDate, threshold = 30) {
  const days = daysFromNow(endDate)
  return days > 0 && days <= threshold
}

/**
 * 判断合同是否已过期
 */
export function isContractExpired(endDate) {
  return daysFromNow(endDate) <= 0
}

/**
 * 获取相对时间描述（"3天后"、"已过期5天"）
 */
export function getRelativeDaysDesc(date) {
  const days = daysFromNow(date)
  if (days > 0) return `${days}天后`
  if (days === 0) return '今天'
  return `已过期${Math.abs(days)}天`
}
