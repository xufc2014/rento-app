<template>
  <view class="container">
    <!-- 步骤1：先选抄表月份 -->
    <view class="month-pick-card" v-if="!usageMonthConfirmed">
      <view class="month-pick-title">📋 选择抄表月份</view>
      <view class="month-pick-desc">
        这是<strong>用量发生的月份</strong>，不是今天的日期。
        <br/>比如7月1号去抄6月的表，就选6月。
      </view>
      <picker mode="date" fields="month" :value="usageMonthPick" @change="onUsageMonthPick">
        <view class="month-pick-value">{{ usageMonthCN }}</view>
      </picker>
      <view class="btn-big btn-primary" style="margin-top: 20px;" @click="confirmUsageMonth">
        确认，开始抄表
      </view>
    </view>

    <!-- 步骤2：楼栋楼层选择（确认月份后才显示） -->
    <view class="location-card" v-if="usageMonthConfirmed">
      <view class="month-badge-bar">
        <view class="month-badge">抄表月份：{{ usageMonthCN }}</view>
        <view class="month-change" @click="changeUsageMonth">修改月份</view>
      </view>

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

      <view class="select-row" v-if="selectedBuildingId && occupiedFloors.length > 0">
        <view class="select-label">楼层（仅已入住）</view>
        <scroll-view scroll-x class="option-scroll">
          <view class="option-list">
            <view
              v-for="f in occupiedFloors"
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

    <!-- 房间列表（选中楼栋+楼层后显示，仅已入住） -->
    <view v-if="usageMonthConfirmed && selectedBuildingId && selectedFloor !== ''" class="room-list">
      <view class="room-list-header">
        <text class="room-list-title">{{ currentBuildingName }} {{ selectedFloor }}F（已入住）</text>
        <text class="room-list-count">{{ occupiedRoomsOnFloor.length }} 间</text>
      </view>

      <!-- 逐间录入（仅已入住房间） -->
      <view
        v-for="room in occupiedRoomsOnFloor"
        :key="room.id"
        class="room-card"
        :class="{ active: selectedRoomId === room.id, saved: savedRoomIds.has(room.id) }"
        @click="selectRoom(room.id)"
      >
        <!-- 房间头部 -->
        <view class="room-header">
          <view class="room-number">{{ room.roomNumber }}</view>
          <view class="room-tenant-name">{{ getTenantName(room) }}</view>
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

          <!-- ===== 气表 ===== -->
          <view class="meter-section gas-section">
            <view class="meter-header">
              <text class="meter-title">🔥 气表</text>
              <text class="meter-unit">单位：方</text>
            </view>
            <view class="last-reading-mini">
              上次读数：<text class="last-val">{{ gasLastReading !== null ? gasLastReading : '无记录' }}</text>
              <text v-if="gasLastDate" class="last-date">{{ formatDateCN(gasLastDate) }}</text>
            </view>
            <input
              class="reading-input"
              type="digit"
              v-model="gasInput"
              placeholder="输入本次气表读数（选填）"
              @input="onGasInput"
            />
            <view class="meter-info" v-if="gasConsumption !== null && gasConsumption >= 0">
              <text class="meter-consumption">用量 {{ gasConsumption }} 方</text>
              <text class="meter-cost">≈ {{ gasEstimatedCost }}</text>
            </view>
            <view class="meter-warning" v-if="gasConsumption !== null && gasConsumption < 0">
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

      <view class="empty-tip" v-if="occupiedRoomsOnFloor.length === 0">
        该楼层暂无已入住房间
      </view>
      <view class="all-done-tip" v-if="occupiedRoomsOnFloor.length > 0 && occupiedRoomsOnFloor.every(r => savedRoomIds.has(r.id))">
        ✅ 该楼层已入住房间全部抄表完成！
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

// ========== 抄表月份选择 ==========
const usageMonthPick = ref('')
const usageMonthConfirmed = ref(false)
const usageMonthCN = computed(() => {
  if (!usageMonthPick.value) return '请选择月份'
  const parts = usageMonthPick.value.split('-')
  const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  return `${parts[0]}年${months[Number(parts[1]) - 1]}月`
})

// 初始化默认月份（上月，因为正常25-30号抄的是上月的用量）
function initUsageMonth() {
  const now = new Date()
  // 默认选上个月（抄表通常是抄上月的用量）
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  usageMonthPick.value = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
}

function onUsageMonthPick(e) {
  usageMonthPick.value = e.detail.value
}

function confirmUsageMonth() {
  if (!usageMonthPick.value) {
    uni.showToast({ title: '请选择月份', icon: 'none' })
    return
  }
  usageMonthConfirmed.value = true
  refreshSavedStatus()
}

function changeUsageMonth() {
  usageMonthConfirmed.value = false
  savedRoomIds.value = new Set()
  selectedBuildingId.value = ''
  selectedFloor.value = ''
  selectedRoomId.value = ''
  clearInputs()
}

// ========== 数据加载 ==========
const buildings = ref([])
const rooms = ref([])
const settings = ref({})

onMounted(() => {
  buildings.value = db.getBuildings()
  rooms.value = db.getRooms()
  settings.value = db.getSettings()
  initUsageMonth()
})

// ========== 楼栋/楼层选择 ==========
const selectedBuildingId = ref('')
const selectedFloor = ref('')
const selectedRoomId = ref('')

const currentBuildingName = computed(() => {
  const b = buildings.value.find(b => b.id === selectedBuildingId.value)
  return b ? b.name : ''
})

// 只取有已入住房间的楼层
const occupiedFloors = computed(() => {
  if (!selectedBuildingId.value) return []
  const set = new Set(
    rooms.value
      .filter(r => r.buildingId === selectedBuildingId.value && r.status === '已入住')
      .map(r => r.floor)
  )
  return Array.from(set).sort((a, b) => a - b)
})

// 当前楼层只显示已入住房间
const occupiedRoomsOnFloor = computed(() => {
  if (!selectedBuildingId.value || selectedFloor.value === '') return []
  return rooms.value
    .filter(r => r.buildingId === selectedBuildingId.value && r.floor === selectedFloor.value && r.status === '已入住')
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
  // 自动选中第一个未抄的已入住房间
  const firstUnsaved = occupiedRoomsOnFloor.value.find(r => !savedRoomIds.value.has(r.id))
  if (firstUnsaved) {
    selectedRoomId.value = firstUnsaved.id
  }
}

function selectRoom(id) {
  selectedRoomId.value = id
  loadLastReadings()
}

// 获取租客名称
function getTenantName(room) {
  if (!room.currentTenantId) return ''
  const t = db.getTenantById(room.currentTenantId)
  return t ? t.name : ''
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
    r => r.buildingId === selectedBuildingId.value && r.floor === floor && r.status === '已入住'
  )
  return floorRooms.length > 0 && floorRooms.every(r => savedRoomIds.value.has(r.id))
}

function refreshSavedStatus() {
  const allReadings = db.getAllMeterReadings ? db.getAllMeterReadings() : []
  // 按用户选择的抄表月份来判断哪些房间已抄
  const targetMonth = usageMonthPick.value
  const roomSet = new Set()
  const roomTypeMap = {}
  allReadings.forEach(r => {
    // 用 readingDate 的月份部分判断（不是 createdAt）
    const readingMonth = r.readingDate ? r.readingDate.substring(0, 7) : ''
    if (readingMonth === targetMonth) {
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
const gasLastReading = ref(null)
const gasLastDate = ref(null)

function loadLastReadings() {
  if (!selectedRoomId.value) return
  const waterLast = db.getLatestReading(selectedRoomId.value, 'water')
  const electricLast = db.getLatestReading(selectedRoomId.value, 'electric')
  const gasLast = db.getLatestReading(selectedRoomId.value, 'gas')
  waterLastReading.value = waterLast ? waterLast.readingValue : null
  waterLastDate.value = waterLast ? waterLast.readingDate : null
  electricLastReading.value = electricLast ? electricLast.readingValue : null
  electricLastDate.value = electricLast ? electricLast.readingDate : null
  gasLastReading.value = gasLast ? gasLast.readingValue : null
  gasLastDate.value = gasLast ? gasLast.readingDate : null
}

// ========== 本次读数 ==========
const waterInput = ref('')
const electricInput = ref('')
const gasInput = ref('')
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

const gasValue = computed(() => {
  const val = parseFloat(gasInput.value)
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

const gasConsumption = computed(() => {
  if (gasValue.value === null || gasLastReading.value === null) return null
  return Math.round((gasValue.value - gasLastReading.value) * 100) / 100
})

const gasEstimatedCost = computed(() => {
  if (gasConsumption.value === null || gasConsumption.value < 0 || !selectedRoomId.value) return ''
  const rate = db.getRoomRate(selectedRoomId.value, 'gas')
  const cost = Math.round(gasConsumption.value * rate * 100) / 100
  return formatAmount(cost)
})

const canSubmit = computed(() => {
  return (waterValue.value !== null && waterValue.value >= 0) ||
         (electricValue.value !== null && electricValue.value >= 0)
})

function onWaterInput() {}
function onElectricInput() {}
function onGasInput() {}

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

  // 构造用量月份的日期：用户选择的月份 + 当天日期
  // 比如7月1号抄6月的表 → readingDate = 2026-06-01T...（算6月用量）
  const usageDate = buildUsageDate(usageMonthPick.value)

  // 保存水表
  if (waterValue.value !== null && waterValue.value >= 0) {
    const reading = {
      roomId: selectedRoomId.value,
      meterType: 'water',
      readingValue: waterValue.value,
      forceConfirm: forceConfirm,
      photoPath: waterPhotoPath.value,
      readingDate: usageDate,   // 用量月份日期，不是当天
      recordedAt: new Date().toISOString(),  // 实际录入时间
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
      readingDate: usageDate,
      recordedAt: new Date().toISOString(),
      notes: notes.value
    }
    results.push(db.addMeterReading(reading))
  }

  // 保存气表（选填）
  if (gasValue.value !== null && gasValue.value >= 0) {
    const reading = {
      roomId: selectedRoomId.value,
      meterType: 'gas',
      readingValue: gasValue.value,
      forceConfirm: forceConfirm,
      photoPath: null,
      readingDate: usageDate,
      recordedAt: new Date().toISOString(),
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

  uni.showToast({ title: `${usageMonthCN.value}抄表成功`, icon: 'success' })

  // 清空输入，自动跳到下一个未抄房间
  setTimeout(() => {
    const currentRoomId = selectedRoomId.value
    clearInputs()
    const nextRoom = occupiedRoomsOnFloor.value.find(r => !savedRoomIds.value.has(r.id) && r.id !== currentRoomId)
    if (nextRoom) {
      selectedRoomId.value = nextRoom.id
      loadLastReadings()
    }
  }, 800)
}

// 构造用量月份日期：用用户选择的月份 + 当天的日数
// 比如 2026-06 + 7月1号录入 → 2026-06-01T12:00:00
// 如果当天日期超过该月最大天数，则用该月最后一天
function buildUsageDate(monthStr) {
  const now = new Date()
  const [y, m] = monthStr.split('-').map(Number)
  const day = now.getDate()
  // 该月最大天数
  const maxDay = new Date(y, m, 0).getDate()
  const safeDay = Math.min(day, maxDay)
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.000Z`
  return dateStr
}

function clearInputs() {
  waterInput.value = ''
  electricInput.value = ''
  gasInput.value = ''
  notes.value = ''
  waterPhotoPath.value = ''
  electricPhotoPath.value = ''
  gasLastReading.value = null
  gasLastDate.value = null
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

/* ========== 月份选择卡片 ========== */
.month-pick-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx 30rpx;
  margin: 20rpx;
}

.month-pick-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.month-pick-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20rpx;
  padding: 16rpx;
  background: #FFF8E1;
  border-radius: 10rpx;
  border-left: 6rpx solid #FAAD14;
}

.month-pick-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #007AFF;
  text-align: center;
  padding: 20rpx;
  background: #E6F7FF;
  border-radius: 12rpx;
}

/* ========== 月份徽章 ========== */
.month-badge-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 16rpx;
  background: #E6F7FF;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
}

.month-badge {
  font-size: 26rpx;
  font-weight: bold;
  color: #007AFF;
}

.month-change {
  font-size: 24rpx;
  color: #FF6B00;
  padding: 6rpx 16rpx;
  border: 2rpx solid #FF6B00;
  border-radius: 6rpx;
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

.room-tenant-name {
  font-size: 24rpx;
  color: #007AFF;
  margin-left: 10rpx;
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

.meter-section.gas-section {
  border-left: 6rpx solid #52C41A;
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

.all-done-tip {
  text-align: center;
  color: #4CAF50;
  font-size: 28rpx;
  font-weight: bold;
  padding: 30rpx 0;
}
</style>
