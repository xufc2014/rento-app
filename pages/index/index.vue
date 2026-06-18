<template>
  <view class="page">
    <!-- 异常预警 - 置顶高亮 -->
    <view class="card card-alert" v-if="anomalyList.length > 0">
      <view class="card-title card-title-danger">
        <text class="card-title-icon">!</text>
        异常预警
      </view>
      <view class="alert-item" v-for="item in anomalyList" :key="item.id"
            @click="goMeterHistory(item.roomId)">
        <view class="alert-top">
          <text class="tag tag-red">{{ item.meterType === 'water' ? '水表' : '电表' }}</text>
          <text class="alert-text">{{ item.buildingName }} {{ item.roomLabel }}</text>
        </view>
        <text class="alert-desc">{{ item.anomalyType }}</text>
      </view>
    </view>

    <!-- 今日待办 -->
    <view class="card">
      <view class="card-title card-title-danger">今日待办</view>

      <!-- 合同到期提醒 -->
      <view class="section" v-if="contractList.length > 0">
        <text class="section-label">合同到期提醒</text>
        <view class="todo-item" v-for="item in contractList" :key="'c-' + item.id"
              @click="goContract(item.id)">
          <view class="todo-left">
            <text class="todo-name">{{ item.tenantName }} · {{ item.buildingName }} {{ item.roomLabel }}</text>
            <text class="todo-date">到期日: {{ formatDateCN(item.endDate) }}</text>
          </view>
          <text class="tag tag-red">{{ item.daysDesc }}</text>
        </view>
      </view>

      <view class="divider" v-if="contractList.length > 0 && overdueBillList.length > 0"></view>

      <!-- 逾期未交租 -->
      <view class="section" v-if="overdueBillList.length > 0">
        <text class="section-label">逾期未交租</text>
        <view class="todo-item" v-for="item in overdueBillList" :key="'b-' + item.id"
              @click="goBill(item.id)">
          <view class="todo-left">
            <text class="todo-name">{{ item.tenantName }} · {{ item.buildingName }} {{ item.roomLabel }}</text>
            <text class="todo-date">{{ item.month }}月 · {{ item.billStatusText }}</text>
          </view>
          <text class="amount-red">{{ formatAmount(item.totalAmount + item.lateFee) }}</text>
        </view>
      </view>

      <!-- 无待办 -->
      <view class="empty" v-if="contractList.length === 0 && overdueBillList.length === 0">
        <text class="empty-icon">&#10003;</text>
        <text class="empty-text">暂无待办事项</text>
      </view>
    </view>

    <!-- 本月资金流水速览 -->
    <view class="card">
      <view class="card-title">本月资金流水 ({{ dashboard.currentMonth }})</view>
      <view class="cash-flow">
        <view class="cash-item">
          <text class="cash-label">已收</text>
          <text class="amount amount-green">{{ formatAmount(dashboard.totalReceived) }}</text>
        </view>
        <view class="cash-divider"></view>
        <view class="cash-item">
          <text class="cash-label">待收</text>
          <text class="amount amount-red">{{ formatAmount(dashboard.totalPending) }}</text>
        </view>
      </view>
    </view>

    <!-- 房间概况 -->
    <view class="card" @click="goRoomList">
      <view class="card-title">房间概况</view>
      <view class="room-overview">
        <view class="room-stat">
          <text class="room-num room-num-vacant">{{ dashboard.vacantCount }}</text>
          <text class="room-label">空置</text>
        </view>
        <view class="room-stat">
          <text class="room-num room-num-occupied">{{ dashboard.occupiedCount }}</text>
          <text class="room-label">已入住</text>
        </view>
        <view class="room-stat">
          <text class="room-num room-num-total">{{ dashboard.totalRooms }}</text>
          <text class="room-label">总计</text>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="card">
      <view class="card-title">快捷操作</view>
      <view class="quick-actions">
        <view class="btn-big btn-primary" @click="goMeterReading">水电抄表</view>
        <view class="btn-big btn-primary" @click="goGenerateBill">生成账单</view>
        <view class="btn-big btn-primary" @click="goAddContract">签订合同</view>
        <view class="btn-big btn-secondary" @click="goContractList">合同管理</view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatDateCN, getRelativeDaysDesc } from '@/utils/date.js'
import { formatAmount } from '@/utils/calc.js'

// ============ 状态 ============

const dashboard = reactive({
  expiringContracts: [],
  overdueBills: [],
  totalReceived: 0,
  totalPending: 0,
  anomalyReadings: [],
  vacantCount: 0,
  occupiedCount: 0,
  totalRooms: 0,
  currentMonth: ''
})

const loading = ref(true)

// ============ 计算属性：增强数据 ============

const todayDate = computed(() => {
  return formatDateCN(new Date())
})

// 合同列表（带房间/楼栋/租客信息）
const contractList = computed(() => {
  const buildings = db.getBuildings()
  const rooms = db.getRooms()
  const tenants = db.getTenants()

  return dashboard.expiringContracts.map(c => {
    const room = rooms.find(r => r.id === c.roomId) || {}
    const building = buildings.find(b => b.id === room.buildingId) || {}
    const tenant = tenants.find(t => t.id === c.tenantId) || {}

    return {
      ...c,
      buildingName: building.name || '未知楼栋',
      roomLabel: `${room.floor || '?'}-${room.roomNumber || '?'}`,
      tenantName: tenant.name || '未知租客',
      daysDesc: getRelativeDaysDesc(c.endDate)
    }
  })
})

// 逾期账单列表（带房间/楼栋/租客信息）
const overdueBillList = computed(() => {
  const buildings = db.getBuildings()
  const rooms = db.getRooms()
  const tenants = db.getTenants()

  return dashboard.overdueBills.map(b => {
    const room = rooms.find(r => r.id === b.roomId) || {}
    const building = buildings.find(bd => bd.id === room.buildingId) || {}
    const tenant = tenants.find(t => t.id === b.tenantId) || {}

    return {
      ...b,
      buildingName: building.name || '未知楼栋',
      roomLabel: `${room.floor || '?'}-${room.roomNumber || '?'}`,
      tenantName: tenant.name || '未知租客',
      billStatusText: b.status === '逾期' ? '已逾期' : '未支付'
    }
  })
})

// 异常读数列表（带房间/楼栋信息）
const anomalyList = computed(() => {
  const buildings = db.getBuildings()
  const rooms = db.getRooms()

  return dashboard.anomalyReadings.map(r => {
    const room = rooms.find(rm => rm.id === r.roomId) || {}
    const building = buildings.find(b => b.id === room.buildingId) || {}

    return {
      ...r,
      buildingName: building.name || '未知楼栋',
      roomLabel: `${room.floor || '?'}-${room.roomNumber || '?'}`
    }
  })
})

// ============ 数据加载 ============

function loadData() {
  loading.value = true
  try {
    const data = db.getDashboardData()
    Object.assign(dashboard, data)
  } catch (e) {
    console.error('加载看板数据失败:', e)
  } finally {
    loading.value = false
  }
}

// ============ 页面生命周期 ============

onShow(() => {
  loadData()
})

// 下拉刷新
onPullDownRefresh(() => {
  loadData()
  uni.stopPullDownRefresh()
})

// ============ 页面跳转 ============

function goContract(contractId) {
  uni.navigateTo({
    url: `/pages/contract/detail?id=${contractId}`
  })
}

function goBill(billId) {
  uni.navigateTo({
    url: `/pages/bill/detail?id=${billId}`
  })
}

function goMeterHistory(roomId) {
  uni.navigateTo({
    url: `/pages/meter/history?roomId=${roomId}`
  })
}

function goRoomList() {
  uni.switchTab({
    url: '/pages/room/list'
  })
}

function goMeterReading() {
  uni.navigateTo({
    url: '/pages/meter/reading'
  })
}

function goGenerateBill() {
  uni.navigateTo({
    url: '/pages/bill/generate'
  })
}

function goAddContract() {
  uni.navigateTo({
    url: '/pages/contract/add'
  })
}

function goContractList() {
  uni.navigateTo({
    url: '/pages/contract/list'
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  background-color: #f5f5f5;
}

/* ========== 异常预警卡片 ========== */
.card-alert {
  border-left: 4px solid #FF3B30;
}

.card-title {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 12px;
}

.card-title-danger {
  color: #FF3B30;
}

.card-title-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  line-height: 20px;
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  background-color: #FF3B30;
  border-radius: 50%;
  text-align: center;
  margin-right: 6px;
  vertical-align: middle;
}

.alert-item {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-top {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.alert-text {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  margin-left: 8px;
}

.alert-desc {
  font-size: 14px;
  color: #FF3B30;
}

/* ========== 今日待办 ========== */
.section {
  padding: 4px 0;
}

.section-label {
  font-size: 14px;
  color: #999999;
  margin-bottom: 8px;
  display: block;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-left {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.todo-name {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-date {
  font-size: 13px;
  color: #999999;
  margin-top: 2px;
  display: block;
}

/* ========== 空状态 ========== */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.empty-icon {
  font-size: 36px;
  color: #34C759;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 15px;
  color: #999999;
}

/* ========== 资金流水 ========== */
.cash-flow {
  display: flex;
  align-items: center;
}

.cash-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
}

.cash-label {
  font-size: 14px;
  color: #999999;
  margin-bottom: 8px;
}

.cash-item .amount {
  font-size: 24px;
  font-weight: 800;
}

.cash-divider {
  width: 1px;
  height: 48px;
  background-color: #EEEEEE;
}

/* ========== 房间概况 ========== */
.room-overview {
  display: flex;
}

.room-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.room-num {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.2;
}

.room-num-vacant {
  color: #999999;
}

.room-num-occupied {
  color: #34C759;
}

.room-num-total {
  color: #333333;
}

.room-label {
  font-size: 14px;
  color: #999999;
  margin-top: 4px;
}

/* ========== 快捷操作 ========== */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions .btn-big {
  width: 100%;
}

/* ========== 底部占位 ========== */
.bottom-placeholder {
  height: 120px;
}
</style>
