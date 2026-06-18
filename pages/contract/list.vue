<template>
  <view class="page">
    <!-- Tab切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <view class="tab-badge" v-if="tab.count > 0">
          <text class="badge-text">{{ tab.count }}</text>
        </view>
      </view>
    </view>

    <!-- 合同列表 -->
    <view class="card" v-if="filteredContracts.length > 0">
      <view
        class="contract-item"
        v-for="item in filteredContracts"
        :key="item.id"
        @click="goDetail(item.id)"
      >
        <view class="contract-top">
          <text class="contract-room">{{ item.roomLabel }}</text>
          <text class="tag" :class="statusClass(item)">{{ item.status }}</text>
        </view>
        <view class="contract-info">
          <text class="contract-tenant">{{ item.tenantName }}</text>
          <text class="contract-date">{{ formatDateCN(item.startDate) }} ~ {{ formatDateCN(item.endDate) }}</text>
        </view>
        <view class="contract-bottom">
          <text class="contract-rent">月租 {{ formatAmount(item.rentAmount) }}</text>
          <text class="contract-expire" v-if="item.expireDesc" :class="{ 'expire-warn': item.isExpiring }">
            {{ item.expireDesc }}
          </text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="card empty-card" v-if="filteredContracts.length === 0">
      <text class="empty-icon">&#128196;</text>
      <text class="empty-text">暂无{{ tabs.find(t => t.key === activeTab)?.label }}合同</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatDateCN, daysFromNow, getRelativeDaysDesc } from '@/utils/date.js'
import { formatAmount } from '@/utils/calc.js'

const activeTab = ref('active')
const contracts = ref([])

const tabs = computed(() => [
  { key: 'active', label: '活跃', count: contracts.value.filter(c => c.status === '活跃').length },
  { key: 'expiring', label: '即将到期', count: contracts.value.filter(c => c.status === '活跃' && c.isExpiring).length },
  { key: 'history', label: '历史', count: contracts.value.filter(c => c.status !== '活跃').length }
])

const filteredContracts = computed(() => {
  if (activeTab.value === 'active') {
    return contracts.value.filter(c => c.status === '活跃')
  } else if (activeTab.value === 'expiring') {
    return contracts.value.filter(c => c.status === '活跃' && c.isExpiring)
  } else {
    return contracts.value.filter(c => c.status !== '活跃')
  }
})

function statusClass(item) {
  if (item.status === '活跃') {
    return item.isExpiring ? 'tag-orange' : 'tag-green'
  }
  if (item.status === '已续签') return 'tag-blue'
  if (item.status === '历史') return 'tag-gray'
  return 'tag-gray'
}

function loadData() {
  const allContracts = db.getContracts()
  const rooms = db.getRooms()
  const tenants = db.getTenants()
  const buildings = db.getBuildings()

  contracts.value = allContracts.map(c => {
    const room = rooms.find(r => r.id === c.roomId) || {}
    const tenant = tenants.find(t => t.id === c.tenantId) || {}
    const building = buildings.find(b => b.id === room.buildingId) || {}

    const days = daysFromNow(c.endDate)
    const isExpiring = days > 0 && days <= 30

    return {
      ...c,
      roomLabel: `${building.name || ''} ${room.floor || ''}-${room.roomNumber || ''}`,
      tenantName: tenant.name || '未知租客',
      isExpiring,
      expireDesc: c.status === '活跃' ? getRelativeDaysDesc(c.endDate) : ''
    }
  }).sort((a, b) => {
    // 活跃合同优先，然后按到期日排序
    if (a.status === '活跃' && b.status !== '活跃') return -1
    if (a.status !== '活跃' && b.status === '活跃') return 1
    return new Date(a.endDate) - new Date(b.endDate)
  })
}

onShow(() => {
  loadData()
})

function goDetail(contractId) {
  uni.navigateTo({ url: `/pages/contract/detail?id=${contractId}` })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 0;
  background-color: #f5f5f5;
}

.tab-bar {
  display: flex;
  background-color: #ffffff;
  border-bottom: 1px solid #eeeeee;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 0;
  position: relative;
  border-bottom: 3px solid transparent;
}

.tab-item.active {
  border-bottom-color: #007AFF;
}

.tab-text {
  font-size: 16px;
  color: #999999;
  font-weight: 600;
}

.tab-item.active .tab-text {
  color: #007AFF;
  font-weight: 700;
}

.tab-badge {
  background-color: #FF3B30;
  border-radius: 10px;
  padding: 1px 6px;
  margin-left: 4px;
}

.badge-text {
  font-size: 11px;
  color: #ffffff;
  font-weight: 700;
}

.contract-item {
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}

.contract-item:last-child {
  border-bottom: none;
}

.contract-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.contract-room {
  font-size: 18px;
  font-weight: 800;
  color: #333333;
}

.contract-info {
  margin-bottom: 6px;
}

.contract-tenant {
  font-size: 15px;
  color: #666666;
  display: block;
  margin-bottom: 2px;
}

.contract-date {
  font-size: 13px;
  color: #999999;
  display: block;
}

.contract-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contract-rent {
  font-size: 15px;
  font-weight: 600;
  color: #007AFF;
}

.contract-expire {
  font-size: 13px;
  color: #999999;
}

.expire-warn {
  color: #FF9500;
  font-weight: 700;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  margin-top: 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 16px;
  color: #999999;
}
</style>
