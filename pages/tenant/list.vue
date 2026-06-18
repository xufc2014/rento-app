<template>
  <view class="page">
    <!-- 搜索 -->
    <view class="card search-card">
      <input class="search-input" v-model="keyword" placeholder="搜索租客姓名/手机号" />
    </view>

    <!-- 租客列表 -->
    <view class="card" v-if="filteredList.length > 0">
      <view
        class="tenant-item"
        v-for="item in filteredList"
        :key="item.id"
        @click="goTenant(item)"
      >
        <view class="tenant-left">
          <text class="tenant-name" :class="{ 'name-blacklist': item.isBlacklisted }">{{ item.name }}</text>
          <text class="tenant-phone">{{ item.phone || '未填手机' }}</text>
        </view>
        <view class="tenant-right">
          <text class="tag tag-red" v-if="item.isBlacklisted">黑名单</text>
          <text class="tag tag-green" v-else-if="item.currentRoom">在住</text>
          <text class="tag tag-gray" v-else>历史</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="card empty-card" v-if="filteredList.length === 0">
      <text class="empty-icon">&#128100;</text>
      <text class="empty-text">{{ keyword ? '未找到匹配租客' : '暂无租客数据' }}</text>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>

    <!-- 添加租客按钮 -->
    <view class="footer-bar">
      <view class="btn-big btn-primary" @click="goAddTenant">添加租客</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import db from '@/utils/db.js'

const keyword = ref('')
const tenants = ref([])

const filteredList = computed(() => {
  if (!keyword.value) return tenants.value
  const kw = keyword.value.toLowerCase()
  return tenants.value.filter(t =>
    (t.name && t.name.toLowerCase().includes(kw)) ||
    (t.phone && t.phone.includes(kw))
  )
})

function loadData() {
  const allTenants = db.getTenants()
  const rooms = db.getRooms()

  tenants.value = allTenants.map(t => {
    const currentRoom = rooms.find(r => r.currentTenantId === t.id && r.status === '已入住')
    return {
      ...t,
      currentRoom: currentRoom ? `${currentRoom.floor}-${currentRoom.roomNumber}` : ''
    }
  })
}

onShow(() => {
  loadData()
})

function goTenant(item) {
  if (item.currentRoom) {
    // 在住租客，可以查看/编辑
    uni.navigateTo({ url: `/pages/tenant/add?id=${item.id}` })
  } else {
    uni.navigateTo({ url: `/pages/tenant/add?id=${item.id}` })
  }
}

function goAddTenant() {
  uni.navigateTo({ url: '/pages/tenant/add' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  padding-bottom: 100px;
  background-color: #f5f5f5;
}

.search-card {
  padding: 12px 16px;
}

.search-input {
  height: 44px;
  font-size: 16px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  padding: 0 12px;
  background-color: #ffffff;
}

.tenant-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}

.tenant-item:last-child {
  border-bottom: none;
}

.tenant-left {
  flex: 1;
  min-width: 0;
}

.tenant-name {
  font-size: 18px;
  font-weight: 700;
  color: #333333;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.name-blacklist {
  color: #FF3B30;
  text-decoration: line-through;
}

.tenant-phone {
  font-size: 14px;
  color: #999999;
  display: block;
  margin-top: 2px;
}

.tenant-right {
  margin-left: 12px;
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
