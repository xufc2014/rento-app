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
          <text class="room-rent">{{ formatAmount(room.baseRent) }}/月</text>
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

    <!-- 生成结果摘要 -->
    <view class="card result-card" v-if="generateResult.length > 0">
      <view class="form-label">生成结果</view>
      <view class="result-item" v-for="(r, idx) in generateResult" :key="idx">
        <text class="result-room" v-if="r.roomLabel">{{ r.roomLabel }}</text>
        <text :class="r.error ? 'result-error' : 'result-success'">
          {{ r.error || `¥${r.totalAmount.toFixed(2)}` }}
        </text>
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

  generateResult.value = results.map((r, i) => {
    const room = rooms.find(rm => rm.id === roomIds[i]) || {}
    return {
      ...r,
      roomLabel: `${room.floor || ''}-${room.roomNumber || ''}`
    }
  })

  const successCount = results.filter(r => !r.error).length
  const failCount = results.filter(r => r.error).length

  if (successCount > 0) {
    uni.showToast({ title: `成功生成${successCount}笔账单`, icon: 'success' })
  }
  if (failCount > 0) {
    uni.showToast({ title: `${failCount}笔生成失败`, icon: 'none' })
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

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.result-item:last-child {
  border-bottom: none;
}

.result-room {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
}

.result-success {
  font-size: 15px;
  font-weight: 700;
  color: #34C759;
}

.result-error {
  font-size: 14px;
  color: #FF3B30;
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
