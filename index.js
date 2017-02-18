/**
 * Make your enqueue function lazily
 * Created by toplan on 17/2/7.
 * @email toplan710@gmail.com
 *
 * @param {Object} options
 * @param {Function} enqueue
 *
 * @return {Function} lazilyEnqueue
 *
 * @example
 *   var lazy = require('lazy-enqueue');
 *   var queue = [1, 2]; //your queue
 *   var enqueue = [].unshift.bind(queue);
 *   var lazilyEnqueue = lazy(enqueue)
 *   lazilyEnqueue('3');
 *   lazilyEnqueue('4');
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
    return function (config, enqueue) {
      if (typeof config === 'function') {
        var _config = enqueue
        enqueue = config
        config = _config
      }
      if (typeof enqueue !== 'function') {
        throw new Error('Excepted the enqueue to be a function.')
      }
      config = utils.normalizeConfig(config)

      var buffer = [], enqueuing = {}, enqueuedCount = 0
      var finalEnqueue = function (value) {
        if (config.will.call(null, value) === false) {
          return config.rejected.call(null, value, 'will hook')
        }
        enqueue.call(null, value)
        if (++enqueuedCount > config.limit) {
          enqueuedCount--
          config.dequeue.call(null)
        }
        config.did.call(null, value)
      }

      return function (value) { //lazily enqueue
        buffer.push([utils.createId(), value])
        if (buffer.length > config.limit) {
          buffer = config.limit ? buffer.slice(-config.limit) : []
        }
        var len = buffer.length, delay = 0, i = 0

        for (i; i < len; i++) {
          var id = buffer[i][0]
          value = buffer[i][1]
          if (enqueuing[id]) {
            continue
          }

          var delayInc = utils.generateDelay(config.delay, value)
          if (delayInc === Infinity) {
            config.rejected.call(null, value, 'infinity delay')
            continue
          }
          delay += delayInc

          setTimeout(function () {
            enqueuing[id] = true
            var indexInBuffer = utils.findIndex(buffer, function (item) {
              return item[0] === id
            })
            if (indexInBuffer === -1) {
              return config.rejected.call(null, value, 'overflow')
            }
            buffer.splice(indexInBuffer, 1)
            delete enqueuing[id]
            try {
              finalEnqueue(value)
            } catch (e) {
              throw e
            }
          }, delay)
        }
      }
    }
  }
}(function () {
  var noop = function () {}

  var isValidNumber = function (number) {
    return typeof number === 'number' && !isNaN(number)
  }

  var createId = function () {
    var id = 0
    return function () {
      return id++
    }
  }()

  var findIndex = function (array, condition) {
    if (!array || !array.length || typeof condition !== 'function') {
      return -1
    }
    var len = array.length
    while (len--) {
      var item = array[len]
      if (condition.call(null, item)) {
        return len
      }
    }

    return -1
  }

  var generateDelay = function (delay, value) {
    if (typeof delay === 'function') {
      delay = delay.call(null, value)
    }

    return isValidNumber(delay) ? delay : 0
  }

  var normalizeConfig = function (config) {
    if (!config || typeof config !== 'object') {
      config = {}
    }
    config.delay = config.delay || 0
    config.will = config.will || noop
    config.did = config.did || noop
    config.rejected = config.rejected || noop
    config.limit = isValidNumber(config.limit) ? config.limit : Infinity
    config.dequeue = config.dequeue || void 0
    if (!isValidNumber(config.delay) || typeof config.delay !== 'function') {
      throw new Error('Excepted the `delay` to be a number or function.')
    }
    if (config.limit < 0) {
      throw new Error('Excepted the `limit` greater than or equal to zero.')
    }
    if (config.limit < Infinity && typeof config.dequeue !== 'function') {
      throw new Error('Excepted the `dequeue` to be a function.')
    }

    return config
  }

  return {
    createId: createId,
    findIndex: findIndex,
    generateDelay: generateDelay,
    normalizeConfig: normalizeConfig
  }
}())))
