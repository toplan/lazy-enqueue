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
const dequeue = queue.pop.bind(queue)
const lazilyEnqueue = lazy(enqueue, {
    delay: 1000,
    limit: 3,
    dequeue: dequeue,
    will: data => {
        console.group()
        console.timeEnd('time')
        console.log('[will] data:', data)
    },
    success: (value, data) => {
        console.log('[success] queue:', queue)
        console.groupEnd()
    },
    failure: (err, data) => {
        console.warn('[failure] data:', data, ', and the reason is', err)
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
Create a lazily high order function of the original enqueue function.

#### Arguments
1. `enqueue` (Function)

    The original enqueue function.

2. `[options]` (Object)

    - delay (Number|Promise|Function): global delay value.

    - will (Function): A global hook, called before enqueue.

    - success (Function): A global hook, called when enqueue success.

    - failure (Function): A global hook, called when enqueue failure.

    - limit (Number): The number of limit enqueue, default value is `Infinity`.

    - dequeue (Function): A dequeue function of the original queue, this option is required if the limit option is lower than `Infinity`.

#### Returns
`(lazilyEnqueue)`: A lazily high order function.

## delay(value)
```javascript
const {delay} = lazilyEnqueue(data)
```
Set the private delay value for the current enqueue action, in other words, override the global delay value.

> All of the functions(api) return by `(lazilyEnqueue)` support chain calls, like this:
> `delay(100).hook('will', fn).hook('success', fn)`

#### Arguments
`value` (Number|Promise|Function)

## hook(name, fn)
```javascript
const {hook} = lazilyEnqueue(data)
```
Add private hooks for the current enqueue action, and these hooks will be called before the global hooks.

#### Arguments
1. `name` (String)

    The hook name, there are only three optional value: 'will', 'success', 'failure'.

2. `fn` (Function)

    The hook handler.
    If the hook name is `will`, the parameter of this function is the return value of the previous `will` hook.
    If the hook name is `success`, the first parameter of this function is the return value of the original enqueue function.
    If the hook name is `failure`, the first parameter of this function is the error information.

## will(fn)
```javascript
const {will} = lazilyEnqueue(data)
```
alias: `hook('will', fn)`

## done(onSuccess, onFailure)
```javascript
const {done} = lazilyEnqueue(data)
```
alias: `hook('success', onSuccess).hook('failure', onFailure)`
