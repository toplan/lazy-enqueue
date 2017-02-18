/**
 * Make your enqueue function lazily
 * Created by toplan on 17/2/7.
 * @email toplan710@gmail.com
 *
 * @param {Function} enqueue
 * @param {Object} options
 *
 * @return {Function} lazilyEnqueue
 */
;(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory()
  } else if (typeof define === 'function' && define.amd) {
    define(factory)
  } else {
    root['lazyEnqueue'] = factory()
  }
}(this, function (utils) {
  return function () { //factory
    return function (options, enqueue) {
      if (typeof options === 'function') {
        var _options = enqueue
        enqueue = options
        options = _options
      }
      if (typeof enqueue !== 'function') {
        throw new Error('Excepted the enqueue to be a function.')
      }
      options = utils.normalizeOptions(options)
      var latestTimer, running = false, buffer = [], enqueuedCount = 0

      var finalEnqueue = function (args) {
        if (utils.invoke(options.will, args) === false) {
          return utils.invoke(options.rejected, args)
        }
        utils.invoke(enqueue, args)
        dequeueWithTimes(++enqueuedCount - options.limit)
        utils.invoke(options.did, args)
      }

      var dequeueWithTimes = function (times) {
        if (times > 0 && times < Infinity) {
          while (times--) {
            utils.invoke(options.dequeue)
            enqueuedCount--
          }
        }
      }

      var delayEnqueue = function (args, delay, cb) {
        var timer = setTimeout(function () {
          clearTimeout(timer)
          try {
            finalEnqueue(args)
            utils.invoke(cb)
          } catch (e) {
            throw e
          }
        }, delay)
      }

      var overflowBuffer = function () {
        var overflowLen = buffer.length - options.limit
        if (overflowLen <= 0) {
          return
        }
        while (overflowLen--) {
          utils.invoke(options.rejected, buffer.shift())
        }
      }

      var consumeBuffer = function () {
        var args = buffer.shift()
        if (typeof args === 'undefined') {
          return running = false
        }
        var delay = utils.generateDelay(options.delay, args)
        delayEnqueue(args, delay, function () {
          consumeBuffer()
        })
      }

      return function () {
        var args = Array.prototype.slice.call(arguments)
        buffer.push(args)
        var timer = latestTimer = setTimeout(function () {
          clearTimeout(timer)
          if (timer !== latestTimer) {
            return
          }
          overflowBuffer()
          if (!running) {
            running = true
            consumeBuffer()
          }
        }, 0)
      }
    }
  }
}(function () {
  var noop = function () {}

  var isValidNumber = function (number) {
    return typeof number === 'number' && !isNaN(number)
  }

  var invoke = function (fn, args, content) {
    if (typeof fn === 'function') {
      return fn.apply(content || null, args || [])
    }
  }

  var generateDelay = function (delay, args) {
    if (typeof delay === 'function') {
      delay = invoke(delay, args)
    }

    return isValidNumber(delay) ? delay : 0
  }

  var normalizeOptions = function (options) {
    if (!options || typeof options !== 'object') {
      options = {}
    }
    options.delay = options.delay || 0
    options.will = options.will || noop
    options.did = options.did || noop
    options.rejected = options.rejected || noop
    options.limit = isValidNumber(options.limit) ? options.limit : Infinity
    options.dequeue = options.dequeue || void 0
    if (!isValidNumber(options.delay) && typeof options.delay !== 'function') {
      throw new Error('Excepted the delay option to be a number or function.')
    }
    if (options.limit < 0) {
      throw new Error('Excepted the limit option greater than or equal to zero.')
    }
    if (options.limit < Infinity && typeof options.dequeue !== 'function') {
      throw new Error('Excepted the dequeue option to be a function.')
    }

    return options
  }

  return {
    invoke: invoke,
    generateDelay: generateDelay,
    normalizeOptions: normalizeOptions
  }
}())))
