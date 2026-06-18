/**
 * 水电费计算工具
 */

/**
 * 计算某房间某月的水电费
 * @param {string} roomId - 房间ID
 * @param {string} meterType - 'water' 或 'electric'
 * @param {string} month - 月份 '2026-06'，null则用最近一次抄表
 * @param {object} db - 数据库实例
 */
export function calcUtilityFee(roomId, meterType, month, db) {
  const room = db.getRoomById(roomId)
  if (!room) return 0

  const settings = db.getSettings()

  // 获取该房间该类型最近两次抄表
  const readings = db.getMeterReadingsByRoom(roomId)
    .filter(r => r.meterType === meterType)
    .sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate))

  if (readings.length < 2) return 0  // 至少需要两次抄表才能算用量

  const latest = readings[0]
  const previous = readings[1]

  const consumption = latest.readingValue - previous.readingValue
  if (consumption <= 0) return 0

  // 确定单价（使用 db.getRoomRate 统一取价）
  const rate = db.getRoomRate(roomId, meterType)

  return Math.round(consumption * rate * 100) / 100  // 保留2位小数
}

/**
 * 计算月度账单总额
 * 公式: 房租 + 水费 + 电费 + 网费 - 减免 = 应付总额
 */
export function calcBillTotal(roomId, month, db, deduction = 0) {
  const room = db.getRoomById(roomId)
  const contract = db.getContractById(room?.currentContractId)
  const settings = db.getSettings()

  if (!room || !contract) return 0

  const rentAmount = contract.rentAmount
  const waterFee = calcUtilityFee(roomId, 'water', month, db)
  const electricFee = calcUtilityFee(roomId, 'electric', month, db)
  const internetFee = room.internetFee || settings.internetFee

  return Math.round((rentAmount + waterFee + electricFee + internetFee - deduction) * 100) / 100
}

/**
 * 计算退租应退金额
 * 公式: (基础押金 + 额外押金) - 水费 - 电费 - 维修扣款 - 未交房租 = 应退金额
 */
export function calcCheckoutAmount(depositAmount, waterFee, electricFee, repairDeduction, unpaidRent, extraDeposit = 0) {
  return Math.round((depositAmount + extraDeposit - waterFee - electricFee - repairDeduction - unpaidRent) * 100) / 100
}

/**
 * 计算滞纳金
 */
export function calcLateFee(billCreateDate, lateFeeStartDay, lateFeePerDay) {
  const now = new Date()
  const created = new Date(billCreateDate)
  const daysOverdue = Math.floor((now - created) / (24 * 60 * 60 * 1000)) - lateFeeStartDay
  if (daysOverdue <= 0) return 0
  return daysOverdue * lateFeePerDay
}

/**
 * 合租水电分摊计算
 * @param {number} totalFee - 总费用
 * @param {Array} tenants - 租客列表，每人有 area 或 weight 属性
 * @param {string} mode - 'by_head'（按人头）或 'by_area'（按面积）
 */
export function calcSharedFee(totalFee, tenants, mode = 'by_head') {
  if (mode === 'by_head') {
    const perPerson = totalFee / tenants.length
    return tenants.map(t => ({ tenantId: t.id, amount: Math.round(perPerson * 100) / 100 }))
  } else {
    const totalArea = tenants.reduce((sum, t) => sum + (t.area || 1), 0)
    return tenants.map(t => ({
      tenantId: t.id,
      amount: Math.round(totalFee * (t.area || 1) / totalArea * 100) / 100
    }))
  }
}

/**
 * 格式化金额显示
 */
export function formatAmount(amount) {
  return `¥${amount.toFixed(2)}`
}
