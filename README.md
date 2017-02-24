# Intro
A library to make your enqueue function lazily.

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
    will: value => {
        console.group()
        console.timeEnd('time')
        console.log('will enqueue:', value)
    },
    rejected: value => {
        console.warn('rejected enqueue:', value)
    },
    did: value => {
        console.log('queue:', queue)
        console.groupEnd()
    }
})

console.time('time')
lazilyEnqueue(0);lazilyEnqueue(1)
setTimeout(() => {
    lazilyEnqueue(2);lazilyEnqueue(3);lazilyEnqueue(4);lazilyEnqueue(5)
}, 2000)
```

# API

```javascript
import lazy from 'lazy-enqueue'
```

## lazy([options], enqueue)

Create a lazily high order function of the original enqueue function.

#### Arguments
1. `[options]` (Object)

- delay (Number|Promise|Function)
  The value can be a number, promise or function witch return a number or promise, default value is `0`.
  If the value is a negative number, the data will skip delay and enqueue immediately after the previous.

- will (Function)
  A global hook, will be invoke before enqueue with the arguments same to enqueue function.

- did (Function)
  A global hook, will be invoke after enqueue with the arguments same to enqueue function.

- rejected (Function)
  A global hook, will be invoke after reject enqueue with the arguments same to enqueue function.

- limit (Number)
  The number of limit enqueue, default value is `Infinity`.

- dequeue (Function)
  A dequeue function of the original queue, this option is required if the limit option is not equal to `Infinity`.

2. `enqueue` (Function)
The original enqueue function.

#### Returns

`(lazilyEnqueue)`: A lazily high order function.
