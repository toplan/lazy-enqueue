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
        console.log('will enqueue:', data)
    },
    did: (value, data) => {
        console.log('queue:', queue)
        console.groupEnd()
    },
    failed: (err, data) => {
        console.warn('failed enqueue:', data, ', and the reason is', err)
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

## lazy(enqueue, [options])

Create a lazily high order function of the original enqueue function.

#### Arguments
1. `enqueue` (Function)
The original enqueue function.

2. `[options]` (Object)

- delay (Number|Promise|Function): global delay value

- will (Function): global hook

- did (Function): global hook

- failed (Function): global hook

- limit (Number): The number of limit enqueue, default value is `Infinity`.

- dequeue (Function): A dequeue function of the original queue, this option is required if the limit option is lower than `Infinity`.

#### Returns
`(lazilyEnqueue)`: A lazily high order function.

```javascript
const {delay, hook} = lazilyEnqueue(data)
```
## delay(value)
This value will override the global delay value.

#### Arguments
`value` (Number|Promise|Function)

## hook(name, fn)

#### Arguments
1. `name` (String)
There are only three optional value: 'will', 'did', 'failed'.

2. `fn` (Function)
The hook handler.
If the name is `did`, the first argument is the return value of the original enqueue function.
If the name is `failed`, the first argument is the error information.
