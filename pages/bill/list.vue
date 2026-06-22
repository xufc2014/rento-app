<template>
  <view class="page">
    <!-- 月份选择器 -->
    <view class="card month-picker">
      <view class="month-row">
        <view class="month-arrow" @click="prevMonth">
          <text class="arrow-icon">&lt;</text>
        </view>
        <text class="month-text">{{ currentMonth }}</text>
        <view class="month-arrow" @click="nextMonth">
          <text class="arrow-icon">&gt;</text>
        </view>
      </view>
    </view>

    <!-- 账单列表 -->
    <view class="card" v-if="billList.length > 0">
      <view class="bill-item" v-for="bill in billList" :key="bill.id" @click="goDetail(bill.id)">
        <view class="bill-left">
          <text class="bill-room">{{ bill.roomLabel }}</text>
          <text class="bill-tenant">{{ bill.tenantName }}</text>
        </view>
        <view class="bill-right">
          <text class="bill-amount" :class="bill.status === '已支付' ? 'amount-green' : 'amount-red'">
            {{ formatAmount(bill.totalAmount + bill.lateFee) }}
          </text>
          <text class="tag" :class="statusClass(bill)">{{ statusText(bill) }}</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="card empty-card" v-if="billList.length === 0">
      <text class="empty-icon">&#128203;</text>
      <text class="empty-text">该月暂无账单</text>
    </view>

    <!-- 底部统计 -->
    <view class="card stats-card" v-if="billList.length > 0">
      <view class="stats-row">
        <view class="stats-item">
          <text class="stats-label">已收总额</text>
          <text class="amount-green stats-amount">{{ formatAmount(totalPaid) }}</text>
        </view>
        <view class="stats-divider"></view>
        <view class="stats-item">
          <text class="stats-label">未收总额</text>
          <text class="amount-red stats-amount">{{ formatAmount(totalUnpaid) }}</text>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>

    <!-- 查看账单按钮 -->
    <view class="footer-bar">
      <view class="btn-big btn-primary" @click="viewCurrentMonth">查看账单</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { getCurrentMonth } from '@/utils/date.js'
import { formatAmount } from '@/utils/calc.js'

const currentMonth = ref(getCurrentMonth())
const billList = ref([])

// 月份切换
function prevMonth() {
  const [year, month] = currentMonth.value.split('-').map(Number)
  if (month === 1) {
    currentMonth.value = `${year - 1}-12`
  } else {
    currentMonth.value = `${year}-${String(month - 1).padStart(2, '0')}`
  }
  loadData()
}

function nextMonth() {
  const [year, month] = currentMonth.value.split('-').map(Number)
  if (month === 12) {
    currentMonth.value = `${year + 1}-01`
  } else {
    currentMonth.value = `${year}-${String(month + 1).padStart(2, '0')}`
  }
  loadData()
}

// 统计
const totalPaid = computed(() => {
  return billList.value
    .filter(b => b.status === '已支付')
    .reduce((sum, b) => sum + b.totalAmount + b.lateFee, 0)
})

const totalUnpaid = computed(() => {
  return billList.value
    .filter(b => b.status !== '已支付')
    .reduce((sum, b) => sum + b.totalAmount + b.lateFee, 0)
})

// 状态相关
function statusClass(bill) {
  if (bill.status === '已支付') return 'tag-green'
  if (bill.status === '逾期') return 'tag-gray'
  return 'tag-red'
}

function statusText(bill) {
  if (bill.status === '已支付') return '已支付'
  if (bill.status === '逾期') return `逾期+¥${bill.lateFee}`
  return '未支付'
}

// 数据加载
function loadData() {
  db.updateLateFees()
  const bills = db.getBillsByMonth(currentMonth.value)
  const rooms = db.getRooms()
  const tenants = db.getTenants()
  const buildings = db.getBuildings()

  billList.value = bills.map(bill => {
    const room = rooms.find(r => r.id === bill.roomId) || {}
    const tenant = tenants.find(t => t.id === bill.tenantId) || {}
    const building = buildings.find(b => b.id === room.buildingId) || {}
    return {
      ...bill,
      roomLabel: `${building.name || ''} ${room.floor || ''}-${room.roomNumber || ''}`,
      tenantName: tenant.name || '未知租客'
    }
  })
}

onShow(() => {
  currentMonth.value = getCurrentMonth()
  loadData()
})

function goDetail(billId) {
  uni.navigateTo({ url: `/pages/bill/detail?id=${billId}` })
}

function viewCurrentMonth() {
  loadData()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  padding-bottom: 100px;
  background-color: #f5f5f5;
}

.month-picker {
  padding: 12px 16px;
}

.month-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.month-arrow {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-icon {
  font-size: 20px;
  color: #007AFF;
  font-weight: 700;
}

.month-text {
  font-size: 20px;
  font-weight: 700;
  color: #333333;
  margin: 0 24px;
}

.bill-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}

.bill-item:last-child {
  border-bottom: none;
}

.bill-left {
  flex: 1;
  min-width: 0;
}

.bill-room {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bill-tenant {
  font-size: 14px;
  color: #999999;
  margin-top: 2px;
  display: block;
}

.bill-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 12px;
}

.bill-amount {
  font-size: 18px;
  font-weight: 800;
}

.stats-card {
  padding: 16px;
}

.stats-row {
  display: flex;
  align-items: center;
}

.stats-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-label {
  font-size: 14px;
  color: #999999;
  margin-bottom: 6px;
}

.stats-amount {
  font-size: 22px;
}

.stats-divider {
  width: 1px;
  height: 40px;
  background-color: #eeeeee;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 16px;
  color: #999999;
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
