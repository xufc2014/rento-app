/**
 * 密码确认工具 —— 防止用户误操作（清空数据、导入覆盖、删除等）
 * 密码：159753
 */

import { ref } from 'vue'

const CORRECT_PASSWORD = '159753'

/**
 * 创建密码确认控制器 —— 用于页面内集成密码输入弹层
 *
 * 用法：
 * ```js
 * const pwd = usePasswordGuard()
 * pwd.guard(() => doDangerousThing(), '此操作不可逆')
 * ```
 */
export function usePasswordGuard() {
  const visible = ref(false)
  const inputValue = ref('')
  const errorMsg = ref('')
  const message = ref('此操作不可逆，请输入管理密码确认')
  let _pendingCallback = null

  function guard(callback, msg = '此操作不可逆，请输入管理密码确认') {
    _pendingCallback = callback
    message.value = msg
    inputValue.value = ''
    errorMsg.value = ''
    visible.value = true
  }

  function confirm() {
    if (inputValue.value === CORRECT_PASSWORD) {
      visible.value = false
      if (_pendingCallback) {
        _pendingCallback()
        _pendingCallback = null
      }
    } else {
      errorMsg.value = '密码错误，请重试'
    }
  }

  function cancel() {
    visible.value = false
    _pendingCallback = null
    errorMsg.value = ''
  }

  return { visible, inputValue, errorMsg, message, guard, confirm, cancel }
}
