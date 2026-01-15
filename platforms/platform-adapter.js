// ==================== 平台适配器接口 ====================

/**
 * @typedef {Object} ContentItem
 * @property {string} id - 内容的唯一标识符
 * @property {string} text - 提取的文本内容
 * @property {HTMLElement} element - DOM元素引用
 * @property {Object} metadata - 平台特定的元数据
 */

/**
 * @typedef {Object} InsertionPoint
 * @property {HTMLElement} container - Badge容器元素
 * @property {string} position - 插入位置 'append' | 'before' | 'after'
 * @property {HTMLElement} [reference] - 参考元素（用于before/after）
 */

/**
 * 平台适配器基类
 * 每个平台（Twitter, 知乎等）必须实现这个接口
 */
class PlatformAdapter {
  /**
   * 获取平台名称
   * @returns {string} 平台标识符，如 'twitter', 'zhihu'
   */
  getPlatformName() {
    throw new Error('必须实现 getPlatformName() 方法');
  }

  /**
   * 初始化平台特定的页面监听
   * @param {Function} onNewContent - 检测到新内容时的回调函数
   * @returns {void}
   */
  initMonitoring(onNewContent) {
    throw new Error('必须实现 initMonitoring() 方法');
  }

  /**
   * 从当前页面提取内容项列表
   * @returns {ContentItem[]} 内容项数组
   */
  extractContentItems() {
    throw new Error('必须实现 extractContentItems() 方法');
  }

  /**
   * 检查元素是否已被处理
   * @param {HTMLElement} element - 要检查的元素
   * @returns {boolean}
   */
  isProcessed(element) {
    throw new Error('必须实现 isProcessed() 方法');
  }

  /**
   * 标记元素为已处理
   * @param {HTMLElement} element - 要标记的元素
   * @returns {void}
   */
  markAsProcessed(element) {
    throw new Error('必须实现 markAsProcessed() 方法');
  }

  /**
   * 查找badge的插入位置
   * @param {HTMLElement} contentElement - 内容元素
   * @returns {InsertionPoint|null} 插入点，如果未找到则返回null
   */
  findBadgeInsertionPoint(contentElement) {
    throw new Error('必须实现 findBadgeInsertionPoint() 方法');
  }

  /**
   * 验证文本是否有效（长度、质量检查）
   * @param {string} text - 要验证的文本
   * @returns {boolean}
   */
  validateText(text) {
    throw new Error('必须实现 validateText() 方法');
  }

  /**
   * 获取内容的URL（用于数据收集）
   * @param {HTMLElement} contentElement - 内容元素
   * @returns {string} 内容的URL
   */
  getContentUrl(contentElement) {
    throw new Error('必须实现 getContentUrl() 方法');
  }

  /**
   * 清理资源（移除监听器、Observer等）
   * @returns {void}
   */
  cleanup() {
    throw new Error('必须实现 cleanup() 方法');
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PlatformAdapter };
} else {
  window.RhetoricLensPlatform = { PlatformAdapter };
}
