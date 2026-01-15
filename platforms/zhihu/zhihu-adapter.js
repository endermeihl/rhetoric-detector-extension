// ==================== 知乎平台适配器 ====================

/**
 * 知乎平台适配器
 * 支持回答(Answer)和评论(Comment)的分析
 */
class ZhihuAdapter {
  constructor() {
    // 获取选择器配置
    this.selectors = window.ZhihuSelectors || require('./zhihu-selectors.js').ZHIHU_SELECTORS;
    this.contentType = window.ZhihuContentType || require('./zhihu-selectors.js').ZHIHU_CONTENT_TYPE;

    // 监听器
    this.observer = null;
    this.scrollTimeout = null;
    this.mutationDebounceTimeout = null;
    this.lastScrollTime = 0;

    // 评论扩展监听（知乎评论需要点击"查看全部"）
    this.commentButtonObserver = null;
  }

  /**
   * 获取平台名称
   * @returns {string}
   */
  getPlatformName() {
    return 'zhihu';
  }

  /**
   * 初始化页面监听
   * @param {Function} onNewContent - 新内容检测回调
   */
  initMonitoring(onNewContent) {
    console.log('[Zhihu Adapter] 🔍 初始化页面监听...');

    // MutationObserver - 监听 DOM 变化
    this.observer = new MutationObserver((mutations) => {
      // 防抖处理
      if (this.mutationDebounceTimeout) {
        clearTimeout(this.mutationDebounceTimeout);
      }

      this.mutationDebounceTimeout = setTimeout(() => {
        let hasNewContent = false;

        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              // 检查是否是回答或评论容器
              if (node.matches && (
                node.matches(this.selectors.ANSWER_CONTAINER) ||
                node.matches(this.selectors.ANSWER_ITEM) ||
                node.matches(this.selectors.COMMENT_ITEM)
              )) {
                hasNewContent = true;
                break;
              }

              // 检查子元素中是否有回答或评论
              const answers = node.querySelectorAll && node.querySelectorAll(
                `${this.selectors.ANSWER_CONTAINER}, ${this.selectors.ANSWER_ITEM}, ${this.selectors.COMMENT_ITEM}`
              );
              if (answers && answers.length > 0) {
                hasNewContent = true;
                break;
              }
            }
          }
          if (hasNewContent) break;
        }

        if (hasNewContent) {
          console.log('[Zhihu Adapter] 🆕 检测到新内容');
          onNewContent();
        }
      }, 300); // 300ms 防抖（知乎DOM更新较慢）
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 滚动监听 - 处理无限滚动
    window.addEventListener('scroll', () => this.handleScroll(onNewContent), { passive: true });

    // 监听评论按钮点击（知乎评论需要展开）
    this.setupCommentButtonListener(onNewContent);

    console.log('[Zhihu Adapter] ✅ 监听器已启动');
  }

  /**
   * 设置评论按钮监听
   * @param {Function} onNewContent
   */
  setupCommentButtonListener(onNewContent) {
    // 监听评论按钮点击
    document.addEventListener('click', (e) => {
      const target = e.target;
      // 检查是否点击了评论相关按钮
      if (target && (
        target.textContent.includes('评论') ||
        target.textContent.includes('查看全部') ||
        target.classList.contains('Button--plain')
      )) {
        console.log('[Zhihu Adapter] 💬 检测到评论展开，延迟扫描');
        setTimeout(() => onNewContent(), 500);
      }
    });
  }

  /**
   * 滚动事件处理（带防抖）
   * @param {Function} onNewContent
   */
  handleScroll(onNewContent) {
    const now = Date.now();

    // 如果距离上次扫描不足1秒，不处理
    if (now - this.lastScrollTime < 1000) {
      return;
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      this.lastScrollTime = Date.now();
      console.log('[Zhihu Adapter] 📜 滚动停止，触发内容扫描');
      onNewContent();
    }, 600); // 600ms 延迟（知乎加载较慢）
  }

  /**
   * 提取内容项
   * @returns {ContentItem[]}
   */
  extractContentItems() {
    const items = [];

    // 提取回答
    items.push(...this.extractAnswers());

    // 提取评论
    items.push(...this.extractComments());

    return items;
  }

  /**
   * 提取回答
   * @returns {ContentItem[]}
   */
  extractAnswers() {
    const items = [];

    // 尝试多个选择器
    const answerSelectors = [
      this.selectors.ANSWER_CONTAINER,
      this.selectors.ANSWER_ITEM,
      this.selectors.ANSWER_CARD_FULL
    ];

    const answers = document.querySelectorAll(answerSelectors.join(','));

    answers.forEach((answer) => {
      // 跳过已处理的
      if (this.isProcessed(answer)) {
        return;
      }

      // 提取文本（尝试多个选择器）
      let textNode = answer.querySelector(this.selectors.ANSWER_TEXT) ||
                     answer.querySelector(this.selectors.ANSWER_TEXT_ALT1) ||
                     answer.querySelector(this.selectors.ANSWER_TEXT_ALT2);

      if (!textNode) {
        return;
      }

      const text = textNode.innerText.trim();

      // 验证文本
      if (!this.validateText(text)) {
        return;
      }

      items.push({
        id: this.generateContentId(answer, 'answer'),
        text: text,
        element: answer,
        metadata: {
          platform: 'zhihu',
          contentType: this.contentType.ANSWER,
          hasImages: !!answer.querySelector('img'),
          url: this.getContentUrl(answer)
        }
      });
    });

    return items;
  }

  /**
   * 提取评论
   * @returns {ContentItem[]}
   */
  extractComments() {
    const items = [];
    const comments = document.querySelectorAll(this.selectors.COMMENT_ITEM);

    comments.forEach((comment) => {
      // 跳过已处理的
      if (this.isProcessed(comment)) {
        return;
      }

      // 提取评论文本
      const textNode = comment.querySelector(this.selectors.COMMENT_TEXT) ||
                       comment.querySelector(this.selectors.COMMENT_RICH_TEXT);

      if (!textNode) {
        return;
      }

      const text = textNode.innerText.trim();

      // 验证文本
      if (!this.validateText(text)) {
        return;
      }

      items.push({
        id: this.generateContentId(comment, 'comment'),
        text: text,
        element: comment,
        metadata: {
          platform: 'zhihu',
          contentType: this.contentType.COMMENT,
          url: this.getContentUrl(comment)
        }
      });
    });

    return items;
  }

  /**
   * 生成内容 ID
   * @param {HTMLElement} element
   * @param {string} type
   * @returns {string}
   */
  generateContentId(element, type) {
    // 尝试从data属性提取ID
    const dataId = element.dataset.id || element.dataset.zop || element.getAttribute('name');
    if (dataId) {
      return `${type}-${dataId}`;
    }

    // 回退：生成临时 ID
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查是否已处理
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  isProcessed(element) {
    return element.dataset.aiProcessedZhihu === 'true';
  }

  /**
   * 标记为已处理
   * @param {HTMLElement} element
   */
  markAsProcessed(element) {
    element.dataset.aiProcessedZhihu = 'true';
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

    // 判断内容类型
    const isAnswer = contentElement.matches(this.selectors.ANSWER_CONTAINER) ||
                     contentElement.matches(this.selectors.ANSWER_ITEM) ||
                     contentElement.matches(this.selectors.ANSWER_CARD_FULL);

    if (isAnswer) {
      // 回答：插入到操作栏上方
      const actionBar = contentElement.querySelector(this.selectors.ANSWER_ACTIONS);
      if (actionBar && actionBar.parentElement) {
        const container = document.createElement("div");
        container.className = this.selectors.BADGE_CONTAINER;
        return {
          container,
          position: 'before',
          reference: actionBar
        };
      }

      // 回退：插入到文本下方
      const textNode = contentElement.querySelector(this.selectors.ANSWER_TEXT) ||
                       contentElement.querySelector(this.selectors.ANSWER_TEXT_ALT1);
      if (textNode && textNode.parentElement) {
        const container = document.createElement("div");
        container.className = this.selectors.BADGE_CONTAINER;
        return {
          container,
          position: 'after',
          reference: textNode
        };
      }
    } else {
      // 评论：插入到评论文本下方
      const textNode = contentElement.querySelector(this.selectors.COMMENT_TEXT);
      if (textNode && textNode.parentElement) {
        const container = document.createElement("div");
        container.className = this.selectors.BADGE_CONTAINER;
        return {
          container,
          position: 'after',
          reference: textNode
        };
      }
    }

    console.error('[Zhihu Adapter] ❌ 未找到插入点');
    return null;
  }

  /**
   * 验证文本有效性
   * @param {string} text
   * @returns {boolean}
   */
  validateText(text) {
    // 知乎内容通常较长，允许更大的范围
    return text && text.length >= 10 && text.length <= 20000;
  }

  /**
   * 获取内容 URL
   * @param {HTMLElement} contentElement
   * @returns {string}
   */
  getContentUrl(contentElement) {
    // 尝试从链接中提取URL
    const link = contentElement.querySelector('a[href*="/answer/"]') ||
                 contentElement.querySelector('a[href*="/question/"]');

    if (link) {
      return link.href;
    }

    // 回退到当前页面URL
    return window.location.href;
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.commentButtonObserver) {
      this.commentButtonObserver.disconnect();
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.mutationDebounceTimeout) {
      clearTimeout(this.mutationDebounceTimeout);
    }
    console.log('[Zhihu Adapter] 🧹 资源已清理');
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZhihuAdapter };
} else {
  window.ZhihuAdapter = ZhihuAdapter;
}
