<template>
  <view class="container">
    <!-- 步骤1：选择房间 -->
    <view v-if="step === 1" class="step-panel">
      <view class="step-title">选择房间</view>

      <view class="select-section" v-if="buildings.length > 0">
        <view class="section-label">选择楼栋</view>
        <view class="option-grid">
          <view
            v-for="b in buildings"
            :key="b.id"
            class="option-btn"
            :class="{ active: selectedBuildingId === b.id }"
            @click="selectBuilding(b.id)"
          >
            {{ b.name }}
          </view>
        </view>
      </view>
      <view class="empty-tip" v-else>
        暂无楼栋，请先到设置中添加
      </view>

      <view class="select-section" v-if="selectedBuildingId && floors.length > 0">
        <view class="section-label">选择楼层</view>
        <view class="option-grid">
          <view
            v-for="f in floors"
            :key="f"
            class="option-btn"
            :class="{ active: selectedFloor === f }"
            @click="selectFloor(f)"
          >
            {{ f }}层
          </view>
        </view>
      </view>

      <view class="select-section" v-if="selectedFloor && roomsOnFloor.length > 0">
        <view class="section-label">选择房号</view>
        <view class="option-grid">
          <view
            v-for="r in roomsOnFloor"
            :key="r.id"
            class="option-btn"
            :class="{ active: selectedRoomId === r.id }"
            @click="selectRoom(r.id)"
          >
            {{ r.roomNumber }}
          </view>
        </view>
      </view>

      <view class="action-bar">
        <button class="btn-primary" :disabled="!selectedRoomId" @click="nextStep">下一步</button>
      </view>
    </view>

    <!-- 步骤2：选择抄表类型 -->
    <view v-if="step === 2" class="step-panel">
      <view class="step-title">选择抄表类型</view>
      <view class="room-info">{{ selectedRoomInfo }}</view>

      <view class="meter-type-grid">
        <view
          class="meter-type-btn water"
          :class="{ active: meterType === 'water' }"
          @click="selectMeterType('water')"
        >
          <view class="type-icon">💧</view>
          <view class="type-name">水表</view>
          <view class="type-unit">单位：吨</view>
        </view>
        <view
          class="meter-type-btn electric"
          :class="{ active: meterType === 'electric' }"
          @click="selectMeterType('electric')"
        >
          <view class="type-icon">⚡</view>
          <view class="type-name">电表</view>
          <view class="type-unit">单位：度</view>
        </view>
      </view>

      <view class="action-bar">
        <button class="btn-secondary" @click="prevStep">上一步</button>
        <button class="btn-primary" :disabled="!meterType" @click="nextStep">下一步</button>
      </view>
    </view>

    <!-- 步骤3：录入读数 -->
    <view v-if="step === 3" class="step-panel">
      <view class="step-title">录入本次读数</view>
      <view class="room-info">{{ selectedRoomInfo }} - {{ meterTypeLabel }}</view>

      <!-- 上次读数大字 -->
      <view class="last-reading-box">
        <view class="last-reading-label">上次读数</view>
        <view class="last-reading-value">
          {{ lastReadingValue !== null ? lastReadingValue : '无记录' }} {{ unitLabel }}
        </view>
        <view class="last-reading-date" v-if="lastReadingDate">
          抄表日期：{{ formatDateCN(lastReadingDate) }}
        </view>
      </view>

      <!-- 输入本次读数 -->
      <view class="input-section">
        <view class="section-label">本次读数</view>
        <input
          class="reading-input"
          type="digit"
          v-model="readingValueInput"
          :placeholder="`请输入本次${unitLabel}`"
          @input="onReadingInput"
        />
      </view>

      <!-- 实时信息卡片 -->
      <view class="info-cards" v-if="consumption !== null && consumption >= 0">
        <view class="info-card">
          <view class="info-label">本次用量</view>
          <view class="info-value">{{ consumption }} {{ unitLabel }}</view>
        </view>
        <view class="info-card">
          <view class="info-label">预估费用</view>
          <view class="info-value">{{ estimatedCost }}</view>
        </view>
      </view>
      <view class="info-cards" v-if="consumption !== null && consumption < 0">
        <view class="info-card warning">
          <view class="info-label">读数倒退</view>
          <view class="info-value">本次读数小于上次读数</view>
        </view>
      </view>

      <!-- 拍照 -->
      <view class="photo-section">
        <view class="section-label">表底拍照留痕</view>
        <view class="photo-btn" @click="takePhoto" v-if="!photoPath">
          <view class="photo-icon">📷</view>
          <view class="photo-text">点击拍照</view>
        </view>
        <view class="photo-preview" v-if="photoPath" @click="showPhotoPreview">
          <image class="photo-image" :src="photoPath" mode="aspectFill" />
          <view class="watermark-overlay">
            <view class="watermark-text">{{ watermarkText }}</view>
          </view>
        </view>
        <view class="photo-remove" v-if="photoPath" @click.stop="removePhoto">删除重拍</view>
      </view>

      <!-- 备注 -->
      <view class="input-section">
        <view class="section-label">备注（可选）</view>
        <textarea class="notes-input" v-model="notes" placeholder="如有异常说明请在此填写" />
      </view>

      <view class="action-bar">
        <button class="btn-secondary" @click="prevStep">上一步</button>
        <button class="btn-primary" :disabled="!canSubmit" @click="submitReading">提交</button>
      </view>
    </view>

    <!-- 异常弹窗 -->
    <view class="modal-overlay" v-if="showAnomalyModal" @click.stop>
      <view class="modal-content">
        <view class="modal-title" :class="anomalyTypeClass">{{ anomalyModalTitle }}</view>
        <view class="modal-body">
          <text>{{ anomalyModalMessage }}</text>
        </view>
        <view class="modal-actions">
          <button class="btn-secondary" @click="closeAnomalyModal">返回修改</button>
          <button class="btn-danger" @click="forceConfirm">强制确认</button>
        </view>
      </view>
    </view>

    <!-- 照片查看弹窗 -->
    <view class="modal-overlay" v-if="showPhotoModal" @click="showPhotoModal = false">
      <view class="photo-modal-content">
        <image class="photo-modal-image" :src="photoPath" mode="aspectFit" />
        <view class="watermark-overlay large">
          <view class="watermark-text">{{ watermarkText }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import db from '@/utils/db.js'
import { formatDateCN } from '@/utils/date.js'
import { formatAmount } from '@/utils/calc.js'

// ========== 步骤控制 ==========
const step = ref(1)

function nextStep() {
  if (step.value < 3) step.value++
}
function prevStep() {
  if (step.value > 1) step.value--
}

// ========== 数据加载 ==========
const buildings = ref([])
const rooms = ref([])
const settings = ref({})

onMounted(() => {
  buildings.value = db.getBuildings()
  rooms.value = db.getRooms()
  settings.value = db.getSettings()
})

// ========== 房间选择 ==========
const selectedBuildingId = ref('')
const selectedFloor = ref('')
const selectedRoomId = ref('')

const floors = computed(() => {
  if (!selectedBuildingId.value) return []
  const set = new Set(
    rooms.value
      .filter(r => r.buildingId === selectedBuildingId.value)
      .map(r => r.floor)
  )
  return Array.from(set).sort((a, b) => a - b)
})

const roomsOnFloor = computed(() => {
  if (!selectedBuildingId.value || selectedFloor.value === '') return []
  return rooms.value
    .filter(r => r.buildingId === selectedBuildingId.value && r.floor === selectedFloor.value)
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'zh-CN'))
})

const selectedRoom = computed(() => {
  return rooms.value.find(r => r.id === selectedRoomId.value) || null
})

const selectedRoomInfo = computed(() => {
  if (!selectedRoom.value) return ''
  const building = buildings.value.find(b => b.id === selectedRoom.value.buildingId)
  const bName = building ? building.name : ''
  return `${bName} ${selectedRoom.value.floor}层 ${selectedRoom.value.roomNumber}`
})

function selectBuilding(id) {
  selectedBuildingId.value = id
  selectedFloor.value = ''
  selectedRoomId.value = ''
}

function selectFloor(floor) {
  selectedFloor.value = floor
  selectedRoomId.value = ''
}

function selectRoom(id) {
  selectedRoomId.value = id
}

// ========== 抄表类型选择 ==========
const meterType = ref('')

const meterTypeLabel = computed(() => {
  return meterType.value === 'water' ? '水表' : meterType.value === 'electric' ? '电表' : ''
})

const unitLabel = computed(() => {
  return meterType.value === 'water' ? '吨' : meterType.value === 'electric' ? '度' : ''
})

function selectMeterType(type) {
  meterType.value = type
  loadLatestReading()
}

// ========== 上次读数 ==========
const lastReading = ref(null)
const lastReadingValue = computed(() => {
  return lastReading.value ? lastReading.value.readingValue : null
})
const lastReadingDate = computed(() => {
  return lastReading.value ? lastReading.value.readingDate : null
})

function loadLatestReading() {
  if (!selectedRoomId.value || !meterType.value) return
  lastReading.value = db.getLatestReading(selectedRoomId.value, meterType.value)
}

// ========== 本次读数输入与计算 ==========
const readingValueInput = ref('')
const notes = ref('')
const photoPath = ref('')

const readingValue = computed(() => {
  const val = parseFloat(readingValueInput.value)
  return isNaN(val) ? null : val
})

const consumption = computed(() => {
  if (readingValue.value === null || lastReadingValue.value === null) return null
  return Math.round((readingValue.value - lastReadingValue.value) * 100) / 100
})

const estimatedCost = computed(() => {
  if (consumption.value === null || consumption.value < 0) return ''
  if (!selectedRoomId.value) return ''
  const rate = db.getRoomRate(selectedRoomId.value, meterType.value)
  const cost = Math.round(consumption.value * rate * 100) / 100
  return formatAmount(cost)
})

const canSubmit = computed(() => {
  return readingValue.value !== null && readingValue.value >= 0 && photoPath.value !== ''
})

function onReadingInput() {
  // 输入时实时计算，无需额外操作
}

// ========== 拍照 ==========
const watermarkText = computed(() => {
  const room = selectedRoom.value
  const roomText = room ? `${room.floor}层${room.roomNumber}` : ''
  const dateText = formatDateCN(new Date().toISOString())
  const readingText = readingValue.value !== null ? readingValue.value : ''
  return `${dateText} ${roomText} ${meterTypeLabel.value} ${readingText}${unitLabel.value}`
})

const showPhotoModal = ref(false)

function takePhoto() {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success: (res) => {
      photoPath.value = res.tempFilePaths[0]
    },
    fail: () => {
      uni.showToast({ title: '拍照失败', icon: 'none' })
    }
  })
}

function removePhoto() {
  photoPath.value = ''
}

function showPhotoPreview() {
  showPhotoModal.value = true
}

// ========== 异常检测与提交 ==========
const showAnomalyModal = ref(false)
const anomalyModalTitle = ref('')
const anomalyModalMessage = ref('')
const anomalyTypeClass = ref('')
let pendingForceConfirm = false

function getMaxHistoricalConsumption() {
  const allReadings = db.getMeterReadingsByRoom(selectedRoomId.value)
    .filter(r => r.meterType === meterType.value)
  if (allReadings.length === 0) return 0
  return Math.max(...allReadings.map(r => r.consumption || 0))
}

function checkAnomaly() {
  if (readingValue.value === null || lastReadingValue.value === null) return false

  const currentValue = readingValue.value
  const prevValue = lastReadingValue.value
  const cons = currentValue - prevValue

  // 读数倒退
  if (currentValue < prevValue && prevValue > 0) {
    anomalyModalTitle.value = '读数倒退！'
    anomalyTypeClass.value = 'danger'
    anomalyModalMessage.value = `上次${prevValue}${unitLabel.value}，本次${currentValue}${unitLabel.value}，请检查是否输错！`
    return true
  }

  // 用量异常偏高（超过历史峰值3倍）
  const maxConsumption = getMaxHistoricalConsumption()
  if (maxConsumption > 0 && cons > maxConsumption * 3) {
    anomalyModalTitle.value = '用量异常偏高！'
    anomalyTypeClass.value = 'danger'
    anomalyModalMessage.value = `本次用量${cons}${unitLabel.value}，历史最高${maxConsumption}${unitLabel.value}，请确认！`
    return true
  }

  return false
}

function submitReading() {
  if (!canSubmit.value) return

  // 如果已经强制确认过，直接提交
  if (!pendingForceConfirm) {
    const isAnomaly = checkAnomaly()
    if (isAnomaly) {
      showAnomalyModal.value = true
      return
    }
  }

  doSubmit()
}

function doSubmit() {
  const reading = {
    roomId: selectedRoomId.value,
    meterType: meterType.value,
    readingValue: readingValue.value,
    forceConfirm: pendingForceConfirm,
    photoPath: photoPath.value,
    readingDate: new Date().toISOString(),
    notes: notes.value
  }

  const result = db.addMeterReading(reading)

  if (result.isAnomaly && !result.isAnomalyConfirmed) {
    // 理论上不会走到这里，因为前面已经拦截了
    uni.showToast({ title: '数据异常，请重新检查', icon: 'none' })
    return
  }

  uni.showToast({ title: '抄表成功', icon: 'success' })

  // 重置状态，返回第一步或留在本页继续录入
  setTimeout(() => {
    resetForm()
  }, 1500)
}

function closeAnomalyModal() {
  showAnomalyModal.value = false
  pendingForceConfirm = false
}

function forceConfirm() {
  showAnomalyModal.value = false
  pendingForceConfirm = true
  doSubmit()
}

function resetForm() {
  step.value = 1
  selectedBuildingId.value = ''
  selectedFloor.value = ''
  selectedRoomId.value = ''
  meterType.value = ''
  readingValueInput.value = ''
  notes.value = ''
  photoPath.value = ''
  lastReading.value = null
  pendingForceConfirm = false
  showAnomalyModal.value = false
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #F5F5F5;
  min-height: 100vh;
}

.step-panel {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.step-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  text-align: center;
}

.section-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.select-section {
  margin-bottom: 30rpx;
}

.option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.option-btn {
  padding: 20rpx 30rpx;
  background: #F0F0F0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  text-align: center;
  min-width: 120rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.option-btn.active {
  background: #007AFF;
  color: #fff;
  border-color: #007AFF;
}

.empty-tip {
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 40rpx 0;
}

.room-info {
  text-align: center;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 30rpx;
}

/* 抄表类型 */
.meter-type-grid {
  display: flex;
  gap: 30rpx;
  justify-content: center;
  margin-bottom: 40rpx;
}

.meter-type-btn {
  flex: 1;
  max-width: 300rpx;
  padding: 40rpx 20rpx;
  border-radius: 16rpx;
  text-align: center;
  background: #F0F0F0;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.meter-type-btn.water.active {
  background: #E6F7FF;
  border-color: #1890FF;
}

.meter-type-btn.electric.active {
  background: #FFF7E6;
  border-color: #FAAD14;
}

.type-icon {
  font-size: 60rpx;
  margin-bottom: 10rpx;
}

.type-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.type-unit {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}

/* 上次读数 */
.last-reading-box {
  background: #F5F5F5;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
  margin-bottom: 30rpx;
}

.last-reading-label {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.last-reading-value {
  font-size: 56rpx;
  font-weight: bold;
  color: #666;
}

.last-reading-date {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

/* 输入 */
.input-section {
  margin-bottom: 30rpx;
}

.reading-input {
  height: 100rpx;
  font-size: 48rpx;
  text-align: center;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  background: #FAFAFA;
  padding: 0 20rpx;
  color: #333;
}

.notes-input {
  width: 100%;
  height: 140rpx;
  font-size: 28rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  background: #FAFAFA;
  padding: 20rpx;
  box-sizing: border-box;
}

/* 信息卡片 */
.info-cards {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.info-card {
  flex: 1;
  background: #F0F7FF;
  border-radius: 12rpx;
  padding: 24rpx;
  text-align: center;
}

.info-card.warning {
  background: #FFF1F0;
  flex: 2;
}

.info-label {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.info-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #007AFF;
}

.info-card.warning .info-value {
  color: #FF4D4F;
  font-size: 28rpx;
}

/* 拍照 */
.photo-section {
  margin-bottom: 30rpx;
}

.photo-btn {
  height: 200rpx;
  border: 2rpx dashed #CCC;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FAFAFA;
}

.photo-icon {
  font-size: 60rpx;
  margin-bottom: 10rpx;
}

.photo-text {
  font-size: 28rpx;
  color: #999;
}

.photo-preview {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.watermark-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  padding: 8rpx 12rpx;
}

.watermark-overlay.large {
  padding: 20rpx;
  background: rgba(0, 0, 0, 0.6);
  bottom: 0;
  top: auto;
  text-align: center;
}

.watermark-text {
  font-size: 20rpx;
  color: #fff;
  line-height: 1.4;
  word-break: break-all;
}

.watermark-overlay.large .watermark-text {
  font-size: 28rpx;
}

.photo-remove {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #FF4D4F;
  text-align: center;
}

/* 按钮 */
.action-bar {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.btn-primary,
.btn-secondary,
.btn-danger {
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

.btn-danger {
  background: #FF4D4F;
  color: #fff;
}

/* 弹窗 */
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
  width: 80%;
  max-width: 600rpx;
  padding: 40rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20rpx;
}

.modal-title.danger {
  color: #FF4D4F;
}

.modal-body {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 30rpx;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
}

.photo-modal-content {
  position: relative;
  width: 90%;
  height: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-modal-image {
  width: 100%;
  height: 100%;
}
</style>
