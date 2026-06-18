<template>
  <view class="page">
    <view class="card">
      <view class="form-label">{{ isEdit ? '编辑租客' : '添加租客' }}</view>

      <view class="field-group">
        <text class="field-label">姓名 *</text>
        <input class="input-big" v-model="form.name" placeholder="请输入租客姓名" />
      </view>

      <view class="field-group">
        <text class="field-label">身份证号</text>
        <input class="input-big" v-model="form.idCard" placeholder="请输入身份证号（选填）" />
      </view>

      <view class="field-group">
        <text class="field-label">手机号</text>
        <input class="input-big" type="tel" v-model="form.phone" placeholder="请输入手机号（选填）" />
      </view>

      <view class="field-group">
        <text class="field-label">备注</text>
        <textarea class="textarea-big" v-model="form.notes" placeholder="备注信息（选填）" />
      </view>

      <!-- 黑名单（编辑模式） -->
      <view class="field-group" v-if="isEdit">
        <view class="blacklist-row" @click="toggleBlacklist">
          <text class="field-label" style="margin-bottom: 0;">黑名单</text>
          <view class="switch-track" :class="{ active: form.isBlacklisted }">
            <view class="switch-thumb"></view>
          </view>
        </view>
        <input
          class="input-big"
          v-if="form.isBlacklisted"
          v-model="form.blacklistReason"
          placeholder="拉黑原因"
          style="margin-top: 8px;"
        />
      </view>

      <view class="btn-big btn-primary" style="margin-top: 24px;" @click="submit">
        {{ isEdit ? '保存修改' : '添加租客' }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import db from '@/utils/db.js'

const isEdit = ref(false)
const tenantId = ref('')

const form = reactive({
  name: '',
  idCard: '',
  phone: '',
  notes: '',
  isBlacklisted: false,
  blacklistReason: ''
})

onLoad((options) => {
  if (options.id) {
    isEdit.value = true
    tenantId.value = options.id
    const tenant = db.getTenantById(options.id)
    if (tenant) {
      form.name = tenant.name || ''
      form.idCard = tenant.idCard || ''
      form.phone = tenant.phone || ''
      form.notes = tenant.notes || ''
      form.isBlacklisted = tenant.isBlacklisted || false
      form.blacklistReason = tenant.blacklistReason || ''
    }
  }
})

function toggleBlacklist() {
  form.isBlacklisted = !form.isBlacklisted
  if (!form.isBlacklisted) {
    form.blacklistReason = ''
  }
}

function submit() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入租客姓名', icon: 'none' })
    return
  }

  if (isEdit.value) {
    const updates = {
      name: form.name.trim(),
      idCard: form.idCard.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
      isBlacklisted: form.isBlacklisted,
      blacklistReason: form.blacklistReason.trim()
    }
    db.updateTenant(tenantId.value, updates)
    uni.showToast({ title: '修改成功', icon: 'success' })
  } else {
    db.addTenant({
      name: form.name.trim(),
      idCard: form.idCard.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim()
    })
    uni.showToast({ title: '添加成功', icon: 'success' })
  }

  setTimeout(() => {
    uni.navigateBack()
  }, 1500)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  background-color: #f5f5f5;
}

.form-label {
  font-size: 20px;
  font-weight: 800;
  color: #333333;
  margin-bottom: 20px;
}

.field-group {
  margin-bottom: 16px;
}

.field-label {
  font-size: 15px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
  display: block;
}

.input-big {
  height: 48px;
  font-size: 18px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  padding: 0 12px;
  background-color: #ffffff;
}

.textarea-big {
  width: 100%;
  height: 100px;
  font-size: 16px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  padding: 12px;
  background-color: #ffffff;
  box-sizing: border-box;
}

.blacklist-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-track {
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background-color: #e0e0e0;
  position: relative;
  transition: background-color 0.2s;
}

.switch-track.active {
  background-color: #FF3B30;
}

.switch-thumb {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: #ffffff;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.switch-track.active .switch-thumb {
  left: 26px;
}
</style>
