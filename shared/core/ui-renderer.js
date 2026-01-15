// ==================== UI 渲染 ====================

/**
 * UI 渲染器类 - 创建 badge 和 tooltip
 */
class UIRenderer {
  constructor() {
    this.utils = window.RhetoricLensUtils || require('./utils.js');
  }

  /**
   * 获取风险等级颜色类
   * @param {number} rhetoric - 修辞密度分数
   * @param {number} manipulation - 操纵指数分数
   * @returns {string} - CSS 类名
   */
  getColorClass(rhetoric, manipulation) {
    const maxScore = Math.max(rhetoric, manipulation);
    if (maxScore >= 8) return "score-danger";
    if (maxScore >= 5) return "score-warning";
    return "score-safe";
  }

  /**
   * 获取风险等级中文名
   * @param {number} rhetoric - 修辞密度分数
   * @param {number} manipulation - 操纵指数分数
   * @returns {string} - 中文等级名
   */
  getColorName(rhetoric, manipulation) {
    const maxScore = Math.max(rhetoric, manipulation);
    if (maxScore >= 8) return "高风险";
    if (maxScore >= 5) return "中风险";
    return "低风险";
  }

  /**
   * 创建加载状态 badge
   * @returns {HTMLElement}
   */
  createLoadingBadge() {
    const badge = document.createElement("div");
    badge.className = "ai-badge ai-loading";
    badge.innerHTML = `
      <span class="loading-spinner"></span>
      <span class="loading-text">分析中...</span>
    `;
    return badge;
  }

  /**
   * 创建分析结果 badge
   * @param {Object} result - 分析结果对象
   * @returns {HTMLElement}
   */
  createResultBadge(result) {
    const badge = document.createElement("div");
    const colorClass = this.getColorClass(result.rhetoric_score, result.manipulation_score);
    const colorName = this.getColorName(result.rhetoric_score, result.manipulation_score);

    badge.className = `ai-badge ${colorClass}`;

    // 创建 badge 图标和文本
    const badgeIcon = document.createElement('span');
    badgeIcon.className = 'badge-icon';

    const badgeText = document.createElement('span');
    badgeText.className = 'badge-text';

    // 创建 tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'ai-tooltip';

    if (result.error) {
      badge.className = "ai-badge score-error";
      badgeIcon.textContent = '⚠️';
      badgeText.textContent = '错误';

      tooltip.innerHTML = `
        <strong>分析失败</strong><br/>
        ${this.utils.escapeHtml(result.reason)}
      `;
    } else {
      badgeIcon.textContent = colorClass === 'score-danger' ? '🔴' : colorClass === 'score-warning' ? '🟡' : '🟢';
      badgeText.textContent = `R:${result.rhetoric_score} M:${result.manipulation_score}`;

      const tooltipHeader = document.createElement('div');
      tooltipHeader.className = 'tooltip-header';
      tooltipHeader.innerHTML = `<strong>风险等级:</strong> <span class="${colorClass}">${colorName}</span>`;

      const row1 = document.createElement('div');
      row1.className = 'tooltip-row';
      row1.innerHTML = `<strong>修辞密度:</strong> <span>${result.rhetoric_score}/10</span>`;

      const row2 = document.createElement('div');
      row2.className = 'tooltip-row';
      row2.innerHTML = `<strong>操纵指数:</strong> <span>${result.manipulation_score}/10</span>`;

      const row3 = document.createElement('div');
      row3.className = 'tooltip-row';
      row3.innerHTML = `<strong>分类:</strong> <span>${this.utils.escapeHtml(result.label)}</span>`;

      const reasonDiv = document.createElement('div');
      reasonDiv.className = 'tooltip-reason';
      reasonDiv.innerHTML = `<strong>分析:</strong>`;
      const reasonText = document.createElement('div');
      reasonText.textContent = result.reason;
      reasonDiv.appendChild(reasonText);

      tooltip.appendChild(tooltipHeader);
      tooltip.appendChild(row1);
      tooltip.appendChild(row2);
      tooltip.appendChild(row3);
      tooltip.appendChild(reasonDiv);
    }

    badge.appendChild(badgeIcon);
    badge.appendChild(badgeText);

    // 将 tooltip 添加到 body 而不是 badge 内部（避免被父元素样式限制）
    document.body.appendChild(tooltip);

    // 保存 badge 和 tooltip 的引用关系
    badge.dataset.tooltipId = 'tooltip-' + Date.now() + '-' + Math.random();
    tooltip.dataset.tooltipId = badge.dataset.tooltipId;

    // 设置 tooltip 交互
    this.setupTooltip(badge, tooltip);

    return badge;
  }

  /**
   * 设置 tooltip 的交互逻辑
   * @param {HTMLElement} badge - Badge 元素
   * @param {HTMLElement} tooltip - Tooltip 元素
   */
  setupTooltip(badge, tooltip) {
    // 添加鼠标事件，动态定位和显示 tooltip
    badge.addEventListener('mouseenter', (e) => {
      this.positionTooltip(badge, tooltip);
      tooltip.classList.add('show');
    });

    badge.addEventListener('mouseleave', (e) => {
      // 检查是否移动到 tooltip 上
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && relatedTarget === tooltip) {
        return;
      }
      tooltip.classList.remove('show');
    });

    // 鼠标在 tooltip 上时保持显示
    tooltip.addEventListener('mouseenter', () => {
      tooltip.classList.add('show');
    });

    tooltip.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });
  }

  /**
   * 动态定位 tooltip（使用 fixed 定位）
   * @param {HTMLElement} badge - Badge 元素
   * @param {HTMLElement} tooltip - Tooltip 元素
   */
  positionTooltip(badge, tooltip) {
    const rect = badge.getBoundingClientRect();

    // 使用临时类来测量尺寸，不修改 style 属性
    const wasVisible = tooltip.classList.contains('show');
    if (!wasVisible) {
      tooltip.classList.add('measuring');
    }

    const tooltipRect = tooltip.getBoundingClientRect();

    // 移除临时类
    if (!wasVisible) {
      tooltip.classList.remove('measuring');
    }

    // 计算水平居中位置
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    // 确保不超出屏幕左边界
    if (left < 10) {
      left = 10;
    }

    // 确保不超出屏幕右边界
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    // 计算垂直位置（默认显示在上方）
    let top = rect.top - tooltipRect.height - 10;

    // 如果上方空间不够，显示在下方
    if (top < 10) {
      top = rect.bottom + 10;
    }

    // 设置最终位置
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UIRenderer };
} else {
  window.RhetoricLensUI = { UIRenderer };
}
