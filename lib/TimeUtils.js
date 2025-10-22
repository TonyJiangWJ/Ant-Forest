
let { config } = require('../config.js')(runtime, global)

let sRequire = require('./SingletonRequirer.js')(runtime, global)
let _logUtils = sRequire('LogUtils')


/*
// 示例1：基本使用
TimerUtils.start('imageProcessing')
TimerUtils.beginPhase('imageProcessing', 'loadImage')
// ... 加载图像代码
TimerUtils.endPhase('imageProcessing', 'loadImage')

TimerUtils.beginPhase('imageProcessing', 'processImage')
// ... 图像处理代码
TimerUtils.endPhase('imageProcessing', 'processImage')

TimerUtils.beginPhase('imageProcessing', 'saveImage')
// ... 保存图像代码
TimerUtils.endPhase('imageProcessing', 'saveImage')

let result = TimerUtils.stop('imageProcessing', true)


// 示例2：简单计时
let result = TimerUtils.time(() => {
  // 要计时的代码
  return someFunction()
}, 'myFunction')


// 示例3：多次统计同一阶段的总时间
for (let i = 0; i < 10; i++) {
  TimerUtils.start('loop_' + i, 'process')
  // ... 处理代码
  TimerUtils.stop('loop_' + i)
}

// 获取某个阶段的总耗时
let totalProcessTime = TimerUtils.getStats(null, 'process')
_logUtils.debugInfo('process阶段总耗时: ' + totalProcessTime + 'ms')

*/
/**
 * 计时工具类
 * 用于统计各阶段执行时间
 */
module.exports = {
  // 存储所有计时器
  timers: new Map(),

  // 存储阶段时间统计
  phaseStats: new Map(),

  /**
   * 开始计时
   * @param {string} timerId - 计时器ID
   * @param {string} phaseName - 阶段名称（可选）
   */
  start: function (timerId, phaseName) {
    if (!timerId) {
      throw new Error('计时器ID不能为空')
    }

    let timer = {
      id: timerId,
      startTime: new Date().getTime(),
      phases: new Map(),
      currentPhase: null
    }

    if (phaseName) {
      this.beginPhase(timerId, phaseName)
    }

    this.timers.set(timerId, timer)
    return new TimeUtilHelper(timerId, this)
  },

  /**
   * 开始一个新的阶段
   * @param {string} timerId - 计时器ID
   * @param {string} phaseName - 阶段名称
   */
  beginPhase: function (timerId, phaseName) {
    let timer = this.timers.get(timerId)
    if (!timer) {
      throw new Error('计时器不存在: ' + timerId)
    }

    // 结束上一个阶段（如果有）
    if (timer.currentPhase) {
      this.endPhase(timerId, timer.currentPhase)
    }

    // 开始新阶段
    timer.phases.set(phaseName, {
      name: phaseName,
      startTime: new Date().getTime(),
      duration: 0
    })

    timer.currentPhase = phaseName
  },

  /**
   * 结束指定阶段
   * @param {string} timerId - 计时器ID
   * @param {string} phaseName - 阶段名称
   */
  endPhase: function (timerId, phaseName) {
    let timer = this.timers.get(timerId)
    if (!timer) {
      throw new Error('计时器不存在: ' + timerId)
    }

    let phase = timer.phases.get(phaseName)
    if (phase && phase.startTime) {
      phase.duration = new Date().getTime() - phase.startTime
      // 累计统计
      let statKey = timer.id + ':' + phaseName
      let total = this.phaseStats.get(statKey) || 0
      this.phaseStats.set(statKey, total + phase.duration)
    }

    if (timer.currentPhase === phaseName) {
      timer.currentPhase = null
    }
  },

  /**
   * 结束计时
   * @param {string} timerId - 计时器ID
   * @param {boolean} showDetail - 是否显示详细信息
   */
  stop: function (timerId, showDetail) {
    let timer = this.timers.get(timerId)
    if (!timer) {
      throw new Error('计时器不存在: ' + timerId)
    }

    // 结束当前阶段
    if (timer.currentPhase) {
      this.endPhase(timerId, timer.currentPhase)
    }

    let totalTime = new Date().getTime() - timer.startTime

    let result = {
      id: timer.id,
      totalTime: totalTime,
      phases: []
    }

    // 收集阶段信息
    timer.phases.forEach((phase, name) => {
      result.phases.push({
        name: name,
        duration: phase.duration
      })
    })

    // 显示详细信息
    if (showDetail) {
      this.printTimerResult(result)
    }

    // 移除计时器
    this.timers.delete(timerId)

    return result
  },

  /**
   * 打印计时结果
   * @param {Object} result - 计时结果
   */
  printTimerResult: function (result) {
    let msg = [`计时器 [${result.id}] 总耗时: ${result.totalTime}ms`]

    if (result.phases.length > 0) {
      msg.push('各阶段耗时:')
      result.phases.forEach(phase => {
        let percentage = result.totalTime > 0 ? ((phase.duration / result.totalTime) * 100).toFixed(1) : 0
        msg.push(`  ${phase.name}: ${phase.duration}ms (${percentage}%)`)
      })
    }

    _logUtils.debugInfo(msg.join('\n'))
  },

  /**
   * 获取阶段统计信息
   * @param {string} timerId - 计时器ID（可选）
   * @param {string} phaseName - 阶段名称（可选）
   */
  getStats: function (timerId, phaseName) {
    if (phaseName) {
      let statKey = timerId ? `${timerId}:${phaseName}` : phaseName
      return this.phaseStats.get(statKey) || 0
    } else if (timerId) {
      // 返回指定计时器的所有阶段统计
      let stats = {}
      this.phaseStats.forEach((value, key) => {
        if (key.startsWith(timerId + ':')) {
          let phase = key.substring(timerId.length + 1)
          stats[phase] = value
        }
      })
      return stats
    } else {
      // 返回所有统计信息
      let stats = {}
      this.phaseStats.forEach((value, key) => {
        stats[key] = value
      })
      return stats
    }
  },

  /**
   * 重置统计信息
   */
  resetStats: function () {
    this.phaseStats.clear()
  },

  /**
   * 简单计时方法（用于单次计时）
   * @param {Function} func - 要计时的函数
   * @param {string} name - 计时名称
   */
  time: function (func, name) {
    let timerId = name || 'timer_' + Date.now()
    this.start(timerId)

    try {
      let result = func()
      let timerResult = this.stop(timerId, true)
      return {
        result: result,
        time: timerResult.totalTime
      }
    } catch (e) {
      this.timers.delete(timerId)
      throw e
    }
  }
}

function TimeUtilHelper (timeId, timeUtil) {
  this.timeId = timeId
  this.timeUtil = timeUtil
  this.currentPhase = null

  this.beginPhase = function (phaseName) {
    this.currentPhase = phaseName
    this.timeUtil.beginPhase(this.timeId, phaseName)
    return this
  }

  this.endPhase = function (phaseName) {
    if (!phaseName) {
      phaseName = this.currentPhase
    }
    this.timeUtil.endPhase(this.timeId, phaseName)
    this.currentPhase = null
    return this
  }

  this.stop = function (showDetail) {
    return this.timeUtil.stop(this.timeId, showDetail)
  }
}