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
    return function (options, enqueue) {
      if (typeof options === 'function') {
        var _options = enqueue
        enqueue = options
        options = _options
      }
      if (typeof enqueue !== 'function') {
        throw new Error('Excepted the enqueue to be a function.')
      }
      options = utils.normalizeConfig(options)

      var buffer = [], enqueuing = {}, enqueuedCount = 0
      var finalEnqueue = function (value) {
        if (options.will.call(null, value) === false) {
          return options.rejected.call(null, value, 'will hook')
        }
        enqueue.call(null, value)
        if (++enqueuedCount > options.limit) {
          enqueuedCount--
          options.dequeue.call(null)
        }
        options.did.call(null, value)
      }

      return function (value) { //lazily enqueue
        buffer.push([utils.createId(), value])
        if (buffer.length > options.limit) {
          buffer = options.limit ? buffer.slice(-options.limit) : []
        }
        var len = buffer.length, delay = 0, i = 0

        for (i; i < len; i++) {
          var id = buffer[i][0]
          value = buffer[i][1]
          if (enqueuing[id]) {
            continue
          }

          var delayInc = utils.generateDelay(options.delay, value)
          if (delayInc === Infinity) {
            options.rejected.call(null, value, 'infinity delay')
            continue
          }
          delay += delayInc

          enqueuing[id] = true
          setTimeout(function () {
            var indexInBuffer = utils.findIndex(buffer, function (item) {
              return item[0] === id
            })
            if (indexInBuffer === -1) {
              return options.rejected.call(null, value, 'overflow')
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

  var normalizeConfig = function (options) {
    if (!options || typeof options !== 'object') {
      options = {}
    }
    options.delay = options.delay || 0
    options.will = options.will || noop
    options.did = options.did || noop
    options.rejected = options.rejected || noop
    options.limit = isValidNumber(options.limit) ? options.limit : Infinity
    options.dequeue = options.dequeue || void 0
    if (!isValidNumber(options.delay) || typeof options.delay !== 'function') {
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
    createId: createId,
    findIndex: findIndex,
    generateDelay: generateDelay,
    normalizeConfig: normalizeConfig
  }
}())))
