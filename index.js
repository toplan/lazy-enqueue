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
    var OVERFLOW_ERROR = new Error('overflow from the buffer')
    //status
    var PENDING = 'PENDING', SUCCESS = 'SUCCESS', FAILED = 'FAILED'
    //hooks
    var WILL_HOOK = 'will', SUCCESS_HOOK = 'success', FAILURE_HOOK = 'failure'

    var success = function (data, value) {
      data.value = value
      data.status = SUCCESS
      try {
        utils.invoke(data.successHooks, [value].concat(data.args))
      } catch (e) {
        utils.warn(e)
      }
    }

    var failure = function (data, error) {
      data.error = error
      data.status = FAILED
      try {
        utils.invoke(data.failureHooks, [error].concat(data.args))
      } catch (e) {
        utils.warn(e)
      }
    }

    var createLazyReturns = function (data) {
      var returns

      return returns = {
        delay: function(delay) {
          data.delay = delay
          return returns
        },
        hook: function(name, fn) {
          if (typeof fn !== 'function') {
            return returns
          }
          if (data.status !== PENDING && name === WILL_HOOK) {
            return returns
          }
          if (data.status === SUCCESS && name === SUCCESS_HOOK) {
            utils.invoke(fn, [data.value].concat(data.args))
            return returns
          }
          if (data.status === FAILED && name === FAILURE_HOOK) {
            utils.invoke(fn, [data.error].concat(data.args))
            return returns
          }
          name = name + 'Hooks'
          if (name in data) {
            data[name].push(fn)
          }
          return returns
        },
        will: function(fn) {
          return returns.hook(WILL_HOOK, fn)
        },
        done: function(onSuccess, onFailure) {
          return returns.hook(SUCCESS_HOOK, onSuccess).hook(FAILURE_HOOK, onFailure)
        }
      }
    }

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

      var syncEnqueue = function (data) {
        var ret, args
        try {
          args = utils.invoke(data.willHooks, data.args, true)
          ret = utils.invoke(enqueue, args)
        } catch (e) {
          return failure(data, e)
        }
        try {
          dequeueWithTimes(++enqueuedCount - options.limit)
        } catch (e) {
          utils.warn(e)
        }
        success(data, ret)
      }

      var dequeueWithTimes = function (times) {
        if (times > 0 && times < Infinity) {
          while (times--) {
            utils.invoke(options.dequeue)
            enqueuedCount--
          }
        }
      }

      var asyncEnqueue = function (data, delay, cb) {
        var timer = setTimeout(function () {
          clearTimeout(timer)
          syncEnqueue(data)
          utils.invoke(cb)
        }, delay)
      }

      var overflowBuffer = function () {
        var overflowLen = buffer.length - options.limit
        if (overflowLen <= 0) {
          return
        }
        while (overflowLen--) {
          failure(buffer.shift(), OVERFLOW_ERROR)
        }
      }

      var next = function () {
        var data = buffer.shift()
        if (typeof data === 'undefined') {
          return running = false
        }
        var delay = utils.computeDelay(data.delay, data.args, 0)
        if (utils.isPromise(delay)) {
          return delay.then(function (res) {
            if (typeof res !== 'undefined') {
              data.args = [res]
            }
            syncEnqueue(data)
            next()
          }, function (e) {
            failure(data, e)
            next()
          })
        }
        asyncEnqueue(data, delay, next)
      }

      return function () {
        var timer, data = {
          args: Array.prototype.slice.call(arguments),
          delay: options.delay,
          willHooks: typeof options[WILL_HOOK] === 'function' ? [options[WILL_HOOK]] : [],
          successHooks: typeof options[SUCCESS_HOOK] === 'function' ? [options[SUCCESS_HOOK]] : [],
          failureHooks: typeof options[FAILURE_HOOK] === 'function' ? [options[FAILURE_HOOK]] : [],
          status: PENDING,
          value: void 0,
          error: void 0
        }
        buffer.push(data)
        timer = latestTimer = setTimeout(function () {
          clearTimeout(timer)
          if (timer !== latestTimer) {
            return
          }
          overflowBuffer()
          if (!running) {
            running = true
            next()
          }
        }, 0)

        return createLazyReturns(data)
      }
    }
  }
}(function () {
  var warn = function (e) {
    if (console) {
      return console.warn(e)
    }
    throw e
  }

  var isValidNumber = function (number) {
    return typeof number === 'number' && !isNaN(number)
  }

  var isPromise = function (target) {
    return target && typeof target.then === 'function'
  }

  var isValidDelay = function (delay) {
    return isValidNumber(delay) || isPromise(delay)
  }

  var computeDelay = function (delay, args, $default) {
    if (typeof delay === 'function') {
      delay = invoke(delay, args)
    }
    return isValidDelay(delay) ? delay : $default
  }

  var invoke = function (fn, args, isCrossArgs) {
    var ret, len
    if (fn && (len = fn.length)) {
      while (len--) {
        ret = invoke(fn[len], args)
        if (isCrossArgs && typeof ret !== 'undefined') {
          args = [ret]
        }
        if (isCrossArgs && !len) return args
      }
    }
    if (typeof fn === 'function') {
      return fn.apply(null, args || [])
    }
  }

  var normalizeOptions = function (options) {
    options = options || {}
    options.limit = isValidNumber(options.limit) ? options.limit : Infinity
    options.dequeue = options.dequeue || void 0
    if (options.limit < 0) {
      throw new Error('Excepted the limit option greater than or equal to zero.')
    }
    if (options.limit < Infinity && typeof options.dequeue !== 'function') {
      throw new Error('Excepted the dequeue option to be a function.')
    }
    return options
  }

  return {
    warn: warn,
    invoke: invoke,
    isPromise: isPromise,
    computeDelay: computeDelay,
    normalizeOptions: normalizeOptions
  }
}())))
