<template>
  <view class="container">
    <!-- 楼栋楼层选择（持久化，提交后不重置） -->
    <view class="location-card">
      <view class="select-row" v-if="buildings.length > 0">
        <view class="select-label">楼栋</view>
        <scroll-view scroll-x class="option-scroll">
          <view class="option-list">
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
        </scroll-view>
      </view>

      <view class="select-row" v-if="selectedBuildingId && floors.length > 0">
        <view class="select-label">楼层</view>
        <scroll-view scroll-x class="option-scroll">
          <view class="option-list">
            <view
              v-for="f in floors"
              :key="f"
              class="option-btn"
              :class="{ active: selectedFloor === f, done: isFloorDone(f) }"
              @click="selectFloor(f)"
            >
              {{ f }}F
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="empty-tip" v-if="buildings.length === 0">
        暂无楼栋，请先到设置中添加
      </view>
    </view>

    <!-- 房间列表（选中楼栋+楼层后显示） -->
    <view v-if="selectedBuildingId && selectedFloor !== ''" class="room-list">
      <view class="room-list-header">
        <text class="room-list-title">{{ currentBuildingName }} {{ selectedFloor }}F</text>
        <text class="room-list-count">共 {{ roomsOnFloor.length }} 间</text>
      </view>

      <!-- 逐间录入 -->
      <view
        v-for="room in roomsOnFloor"
        :key="room.id"
        class="room-card"
        :class="{ active: selectedRoomId === room.id, saved: savedRoomIds.has(room.id) }"
        @click="selectRoom(room.id)"
      >
        <!-- 房间头部 -->
        <view class="room-header">
          <view class="room-number">{{ room.roomNumber }}</view>
          <view class="room-type-tag">{{ room.unitType || '民房' }}</view>
          <view v-if="savedRoomIds.has(room.id)" class="saved-badge">已抄</view>
          <view v-if="selectedRoomId === room.id" class="editing-badge">录入中</view>
        </view>

        <!-- 展开录入区域 -->
        <view v-if="selectedRoomId === room.id" class="room-input-area" @click.stop>

          <!-- ===== 水表 ===== -->
          <view class="meter-section water-section">
            <view class="meter-header">
              <text class="meter-title">💧 水表</text>
              <text class="meter-unit">单位：吨</text>
            </view>
            <view class="last-reading-mini">
              上次读数：<text class="last-val">{{ waterLastReading !== null ? waterLastReading : '无记录' }}</text>
              <text v-if="waterLastDate" class="last-date">{{ formatDateCN(waterLastDate) }}</text>
            </view>
            <input
              class="reading-input"
              type="digit"
              v-model="waterInput"
              placeholder="输入本次水表读数"
              @input="onWaterInput"
            />
            <view class="meter-info" v-if="waterConsumption !== null && waterConsumption >= 0">
              <text class="meter-consumption">用量 {{ waterConsumption }} 吨</text>
              <text class="meter-cost">≈ {{ waterEstimatedCost }}</text>
            </view>
            <view class="meter-warning" v-if="waterConsumption !== null && waterConsumption < 0">
              ⚠️ 读数倒退，请检查
            </view>
          </view>

          <!-- ===== 电表 ===== -->
          <view class="meter-section electric-section">
            <view class="meter-header">
              <text class="meter-title">⚡ 电表</text>
              <text class="meter-unit">单位：度</text>
            </view>
            <view class="last-reading-mini">
              上次读数：<text class="last-val">{{ electricLastReading !== null ? electricLastReading : '无记录' }}</text>
              <text v-if="electricLastDate" class="last-date">{{ formatDateCN(electricLastDate) }}</text>
            </view>
            <input
              class="reading-input"
              type="digit"
              v-model="electricInput"
              placeholder="输入本次电表读数"
              @input="onElectricInput"
            />
            <view class="meter-info" v-if="electricConsumption !== null && electricConsumption >= 0">
              <text class="meter-consumption">用量 {{ electricConsumption }} 度</text>
              <text class="meter-cost">≈ {{ electricEstimatedCost }}</text>
            </view>
            <view class="meter-warning" v-if="electricConsumption !== null && electricConsumption < 0">
              ⚠️ 读数倒退，请检查
            </view>
          </view>

          <!-- 拍照（可选） -->
          <view class="photo-section">
            <view class="section-label">表底拍照（可选）</view>
            <view class="photo-row">
              <view class="photo-btn-mini" @click="takePhoto('water')">
                💧 水表
              </view>
              <view class="photo-btn-mini" @click="takePhoto('electric')">
                ⚡ 电表
              </view>
            </view>
            <view class="photo-preview-row" v-if="waterPhotoPath || electricPhotoPath">
              <view class="photo-thumb-wrap" v-if="waterPhotoPath" @click="previewPhoto(waterPhotoPath)">
                <image class="photo-thumb" :src="waterPhotoPath" mode="aspectFill" />
                <view class="photo-thumb-label">💧</view>
                <view class="photo-remove" @click.stop="waterPhotoPath = ''">✕</view>
              </view>
              <view class="photo-thumb-wrap" v-if="electricPhotoPath" @click="previewPhoto(electricPhotoPath)">
                <image class="photo-thumb" :src="electricPhotoPath" mode="aspectFill" />
                <view class="photo-thumb-label">⚡</view>
                <view class="photo-remove" @click.stop="electricPhotoPath = ''">✕</view>
              </view>
            </view>
          </view>

          <!-- 备注 -->
          <view class="input-section">
            <view class="section-label">备注（可选）</view>
            <textarea class="notes-input" v-model="notes" placeholder="如有异常说明请在此填写" />
          </view>

          <!-- 保存按钮 -->
          <view class="action-bar">
            <button class="btn-primary" :disabled="!canSubmit" @click="submitReadings">
              {{ canSubmit ? '保存抄表数据' : '请至少填写一项读数' }}
            </button>
          </view>
        </view>
      </view>

      <view class="empty-tip" v-if="roomsOnFloor.length === 0">
        该楼层暂无房间
      </view>
    </view>

    <!-- 异常弹窗 -->
    <view class="modal-overlay" v-if="showAnomalyModal" @click.stop>
      <view class="modal-content">
        <view class="modal-title danger">{{ anomalyModalTitle }}</view>
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
        <image class="photo-modal-image" :src="previewPhotoPath" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import db from '@/utils/db.js'
import { formatDateCN } from '@/utils/date.js'
import { formatAmount } from '@/utils/calc.js'

// ========== 数据加载 ==========
const buildings = ref([])
const rooms = ref([])
const settings = ref({})

onMounted(() => {
  buildings.value = db.getBuildings()
  rooms.value = db.getRooms()
  settings.value = db.getSettings()
})

// ========== 楼栋/楼层选择（持久化） ==========
const selectedBuildingId = ref('')
const selectedFloor = ref('')
const selectedRoomId = ref('')

const currentBuildingName = computed(() => {
  const b = buildings.value.find(b => b.id === selectedBuildingId.value)
  return b ? b.name : ''
})

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

function selectBuilding(id) {
  selectedBuildingId.value = id
  selectedFloor.value = ''
  selectedRoomId.value = ''
  clearInputs()
}

function selectFloor(floor) {
  selectedFloor.value = floor
  selectedRoomId.value = ''
  clearInputs()
  // 自动选中第一个未抄的房间
  const firstUnsaved = roomsOnFloor.value.find(r => !savedRoomIds.value.has(r.id))
  if (firstUnsaved) {
    selectedRoomId.value = firstUnsaved.id
  }
}

function selectRoom(id) {
  selectedRoomId.value = id
  loadLastReadings()
}

// 切换房间时加载上次读数
watch(selectedRoomId, () => {
  loadLastReadings()
})

// ========== 已抄记录追踪 ==========
const savedRoomIds = ref(new Set())

function isFloorDone(floor) {
  if (!selectedBuildingId.value) return false
  const floorRooms = rooms.value.filter(
    r => r.buildingId === selectedBuildingId.value && r.floor === floor
  )
  return floorRooms.length > 0 && floorRooms.every(r => savedRoomIds.value.has(r.id))
}

// 页面加载时，统计已有抄表记录的房间
onMounted(() => {
  // 从数据库读取当前已有的最新记录，标记已抄
  refreshSavedStatus()
})

function refreshSavedStatus() {
  const allReadings = db.getAllMeterReadings ? db.getAllMeterReadings() : []
  // 获取本次抄表周期内已有记录的房间（简化：当前月份已有水+电记录即标记已抄）
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const roomSet = new Set()
  const roomTypeMap = {}
  allReadings.forEach(r => {
    const readingMonth = r.readingDate ? r.readingDate.substring(0, 7) : ''
    if (readingMonth === currentMonth) {
      if (!roomTypeMap[r.roomId]) roomTypeMap[r.roomId] = new Set()
      roomTypeMap[r.roomId].add(r.meterType)
    }
  })
  // 同时有水和电记录的房间标记为已抄
  for (const [roomId, types] of Object.entries(roomTypeMap)) {
    if (types.has('water') && types.has('electric')) {
      roomSet.add(roomId)
    }
  }
  savedRoomIds.value = roomSet
}

// ========== 上次读数 ==========
const waterLastReading = ref(null)
const waterLastDate = ref(null)
const electricLastReading = ref(null)
const electricLastDate = ref(null)

function loadLastReadings() {
  if (!selectedRoomId.value) return
  const waterLast = db.getLatestReading(selectedRoomId.value, 'water')
  const electricLast = db.getLatestReading(selectedRoomId.value, 'electric')
  waterLastReading.value = waterLast ? waterLast.readingValue : null
  waterLastDate.value = waterLast ? waterLast.readingDate : null
  electricLastReading.value = electricLast ? electricLast.readingValue : null
  electricLastDate.value = electricLast ? electricLast.readingDate : null
}

// ========== 本次读数 ==========
const waterInput = ref('')
const electricInput = ref('')
const notes = ref('')
const waterPhotoPath = ref('')
const electricPhotoPath = ref('')

const waterValue = computed(() => {
  const val = parseFloat(waterInput.value)
  return isNaN(val) ? null : val
})

const electricValue = computed(() => {
  const val = parseFloat(electricInput.value)
  return isNaN(val) ? null : val
})

const waterConsumption = computed(() => {
  if (waterValue.value === null || waterLastReading.value === null) return null
  return Math.round((waterValue.value - waterLastReading.value) * 100) / 100
})

const electricConsumption = computed(() => {
  if (electricValue.value === null || electricLastReading.value === null) return null
  return Math.round((electricValue.value - electricLastReading.value) * 100) / 100
})

const waterEstimatedCost = computed(() => {
  if (waterConsumption.value === null || waterConsumption.value < 0 || !selectedRoomId.value) return ''
  const rate = db.getRoomRate(selectedRoomId.value, 'water')
  const cost = Math.round(waterConsumption.value * rate * 100) / 100
  return formatAmount(cost)
})

const electricEstimatedCost = computed(() => {
  if (electricConsumption.value === null || electricConsumption.value < 0 || !selectedRoomId.value) return ''
  const rate = db.getRoomRate(selectedRoomId.value, 'electric')
  const cost = Math.round(electricConsumption.value * rate * 100) / 100
  return formatAmount(cost)
})

const canSubmit = computed(() => {
  return (waterValue.value !== null && waterValue.value >= 0) ||
         (electricValue.value !== null && electricValue.value >= 0)
})

function onWaterInput() {}
function onElectricInput() {}

// ========== 拍照（可选） ==========
const showPhotoModal = ref(false)
const previewPhotoPath = ref('')

function takePhoto(type) {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera', 'album'],
    success: (res) => {
      if (type === 'water') {
        waterPhotoPath.value = res.tempFilePaths[0]
      } else {
        electricPhotoPath.value = res.tempFilePaths[0]
      }
    },
    fail: () => {
      uni.showToast({ title: '获取图片失败', icon: 'none' })
    }
  })
}

function previewPhoto(path) {
  previewPhotoPath.value = path
  showPhotoModal.value = true
}

// ========== 异常检测 ==========
const showAnomalyModal = ref(false)
const anomalyModalTitle = ref('')
const anomalyModalMessage = ref('')
let pendingForceConfirmWater = false
let pendingForceConfirmElectric = false

function checkAnomaly(type) {
  const value = type === 'water' ? waterValue.value : electricValue.value
  const lastVal = type === 'water' ? waterLastReading.value : electricLastReading.value
  const unit = type === 'water' ? '吨' : '度'
  const label = type === 'water' ? '水表' : '电表'

  if (value === null || lastVal === null) return false

  const cons = value - lastVal

  // 读数倒退
  if (value < lastVal && lastVal > 0) {
    anomalyModalTitle.value = `${label}读数倒退！`
    anomalyModalMessage.value = `上次${lastVal}${unit}，本次${value}${unit}，请检查是否输错！`
    return true
  }

  // 用量异常偏高
  const allReadings = db.getMeterReadingsByRoom(selectedRoomId.value)
    .filter(r => r.meterType === type)
  if (allReadings.length > 0) {
    const maxConsumption = Math.max(...allReadings.map(r => r.consumption || 0))
    if (maxConsumption > 0 && cons > maxConsumption * 3) {
      anomalyModalTitle.value = `${label}用量异常偏高！`
      anomalyModalMessage.value = `本次用量${cons}${unit}，历史最高${maxConsumption}${unit}，请确认！`
      return true
    }
  }

  return false
}

function closeAnomalyModal() {
  showAnomalyModal.value = false
  pendingForceConfirmWater = false
  pendingForceConfirmElectric = false
}

function forceConfirm() {
  showAnomalyModal.value = false
  // 水表异常已确认，继续检查电表异常
  if (!pendingForceConfirmElectric && electricValue.value !== null && electricLastReading.value !== null) {
    if (checkAnomaly('electric')) {
      pendingForceConfirmWater = true  // 水表已确认
      showAnomalyModal.value = true
      return
    }
  }
  // 所有异常都已确认，提交
  doSubmit(true)
}

// ========== 提交 ==========
function submitReadings() {
  if (!canSubmit.value) return

  // 检查异常（水表优先）
  if (!pendingForceConfirmWater && waterValue.value !== null && waterLastReading.value !== null) {
    if (checkAnomaly('water')) {
      showAnomalyModal.value = true
      return
    }
  }

  if (!pendingForceConfirmElectric && electricValue.value !== null && electricLastReading.value !== null) {
    if (checkAnomaly('electric')) {
      showAnomalyModal.value = true
      return
    }
  }

  doSubmit(false)
}

function doSubmit(forceConfirm) {
  const results = []

  // 保存水表
  if (waterValue.value !== null && waterValue.value >= 0) {
    const reading = {
      roomId: selectedRoomId.value,
      meterType: 'water',
      readingValue: waterValue.value,
      forceConfirm: forceConfirm,
      photoPath: waterPhotoPath.value,
      readingDate: new Date().toISOString(),
      notes: notes.value
    }
    results.push(db.addMeterReading(reading))
  }

  // 保存电表
  if (electricValue.value !== null && electricValue.value >= 0) {
    const reading = {
      roomId: selectedRoomId.value,
      meterType: 'electric',
      readingValue: electricValue.value,
      forceConfirm: forceConfirm,
      photoPath: electricPhotoPath.value,
      readingDate: new Date().toISOString(),
      notes: notes.value
    }
    results.push(db.addMeterReading(reading))
  }

  // 检查是否有被拒绝的异常
  const rejected = results.find(r => r.isAnomaly && !r.isAnomalyConfirmed)
  if (rejected) {
    uni.showToast({ title: '数据异常，请重新检查', icon: 'none' })
    return
  }

  // 标记已抄
  savedRoomIds.value.add(selectedRoomId.value)

  uni.showToast({ title: '抄表成功', icon: 'success' })

  // 清空输入，自动跳到下一个未抄房间
  setTimeout(() => {
    const currentRoomId = selectedRoomId.value
    clearInputs()
    // 查找下一个未抄房间
    const nextRoom = roomsOnFloor.value.find(r => !savedRoomIds.value.has(r.id) && r.id !== currentRoomId)
    if (nextRoom) {
      selectedRoomId.value = nextRoom.id
      loadLastReadings()
    }
  }, 800)
}

function clearInputs() {
  waterInput.value = ''
  electricInput.value = ''
  notes.value = ''
  waterPhotoPath.value = ''
  electricPhotoPath.value = ''
  waterLastReading.value = null
  waterLastDate.value = null
  electricLastReading.value = null
  electricLastDate.value = null
  pendingForceConfirmWater = false
  pendingForceConfirmElectric = false
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #F5F5F5;
  min-height: 100vh;
}

/* ========== 楼栋楼层选择 ========== */
.location-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  margin-bottom: 20rpx;
}

.select-row {
  margin-bottom: 20rpx;
}
.select-row:last-child {
  margin-bottom: 0;
}

.select-label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.option-scroll {
  white-space: nowrap;
}

.option-list {
  display: inline-flex;
  gap: 16rpx;
}

.option-btn {
  display: inline-block;
  padding: 16rpx 28rpx;
  background: #F0F0F0;
  border-radius: 10rpx;
  font-size: 28rpx;
  color: #333;
  text-align: center;
  min-width: 100rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.option-btn.active {
  background: #007AFF;
  color: #fff;
  border-color: #007AFF;
}

.option-btn.done {
  background: #E8F5E9;
  color: #4CAF50;
  border-color: #4CAF50;
}

.option-btn.done.active {
  background: #4CAF50;
  color: #fff;
}

/* ========== 房间列表 ========== */
.room-list {
  margin-top: 10rpx;
}

.room-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 10rpx 16rpx;
}

.room-list-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.room-list-count {
  font-size: 26rpx;
  color: #999;
}

/* ========== 房间卡片 ========== */
.room-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.room-card.active {
  border-color: #007AFF;
}

.room-card.saved {
  border-color: #4CAF50;
}

.room-card.active.saved {
  border-color: #007AFF;
}

.room-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.room-number {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.room-type-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: #F0F0F0;
  color: #666;
}

.saved-badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: #E8F5E9;
  color: #4CAF50;
  margin-left: auto;
}

.editing-badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: #E6F7FF;
  color: #007AFF;
  margin-left: auto;
}

/* ========== 录入区域 ========== */
.room-input-area {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #F0F0F0;
}

.meter-section {
  background: #FAFAFA;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.meter-section.water-section {
  border-left: 6rpx solid #1890FF;
}

.meter-section.electric-section {
  border-left: 6rpx solid #FAAD14;
}

.meter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.meter-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.meter-unit {
  font-size: 24rpx;
  color: #999;
}

.last-reading-mini {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.last-val {
  font-size: 30rpx;
  font-weight: bold;
  color: #666;
}

.last-date {
  font-size: 22rpx;
  color: #BBB;
  margin-left: 10rpx;
}

.reading-input {
  height: 88rpx;
  font-size: 44rpx;
  text-align: center;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  background: #fff;
  padding: 0 20rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.meter-info {
  display: flex;
  justify-content: space-around;
  font-size: 26rpx;
}

.meter-consumption {
  color: #007AFF;
  font-weight: 500;
}

.meter-cost {
  color: #FF6B00;
  font-weight: 500;
}

.meter-warning {
  text-align: center;
  color: #FF4D4F;
  font-size: 26rpx;
  font-weight: 500;
}

/* ========== 拍照 ========== */
.photo-section {
  margin-bottom: 20rpx;
}

.section-label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.photo-row {
  display: flex;
  gap: 20rpx;
}

.photo-btn-mini {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background: #F5F5F5;
  border-radius: 10rpx;
  font-size: 28rpx;
  color: #666;
  border: 2rpx dashed #DDD;
}

.photo-preview-row {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.photo-thumb-wrap {
  position: relative;
  width: 140rpx;
  height: 140rpx;
  border-radius: 10rpx;
  overflow: hidden;
}

.photo-thumb {
  width: 100%;
  height: 100%;
}

.photo-thumb-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  background: rgba(0,0,0,0.4);
  font-size: 20rpx;
  padding: 4rpx 0;
}

.photo-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 0 10rpx;
}

/* ========== 备注 ========== */
.input-section {
  margin-bottom: 20rpx;
}

.notes-input {
  width: 100%;
  height: 120rpx;
  font-size: 28rpx;
  border: 2rpx solid #E0E0E0;
  border-radius: 12rpx;
  background: #FAFAFA;
  padding: 20rpx;
  box-sizing: border-box;
}

/* ========== 按钮 ========== */
.action-bar {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
  margin-bottom: 10rpx;
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

/* ========== 弹窗 ========== */
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

.empty-tip {
  text-align: center;
  color: #999;
  font-size: 28rpx;
  padding: 40rpx 0;
}
</style>
