// ==================== 知乎选择器配置 ====================

/**
 * 知乎平台的 DOM 选择器
 * 注意：知乎的DOM结构较为复杂，这些选择器可能需要根据实际情况调整
 */
const ZHIHU_SELECTORS = {
  // ==================== 回答相关 ====================

  // 回答容器（多种可能的选择器）
  ANSWER_CONTAINER: '.List-item',
  ANSWER_ITEM: '.AnswerCard',
  ANSWER_CARD_FULL: '[itemprop="answer"]',

  // 回答文本内容
  ANSWER_TEXT: '.RichContent-inner',
  ANSWER_TEXT_ALT1: '.RichText-inner',
  ANSWER_TEXT_ALT2: '.RichContent .RichText',

  // 回答操作栏（点赞、评论、收藏等）
  ANSWER_ACTIONS: '.ContentItem-actions',
  ANSWER_ACTION_BAR: '.Voters',

  // 回答作者信息
  ANSWER_AUTHOR: '.AuthorInfo-head',
  ANSWER_AUTHOR_NAME: '.AuthorInfo-name',

  // ==================== 评论相关 ====================

  // 评论列表容器
  COMMENTS_LIST: '.Comments-list',

  // 评论项
  COMMENT_ITEM: '.CommentItem',
  COMMENT_CONTAINER: '.Comments-list .CommentItem',

  // 评论文本
  COMMENT_TEXT: '.CommentItem-content',
  COMMENT_RICH_TEXT: '.CommentRichText',

  // 评论作者
  COMMENT_AUTHOR: '.CommentItem-meta .UserLink',

  // 评论操作
  COMMENT_ACTIONS: '.CommentItemV2-meta',

  // ==================== 文章相关（知乎专栏）====================

  ARTICLE_CONTAINER: '.Post-Main',
  ARTICLE_TITLE: '.Post-Title',
  ARTICLE_CONTENT: '.Post-RichTextContainer',
  ARTICLE_TEXT: '.RichText',

  // ==================== 通用 ====================

  // Badge 容器类名
  BADGE_CONTAINER: 'ai-badge-container',

  // 加载更多按钮
  LOAD_MORE: '.Button--primary',

  // 富文本内容通用
  RICH_TEXT: '.RichText',
  RICH_CONTENT: '.RichContent'
};

/**
 * 知乎内容类型枚举
 */
const ZHIHU_CONTENT_TYPE = {
  ANSWER: 'answer',      // 问题回答
  COMMENT: 'comment',    // 评论
  ARTICLE: 'article'     // 文章（专栏）
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZHIHU_SELECTORS, ZHIHU_CONTENT_TYPE };
} else {
  window.ZhihuSelectors = ZHIHU_SELECTORS;
  window.ZhihuContentType = ZHIHU_CONTENT_TYPE;
}
