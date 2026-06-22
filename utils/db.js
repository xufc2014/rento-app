/**
 * 本地数据库抽象层
 * 使用 uni.setStorage / uni.getStorage 存储 JSON 数据
 * 扁平化集合结构，便于查询和过滤
 */

import { generateId } from './uuid.js'
import { calcUtilityFee } from './calc.js'

// 存储键名定义
const KEYS = {
  SETTINGS: 'rento_settings',
  BUILDINGS: 'rento_buildings',
  ROOMS: 'rento_rooms',
  TENANTS: 'rento_tenants',
  CONTRACTS: 'rento_contracts',
  METER_READINGS: 'rento_meter_readings',
  BILLS: 'rento_bills',
  CHECKOUT_RECORDS: 'rento_checkout_records',
  OPERATION_LOGS: 'rento_operation_logs'
}

// 默认设置
const DEFAULT_SETTINGS = {
  typeRates: {
    '民房': { waterRate: 5, electricRate: 1, gasRate: 5 },
    '公寓': { waterRate: 8, electricRate: 1, gasRate: 5 },
    '商铺': { waterRate: 8, electricRate: 1, gasRate: 5 }
  },
  internetFee: 50,               // 元/月
  sanitationFee: 20,              // 卫生费/月
  managementFee: 30,              // 管理费/月
  otherFee: 0,                    // 其他费用/月
  defaultDepositRule: '押二付一',
  billGenerationStartDay: 25,
  billGenerationEndDay: 30,
  lateFeeStartDay: 10,           // 逾期10天开始算滞纳金
  lateFeePerDay: 5,              // 每天加5元
  contractExpiryWarningDays: [30, 15, 3] // 提前天数提醒
}

class Database {
  constructor() {
    this._cache = {}
  }

  /**
   * 初始化默认数据
   */
  initDefaults() {
    const settings = this.get(KEYS.SETTINGS)
    if (!settings) {
      this.set(KEYS.SETTINGS, DEFAULT_SETTINGS)
    }
    // 确保其他集合存在（至少是空数组）
    for (const key of [KEYS.BUILDINGS, KEYS.ROOMS, KEYS.TENANTS, KEYS.CONTRACTS,
      KEYS.METER_READINGS, KEYS.BILLS, KEYS.CHECKOUT_RECORDS, KEYS.OPERATION_LOGS]) {
      if (!this.get(key)) {
        this.set(key, [])
      }
    }
  }

  /**
   * 读取数据
   */
  get(key) {
    if (this._cache[key]) return this._cache[key]
    try {
      const data = uni.getStorageSync(key)
      this._cache[key] = data
      return data
    } catch (e) {
      console.error('读取存储失败:', key, e)
      return null
    }
  }

  /**
   * 写入数据
   */
  set(key, data) {
    this._cache[key] = data
    try {
      uni.setStorageSync(key, data)
    } catch (e) {
      console.error('写入存储失败:', key, e)
    }
  }

  // ============ Settings ============

  getSettings() {
    return this.get(KEYS.SETTINGS) || DEFAULT_SETTINGS
  }

  updateSettings(updates) {
    const settings = this.getSettings()
    const merged = { ...settings, ...updates }
    this.set(KEYS.SETTINGS, merged)
    this.logOperation('更新设置', 'settings', 'all', `修改了: ${Object.keys(updates).join(',')}`)
    return merged
  }

  /**
   * 获取某房间的水电燃气单价
   * 优先级：房间自定义 > 类型默认 > 全局默认
   * @param {string} roomId
   * @param {string} meterType - 'water' / 'electric' / 'gas'
   * @returns {number}
   */
  getRoomRate(roomId, meterType) {
    const room = this.getRoomById(roomId)
    const settings = this.getSettings()
    const typeRates = settings.typeRates || DEFAULT_SETTINGS.typeRates

    // 字段名映射
    const fieldMap = {
      water: 'waterRate',
      electric: 'electricRate',
      gas: 'gasRate'
    }
    const roomField = meterType === 'water' ? 'waterRate' : (meterType === 'electric' ? 'electricRate' : 'gasRate')

    // 1. 房间自定义单价优先
    if (room) {
      if (room[roomField] != null && room[roomField] !== 0) {
        return Number(room[roomField])
      }

      // 2. 按类型取默认单价
      const unitType = room.unitType || '民房'
      const typeConfig = typeRates[unitType]
      if (typeConfig) {
        if (typeConfig[fieldMap[meterType]] != null) {
          return Number(typeConfig[fieldMap[meterType]])
        }
      }
    }

    // 3. 最终兜底
    const fallback = typeRates['民房'] || { waterRate: 5, electricRate: 1, gasRate: 5 }
    return Number(fallback[fieldMap[meterType]] || 0)
  }

  // ============ Buildings ============

  getBuildings() {
    return this.get(KEYS.BUILDINGS) || []
  }

  addBuilding(building) {
    const buildings = this.getBuildings()
    // 检查楼栋名是否重复
    const dup = buildings.find(b => b.name === building.name.trim())
    if (dup) {
      return { error: '楼栋名称已存在', duplicateId: dup.id }
    }
    const newBuilding = {
      id: generateId(),
      name: building.name,
      description: building.description || '',
      createdAt: new Date().toISOString()
    }
    buildings.push(newBuilding)
    this.set(KEYS.BUILDINGS, buildings)
    this.logOperation('添加楼栋', 'building', newBuilding.id, `添加了${building.name}`)
    return newBuilding
  }

  getBuildingById(id) {
    return this.getBuildings().find(b => b.id === id) || null
  }

  updateBuilding(id, updates) {
    const buildings = this.getBuildings()
    const idx = buildings.findIndex(b => b.id === id)
    if (idx === -1) return null
    buildings[idx] = { ...buildings[idx], ...updates }
    this.set(KEYS.BUILDINGS, buildings)
    this.logOperation('更新楼栋', 'building', id, `修改了${buildings[idx].name}`)
    return buildings[idx]
  }

  deleteBuilding(id) {
    const buildings = this.getBuildings()
    const building = buildings.find(b => b.id === id)
    if (!building) return false
    // 检查是否还有房间
    const rooms = this.getRoomsByBuilding(id)
    // 有房间也允许删除（级联清理所有关联数据）
    if (rooms.length > 0) {
      for (const room of rooms) {
        this._cleanupRoomData(room.id)
      }
    }
    this.set(KEYS.BUILDINGS, buildings.filter(b => b.id !== id))
    this.set(KEYS.ROOMS, this.getRooms().filter(r => r.buildingId !== id))
    this.logOperation('删除楼栋', 'building', id, `删除了${building.name}${rooms.length ? `及旗下${rooms.length}间房` : ''}`)
    return true
  }

  // ============ Rooms ============

  getRooms() {
    return this.get(KEYS.ROOMS) || []
  }

  getRoomsByBuilding(buildingId) {
    return this.getRooms().filter(r => r.buildingId === buildingId)
  }

  getRoomsByFloor(buildingId, floor) {
    return this.getRooms().filter(r => r.buildingId === buildingId && r.floor === floor)
  }

  getRoomById(id) {
    return this.getRooms().find(r => r.id === id)
  }

  addRoom(room) {
    const rooms = this.getRooms()
    const settings = this.getSettings()
    const newRoom = {
      id: generateId(),
      buildingId: room.buildingId,
      floor: room.floor,
      roomNumber: room.roomNumber,
      unitType: room.unitType || '民房',
      area: room.area || 0,
      baseRent: room.baseRent || 0,
      isCommercial: room.isCommercial || false,
      waterRate: room.waterRate || null,    // null = 使用默认
      electricRate: room.electricRate || null,
      internetFee: room.internetFee || null,
      extraDeposit: room.extraDeposit || 0,
      extraDepositNote: room.extraDepositNote || '',
      notes: room.notes || '',
      status: '空置',
      currentTenantId: null,
      currentContractId: null,
      createdAt: new Date().toISOString()
    }
    rooms.push(newRoom)
    this.set(KEYS.ROOMS, rooms)
    this.logOperation('添加房间', 'room', newRoom.id, `${room.floor}-${room.roomNumber}`)
    return newRoom
  }

  /**
   * 批量生成房间（B楼场景：16层×5户）
   */
  batchAddRooms(buildingId, floorConfigs) {
    const rooms = this.getRooms()
    const added = []
    for (const config of floorConfigs) {
      for (const roomCfg of config.rooms) {
        const newRoom = {
          id: generateId(),
          buildingId: buildingId,
          floor: config.floor,
          roomNumber: roomCfg.roomNumber,
          unitType: roomCfg.unitType || '民房',
          area: roomCfg.area || 0,
          baseRent: roomCfg.baseRent || 0,
          isCommercial: roomCfg.isCommercial || false,
          waterRate: roomCfg.waterRate || null,
          electricRate: roomCfg.electricRate || null,
          internetFee: roomCfg.internetFee || null,
          extraDeposit: 0,
          extraDepositNote: '',
          notes: '',
          status: '空置',
          currentTenantId: null,
          currentContractId: null,
          createdAt: new Date().toISOString()
        }
        rooms.push(newRoom)
        added.push(newRoom)
      }
    }
    this.set(KEYS.ROOMS, rooms)
    this.logOperation('批量添加房间', 'room', buildingId, `批量生成了${added.length}个房间`)
    return added
  }

  updateRoom(id, updates) {
    const rooms = this.getRooms()
    const idx = rooms.findIndex(r => r.id === id)
    if (idx === -1) return null
    const old = rooms[idx]
    rooms[idx] = { ...rooms[idx], ...updates }
    this.set(KEYS.ROOMS, rooms)
    // 修改租金时记录日志，并同步到活跃合同
    if (updates.baseRent !== undefined && updates.baseRent !== old.baseRent) {
      this.logOperation('修改租金', 'room', id, `${old.floor}-${old.roomNumber}: ${old.baseRent} → ${updates.baseRent}`)
      // 同步租金到该房间的活跃合同
      if (old.currentContractId) {
        const contracts = this.getContracts()
        const cIdx = contracts.findIndex(c => c.id === old.currentContractId && c.status === '活跃')
        if (cIdx !== -1) {
          contracts[cIdx].rentAmount = updates.baseRent
          this.set(KEYS.CONTRACTS, contracts)
        }
      }
    }
    return rooms[idx]
  }

  /**
   * 删除单个房间（只允许删除空置或退租中状态的房间）
   * 级联清理该房间关联的数据：账单、抄表记录、退租记录
   */
  deleteRoom(id) {
    const rooms = this.getRooms()
    const room = rooms.find(r => r.id === id)
    if (!room) return { error: '房间不存在' }
    if (room.status !== '空置' && room.status !== '退租中') {
      return { error: `房间 ${room.roomNumber} 当前状态为"${room.status}"，无法删除。只能删除空置或退租中的房间。` }
    }

    // 级联清理关联数据
    this._cleanupRoomData(id)

    this.set(KEYS.ROOMS, rooms.filter(r => r.id !== id))
    this.logOperation('删除房间', 'room', id, `${room.floor}层 ${room.roomNumber}`)
    return true
  }

  /**
   * 批量删除房间（只允许删除空置或退租中状态的房间）
   * 返回 { success: [...], failed: [{id, roomNumber, reason}] }
   * 级联清理每个房间关联的数据
   */
  deleteRooms(ids) {
    const rooms = this.getRooms()
    const success = []
    const failed = []
    const keepIds = new Set()

    for (const id of ids) {
      const room = rooms.find(r => r.id === id)
      if (!room) {
        failed.push({ id, roomNumber: id, reason: '房间不存在' })
        continue
      }
      if (room.status !== '空置' && room.status !== '退租中') {
        failed.push({ id, roomNumber: room.roomNumber, reason: `状态为"${room.status}"，只能删除空置或退租中房间` })
        keepIds.add(id)
        continue
      }
      // 级联清理该房间的关联数据
      this._cleanupRoomData(id)
      success.push(room)
    }

    const deleteSet = new Set(ids.filter(id => !keepIds.has(id)))
    this.set(KEYS.ROOMS, rooms.filter(r => !deleteSet.has(r.id)))

    if (success.length > 0) {
      this.logOperation('批量删除房间', 'room', 'batch', `删除了${success.length}间: ${success.map(r => r.roomNumber).join(', ')}`)
    }

    return { success, failed }
  }

  /**
   * 级联清理房间关联数据（账单、抄表记录、退租记录）
   * @param {string} roomId - 被删除的房间ID
   */
  _cleanupRoomData(roomId) {
    // 清理该房间的所有账单
    const bills = this.getBills()
    const remainingBills = bills.filter(b => b.roomId !== roomId)
    if (remainingBills.length < bills.length) {
      this.set(KEYS.BILLS, remainingBills)
    }

    // 清理该房间的所有抄表记录
    const readings = this.getMeterReadings()
    const remainingReadings = readings.filter(r => r.roomId !== roomId)
    if (remainingReadings.length < readings.length) {
      this.set(KEYS.METER_READINGS, remainingReadings)
    }

    // 清理该房间的退租记录
    const checkouts = this.get(KEYS.CHECKOUT_RECORDS) || []
    const remainingCheckouts = checkouts.filter(c => c.roomId !== roomId)
    if (remainingCheckouts.length < checkouts.length) {
      this.set(KEYS.CHECKOUT_RECORDS, remainingCheckouts)
    }

    // 注意：合同和租客不在此清理，因为租客可能还有其他房间
    // 合同会因找不到房间而在首页被过滤
  }

  /**
   * 房间状态流转
   * 空置 → 已预订 → 已入住 → 退租中 → 空置
   */
  changeRoomStatus(id, newStatus, extraData = {}) {
    const validFlow = {
      '空置': ['已预订', '已入住'],
      '已预订': ['空置', '已入住'],
      '已入住': ['退租中'],
      '退租中': ['空置']
    }
    const room = this.getRoomById(id)
    if (!room) return { error: '房间不存在' }
    const allowed = validFlow[room.status] || []
    if (!allowed.includes(newStatus)) {
      return { error: `房间当前状态"${room.status}"不能直接变为"${newStatus}"` }
    }
    return this.updateRoom(id, { status: newStatus, ...extraData })
  }

  // ============ Tenants ============

  getTenants() {
    return this.get(KEYS.TENANTS) || []
  }

  getTenantById(id) {
    return this.getTenants().find(t => t.id === id)
  }

  addTenant(tenant) {
    const tenants = this.getTenants()
    const newTenant = {
      id: generateId(),
      name: tenant.name,
      idCard: tenant.idCard || '',
      phone: tenant.phone || '',
      notes: tenant.notes || '',
      isBlacklisted: false,
      createdAt: new Date().toISOString()
    }
    tenants.push(newTenant)
    this.set(KEYS.TENANTS, tenants)
    this.logOperation('添加租客', 'tenant', newTenant.id, `添加了${tenant.name}`)
    return newTenant
  }

  updateTenant(id, updates) {
    const tenants = this.getTenants()
    const idx = tenants.findIndex(t => t.id === id)
    if (idx === -1) return null
    tenants[idx] = { ...tenants[idx], ...updates }
    this.set(KEYS.TENANTS, tenants)
    return tenants[idx]
  }

  blacklistTenant(id, reason) {
    return this.updateTenant(id, { isBlacklisted: true, blacklistReason: reason })
  }

  // ============ Contracts ============

  getContracts() {
    return this.get(KEYS.CONTRACTS) || []
  }

  getActiveContracts() {
    return this.getContracts().filter(c => c.status === '活跃')
  }

  getContractById(id) {
    return this.getContracts().find(c => c.id === id)
  }

  getContractsByRoom(roomId) {
    return this.getContracts().filter(c => c.roomId === roomId)
  }

  getContractsByTenant(tenantId) {
    return this.getContracts().filter(c => c.tenantId === tenantId)
  }

  /**
   * 更新合同信息
   */
  updateContract(contractId, updates) {
    const contracts = this.getContracts()
    const idx = contracts.findIndex(c => c.id === contractId)
    if (idx === -1) return { error: '合同不存在' }

    // 只允许修改的字段
    const allowedFields = ['startDate', 'endDate', 'rentAmount', 'depositAmount', 'depositRule', 'extraDeposit', 'extraDepositNote', 'sanitationFee', 'managementFee', 'otherFee']
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        contracts[idx][key] = updates[key]
      }
    }
    contracts[idx].updatedAt = new Date().toISOString()
    this.set(KEYS.CONTRACTS, contracts)

    // 如果修改了租金，同步更新房间的baseRent
    if (updates.rentAmount !== undefined) {
      this.updateRoom(contracts[idx].roomId, { baseRent: updates.rentAmount })
    }

    this.logOperation('修改合同', 'contract', contractId,
      `修改了合同信息`)
    return contracts[idx]
  }

  /**
   * 签订合同
   * @param {object} contract - 合同数据
   * @param {string} contract.roomId
   * @param {string} contract.tenantId
   * @param {string} contract.startDate
   * @param {string} contract.endDate
   * @param {number} contract.rentAmount
   * @param {number} contract.depositAmount
   * @param {string} contract.depositRule
   * @param {number} contract.extraDeposit
   * @param {string} contract.extraDepositNote
   * @param {number} contract.internetFee
   * @param {number} contract.sanitationFee
   * @param {number} contract.managementFee
   * @param {number} contract.otherFee
   * @param {number} contract.initialWaterReading - 水表底读（可选）
   * @param {number} contract.initialElectricReading - 电表底读（可选）
   * @param {number} contract.initialGasReading - 气表底读（可选）
   */
  addContract(contract) {
    const contracts = this.getContracts()
    const room = this.getRoomById(contract.roomId)
    if (!room) return { error: '房间不存在' }
    if (room.status === '已入住' && room.currentContractId) {
      return { error: '该房间已有活跃合同' }
    }

    const newContract = {
      id: generateId(),
      roomId: contract.roomId,
      tenantId: contract.tenantId,
      startDate: contract.startDate,
      endDate: contract.endDate,
      depositAmount: contract.depositAmount || 0,
      depositRule: contract.depositRule || this.getSettings().defaultDepositRule,
      rentAmount: contract.rentAmount || room.baseRent,
      extraDeposit: contract.extraDeposit || 0,
      extraDepositNote: contract.extraDepositNote || '',
      internetFee: contract.internetFee || 0,
      sanitationFee: contract.sanitationFee || 0,
      managementFee: contract.managementFee || 0,
      otherFee: contract.otherFee || 0,
      // 初始读数（底读）
      initialWaterReading: contract.initialWaterReading != null ? Number(contract.initialWaterReading) : null,
      initialElectricReading: contract.initialElectricReading != null ? Number(contract.initialElectricReading) : null,
      initialGasReading: contract.initialGasReading != null ? Number(contract.initialGasReading) : null,
      status: '活跃',
      parentId: null,
      createdAt: new Date().toISOString()
    }
    contracts.push(newContract)
    this.set(KEYS.CONTRACTS, contracts)

    // 保存初始读数为抄表记录（date = 合同开始日期前一天，确保首月账单计算正确）
    this._saveInitialReadings(newContract, contract)

    // 更新房间状态和租金
    this.updateRoom(contract.roomId, {
      status: '已入住',
      currentTenantId: contract.tenantId,
      currentContractId: newContract.id,
      baseRent: newContract.rentAmount  // 签订合同时同步租金到房间
    })

    this.logOperation('签订合同', 'contract', newContract.id,
      `${room.floor}-${room.roomNumber} 租客:${contract.tenantId}`)
    return newContract
  },

  /**
   * 保存初始读数为抄表记录
   * 将初始读数保存为 readingDate = contract.startDate 的抄表记录
   * 这样 calcUtilityFee 在计算首月账单时能正确找到基准读数
   * @param {object} contract - 新合同对象
   * @param {object} contractData - 原始合同数据（含 initialReadings）
   */
  _saveInitialReadings(contract, contractData) {
    const startDate = new Date(contract.startDate)
    // 初始读数日期设为合同开始日期（当天），这样首月账单能正确计算
    const readingDate = contract.startDate + 'T00:00:00.000Z'

    const readings = this.getMeterReadings()

    // 水表底读
    if (contractData.initialWaterReading != null && contractData.initialWaterReading !== '') {
      const waterReading = {
        id: generateId(),
        roomId: contract.roomId,
        meterType: 'water',
        readingValue: Number(contractData.initialWaterReading),
        previousValue: 0,
        consumption: 0,  // 初始读数无用量
        isAnomaly: false,
        anomalyType: null,
        isAnomalyConfirmed: true,
        photoPath: null,
        readingDate: readingDate,
        notes: '入住底读',
        isInitial: true,  // 标记为初始读数
        createdAt: new Date().toISOString()
      }
      readings.push(waterReading)
    }

    // 电表底读
    if (contractData.initialElectricReading != null && contractData.initialElectricReading !== '') {
      const electricReading = {
        id: generateId(),
        roomId: contract.roomId,
        meterType: 'electric',
        readingValue: Number(contractData.initialElectricReading),
        previousValue: 0,
        consumption: 0,
        isAnomaly: false,
        anomalyType: null,
        isAnomalyConfirmed: true,
        photoPath: null,
        readingDate: readingDate,
        notes: '入住底读',
        isInitial: true,
        createdAt: new Date().toISOString()
      }
      readings.push(electricReading)
    }

    // 气表底读
    if (contractData.initialGasReading != null && contractData.initialGasReading !== '') {
      const gasReading = {
        id: generateId(),
        roomId: contract.roomId,
        meterType: 'gas',
        readingValue: Number(contractData.initialGasReading),
        previousValue: 0,
        consumption: 0,
        isAnomaly: false,
        anomalyType: null,
        isAnomalyConfirmed: true,
        photoPath: null,
        readingDate: readingDate,
        notes: '入住底读',
        isInitial: true,
        createdAt: new Date().toISOString()
      }
      readings.push(gasReading)
    }

    if (readings.length > this.getMeterReadings().length) {
      this.set(KEYS.METER_READINGS, readings)
    }
  }

  /**
   * 续签合同
   */
  renewContract(contractId, newContractData) {
    const oldContract = this.getContractById(contractId)
    if (!oldContract) return { error: '原合同不存在' }

    // 归档原合同
    const contracts = this.getContracts()
    const idx = contracts.findIndex(c => c.id === contractId)
    contracts[idx].status = '已续签'
    this.set(KEYS.CONTRACTS, contracts)

    // 创建新合同（继承旧合同，但允许调整押金）
    const newContract = {
      id: generateId(),
      roomId: oldContract.roomId,
      tenantId: oldContract.tenantId,
      startDate: newContractData.startDate,
      endDate: newContractData.endDate,
      depositAmount: newContractData.depositAmount != null ? newContractData.depositAmount : oldContract.depositAmount,
      depositRule: newContractData.depositRule || oldContract.depositRule,
      rentAmount: newContractData.rentAmount || oldContract.rentAmount,
      extraDeposit: newContractData.extraDeposit != null ? newContractData.extraDeposit : (oldContract.extraDeposit || 0),
      extraDepositNote: newContractData.extraDepositNote != null ? newContractData.extraDepositNote : (oldContract.extraDepositNote || ''),
      sanitationFee: newContractData.sanitationFee != null ? newContractData.sanitationFee : (oldContract.sanitationFee || 0),
      managementFee: newContractData.managementFee != null ? newContractData.managementFee : (oldContract.managementFee || 0),
      otherFee: newContractData.otherFee != null ? newContractData.otherFee : (oldContract.otherFee || 0),
      status: '活跃',
      parentId: contractId,
      createdAt: new Date().toISOString()
    }
    contracts.push(newContract)
    this.set(KEYS.CONTRACTS, contracts)

    // 更新房间关联和租金
    this.updateRoom(oldContract.roomId, {
      currentContractId: newContract.id,
      baseRent: newContract.rentAmount  // 续签时同步新租金到房间
    })

    this.logOperation('续签合同', 'contract', newContract.id,
      `续签自${contractId}, 租金:${oldContract.rentAmount}→${newContract.rentAmount}`)
    return newContract
  }

  /**
   * 获取即将到期的合同
   */
  getExpiringContracts(daysThreshold = 30) {
    const now = new Date()
    const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000)
    return this.getActiveContracts().filter(c => {
      const endDate = new Date(c.endDate)
      return endDate <= threshold && endDate >= now
    })
  }

  // ============ Meter Readings ============

  getMeterReadings() {
    return this.get(KEYS.METER_READINGS) || []
  }

  /**
   * 获取所有抄表记录（供统计使用）
   */
  getAllMeterReadings() {
    return this.getMeterReadings()
  }

  /**
   * 清空抄表数据并生成随机初始读数（调试用）
   * 每个房间生成一条水表+一条电表记录，日期为2026年5月
   */
  seedMeterReadings() {
    const rooms = this.getRooms()
    if (rooms.length === 0) return { error: '没有房间数据，请先添加房间' }

    // 清空现有抄表数据
    this.set(KEYS.METER_READINGS, [])
    this._cache[KEYS.METER_READINGS] = []

    const readings = []
    let count = 0

    for (const room of rooms) {
      // 水表：随机 30~180 吨
      const waterValue = Math.round((30 + Math.random() * 150) * 10) / 10
      // 电表：随机 100~800 度
      const electricValue = Math.round((100 + Math.random() * 700) * 10) / 10

      // 水表记录
      readings.push({
        id: generateId(),
        roomId: room.id,
        meterType: 'water',
        readingValue: waterValue,
        previousValue: 0,
        consumption: waterValue,
        isAnomaly: false,
        anomalyType: null,
        isAnomalyConfirmed: false,
        photoPath: null,
        readingDate: '2026-05-15T10:00:00.000Z',
        notes: '初始读数',
        createdAt: '2026-05-15T10:00:00.000Z'
      })

      // 电表记录
      readings.push({
        id: generateId(),
        roomId: room.id,
        meterType: 'electric',
        readingValue: electricValue,
        previousValue: 0,
        consumption: electricValue,
        isAnomaly: false,
        anomalyType: null,
        isAnomalyConfirmed: false,
        photoPath: null,
        readingDate: '2026-05-15T10:00:00.000Z',
        notes: '初始读数',
        createdAt: '2026-05-15T10:00:00.000Z'
      })

      count++
    }

    this.set(KEYS.METER_READINGS, readings)
    this.logOperation('初始化抄表数据', 'meter', 'seed', `为${count}个房间生成了初始水/电表读数（2026年5月）`)

    return { success: true, roomCount: count, readingCount: readings.length }
  }

  getMeterReadingsByRoom(roomId) {
    return this.getMeterReadings().filter(r => r.roomId === roomId)
  }

  getLatestReading(roomId, meterType) {
    const readings = this.getMeterReadingsByRoom(roomId)
      .filter(r => r.meterType === meterType)
      .sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate))
    return readings[0] || null
  }

  /**
   * 录入抄表数据 - 含防错逻辑
   */
  addMeterReading(reading) {
    const readings = this.getMeterReadings()
    const latest = this.getLatestReading(reading.roomId, reading.meterType)
    const previousValue = latest ? latest.readingValue : 0

    const consumption = reading.readingValue - previousValue
    const settings = this.getSettings()
    const room = this.getRoomById(reading.roomId)

    // 异常检测：读数超过历史峰值3倍
    const allReadings = this.getMeterReadingsByRoom(reading.roomId)
      .filter(r => r.meterType === reading.meterType)
    const maxConsumption = allReadings.length > 0
      ? Math.max(...allReadings.map(r => r.consumption || 0))
      : 0
    const isAnomaly = maxConsumption > 0 && consumption > maxConsumption * 3

    // 读数小于上次的异常
    const isDecrease = reading.readingValue < previousValue && previousValue > 0

    const newReading = {
      id: generateId(),
      roomId: reading.roomId,
      meterType: reading.meterType,
      readingValue: reading.readingValue,
      previousValue: previousValue,
      consumption: consumption,
      isAnomaly: isAnomaly || isDecrease,
      anomalyType: isDecrease ? '读数倒退' : (isAnomaly ? '用量异常偏高' : null),
      isAnomalyConfirmed: reading.forceConfirm || false,
      photoPath: reading.photoPath || null,
      readingDate: reading.readingDate || new Date().toISOString(),
      notes: reading.notes || '',
      createdAt: new Date().toISOString()
    }
    readings.push(newReading)
    this.set(KEYS.METER_READINGS, readings)
    this.logOperation('抄表录入', 'meter', newReading.id,
      `${reading.meterType}: ${previousValue}→${reading.readingValue}, 用量${consumption}`)
    return newReading
  }

  // ============ Bills ============

  getBills() {
    return this.get(KEYS.BILLS) || []
  }

  getBillById(id) {
    return this.getBills().find(b => b.id === id)
  }

  getBillsByRoom(roomId) {
    return this.getBills().filter(b => b.roomId === roomId)
  }

  getBillsByMonth(month) {
    return this.getBills().filter(b => b.month === month)
  }

  getOverdueBills() {
    return this.getBills().filter(b => b.status === '逾期' || b.status === '未支付')
  }

  /**
   * 生成单间账单
   */
  generateBill(roomId, month, options = {}) {
    const room = this.getRoomById(roomId)
    if (!room) return { error: '房间不存在' }
    if (room.status !== '已入住') return { error: '该房间当前无人入住' }

    const contract = this.getContractById(room.currentContractId)
    if (!contract) return { error: '该房间没有活跃合同' }

    const settings = this.getSettings()

    // 计算水电燃气费
    const waterFee = calcUtilityFee(roomId, 'water', month, this)
    const electricFee = calcUtilityFee(roomId, 'electric', month, this)
    const gasFee = calcUtilityFee(roomId, 'gas', month, this)

    const rentAmount = contract.rentAmount
    const internetFee = room.internetFee || settings.internetFee
    const sanitationFee = contract.sanitationFee || settings.sanitationFee || 0
    const managementFee = contract.managementFee || settings.managementFee || 0
    const otherFee = contract.otherFee || settings.otherFee || 0
    const deduction = options.deduction || 0
    const deductionReason = options.deductionReason || ''

    const totalAmount = rentAmount + waterFee + electricFee + gasFee + internetFee + sanitationFee + managementFee + otherFee - deduction

    const bill = {
      id: generateId(),
      roomId: roomId,
      contractId: contract.id,
      tenantId: contract.tenantId,
      month: month,
      rentAmount: rentAmount,
      waterFee: waterFee,
      electricFee: electricFee,
      gasFee: gasFee,
      internetFee: internetFee,
      sanitationFee: sanitationFee,
      managementFee: managementFee,
      otherFee: otherFee,
      deduction: deduction,
      deductionReason: deductionReason,
      totalAmount: totalAmount,
      status: '未支付',
      paidAt: null,
      lateFee: 0,
      createdAt: new Date().toISOString()
    }

    const bills = this.getBills()
    // 检查是否已存在该月该房间的账单
    const existing = bills.find(b => b.roomId === roomId && b.month === month)
    if (existing) return { error: `${month}月该房间账单已存在` }

    bills.push(bill)
    this.set(KEYS.BILLS, bills)
    this.logOperation('生成账单', 'bill', bill.id,
      `${room.floor}-${room.roomNumber} ${month}月 ¥${totalAmount}`)
    return bill
  }

  /**
   * 批量生成账单
   */
  batchGenerateBills(roomIds, month, options = {}) {
    const results = []
    for (const roomId of roomIds) {
      const result = this.generateBill(roomId, month, options)
      results.push(result)
    }
    return results
  }

  /**
   * 标记账单已支付
   */
  markBillPaid(billId) {
    const bills = this.getBills()
    const idx = bills.findIndex(b => b.id === billId)
    if (idx === -1) return null
    bills[idx].status = '已支付'
    bills[idx].paidAt = new Date().toISOString()
    this.set(KEYS.BILLS, bills)
    this.logOperation('标记支付', 'bill', billId, `¥${bills[idx].totalAmount}`)
    return bills[idx]
  }

  /**
   * 计算并更新滞纳金
   */
  updateLateFees() {
    const settings = this.getSettings()
    const bills = this.getBills()
    const now = new Date()

    for (const bill of bills) {
      if (bill.status !== '未支付') continue
      const created = new Date(bill.createdAt)
      const daysOverdue = Math.floor((now - created) / (24 * 60 * 60 * 1000)) - settings.lateFeeStartDay
      if (daysOverdue > 0) {
        bill.lateFee = daysOverdue * settings.lateFeePerDay
        bill.status = '逾期'
      }
    }
    this.set(KEYS.BILLS, bills)
    return bills
  }

  // ============ Checkout ============

  getCheckoutRecords() {
    return this.get(KEYS.CHECKOUT_RECORDS) || []
  }

  /**
   * 退租结算
   */
  processCheckout(data) {
    const room = this.getRoomById(data.roomId)
    if (!room) return { error: '房间不存在' }

    const contract = this.getContractById(room.currentContractId)
    const settings = this.getSettings()

    // 获取最终水电燃气读数（使用用户在退租页面手动输入的读数和已计算好的费用）
    // 优先使用传入的 waterFee/electricFee/gasFee（由 checkout 页面基于用户输入读数计算）
    // 如果没有传入，则从数据库历史读数计算（兜底）
    const waterFee = data.waterFee != null ? data.waterFee : calcUtilityFee(data.roomId, 'water', null, this)
    const electricFee = data.electricFee != null ? data.electricFee : calcUtilityFee(data.roomId, 'electric', null, this)
    const gasFee = data.gasFee != null ? data.gasFee : calcUtilityFee(data.roomId, 'gas', null, this)

    const repairDeduction = data.repairDeduction || 0
    const unpaidRent = data.unpaidRent || 0

    // 总押金 = 基础押金 + 额外押金
    const baseDeposit = contract ? contract.depositAmount : 0
    const extraDeposit = contract ? (contract.extraDeposit || 0) : 0
    const totalDeposit = baseDeposit + extraDeposit

    // 应退金额 = 总押金 - 水费 - 电费 - 气费 - 维修扣款 - 未交房租
    const totalReturn = totalDeposit - waterFee - electricFee - gasFee - repairDeduction - unpaidRent

    const record = {
      id: generateId(),
      roomId: data.roomId,
      tenantId: data.tenantId || room.currentTenantId,
      contractId: data.contractId || room.currentContractId,
      checkoutDate: data.checkoutDate || new Date().toISOString(),
      finalWaterReading: data.finalWaterReading,
      finalElectricReading: data.finalElectricReading,
      finalGasReading: data.finalGasReading,
      waterFee: waterFee,
      electricFee: electricFee,
      gasFee: gasFee,
      repairDeduction: repairDeduction,
      repairNotes: data.repairNotes || '',
      unpaidRent: unpaidRent,
      depositAmount: baseDeposit,
      extraDeposit: extraDeposit,
      extraDepositNote: contract ? (contract.extraDepositNote || '') : '',
      totalDeposit: totalDeposit,
      totalReturnAmount: totalReturn,
      createdAt: new Date().toISOString()
    }

    const records = this.getCheckoutRecords()
    records.push(record)
    this.set(KEYS.CHECKOUT_RECORDS, records)

    // 归档合同
    if (contract) {
      const contracts = this.getContracts()
      const idx = contracts.findIndex(c => c.id === contract.id)
      if (idx !== -1) {
        contracts[idx].status = '历史'
        this.set(KEYS.CONTRACTS, contracts)
      }
    }

    // 房间变为空置，退租结算已完成
    this.updateRoom(data.roomId, {
      status: '空置',
      currentTenantId: null,
      currentContractId: null
    })

    this.logOperation('退租结算', 'checkout', record.id,
      `${room.floor}-${room.roomNumber} 应退¥${totalReturn}`)
    return record
  }

  // ============ Operation Logs ============

  getOperationLogs() {
    return this.get(KEYS.OPERATION_LOGS) || []
  }

  logOperation(action, targetType, targetId, detail) {
    const logs = this.getOperationLogs()
    logs.push({
      id: generateId(),
      action: action,
      targetType: targetType,
      targetId: targetId,
      detail: detail,
      createdAt: new Date().toISOString()
    })
    this.set(KEYS.OPERATION_LOGS, logs)
  }

  // ============ Statistics ============

  /**
   * 获取首页看板数据
   * 过滤掉已删除房间的脏数据
   */
  getDashboardData() {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // 当前存在的房间ID集合（用于过滤脏数据）
    const existingRoomIds = new Set(this.getRooms().map(r => r.id))

    // 今日待办（只保留房间仍存在的数据）
    const allExpiringContracts = this.getExpiringContracts(30)
    const expiringContracts = allExpiringContracts.filter(c => existingRoomIds.has(c.roomId))

    const allOverdueBills = this.getOverdueBills()
    const overdueBills = allOverdueBills.filter(b => existingRoomIds.has(b.roomId))

    // 资金流水
    const monthBills = this.getBillsByMonth(currentMonth)
    const totalReceived = monthBills.filter(b => b.status === '已支付').reduce((sum, b) => sum + b.totalAmount + b.lateFee, 0)
    const totalPending = monthBills.filter(b => b.status !== '已支付').reduce((sum, b) => sum + b.totalAmount, 0)

    // 异常预警（也过滤已删除房间的数据）
    const allAnomalyReadings = this.getMeterReadings().filter(r => r.isAnomaly && !r.isAnomalyConfirmed)
    const anomalyReadings = allAnomalyReadings.filter(r => existingRoomIds.has(r.roomId))

    // 房间统计
    const rooms = this.getRooms()
    const vacantRooms = rooms.filter(r => r.status === '空置')
    const occupiedRooms = rooms.filter(r => r.status === '已入住')

    return {
      expiringContracts,
      overdueBills,
      totalReceived,
      totalPending,
      anomalyReadings,
      vacantCount: vacantRooms.length,
      occupiedCount: occupiedRooms.length,
      totalRooms: rooms.length,
      currentMonth
    }
  }

  // ============ Data Export ============

  /**
   * 导出所有数据为JSON（用于备份）
   */
  exportAllData() {
    const data = {}
    for (const [name, key] of Object.entries(KEYS)) {
      data[name] = this.get(key)
    }
    return data
  }

  /**
   * 导入数据（用于恢复）
   */
  importAllData(data) {
    for (const [name, key] of Object.entries(KEYS)) {
      if (data[name]) {
        this.set(key, data[name])
      }
    }
  }

  /**
   * 清空所有数据
   */
  clearAllData() {
    for (const key of Object.values(KEYS)) {
      try { uni.removeStorageSync(key) } catch(e) {}
    }
    this._cache = {}
    this.initDefaults()
  }
}

// 单例导出
const db = new Database()
export default db
