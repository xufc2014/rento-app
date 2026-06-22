/**
 * 水电费计算工具
 */

/**
 * 计算某房间某月的水电燃气费
 * @param {string} roomId - 房间ID
 * @param {string} meterType - 'water' / 'electric' / 'gas'
 * @param {string|null} month - 月份 '2026-06'，null则用最近一次抄表（退租场景）
 * @param {object} db - 数据库实例
 */
export function calcUtilityFee(roomId, meterType, month, db) {
  const room = db.getRoomById(roomId)
  if (!room) return 0

  // 获取该房间该类型所有抄表记录，按时间倒序排列
  const allReadings = db.getMeterReadingsByRoom(roomId)
    .filter(r => r.meterType === meterType)
    .sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate))

  if (allReadings.length < 2 && !month) return 0

  let latest, previous

  if (month) {
    // 指定月份模式：找该月最新读数 + 该月之前最新读数
    const thisMonthReadings = allReadings.filter(r => r.readingDate.startsWith(month))

    if (thisMonthReadings.length === 0) {
      // 该月没有抄表记录，无法计算该月费用
      return 0
    }

    latest = thisMonthReadings[0]  // 该月最新的一条

    // 找该月份之前的最近一条读数作为上期基准
    const beforeThisMonth = allReadings.filter(r => r.readingDate < month + '-01')
    if (beforeThisMonth.length === 0) {
      // 没有历史读数（首次抄表），无法计算用量
      return 0
    }
    previous = beforeThisMonth[0]
  } else {
    // 无月份模式（退租场景）：使用全局最新两条
    if (allReadings.length < 2) return 0
    latest = allReadings[0]
    previous = allReadings[1]
  }

  const consumption = latest.readingValue - previous.readingValue
  if (consumption <= 0) return 0  // 读数没变或倒退，费用为0

  // 确定单价（使用 db.getRoomRate 统一取价）
  const rate = db.getRoomRate(roomId, meterType)

  return Math.round(consumption * rate * 100) / 100  // 保留2位小数
}

/**
 * 计算月度账单总额
 * 公式: 房租 + 水费 + 电费 + 燃气费 + 网费 + 卫生费 + 管理费 + 其他费用 - 减免 = 应付总额
 */
export function calcBillTotal(roomId, month, db, deduction = 0) {
  const room = db.getRoomById(roomId)
  const contract = db.getContractById(room?.currentContractId)
  const settings = db.getSettings()

  if (!room || !contract) return 0

  const rentAmount = contract.rentAmount
  const waterFee = calcUtilityFee(roomId, 'water', month, db)
  const electricFee = calcUtilityFee(roomId, 'electric', month, db)
  const gasFee = calcUtilityFee(roomId, 'gas', month, db)
  const internetFee = room.internetFee || settings.internetFee
  const sanitationFee = contract.sanitationFee || settings.sanitationFee || 0
  const managementFee = contract.managementFee || settings.managementFee || 0
  const otherFee = contract.otherFee || settings.otherFee || 0

  return Math.round((rentAmount + waterFee + electricFee + gasFee + internetFee + sanitationFee + managementFee + otherFee - deduction) * 100) / 100
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
