/**
 * 账单导出工具
 * 支持导出为 CSV 格式（Excel 可直接打开）
 * 参考格式：房租收据表格（含水电读数、费用明细、合计等）
 */

/**
 * 导出账单数据为 Excel/CSV 文件
 * @param {Array} bills - 账单数组（generateBill 返回的结果，含完整费用字段）
 * @param {string} month - 月份 '2026-06'
 * @param {string} buildingName - 楼栋名称（用于标题）
 * @param {object} dbInstance - 数据库实例（用于查询读数信息）
 */
export function exportBillsToExcel(bills, month, buildingName = '', dbInstance = null) {
  if (!dbInstance) {
    uni.showToast({ title: '导出参数缺失', icon: 'none' })
    return
  }

  const monthCN = getMonthCN(month)
  const dateStr = formatDateCN(new Date())
  const fileName = `${monthCN}房租收据_${buildingName || '全部'}.csv`

  // 构建每间房的表格数据
  let csvContent = '\uFEFF' // BOM for UTF-8

  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i]
    const roomInfo = dbInstance ? getRoomReadings(dbInstance, bill.roomId, month) : null

    // 标题行
    csvContent += `"${monthCN}房租收据${buildingName ? '（' + buildingName + '）' : ''}"\r\n`
    csvContent += `"房号：","${bill.roomLabel || bill.roomId || ''}",,,,"日期：","${dateStr}"\r\n`

    // 表头
    csvContent += `"项目","上月","本月","实用","金额","备注"\r\n`

    // 水费行
    if (roomInfo && roomInfo.water) {
      csvContent += `"水费（吨）","${roomInfo.water.last}","${roomInfo.water.current}","${roomInfo.water.usage}","${fmt(bill.waterFee)}",""\r\n`
    } else {
      csvContent += `"水费（吨）","","","","${fmt(bill.waterFee)}",""\r\n`
    }

    // 电费行
    if (roomInfo && roomInfo.electric) {
      csvContent += `"电费（度）","${roomInfo.electric.last}","${roomInfo.electric.current}","${roomInfo.electric.usage}","${fmt(bill.electricFee)}",""\r\n`
    } else {
      csvContent += `"电费（度）","","","","${fmt(bill.electricFee)}",""\r\n`
    }

    // 气费行（如果有）
    if (bill.gasFee > 0) {
      if (roomInfo && roomInfo.gas) {
        csvContent += `"气费（方）","${roomInfo.gas.last}","${roomInfo.gas.current}","${roomInfo.gas.usage}","${fmt(bill.gasFee)}",""\r\n`
      } else {
        csvContent += `"气费（方）","","","","${fmt(bill.gasFee)}",""\r\n`
      }
    }

    // 固定费用行
    csvContent += `"房租","","","","${fmt(bill.rentAmount)}",""\r\n`
    csvContent += `"管理费","","","","${bill.managementFee > 0 ? fmt(bill.managementFee) : '"—"'}",""\r\n`
    csvContent += `"网络费","","","","${bill.internetFee > 0 ? fmt(bill.internetFee) : '"—"'}",""\r\n`

    if (bill.sanitationFee > 0) {
      csvContent += `"卫生费","","","","${fmt(bill.sanitationFee)}",""\r\n`
    }
    if (bill.otherFee > 0) {
      csvContent += `"其他费用","","","","${fmt(bill.otherFee)}",""\r\n`
    }

    // 减免行
    if (bill.deduction > 0) {
      csvContent += `"减免","","","","-${fmt(bill.deduction)}","${bill.deductionReason || ''}"\r\n`
    }

    // 合计行
    csvContent += `"合计：","","","","${fmt(bill.totalAmount)}","交租请备注${bill.roomLabel || '房号'}"\r\n`
    csvContent += `"开票人：","收款人：",,,,,\r\n`

    // 房间分隔（空行）
    if (i < bills.length - 1) {
      csvContent += "\r\n"
    }
  }

  // 根据平台选择保存方式
  // #ifdef H5
  saveAsCSV_H5(csvContent, fileName)
  // #endif

  // #ifdef APP-PLUS
  saveAsCSV_App(csvContent, fileName)
  // #endif
}

/**
 * 获取房间某月的抄表读数信息
 */
function getRoomReadings(db, roomId, month) {
  const result = { water: null, electric: null, gas: null }

  // 获取该房间该类型的所有读数
  const allWater = db.getMeterReadingsByRoom(roomId).filter(r => r.meterType === 'water').sort(sortByDate)
  const allElectric = db.getMeterReadingsByRoom(roomId).filter(r => r.meterType === 'electric').sort(sortByDate)
  const allGas = db.getMeterReadingsByRoom(roomId).filter(r => r.meterType === 'gas').sort(sortByDate)

  result.water = getMonthReadings(allWater, month)
  result.electric = getMonthReadings(allElectric, month)
  result.gas = getMonthReadings(allGas, month)

  return result
}

function sortByDate(a, b) {
  return new Date(a.readingDate) - new Date(b.readingDate)
}

/**
 * 从排序后的读数列表中获取指定月份的上下月读数
 */
function getMonthReadings(sortedReadings, month) {
  if (!sortedReadings || sortedReadings.length === 0) return null

  // 该月及之后的读数
  const thisAndAfter = sortedReadings.filter(r => r.readingDate >= month + '-01')
  // 该月之前的读数
  const beforeThis = sortedReadings.filter(r => r.readingDate < month + '-01')

  const current = thisAndAfter[0] // 当月第一条（或最早的一条）
  const previous = beforeThis.length > 0 ? beforeThis[beforeThis.length - 1] : null // 前一个月最后一条

  if (!current) return null

  const currentVal = current.readingValue
  const prevVal = previous ? previous.readingValue : (current.isInitial ? 0 : null)
  const usage = prevVal != null ? (currentVal - prevVal) : null

  return {
    last: prevVal != null ? String(prevVal) : '',
    current: String(currentVal),
    usage: usage != null ? String(Math.round(usage * 100) / 100) : ''
  }
}

// ========== 平台适配的保存方法 ==========

/**
 * H5 模式：通过 Blob 下载
 */
function saveAsCSV_H5(content, fileName) {
  try {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (e) {
    console.error('Export error:', e)
    // 兜底：复制到剪贴板
    uni.setClipboardData({
      data: content,
      success: () => {
        uni.showModal({
          title: '导出内容已复制',
          content: '请粘贴到记事本/Excel中保存为 .csv 文件',
          showCancel: false
        })
      }
    })
  }
}

/**
 * APP 模式：保存到本地文件系统
 */
function saveAsCSV_App(content, fileName) {
  // #ifdef APP-plus
  plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, fs => {
    fs.getRoot(root => {
      const fullPath = root.fullPath + '/' + fileName
      root.getFile(fileName, { create: true }, fileEntry => {
        fileEntry.createWriter(writer => {
          writer.write(content)
          writer.onwrite = () => {
            uni.showToast({ title: `已保存至: ${fullPath}`, icon: 'none', duration: 3000 })
          }
          writer.onerror = (e) => {
            console.error('Write error:', e)
            uni.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      }, e => {
        console.error('GetFile error:', e)
        uni.showToast({ title: '创建文件失败', icon: 'none' })
      })
    })
  }, e => {
    console.error('FileSystem error:', e)
    // 兜底：复制到剪贴板
    fallbackCopy(content)
  })
  // #endif
}

function fallbackCopy(content) {
  uni.setClipboardData({
    data: content,
    success: () => {
      uni.showModal({
        title: '导出内容已复制',
        content: '请粘贴到记事本中保存为 .csv 文件',
        showCancel: false
      })
    }
  })
}

// ========== 工具函数 ==========

function fmt(val) {
  const n = Number(val) || 0
  return n.toFixed(2)
}

function getMonthCN(monthStr) {
  if (!monthStr) return ''
  const parts = monthStr.split('-')
  if (parts.length !== 2) return monthStr
  const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return `${months[Number(parts[1]) - 1]}月份`
}

function formatDateCN(date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}年${m}月${d}日`
}
