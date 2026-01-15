// ==================== Twitter 平台适配器 ====================

/**
 * Twitter/X 平台适配器
 */
class TwitterAdapter {
  constructor() {
    // 获取选择器配置
    this.selectors = window.TwitterSelectors || require('./twitter-selectors.js').TWITTER_SELECTORS;

    // 监听器
    this.observer = null;
    this.scrollTimeout = null;
    this.mutationDebounceTimeout = null;
    this.lastScrollTime = 0;
  }

  /**
   * 获取平台名称
   * @returns {string}
   */
  getPlatformName() {
    return 'twitter';
  }

  /**
   * 初始化页面监听
   * @param {Function} onNewContent - 新内容检测回调
   */
  initMonitoring(onNewContent) {
    console.log('[Twitter Adapter] 🔍 初始化页面监听...');

    // MutationObserver - 监听 DOM 变化
    this.observer = new MutationObserver((mutations) => {
      // 防抖处理
      if (this.mutationDebounceTimeout) {
        clearTimeout(this.mutationDebounceTimeout);
      }

      this.mutationDebounceTimeout = setTimeout(() => {
        let hasNewTweets = false;

        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              // 检查是否是推文容器
              if (node.matches && node.matches(this.selectors.TWEET_CONTAINER)) {
                hasNewTweets = true;
                break;
              }
              // 检查子元素中是否有推文
              const tweets = node.querySelectorAll && node.querySelectorAll(this.selectors.TWEET_CONTAINER);
              if (tweets && tweets.length > 0) {
                hasNewTweets = true;
                break;
              }
            }
          }
          if (hasNewTweets) break;
        }

        if (hasNewTweets) {
          console.log('[Twitter Adapter] 🆕 检测到新推文');
          onNewContent();
        }
      }, 200); // 200ms 防抖
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 滚动监听 - 处理无限滚动
    window.addEventListener('scroll', () => this.handleScroll(onNewContent), { passive: true });

    console.log('[Twitter Adapter] ✅ 监听器已启动');
  }

  /**
   * 滚动事件处理（带防抖）
   * @param {Function} onNewContent - 回调函数
   */
  handleScroll(onNewContent) {
    const now = Date.now();

    // 如果距离上次扫描不足1秒，不处理（防止过于频繁）
    if (now - this.lastScrollTime < 1000) {
      return;
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.lastScrollTime = Date.now();
      console.log('[Twitter Adapter] 📜 滚动停止，触发内容扫描');
      onNewContent();
    }, 500); // 500ms 延迟
  }

  /**
   * 提取内容项
   * @returns {ContentItem[]}
   */
  extractContentItems() {
    const tweets = document.querySelectorAll(this.selectors.TWEET_CONTAINER);
    const items = [];

    tweets.forEach((tweet) => {
      // 跳过已处理的
      if (this.isProcessed(tweet)) {
        return;
      }

      // 提取文本
      const textNode = tweet.querySelector(this.selectors.TWEET_TEXT);
      if (!textNode) {
        return;
      }

      const text = textNode.innerText.trim();

      // 验证文本
      if (!this.validateText(text)) {
        return;
      }

      items.push({
        id: this.generateTweetId(tweet),
        text: text,
        element: tweet,
        metadata: {
          platform: 'twitter',
          hasMedia: !!tweet.querySelector(this.selectors.TWEET_PHOTO) ||
                    !!tweet.querySelector(this.selectors.TWEET_VIDEO),
          isRetweet: !!tweet.querySelector(this.selectors.SOCIAL_CONTEXT),
          url: this.getContentUrl(tweet)
        }
      });
    });

    return items;
  }

  /**
   * 生成推文 ID
   * @param {HTMLElement} tweetElement
   * @returns {string}
   */
  generateTweetId(tweetElement) {
    // 尝试从链接中提取 tweet ID
    const links = tweetElement.querySelectorAll('a[href*="/status/"]');
    if (links.length > 0) {
      const match = links[0].href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    // 回退：生成临时 ID
    return `tweet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查是否已处理
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isProcessed(element) {
    return element.dataset.aiProcessed === 'true';
  }

  /**
   * 标记为已处理
   * @param {HTMLElement} element
   */
  markAsProcessed(element) {
    element.dataset.aiProcessed = 'true';
  }

  /**
   * 查找 badge 插入位置
   * @param {HTMLElement} contentElement
   * @returns {InsertionPoint|null}
   */
  findBadgeInsertionPoint(contentElement) {
    // 检查是否已存在容器
    let existingContainer = contentElement.querySelector('.' + this.selectors.BADGE_CONTAINER);
    if (existingContainer) {
      return { container: existingContainer, position: 'append' };
    }

    // 方案1: 插入到 action bar（点赞、转发等按钮组）上方
    const actionBar = contentElement.querySelector(this.selectors.ACTION_BAR);
    if (actionBar && actionBar.parentElement) {
      const container = document.createElement("div");
      container.className = this.selectors.BADGE_CONTAINER;
      return {
        container,
        position: 'before',
        reference: actionBar
      };
    }

    // 方案2: 如果找不到 action bar，插入到推文文本下方
    const textNode = contentElement.querySelector(this.selectors.TWEET_TEXT);
    if (textNode && textNode.parentElement) {
      const container = document.createElement("div");
      container.className = this.selectors.BADGE_CONTAINER;
      return {
        container,
        position: 'after',
        reference: textNode
      };
    }

    console.error('[Twitter Adapter] ❌ 未找到插入点');
    return null;
  }

  /**
   * 验证文本有效性
   * @param {string} text
   * @returns {boolean}
   */
  validateText(text) {
    return text && text.length >= 10 && text.length <= 10000;
  }

  /**
   * 获取内容 URL
   * @param {HTMLElement} contentElement
   * @returns {string}
   */
  getContentUrl(contentElement) {
    const link = contentElement.querySelector('a[href*="/status/"]');
    return link ? link.href : window.location.href;
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.mutationDebounceTimeout) {
      clearTimeout(this.mutationDebounceTimeout);
    }
    console.log('[Twitter Adapter] 🧹 资源已清理');
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TwitterAdapter };
} else {
  window.TwitterAdapter = TwitterAdapter;
}
