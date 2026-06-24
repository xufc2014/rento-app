<template>
  <view class="page">
    <!-- 楼栋切换 tab -->
    <scroll-view class="building-tabs" scroll-x v-if="buildings.length > 0">
      <view
        class="tab-item"
        v-for="item in buildings"
        :key="item.id"
        :class="{ active: activeBuildingId === item.id }"
        @click="switchBuilding(item.id)"
      >
        <text class="tab-text">{{ item.name }}</text>
      </view>
    </scroll-view>

    <!-- 筛选栏（状态 + 户型） -->
    <view class="filter-bar" v-if="buildings.length > 0 && rooms.length > 0">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-chips">
          <view
            class="chip"
            v-for="s in statusFilters"
            :key="s.value"
            :class="{ 'chip-active': filterStatus === s.value }"
            @click="filterStatus = s.value"
          >{{ s.label }}</view>
          <view class="chip-divider"></view>
          <view
            class="chip"
            v-for="l in layoutFilters"
            :key="l.value"
            :class="{ 'chip-active': filterLayout === l.value }"
            @click="filterLayout = l.value"
          >{{ l.label }}</view>
        </view>
      </scroll-view>
    </view>

    <!-- 统计 + 编辑按钮 -->
    <view class="summary-bar" v-if="buildings.length > 0">
      <text class="summary-text">{{ currentBuildingName }}：共 {{ filteredRoomCount }} 间
        <text v-if="isFiltering" class="filter-hint">（已筛选）</text>
      </text>
      <view
        class="edit-toggle-btn"
        :class="{ active: editMode }"
        @click="toggleEditMode"
      >
        <text class="edit-toggle-text">{{ editMode ? '完成' : '批量删除' }}</text>
      </view>
    </view>

    <!-- 批量删除提示栏 -->
    <view class="selection-bar" v-if="editMode">
      <text class="selection-info">已选 {{ selectedIds.size }} 间（仅空置房间可删）</text>
      <view class="selection-actions">
        <view class="sel-btn" @click="selectAll">全选空置</view>
        <view class="sel-btn sel-btn-clear" @click="clearSelection">取消</view>
        <view
          class="sel-btn sel-btn-delete"
          :class="{ disabled: selectedIds.size === 0 }"
          @click="confirmDelete"
        >删除 {{ selectedIds.size > 0 ? selectedIds.size + '间' : '' }}</view>
      </view>
    </view>

    <!-- 无楼栋空状态 -->
    <view class="card empty-card" v-if="buildings.length === 0">
      <text class="empty-icon">&#10068;</text>
      <text class="empty-text">还没有楼栋数据</text>
      <text class="empty-tip">请先添加楼栋，再添加房间</text>
    </view>

    <!-- 楼层房间列表 -->
    <view v-if="buildings.length > 0">
      <!-- 楼栋无房间空状态 -->
      <view class="card empty-card" v-if="rooms.length === 0 && buildings.find(b => b.id === activeBuildingId)">
        <text class="empty-icon">&#128718;</text>
        <text class="empty-text">{{ currentBuildingName }} 暂无房间</text>
        <text class="empty-tip">删除了所有房间？可以重新添加或删除此楼栋</text>
        <view class="empty-actions">
          <view class="btn-big btn-primary" style="margin-right: 10px; flex:1;" @click="goAddRoomsToBuilding">添加房间</view>
          <view class="btn-big btn-danger" style="flex:1;" @click="confirmDeleteBuilding">删除楼栋</view>
        </view>
      </view>

      <!-- 有房间时正常显示楼层列表 -->
      <template v-else>
      <view class="floor-section" v-for="group in groupedRooms" :key="group.floor">
        <view class="floor-header">
          <text class="floor-title">{{ formatFloor(group.floor) }}</text>
          <text class="floor-count">{{ group.rooms.length }} 间</text>
        </view>
        <view class="room-grid">
          <view
            class="room-card"
            v-for="room in group.rooms"
            :key="room.id"
            :class="{
              'room-selectable': editMode,
              'room-selected': editMode && selectedIds.has(room.id),
              'room-disabled': editMode && room.status !== '空置'
            }"
            @click="editMode ? toggleSelect(room) : goRoomDetail(room.id)"
          >
            <!-- 选中勾选框 -->
            <view class="select-check" v-if="editMode">
              <view
                class="check-circle"
                :class="{
                  checked: selectedIds.has(room.id),
                  'check-disabled': room.status !== '空置'
                }"
              >
                <text v-if="selectedIds.has(room.id)" class="check-icon">✓</text>
              </view>
            </view>

            <view class="room-top">
              <text class="room-number">{{ room.roomNumber }}</text>
              <text class="tag" :class="statusClass(room.status)">{{ room.status }}</text>
            </view>
            <text class="room-type">{{ [room.unitType, room.layout].filter(Boolean).join(' · ') }}</text>
            <view class="room-info">
              <text class="room-area">{{ room.area || 0 }} m²</text>
              <text class="room-rent">{{ formatAmount(room.baseRent || 0) }}</text>
            </view>
            <text class="room-tenant" v-if="room.currentTenantId">
              {{ tenantName(room.currentTenantId) }}
            </text>
          </view>
        </view>
      </view>
      </template>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>

    <!-- 底部添加楼栋按钮（非编辑模式） -->
    <view class="footer-bar" v-if="!editMode">
      <view v-if="rooms.length > 0 || buildings.find(b => b.id === activeBuildingId) === undefined">
        <view class="btn-big btn-primary" @click="goAddBuilding">添加楼栋</view>
      </view>
      <view v-else>
        <view class="btn-big btn-primary" @click="goAddRoomsToBuilding">添加房间</view>
        <view class="btn-big btn-danger" style="margin-top: 10px;" @click="confirmDeleteBuilding">删除此楼栋</view>
      </view>
    </view>

    <!-- 密码确认弹窗 -->
    <view class="modal-mask" v-if="pwd.visible.value" @click="pwd.cancel">
      <view class="modal-box password-modal" @click.stop>
        <text class="modal-title" style="color:#333;">管理密码验证</text>
        <text class="modal-desc" style="color:#999;font-size:14px;">{{ pwd.message.value }}</text>
        <input
          class="pwd-input"
          type="password"
          :value="pwd.inputValue.value"
          @input="e => pwd.inputValue.value = e.detail.value"
          placeholder="请输入管理密码"
          maxlength="20"
          @confirm="pwd.confirm"
        />
        <text class="pwd-error" v-if="pwd.errorMsg.value">{{ pwd.errorMsg.value }}</text>
        <view class="modal-buttons" style="margin-top: 8px;">
          <view class="btn-big modal-btn-cancel" @click="pwd.cancel">取消</view>
          <view class="btn-big btn-primary modal-btn-confirm" @click="pwd.confirm">确认</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import db from '@/utils/db.js'
import { formatAmount } from '@/utils/calc.js'
import { usePasswordGuard } from '@/utils/password.js'

// ============ 状态 ============

const buildings = ref([])
const activeBuildingId = ref('')
const rooms = ref([])
const editMode = ref(false)
const selectedIds = ref(new Set())

// 筛选
const filterStatus = ref('全部')
const filterLayout = ref('全部')

const statusFilters = [
  { label: '全部', value: '全部' },
  { label: '空置', value: '空置' },
  { label: '已入住', value: '已入住' },
  { label: '已预订', value: '已预订' },
  { label: '退租中', value: '退租中' }
]

const layoutFilters = [
  { label: '所有户型', value: '全部' },
  { label: '单间', value: '单间' },
  { label: '一房一厅', value: '一房一厅' },
  { label: '两房一厅', value: '两房一厅' },
  { label: '三房一厅', value: '三房一厅' },
  { label: '其他', value: '其他' }
]

// 密码确认控制器
const pwd = usePasswordGuard()

const statusMap = {
  '空置': 'tag-gray',
  '已预订': 'tag-orange',
  '已入住': 'tag-green',
  '退租中': 'tag-orange'
}

// ============ 计算属性 ============

const currentBuildingName = computed(() => {
  const building = buildings.value.find(b => b.id === activeBuildingId.value)
  return building ? building.name : ''
})

const roomCount = computed(() => rooms.value.length)

const isFiltering = computed(() => filterStatus.value !== '全部' || filterLayout.value !== '全部')

// 筛选后的房间列表
const filteredRooms = computed(() => {
  return rooms.value.filter(r => {
    const statusOk = filterStatus.value === '全部' || r.status === filterStatus.value
    const layoutOk = filterLayout.value === '全部' || (r.layout || '') === filterLayout.value
    return statusOk && layoutOk
  })
})

const filteredRoomCount = computed(() => filteredRooms.value.length)

function floorSortKey(floor) {
  const n = Number(floor)
  return isNaN(n) ? 99999 : n
}

function roomSortKey(roomNumber) {
  const n = parseInt(roomNumber, 10)
  return isNaN(n) ? 99999 : n
}

const groupedRooms = computed(() => {
  const sorted = [...filteredRooms.value].sort((a, b) => {
    const floorDiff = floorSortKey(a.floor) - floorSortKey(b.floor)
    if (floorDiff !== 0) return floorDiff
    return roomSortKey(a.roomNumber) - roomSortKey(b.roomNumber)
  })

  const groups = {}
  for (const room of sorted) {
    if (!groups[room.floor]) groups[room.floor] = []
    groups[room.floor].push(room)
  }

  return Object.keys(groups)
    .sort((a, b) => floorSortKey(a) - floorSortKey(b))
    .map(floor => ({ floor, rooms: groups[floor] }))
})

// ============ 数据加载 ============

function loadData() {
  buildings.value = db.getBuildings()
  if (buildings.value.length > 0) {
    if (!activeBuildingId.value || !buildings.value.find(b => b.id === activeBuildingId.value)) {
      activeBuildingId.value = buildings.value[0].id
    }
    rooms.value = db.getRoomsByBuilding(activeBuildingId.value)
  } else {
    activeBuildingId.value = ''
    rooms.value = []
  }
}

onShow(() => {
  loadData()
})

// ============ 交互 ============

function switchBuilding(id) {
  if (editMode.value) {
    editMode.value = false
    selectedIds.value = new Set()
  }
  activeBuildingId.value = id
  rooms.value = db.getRoomsByBuilding(id)
  filterStatus.value = '全部'
  filterLayout.value = '全部'
}

function goRoomDetail(roomId) {
  uni.navigateTo({ url: `/pages/room/detail?roomId=${roomId}` })
}

function goAddBuilding() {
  uni.navigateTo({ url: '/pages/building/add' })
}

function goAddRoomsToBuilding() {
  uni.navigateTo({ url: `/pages/building/add?buildingId=${activeBuildingId.value}` })
}

function confirmDeleteBuilding() {
  const building = buildings.value.find(b => b.id === activeBuildingId.value)
  uni.showModal({
    title: '删除楼栋',
    content: `确定要删除"${building.name}"吗？该楼栋已无房间，删除后无法恢复！`,
    confirmColor: '#FF3B30',
    confirmText: '确认删除',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        pwd.guard(() => {
          db.deleteBuilding(activeBuildingId.value)
          uni.showToast({ title: '楼栋已删除', icon: 'success' })
          loadData()
        }, `删除楼栋"${building.name}"不可恢复，请输入管理密码确认`)
      }
    }
  })
}

function formatFloor(floor) {
  const n = Number(floor)
  return isNaN(n) ? `${floor}` : `${n}F`
}

function statusClass(status) {
  return statusMap[status] || 'tag-gray'
}

function tenantName(tenantId) {
  const tenant = db.getTenantById(tenantId)
  return tenant ? tenant.name : ''
}

// ============ 批量删除 ============

function toggleEditMode() {
  editMode.value = !editMode.value
  if (!editMode.value) {
    selectedIds.value = new Set()
  }
}

function toggleSelect(room) {
  if (room.status !== '空置') {
    uni.showToast({ title: `${room.roomNumber} 非空置，不可删除`, icon: 'none' })
    return
  }
  const newSet = new Set(selectedIds.value)
  if (newSet.has(room.id)) {
    newSet.delete(room.id)
  } else {
    newSet.add(room.id)
  }
  selectedIds.value = newSet
}

function selectAll() {
  const vacantIds = rooms.value
    .filter(r => r.status === '空置')
    .map(r => r.id)
  selectedIds.value = new Set(vacantIds)
}

function clearSelection() {
  selectedIds.value = new Set()
}

function confirmDelete() {
  if (selectedIds.value.size === 0) {
    uni.showToast({ title: '请先选择要删除的房间', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认删除',
    content: `确定要删除已选的 ${selectedIds.value.size} 间空置房间吗？删除后无法恢复！`,
    confirmColor: '#FF3B30',
    confirmText: '确认删除',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        pwd.guard(() => {
          doDelete()
        }, `删除 ${selectedIds.value.size} 间房间不可恢复，请输入管理密码确认`)
      }
    }
  })
}

function doDelete() {
  const ids = Array.from(selectedIds.value)
  const result = db.deleteRooms(ids)

  let msg = `成功删除 ${result.success.length} 间`
  if (result.failed.length > 0) {
    msg += `，${result.failed.length} 间删除失败`
  }

  uni.showToast({ title: msg, icon: result.failed.length === 0 ? 'success' : 'none' })

  if (result.failed.length > 0) {
    const failNames = result.failed.map(f => `${f.roomNumber}(${f.reason})`).join('\n')
    setTimeout(() => {
      uni.showModal({
        title: '部分删除失败',
        content: failNames,
        showCancel: false
      })
    }, 1200)
  }

  editMode.value = false
  selectedIds.value = new Set()
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

.building-tabs {
  white-space: nowrap;
  background-color: #ffffff;
  padding: 0 8px;
  border-bottom: 1px solid #eeeeee;
}

/* ===== 筛选栏 ===== */
.filter-bar {
  background-color: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 0;
}

.filter-scroll {
  width: 100%;
  white-space: nowrap;
}

.filter-chips {
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  white-space: nowrap;
}

.chip {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 16px;
  background-color: #f5f5f5;
  font-size: 13px;
  color: #666666;
  border: 1px solid transparent;
  flex-shrink: 0;
}

.chip-active {
  background-color: #e8f4ff;
  color: #007AFF;
  border-color: #007AFF;
  font-weight: 600;
}

.chip-divider {
  width: 1px;
  height: 20px;
  background-color: #e0e0e0;
  flex-shrink: 0;
  margin: 0 2px;
}

.filter-hint {
  font-size: 12px;
  color: #007AFF;
}

.tab-item {
  display: inline-block;
  padding: 14px 16px;
  border-bottom: 3px solid transparent;
}

.tab-text {
  font-size: 16px;
  color: #999999;
}

.tab-item.active {
  border-bottom-color: #007AFF;
}

.tab-item.active .tab-text {
  color: #333333;
  font-weight: 700;
}

.summary-bar {
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-text {
  font-size: 14px;
  color: #666666;
}

.edit-toggle-btn {
  padding: 6px 14px;
  border-radius: 20px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
}

.edit-toggle-btn.active {
  background-color: #007AFF;
  border-color: #007AFF;
}

.edit-toggle-text {
  font-size: 14px;
  color: #555;
}

.edit-toggle-btn.active .edit-toggle-text {
  color: #fff;
  font-weight: 600;
}

/* 选择操作栏 */
.selection-bar {
  background-color: #fff8e7;
  border-bottom: 1px solid #ffd060;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selection-info {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.selection-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sel-btn {
  padding: 6px 12px;
  border-radius: 16px;
  background-color: #eeeeee;
  font-size: 13px;
  color: #333;
}

.sel-btn-clear {
  background-color: #f0f0f0;
  color: #666;
}

.sel-btn-delete {
  background-color: #FF3B30;
  color: #ffffff;
  font-weight: 700;
}

.sel-btn-delete.disabled {
  background-color: #ffb3ae;
  color: #fff;
}

/* 空状态 */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  margin-top: 20px;
  background-color: #ffffff;
  border-radius: 12px;
  margin: 20px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.empty-icon {
  font-size: 48px;
  color: #007AFF;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 18px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 6px;
}

.empty-tip {
  font-size: 14px;
  color: #999999;
}

.empty-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  width: 100%;
}

/* 楼层 */
.floor-section {
  margin-bottom: 16px;
}

.floor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.floor-title {
  font-size: 17px;
  font-weight: 700;
  color: #333333;
}

.floor-count {
  font-size: 14px;
  color: #999999;
}

/* 房间格 */
.room-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 0 10px;
}

.room-card {
  width: calc(50% - 12px);
  margin: 6px;
  background-color: #ffffff;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  position: relative;
  transition: all 0.15s;
}

.room-selectable {
  border: 2px solid transparent;
}

.room-selected {
  border: 2px solid #007AFF;
  background-color: #e8f4ff;
}

.room-disabled {
  opacity: 0.5;
}

/* 选择圆圈 */
.select-check {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.check-circle {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border: 2px solid #007AFF;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-circle.checked {
  background-color: #007AFF;
  border-color: #007AFF;
}

.check-circle.check-disabled {
  border-color: #cccccc;
  background-color: #f5f5f5;
}

.check-icon {
  font-size: 13px;
  color: #ffffff;
  font-weight: 800;
  line-height: 1;
}

.room-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.room-number {
  font-size: 22px;
  font-weight: 800;
  color: #333333;
}

.room-type {
  font-size: 14px;
  color: #666666;
  display: block;
  margin-bottom: 8px;
}

.room-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-area {
  font-size: 13px;
  color: #999999;
}

.room-rent {
  font-size: 16px;
  font-weight: 700;
  color: #007AFF;
}

.room-tenant {
  font-size: 13px;
  color: #34C759;
  margin-top: 6px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 状态标签 */
.tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.tag-gray { background-color: #f0f0f0; color: #999999; }
.tag-green { background-color: #e6f9ee; color: #34C759; }
.tag-orange { background-color: #fff3e6; color: #FF9500; }
.tag-red { background-color: #fff0f0; color: #FF3B30; }

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

.btn-big {
  height: 48px;
  line-height: 48px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
  text-align: center;
  border: none;
}

.btn-primary {
  background-color: #007AFF;
  color: #ffffff;
}

.btn-danger {
  background-color: #FF3B30;
  color: #ffffff;
}

/* ========== 密码弹窗 ========== */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-box {
  width: 320px;
  background-color: #ffffff;
  border-radius: 16px;
  padding: 28px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.password-modal {
  width: 300px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 14px;
}

.modal-desc {
  font-size: 15px;
  color: #666;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 24px;
}

.modal-buttons {
  display: flex;
  gap: 12px;
  width: 100%;
}

.modal-btn-cancel {
  flex: 1;
  background-color: #f0f0f0;
  color: #666;
  height: 44px;
  line-height: 44px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  text-align: center;
}

.modal-btn-confirm {
  flex: 1;
  height: 44px;
  line-height: 44px;
  font-size: 16px;
}

.pwd-input {
  width: 100%;
  height: 48px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 0 16px;
  font-size: 18px;
  text-align: center;
  letter-spacing: 4px;
  margin-bottom: 4px;
}

.pwd-error {
  font-size: 13px;
  color: #FF3B30;
  margin-top: 4px;
}
</style>
