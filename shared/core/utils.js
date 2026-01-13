// ==================== 工具函数 ====================

/**
 * 检查扩展上下文是否有效
 * @returns {boolean}
 */
function isExtensionContextValid() {
  try {
    // 尝试访问 chrome.runtime.id，如果上下文失效会抛出错误
    return chrome.runtime?.id !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * 生成文本的简单hash（用于缓存key）
 * @param {string} str - 要hash的字符串
 * @returns {string} - Base36 hash
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * HTML 转义函数
 * @param {string} text - 要转义的文本
 * @returns {string} - 转义后的HTML安全文本
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 导出（兼容多种模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isExtensionContextValid, simpleHash, escapeHtml };
} else {
  window.RhetoricLensUtils = { isExtensionContextValid, simpleHash, escapeHtml };
}
