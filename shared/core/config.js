// ==================== 配置管理 ====================

/**
 * 配置管理类
 */
class ConfigManager {
  constructor() {
    this.config = {
      API_ENDPOINT: "http://localhost:11434/api/chat",
      MODEL_NAME: "xiuci-win-pro:latest",
      MAX_CONCURRENT: 3,          // 最大并发请求数
      DEBOUNCE_DELAY: 500,        // 滚动停止后延迟分析时间(ms)
      CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 缓存过期时间 24小时
      ENABLE_AUTO_ANALYZE: true   // 是否自动分析（false则需要点击）
    };
  }

  /**
   * 从 Chrome Storage 加载配置
   * @returns {Promise<void>}
   */
  async load() {
    const utils = window.RhetoricLensUtils || require('./utils.js');

    if (!utils.isExtensionContextValid()) {
      console.warn("[Config] ⚠️ 扩展上下文失效，跳过加载配置");
      return;
    }

    try {
      const result = await chrome.storage.local.get(['apiEndpoint', 'modelName', 'autoAnalyze']);
      if (result.apiEndpoint) this.config.API_ENDPOINT = result.apiEndpoint;
      if (result.modelName) this.config.MODEL_NAME = result.modelName;
      if (result.autoAnalyze !== undefined) this.config.ENABLE_AUTO_ANALYZE = result.autoAnalyze;
      console.log("[Config] 配置已加载:", this.config);
    } catch (error) {
      console.error("[Config] 加载配置失败:", error);
    }
  }

  /**
   * 获取所有配置
   * @returns {Object}
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * 获取单个配置项
   * @param {string} key - 配置键
   * @returns {*}
   */
  get(key) {
    return this.config[key];
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConfigManager };
} else {
  window.RhetoricLensConfig = { ConfigManager };
}
