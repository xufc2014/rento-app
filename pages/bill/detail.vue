<template>
  <view class="page">
    <view class="card" v-if="bill">
      <!-- 房间和租客 -->
      <view class="info-header">
        <text class="info-room">{{ roomLabel }}</text>
        <text class="tag" :class="statusTagClass">{{ bill.status }}</text>
      </view>
      <text class="info-tenant">租客：{{ tenantName }}</text>
      <text class="info-month">账期：{{ bill.month }}</text>
    </view>

    <!-- 费用明细 -->
    <view class="card" v-if="bill">
      <view class="form-label">费用明细</view>

      <!-- 房租 -->
      <view class="detail-row">
        <text class="detail-label">房租</text>
        <text class="detail-value">{{ formatAmount(bill.rentAmount) }}</text>
      </view>

      <!-- 水费 -->
      <view class="detail-row">
        <view class="detail-left">
          <text class="detail-label">水费</text>
          <text class="detail-sub" v-if="waterInfo">{{ waterInfo }}</text>
        </view>
        <text class="detail-value">{{ formatAmount(bill.waterFee) }}</text>
      </view>
      <view class="meter-photo" v-if="waterPhoto">
        <image :src="waterPhoto" mode="widthFix" class="photo-thumb" @click="previewImage(waterPhoto)" />
      </view>

      <!-- 电费 -->
      <view class="detail-row">
        <view class="detail-left">
          <text class="detail-label">电费</text>
          <text class="detail-sub" v-if="electricInfo">{{ electricInfo }}</text>
        </view>
        <text class="detail-value">{{ formatAmount(bill.electricFee) }}</text>
      </view>
      <view class="meter-photo" v-if="electricPhoto">
        <image :src="electricPhoto" mode="widthFix" class="photo-thumb" @click="previewImage(electricPhoto)" />
      </view>

      <!-- 网费 -->
      <view class="detail-row">
        <text class="detail-label">网费</text>
        <text class="detail-value">{{ formatAmount(bill.internetFee) }}</text>
      </view>

      <!-- 卫生费 -->
      <view class="detail-row" v-if="bill.sanitationFee > 0">
        <text class="detail-label">卫生费</text>
        <text class="detail-value">{{ formatAmount(bill.sanitationFee) }}</text>
      </view>

      <!-- 管理费 -->
      <view class="detail-row" v-if="bill.managementFee > 0">
        <text class="detail-label">管理费</text>
        <text class="detail-value">{{ formatAmount(bill.managementFee) }}</text>
      </view>

      <!-- 其他费用 -->
      <view class="detail-row" v-if="bill.otherFee > 0">
        <text class="detail-label">其他费用</text>
        <text class="detail-value">{{ formatAmount(bill.otherFee) }}</text>
      </view>

      <!-- 减免 -->
      <view class="detail-row" v-if="bill.deduction > 0">
        <text class="detail-label">减免</text>
        <text class="detail-value amount-green">-{{ formatAmount(bill.deduction) }}</text>
      </view>
      <text class="deduction-reason" v-if="bill.deductionReason">原因：{{ bill.deductionReason }}</text>

      <view class="divider"></view>

      <!-- 总额 -->
      <view class="detail-row total-row">
        <text class="detail-label total-label">应付总额</text>
        <text class="total-value">{{ formatAmount(bill.totalAmount) }}</text>
      </view>
    </view>

    <!-- 滞纳金 -->
    <view class="card card-alert" v-if="bill && bill.lateFee > 0">
      <view class="detail-row">
        <text class="detail-label" style="color:#FF3B30;">滞纳金</text>
        <text class="detail-value amount-red">{{ formatAmount(bill.lateFee) }}</text>
      </view>
      <text class="late-fee-desc">逾期按 ¥{{ lateFeePerDay }}/天 计算</text>
    </view>

    <!-- 应付总计 -->
    <view class="card" v-if="bill && bill.lateFee > 0">
      <view class="detail-row total-row">
        <text class="detail-label total-label">应付总计（含滞纳金）</text>
        <text class="total-value amount-red">{{ formatAmount(bill.totalAmount + bill.lateFee) }}</text>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>

    <!-- 支付状态切换 -->
    <view class="footer-bar" v-if="bill">
      <view
        class="btn-big"
        :class="bill.status === '已支付' ? 'btn-success' : 'btn-danger'"
        @click="togglePaid"
      >
        {{ bill.status === '已支付' ? '已支付 - 点击标记未支付' : '未支付 - 点击标记已支付' }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatAmount } from '@/utils/calc.js'

const billId = ref('')
const bill = ref(null)
const roomLabel = ref('')
const tenantName = ref('')
const waterInfo = ref('')
const electricInfo = ref('')
const waterPhoto = ref('')
const electricPhoto = ref('')
const lateFeePerDay = ref(5)

const statusTagClass = computed(() => {
  if (!bill.value) return 'tag-gray'
  if (bill.value.status === '已支付') return 'tag-green'
  if (bill.value.status === '逾期') return 'tag-gray'
  return 'tag-red'
})

onLoad((options) => {
  if (options.id) {
    billId.value = options.id
    loadBill()
  }
})

function loadBill() {
  const b = db.getBillById(billId.value)
  if (!b) {
    uni.showToast({ title: '账单不存在', icon: 'none' })
    return
  }
  bill.value = b

  // 房间信息
  const room = db.getRoomById(b.roomId) || {}
  const building = room ? (db.getBuildings().find(bd => bd.id === room.buildingId) || {}) : {}
  roomLabel.value = `${building.name || ''} ${room.floor || ''}-${room.roomNumber || ''}`

  // 租客
  const tenant = db.getTenantById(b.tenantId)
  tenantName.value = tenant ? tenant.name : '未知租客'

  // 水电读数信息
  const waterReading = db.getLatestReading(b.roomId, 'water')
  if (waterReading) {
    waterInfo.value = `上次${waterReading.previousValue} → 本次${waterReading.readingValue}，用量${waterReading.consumption}`
    waterPhoto.value = waterReading.photoPath || ''
  }

  const electricReading = db.getLatestReading(b.roomId, 'electric')
  if (electricReading) {
    electricInfo.value = `上次${electricReading.previousValue} → 本次${electricReading.readingValue}，用量${electricReading.consumption}`
    electricPhoto.value = electricReading.photoPath || ''
  }

  // 滞纳金设置
  const settings = db.getSettings()
  lateFeePerDay.value = settings.lateFeePerDay || 5
}

function togglePaid() {
  if (!bill.value) return
  if (bill.value.status === '已支付') {
    // 标记为未支付
    const bills = db.getBills()
    const idx = bills.findIndex(b => b.id === billId.value)
    if (idx !== -1) {
      bills[idx].status = '未支付'
      bills[idx].paidAt = null
      bills[idx].lateFee = 0  // 重置滞纳金
      db.set('rento_bills', bills)
      db.logOperation('取消支付标记', 'bill', billId.value, `¥${bills[idx].totalAmount}`)
      bill.value.status = '未支付'
      bill.value.paidAt = null
      bill.value.lateFee = 0
    }
    uni.showToast({ title: '已标记为未支付', icon: 'none' })
  } else {
    db.markBillPaid(billId.value)
    bill.value.status = '已支付'
    bill.value.paidAt = new Date().toISOString()
    uni.showToast({ title: '已标记为已支付', icon: 'success' })
  }
}

function previewImage(url) {
  uni.previewImage({ urls: [url], current: url })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  padding-bottom: 100px;
  background-color: #f5f5f5;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.info-room {
  font-size: 20px;
  font-weight: 800;
  color: #333333;
}

.info-tenant {
  font-size: 15px;
  color: #666666;
  display: block;
  margin-bottom: 4px;
}

.info-month {
  font-size: 14px;
  color: #999999;
  display: block;
}

.form-label {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-left {
  flex: 1;
  min-width: 0;
}

.detail-label {
  font-size: 16px;
  color: #333333;
}

.detail-sub {
  font-size: 12px;
  color: #999999;
  display: block;
  margin-top: 2px;
}

.detail-value {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin-left: 12px;
}

.meter-photo {
  margin: 4px 0 8px;
}

.photo-thumb {
  width: 80px;
  height: 60px;
  border-radius: 6px;
  background-color: #f5f5f5;
}

.deduction-reason {
  font-size: 13px;
  color: #999999;
  display: block;
  margin-top: -4px;
  margin-bottom: 8px;
}

.total-row {
  border-bottom: none;
}

.total-label {
  font-size: 18px;
  font-weight: 800;
}

.total-value {
  font-size: 22px;
  font-weight: 800;
  color: #FF3B30;
}

.card-alert {
  border-left: 4px solid #FF3B30;
}

.late-fee-desc {
  font-size: 13px;
  color: #FF3B30;
  display: block;
  margin-top: 4px;
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
