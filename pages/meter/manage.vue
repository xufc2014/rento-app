<template>
  <view class="container">
    <!-- 筛选区域 -->
    <view class="filter-card">
      <view class="filter-row">
        <view class="filter-label">月份</view>
        <picker mode="date" fields="month" :value="filterMonthPick" @change="onMonthChange">
          <view class="filter-value">{{ filterMonthCN }}</view>
        </picker>
      </view>
      <view class="filter-row" v-if="buildings.length > 0">
        <view class="filter-label">楼栋</view>
        <picker mode="selector" :range="buildingOptions" @change="onBuildingChange">
          <view class="filter-value">{{ buildingOptions[filterBuildingIdx] || '全部' }}</view>
        </picker>
      </view>
      <view class="filter-stats">
        共 <text class="stats-num">{{ filteredReadings.length }}</text> 条记录
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="reading-list" v-if="filteredReadings.length > 0">
      <view
        v-for="(item, idx) in groupedReadings"
        :key="idx"
        class="room-group"
      >
        <!-- 房间头部 -->
        <view class="room-group-header">
          <view class="room-group-info">
            <text class="room-group-name">{{ item.roomLabel }}</text>
            <text class="room-group-tenant" v-if="item.tenantName">{{ item.tenantName }}</text>
          </view>
          <view class="room-group-status">
            <text class="status-dot water" v-if="item.hasWater">水</text>
            <text class="status-dot electric" v-if="item.hasElectric">电</text>
            <text class="status-dot gas" v-if="item.hasGas">气</text>
          </view>
        </view>

        <!-- 每条记录 -->
        <view
          v-for="reading in item.readings"
          :key="reading.id"
          class="reading-card"
          :class="'type-' + reading.meterType"
        >
          <view class="reading-top">
            <view class="reading-type-badge" :class="reading.meterType">
              {{ typeLabel(reading.meterType) }}
            </view>
            <view class="reading-date">{{ formatDate(reading.readingDate || reading.createdAt) }}</view>
            <view class="reading-edit" @click="openEdit(reading)">✏️ 修改</view>
          </view>

          <view class="reading-body">
            <view class="reading-value-row">
              <text class="reading-value">{{ reading.readingValue }}</text>
              <text class="reading-unit">{{ unitLabel(reading.meterType) }}</text>
            </view>
            <view class="reading-meta" v-if="reading.previousValue > 0">
              <text class="meta-text">上次 {{ reading.previousValue }}{{ unitLabel(reading.meterType) }}</text>
              <text class="meta-arrow">→</text>
              <text class="meta-text">用量 {{ reading.consumption }}{{ unitLabel(reading.meterType) }}</text>
            </view>
          </view>

          <view class="reading-footer" v-if="reading.notes">
            <text class="reading-notes">📝 {{ reading.notes }}</text>
          </view>

          <view class="reading-footer" v-if="reading.isAnomaly">
            <text class="reading-anomaly">⚠️ {{ reading.anomalyType || '异常' }}</text>
          </view>

          <view class="reading-photo-row" v-if="reading.photoPath" @click="previewPhoto(reading.photoPath)">
            <image class="reading-photo-thumb" :src="reading.photoPath" mode="aspectFill" />
            <text class="reading-photo-label">点击查看表盘照片</text>
          </view>
        </view>
      </view>
    </view>

    <view class="empty-tip" v-else>
      <text class="empty-icon">📋</text>
      <text class="empty-text">该月份暂无抄表记录</text>
    </view>

    <!-- 编辑弹窗 -->
    <view class="modal-overlay" v-if="showEditModal" @click="closeEdit">
      <view class="modal-content" @click.stop>
        <view class="modal-title">修改抄表记录</view>

        <view class="edit-info">
          <text class="edit-label">{{ editingRoomLabel }}</text>
          <text class="edit-type">{{ typeLabel(editingReading.meterType) }}</text>
        </view>

        <view class="edit-field">
          <view class="edit-field-label">
            读数（{{ unitLabel(editingReading.meterType) }}）
          </view>
          <input
            class="edit-input"
            type="digit"
            v-model="editValue"
            placeholder="输入正确的读数"
          />
        </view>

        <view class="edit-field">
          <view class="edit-field-label">备注</view>
          <textarea
            class="edit-textarea"
            v-model="editNotes"
            placeholder="备注说明（可选）"
          />
        </view>

        <view class="edit-warning">
          ⚠️ 修改后会自动重算用量，并同步更新后续月份的基准读数
        </view>

        <view class="modal-actions">
          <button class="btn-secondary" @click="closeEdit">取消</button>
          <button class="btn-primary" :disabled="!editValue" @click="confirmEdit">确认修改</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import db from '@/utils/db.js'
import { formatDate } from '@/utils/date.js'

// ========== 筛选状态 ==========
const filterMonthPick = ref('')
const filterMonthCN = computed(() => {
  if (!filterMonthPick.value) return '请选择月份'
  const parts = filterMonthPick.value.split('-')
  const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return `${parts[0]}年${months[Number(parts[1]) - 1]}月`
})

const buildings = ref([])
const rooms = ref([])
const filterBuildingIdx = ref(0)
const buildingOptions = computed(() => ['全部', ...buildings.value.map(b => b.name)])

function onMonthChange(e) {
  filterMonthPick.value = e.detail.value
}

function onBuildingChange(e) {
  filterBuildingIdx.value = Number(e.detail.value)
}

// ========== 数据加载 ==========
onMounted(() => {
  buildings.value = db.getBuildings()
  rooms.value = db.getRooms()
  // 默认选中上个月
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  filterMonthPick.value = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
})

// ========== 筛选后的记录 ==========
const allReadings = computed(() => db.getMeterReadings())

const filteredReadings = computed(() => {
  const month = filterMonthPick.value
  let list = allReadings.value.filter(r => r.usageMonth === month)

  // 按楼栋筛选
  if (filterBuildingIdx.value > 0) {
    const buildingId = buildings.value[filterBuildingIdx.value - 1]?.id
    if (buildingId) {
      const buildingRoomIds = new Set(
        rooms.value.filter(r => r.buildingId === buildingId).map(r => r.id)
      )
      list = list.filter(r => buildingRoomIds.has(r.roomId))
    }
  }

  // 按日期倒序
  list.sort((a, b) => new Date(b.readingDate || b.createdAt) - new Date(a.readingDate || a.createdAt))
  return list
})

// 按房间分组
const groupedReadings = computed(() => {
  const map = {}
  for (const r of filteredReadings.value) {
    if (!map[r.roomId]) {
      const room = db.getRoomById(r.roomId)
      if (!room) continue
      const building = db.getBuildingById(room.buildingId)
      const tenant = room.currentTenantId ? db.getTenantById(room.currentTenantId) : null
      map[r.roomId] = {
        roomId: r.roomId,
        roomLabel: building ? `${building.name} ${room.floor}F-${room.roomNumber}` : `${room.floor}F-${room.roomNumber}`,
        tenantName: tenant ? tenant.name : '',
        readings: [],
        hasWater: false,
        hasElectric: false,
        hasGas: false
      }
    }
    map[r.roomId].readings.push(r)
    if (r.meterType === 'water') map[r.roomId].hasWater = true
    if (r.meterType === 'electric') map[r.roomId].hasElectric = true
    if (r.meterType === 'gas') map[r.roomId].hasGas = true
  }
  return Object.values(map)
})

// ========== 工具函数 ==========
function typeLabel(type) {
  const map = { water: '💧 水表', electric: '⚡ 电表', gas: '🔥 气表' }
  return map[type] || type
}

function unitLabel(type) {
  const map = { water: '吨', electric: '度', gas: '方' }
  return map[type] || ''
}

// ========== 编辑弹窗 ==========
const showEditModal = ref(false)
const editingReading = ref({})
const editValue = ref('')
const editNotes = ref('')

const editingRoomLabel = computed(() => {
  const room = db.getRoomById(editingReading.value.roomId)
  if (!room) return ''
  const building = db.getBuildingById(room.buildingId)
  return building ? `${building.name} ${room.floor}F-${room.roomNumber}` : `${room.floor}F-${room.roomNumber}`
})

function openEdit(reading) {
  editingReading.value = reading
  editValue.value = String(reading.readingValue)
  editNotes.value = reading.notes || ''
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
  editingReading.value = {}
  editValue.value = ''
  editNotes.value = ''
}

function confirmEdit() {
  const val = parseFloat(editValue.value)
  if (isNaN(val) || val < 0) {
    uni.showToast({ title: '请输入有效的读数', icon: 'none' })
    return
  }

  db.updateMeterReading(editingReading.value.id, {
    readingValue: val,
    notes: editNotes.value
  })

  uni.showToast({ title: '修改成功', icon: 'success' })
  closeEdit()
}

function previewPhoto(photoPath) {
  uni.previewImage({
    urls: [photoPath],
    current: photoPath
  })
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #F5F5F5;
  min-height: 100vh;
}

/* ========== 筛选卡片 ========== */
.filter-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  margin-bottom: 20rpx;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}
.filter-row:last-of-type {
  border-bottom: none;
}

.filter-label {
  font-size: 28rpx;
  color: #666;
}

.filter-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #007AFF;
  padding: 8rpx 20rpx;
  background: #E6F7FF;
  border-radius: 8rpx;
}

.filter-stats {
  text-align: right;
  font-size: 24rpx;
  color: #999;
  margin-top: 12rpx;
}

.stats-num {
  color: #007AFF;
  font-weight: bold;
  font-size: 30rpx;
}

/* ========== 房间分组 ========== */
.reading-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.room-group {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.room-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #FAFAFA;
  border-bottom: 1rpx solid #F0F0F0;
}

.room-group-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.room-group-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.room-group-tenant {
  font-size: 24rpx;
  color: #007AFF;
}

.room-group-status {
  display: flex;
  gap: 8rpx;
}

.status-dot {
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  font-weight: bold;
}
.status-dot.water {
  background: #E6F7FF;
  color: #1890FF;
}
.status-dot.electric {
  background: #FFF7E6;
  color: #FAAD14;
}
.status-dot.gas {
  background: #F6FFED;
  color: #52C41A;
}

/* ========== 记录卡片 ========== */
.reading-card {
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #F5F5F5;
}
.reading-card:last-child {
  border-bottom: none;
}

.reading-card.type-water {
  border-left: 6rpx solid #1890FF;
}
.reading-card.type-electric {
  border-left: 6rpx solid #FAAD14;
}
.reading-card.type-gas {
  border-left: 6rpx solid #52C41A;
}

.reading-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.reading-type-badge {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: bold;
}
.reading-type-badge.water {
  background: #E6F7FF;
  color: #1890FF;
}
.reading-type-badge.electric {
  background: #FFF7E6;
  color: #FAAD14;
}
.reading-type-badge.gas {
  background: #F6FFED;
  color: #52C41A;
}

.reading-date {
  flex: 1;
  font-size: 24rpx;
  color: #999;
}

.reading-edit {
  font-size: 24rpx;
  color: #007AFF;
  padding: 6rpx 16rpx;
  border: 2rpx solid #007AFF;
  border-radius: 8rpx;
}

.reading-body {
  margin-bottom: 8rpx;
}

.reading-value-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.reading-value {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
}

.reading-unit {
  font-size: 26rpx;
  color: #999;
}

.reading-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 6rpx;
}

.meta-text {
  font-size: 24rpx;
  color: #666;
}

.meta-arrow {
  font-size: 20rpx;
  color: #BBB;
}

.reading-footer {
  margin-top: 8rpx;
}

.reading-notes {
  font-size: 24rpx;
  color: #666;
}

.reading-anomaly {
  font-size: 24rpx;
  color: #FF4D4F;
  font-weight: 500;
}

.reading-photo-row {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid #f0f0f0;
}

.reading-photo-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  object-fit: cover;
  flex-shrink: 0;
}

.reading-photo-label {
  font-size: 24rpx;
  color: #007AFF;
  margin-left: 14rpx;
}

/* ========== 空状态 ========== */
.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  gap: 16rpx;
}

.empty-icon {
  font-size: 64rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* ========== 编辑弹窗 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  background: #fff;
  border-radius: 16rpx;
  width: 85%;
  max-width: 640rpx;
  padding: 40rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24rpx;
  color: #333;
}

.edit-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: #F5F5F5;
  border-radius: 10rpx;
  margin-bottom: 24rpx;
}

.edit-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.edit-type {
  font-size: 26rpx;
  color: #007AFF;
  font-weight: bold;
}

.edit-field {
  margin-bottom: 20rpx;
}

.edit-field-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.edit-input {
  height: 88rpx;
  font-size: 44rpx;
  text-align: center;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  background: #FAFAFA;
  padding: 0 20rpx;
  color: #333;
}

.edit-textarea {
  width: 100%;
  height: 120rpx;
  font-size: 28rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  background: #FAFAFA;
  padding: 20rpx;
  box-sizing: border-box;
}

.edit-warning {
  font-size: 24rpx;
  color: #FAAD14;
  text-align: center;
  padding: 16rpx;
  background: #FFFBE6;
  border-radius: 8rpx;
  margin-bottom: 24rpx;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  border: none;
}

.btn-primary {
  background: #007AFF;
  color: #fff;
}

.btn-primary[disabled] {
  background: #B0B0B0;
  color: #fff;
}

.btn-secondary {
  background: #F0F0F0;
  color: #333;
}
</style>
