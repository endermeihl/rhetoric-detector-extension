// ==================== 数据收集 ====================

/**
 * 数据收集器 - 保存分析记录到训练数据集
 */
class DataCollector {
  constructor(config) {
    this.config = config;
    this.collectionEndpoint = 'http://127.0.0.1:8881/save';
  }

  /**
   * 保存分析记录到数据收集服务
   * @param {string} text - 内容文本
   * @param {Object} result - 分析结果
   * @param {Object} metadata - 平台特定元数据
   * @returns {Promise<boolean>} - 是否保存成功
   */
  async save(text, result, metadata = {}) {
    try {
      const recordId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const payload = {
        record_id: recordId,
        tweet_content: text,  // 通用字段名（向后兼容）
        content: text,        // 新的通用字段名
        analysis_result: {
          rhetoric_score: result.rhetoric_score,
          manipulation_score: result.manipulation_score,
          label: result.label,
          reason: result.reason,
          error: result.error || false
        },
        tweet_url: window.location.href,  // 向后兼容
        content_url: window.location.href, // 新的通用字段名
        model: this.config.get('MODEL_NAME'),
        cached: metadata.cached || false,
        platform: metadata.platform || 'unknown',
        metadata: metadata
      };

      console.log("[DataCollector] 🔄 正在保存数据到服务器...", {
        url: this.collectionEndpoint,
        content_preview: text.substring(0, 50)
      });

      const response = await fetch(this.collectionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[DataCollector] ✅ 已保存至数据集 (总计: ${data.total_records} 条)`);
        return true;
      } else {
        console.warn(`[DataCollector] ⚠️ 保存失败: HTTP ${response.status}`);
        return false;
      }

    } catch (error) {
      // 静默失败，不影响主功能
      console.error("[DataCollector] ❌ 保存数据失败:", error);
      console.warn("[DataCollector] ⚠️ 无法连接到数据收集服务 (端口 8881)");
      return false;
    }
  }

  /**
   * 设置数据收集端点
   * @param {string} endpoint - 新的端点 URL
   */
  setEndpoint(endpoint) {
    this.collectionEndpoint = endpoint;
    console.log(`[DataCollector] 端点已更新: ${endpoint}`);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataCollector };
} else {
  window.RhetoricLensDataCollector = { DataCollector };
}
