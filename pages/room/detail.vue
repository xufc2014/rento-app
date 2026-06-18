<template>
  <view class="page" v-if="room">
    <!-- 基本信息 -->
    <view class="card">
      <view class="card-title">{{ buildingName }} {{ room.roomNumber }}</view>
      <view class="info-row">
        <text class="info-label">楼栋</text>
        <text class="info-value">{{ buildingName }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">楼层</text>
        <text class="info-value">{{ formatFloor(room.floor) }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">房号</text>
        <text class="info-value">{{ room.roomNumber }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">类型</text>
        <text class="info-value">{{ room.unitType }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">面积</text>
        <text class="info-value">{{ room.area || 0 }} m²</text>
      </view>
      <view class="info-row">
        <text class="info-label">基础租金</text>
        <text class="info-value amount">{{ formatAmount(room.baseRent || 0) }}</text>
      </view>
    </view>

    <!-- 水电计费 -->
    <view class="card">
      <view class="card-title">水电计费</view>
      <view class="rate-type-hint">
        <text class="hint-text">当前类型：{{ room.unitType || '民房' }}，使用该类型默认单价</text>
      </view>

      <view class="rate-display">
        <view class="rate-item">
          <text class="rate-label">水费</text>
          <text class="rate-value">{{ currentWaterRate }} 元/吨</text>
        </view>
        <view class="rate-item">
          <text class="rate-label">电费</text>
          <text class="rate-value">{{ currentElectricRate }} 元/度</text>
        </view>
      </view>

      <view class="rate-override">
        <text class="override-title">自定义单价（留空则使用类型默认值）</text>
        <view class="input-row">
          <text class="input-label">水单价（元/吨）</text>
          <input
            class="input"
            type="digit"
            v-model="waterRateInput"
            placeholder="默认"
            @blur="saveRates"
          />
        </view>
        <view class="input-row">
          <text class="input-label">电单价（元/度）</text>
          <input
            class="input"
            type="digit"
            v-model="electricRateInput"
            placeholder="默认"
            @blur="saveRates"
          />
        </view>
      </view>
    </view>

    <!-- 当前状态 -->
    <view class="card">
      <view class="card-title">当前状态</view>
      <view class="status-row">
        <text class="tag" :class="statusClass(room.status)">{{ room.status }}</text>
        <text class="status-desc" v-if="room.status === '已入住' && tenant">租客：{{ tenant.name }}</text>
        <text class="status-desc" v-if="room.status === '空置'">可出租</text>
      </view>
    </view>

    <!-- 额外押金 -->
    <view class="card" v-if="room.extraDeposit > 0">
      <view class="card-title">额外押金</view>
      <view class="info-row">
        <text class="info-label">额外押金</text>
        <text class="info-value amount-red">{{ formatAmount(room.extraDeposit) }}</text>
      </view>
      <view class="info-row" v-if="room.extraDepositNote">
        <text class="info-label">说明</text>
        <text class="info-value">{{ room.extraDepositNote }}</text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="card" v-if="room.notes">
      <view class="card-title">备注</view>
      <text class="notes-text">{{ room.notes }}</text>
    </view>

    <!-- 租客/合同信息 -->
    <view class="card" v-if="room.status === '已入住' || room.status === '退租中'">
      <view class="card-title">租客与合同</view>
      <view class="info-row" v-if="tenant">
        <text class="info-label">租客</text>
        <text class="info-value">{{ tenant.name }}</text>
      </view>
      <view class="info-row" v-if="tenant">
        <text class="info-label">电话</text>
        <text class="info-value">{{ tenant.phone || '-' }}</text>
      </view>
      <view class="info-row" v-if="contract">
        <text class="info-label">合同到期</text>
        <text class="info-value">{{ formatDateCN(contract.endDate) }}（{{ getRelativeDaysDesc(contract.endDate) }}）</text>
      </view>
      <view class="info-row" v-if="contract">
        <text class="info-label">押金</text>
        <text class="info-value">{{ formatAmount(contract.depositAmount) }}</text>
      </view>
      <view class="info-row" v-if="contract && contract.extraDeposit > 0">
        <text class="info-label">额外押金</text>
        <text class="info-value amount-red">{{ formatAmount(contract.extraDeposit) }}</text>
      </view>
      <view class="info-row" v-if="contract && contract.extraDeposit > 0">
        <text class="info-label">总押金</text>
        <text class="info-value amount-red">{{ formatAmount(contract.depositAmount + contract.extraDeposit) }}</text>
      </view>
    </view>

    <!-- 最近水电读数 -->
    <view class="card">
      <view class="card-title">最近水电读数</view>
      <view class="meter-row">
        <view class="meter-item">
          <text class="meter-label">上次水表</text>
          <text class="meter-value">{{ latestWater ? latestWater.readingValue : '--' }}</text>
          <text class="meter-date" v-if="latestWater">{{ formatDateCN(latestWater.readingDate) }}</text>
        </view>
        <view class="meter-divider"></view>
        <view class="meter-item">
          <text class="meter-label">上次电表</text>
          <text class="meter-value">{{ latestElectric ? latestElectric.readingValue : '--' }}</text>
          <text class="meter-date" v-if="latestElectric">{{ formatDateCN(latestElectric.readingDate) }}</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="card">
      <view class="card-title">快捷操作</view>
      <view class="action-grid">
        <view class="btn-big btn-primary" @click="goMeterReading">水电抄表</view>
        <view class="btn-big btn-primary" @click="goBills">查看账单</view>
        <view class="btn-big btn-success" v-if="room.status === '空置'" @click="goContract">签订合同</view>
        <view class="btn-big btn-warning" v-if="room.status === '已入住'" @click="goCheckout">退租结算</view>
        <view class="btn-big btn-warning" v-if="room.status === '退租中'" @click="markVacant">标记为空置</view>
        <view class="btn-big btn-danger" v-if="room.status === '退租中' || room.status === '空置'" @click="deleteRoom">删除房间</view>
        <view class="btn-big btn-primary" @click="goEdit">编辑房间</view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatDateCN, getRelativeDaysDesc } from '@/utils/date.js'
import { formatAmount } from '@/utils/calc.js'

// ============ 状态 ============

const roomId = ref('')
const room = ref(null)
const building = ref(null)
const tenant = ref(null)
const contract = ref(null)
const latestWater = ref(null)
const latestElectric = ref(null)
const settings = ref(null)

const waterRateInput = ref('')
const electricRateInput = ref('')

const buildingName = computed(() => building.value ? building.value.name : '未知楼栋')

const currentWaterRate = computed(() => {
  if (!roomId.value) return '-'
  return db.getRoomRate(roomId.value, 'water')
})

const currentElectricRate = computed(() => {
  if (!roomId.value) return '-'
  return db.getRoomRate(roomId.value, 'electric')
})

const statusMap = {
  '空置': 'tag-gray',
  '已预订': 'tag-orange',
  '已入住': 'tag-green',
  '退租中': 'tag-red'
}

// ============ 数据加载 ============

function loadData() {
  if (!roomId.value) return
  const r = db.getRoomById(roomId.value)
  if (!r) {
    uni.showToast({ title: '房间不存在', icon: 'none' })
    return
  }
  room.value = r
  building.value = db.getBuildings().find(b => b.id === r.buildingId) || null
  tenant.value = r.currentTenantId ? db.getTenantById(r.currentTenantId) : null
  contract.value = r.currentContractId ? db.getContractById(r.currentContractId) : null
  latestWater.value = db.getLatestReading(r.id, 'water')
  latestElectric.value = db.getLatestReading(r.id, 'electric')
  settings.value = db.getSettings()

  waterRateInput.value = r.waterRate ? String(r.waterRate) : ''
  electricRateInput.value = r.electricRate ? String(r.electricRate) : ''
}

onLoad((options) => {
  roomId.value = options.roomId || ''
  loadData()
})

onShow(() => {
  loadData()
})

// ============ 交互 ============

function statusClass(status) {
  return statusMap[status] || 'tag-gray'
}

function formatFloor(floor) {
  const n = Number(floor)
  return isNaN(n) ? `${floor}` : `${n}F`
}

function saveRates() {
  if (!room.value) return
  const waterRate = waterRateInput.value ? Number(waterRateInput.value) : null
  const electricRate = electricRateInput.value ? Number(electricRateInput.value) : null
  db.updateRoom(room.value.id, { waterRate, electricRate })
  loadData()
  uni.showToast({ title: '单价已保存', icon: 'none' })
}

function goMeterReading() {
  uni.navigateTo({ url: `/pages/meter/reading?roomId=${roomId.value}` })
}

function goBills() {
  uni.navigateTo({ url: `/pages/bill/list?roomId=${roomId.value}` })
}

function goContract() {
  uni.navigateTo({ url: `/pages/contract/add?roomId=${roomId.value}` })
}

function goCheckout() {
  uni.navigateTo({ url: `/pages/checkout/process?roomId=${roomId.value}` })
}

function goEdit() {
  uni.navigateTo({ url: `/pages/room/edit?roomId=${roomId.value}` })
}

function markVacant() {
  uni.showModal({
    title: '确认',
    content: '确定将该房间标记为"空置"吗？',
    confirmText: '确认',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        db.updateRoom(roomId.value, {
          status: '空置',
          currentTenantId: null,
          currentContractId: null
        })
        loadData()
        uni.showToast({ title: '已标记为空置', icon: 'success' })
      }
    }
  })
}

function deleteRoom() {
  const r = room.value
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${r.floor}层 ${r.roomNumber} 吗？删除后无法恢复！`,
    confirmColor: '#FF3B30',
    confirmText: '确认删除',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        const result = db.deleteRoom(r.id)
        if (result === true) {
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 800)
        } else {
          uni.showToast({ title: result.error || '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  padding-bottom: 24px;
  background-color: #f5f5f5;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 15px;
  color: #666666;
}

.info-value {
  font-size: 15px;
  color: #333333;
  font-weight: 600;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.switch-label {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.rate-type-hint {
  margin-bottom: 8px;
}

.hint-text {
  font-size: 13px;
  color: #007AFF;
  font-weight: 600;
}

.rate-display {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.rate-item {
  flex: 1;
}

.rate-label {
  font-size: 14px;
  color: #999;
  display: block;
  margin-bottom: 4px;
}

.rate-value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.rate-override {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e0e0e0;
}

.override-title {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
  display: block;
}

.input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.input-row:last-child {
  border-bottom: none;
}

.input-label {
  font-size: 15px;
  color: #666666;
}

.input {
  width: 120px;
  height: 40px;
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 16px;
  text-align: right;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-desc {
  font-size: 14px;
  color: #666666;
}

.meter-row {
  display: flex;
  align-items: center;
}

.meter-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
}

.meter-label {
  font-size: 14px;
  color: #999999;
  margin-bottom: 6px;
}

.meter-value {
  font-size: 28px;
  font-weight: 800;
  color: #333333;
}

.meter-date {
  font-size: 12px;
  color: #999999;
  margin-top: 4px;
}

.meter-divider {
  width: 1px;
  height: 48px;
  background-color: #eeeeee;
}

.action-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-grid .btn-big {
  width: 100%;
}

.bottom-placeholder {
  height: 40px;
}

.notes-text {
  font-size: 14px;
  color: #666666;
  line-height: 1.6;
}

.amount-red {
  color: #FF3B30;
}
</style>
