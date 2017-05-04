# Intro
A lightweight and no dependencies library to make your enqueue function lazily.

# Install
```
npm i --save lazy-enqueue
```

# Usage

```javascript
import lazy from 'lazy-enqueue'

const queue = []
const enqueue = queue.unshift.bind(queue)
const lazilyEnqueue = lazy(enqueue, {
    delay: 1000,
    bufferSize: 3,
    will: data => {
        console.group()
        console.timeEnd('time')
        console.log('[will] data:', data)
    },
    success: (value, data) => {
        if (value > 3) queue.pop()
        console.log('[success] queue:', queue)
        console.groupEnd()
    },
    failure: (err, data) => {
        console.warn('[failure] data:', data, err)
    }
})

console.time('time')
lazilyEnqueue(0);lazilyEnqueue(1)
setTimeout(() => {
    lazilyEnqueue(2);lazilyEnqueue(3);lazilyEnqueue(4);lazilyEnqueue(5)
}, 2000)
```

# API

## lazy(enqueue, [options])
```javascript
import lazy from 'lazy-enqueue'
```
Create a lazily higher order function of the original enqueue function.

#### Arguments
1. `enqueue` (Function)

    The original enqueue function.

2. `[options]` (Object)

    - delay (Number|Promise|Function): The global delay value.

    - will (Function): The global hook, called before the enqueue action.

    - success (Function): The global hook, called after successfully enqueue.

    - failure (Function): The global hook, called if failed with any reason.

    - bufferSize (Number): The size of buffer. Default `Infinity`.

#### Returns
`(lazilyEnqueue)`: A lazily higher order function.

## delay(value)
```javascript
const {delay} = lazilyEnqueue(data)
```
Set private delay value for the current enqueue action. In other words, override the global delay value.

> All of the functions(api) return by `(lazilyEnqueue)` support chain calls, like this:
> `delay(100).hook('will', fn).hook('success', fn)`

#### Arguments
`value` (Number|Promise|Function)

If this value is a promise,
the return value(if has) will override the original data, witch be passed to the `(lazilyEnqueue)` function.

If this value is a function,
it will be called with specified parameters, witch passed to the `(lazilyEnqueue)` function,
and the return value should be a number or promise.

## hook(name, fn)
```javascript
const {hook} = lazilyEnqueue(data)
```
Add private hooks for the current enqueue action. These private hooks called before the global hooks.

#### Arguments
1. `name` (String)

    The hook name, there are only three optional value: `will`, `success`, `failure`.

2. `fn` (Function)

    The hook handler.

    If the hook name is `will`,
    the parameters of this hook function is same to the parameters passed to the `(lazilyEnqueue)` function,
    and the return value(if has) will be passed to the next `will` hook as its parameter.
    In the end, the latest return value will be pushed to the queue (override the original data).

    If the hook name is `success`, the first parameter of this hook function is the return value of the original enqueue function,
    and the remaining parameters is same to the parameters passed to the `(lazilyEnqueue)` function.

    If the hook name is `failure`, the first parameter of this hook function is the error information.
    and the remaining parameters is same to the parameters passed to the `(lazilyEnqueue)` function.

## will(fn)
```javascript
const {will} = lazilyEnqueue(data)
```
It's same to `hook('will', fn)`.

## done(onSuccess, [onFailure])
```javascript
const {done} = lazilyEnqueue(data)
```
It's same to `hook('success', onSuccess).hook('failure', onFailure)`.

