<template>
  <view class="page">
    <view v-if="room">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">基本信息</view>

        <view class="form-item">
          <text class="form-label">楼栋</text>
          <text class="form-value-readonly">{{ buildingName }}</text>
        </view>
        <view class="form-item">
          <text class="form-label">楼层</text>
          <text class="form-value-readonly">{{ room.floor }}层</text>
        </view>
        <view class="form-item">
          <text class="form-label">房号</text>
          <input
            class="form-input"
            v-model="form.roomNumber"
            placeholder="如 101、夹层A"
            maxlength="10"
          />
        </view>
        <view class="form-item">
          <text class="form-label">类型</text>
          <picker
            :value="unitTypeIndex"
            :range="unitTypeOptions"
            @change="onUnitTypeChange"
          >
            <view class="form-picker">
              {{ form.unitType || '请选择' }}
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">户型</text>
          <picker
            :value="layoutIndex"
            :range="layoutOptions"
            @change="onLayoutChange"
          >
            <view class="form-picker">
              <text :style="form.layout ? '' : 'color:#ccc'">{{ form.layout || '请选择户型' }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="form-label">面积（m²）</text>
          <input
            class="form-input"
            v-model="form.area"
            type="digit"
            placeholder="请输入面积"
          />
        </view>
      </view>

      <!-- 租金设置 -->
      <view class="card">
        <view class="card-title">租金设置</view>
        <view class="form-item">
          <text class="form-label">基础租金（元/月）</text>
          <view class="input-with-prefix">
            <text class="input-prefix">¥</text>
            <input
              class="form-input-inline"
              v-model="form.baseRent"
              type="digit"
              placeholder="0"
            />
          </view>
        </view>
        <view class="hint-text">* 租金独立编辑，不影响其他房间</view>
      </view>

      <!-- 水电计费 -->
      <view class="card">
        <view class="card-title">水电计费</view>
        <view class="rate-type-hint">
          <text class="hint-text">当前类型：{{ form.unitType }}，默认单价 水 {{ typeDefaultWaterRate }} 元/吨、电 {{ typeDefaultElectricRate }} 元/度</text>
        </view>

        <view class="form-item">
          <text class="form-label">水单价（元/吨）</text>
          <input
            class="form-input"
            v-model="form.waterRate"
            type="digit"
            :placeholder="'默认 ' + typeDefaultWaterRate"
          />
        </view>
        <view class="form-item">
          <text class="form-label">电单价（元/度）</text>
          <input
            class="form-input"
            v-model="form.electricRate"
            type="digit"
            :placeholder="'默认 ' + typeDefaultElectricRate"
          />
        </view>

        <view class="form-item">
          <text class="form-label">网费（元/月）</text>
          <input
            class="form-input"
            v-model="form.internetFee"
            type="digit"
            :placeholder="`默认 ${settings.internetFee}`"
          />
        </view>
      </view>

      <!-- 额外押金 -->
      <view class="card">
        <view class="card-title">额外押金</view>
        <view class="hint-text" style="margin-bottom: 10px;">如有设备押金等特殊款项，在此填写，退租时会一并退还</view>
        <view class="form-item">
          <text class="form-label">额外押金（元）</text>
          <view class="input-with-prefix">
            <text class="input-prefix">¥</text>
            <input
              class="form-input-inline"
              v-model="form.extraDeposit"
              type="digit"
              placeholder="0"
            />
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">押金说明</text>
          <input
            class="form-input"
            v-model="form.extraDepositNote"
            placeholder="如：空调押金、设备押金"
          />
        </view>
      </view>

      <!-- 房间备注 -->
      <view class="card">
        <view class="card-title">备注</view>
        <textarea
          class="form-textarea"
          v-model="form.notes"
          placeholder="房间相关备注信息，退租时可见"
          :maxlength="200"
        />
      </view>

      <!-- 保存按钮 + 删除按钮 -->
      <view style="padding: 16px 16px 8px;">
        <button class="btn-big btn-primary" @click="onSave">保存修改</button>
      </view>
      <view style="padding: 0 16px 32px;">
        <button class="btn-big btn-danger" @click="onDelete">删除此房间</button>
      </view>
    </view>

    <view v-else class="empty-state">
      <text class="empty-text">房间不存在</text>
    </view>
  </view>
</template>

<script>
import db from '@/utils/db.js'

export default {
  data() {
    return {
      roomId: '',
      room: null,
      buildingName: '',
      settings: {},
      unitTypeOptions: ['民房', '公寓', '商铺'],
      layoutOptions: ['单间', '一房一厅', '两房一厅', '三房一厅', '其他'],
      form: {
        roomNumber: '',
        unitType: '民房',
        layout: '',
        area: '',
        baseRent: '',
        waterRate: '',
        electricRate: '',
        internetFee: '',
        extraDeposit: '',
        extraDepositNote: '',
        notes: ''
      }
    }
  },
  computed: {
    unitTypeIndex() {
      const idx = this.unitTypeOptions.indexOf(this.form.unitType)
      return idx >= 0 ? idx : 0
    },
    layoutIndex() {
      const idx = this.layoutOptions.indexOf(this.form.layout)
      return idx >= 0 ? idx : -1
    },
    typeDefaultWaterRate() {
      const typeRates = this.settings.typeRates || {}
      const t = typeRates[this.form.unitType]
      return t ? t.waterRate : 5
    },
    typeDefaultElectricRate() {
      const typeRates = this.settings.typeRates || {}
      const t = typeRates[this.form.unitType]
      return t ? t.electricRate : 1
    }
  },
  onLoad(options) {
    if (options && options.roomId) {
      this.roomId = options.roomId
      this.initRoom(options.roomId)
    }
  },
  methods: {
    initRoom(id) {
      const r = db.getRoomById(id)
      if (!r) return
      this.room = r
      const buildings = db.getBuildings()
      const bld = buildings.find(b => b.id === r.buildingId)
      this.buildingName = bld ? bld.name : ''
      this.settings = db.getSettings()
      this.form = {
        roomNumber: r.roomNumber || '',
        unitType: r.unitType || '民房',
        layout: r.layout || '',
        area: r.area != null ? String(r.area) : '',
        baseRent: r.baseRent != null ? String(r.baseRent) : '',
        waterRate: r.waterRate ? String(r.waterRate) : '',
        electricRate: r.electricRate ? String(r.electricRate) : '',
        internetFee: r.internetFee ? String(r.internetFee) : '',
        extraDeposit: r.extraDeposit != null ? String(r.extraDeposit) : '',
        extraDepositNote: r.extraDepositNote || '',
        notes: r.notes || ''
      }
    },
    onUnitTypeChange(e) {
      this.form.unitType = this.unitTypeOptions[e.detail.value]
    },
    onLayoutChange(e) {
      this.form.layout = this.layoutOptions[e.detail.value]
    },
    onSave() {
      if (!this.form.roomNumber.trim()) {
        uni.showToast({ title: '请填写房号', icon: 'none' })
        return
      }
      if (!this.form.baseRent || isNaN(Number(this.form.baseRent))) {
        uni.showToast({ title: '请填写正确的租金', icon: 'none' })
        return
      }

      const updates = {
        roomNumber: this.form.roomNumber.trim(),
        unitType: this.form.unitType,
        layout: this.form.layout || '',
        area: this.form.area ? Number(this.form.area) : 0,
        baseRent: Number(this.form.baseRent),
        isCommercial: this.form.unitType === '商铺',
        waterRate: this.form.waterRate ? Number(this.form.waterRate) : null,
        electricRate: this.form.electricRate ? Number(this.form.electricRate) : null,
        internetFee: this.form.internetFee ? Number(this.form.internetFee) : null,
        extraDeposit: this.form.extraDeposit ? Number(this.form.extraDeposit) : 0,
        extraDepositNote: this.form.extraDepositNote || '',
        notes: this.form.notes || ''
      }

      db.updateRoom(this.roomId, updates)
      uni.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 800)
    },
    onDelete() {
      const room = this.room
      if (room.status !== '空置' && room.status !== '退租中') {
        uni.showModal({
          title: '无法删除',
          content: `当前房间状态为"${room.status}"，只有空置或退租中的房间才能删除。`,
          showCancel: false
        })
        return
      }
      uni.showModal({
        title: '确认删除',
        content: `确定要删除 ${room.floor}层 ${room.roomNumber} 吗？删除后无法恢复！`,
        confirmColor: '#FF3B30',
        confirmText: '确认删除',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            const result = db.deleteRoom(this.roomId)
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
  }
}
</script>

<style scoped>
.page {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 40px;
}

.card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.form-item {
  display: flex;
  align-items: center;
  min-height: 50px;
  border-bottom: 1px solid #f5f5f5;
  padding: 8px 0;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 15px;
  color: #333;
  width: 150px;
  flex-shrink: 0;
}

.form-value-readonly {
  font-size: 15px;
  color: #999;
  flex: 1;
  text-align: right;
}

.form-input {
  flex: 1;
  font-size: 15px;
  color: #333;
  text-align: right;
  height: 40px;
  padding: 0 4px;
}

.form-picker {
  flex: 1;
  font-size: 15px;
  color: #333;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.picker-arrow {
  margin-left: 6px;
  color: #c7c7cc;
  font-size: 18px;
}

.input-with-prefix {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.input-prefix {
  font-size: 15px;
  color: #333;
  margin-right: 2px;
}

.form-input-inline {
  font-size: 15px;
  color: #333;
  text-align: right;
  height: 40px;
  min-width: 100px;
}

.hint-text {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  padding: 4px 0;
}

.rate-type-hint {
  padding: 4px 0 8px;
}

.hint-text {
  font-size: 12px;
  color: #999;
}

.rate-hint {
  padding: 4px 0 8px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.empty-text {
  color: #999;
  font-size: 15px;
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

.form-textarea {
  width: 100%;
  min-height: 80px;
  font-size: 15px;
  color: #333;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box;
}
</style>
