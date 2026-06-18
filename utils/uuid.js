/**
 * UUID生成器 - 简短唯一ID
 * 使用时间戳+随机数，足够本地应用使用
 */
export function generateId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

/**
 * 生成带前缀的ID
 */
export function generateIdWithPrefix(prefix) {
  return `${prefix}_${generateId()}`
}
