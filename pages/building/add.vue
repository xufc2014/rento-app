<template>
  <view class="page">
    <!-- 步骤标题 -->
    <view class="step-header">
      <text class="step-title">步骤 {{ step }} / 3</text>
      <text class="step-desc">{{ stepTitle }}</text>
    </view>

    <!-- 步骤 1：楼栋信息 -->
    <view class="card" v-if="step === 1">
      <view class="card-title">楼栋信息</view>
      <view class="form-row" v-if="existingBuildingId">
        <text class="form-label">楼栋名称</text>
        <text class="form-value">{{ buildingName }}</text>
      </view>
      <view class="form-row" v-else>
        <text class="form-label">楼栋名称</text>
        <input
          class="form-input"
          v-model="buildingName"
          placeholder="如：A栋"
          maxlength="20"
        />
      </view>
      <view class="form-row">
        <text class="form-label">描述（可选）</text>
        <input
          class="form-input"
          :disabled="!!existingBuildingId"
          v-model="buildingDesc"
          placeholder="备注信息"
          maxlength="50"
        />
      </view>
      <view class="btn-big btn-primary" @click="nextStep">{{ existingBuildingId ? '下一步（添加房间到此楼栋）' : '下一步' }}</view>
      <view style="margin-top: 8px;" v-if="existingBuildingId">
        <view class="btn-big btn-default" @click="goBack">取消返回</view>
      </view>
    </view>

    <!-- 步骤 2：选择生成方式 -->
    <view class="card" v-if="step === 2">
      <view class="card-title">选择生成方式</view>
      <view class="mode-options">
        <view
          class="mode-btn"
          :class="{ active: mode === 'manual' }"
          @click="mode = 'manual'"
        >
          <text class="mode-title">手动添加</text>
          <text class="mode-desc">逐层逐间添加，适合低矮自建房</text>
        </view>
        <view
          class="mode-btn"
          :class="{ active: mode === 'batch' }"
          @click="mode = 'batch'"
        >
          <text class="mode-title">快速批量生成</text>
          <text class="mode-desc">设置楼层户数和类型模板，适合高层公寓</text>
        </view>
      </view>
      <view class="btn-big btn-primary" @click="nextStep">下一步</view>
      <view class="btn-big btn-default" @click="prevStep">上一步</view>
    </view>

    <!-- 步骤 3：批量生成 -->
    <view v-if="step === 3 && mode === 'batch'">
      <view class="card">
        <view class="card-title">楼层与户数</view>
        <view class="form-row">
          <text class="form-label">起始楼层</text>
          <input
            class="form-input"
            type="number"
            :value="startFloor"
            @input="e => startFloor = parseInt(e.detail.value) || 1"
            placeholder="如 5（从5楼开始）"
          />
        </view>
        <view class="form-row">
          <text class="form-label">结束楼层</text>
          <input
            class="form-input"
            type="number"
            :value="endFloor"
            @input="e => endFloor = parseInt(e.detail.value) || 1"
            placeholder="如 10"
          />
        </view>
        <view class="floor-hint">
          <text class="hint-text">共 {{ Math.max(0, endFloor - startFloor + 1) }} 层（{{ startFloor }}F ～ {{ endFloor }}F）</text>
        </view>
        <view class="form-row">
          <text class="form-label">每层户数</text>
          <input
            class="form-input"
            type="number"
            :value="roomsPerFloor"
            @input="e => roomsPerFloor = parseInt(e.detail.value) || 0"
            placeholder="如 5"
          />
        </view>
      </view>

      <view class="card">
        <view class="card-title">类型模板</view>
        <view class="template-row" v-for="(item, index) in unitTemplates" :key="item.unit">
          <text class="template-unit">{{ item.unit }}户</text>
          <picker
            class="template-picker"
            mode="selector"
            :range="unitTypes"
            :value="unitTypeIndex(item.unitType)"
            @change="e => onTemplateTypeChange(index, e)"
          >
            <view class="picker-text">{{ item.unitType }}</view>
          </picker>
          <input
            class="template-input"
            type="digit"
            v-model="item.area"
            placeholder="面积"
          />
          <input
            class="template-input"
            type="digit"
            v-model="item.baseRent"
            placeholder="租金"
          />
        </view>
      </view>

      <view class="card">
        <view class="card-title">预览</view>
        <view class="preview-row">
          <text class="preview-text">共生成 {{ previewTotal }} 间房</text>
          <text class="preview-text">示例：{{ previewExample }}</text>
        </view>
        <view class="preview-floors">
          <text class="tag tag-gray" v-for="f in previewFloors.slice(0, 4)" :key="f.floor">{{ f.floor }}F {{ f.rooms.length }}间</text>
          <text class="preview-more" v-if="previewFloors.length > 4">...</text>
        </view>
      </view>

      <view class="footer-bar">
        <view class="btn-big btn-success" @click="saveBatch">确认生成</view>
        <view class="btn-big btn-default" @click="prevStep">上一步</view>
      </view>
    </view>

    <!-- 步骤 3：手动添加 -->
    <view v-if="step === 3 && mode === 'manual'">
      <view class="card">
        <view class="card-title">添加房间</view>
        <view class="form-row">
          <text class="form-label">楼层</text>
          <picker
            class="form-picker"
            mode="selector"
            :range="floorOptions"
            :value="currentFloorIndex"
            @change="onFloorChange"
          >
            <view class="picker-text">{{ currentFloor }}F</view>
          </picker>
        </view>
        <view class="form-row">
          <text class="form-label">房号</text>
          <input
            class="form-input"
            v-model="manualRoomNumber"
            placeholder="如 101、夹层A"
            maxlength="20"
          />
        </view>
        <view class="form-row">
          <text class="form-label">类型</text>
          <picker
            class="form-picker"
            mode="selector"
            :range="unitTypes"
            :value="unitTypeIndex(manualUnitType)"
            @change="onManualTypeChange"
          >
            <view class="picker-text">{{ manualUnitType }}</view>
          </picker>
        </view>
        <view class="form-row">
          <text class="form-label">面积（m²）</text>
          <input
            class="form-input"
            type="digit"
            v-model="manualArea"
            placeholder="0"
          />
        </view>
        <view class="form-row">
          <text class="form-label">租金（元/月）</text>
          <input
            class="form-input"
            type="digit"
            v-model="manualRent"
            placeholder="0"
          />
        </view>
        <view class="btn-big btn-primary" @click="addManualRoom">添加此房间</view>
      </view>

      <view class="card" v-if="manualRooms.length > 0">
        <view class="card-title">已添加房间（{{ manualRooms.length }} 间）</view>
        <view class="manual-group" v-for="group in manualGroupedRooms" :key="group.floor">
          <text class="manual-floor">{{ formatFloor(group.floor) }}</text>
          <view class="manual-item" v-for="room in group.rooms" :key="room._index">
            <view class="manual-item-left">
              <text class="manual-room-number">{{ room.roomNumber }}</text>
              <text class="manual-room-info">{{ room.unitType }} · {{ room.area }}m² · {{ formatAmount(room.baseRent) }}</text>
            </view>
            <text class="manual-delete" @click="removeManualRoom(room._index)">删除</text>
          </view>
        </view>
      </view>

      <view class="footer-bar" v-if="manualRooms.length > 0">
        <view class="btn-big btn-success" @click="saveManual">确认添加</view>
        <view class="btn-big btn-default" @click="prevStep">上一步</view>
      </view>
      <view class="footer-bar" v-else>
        <view class="btn-big btn-default" @click="prevStep">上一步</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatAmount } from '@/utils/calc.js'

// ============ 状态 ============

const step = ref(1)
const buildingName = ref('')
const buildingDesc = ref('')
const mode = ref('batch')
const existingBuildingId = ref('')  // 传入的已有楼栋ID，为空则新建

const startFloor = ref(1)
const endFloor = ref(16)
const totalFloors = computed(() => Math.max(0, endFloor.value - startFloor.value + 1))
const roomsPerFloor = ref(5)
const unitTypes = ['民房', '公寓', '商铺']
const defaultUnitPattern = ['民房', '民房', '公寓', '公寓', '商铺']
const unitTemplates = ref([])

const floorOptions = Array.from({ length: 60 }, (_, i) => i + 1)
const currentFloor = ref(1)
const manualRoomNumber = ref('')
const manualUnitType = ref('民房')
const manualArea = ref('')
const manualRent = ref('')
const manualRooms = ref([])

// ============ 计算属性 ============

const stepTitle = computed(() => {
  if (step.value === 1) return '填写楼栋信息'
  if (step.value === 2) return '选择房间生成方式'
  return mode.value === 'batch' ? '批量生成房间' : '手动添加房间'
})

const currentFloorIndex = computed(() => floorOptions.indexOf(currentFloor.value))

const previewFloors = computed(() => {
  const floors = []
  for (let f = startFloor.value; f <= endFloor.value; f++) {
    const rooms = unitTemplates.value.map(t => ({
      roomNumber: `${f}${t.unit}`,
      unitType: t.unitType,
      area: Number(t.area) || 0,
      baseRent: Number(t.baseRent) || 0,
      isCommercial: t.unitType === '商铺'
    }))
    floors.push({ floor: f, rooms })
  }
  return floors
})

const previewTotal = computed(() => previewFloors.value.reduce((sum, f) => sum + f.rooms.length, 0))

const previewExample = computed(() => {
  if (previewFloors.value.length === 0) return '-'
  const first = previewFloors.value[0]
  const list = first.rooms.slice(0, 3).map(r => r.roomNumber).join('、')
  return `${first.floor}F：${list}…`
})

const manualGroupedRooms = computed(() => {
  const groups = {}
  for (let i = 0; i < manualRooms.value.length; i++) {
    const room = manualRooms.value[i]
    if (!groups[room.floor]) groups[room.floor] = []
    groups[room.floor].push({ ...room, _index: i })
  }
  return Object.keys(groups)
    .sort((a, b) => Number(a) - Number(b))
    .map(floor => ({ floor: Number(floor), rooms: groups[floor] }))
})

// ============ 类型模板初始化 ============

function resetUnitTemplates() {
  const count = roomsPerFloor.value || 1
  const templates = []
  for (let i = 1; i <= count; i++) {
    templates.push({
      unit: String(i).padStart(2, '0'),
      unitType: defaultUnitPattern[(i - 1) % defaultUnitPattern.length] || '民房',
      area: '',
      baseRent: ''
    })
  }
  unitTemplates.value = templates
}

watch(roomsPerFloor, resetUnitTemplates, { immediate: true })

// ============ 页面初始化 ============

onLoad((options) => {
  // 如果传了 buildingId，说明是给已有楼栋添加房间
  if (options.buildingId) {
    existingBuildingId.value = options.buildingId
    const building = db.getBuildingById(options.buildingId)
    if (building) {
      buildingName.value = building.name
      buildingDesc.value = building.description || ''
      // 直接跳到步骤2（选择生成方式）
      step.value = 1
    }
  }
})

// ============ 辅助方法 ============

function unitTypeIndex(type) {
  return unitTypes.indexOf(type)
}

function formatFloor(floor) {
  const n = Number(floor)
  return isNaN(n) ? `${floor}` : `${n}F`
}

// ============ 步骤控制 ============

function nextStep() {
  if (step.value === 1) {
    if (!buildingName.value.trim()) {
      uni.showToast({ title: '请输入楼栋名称', icon: 'none' })
      return
    }
  }
  if (step.value < 3) {
    step.value += 1
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value -= 1
  }
}

// ============ 批量生成 ============

function onTemplateTypeChange(index, e) {
  const typeIndex = Number(e.detail.value)
  unitTemplates.value[index].unitType = unitTypes[typeIndex]
}

function saveBatch() {
  if (!existingBuildingId.value && !buildingName.value.trim()) {
    uni.showToast({ title: '请输入楼栋名称', icon: 'none' })
    return
  }
  if (totalFloors.value < 1) {
    uni.showToast({ title: '结束楼层必须 ≥ 起始楼层', icon: 'none' })
    return
  }
  if (startFloor.value < 1) {
    uni.showToast({ title: '起始楼层至少为 1', icon: 'none' })
    return
  }
  if (roomsPerFloor.value < 1) {
    uni.showToast({ title: '每层户数至少为 1', icon: 'none' })
    return
  }

  let building
  if (existingBuildingId.value) {
    // 给已有楼栋添加房间
    building = db.getBuildingById(existingBuildingId.value)
  } else {
    // 新建楼栋
    building = db.addBuilding({
      name: buildingName.value.trim(),
      description: buildingDesc.value.trim()
    })
    if (building.error) {
      uni.showToast({ title: building.error, icon: 'none' })
      return
    }
  }

  const floorConfigs = previewFloors.value.map(f => ({
    floor: f.floor,
    rooms: f.rooms
  }))

  db.batchAddRooms(building.id, floorConfigs)

  uni.showToast({ title: `成功生成 ${previewTotal.value} 间房`, icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 800)
}

// ============ 手动添加 ============

function onFloorChange(e) {
  currentFloor.value = floorOptions[Number(e.detail.value)]
}

function onManualTypeChange(e) {
  manualUnitType.value = unitTypes[Number(e.detail.value)]
}

function addManualRoom() {
  if (!manualRoomNumber.value.trim()) {
    uni.showToast({ title: '请输入房号', icon: 'none' })
    return
  }

  manualRooms.value.push({
    floor: currentFloor.value,
    roomNumber: manualRoomNumber.value.trim(),
    unitType: manualUnitType.value,
    area: Number(manualArea.value) || 0,
    baseRent: Number(manualRent.value) || 0,
    isCommercial: manualUnitType.value === '商铺'
  })

  // 清空房号，保留楼层和类型提高录入效率
  manualRoomNumber.value = ''
  manualArea.value = ''
  manualRent.value = ''

  uni.showToast({ title: '已添加', icon: 'none' })
}

function removeManualRoom(index) {
  manualRooms.value.splice(index, 1)
}

function goBack() {
  uni.navigateBack()
}

function saveManual() {
  if (!existingBuildingId.value && !buildingName.value.trim()) {
    uni.showToast({ title: '请输入楼栋名称', icon: 'none' })
    return
  }
  if (manualRooms.value.length === 0) {
    uni.showToast({ title: '请至少添加一间房', icon: 'none' })
    return
  }

  let building
  if (existingBuildingId.value) {
    building = db.getBuildingById(existingBuildingId.value)
  } else {
    building = db.addBuilding({
      name: buildingName.value.trim(),
      description: buildingDesc.value.trim()
    })
    if (building.error) {
      uni.showToast({ title: building.error, icon: 'none' })
      return
    }
  }

  for (const room of manualRooms.value) {
    db.addRoom({
      buildingId: building.id,
      floor: room.floor,
      roomNumber: room.roomNumber,
      unitType: room.unitType,
      area: room.area,
      baseRent: room.baseRent,
      isCommercial: room.isCommercial
    })
  }

  uni.showToast({ title: `成功添加 ${manualRooms.value.length} 间房`, icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 800)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  padding-bottom: 120px;
  background-color: #f5f5f5;
}

.step-header {
  padding: 16px;
  margin-bottom: 8px;
}

.step-title {
  font-size: 14px;
  color: #999999;
  display: block;
  margin-bottom: 4px;
}

.step-desc {
  font-size: 20px;
  font-weight: 800;
  color: #333333;
}

.floor-hint {
  padding: 6px 0 2px;
  border-bottom: 1px solid #f0f0f0;
}

.hint-text {
  font-size: 13px;
  color: #007AFF;
  font-weight: 600;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.form-row:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  min-width: 100px;
}

.form-input {
  flex: 1;
  height: 44px;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 16px;
  text-align: right;
}

.form-value {
  flex: 1;
  height: 44px;
  line-height: 44px;
  font-size: 16px;
  color: #333333;
  font-weight: 600;
  text-align: right;
}

.form-picker {
  flex: 1;
  height: 44px;
  background-color: #f5f5f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px;
}

.picker-text {
  font-size: 16px;
  color: #333333;
}

.btn-default {
  background-color: #ffffff;
  color: #666666;
  border: 1px solid #eeeeee;
  margin-top: 12px;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.mode-btn {
  background-color: #f5f5f5;
  border-radius: 12px;
  padding: 20px 16px;
  border: 2px solid transparent;
}

.mode-btn.active {
  background-color: #E3F2FD;
  border-color: #007AFF;
}

.mode-title {
  font-size: 18px;
  font-weight: 700;
  color: #333333;
  display: block;
  margin-bottom: 6px;
}

.mode-desc {
  font-size: 14px;
  color: #666666;
  display: block;
}

.template-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.template-row:last-child {
  border-bottom: none;
}

.template-unit {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
  width: 44px;
}

.template-picker {
  flex: 1;
  height: 40px;
  background-color: #f5f5f5;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
}

.template-input {
  width: 80px;
  height: 40px;
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 14px;
  text-align: center;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.preview-text {
  font-size: 15px;
  color: #333333;
  font-weight: 600;
}

.preview-floors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-more {
  font-size: 14px;
  color: #999999;
}

.manual-group {
  margin-bottom: 12px;
}

.manual-floor {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 8px;
  display: block;
}

.manual-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.manual-item:last-child {
  border-bottom: none;
}

.manual-item-left {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.manual-room-number {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  display: block;
}

.manual-room-info {
  font-size: 13px;
  color: #666666;
  margin-top: 4px;
  display: block;
}

.manual-delete {
  font-size: 14px;
  color: #FF3B30;
  padding: 4px 8px;
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
