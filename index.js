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
      utils.tryDo(function () {
        utils.invoke(data.successHooks, [value].concat(data.args))
      })
    }

    var failure = function (data, error) {
      data.error = error
      data.status = FAILED
      utils.tryDo(function () {
        utils.invoke(data.failureHooks, [error].concat(data.args))
      })
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
            utils.tryDo(function () {
              utils.invoke(fn, [data.value].concat(data.args))
            })
            return returns
          }
          if (data.status === FAILED && name === FAILURE_HOOK) {
            utils.tryDo(function () {
              utils.invoke(fn, [data.error].concat(data.args))
            })
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
      var latestTimer, running = false, buffer = []

      var syncEnqueue = function (data) {
        var ret, args
        try {
          args = utils.invoke(data.willHooks, data.args, true)
          ret = utils.invoke(enqueue, args)
        } catch (e) {
          return failure(data, e)
        }
        success(data, ret)
      }

      var asyncEnqueue = function (data, delay, cb) {
        var timer = setTimeout(function () {
          clearTimeout(timer)
          syncEnqueue(data)
          utils.invoke(cb)
        }, delay)
      }

      var overflowBuffer = function () {
        var overflowLen = buffer.length - options.bufferSize
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
        try {
          var delay = utils.computeDelay(data.delay, data.args, 0)
        } catch (e) {
          failure(data, e)
          return next()
        }
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
      return console.error ? console.error(e) : console.log(e)
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

  var tryDo = function (fn) {
    try {
      invoke(fn)
    } catch (e) {
      warn(e)
    }
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
    options.bufferSize = isValidNumber(options.bufferSize) ? options.bufferSize : Infinity
    if (options.bufferSize < 0) {
      throw new Error('Excepted the option `bufferSize` greater than or equal to zero.')
    }
    return options
  }

  return {
    tryDo: tryDo,
    invoke: invoke,
    isPromise: isPromise,
    computeDelay: computeDelay,
    normalizeOptions: normalizeOptions
  }
}())))
