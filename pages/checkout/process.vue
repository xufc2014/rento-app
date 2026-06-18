<template>
  <view class="page">
    <!-- 步骤指示器 -->
    <view class="step-bar">
      <view
        class="step-dot"
        v-for="(s, idx) in stepLabels"
        :key="idx"
        :class="{ active: currentStep === idx, done: currentStep > idx }"
      >
        <view class="dot-circle">{{ currentStep > idx ? '&#10003;' : idx + 1 }}</view>
        <text class="dot-label">{{ s }}</text>
      </view>
    </view>

    <!-- 步骤1：确认退租信息 -->
    <view class="card" v-if="currentStep === 0">
      <view class="form-label">确认退租信息</view>
      <view class="confirm-row">
        <text class="confirm-label">房间</text>
        <text class="confirm-value">{{ roomLabel }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">租客</text>
        <text class="confirm-value">{{ tenantName }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">押金</text>
        <text class="confirm-value amount-red">{{ formatAmount(depositAmount) }}</text>
      </view>
      <view class="confirm-row" v-if="extraDepositAmount > 0">
        <text class="confirm-label">额外押金</text>
        <text class="confirm-value amount-red">{{ formatAmount(extraDepositAmount) }}</text>
      </view>
      <view class="confirm-row" v-if="extraDepositAmount > 0">
        <text class="confirm-label">额外押金说明</text>
        <text class="confirm-value extra-note">{{ extraDepositNoteText }}</text>
      </view>
      <view class="confirm-row" v-if="extraDepositAmount > 0">
        <text class="confirm-label">总押金</text>
        <text class="confirm-value amount-red">{{ formatAmount(depositAmount + extraDepositAmount) }}</text>
      </view>
      <view class="confirm-row">
        <text class="confirm-label">月租金</text>
        <text class="confirm-value">{{ formatAmount(rentAmount) }}</text>
      </view>
      <view class="btn-big btn-primary" style="margin-top: 20px;" @click="nextStep">确认，下一步</view>
    </view>

    <!-- 步骤2：抄写退租水电读数 -->
    <view class="card" v-if="currentStep === 1">
      <view class="form-label">退租水电读数</view>

      <!-- 水表 -->
      <view class="meter-section">
        <view class="meter-header">
          <text class="meter-title">水表</text>
          <text class="meter-last">上次读数：{{ lastWaterReading }}</text>
        </view>
        <input class="input-big" type="digit" v-model="finalWaterReading" placeholder="请输入本次水表读数" />
        <text class="meter-usage" v-if="waterUsage !== null">用量：{{ waterUsage }} 吨</text>
      </view>

      <!-- 电表 -->
      <view class="meter-section">
        <view class="meter-header">
          <text class="meter-title">电表</text>
          <text class="meter-last">上次读数：{{ lastElectricReading }}</text>
        </view>
        <input class="input-big" type="digit" v-model="finalElectricReading" placeholder="请输入本次电表读数" />
        <text class="meter-usage" v-if="electricUsage !== null">用量：{{ electricUsage }} 度</text>
      </view>

      <view class="btn-big btn-primary" style="margin-top: 20px;" @click="nextStep">确认读数，下一步</view>
      <view class="btn-big btn-secondary" style="margin-top: 10px;" @click="prevStep">上一步</view>
    </view>

    <!-- 步骤3：输入扣款 -->
    <view class="card" v-if="currentStep === 2">
      <view class="form-label">扣款项目</view>

      <view class="form-label-sub">维修扣款</view>
      <input class="input-big" type="digit" v-model="repairDeduction" placeholder="0.00" />
      <input class="input-big" v-model="repairNotes" placeholder="维修说明（选填）" style="margin-top: 8px;" />

      <view class="form-label-sub" style="margin-top: 16px;">未交房租</view>
      <input class="input-big" type="digit" v-model="unpaidRent" placeholder="0.00" />

      <view class="btn-big btn-primary" style="margin-top: 20px;" @click="nextStep">下一步</view>
      <view class="btn-big btn-secondary" style="margin-top: 10px;" @click="prevStep">上一步</view>
    </view>

    <!-- 步骤4：计算结算 -->
    <view class="card" v-if="currentStep === 3">
      <view class="form-label">退租结算明细</view>

      <view class="settle-row">
        <text class="settle-label">基础押金</text>
        <text class="settle-value amount-green">{{ formatAmount(depositAmount) }}</text>
      </view>

      <view class="settle-row" v-if="extraDepositAmount > 0">
        <text class="settle-label">额外押金{{ extraDepositNoteText ? '（' + extraDepositNoteText + '）' : '' }}</text>
        <text class="settle-value amount-green">{{ formatAmount(extraDepositAmount) }}</text>
      </view>

      <view class="settle-row" v-if="waterFee > 0">
        <text class="settle-label">水费</text>
        <text class="settle-value amount-red">-{{ formatAmount(waterFee) }}</text>
      </view>

      <view class="settle-row" v-if="electricFee > 0">
        <text class="settle-label">电费</text>
        <text class="settle-value amount-red">-{{ formatAmount(electricFee) }}</text>
      </view>

      <view class="settle-row" v-if="repairDeductionNum > 0">
        <text class="settle-label">维修扣款</text>
        <text class="settle-value amount-red">-{{ formatAmount(repairDeductionNum) }}</text>
      </view>

      <view class="settle-row" v-if="unpaidRentNum > 0">
        <text class="settle-label">未交房租</text>
        <text class="settle-value amount-red">-{{ formatAmount(unpaidRentNum) }}</text>
      </view>

      <view class="divider"></view>

      <view class="settle-total">
        <text class="settle-total-label">应退金额</text>
        <text class="settle-total-value" :class="totalReturn >= 0 ? 'amount-red' : 'amount-red'">
          {{ formatAmount(totalReturn) }}
        </text>
      </view>

      <view class="btn-big btn-danger" style="margin-top: 20px;" @click="doCheckout">确认退租</view>
      <view class="btn-big btn-secondary" style="margin-top: 10px;" @click="prevStep">上一步</view>
    </view>

    <!-- 步骤5：完成 -->
    <view class="card" v-if="currentStep === 4">
      <view class="done-icon">&#10003;</view>
      <text class="done-text">退租完成</text>
      <text class="done-room">{{ roomLabel }}</text>
      <text class="done-return">应退金额</text>
      <text class="done-amount" :class="totalReturn >= 0 ? 'amount-green' : 'amount-red'">
        {{ formatAmount(totalReturn) }}
      </text>
      <text class="done-hint">房间状态已变更为"退租中"</text>
      <view class="btn-big btn-primary" style="margin-top: 24px;" @click="goBack">返回</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatAmount } from '@/utils/calc.js'
import { calcUtilityFee, calcCheckoutAmount } from '@/utils/calc.js'

const stepLabels = ['确认信息', '水电读数', '扣款', '结算', '完成']
const currentStep = ref(0)

// 基础数据
const roomId = ref('')
const roomLabel = ref('')
const tenantName = ref('')
const depositAmount = ref(0)
const extraDepositAmount = ref(0)
const extraDepositNoteText = ref('')
const rentAmount = ref(0)
const tenantId = ref('')
const contractId = ref('')

// 水电读数
const lastWaterReading = ref(0)
const lastElectricReading = ref(0)
const finalWaterReading = ref('')
const finalElectricReading = ref('')

// 扣款
const repairDeduction = ref('')
const repairNotes = ref('')
const unpaidRent = ref('')

// 结果
const waterFee = ref(0)
const electricFee = ref(0)
const totalReturn = ref(0)

// 计算
const waterUsage = computed(() => {
  if (!finalWaterReading.value) return null
  const val = Number(finalWaterReading.value)
  if (isNaN(val)) return null
  return Math.max(0, val - lastWaterReading.value)
})

const electricUsage = computed(() => {
  if (!finalElectricReading.value) return null
  const val = Number(finalElectricReading.value)
  if (isNaN(val)) return null
  return Math.max(0, val - lastElectricReading.value)
})

const repairDeductionNum = computed(() => Number(repairDeduction.value) || 0)
const unpaidRentNum = computed(() => Number(unpaidRent.value) || 0)

onLoad((options) => {
  if (options.roomId) {
    roomId.value = options.roomId
    loadRoomData()
  }
})

function loadRoomData() {
  const room = db.getRoomById(roomId.value)
  if (!room) {
    uni.showToast({ title: '房间不存在', icon: 'none' })
    return
  }

  const building = db.getBuildings().find(b => b.id === room.buildingId) || {}
  roomLabel.value = `${building.name || ''} ${room.floor || ''}-${room.roomNumber || ''}`

  if (room.currentTenantId) {
    const tenant = db.getTenantById(room.currentTenantId)
    tenantName.value = tenant ? tenant.name : '未知租客'
    tenantId.value = room.currentTenantId
  }

  if (room.currentContractId) {
    const contract = db.getContractById(room.currentContractId)
    if (contract) {
      depositAmount.value = contract.depositAmount
      extraDepositAmount.value = contract.extraDeposit || 0
      extraDepositNoteText.value = contract.extraDepositNote || ''
      rentAmount.value = contract.rentAmount
      contractId.value = contract.id
    }
  }

  // 获取上次读数
  const lastWater = db.getLatestReading(roomId.value, 'water')
  lastWaterReading.value = lastWater ? lastWater.readingValue : 0

  const lastElectric = db.getLatestReading(roomId.value, 'electric')
  lastElectricReading.value = lastElectric ? lastElectric.readingValue : 0
}

function nextStep() {
  if (currentStep.value === 1) {
    // 验证水电读数
    if (!finalWaterReading.value && !finalElectricReading.value) {
      uni.showToast({ title: '请至少填写一项水电读数', icon: 'none' })
      return
    }
  }

  if (currentStep.value === 2) {
    // 计算结算金额
    calculateSettlement()
  }

  currentStep.value++
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function calculateSettlement() {
  // 计算水电费
  const room = db.getRoomById(roomId.value)

  // 水费
  const waterConsumption = waterUsage.value || 0
  const waterRate = db.getRoomRate(roomId.value, 'water')
  waterFee.value = Math.round(waterConsumption * waterRate * 100) / 100

  // 电费
  const electricConsumption = electricUsage.value || 0
  const electricRate = db.getRoomRate(roomId.value, 'electric')
  electricFee.value = Math.round(electricConsumption * electricRate * 100) / 100

  // 计算应退金额 = 基础押金 + 额外押金 - 水电 - 维修 - 未交房租
  totalReturn.value = calcCheckoutAmount(
    depositAmount.value,
    waterFee.value,
    electricFee.value,
    repairDeductionNum.value,
    unpaidRentNum.value,
    extraDepositAmount.value
  )
}

function doCheckout() {
  const result = db.processCheckout({
    roomId: roomId.value,
    tenantId: tenantId.value,
    contractId: contractId.value,
    finalWaterReading: Number(finalWaterReading.value) || 0,
    finalElectricReading: Number(finalElectricReading.value) || 0,
    repairDeduction: repairDeductionNum.value,
    repairNotes: repairNotes.value,
    unpaidRent: unpaidRentNum.value
  })

  if (result.error) {
    uni.showToast({ title: result.error, icon: 'none' })
    return
  }

  currentStep.value = 4
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 0;
  background-color: #f5f5f5;
}

.step-bar {
  display: flex;
  background-color: #ffffff;
  padding: 16px 8px;
  border-bottom: 1px solid #eeeeee;
}

.step-dot {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dot-circle {
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

.step-dot.active .dot-circle {
  background-color: #007AFF;
  color: #ffffff;
}

.step-dot.done .dot-circle {
  background-color: #34C759;
  color: #ffffff;
}

.dot-label {
  font-size: 11px;
  color: #999999;
}

.step-dot.active .dot-label {
  color: #007AFF;
  font-weight: 700;
}

.step-dot.done .dot-label {
  color: #34C759;
}

.form-label {
  font-size: 18px;
  font-weight: 800;
  color: #333333;
  margin-bottom: 16px;
}

.form-label-sub {
  font-size: 15px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
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

.meter-section {
  margin-bottom: 20px;
}

.meter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.meter-title {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
}

.meter-last {
  font-size: 14px;
  color: #999999;
}

.meter-usage {
  font-size: 14px;
  color: #007AFF;
  font-weight: 600;
  margin-top: 6px;
  display: block;
}

.input-big {
  height: 48px;
  font-size: 18px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  padding: 0 12px;
  background-color: #ffffff;
}

.settle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.settle-label {
  font-size: 16px;
  color: #333333;
}

.settle-value {
  font-size: 17px;
  font-weight: 700;
}

.settle-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.settle-total-label {
  font-size: 20px;
  font-weight: 800;
  color: #333333;
}

.settle-total-value {
  font-size: 32px;
  font-weight: 800;
}

.done-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #34C759;
  color: #ffffff;
  font-size: 32px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.done-text {
  font-size: 22px;
  font-weight: 800;
  color: #333333;
  text-align: center;
  display: block;
  margin-bottom: 8px;
}

.done-room {
  font-size: 16px;
  color: #666666;
  text-align: center;
  display: block;
  margin-bottom: 20px;
}

.done-return {
  font-size: 14px;
  color: #999999;
  text-align: center;
  display: block;
  margin-bottom: 4px;
}

.done-amount {
  font-size: 36px;
  font-weight: 800;
  text-align: center;
  display: block;
  margin-bottom: 12px;
}

.done-hint {
  font-size: 14px;
  color: #FF9500;
  text-align: center;
  display: block;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #666666;
}

.extra-note {
  font-size: 14px;
  color: #999999;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount-red {
  color: #FF3B30;
}

.amount-green {
  color: #34C759;
}
</style>
