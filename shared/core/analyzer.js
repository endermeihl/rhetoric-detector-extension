// ==================== API 调用 ====================

/**
 * 文本分析器类 - 调用 Ollama API
 */
class TextAnalyzer {
  constructor(cache, config) {
    this.cache = cache;
    this.config = config;
  }

  /**
   * 分析文本的修辞和操纵指数
   * @param {string} text - 要分析的文本
   * @returns {Promise<{result: Object, fromCache: boolean, hash: string}>}
   */
  async analyzeText(text) {
    const utils = window.RhetoricLensUtils || require('./utils.js');
    const hash = utils.simpleHash(text);

    // 检查缓存
    if (this.cache.has(hash)) {
      console.log(`[Analyzer] 命中缓存: ${text.substring(0, 30)}...`);
      return { result: this.cache.get(hash), fromCache: true, hash };
    }

    try {
      const response = await fetch(this.config.get('API_ENDPOINT'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.get('MODEL_NAME'),
          messages: [{ role: "user", content: text }],
          format: "json",
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      let result;
      try {
        result = JSON.parse(data.message.content);
      } catch (parseError) {
        console.error("[Analyzer] JSON 解析失败:", data.message.content);
        throw new Error("模型返回的不是有效的JSON格式");
      }

      // 验证响应格式（注意：分数可以是0，所以要用 !== undefined）
      if (result.rhetoric_score === undefined || result.manipulation_score === undefined) {
        console.error("[Analyzer] 响应格式错误，缺少必要字段:", result);
        throw new Error("模型返回格式不正确，缺少分数字段");
      }

      // 注意：不在这里保存到缓存，而是在保存到数据库之后
      return { result, fromCache: false, hash };
    } catch (error) {
      console.error("[Analyzer] ❌ API调用失败:", error.message);

      return {
        result: {
          error: true,
          message: error.message,
          rhetoric_score: 0,
          manipulation_score: 0,
          label: "分析失败",
          reason: error.message.includes("Failed to fetch") || error.message.includes("fetch")
            ? "无法连接到AI服务，请确保Ollama正在运行"
            : error.message
        },
        fromCache: false,
        hash
      };
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TextAnalyzer };
} else {
  window.RhetoricLensAnalyzer = { TextAnalyzer };
}
