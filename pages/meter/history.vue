<template>
  <view class="container">
    <view class="room-header" v-if="room">
      <view class="room-title">{{ roomTitle }}</view>
      <view class="room-subtitle">抄表历史记录</view>
    </view>

    <view class="filter-bar">
      <view
        class="filter-btn"
        :class="{ active: filterType === 'all' }"
        @click="filterType = 'all'"
      >
        全部
      </view>
      <view
        class="filter-btn"
        :class="{ active: filterType === 'water' }"
        @click="filterType = 'water'"
      >
        水表
      </view>
      <view
        class="filter-btn"
        :class="{ active: filterType === 'electric' }"
        @click="filterType = 'electric'"
      >
        电表
      </view>
    </view>

    <view class="record-list" v-if="filteredRecords.length > 0">
      <view
        v-for="record in filteredRecords"
        :key="record.id"
        class="record-card"
        :class="{ anomaly: record.isAnomaly }"
        @click="onRecordClick(record)"
      >
        <view class="record-header">
          <view class="record-type" :class="record.meterType">
            {{ record.meterType === 'water' ? '水表' : '电表' }}
          </view>
          <view class="record-date">{{ formatDateCN(record.readingDate) }}</view>
        </view>

        <view class="record-body">
          <view class="reading-row">
            <view class="reading-item">
              <view class="reading-label">上次读数</view>
              <view class="reading-value">{{ record.previousValue }}</view>
            </view>
            <view class="reading-arrow">→</view>
            <view class="reading-item">
              <view class="reading-label">本次读数</view>
              <view class="reading-value">{{ record.readingValue }}</view>
            </view>
          </view>

          <view class="record-footer">
            <view class="consumption">
              <text class="consumption-label">用量：</text>
              <text class="consumption-value">{{ record.consumption }} {{ record.meterType === 'water' ? '吨' : '度' }}</text>
            </view>
            <view class="anomaly-tag" v-if="record.isAnomaly">
              {{ record.anomalyType }}
              <text v-if="record.isAnomalyConfirmed" class="confirmed">（已确认）</text>
              <text v-else class="unconfirmed">（未确认）</text>
            </view>
            <view class="photo-tag" v-if="record.photoPath">
              📷 有照片
            </view>
          </view>
        </view>

        <view class="record-notes" v-if="record.notes">
          <text>备注：{{ record.notes }}</text>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else>
      <view class="empty-icon">📋</view>
      <view class="empty-text">暂无抄表记录</view>
    </view>

    <!-- 照片查看弹窗 -->
    <view class="modal-overlay" v-if="showPhotoModal" @click="showPhotoModal = false">
      <view class="photo-modal-content" @click.stop>
        <image class="photo-modal-image" :src="selectedPhoto" mode="aspectFit" />
        <view class="watermark-overlay" v-if="selectedRecord">
          <view class="watermark-text">{{ photoWatermarkText }}</view>
        </view>
        <view class="modal-close" @click="showPhotoModal = false">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import db from '@/utils/db.js'
import { formatDateCN } from '@/utils/date.js'

const props = defineProps({
  roomId: {
    type: String,
    default: ''
  }
})

const roomId = ref('')
const room = ref(null)
const records = ref([])
const filterType = ref('all')

const showPhotoModal = ref(false)
const selectedPhoto = ref('')
const selectedRecord = ref(null)

onMounted(() => {
  // 获取页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || currentPage.$route?.query || {}
  roomId.value = props.roomId || options.roomId || ''

  loadData()
})

function loadData() {
  if (!roomId.value) return
  room.value = db.getRoomById(roomId.value)
  records.value = db.getMeterReadingsByRoom(roomId.value)
    .sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate))
}

const roomTitle = computed(() => {
  if (!room.value) return ''
  const buildings = db.getBuildings()
  const building = buildings.find(b => b.id === room.value.buildingId)
  const bName = building ? building.name : ''
  return `${bName} ${room.value.floor}层 ${room.value.roomNumber}`
})

const filteredRecords = computed(() => {
  if (filterType.value === 'all') return records.value
  return records.value.filter(r => r.meterType === filterType.value)
})

function onRecordClick(record) {
  if (record.photoPath) {
    selectedPhoto.value = record.photoPath
    selectedRecord.value = record
    showPhotoModal.value = true
  }
}

const photoWatermarkText = computed(() => {
  if (!selectedRecord.value || !room.value) return ''
  const dateText = formatDateCN(selectedRecord.value.readingDate)
  const roomText = `${room.value.floor}层${room.value.roomNumber}`
  const typeText = selectedRecord.value.meterType === 'water' ? '水表' : '电表'
  const unit = selectedRecord.value.meterType === 'water' ? '吨' : '度'
  return `${dateText} ${roomText} ${typeText} ${selectedRecord.value.readingValue}${unit}`
})
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #F5F5F5;
  min-height: 100vh;
}

.room-header {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  text-align: center;
}

.room-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.room-subtitle {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
}

.filter-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #666;
  background: #F0F0F0;
  transition: all 0.2s;
}

.filter-btn.active {
  background: #007AFF;
  color: #fff;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  border-left: 6rpx solid transparent;
}

.record-card.anomaly {
  border-left-color: #FF4D4F;
  background: #FFF1F0;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.record-type {
  font-size: 28rpx;
  font-weight: bold;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.record-type.water {
  background: #E6F7FF;
  color: #1890FF;
}

.record-type.electric {
  background: #FFF7E6;
  color: #FAAD14;
}

.record-date {
  font-size: 24rpx;
  color: #999;
}

.reading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: #FAFAFA;
  border-radius: 12rpx;
}

.reading-item {
  flex: 1;
  text-align: center;
}

.reading-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.reading-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.reading-arrow {
  font-size: 32rpx;
  color: #999;
  padding: 0 20rpx;
}

.record-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16rpx;
}

.consumption {
  font-size: 28rpx;
}

.consumption-label {
  color: #666;
}

.consumption-value {
  color: #333;
  font-weight: bold;
}

.anomaly-tag {
  font-size: 24rpx;
  color: #FF4D4F;
  font-weight: bold;
}

.anomaly-tag .confirmed {
  color: #52C41A;
  font-weight: normal;
}

.anomaly-tag .unconfirmed {
  color: #FF4D4F;
  font-weight: normal;
}

.photo-tag {
  font-size: 24rpx;
  color: #007AFF;
}

.record-notes {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F0F0F0;
  font-size: 26rpx;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.photo-modal-content {
  position: relative;
  width: 90%;
  height: 70%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-modal-image {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
}

.watermark-overlay {
  position: absolute;
  bottom: 20rpx;
  left: 20rpx;
  right: 20rpx;
  background: rgba(0, 0, 0, 0.6);
  padding: 16rpx;
  border-radius: 8rpx;
  text-align: center;
}

.watermark-text {
  font-size: 24rpx;
  color: #fff;
  word-break: break-all;
}

.modal-close {
  margin-top: 30rpx;
  padding: 16rpx 60rpx;
  background: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}
</style>
