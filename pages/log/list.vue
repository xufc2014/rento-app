<template>
  <view class="page">
    <!-- 搜索过滤 -->
    <view class="card search-card">
      <input class="search-input" v-model="keyword" placeholder="搜索操作类型或详情" />
    </view>

    <!-- 日志列表 -->
    <view class="card" v-if="filteredList.length > 0">
      <view class="log-item" v-for="item in filteredList" :key="item.id">
        <view class="log-top">
          <text class="tag" :class="actionClass(item.action)">{{ item.action }}</text>
          <text class="log-time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <text class="log-detail">{{ item.detail }}</text>
        <text class="log-target" v-if="item.targetType">{{ item.targetType }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="card empty-card" v-if="filteredList.length === 0">
      <text class="empty-icon">&#128203;</text>
      <text class="empty-text">{{ keyword ? '未找到匹配记录' : '暂无操作日志' }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import db from '@/utils/db.js'

const keyword = ref('')
const logs = ref([])

const filteredList = computed(() => {
  if (!keyword.value) return logs.value
  const kw = keyword.value.toLowerCase()
  return logs.value.filter(l =>
    (l.action && l.action.toLowerCase().includes(kw)) ||
    (l.detail && l.detail.toLowerCase().includes(kw)) ||
    (l.targetType && l.targetType.toLowerCase().includes(kw))
  )
})

// 操作类型颜色映射
const actionColorMap = {
  '添加楼栋': 'tag-blue',
  '更新楼栋': 'tag-blue',
  '删除楼栋': 'tag-red',
  '添加房间': 'tag-blue',
  '批量添加房间': 'tag-blue',
  '修改租金': 'tag-orange',
  '添加租客': 'tag-green',
  '签订合同': 'tag-green',
  '续签合同': 'tag-green',
  '退租结算': 'tag-orange',
  '抄表录入': 'tag-blue',
  '生成账单': 'tag-blue',
  '标记支付': 'tag-green',
  '更新设置': 'tag-gray'
}

function actionClass(action) {
  return actionColorMap[action] || 'tag-gray'
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hour}:${min}`
}

function loadData() {
  const allLogs = db.getOperationLogs()
  // 按时间倒序
  logs.value = allLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

onShow(() => {
  loadData()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
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

.log-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-item:last-child {
  border-bottom: none;
}

.log-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.log-time {
  font-size: 13px;
  color: #999999;
}

.log-detail {
  font-size: 15px;
  color: #333333;
  display: block;
  line-height: 1.5;
}

.log-target {
  font-size: 12px;
  color: #bbbbbb;
  display: block;
  margin-top: 4px;
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
</style>
