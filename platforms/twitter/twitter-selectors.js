// ==================== Twitter 选择器配置 ====================

/**
 * Twitter/X 平台的 DOM 选择器
 * 基于 data-testid 属性（相对稳定）
 */
const TWITTER_SELECTORS = {
  // 推文容器
  TWEET_CONTAINER: 'article[data-testid="tweet"]',

  // 推文内容
  TWEET_TEXT: '[data-testid="tweetText"]',

  // 推文动作栏（点赞、转发等按钮组）
  ACTION_BAR: '[role="group"]',

  // 用户信息
  USER_NAME: '[data-testid="User-Name"]',

  // 媒体内容
  TWEET_PHOTO: '[data-testid="tweetPhoto"]',
  TWEET_VIDEO: '[data-testid="videoPlayer"]',

  // 社交上下文（如"XX转推了"）
  SOCIAL_CONTEXT: '[data-testid="socialContext"]',

  // Badge 容器类名
  BADGE_CONTAINER: 'ai-badge-container'
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TWITTER_SELECTORS };
} else {
  window.TwitterSelectors = TWITTER_SELECTORS;
}
