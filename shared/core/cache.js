// ==================== 缓存管理 ====================

/**
 * 缓存管理类
 */
class CacheManager {
  constructor(config) {
    this.config = config;
    this.cache = new Map(); // 内存缓存
  }

  /**
   * 从 Chrome Storage 加载持久化缓存
   * @returns {Promise<void>}
   */
  async load() {
    const utils = window.RhetoricLensUtils || require('./utils.js');

    if (!utils.isExtensionContextValid()) {
      console.warn("[Cache] ⚠️ 扩展上下文失效，跳过加载缓存");
      return;
    }

    try {
      const result = await chrome.storage.local.get(['rhetoricCache']);
      if (result.rhetoricCache) {
        const cached = JSON.parse(result.rhetoricCache);
        // 清理过期缓存
        const now = Date.now();
        Object.entries(cached).forEach(([key, value]) => {
          if (now - value.timestamp < this.config.get('CACHE_EXPIRY')) {
            this.cache.set(key, value.data);
          }
        });
        console.log(`[Cache] 从缓存加载了 ${this.cache.size} 条记录`);
      }
    } catch (error) {
      console.error("[Cache] 加载缓存失败:", error);
    }
  }

  /**
   * 检查缓存中是否存在
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * 从缓存获取数据
   * @param {string} key - 缓存键
   * @returns {*}
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * 保存到缓存（内存 + Chrome Storage）
   * @param {string} key - 缓存键
   * @param {*} data - 要缓存的数据
   * @returns {Promise<void>}
   */
  async save(key, data) {
    const utils = window.RhetoricLensUtils || require('./utils.js');

    // 始终保存到内存缓存
    this.cache.set(key, data);

    // 检查扩展上下文是否有效
    if (!utils.isExtensionContextValid()) {
      console.warn("[Cache] ⚠️ 扩展上下文失效，已保存到内存缓存但跳过持久化");
      return;
    }

    try {
      const result = await chrome.storage.local.get(['rhetoricCache']);
      const cached = result.rhetoricCache ? JSON.parse(result.rhetoricCache) : {};

      cached[key] = {
        data: data,
        timestamp: Date.now()
      };

      await chrome.storage.local.set({ rhetoricCache: JSON.stringify(cached) });
    } catch (error) {
      // 静默失败，不影响主功能（内存缓存仍然有效）
      if (error.message.includes("Extension context invalidated")) {
        console.warn("[Cache] ⚠️ 扩展已重新加载，缓存仅保存到内存");
      } else {
        console.error("[Cache] 保存缓存失败:", error);
      }
    }
  }

  /**
   * 获取缓存大小
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CacheManager };
} else {
  window.RhetoricLensCache = { CacheManager };
}
