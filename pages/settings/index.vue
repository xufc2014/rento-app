<template>
  <view class="page">
    <!-- 水电单价配置（按类型） -->
    <view class="card">
      <view class="card-title">水电单价配置</view>

      <view v-for="typeName in typeNames" :key="typeName" class="type-rate-group">
        <view class="type-rate-header">
          <view class="type-badge" :class="'badge-' + typeName">{{ typeName }}</view>
        </view>
        <!-- 纵向排列：每个费种单独一行 -->
        <view class="type-rate-col">
          <view class="form-group">
            <text class="form-label">水费单价</text>
            <view class="input-wrap">
              <text class="input-prefix">¥</text>
              <input
                class="form-input"
                type="digit"
                :value="typeRates[typeName]?.waterRate"
                @input="e => onTypeRateInput(typeName, 'waterRate', e.detail.value)"
                placeholder="元/吨"
              />
            </view>
            <text class="form-hint">每吨水价格</text>
          </view>
          <view class="form-group">
            <text class="form-label">电费单价</text>
            <view class="input-wrap">
              <text class="input-prefix">¥</text>
              <input
                class="form-input"
                type="digit"
                :value="typeRates[typeName]?.electricRate"
                @input="e => onTypeRateInput(typeName, 'electricRate', e.detail.value)"
                placeholder="元/度"
              />
            </view>
            <text class="form-hint">每度电价格</text>
          </view>
          <view class="form-group">
            <text class="form-label">气费单价</text>
            <view class="input-wrap">
              <text class="input-prefix">¥</text>
              <input
                class="form-input"
                type="digit"
                :value="typeRates[typeName]?.gasRate"
                @input="e => onTypeRateInput(typeName, 'gasRate', e.detail.value)"
                placeholder="元/方"
              />
            </view>
            <text class="form-hint">每方气价格</text>
          </view>
        </view>
      </view>

      <view class="btn-big btn-primary" @click="saveTypeRates">保存水电单价</view>
    </view>

    <!-- 其他费用 -->
    <view class="card">
      <view class="card-title">费用配置</view>

      <view class="form-group">
        <text class="form-label">网费</text>
        <view class="input-wrap">
          <text class="input-prefix">¥</text>
          <input
            class="form-input"
            type="digit"
            v-model="form.internetFee"
            placeholder="元/月"
          />
        </view>
        <text class="form-hint">每月网费，签合同时可调整</text>
      </view>

      <view class="form-group">
        <text class="form-label">卫生费</text>
        <view class="input-wrap">
          <text class="input-prefix">¥</text>
          <input
            class="form-input"
            type="digit"
            v-model="form.sanitationFee"
            placeholder="元/月"
          />
        </view>
        <text class="form-hint">每月卫生费，签合同时可调整</text>
      </view>

      <view class="form-group">
        <text class="form-label">管理费</text>
        <view class="input-wrap">
          <text class="input-prefix">¥</text>
          <input
            class="form-input"
            type="digit"
            v-model="form.managementFee"
            placeholder="元/月"
          />
        </view>
        <text class="form-hint">每月管理费，签合同时可调整</text>
      </view>

      <view class="form-group">
        <text class="form-label">其他费用</text>
        <view class="input-wrap">
          <text class="input-prefix">¥</text>
          <input
            class="form-input"
            type="digit"
            v-model="form.otherFee"
            placeholder="元/月"
          />
        </view>
        <text class="form-hint">其他每月固定费用，签合同时可调整</text>
      </view>

      <view class="btn-big btn-primary" @click="saveOtherFees">保存费用配置</view>
    </view>

    <!-- 押金规则 -->
    <view class="card">
      <view class="card-title">押金规则</view>

      <view class="form-group">
        <text class="form-label">默认押金规则</text>
        <picker
          class="form-picker"
          mode="selector"
          :range="depositOptions"
          range-key="label"
          :value="depositIndex"
          @change="onDepositChange"
        >
          <view class="picker-value">{{ depositOptions[depositIndex].label }}</view>
        </picker>
      </view>

      <view class="btn-big btn-primary" @click="saveDepositRule">保存押金规则</view>
    </view>

    <!-- 账单日期 -->
    <view class="card">
      <view class="card-title">账单生成日期</view>

      <view class="form-row">
        <view class="form-group-half">
          <text class="form-label">开始日</text>
          <input
            class="form-input form-input-center"
            type="number"
            v-model="form.billGenerationStartDay"
            placeholder="1-31"
          />
        </view>
        <text class="form-row-divider">~</text>
        <view class="form-group-half">
          <text class="form-label">结束日</text>
          <input
            class="form-input form-input-center"
            type="number"
            v-model="form.billGenerationEndDay"
            placeholder="1-31"
          />
        </view>
      </view>

      <view class="btn-big btn-primary" @click="saveBillDates">保存账单日期</view>
    </view>

    <!-- 滞纳金规则 -->
    <view class="card">
      <view class="card-title">滞纳金规则</view>

      <view class="form-group">
        <text class="form-label">逾期天数起算</text>
        <input
          class="form-input form-input-center"
          type="number"
          v-model="form.lateFeeStartDay"
          placeholder="逾期N天后开始计算滞纳金"
        />
        <text class="form-hint">天（账单生成后第N天起算）</text>
      </view>

      <view class="form-group">
        <text class="form-label">每日滞纳金</text>
        <view class="input-wrap">
          <text class="input-prefix">¥</text>
          <input
            class="form-input"
            type="digit"
            v-model="form.lateFeePerDay"
            placeholder="每天加收多少元"
          />
        </view>
        <text class="form-hint">元/天</text>
      </view>

      <view class="btn-big btn-primary" @click="saveLateFee">保存滞纳金规则</view>
    </view>

    <!-- 合同到期提醒天数 -->
    <view class="card">
      <view class="card-title">合同到期提醒</view>

      <view class="checkbox-list">
        <label
          class="checkbox-item"
          v-for="item in contractWarningOptions"
          :key="item.value"
          @click="toggleWarningDay(item.value)"
        >
          <view
            class="checkbox-box"
            :class="{ 'checkbox-checked': form.contractExpiryWarningDays.includes(item.value) }"
          >
            <text v-if="form.contractExpiryWarningDays.includes(item.value)" class="checkbox-icon">&#10003;</text>
          </view>
          <text class="checkbox-label">提前 {{ item.label }} 提醒</text>
        </label>
      </view>

      <view class="btn-big btn-primary" @click="saveContractWarning">保存提醒设置</view>
    </view>

    <!-- 数据管理 -->
    <view class="card">
      <view class="card-title">数据管理</view>

      <!-- 当前数据概览 -->
      <view class="data-summary" v-if="dataSummary">
        <view class="summary-row">
          <view class="summary-item">
            <text class="summary-num">{{ dataSummary.buildings.count }}</text>
            <text class="summary-label">楼栋</text>
          </view>
          <view class="summary-item">
            <text class="summary-num">{{ dataSummary.rooms.count }}</text>
            <text class="summary-label">房间</text>
          </view>
          <view class="summary-item">
            <text class="summary-num">{{ dataSummary.tenants.count }}</text>
            <text class="summary-label">租客</text>
          </view>
          <view class="summary-item">
            <text class="summary-num">{{ dataSummary.contracts.active }}</text>
            <text class="summary-label">活跃合同</text>
          </view>
          <view class="summary-item">
            <text class="summary-num">{{ dataSummary.bills.count }}</text>
            <text class="summary-label">账单</text>
          </view>
          <view class="summary-item">
            <text class="summary-num">{{ dataSummary.readings.count }}</text>
            <text class="summary-label">抄表记录</text>
          </view>
        </view>
      </view>

      <view class="data-actions">
        <view class="btn-big btn-primary" @click="exportData">导出数据备份</view>
        <view class="btn-big btn-warning" @click="triggerImport">导入数据恢复</view>
        <view class="btn-big btn-danger" @click="showClearConfirm = true">清空所有数据</view>
      </view>
    </view>

    <!-- 调试工具 -->
    <view class="card">
      <view class="card-title">调试工具</view>

      <!-- 月份选择 -->
      <view class="form-item" style="margin-bottom: 12px;">
        <text class="form-label">测试数据月份</text>
        <picker mode="date" fields="month" :value="seedMonthPick" @change="onSeedMonthPick">
          <view class="form-picker-val">{{ seedMonthCN }}</view>
        </picker>
      </view>

      <view class="data-actions">
        <view class="btn-big" style="background:#9C27B0;color:#fff;" @click="seedMeterReadings">
          生成抄表测试数据（{{ seedMonthCN }}）
        </view>
      </view>
      <text class="form-hint">清空现有抄表数据，为每个房间随机生成初始水/电表读数</text>
    </view>

    <!-- 操作日志 -->
    <view class="card">
      <view class="card-title">其他</view>

      <view class="menu-item" @click="goOperationLogs">
        <text class="menu-label">操作日志</text>
        <text class="menu-arrow">></text>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-placeholder"></view>

    <!-- 二次确认弹窗 -->
    <view class="modal-mask" v-if="showClearConfirm" @click="showClearConfirm = false">
      <view class="modal-box" @click.stop>
        <text class="modal-title">确认清空</text>
        <text class="modal-desc">此操作将清除所有楼栋、房间、租客、合同、账单和抄表数据，且不可恢复。确定要继续吗？</text>
        <view class="modal-buttons">
          <view class="btn-big modal-btn-cancel" @click="showClearConfirm = false">取消</view>
          <view class="btn-big btn-danger modal-btn-confirm" @click="confirmClearAll">确认清空</view>
        </view>
      </view>
    </view>

    <!-- 导入确认弹窗 -->
    <view class="modal-mask" v-if="showImportConfirm" @click="showImportConfirm = false">
      <view class="modal-box import-modal" @click.stop>
        <text class="modal-title" style="color:#FF9500;">确认导入数据</text>
        <text class="modal-desc">将用备份文件覆盖当前所有数据，此操作不可撤销。</text>

        <view class="import-summary" v-if="importPreview">
          <view class="import-summary-title">备份文件内容</view>
          <view class="import-summary-item">
            <text class="is-label">导出时间</text>
            <text class="is-value">{{ formatDate(importPreview.exportedAt) }}</text>
          </view>
          <view class="import-summary-grid">
            <view class="import-summary-item">
              <text class="is-label">楼栋</text>
              <text class="is-num">{{ importPreview.buildings }} 个</text>
            </view>
            <view class="import-summary-item">
              <text class="is-label">房间</text>
              <text class="is-num">{{ importPreview.rooms }} 间</text>
            </view>
            <view class="import-summary-item">
              <text class="is-label">租客</text>
              <text class="is-num">{{ importPreview.tenants }} 人</text>
            </view>
            <view class="import-summary-item">
              <text class="is-label">合同</text>
              <text class="is-num">{{ importPreview.contracts }} 份</text>
            </view>
            <view class="import-summary-item">
              <text class="is-label">抄表记录</text>
              <text class="is-num">{{ importPreview.readings }} 条</text>
            </view>
            <view class="import-summary-item">
              <text class="is-label">账单</text>
              <text class="is-num">{{ importPreview.bills }} 条</text>
            </view>
          </view>
        </view>

        <view class="modal-buttons">
          <view class="btn-big modal-btn-cancel" @click="showImportConfirm = false">取消</view>
          <view class="btn-big btn-warning modal-btn-confirm" @click="confirmImport">确认导入</view>
        </view>
      </view>
    </view>

    <!-- 导入数据（隐藏的文件选择触发） -->
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import db from '@/utils/db.js'

// 初始化测试数据月份（默认当前月）
function getDefaultSeedMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const seedMonthPick = ref(getDefaultSeedMonth())
const seedMonthCN = computed(() => {
  if (!seedMonthPick.value) return '请选择'
  const [y, m] = seedMonthPick.value.split('-')
  const months = ['一','二','三','四','五','六','七','八','九','十','十一','十二']
  return `${y}年${months[Number(m)-1]}月`
})

function onSeedMonthPick(e) {
  seedMonthPick.value = e.detail.value
}

// ============ 选项配置 ============

const depositOptions = [
  { value: '押一付一', label: '押一付一（1个月押金 + 1个月租金）' },
  { value: '押二付一', label: '押二付一（2个月押金 + 1个月租金）' },
  { value: '押一付三', label: '押一付三（1个月押金 + 3个月租金）' }
]

const contractWarningOptions = [
  { value: 30, label: '30天' },
  { value: 15, label: '15天' },
  { value: 3, label: '3天' }
]

// ============ 表单状态 ============

const typeNames = ['民房', '公寓', '商铺']

const typeRates = reactive({
  '民房': { waterRate: '', electricRate: '', gasRate: '' },
  '公寓': { waterRate: '', electricRate: '', gasRate: '' },
  '商铺': { waterRate: '', electricRate: '', gasRate: '' }
})

const form = reactive({
  internetFee: '',
  sanitationFee: '',
  managementFee: '',
  otherFee: '',
  defaultDepositRule: '押二付一',
  billGenerationStartDay: '',
  billGenerationEndDay: '',
  lateFeeStartDay: '',
  lateFeePerDay: '',
  contractExpiryWarningDays: [30, 15, 3]
})

const showClearConfirm = ref(false)
const showImportConfirm = ref(false)
const importPreview = ref(null)          // 导入文件摘要
const pendingImportData = ref(null)      // 待导入的原始数据
const dataSummary = ref(null)            // 当前数据摘要

// 押金规则 picker 索引
const depositIndex = computed(() => {
  const idx = depositOptions.findIndex(opt => opt.value === form.defaultDepositRule)
  return idx >= 0 ? idx : 1
})

// ============ 数据加载 ============

function loadSettings() {
  const settings = db.getSettings()
  const savedTypeRates = settings.typeRates || {}
  for (const t of typeNames) {
    const r = savedTypeRates[t] || { waterRate: '', electricRate: '', gasRate: '' }
    typeRates[t] = {
      waterRate: String(r.waterRate ?? ''),
      electricRate: String(r.electricRate ?? ''),
      gasRate: String(r.gasRate ?? '')
    }
  }
  form.internetFee = String(settings.internetFee)
  form.sanitationFee = String(settings.sanitationFee ?? '')
  form.managementFee = String(settings.managementFee ?? '')
  form.otherFee = String(settings.otherFee ?? '')
  form.defaultDepositRule = settings.defaultDepositRule
  form.billGenerationStartDay = String(settings.billGenerationStartDay)
  form.billGenerationEndDay = String(settings.billGenerationEndDay)
  form.lateFeeStartDay = String(settings.lateFeeStartDay)
  form.lateFeePerDay = String(settings.lateFeePerDay)
  form.contractExpiryWarningDays = [...settings.contractExpiryWarningDays]
  // 加载数据摘要
  dataSummary.value = db.getDataSummary()
}

// ============ 保存操作 ============

function onTypeRateInput(typeName, field, value) {
  typeRates[typeName][field] = value
}

function saveTypeRates() {
  const typeRatesData = {}
  for (const t of typeNames) {
    typeRatesData[t] = {
      waterRate: parseFloat(typeRates[t].waterRate) || 0,
      electricRate: parseFloat(typeRates[t].electricRate) || 0,
      gasRate: parseFloat(typeRates[t].gasRate) || 0
    }
  }
  db.updateSettings({ typeRates: typeRatesData })
  uni.showToast({ title: '水电单价已保存', icon: 'success' })
}

function saveOtherFees() {
  db.updateSettings({
    internetFee: parseFloat(form.internetFee) || 0,
    sanitationFee: parseFloat(form.sanitationFee) || 0,
    managementFee: parseFloat(form.managementFee) || 0,
    otherFee: parseFloat(form.otherFee) || 0
  })
  uni.showToast({ title: '费用配置已保存', icon: 'success' })
}

function saveDepositRule() {
  db.updateSettings({
    defaultDepositRule: form.defaultDepositRule
  })
  uni.showToast({ title: '押金规则已保存', icon: 'success' })
}

function saveBillDates() {
  const startDay = parseInt(form.billGenerationStartDay) || 25
  const endDay = parseInt(form.billGenerationEndDay) || 30
  db.updateSettings({
    billGenerationStartDay: startDay,
    billGenerationEndDay: endDay
  })
  uni.showToast({ title: '账单日期已保存', icon: 'success' })
}

function saveLateFee() {
  db.updateSettings({
    lateFeeStartDay: parseInt(form.lateFeeStartDay) || 10,
    lateFeePerDay: parseFloat(form.lateFeePerDay) || 5
  })
  uni.showToast({ title: '滞纳金规则已保存', icon: 'success' })
}

function saveContractWarning() {
  const days = [...form.contractExpiryWarningDays].sort((a, b) => b - a)
  db.updateSettings({ contractExpiryWarningDays: days })
  uni.showToast({ title: '提醒设置已保存', icon: 'success' })
}

// ============ 交互操作 ============

function onDepositChange(e) {
  form.defaultDepositRule = depositOptions[e.detail.value].value
}

function toggleWarningDay(day) {
  const idx = form.contractExpiryWarningDays.indexOf(day)
  if (idx >= 0) {
    form.contractExpiryWarningDays.splice(idx, 1)
  } else {
    form.contractExpiryWarningDays.push(day)
  }
}

// ============ 数据管理 ============

/**
 * 获取备份文件名（带时间戳）
 */
function getBackupFileName() {
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  return `房东通_数据备份_${ts}.json`
}

/**
 * 格式化日期时间
 */
function formatDate(isoStr) {
  if (!isoStr) return '未知'
  try {
    const d = new Date(isoStr)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return isoStr
  }
}

/**
 * 导出数据
 */
function exportData() {
  try {
    const data = db.exportAllData()
    const jsonStr = JSON.stringify(data, null, 2)
    const fileName = getBackupFileName()
    const summary = db.getDataSummary()

    // 导出提示
    const tip = `楼栋${summary.buildings.count}个 · 房间${summary.rooms.count}间 · 账单${summary.bills.count}条`

    // #ifdef H5
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    uni.showToast({ title: `已导出: ${tip}`, icon: 'success', duration: 2500 })
    // #endif

    // #ifdef MP-WEIXIN
    const fs = uni.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
    fs.writeFile({
      filePath,
      data: jsonStr,
      encoding: 'utf8',
      success: () => {
        uni.shareFileMessage({
          filePath,
          fileName,
          success: () => {
            uni.showToast({ title: `已导出: ${tip}`, icon: 'success', duration: 2500 })
          },
          fail: () => {
            uni.showToast({ title: `已保存: ${tip}`, icon: 'success', duration: 2500 })
          }
        })
      },
      fail: () => {
        uni.showToast({ title: '导出失败', icon: 'error' })
      }
    })
    // #endif

    // #ifdef APP-PLUS
    // 保存到公共下载目录（手机文件管理器可见）
    plus.io.requestFileSystem(plus.io.PUBLIC_DOWNLOADS, (fs) => {
      fs.root.getFile(fileName, { create: true }, (fileEntry) => {
        fileEntry.createWriter((writer) => {
          writer.onwrite = () => {
            const absPath = plus.io.convertLocalFileSystemURL(fileEntry.fullPath)
            uni.showModal({
              title: '备份已保存',
              content: `文件已保存到下载目录：\n\n${fileName}\n\n可通过手机"文件管理"找到此文件，发送到微信或电脑保存。`,
              showCancel: false,
              confirmText: '知道了'
            })
          }
          writer.onerror = () => {
            uni.showToast({ title: '导出失败：无法写入文件', icon: 'error' })
          }
          writer.write(jsonStr)
        })
      }, () => {
        uni.showToast({ title: '导出失败：无法创建文件', icon: 'error' })
      })
    }, () => {
      uni.showToast({ title: '导出失败：无法访问存储', icon: 'error' })
    })
    // #endif
  } catch (e) {
    uni.showToast({ title: '导出失败: ' + e.message, icon: 'error', duration: 3000 })
  }
}

/**
 * 触发导入（按平台选择不同方式）
 */
function triggerImport() {
  // #ifdef H5
  // 动态创建 file input 触发文件选择（比模板内隐藏 input 更可靠）
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = onFileSelected
  document.body.appendChild(input)
  input.click()
  document.body.removeChild(input)
  // #endif

  // #ifdef MP-WEIXIN
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['.json'],
    success: (res) => {
      const filePath = res.tempFiles[0].path
      const fs = uni.getFileSystemManager()
      try {
        const dataStr = fs.readFileSync(filePath, 'utf8')
        handleImportData(dataStr)
      } catch (e) {
        uni.showToast({ title: '读取文件失败', icon: 'error' })
      }
    }
  })
  // #endif

  // #ifdef APP-PLUS
  // APP 端也用动态创建 file input（WebView 中 uni.chooseFile 不可用）
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = onFileSelected
  document.body.appendChild(input)
  input.click()
  document.body.removeChild(input)
  // #endif
}

/**
 * 处理导入的JSON数据（先校验，再弹确认框）
 */
function handleImportData(dataStr) {
  try {
    const data = JSON.parse(dataStr)
    const validation = db.validateImportData(data)
    if (!validation.valid) {
      uni.showModal({
        title: '文件校验失败',
        content: validation.error + '\n\n请选择正确的房东通备份文件（.json格式）',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }
    // 校验通过，保存数据并弹出确认框
    pendingImportData.value = data
    importPreview.value = validation.summary
    showImportConfirm.value = true
  } catch (e) {
    uni.showToast({ title: '文件格式错误，无法解析JSON', icon: 'error', duration: 2500 })
  }
}

/**
 * 确认执行导入
 */
function confirmImport() {
  if (!pendingImportData.value) return
  const result = db.importAllData(pendingImportData.value)
  showImportConfirm.value = false
  pendingImportData.value = null
  importPreview.value = null

  if (result.success) {
    loadSettings()
    uni.showToast({ title: '数据导入成功', icon: 'success', duration: 2500 })
  } else {
    uni.showToast({ title: '导入失败: ' + (result.error || '未知错误'), icon: 'error', duration: 3000 })
  }
}

// H5 环境文件选择回调
function onFileSelected(e) {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    handleImportData(event.target.result)
  }
  reader.onerror = () => {
    uni.showToast({ title: '读取文件失败', icon: 'error' })
  }
  reader.readAsText(file)
}

function confirmClearAll() {
  db.clearAllData()
  loadSettings()
  showClearConfirm.value = false
  uni.showToast({ title: '所有数据已清空', icon: 'success' })
}

// ============ 调试工具 ============

function seedMeterReadings() {
  const month = seedMonthPick.value
  const monthLabel = seedMonthCN.value
  uni.showModal({
    title: '生成测试数据',
    content: `将清空现有抄表数据，为每个房间随机生成${monthLabel}的初始水/电表读数。确定？`,
    success: (res) => {
      if (res.confirm) {
        const result = db.seedMeterReadings(month)
        if (result.error) {
          uni.showToast({ title: result.error, icon: 'none' })
        } else {
          uni.showToast({
            title: `已生成${result.roomCount}间×2条记录`,
            icon: 'success'
          })
        }
      }
    }
  })
}

// ============ 页面跳转 ============

function goOperationLogs() {
  uni.navigateTo({
    url: '/pages/log/list'
  })
}

// ============ 生命周期 ============

onShow(() => {
  loadSettings()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-top: 8px;
  background-color: #f5f5f5;
}

/* ========== 分组标题 ========== */
.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 16px;
}

/* ========== 表单项 ========== */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 8px;
}

.form-hint {
  display: block;
  font-size: 13px;
  color: #999999;
  margin-top: 6px;
  margin-left: 4px;
}

/* 输入框容器（带 ¥ 前缀） */
.input-wrap {
  display: flex;
  align-items: center;
  background-color: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 0 16px;
  height: 52px;
}

.input-prefix {
  font-size: 20px;
  font-weight: 700;
  color: #333333;
  margin-right: 8px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 18px;
  color: #333333;
  height: 100%;
  background: transparent;
  min-width: 0;
}

.form-input-center {
  text-align: center;
}

/* 双列布局 */
.form-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 20px;
}

.form-group-half {
  flex: 1;
}

.form-group-half .form-input {
  background-color: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  height: 52px;
  line-height: 52px;
  padding: 0;
}

.form-row-divider {
  font-size: 20px;
  font-weight: 600;
  color: #999999;
  padding-bottom: 12px;
  flex-shrink: 0;
}

/* ========== Picker 选择器 ========== */
.form-picker {
  background-color: #f8f8f8;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 0 16px;
  height: 52px;
  display: flex;
  align-items: center;
}

.picker-value {
  font-size: 18px;
  color: #333333;
  flex: 1;
}

/* ========== 自定义 Checkbox ========== */
.checkbox-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 160px;
}

.checkbox-box {
  width: 28px;
  height: 28px;
  border: 2px solid #cccccc;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkbox-checked {
  background-color: #007AFF;
  border-color: #007AFF;
}

.checkbox-icon {
  font-size: 18px;
  color: #ffffff;
  font-weight: 700;
  line-height: 1;
}

.checkbox-label {
  font-size: 16px;
  color: #333333;
}

/* ========== 按类型配置水电 ========== */
.type-rate-group {
  margin-bottom: 18px;
  padding: 14px;
  background-color: #f9f9f9;
  border-radius: 10px;
}

.type-rate-header {
  margin-bottom: 12px;
}

.type-badge {
  display: inline-block;
  font-size: 15px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 6px;
  color: #fff;
}

.badge-民房 { background-color: #4CAF50; }
.badge-公寓 { background-color: #2196F3; }
.badge-商铺 { background-color: #FF9800; }

.type-rate-row {
  display: flex;
  gap: 16px;
}

.type-rate-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.type-rate-label {
  font-size: 14px;
  color: #666;
  min-width: 28px;
}

.type-rate-unit {
  font-size: 12px;
  color: #999;
  min-width: 36px;
}

.input-wrap-sm {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0 8px;
  height: 40px;
}

.input-wrap-sm .input-prefix {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-right: 4px;
  flex-shrink: 0;
}

.input-wrap-sm :deep(input),
.input-wrap-sm :deep(.uni-input-input) {
  flex: 1;
  width: 0;
  min-width: 0;
  font-size: 15px;
  color: #333;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
}

/* ========== 数据操作 ========== */
.data-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.data-actions .btn-big {
  width: 100%;
}

/* ========== 菜单项 ========== */
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.menu-label {
  font-size: 17px;
  font-weight: 600;
  color: #333333;
}

.menu-arrow {
  font-size: 18px;
  color: #cccccc;
  font-weight: 700;
}

/* ========== 底部占位 ========== */
.bottom-placeholder {
  height: 100px;
}

/* ========== 数据概览 ========== */
.data-summary {
  background-color: #f8f8f8;
  border-radius: 10px;
  padding: 14px 12px;
  margin-bottom: 18px;
}

.summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.summary-item {
  flex: 0 0 calc(33.33% - 6px);
  text-align: center;
  padding: 8px 4px;
  background-color: #ffffff;
  border-radius: 8px;
}

.summary-num {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #007AFF;
}

.summary-label {
  display: block;
  font-size: 12px;
  color: #999999;
  margin-top: 2px;
}

/* ========== 导入预览弹窗 ========== */
.import-modal {
  width: 340px;
}

.import-summary {
  background-color: #f8f8f8;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 20px;
  width: 100%;
}

.import-summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 10px;
  text-align: center;
}

.import-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 0.5px solid #e8e8e8;
}

.import-summary-item:last-child {
  border-bottom: none;
}

.is-label {
  font-size: 14px;
  color: #666666;
}

.is-value {
  font-size: 14px;
  color: #999999;
}

.is-num {
  font-size: 14px;
  font-weight: 600;
  color: #FF9500;
}

.import-summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.import-summary-grid .import-summary-item {
  flex: 0 0 50%;
}

/* ========== 按钮样式补充 ========== */
.btn-warning {
  background-color: #FF9500;
  color: #ffffff;
  height: 48px;
  line-height: 48px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
  text-align: center;
}

.card .btn-big {
  margin-top: 4px;
}

/* ========== 确认弹窗 ========== */
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

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #FF3B30;
  margin-bottom: 14px;
}

.modal-desc {
  font-size: 15px;
  color: #666666;
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
  color: #666666;
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
</style>
