// ==================== Rhetoric Lens - Twitter 主控制器 ====================

/**
 * Rhetoric Lens Twitter 编排器
 * 协调所有核心模块和平台适配器
 */
class RhetoricLensTwitter {
  constructor() {
    // 加载所有依赖模块
    const ConfigMod = window.RhetoricLensConfig;
    const CacheMod = window.RhetoricLensCache;
    const AnalyzerMod = window.RhetoricLensAnalyzer;
    const UIMod = window.RhetoricLensUI;
    const QueueMod = window.RhetoricLensQueue;
    const DataCollectorMod = window.RhetoricLensDataCollector;

    // 平台适配器
    this.platformAdapter = new window.TwitterAdapter();

    // 核心组件
    this.config = null;
    this.cache = null;
    this.analyzer = null;
    this.renderer = null;
    this.queue = null;
    this.dataCollector = null;

    // 会话级别去重（文本hash）
    this.processedTexts = new Set();
  }

  /**
   * 初始化
   */
  async init() {
    console.log('[Rhetoric Lens] 🚀 初始化中 (Twitter)...');

    // 检查扩展上下文
    const utils = window.RhetoricLensUtils;
    if (!utils.isExtensionContextValid()) {
      console.error('[Rhetoric Lens] ❌ 扩展上下文已失效，请刷新页面');
      return;
    }

    try {
      // 初始化配置
      this.config = new window.RhetoricLensConfig.ConfigManager();
      await this.config.load();

      // 初始化缓存
      this.cache = new window.RhetoricLensCache.CacheManager(this.config);
      await this.cache.load();

      // 初始化核心组件
      this.analyzer = new window.RhetoricLensAnalyzer.TextAnalyzer(this.cache, this.config);
      this.renderer = new window.RhetoricLensUI.UIRenderer();
      this.queue = new window.RhetoricLensQueue.RequestQueue(this.config.get('MAX_CONCURRENT'));
      this.dataCollector = new window.RhetoricLensDataCollector.DataCollector(this.config);

      // 启动平台监听
      this.platformAdapter.initMonitoring(() => this.scanPage());

      // 初始扫描
      this.scanPage();

      console.log(`[Rhetoric Lens] ✅ 已启动 (Twitter) | 模型: ${this.config.get('MODEL_NAME')} | 并发: ${this.config.get('MAX_CONCURRENT')}`);
    } catch (error) {
      console.error('[Rhetoric Lens] ❌ 初始化失败:', error);
    }
  }

  /**
   * 扫描当前页面
   */
  scanPage() {
    const contentItems = this.platformAdapter.extractContentItems();

    if (contentItems.length === 0) {
      return;
    }

    console.log(`[Rhetoric Lens] 📊 发现 ${contentItems.length} 条新内容`);

    contentItems.forEach(item => {
      // 文本级别去重
      if (this.processedTexts.has(item.text)) {
        console.log('[Rhetoric Lens] ⏭️ 跳过：文本已处理');
        return;
      }

      this.processedTexts.add(item.text);
      this.platformAdapter.markAsProcessed(item.element);

      this.processContentItem(item);
    });
  }

  /**
   * 处理单个内容项
   * @param {ContentItem} item
   */
  async processContentItem(item) {
    console.log(`[Rhetoric Lens] 🎯 准备处理: ${item.text.substring(0, 50)}...`);

    // 查找插入位置
    const insertionPoint = this.platformAdapter.findBadgeInsertionPoint(item.element);
    if (!insertionPoint) {
      console.error('[Rhetoric Lens] ❌ 未找到插入点');
      return;
    }

    // 检查是否自动分析模式
    if (!this.config.get('ENABLE_AUTO_ANALYZE')) {
      this.addManualTrigger(item, insertionPoint);
      return;
    }

    // 自动分析模式：加入队列
    this.queue.enqueue(() => this.performAnalysis(item, insertionPoint));
  }

  /**
   * 添加手动触发按钮
   * @param {ContentItem} item
   * @param {InsertionPoint} insertionPoint
   */
  addManualTrigger(item, insertionPoint) {
    const analyzeBtn = document.createElement("button");
    analyzeBtn.className = "ai-analyze-btn";
    analyzeBtn.textContent = "🔍 分析修辞";
    analyzeBtn.onclick = () => {
      analyzeBtn.remove();
      this.performAnalysis(item, insertionPoint);
    };

    this.insertBadge(insertionPoint, analyzeBtn);
    console.log('[Rhetoric Lens] ✅ 已添加分析按钮（手动模式）');
  }

  /**
   * 执行分析
   * @param {ContentItem} item
   * @param {InsertionPoint} insertionPoint
   */
  async performAnalysis(item, insertionPoint) {
    console.log(`[Rhetoric Lens] 🔬 开始分析: ${item.text.substring(0, 50)}...`);

    // 检查插入点是否还在 DOM 中
    if (!insertionPoint.container.isConnected && insertionPoint.reference && !insertionPoint.reference.isConnected) {
      console.warn('[Rhetoric Lens] ⚠️ 插入点已移除，取消分析');
      return;
    }

    let loadingBadge;
    try {
      // 显示加载状态
      loadingBadge = this.renderer.createLoadingBadge();
      this.insertBadge(insertionPoint, loadingBadge);

      // 调用分析 API
      const { result, fromCache, hash } = await this.analyzer.analyzeText(item.text);

      // 再次检查插入点
      if (!insertionPoint.container.isConnected && insertionPoint.reference && !insertionPoint.reference.isConnected) {
        console.warn('[Rhetoric Lens] ⚠️ 插入点在分析完成后被移除');
        return;
      }

      // 保存数据（如果不是缓存且没有错误）
      if (!result.error && !fromCache) {
        console.log('[Rhetoric Lens] 💾 保存分析结果到数据集');
        await this.dataCollector.save(item.text, result, {
          ...item.metadata,
          cached: false
        });

        // 保存到缓存
        console.log('[Rhetoric Lens] 📦 保存到本地缓存');
        await this.cache.save(hash, result);
      } else {
        if (result.error) {
          console.log('[Rhetoric Lens] ⏭️ 跳过保存：分析出错');
        }
        if (fromCache) {
          console.log('[Rhetoric Lens] ⏭️ 跳过保存：命中缓存');
        }
      }

      // 移除 loading，显示结果
      if (loadingBadge && loadingBadge.parentNode) {
        loadingBadge.remove();
      }

      const resultBadge = this.renderer.createResultBadge(result);
      this.insertBadge(insertionPoint, resultBadge);

      console.log(`[Rhetoric Lens] ✅ R:${result.rhetoric_score} M:${result.manipulation_score}`);

    } catch (error) {
      console.error('[Rhetoric Lens] ❌ 分析出错:', error);

      // 清理 loading badge
      if (loadingBadge && loadingBadge.parentNode) {
        loadingBadge.remove();
      }

      // 显示错误
      if (insertionPoint.container.isConnected || (insertionPoint.reference && insertionPoint.reference.isConnected)) {
        const errorBadge = this.renderer.createResultBadge({
          error: true,
          rhetoric_score: 0,
          manipulation_score: 0,
          reason: "分析过程发生未知错误"
        });
        this.insertBadge(insertionPoint, errorBadge);
      }
    }
  }

  /**
   * 插入 badge 到指定位置
   * @param {InsertionPoint} insertionPoint
   * @param {HTMLElement} badge
   */
  insertBadge(insertionPoint, badge) {
    const { container, position, reference } = insertionPoint;

    if (position === 'append') {
      container.appendChild(badge);
    } else if (position === 'before' && reference && reference.parentElement) {
      reference.parentElement.insertBefore(container, reference);
      container.appendChild(badge);
    } else if (position === 'after' && reference) {
      if (reference.nextSibling) {
        reference.parentElement.insertBefore(container, reference.nextSibling);
      } else {
        reference.parentElement.appendChild(container);
      }
      container.appendChild(badge);
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.platformAdapter.cleanup();
    this.queue.clear();
    console.log('[Rhetoric Lens] 🧹 所有资源已清理');
  }
}

// ==================== 初始化 ====================
(function() {
  console.log('[Rhetoric Lens] 📦 加载 Twitter content script...');

  // 等待所有依赖加载完成
  function init() {
    // 检查所有依赖是否就绪
    const dependencies = [
      'RhetoricLensUtils',
      'RhetoricLensConfig',
      'RhetoricLensCache',
      'RhetoricLensAnalyzer',
      'RhetoricLensUI',
      'RhetoricLensQueue',
      'RhetoricLensDataCollector',
      'TwitterAdapter'
    ];

    const allReady = dependencies.every(dep => window[dep] !== undefined);

    if (!allReady) {
      console.warn('[Rhetoric Lens] ⏳ 等待依赖加载...');
      setTimeout(init, 100);
      return;
    }

    // 创建并初始化应用
    const app = new RhetoricLensTwitter();
    app.init();

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      app.cleanup();
    });
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
