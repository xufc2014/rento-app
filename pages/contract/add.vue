<template>
  <view class="page">
    <!-- 步骤指示器 -->
    <view class="steps">
      <view class="step" v-for="(s, idx) in steps" :key="idx" :class="{ active: currentStep === idx, done: currentStep > idx }">
        <view class="step-dot">{{ currentStep > idx ? '&#10003;' : idx + 1 }}</view>
        <text class="step-text">{{ s }}</text>
      </view>
    </view>

    <!-- 步骤1：选择房间 -->
    <view class="card" v-if="currentStep === 0">
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

      <view class="form-label" style="margin-top: 16px;">选择房间</view>
      <view class="room-list" v-if="availableRooms.length > 0">
        <view
          class="room-item"
          v-for="room in availableRooms"
          :key="room.id"
          :class="{ active: selectedRoomId === room.id }"
          @click="selectRoom(room.id)"
        >
          <text class="room-label">{{ room.floor }}-{{ room.roomNumber }}</text>
          <text class="room-status tag" :class="room.status === '空置' ? 'tag-gray' : 'tag-orange'">{{ room.status }}</text>
          <text class="room-rent-hint">{{ formatAmount(room.baseRent) }}/月</text>
        </view>
      </view>
      <text class="empty-hint" v-else>暂无可选房间</text>

      <view class="btn-big btn-primary" style="margin-top: 20px;" @click="nextStep" v-if="selectedRoomId">下一步</view>
    </view>

    <!-- 步骤2：选择/新增租客 -->
    <view class="card" v-if="currentStep === 1">
      <view class="form-label">选择租客</view>
      <view class="tenant-list" v-if="tenants.length > 0">
        <view
          class="tenant-item"
          v-for="t in tenants"
          :key="t.id"
          :class="{ active: selectedTenantId === t.id }"
          @click="selectTenant(t.id)"
        >
          <text class="tenant-name">{{ t.name }}</text>
          <text class="tenant-phone">{{ t.phone || '未填手机' }}</text>
          <text class="tag tag-red" v-if="t.isBlacklisted">黑名单</text>
        </view>
      </view>
      <text class="empty-hint" v-else>暂无租客，请先添加</text>

      <view class="btn-big btn-warning" style="margin-top: 16px;" @click="goAddTenant">新增租客</view>

      <view class="btn-big btn-primary" style="margin-top: 12px;" @click="nextStep" v-if="selectedTenantId">下一步</view>
      <view class="btn-big btn-secondary" style="margin-top: 12px;" @click="prevStep">上一步</view>
    </view>

    <!-- 步骤3：设置起止日期 -->
    <view class="card" v-if="currentStep === 2">
      <view class="form-label">合同起止日期</view>

      <view class="date-field">
        <text class="date-label">开始日期</text>
        <picker mode="date" :value="startDate" @change="e => startDate = e.detail.value">
          <text class="date-value">{{ startDate || '请选择' }}</text>
        </picker>
      </view>

      <view class="date-field">
        <text class="date-label">结束日期</text>
        <picker mode="date" :value="endDate" @change="e => endDate = e.detail.value">
          <text class="date-value">{{ endDate || '请选择' }}</text>
        </picker>
      </view>

      <!-- 快捷选择 -->
      <view class="quick-dates">
        <view class="quick-date-btn" @click="setQuickDate(6)">半年</view>
        <view class="quick-date-btn" @click="setQuickDate(12)">一年</view>
        <view class="quick-date-btn" @click="setQuickDate(24)">两年</view>
      </view>

      <view class="btn-big btn-primary" style="margin-top: 20px;" @click="nextStep" v-if="startDate && endDate">下一步</view>
      <view class="btn-big btn-secondary" style="margin-top: 12px;" @click="prevStep">上一步</view>
    </view>

    <!-- 步骤4：设置押金和租金 -->
    <view class="card" v-if="currentStep === 3">
      <view class="form-label">押金规则</view>
      <view class="rule-list">
        <view
          class="rule-item"
          v-for="rule in depositRules"
          :key="rule"
          :class="{ active: depositRule === rule }"
          @click="depositRule = rule"
        >
          <text class="rule-text">{{ rule }}</text>
        </view>
      </view>

      <view class="form-label" style="margin-top: 16px;">月租金</view>
      <input class="input-big" type="digit" v-model="rentAmount" placeholder="月租金" />

      <view class="form-label" style="margin-top: 12px;">基础押金（自动计算）</view>
      <text class="deposit-display">{{ formatAmount(calcBaseDeposit) }}</text>

      <!-- 额外押金 -->
      <view v-if="roomExtraDeposit > 0" class="extra-deposit-section">
        <view class="form-label" style="margin-top: 16px;">额外押金（来自房间设置）</view>
        <view class="extra-deposit-row">
          <text class="extra-deposit-amount">{{ formatAmount(roomExtraDeposit) }}</text>
          <text class="extra-deposit-note" v-if="roomExtraDepositNote">{{ roomExtraDepositNote }}</text>
        </view>
        <view class="extra-deposit-edit">
          <text class="extra-deposit-label">可修改金额：</text>
          <input class="input-small" type="digit" v-model="extraDeposit" placeholder="0" />
        </view>
        <input class="input-small" v-model="extraDepositNote" placeholder="额外押金说明（选填）" style="margin-top: 6px;" />
      </view>

      <view class="form-label" style="margin-top: 16px;">总押金</view>
      <text class="deposit-display deposit-total">{{ formatAmount(calcTotalDeposit) }}</text>

      <view class="btn-big btn-primary" style="margin-top: 20px;" @click="nextStep">确认</view>
      <view class="btn-big btn-secondary" style="margin-top: 12px;" @click="prevStep">上一步</view>
    </view>

    <!-- 步骤5：确认签订 -->
    <view class="card" v-if="currentStep === 4">
      <view class="form-label">合同确认</view>

      <view class="confirm-row">
        <text class="confirm-label">房间</text>
        <text class="confirm-value">{{ confirmRoomLabel }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">租客</text>
        <text class="confirm-value">{{ confirmTenantName }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">租期</text>
        <text class="confirm-value">{{ startDate }} ~ {{ endDate }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">押金规则</text>
        <text class="confirm-value">{{ depositRule }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">月租金</text>
        <text class="confirm-value amount-red">{{ formatAmount(Number(rentAmount)) }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">基础押金</text>
        <text class="confirm-value">{{ formatAmount(calcBaseDeposit) }}</text>
      </view>
      <view class="confirm-row" v-if="extraDepositNum > 0">
        <text class="confirm-label">额外押金</text>
        <text class="confirm-value amount-red">{{ formatAmount(extraDepositNum) }}</text>
      </view>
      <view class="confirm-row" v-if="extraDepositNum > 0">
        <text class="confirm-label">额外押金说明</text>
        <text class="confirm-value">{{ extraDepositNote || '-' }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">总押金</text>
        <text class="confirm-value amount-red">{{ formatAmount(calcTotalDeposit) }}</text>
      </view>

      <view class="btn-big btn-success" style="margin-top: 24px;" @click="submitContract">确认签订合同</view>
      <view class="btn-big btn-secondary" style="margin-top: 12px;" @click="prevStep">上一步</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatAmount } from '@/utils/calc.js'

const steps = ['选房间', '选租客', '设日期', '设押金租金', '确认签订']
const currentStep = ref(0)

// 数据
const buildings = ref([])
const selectedBuildingId = ref('')
const selectedRoomId = ref('')
const selectedTenantId = ref('')
const startDate = ref('')
const endDate = ref('')
const depositRule = ref('押二付一')
const rentAmount = ref('')
const extraDeposit = ref('')
const extraDepositNote = ref('')

const depositRules = ['押一付一', '押二付一', '押一付三']

// 租客列表
const tenants = ref([])

// 房间额外押金信息
const roomExtraDeposit = ref(0)
const roomExtraDepositNote = ref('')

// 可选房间（空置或已预订）
const availableRooms = computed(() => {
  if (!selectedBuildingId.value) return []
  return db.getRoomsByBuilding(selectedBuildingId.value)
    .filter(r => r.status === '空置' || r.status === '已预订')
})

// 押金计算
const calcBaseDeposit = computed(() => {
  const rent = Number(rentAmount.value) || 0
  if (depositRule.value === '押一付一') return rent * 1
  if (depositRule.value === '押二付一') return rent * 2
  if (depositRule.value === '押一付三') return rent * 1
  return rent
})

const extraDepositNum = computed(() => Number(extraDeposit.value) || 0)

const calcTotalDeposit = computed(() => {
  return calcBaseDeposit.value + extraDepositNum.value
})

// 确认信息
const confirmRoomLabel = computed(() => {
  if (!selectedRoomId.value) return ''
  const room = db.getRoomById(selectedRoomId.value)
  if (!room) return ''
  const building = db.getBuildings().find(b => b.id === room.buildingId) || {}
  return `${building.name || ''} ${room.floor}-${room.roomNumber}`
})

const confirmTenantName = computed(() => {
  if (!selectedTenantId.value) return ''
  const t = db.getTenantById(selectedTenantId.value)
  return t ? t.name : ''
})

onLoad((options) => {
  buildings.value = db.getBuildings()
  tenants.value = db.getTenants()

  if (options.roomId) {
    selectedRoomId.value = options.roomId
    const room = db.getRoomById(options.roomId)
    if (room) {
      selectedBuildingId.value = room.buildingId
      rentAmount.value = String(room.baseRent || 0)
      // 带入房间的额外押金
      roomExtraDeposit.value = room.extraDeposit || 0
      roomExtraDepositNote.value = room.extraDepositNote || ''
      extraDeposit.value = room.extraDeposit ? String(room.extraDeposit) : ''
      extraDepositNote.value = room.extraDepositNote || ''
    }
    // 如果指定了roomId，直接跳到步骤1
    currentStep.value = 1
  }

  if (buildings.value.length > 0 && !selectedBuildingId.value) {
    selectedBuildingId.value = buildings.value[0].id
  }
})

onShow(() => {
  // 从添加租客页面返回后刷新
  tenants.value = db.getTenants()
})

function selectBuilding(id) {
  selectedBuildingId.value = id
  selectedRoomId.value = ''
}

function selectRoom(id) {
  selectedRoomId.value = id
  const room = db.getRoomById(id)
  if (room) {
    rentAmount.value = String(room.baseRent || 0)
    // 带入房间的额外押金
    roomExtraDeposit.value = room.extraDeposit || 0
    roomExtraDepositNote.value = room.extraDepositNote || ''
    extraDeposit.value = room.extraDeposit ? String(room.extraDeposit) : ''
    extraDepositNote.value = room.extraDepositNote || ''
  }
}

function selectTenant(id) {
  selectedTenantId.value = id
}

function goAddTenant() {
  uni.navigateTo({ url: '/pages/tenant/add' })
}

function setQuickDate(months) {
  const start = startDate.value ? new Date(startDate.value) : new Date()
  const end = new Date(start)
  const targetMonth = (start.getMonth() + months) % 12
  end.setMonth(end.getMonth() + months)
  // 处理月份溢出（如1月31日+1个月会溢出到3月3日）
  if (end.getMonth() !== targetMonth) {
    end.setDate(0)  // 回退到上个月最后一天
  }
  startDate.value = formatDateStr(start)
  endDate.value = formatDateStr(end)
}

function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nextStep() {
  if (currentStep.value === 0 && !selectedRoomId.value) {
    uni.showToast({ title: '请选择房间', icon: 'none' })
    return
  }
  if (currentStep.value === 1 && !selectedTenantId.value) {
    uni.showToast({ title: '请选择租客', icon: 'none' })
    return
  }
  if (currentStep.value === 2) {
    if (!startDate.value || !endDate.value) {
      uni.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (new Date(endDate.value) <= new Date(startDate.value)) {
      uni.showToast({ title: '结束日期必须晚于开始日期', icon: 'none' })
      return
    }
  }
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function submitContract() {
  if (!selectedRoomId.value || !selectedTenantId.value) {
    uni.showToast({ title: '信息不完整', icon: 'none' })
    return
  }

  const result = db.addContract({
    roomId: selectedRoomId.value,
    tenantId: selectedTenantId.value,
    startDate: startDate.value,
    endDate: endDate.value,
    depositAmount: calcBaseDeposit.value,
    depositRule: depositRule.value,
    rentAmount: Number(rentAmount.value) || 0,
    extraDeposit: extraDepositNum.value,
    extraDepositNote: extraDepositNote.value
  })

  if (result.error) {
    uni.showToast({ title: result.error, icon: 'none' })
    return
  }

  uni.showToast({ title: '合同签订成功', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 1500)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 0;
  background-color: #f5f5f5;
}

/* 步骤指示器 */
.steps {
  display: flex;
  background-color: #ffffff;
  padding: 16px 8px;
  border-bottom: 1px solid #eeeeee;
}

.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #e0e0e0;
  color: #999999;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.step.active .step-dot {
  background-color: #007AFF;
  color: #ffffff;
}

.step.done .step-dot {
  background-color: #34C759;
  color: #ffffff;
}

.step-text {
  font-size: 11px;
  color: #999999;
}

.step.active .step-text {
  color: #007AFF;
  font-weight: 700;
}

.step.done .step-text {
  color: #34C759;
}

.form-label {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 10px;
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

.room-list {
  margin-top: 4px;
}

.room-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #f9f9f9;
  border: 2px solid transparent;
}

.room-item.active {
  border-color: #007AFF;
  background-color: #E3F2FD;
}

.room-label {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
  flex: 1;
}

.room-rent-hint {
  font-size: 14px;
  color: #007AFF;
  font-weight: 600;
  margin-left: 12px;
}

.tenant-list {
  margin-top: 4px;
}

.tenant-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #f9f9f9;
  border: 2px solid transparent;
}

.tenant-item.active {
  border-color: #007AFF;
  background-color: #E3F2FD;
}

.tenant-name {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
  flex: 1;
}

.tenant-phone {
  font-size: 14px;
  color: #999999;
  margin-left: 12px;
}

.date-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}

.date-label {
  font-size: 16px;
  color: #333333;
}

.date-value {
  font-size: 16px;
  font-weight: 700;
  color: #007AFF;
}

.quick-dates {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.quick-date-btn {
  flex: 1;
  height: 40px;
  line-height: 40px;
  text-align: center;
  background-color: #f0f0f0;
  border-radius: 8px;
  font-size: 15px;
  color: #333333;
  font-weight: 600;
}

.rule-list {
  display: flex;
  gap: 10px;
}

.rule-item {
  flex: 1;
  height: 44px;
  line-height: 44px;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 8px;
  border: 2px solid transparent;
}

.rule-item.active {
  border-color: #007AFF;
  background-color: #E3F2FD;
}

.rule-text {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
}

.rule-item.active .rule-text {
  color: #007AFF;
}

.input-big {
  height: 48px;
  font-size: 18px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  padding: 0 12px;
  background-color: #ffffff;
}

.deposit-display {
  font-size: 24px;
  font-weight: 800;
  color: #FF3B30;
  display: block;
  padding: 8px 0;
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.confirm-label {
  font-size: 16px;
  color: #666666;
}

.confirm-value {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #666666;
}

.empty-hint {
  font-size: 14px;
  color: #999999;
  display: block;
  text-align: center;
  padding: 16px 0;
}

.extra-deposit-section {
  background-color: #FFF8F0;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
  border: 1px dashed #FF9500;
}

.extra-deposit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.extra-deposit-amount {
  font-size: 20px;
  font-weight: 800;
  color: #FF9500;
}

.extra-deposit-note {
  font-size: 14px;
  color: #999;
}

.extra-deposit-edit {
  display: flex;
  align-items: center;
  margin-top: 10px;
}

.extra-deposit-label {
  font-size: 14px;
  color: #666;
  flex-shrink: 0;
}

.input-small {
  flex: 1;
  height: 40px;
  font-size: 16px;
  border: 1px solid #dddddd;
  border-radius: 6px;
  padding: 0 10px;
  background-color: #ffffff;
}

.deposit-total {
  color: #FF3B30;
}

.amount-red {
  color: #FF3B30;
}
</style>
