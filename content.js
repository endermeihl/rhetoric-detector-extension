// ==================== 配置 ====================
let CONFIG = {
  API_ENDPOINT: "http://localhost:11434/api/chat",
  MODEL_NAME: "xiuci-win-pro:latest",
  MAX_CONCURRENT: 3,          // 最大并发请求数
  DEBOUNCE_DELAY: 500,        // 滚动停止后延迟分析时间(ms)
  CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 缓存过期时间 24小时
  ENABLE_AUTO_ANALYZE: true   // 是否自动分析（false则需要点击）
};

// 从 storage 加载配置
async function loadConfig() {
  if (!isExtensionContextValid()) {
    console.warn("[Rhetoric Lens] ⚠️ 扩展上下文失效，跳过加载配置");
    return;
  }

  try {
    const result = await chrome.storage.local.get(['apiEndpoint', 'modelName', 'autoAnalyze']);
    if (result.apiEndpoint) CONFIG.API_ENDPOINT = result.apiEndpoint;
    if (result.modelName) CONFIG.MODEL_NAME = result.modelName;
    if (result.autoAnalyze !== undefined) CONFIG.ENABLE_AUTO_ANALYZE = result.autoAnalyze;
    console.log("[Rhetoric Lens] 配置已加载:", CONFIG);
  } catch (error) {
    console.error("[Rhetoric Lens] 加载配置失败:", error);
  }
}

// ==================== 全局状态 ====================
const state = {
  processedTweets: new Set(),     // 已处理的推文文本（会话级别去重）
  pendingQueue: [],               // 待处理队列
  activeRequests: 0,              // 当前活跃请求数
  cache: new Map(),               // 内存缓存
  scrollTimeout: null             // 滚动防抖计时器
};

// ==================== 工具函数 ====================

// 检查扩展上下文是否有效
function isExtensionContextValid() {
  try {
    // 尝试访问 chrome.runtime.id，如果上下文失效会抛出错误
    return chrome.runtime?.id !== undefined;
  } catch (error) {
    return false;
  }
}

// 生成文本的简单hash（用于缓存key）
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// 从localStorage加载缓存
async function loadCache() {
  if (!isExtensionContextValid()) {
    console.warn("[Rhetoric Lens] ⚠️ 扩展上下文失效，跳过加载缓存");
    return;
  }

  try {
    const result = await chrome.storage.local.get(['rhetoricCache']);
    if (result.rhetoricCache) {
      const cached = JSON.parse(result.rhetoricCache);
      // 清理过期缓存
      const now = Date.now();
      Object.entries(cached).forEach(([key, value]) => {
        if (now - value.timestamp < CONFIG.CACHE_EXPIRY) {
          state.cache.set(key, value.data);
        }
      });
      console.log(`[Rhetoric Lens] 从缓存加载了 ${state.cache.size} 条记录`);
    }
  } catch (error) {
    console.error("[Rhetoric Lens] 加载缓存失败:", error);
  }
}

// 保存缓存到localStorage
async function saveCache(key, data) {
  // 始终保存到内存缓存
  state.cache.set(key, data);

  // 检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    console.warn("[Rhetoric Lens] ⚠️ 扩展上下文失效，已保存到内存缓存但跳过持久化");
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
      console.warn("[Rhetoric Lens] ⚠️ 扩展已重新加载，缓存仅保存到内存");
    } else {
      console.error("[Rhetoric Lens] 保存缓存失败:", error);
    }
  }
}

// ==================== 颜色判断 ====================
function getColorClass(rhetoric, manipulation) {
  const maxScore = Math.max(rhetoric, manipulation);
  if (maxScore >= 8) return "score-danger";
  if (maxScore >= 5) return "score-warning";
  return "score-safe";
}

function getColorName(rhetoric, manipulation) {
  const maxScore = Math.max(rhetoric, manipulation);
  if (maxScore >= 8) return "高风险";
  if (maxScore >= 5) return "中风险";
  return "低风险";
}

// ==================== API 调用 ====================
async function analyzeText(text) {
  const hash = simpleHash(text);

  // 检查缓存
  if (state.cache.has(hash)) {
    console.log(`[Rhetoric Lens] 命中缓存: ${text.substring(0, 30)}...`);
    return { result: state.cache.get(hash), fromCache: true };
  }

  try {
    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.MODEL_NAME,
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
      console.error("[Rhetoric Lens] JSON 解析失败:", data.message.content);
      throw new Error("模型返回的不是有效的JSON格式");
    }

    // 验证响应格式（注意：分数可以是0，所以要用 !== undefined）
    if (result.rhetoric_score === undefined || result.manipulation_score === undefined) {
      console.error("[Rhetoric Lens] 响应格式错误，缺少必要字段:", result);
      throw new Error("模型返回格式不正确，缺少分数字段");
    }

    // 注意：不在这里保存到缓存，而是在保存到数据库之后
    return { result, fromCache: false, hash };
  } catch (error) {
    console.error("[Rhetoric Lens] ❌ API调用失败:", error.message);

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
      fromCache: false
    };
  }
}

// ==================== UI 组件 ====================

// 创建加载状态badge
function createLoadingBadge() {
  const badge = document.createElement("div");
  badge.className = "ai-badge ai-loading";
  badge.innerHTML = `
    <span class="loading-spinner"></span>
    <span class="loading-text">分析中...</span>
  `;
  return badge;
}

// HTML 转义函数
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 创建结果badge
function createResultBadge(result) {
  const badge = document.createElement("div");
  const colorClass = getColorClass(result.rhetoric_score, result.manipulation_score);
  const colorName = getColorName(result.rhetoric_score, result.manipulation_score);

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
      ${escapeHtml(result.reason)}
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
    row3.innerHTML = `<strong>分类:</strong> <span>${escapeHtml(result.label)}</span>`;

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

  // 添加鼠标事件，动态定位和显示 tooltip
  badge.addEventListener('mouseenter', (e) => {
    positionTooltip(badge, tooltip);
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

  return badge;
}

// 动态定位 tooltip（使用 fixed 定位）
function positionTooltip(badge, tooltip) {
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

// ==================== 推文处理 ====================

// 查找合适的badge插入位置（推文底部action bar上方）
function findBadgeInsertPoint(tweetElement) {
  // 检查是否已经创建过container
  let existingContainer = tweetElement.querySelector('.ai-badge-container');
  if (existingContainer) {
    return existingContainer;
  }

  // 方案1: 插入到action bar（点赞、转发等按钮组）上方
  const actionBar = tweetElement.querySelector('[role="group"]');
  if (actionBar && actionBar.parentElement) {
    const container = document.createElement("div");
    container.className = "ai-badge-container";
    actionBar.parentElement.insertBefore(container, actionBar);
    return container;
  }

  // 方案2: 如果找不到action bar，插入到推文文本下方
  const textNode = tweetElement.querySelector('[data-testid="tweetText"]');
  if (textNode && textNode.parentElement) {
    const container = document.createElement("div");
    container.className = "ai-badge-container";
    textNode.parentElement.appendChild(container);
    return container;
  }

  return null;
}

// 处理单条推文
async function processTweet(tweetElement) {
  // 检查是否已处理（DOM级别）
  if (tweetElement.dataset.aiProcessed) {
    console.log("[Rhetoric Lens] ⏭️ 跳过：DOM已处理");
    return;
  }

  // 提取推文文本
  const textNode = tweetElement.querySelector('[data-testid="tweetText"]');
  if (!textNode) {
    console.warn("[Rhetoric Lens] ⚠️ 跳过：未找到推文文本节点");
    return;
  }

  const text = textNode.innerText.trim();
  if (!text || text.length < 10) {
    console.warn(`[Rhetoric Lens] ⚠️ 跳过：文本太短 (${text.length} 字符)`);
    return;
  }

  // 检查文本级别去重
  if (state.processedTweets.has(text)) {
    console.log("[Rhetoric Lens] ⏭️ 跳过：文本已处理");
    return;
  }

  // 查找插入位置
  const insertPoint = findBadgeInsertPoint(tweetElement);
  if (!insertPoint) {
    console.error("[Rhetoric Lens] ❌ 失败：未找到插入点", {
      hasActionBar: !!tweetElement.querySelector('[role="group"]'),
      hasTextNode: !!tweetElement.querySelector('[data-testid="tweetText"]'),
      tweetPreview: text.substring(0, 50)
    });
    return;
  }

  // 只有在确定要处理时才标记
  tweetElement.dataset.aiProcessed = "true";
  state.processedTweets.add(text);

  console.log(`[Rhetoric Lens] 🎯 准备处理: ${text.substring(0, 50)}...`);

  // 如果不是自动分析模式，添加点击按钮
  if (!CONFIG.ENABLE_AUTO_ANALYZE) {
    const analyzeBtn = document.createElement("button");
    analyzeBtn.className = "ai-analyze-btn";
    analyzeBtn.textContent = "🔍 分析修辞";
    analyzeBtn.onclick = () => {
      analyzeBtn.remove();
      performAnalysis(text, insertPoint);
    };
    insertPoint.appendChild(analyzeBtn);
    console.log("[Rhetoric Lens] ✅ 已添加分析按钮（手动模式）");
    return;
  }

  // 自动分析模式：加入队列
  state.pendingQueue.push({ text, insertPoint });
  console.log(`[Rhetoric Lens] 📥 加入队列 | 队列长度: ${state.pendingQueue.length} | 活跃请求: ${state.activeRequests}/${CONFIG.MAX_CONCURRENT}`);
  processQueue();
}

// 保存分析记录到本地 Python 服务器
async function saveAnalysisRecord(text, result, cached = false) {
  try {
    const recordId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payload = {
      record_id: recordId,
      tweet_content: text,
      analysis_result: {
        rhetoric_score: result.rhetoric_score,
        manipulation_score: result.manipulation_score,
        label: result.label,
        reason: result.reason,
        error: result.error || false
      },
      tweet_url: window.location.href,
      model: CONFIG.MODEL_NAME,
      cached: cached
    };

    console.log("[Rhetoric Lens] 🔄 正在保存数据到服务器...", {
      url: 'http://127.0.0.1:8881/save',
      tweet_preview: text.substring(0, 50)
    });

    const response = await fetch('http://127.0.0.1:8881/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Rhetoric Lens] ✅ 已保存至数据集 (总计: ${data.total_records} 条)`);
    } else {
      console.warn(`[Rhetoric Lens] ⚠️ 保存失败: HTTP ${response.status}`);
    }

  } catch (error) {
    // 静默失败，不影响主功能
    console.error("[Rhetoric Lens] ❌ 保存数据失败:", error);
    console.warn("[Rhetoric Lens] ⚠️ 无法连接到数据收集服务 (端口 8881)");
  }
}

// 执行分析
async function performAnalysis(text, insertPoint) {
  console.log(`[Rhetoric Lens] 🔬 开始分析: ${text.substring(0, 50)}...`);

  // 检查insertPoint是否还在DOM中
  if (!insertPoint.isConnected) {
    console.warn("[Rhetoric Lens] ⚠️ 插入点已移除，取消分析");
    return;
  }

  // ⭐ 关键：先增加计数器，确保 finally 一定能配对
  state.activeRequests++;
  console.log(`[Rhetoric Lens] 📊 活跃请求数: ${state.activeRequests}/${CONFIG.MAX_CONCURRENT}`);

  // 在 try 块内显示加载状态，这样如果出错也能被 catch 捕获
  let loadingBadge;
  try {
    loadingBadge = createLoadingBadge();
    insertPoint.appendChild(loadingBadge);
    // 调用API - 返回 { result, fromCache, hash }
    const { result, fromCache, hash } = await analyzeText(text);

    // 再次检查insertPoint（不要手动减少计数器，finally 会处理）
    if (!insertPoint.isConnected) {
      console.warn("[Rhetoric Lens] ⚠️ 插入点在分析完成后被移除");
      return;
    }

    // ⭐ 关键：先保存到数据库，再保存到缓存
    if (!result.error && !fromCache) {
      console.log("[Rhetoric Lens] 💾 准备保存新分析结果到数据库");
      await saveAnalysisRecord(text, result, false);
      
      // 保存成功后再缓存
      console.log("[Rhetoric Lens] 📦 保存到本地缓存");
      await saveCache(hash, result);
    } else {
      if (result.error) {
        console.log("[Rhetoric Lens] ⏭️ 跳过保存：分析出错");
      }
      if (fromCache) {
        console.log("[Rhetoric Lens] ⏭️ 跳过保存：命中缓存");
      }
    }

    // 移除loading，显示结果
    if (loadingBadge && loadingBadge.parentNode) {
      loadingBadge.remove();
    }
    const resultBadge = createResultBadge(result);
    insertPoint.appendChild(resultBadge);

    console.log(`[Rhetoric Lens] ✅ R:${result.rhetoric_score} M:${result.manipulation_score}`);

  } catch (error) {
    console.error("[Rhetoric Lens] ❌ 分析出错:", error);

    // 尝试清理 loading badge 并显示错误
    if (insertPoint.isConnected) {
      // 安全移除 loading badge（可能还未创建）
      if (loadingBadge && loadingBadge.parentNode) {
        loadingBadge.remove();
      }

      const errorBadge = createResultBadge({
        error: true,
        rhetoric_score: 0,
        manipulation_score: 0,
        reason: "分析过程发生未知错误"
      });
      insertPoint.appendChild(errorBadge);
    }
  } finally {
    state.activeRequests--;

    // 安全检查：防止计数器变成负数
    if (state.activeRequests < 0) {
      console.error("[Rhetoric Lens] ❌ 检测到计数器异常，重置为 0");
      state.activeRequests = 0;
    }

    console.log(`[Rhetoric Lens] 📉 请求完成，活跃数: ${state.activeRequests}/${CONFIG.MAX_CONCURRENT}`);
    processQueue(); // 继续处理队列
  }
}

// 处理队列（并发控制）
function processQueue() {
  console.log(`[Rhetoric Lens] 🔄 处理队列 | 队列: ${state.pendingQueue.length} | 活跃: ${state.activeRequests}/${CONFIG.MAX_CONCURRENT}`);

  while (state.activeRequests < CONFIG.MAX_CONCURRENT && state.pendingQueue.length > 0) {
    const task = state.pendingQueue.shift();
    console.log(`[Rhetoric Lens] ➡️ 从队列取出任务，剩余: ${state.pendingQueue.length}`);
    performAnalysis(task.text, task.insertPoint);
  }

  if (state.pendingQueue.length > 0) {
    console.log(`[Rhetoric Lens] ⏸️ 队列等待中 (${state.pendingQueue.length} 个任务)`);
  }
}

// ==================== 页面监听 ====================

// 扫描当前页面的所有推文
function scanCurrentPage() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');

  let newTweets = 0;
  tweets.forEach(tweet => {
    if (!tweet.dataset.aiProcessed) {
      processTweet(tweet);
      newTweets++;
    }
  });

  if (newTweets > 0) {
    console.log(`[Rhetoric Lens] 📊 发现 ${newTweets} 条新推文 | 总计: ${tweets.length}`);
  }
}

// 滚动防抖：停止滚动后才处理新推文
let lastScrollTime = 0;
function handleScroll() {
  const now = Date.now();

  // 如果距离上次扫描不足1秒，不处理（防止过于频繁）
  if (now - lastScrollTime < 1000) {
    return;
  }

  if (state.scrollTimeout) {
    clearTimeout(state.scrollTimeout);
  }

  state.scrollTimeout = setTimeout(() => {
    lastScrollTime = Date.now();
    scanCurrentPage();
  }, CONFIG.DEBOUNCE_DELAY);
}

// 监听DOM变化（新推文加载）
let mutationDebounceTimeout = null;
const observer = new MutationObserver((mutations) => {
  // 使用防抖，避免频繁触发
  if (mutationDebounceTimeout) {
    clearTimeout(mutationDebounceTimeout);
  }

  mutationDebounceTimeout = setTimeout(() => {
    let hasNewTweets = false;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          // 检查是否是推文容器
          if (node.matches && node.matches('article[data-testid="tweet"]')) {
            hasNewTweets = true;
            break;
          }
          // 检查子元素中是否有推文
          const tweets = node.querySelectorAll && node.querySelectorAll('article[data-testid="tweet"]');
          if (tweets && tweets.length > 0) {
            hasNewTweets = true;
            break;
          }
        }
      }
      if (hasNewTweets) break;
    }

    if (hasNewTweets) {
      handleScroll();
    }
  }, 200); // 200ms防抖
});

// ==================== 初始化 ====================
async function init() {
  console.log("[Rhetoric Lens] 🚀 启动中...");

  // 检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    console.error("[Rhetoric Lens] ❌ 扩展上下文已失效，请刷新页面");
    return;
  }

  // 加载配置
  await loadConfig();

  // 加载缓存
  await loadCache();

  // 扫描当前页面
  scanCurrentPage();

  // 启动MutationObserver
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 监听滚动事件
  window.addEventListener('scroll', handleScroll, { passive: true });

  console.log(`[Rhetoric Lens] ✅ 已启动 | 模型: ${CONFIG.MODEL_NAME} | 并发数: ${CONFIG.MAX_CONCURRENT}`);
}

// 注意：扩展不提供 UI 配置界面，所有配置在代码中直接修改

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
