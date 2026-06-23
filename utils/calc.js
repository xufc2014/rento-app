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

  if (allReadings.length === 0) return 0

  let consumption = 0
  let latest

  if (month) {
    // 指定月份模式：优先找该月读数，找不到则回退到最新读数
    const thisMonthReadings = allReadings.filter(r => r.readingDate.startsWith(month))
    latest = thisMonthReadings.length > 0 ? thisMonthReadings[0] : allReadings[0]
  } else {
    // 无月份模式（退租场景）：至少需要两条记录
    if (allReadings.length < 2) return 0
    latest = allReadings[0]
  }

  // 优先使用录入时已计算好的 consumption（addMeterReading 已正确对上期基准）
  if (latest.consumption != null && latest.consumption > 0) {
    consumption = latest.consumption
  } else if (month) {
    // 回退：按日期查找上期读数（非 isInitial）
    const previous = allReadings.find(
      r => r.readingDate < latest.readingDate && !r.isInitial && r.id !== latest.id
    )
    if (!previous) {
      // 仍找不到 → 检查合同初始读数
      const initialReading = allReadings.find(r => r.isInitial)
      if (initialReading && initialReading.readingValue != null) {
        consumption = latest.readingValue - initialReading.readingValue
      }
    } else {
      consumption = latest.readingValue - previous.readingValue
    }
  } else {
    // 无月份模式
    consumption = latest.readingValue - allReadings[1].readingValue
  }

  if (consumption <= 0) return 0

  // 确定单价（使用 db.getRoomRate 统一取价）
  const rate = db.getRoomRate(roomId, meterType)

  return Math.round(consumption * rate * 100) / 100  // 保留2位小数
}

/**
 * 计算月度账单总额
 * 公式: 房租(本月) + 水费(上月) + 电费(上月) + 燃气费(上月) + 网费(本月) + 卫生费(本月) + 管理费(本月) + 其他费用(本月) - 减免 = 应付总额
 * 账单月份 = 收费月，水电用量 = 上月
 */
export function calcBillTotal(roomId, month, db, deduction = 0) {
  const room = db.getRoomById(roomId)
  const contract = db.getContractById(room?.currentContractId)
  const settings = db.getSettings()

  if (!room || !contract) return 0

  // 用量月份 = 账单月份 - 1
  const usageMonth = getPrevMonth(month)

  const rentAmount = contract.rentAmount
  const waterFee = calcUtilityFee(roomId, 'water', usageMonth, db)
  const electricFee = calcUtilityFee(roomId, 'electric', usageMonth, db)
  const gasFee = calcUtilityFee(roomId, 'gas', usageMonth, db)
  const internetFee = room.internetFee || settings.internetFee
  const sanitationFee = contract.sanitationFee || settings.sanitationFee || 0
  const managementFee = contract.managementFee || settings.managementFee || 0
  const otherFee = contract.otherFee || settings.otherFee || 0

  return Math.round((rentAmount + waterFee + electricFee + gasFee + internetFee + sanitationFee + managementFee + otherFee - deduction) * 100) / 100
}

// 获取上一个月份
function getPrevMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
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
