// ==================== API 调用 ====================

/**
 * 文本分析器类 - 调用 LiteLLM API (OpenAI 兼容格式)
 */
class TextAnalyzer {
  constructor(config) {
    this.config = config;
  }

  /**
   * 分析文本的修辞和操纵指数
   * @param {string} text - 要分析的文本
   * @returns {Promise<{result: Object}>}
   */
  async analyzeText(text) {
    try {
      const headers = { "Content-Type": "application/json" };
      const apiKey = this.config.get('API_KEY');
      if (apiKey) {
        // 支持两种格式: "Bearer xxx" 或直接 "xxx"
        headers["Authorization"] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
      }

      const response = await fetch(this.config.get('API_ENDPOINT'), {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          model: this.config.get('MODEL_NAME'),
          messages: [{ role: "user", content: text }],
          response_format: { type: "json_object" },
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      let result;
      try {
        // OpenAI 兼容格式: choices[0].message.content
        result = JSON.parse(data.choices[0].message.content);
      } catch (parseError) {
        console.error("[Analyzer] JSON 解析失败:", data.choices?.[0]?.message?.content);
        throw new Error("模型返回的不是有效的JSON格式");
      }

      // 验证响应格式（注意：分数可以是0，所以要用 !== undefined）
      if (result.rhetoric_score === undefined || result.manipulation_score === undefined) {
        console.error("[Analyzer] 响应格式错误，缺少必要字段:", result);
        throw new Error("模型返回格式不正确，缺少分数字段");
      }

      return { result };
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
            ? "无法连接到AI服务，请检查网络连接"
            : error.message
        }
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
