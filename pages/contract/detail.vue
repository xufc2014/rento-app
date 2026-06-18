<template>
  <view class="page">
    <view v-if="contract">
      <!-- 合同基本信息 -->
      <view class="card">
        <view class="info-header">
          <text class="info-room">{{ roomLabel }}</text>
          <text class="tag" :class="statusTagClass">{{ contract.status }}</text>
        </view>

        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">租客</text>
            <text class="info-value">{{ tenantName }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">开始日期</text>
            <text class="info-value">{{ formatDateCN(contract.startDate) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">结束日期</text>
            <text class="info-value">{{ formatDateCN(contract.endDate) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">月租金</text>
            <text class="info-value amount-red">{{ formatAmount(contract.rentAmount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">押金</text>
            <text class="info-value">{{ formatAmount(contract.depositAmount) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">押金规则</text>
            <text class="info-value">{{ contract.depositRule }}</text>
          </view>
        </view>
      </view>

      <!-- 到期倒计时 -->
      <view class="card" v-if="contract.status === '活跃'">
        <view class="countdown">
          <text class="countdown-label">到期倒计时</text>
          <text class="countdown-days" :class="expireClass">{{ expireDays }}</text>
          <text class="countdown-desc">{{ expireDesc }}</text>
        </view>
      </view>

      <!-- 底部占位 -->
      <view class="bottom-placeholder"></view>

      <!-- 操作按钮 -->
      <view class="footer-bar" v-if="contract.status === '活跃'">
        <view class="btn-big btn-warning" @click="showRenewPanel = true">续签合同</view>
        <view class="btn-big btn-danger" @click="goCheckout">退租结算</view>
      </view>
    </view>

    <!-- 续签面板 -->
    <view class="modal-mask" v-if="showRenewPanel" @click="showRenewPanel = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">续签合同</view>

        <view class="form-label">新开始日期</view>
        <picker mode="date" :value="renewStartDate" @change="e => renewStartDate = e.detail.value">
          <text class="date-value">{{ renewStartDate || '请选择' }}</text>
        </picker>

        <view class="form-label" style="margin-top: 12px;">新结束日期</view>
        <picker mode="date" :value="renewEndDate" @change="e => renewEndDate = e.detail.value">
          <text class="date-value">{{ renewEndDate || '请选择' }}</text>
        </picker>

        <view class="quick-dates" style="margin-top: 10px;">
          <view class="quick-date-btn" @click="setRenewQuick(6)">半年</view>
          <view class="quick-date-btn" @click="setRenewQuick(12)">一年</view>
          <view class="quick-date-btn" @click="setRenewQuick(24)">两年</view>
        </view>

        <view class="form-label" style="margin-top: 16px;">月租金（可微调）</view>
        <input class="input-big" type="digit" v-model="renewRentAmount" />

        <view class="btn-big btn-primary" style="margin-top: 20px;" @click="doRenew">确认续签</view>
        <view class="btn-big btn-secondary" style="margin-top: 10px;" @click="showRenewPanel = false">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatDateCN, daysFromNow, getRelativeDaysDesc } from '@/utils/date.js'
import { formatAmount } from '@/utils/calc.js'

const contractId = ref('')
const contract = ref(null)
const roomLabel = ref('')
const tenantName = ref('')

// 续签面板
const showRenewPanel = ref(false)
const renewStartDate = ref('')
const renewEndDate = ref('')
const renewRentAmount = ref('')

// 到期信息
const expireDays = computed(() => {
  if (!contract.value || contract.value.status !== '活跃') return ''
  return daysFromNow(contract.value.endDate)
})

const expireDesc = computed(() => {
  if (!contract.value || contract.value.status !== '活跃') return ''
  return getRelativeDaysDesc(contract.value.endDate)
})

const expireClass = computed(() => {
  const days = expireDays.value
  if (typeof days !== 'number') return ''
  if (days <= 0) return 'expire-overdue'
  if (days <= 15) return 'expire-soon'
  return 'expire-normal'
})

const statusTagClass = computed(() => {
  if (!contract.value) return 'tag-gray'
  if (contract.value.status === '活跃') return 'tag-green'
  if (contract.value.status === '已续签') return 'tag-blue'
  return 'tag-gray'
})

onLoad((options) => {
  if (options.id) {
    contractId.value = options.id
    loadContract()
  }
})

function loadContract() {
  const c = db.getContractById(contractId.value)
  if (!c) {
    uni.showToast({ title: '合同不存在', icon: 'none' })
    return
  }
  contract.value = c

  const room = db.getRoomById(c.roomId) || {}
  const building = room ? (db.getBuildings().find(b => b.id === room.buildingId) || {}) : {}
  roomLabel.value = `${building.name || ''} ${room.floor || ''}-${room.roomNumber || ''}`

  const tenant = db.getTenantById(c.tenantId)
  tenantName.value = tenant ? tenant.name : '未知租客'

  // 初始化续签数据
  renewStartDate.value = c.endDate
  renewRentAmount.value = String(c.rentAmount)
}

function setRenewQuick(months) {
  const start = renewStartDate.value ? new Date(renewStartDate.value) : new Date()
  const end = new Date(start)
  end.setMonth(end.getMonth() + months)
  renewStartDate.value = formatDateStr(start)
  renewEndDate.value = formatDateStr(end)
}

function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function doRenew() {
  if (!renewStartDate.value || !renewEndDate.value) {
    uni.showToast({ title: '请选择日期', icon: 'none' })
    return
  }

  const result = db.renewContract(contractId.value, {
    startDate: renewStartDate.value,
    endDate: renewEndDate.value,
    rentAmount: Number(renewRentAmount.value) || contract.value.rentAmount
  })

  if (result.error) {
    uni.showToast({ title: result.error, icon: 'none' })
    return
  }

  showRenewPanel.value = false
  uni.showToast({ title: '续签成功', icon: 'success' })
  // 跳转到新合同详情
  setTimeout(() => {
    uni.redirectTo({ url: `/pages/contract/detail?id=${result.id}` })
  }, 1500)
}

function goCheckout() {
  if (!contract.value) return
  uni.navigateTo({
    url: `/pages/checkout/process?roomId=${contract.value.roomId}`
  })
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
  margin-bottom: 16px;
}

.info-room {
  font-size: 22px;
  font-weight: 800;
  color: #333333;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
}

.info-item {
  width: 50%;
  padding: 8px 0;
}

.info-label {
  font-size: 13px;
  color: #999999;
  display: block;
  margin-bottom: 2px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  display: block;
}

.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
}

.countdown-label {
  font-size: 14px;
  color: #999999;
  margin-bottom: 8px;
}

.countdown-days {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.1;
}

.expire-normal {
  color: #34C759;
}

.expire-soon {
  color: #FF9500;
}

.expire-overdue {
  color: #FF3B30;
}

.countdown-desc {
  font-size: 14px;
  color: #999999;
  margin-top: 4px;
}

.form-label {
  font-size: 16px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 8px;
}

.date-value {
  font-size: 17px;
  font-weight: 700;
  color: #007AFF;
  padding: 10px 0;
  display: block;
}

.quick-dates {
  display: flex;
  gap: 10px;
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

.input-big {
  height: 48px;
  font-size: 18px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  padding: 0 12px;
  background-color: #ffffff;
}

.bottom-placeholder {
  height: 100px;
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
  display: flex;
  gap: 12px;
}

.footer-bar .btn-big {
  flex: 1;
}

/* 弹窗样式 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.modal-content {
  width: 100%;
  background-color: #ffffff;
  border-radius: 16px 16px 0 0;
  padding: 24px 16px 32px;
}

.modal-title {
  font-size: 20px;
  font-weight: 800;
  color: #333333;
  margin-bottom: 16px;
  text-align: center;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #666666;
}
</style>
