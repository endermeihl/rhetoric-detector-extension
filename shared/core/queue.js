// ==================== 队列处理 ====================

/**
 * 请求队列管理器 - 控制并发请求
 */
class RequestQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.pendingQueue = [];
    this.activeRequests = 0;
  }

  /**
   * 将任务加入队列
   * @param {Function} taskFn - 要执行的异步任务函数
   * @returns {void}
   */
  enqueue(taskFn) {
    this.pendingQueue.push(taskFn);
    console.log(`[Queue] 📥 任务加入队列 | 队列长度: ${this.pendingQueue.length} | 活跃: ${this.activeRequests}/${this.maxConcurrent}`);
    this.process();
  }

  /**
   * 处理队列
   * @returns {void}
   */
  process() {
    console.log(`[Queue] 🔄 处理队列 | 队列: ${this.pendingQueue.length} | 活跃: ${this.activeRequests}/${this.maxConcurrent}`);

    while (this.activeRequests < this.maxConcurrent && this.pendingQueue.length > 0) {
      const taskFn = this.pendingQueue.shift();
      console.log(`[Queue] ➡️ 从队列取出任务，剩余: ${this.pendingQueue.length}`);

      this.activeRequests++;
      console.log(`[Queue] 📊 活跃请求数: ${this.activeRequests}/${this.maxConcurrent}`);

      // 执行任务，完成后继续处理队列
      taskFn()
        .finally(() => {
          this.activeRequests--;

          // 安全检查：防止计数器变成负数
          if (this.activeRequests < 0) {
            console.error("[Queue] ❌ 检测到计数器异常，重置为 0");
            this.activeRequests = 0;
          }

          console.log(`[Queue] 📉 任务完成，活跃数: ${this.activeRequests}/${this.maxConcurrent}`);
          this.process(); // 继续处理队列
        });
    }

    if (this.pendingQueue.length > 0) {
      console.log(`[Queue] ⏸️ 队列等待中 (${this.pendingQueue.length} 个任务)`);
    }
  }

  /**
   * 获取队列状态
   * @returns {Object}
   */
  getStatus() {
    return {
      pending: this.pendingQueue.length,
      active: this.activeRequests,
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * 清空队列
   */
  clear() {
    this.pendingQueue = [];
    console.log("[Queue] 🗑️ 队列已清空");
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RequestQueue };
} else {
  window.RhetoricLensQueue = { RequestQueue };
}
