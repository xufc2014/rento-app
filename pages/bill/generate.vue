<template>
  <view class="page">
    <!-- 选择月份 -->
    <view class="card">
      <view class="form-label">生成月份</view>
      <picker mode="date" fields="month" :value="selectedMonth" @change="onMonthChange">
        <view class="picker-value">{{ selectedMonth }}</view>
      </picker>
    </view>

    <!-- 选择楼栋 -->
    <view class="card">
      <view class="form-label">选择楼栋</view>
      <view class="building-list" v-if="buildings.length > 0">
        <view
          class="building-item"
          v-for="b in buildings"
          :key="b.id"
          :class="{ active: selectedBuildingId === b.id }"
          @click="selectBuilding(b.id)"
        >
          <text class="building-name">{{ b.name }}</text>
        </view>
      </view>
      <text class="empty-hint" v-else>暂无楼栋数据</text>
    </view>

    <!-- 房间列表 -->
    <view class="card" v-if="selectedBuildingId">
      <view class="room-header">
        <view class="form-label">已入住房间</view>
        <view class="check-all" @click="toggleAll">
          <text class="check-text">{{ isAllChecked ? '取消全选' : '全选' }}</text>
        </view>
      </view>
      <view class="room-list" v-if="occupiedRooms.length > 0">
        <view
          class="room-check-item"
          v-for="room in occupiedRooms"
          :key="room.id"
          @click="toggleRoom(room.id)"
        >
          <view class="checkbox" :class="{ checked: checkedRooms.has(room.id) }">
            <text class="check-icon" v-if="checkedRooms.has(room.id)">&#10003;</text>
          </view>
          <view class="room-info">
            <text class="room-label">{{ room.floor }}-{{ room.roomNumber }}</text>
            <text class="room-tenant">{{ tenantName(room.currentTenantId) }}</text>
          </view>
          <text class="room-rent">{{ formatAmount(getContractRent(room.id)) }}/月</text>
        </view>
      </view>
      <text class="empty-hint" v-else>该楼栋暂无已入住房间</text>
    </view>

    <!-- 减免设置（可选） -->
    <view class="card">
      <view class="form-label">减免金额（可选）</view>
      <input class="input-big" type="digit" v-model="deduction" placeholder="0.00" />
      <input class="input-big" v-model="deductionReason" placeholder="减免原因（选填）" style="margin-top: 10px;" />
    </view>

    <!-- 生成结果 - 费用明细 -->
    <view class="card result-card" v-if="generateResult.length > 0">
      <view class="result-header">
        <view class="form-label">生成结果</view>
        <text class="result-summary">{{ generateResult.filter(r => !r.error).length }} 笔成功 · {{ selectedMonth }}</text>
      </view>

      <!-- 每个房间的费用卡片 -->
      <view
        class="bill-card"
        v-for="(r, idx) in generateResult"
        :key="idx"
        @click="goDetail(r)"
      >
        <!-- 错误提示 -->
        <view class="bill-error" v-if="r.error">
          <text class="error-room">{{ r.roomLabel || '未知房间' }}</text>
          <text class="error-msg">{{ r.error }}</text>
        </view>

        <!-- 正常费用明细 -->
        <view v-else>
          <view class="bill-card-head">
            <text class="bill-room-name">{{ r.roomLabel || '未知房间' }}</text>
            <text class="bill-total">¥{{ formatAmt(r.totalAmount) }}</text>
          </view>

          <view class="bill-usage-month" v-if="r.usageMonth">
            <text class="usage-month-label">水电用量月份：</text>
            <text class="usage-month-val">{{ r.usageMonth }}</text>
          </view>

          <view class="bill-fees-grid">
            <view class="fee-item">
              <text class="fee-label">房租</text>
              <text class="fee-val">{{ formatAmt(r.rentAmount) }}</text>
            </view>
            <view class="fee-item">
              <text class="fee-label">水费</text>
              <text class="fee-val" :class="{ 'fee-zero': r.waterFee === 0 }">{{ formatAmt(r.waterFee) }}</text>
            </view>
            <view class="fee-item">
              <text class="fee-label">电费</text>
              <text class="fee-val" :class="{ 'fee-zero': r.electricFee === 0 }">{{ formatAmt(r.electricFee) }}</text>
            </view>
            <view class="fee-item" v-if="r.gasFee > 0">
              <text class="fee-label">气费</text>
              <text class="fee-val">{{ formatAmt(r.gasFee) }}</text>
            </view>
            <view class="fee-item">
              <text class="fee-label">网费</text>
              <text class="fee-val" :class="{ 'fee-zero': r.internetFee === 0 }">{{ formatAmt(r.internetFee) }}</text>
            </view>
            <view class="fee-item" v-if="r.sanitationFee > 0">
              <text class="fee-label">卫生费</text>
              <text class="fee-val">{{ formatAmt(r.sanitationFee) }}</text>
            </view>
            <view class="fee-item" v-if="r.managementFee > 0">
              <text class="fee-label">管理费</text>
              <text class="fee-val">{{ formatAmt(r.managementFee) }}</text>
            </view>
            <view class="fee-item" v-if="r.otherFee > 0">
              <text class="fee-label">其他</text>
              <text class="fee-val">{{ formatAmt(r.otherFee) }}</text>
            </view>
            <view class="fee-item fee-deduction" v-if="r.deduction > 0">
              <text class="fee-label">减免</text>
              <text class="fee-val fee-green">-{{ formatAmt(r.deduction) }}</text>
            </view>
          </view>

          <view class="bill-card-footer">
            <text class="bill-hint">点击查看详情 →</text>
          </view>
        </view>
      </view>

      <!-- 导出按钮 -->
      <view class="export-section" v-if="generateResult.some(r => !r.error)">
        <view class="btn-big btn-export" @click="doExport">
          📊 导出 Excel（{{ generateResult.filter(r => !r.error).length }}笔）
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>

    <!-- 生成按钮 -->
    <view class="footer-bar">
      <view class="btn-big btn-primary" @click="doGenerate">
        生成账单 ({{ checkedRooms.size }}间)
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import db from '@/utils/db.js'
import { getNextMonth } from '@/utils/date.js'
import { formatAmount } from '@/utils/calc.js'
import { exportBillsToExcel } from '@/utils/export.js'
import { sendBackupEmail } from '@/utils/email.js'

const buildings = ref([])
const selectedBuildingId = ref('')
const selectedMonth = ref(getNextMonth(new Date().toISOString().slice(0, 7)).replace('-', '-'))
const checkedRooms = ref(new Set())
const deduction = ref('')
const deductionReason = ref('')
const generateResult = ref([])

// 初始化月份为下个月
function initMonth() {
  const now = new Date()
  const next = getNextMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  selectedMonth.value = next
}

// 已入住房间
const occupiedRooms = computed(() => {
  if (!selectedBuildingId.value) return []
  return db.getRoomsByBuilding(selectedBuildingId.value)
    .filter(r => r.status === '已入住')
})

const isAllChecked = computed(() => {
  return occupiedRooms.value.length > 0 && checkedRooms.value.size === occupiedRooms.value.length
})

function onMonthChange(e) {
  selectedMonth.value = e.detail.value
}

function selectBuilding(id) {
  selectedBuildingId.value = id
  checkedRooms.value = new Set()
  generateResult.value = []
}

function toggleRoom(roomId) {
  const newSet = new Set(checkedRooms.value)
  if (newSet.has(roomId)) {
    newSet.delete(roomId)
  } else {
    newSet.add(roomId)
  }
  checkedRooms.value = newSet
  generateResult.value = []
}

function toggleAll() {
  if (isAllChecked.value) {
    checkedRooms.value = new Set()
  } else {
    checkedRooms.value = new Set(occupiedRooms.value.map(r => r.id))
  }
  generateResult.value = []
}

function tenantName(tenantId) {
  const t = db.getTenantById(tenantId)
  return t ? t.name : ''
}

function getContractRent(roomId) {
  const room = db.getRoomById(roomId)
  if (!room || !room.currentContractId) return room ? room.baseRent : 0
  const contract = db.getContractById(room.currentContractId)
  return contract ? contract.rentAmount : (room.baseRent || 0)
}

function doGenerate() {
  if (checkedRooms.value.size === 0) {
    uni.showToast({ title: '请选择房间', icon: 'none' })
    return
  }

  const options = {}
  if (deduction.value && Number(deduction.value) > 0) {
    options.deduction = Number(deduction.value)
    options.deductionReason = deductionReason.value || ''
  }

  const roomIds = Array.from(checkedRooms.value)
  const rooms = db.getRooms()
  const results = db.batchGenerateBills(roomIds, selectedMonth.value, options)

  // 构建含完整费用明细的结果
  generateResult.value = results.map((r, i) => {
    const room = rooms.find(rm => rm.id === roomIds[i]) || {}
    return {
      ...r,
      roomId: r.roomId || roomIds[i],
      billId: r.id || '',
      roomLabel: `${room.floor || ''}-${room.roomNumber || ''}`,
      tenantName: getTenantNameForRoom(room.currentTenantId),
      buildingName: getBuildingName(room.buildingId)
    }
  })

  const successCount = results.filter(r => !r.error).length
  const failCount = results.filter(r => r.error).length

  if (successCount > 0) {
    uni.showToast({ title: `成功生成${successCount}笔账单`, icon: 'success' })
    // 自动备份 + 邮件发送
    autoBackupAndEmail(successCount)
  }
  if (failCount > 0) {
    uni.showToast({ title: `${failCount}笔生成失败`, icon: 'none' })
  }
}

// 格式化金额（安全处理）
function formatAmt(val) {
  const n = Number(val) || 0
  return n.toFixed(2)
}

// 获取租客名称
function getTenantNameForRoom(tenantId) {
  if (!tenantId) return ''
  const t = db.getTenantById(tenantId)
  return t ? t.name : ''
}

// 获取楼栋名称
function getBuildingName(buildingId) {
  if (!buildingId) return ''
  const b = db.getBuildings().find(bd => bd.id === buildingId)
  return b ? b.name : ''
}

// 点击跳转账单详情
function goDetail(result) {
  if (!result.billId || result.error) return
  uni.navigateTo({
    url: `/pages/bill/detail?id=${result.billId}`
  })
}

// 导出Excel
function doExport() {
  const successResults = generateResult.value.filter(r => !r.error)
  if (successResults.length === 0) {
    uni.showToast({ title: '没有可导出的账单', icon: 'none' })
    return
  }

  const buildingName = selectedBuildingId.value
    ? (db.getBuildings().find(b => b.id === selectedBuildingId.value)?.name || '')
    : ''

  exportBillsToExcel(successResults, selectedMonth.value, buildingName, db)
}

// 自动备份 + 邮件发送
async function autoBackupAndEmail(successCount) {
  console.log('========================================')
  console.log('[自动备份] ====== 触发自动备份流程 ======')
  console.log('[自动备份] 生成账单数:', successCount)

  try {
    // 1. 导出全部数据
    const data = db.exportAllData()
    console.log('[自动备份] 数据已导出，包含键:', Object.keys(data).join(', '))

    // 2. 保存本地文件
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const fileName = `房东通_自动备份_${dateStr}.json`
    const jsonStr = JSON.stringify(data, null, 2)
    console.log('[自动备份] 本地文件名:', fileName)
    console.log('[自动备份] JSON 大小:', jsonStr.length, 'bytes')

    // 写入本地文件（APP-PLUS）
    try {
      // #ifdef APP-PLUS
      console.log('[自动备份] APP-PLUS 模式，写入下载目录...')
      const downloadsPath = plus.io.convertLocalFileSystemURL('_downloads')
      console.log('[自动备份] 下载目录:', downloadsPath)

      await new Promise((resolve, reject) => {
        plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
          fs.root.getFile(fileName, { create: true }, (fileEntry) => {
            fileEntry.createWriter((writer) => {
              writer.onwrite = () => {
                console.log('[自动备份] ✅ 本地文件已保存')
                resolve()
              }
              writer.onerror = (e) => {
                console.error('[自动备份] 本地文件写入失败:', JSON.stringify(e))
                reject(e)
              }
              writer.write(jsonStr)
            }, reject)
          }, reject)
        }, reject)
      })
      // #endif

      // #ifndef APP-PLUS
      console.log('[自动备份] H5 模式，下载文件...')
      try {
        const blob = new Blob(['\uFEFF' + jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
        console.log('[自动备份] ✅ 本地文件已下载:', fileName)
      } catch (h5Err) {
        console.warn('[自动备份] H5 下载失败:', h5Err)
      }
      // #endif
    } catch (fileErr) {
      console.error('[自动备份] 本地保存失败:', fileErr)
    }

    // 3. 发送邮件备份
    const settings = db.getSettings()
    const backupEmail = settings.backupEmail || 'xufc2019@dingtalk.com'
    const apiKey = settings.resendApiKey || ''
    console.log('[自动备份] 准备发送邮件到:', backupEmail, ', API Key 长度:', apiKey.length)

    const result = await sendBackupEmail(backupEmail, apiKey, data, fileName)
    console.log('[自动备份] 邮件发送结果:', JSON.stringify(result))

    if (result.success) {
      // 更新上次备份时间
      db.updateSettings({ lastBackupAt: now.toISOString() })
      console.log('[自动备份] ✅ 备份时间已更新')
      uni.showToast({ title: '备份邮件已发送', icon: 'none', duration: 2000 })
    } else {
      console.warn('[自动备份] ⚠️ 邮件发送失败:', result.message)
      uni.showToast({ title: '本地已备份，邮件发送失败', icon: 'none', duration: 3000 })
    }

  } catch (err) {
    console.error('[自动备份] ❌ 备份流程异常:', err)
    uni.showToast({ title: '自动备份失败', icon: 'none' })
  } finally {
    console.log('[自动备份] ====== 备份流程结束 ======')
    console.log('========================================')
  }
}

// 初始化
buildings.value = db.getBuildings()
initMonth()
if (buildings.value.length > 0) {
  selectedBuildingId.value = buildings.value[0].id
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  padding-bottom: 100px;
  background-color: #f5f5f5;
}

.form-label {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 10px;
}

.picker-value {
  font-size: 18px;
  font-weight: 700;
  color: #007AFF;
  padding: 10px 0;
}

.building-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.building-item {
  padding: 10px 20px;
  border-radius: 8px;
  background-color: #f5f5f5;
  border: 2px solid transparent;
}

.building-item.active {
  border-color: #007AFF;
  background-color: #E3F2FD;
}

.building-name {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.building-item.active .building-name {
  color: #007AFF;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.check-all {
  padding: 6px 12px;
}

.check-text {
  font-size: 14px;
  color: #007AFF;
  font-weight: 600;
}

.room-list {
  margin-top: 4px;
}

.room-check-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.room-check-item:last-child {
  border-bottom: none;
}

.checkbox {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid #cccccc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.checkbox.checked {
  background-color: #007AFF;
  border-color: #007AFF;
}

.check-icon {
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-label {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  display: block;
}

.room-tenant {
  font-size: 13px;
  color: #999999;
  display: block;
  margin-top: 2px;
}

.room-rent {
  font-size: 15px;
  font-weight: 600;
  color: #007AFF;
  margin-left: 12px;
}

.input-big {
  height: 48px;
  font-size: 18px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  padding: 0 12px;
  background-color: #ffffff;
}

.empty-hint {
  font-size: 14px;
  color: #999999;
  display: block;
  text-align: center;
  padding: 16px 0;
}

.result-card {
  border-left: 4px solid #34C759;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-summary {
  font-size: 13px;
  color: #999999;
}

/* ===== 费用明细卡片 ===== */
.bill-card {
  background-color: #fafafa;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid #e8e8e8;
  transition: background-color 0.15s;
}
.bill-card:active {
  background-color: #f0f0f0;
}

.bill-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bill-usage-month {
  font-size: 12px;
  color: #999999;
  margin-bottom: 8px;
}

.usage-month-label {
  color: #888888;
}

.usage-month-val {
  color: #007AFF;
  font-weight: 600;
}

.bill-room-name {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
}

.bill-total {
  font-size: 18px;
  font-weight: 800;
  color: #FF3B30;
}

.bill-fees-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.fee-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 100px;
  padding: 3px 0;
}

.fee-label {
  font-size: 13px;
  color: #888888;
}

.fee-val {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
}

.fee-zero {
  color: #cccccc !important;
}

.fee-green {
  color: #34C759 !important;
}

.fee-deduction .fee-label {
  color: #34C759;
}

.bill-card-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e0e0e0;
  text-align: right;
}

.bill-hint {
  font-size: 12px;
  color: #999999;
}

/* 错误卡片 */
.bill-error {
  padding: 4px 0;
}

.error-room {
  font-size: 15px;
  font-weight: 600;
  color: #666666;
}

.error-msg {
  font-size: 13px;
  color: #FF3B30;
  margin-left: 8px;
}

/* ===== 导出区域 ===== */
.export-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px dashed #e0e0e0;
}

.btn-export {
  background-color: #ffffff;
  color: #007AFF;
  border: 2px solid #007AFF;
  font-weight: 700;
}

.bottom-placeholder {
  height: 80px;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 16px 24px;
  background-color: #ffffff;
  border-top: 1px solid #eeeeee;
  z-index: 100;
}

.footer-bar .btn-big {
  width: 100%;
}
</style>
