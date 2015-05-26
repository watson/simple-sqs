# simple-sqs

A very opinionated wrapper around the SQS part of the official
[aws-sdk](https://github.com/aws/aws-sdk-js) module. This module
basically takes care of the following mondane tasks related to queue
management:

- It will poll the queue for you
- It will notify you of new messages on the queue using the EventEmitter
  pattern
- It will delete messages from the queue after you've finished
  processing them
- It will wait for 5 seconds if the queue for some reason returns an
  error before re-polling
- It expects that the message body is json and will parse it for you
- If the message body cannot be parsed, it's considered an
  unrecoverable error and the message is deleted from the queue while
  emitting an `error` event

[![Build status](https://travis-ci.org/watson/simple-sqs.svg?branch=master)](https://travis-ci.org/watson/simple-sqs)

[![js-standard-style](https://raw.githubusercontent.com/feross/standard/master/badge.png)](https://github.com/feross/standard)

## Installation

```
npm install simple-sqs
```

## Usage

Simple example using a convinient callback function to get messages:

```js
var simpleSqs = require('simple-sqs')()

var queueUrl = 'https://sqs.us-east-1.amazonaws.com/12345/my-queue'

simpleSqs(queueUrl, function (msg, done) {
  console.log('Received a new message with id:', msg.MessageId)
  console.log(msg.Body)

  // acknowledge the message by calling the done callback
  // (this will delete it from the queue)
  done()
})
```

Or, if you do not provide the optional 2nd callback argument, you can
always listen for messages on the returned EventEmitter:

```js
var queue = simpleSqs(queueUrl)

queue.on('message', function (msg, done) {
  console.log('Received a new message with id:', msg.MessageId)
  done()
})
```

## API

The `simple-sqs` module exposes an initializer function that takes a
single options argument to configure SQS. For details about
configuration options, see the official [aws-sdk SQS
documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html).
If no argument is provided `simple-sqs` defaults to `{ apiVersion:
'2012-11-05' }`:

```js
var opts = {...} // SQS config options
var simpleSqs = require('simple-sqs')(opts)
```

The returned `simpleSqs` value is a queue setup function that takes two
arguments and returns a queue object:

```js
var queue = simpleSqs(url[, callback])
```

**Arguments:**

- `url` - The SQS queue URL
- `callback` - Optional callback which will be attached as a listener
  on `message` events

**Returns:**

The returned queue object is an EventEmitter that can emit the following
two events:

- `message`
- `error`

#### Event: 'message'

Emitted every time a new message is received on the SQS queue.

```js
queue.on('message', function (msg, done) {
  // ...
})
```

**Arguments:**

- `msg` - The message received on the queue
- `done` - A callback function

If the callback function isn't called, the message will be returned to
the queue after a configured timeout. You would therefore normally want
to call the callback if you have sucessfully processed the message.

Optinally you can call the callback with an error as the 1st arguemnt.
In this special case the message will **not** be deleted and will be
made available again as if the callback was never called. This feature
is mostly a convenience feature so that you can simplify the deletion
processes if the success depends on an async call, e.g:

```js
queue.on('message', function (msg, done) {
  // Process the message - in this case we try to insert it into a Mongo
  // database:

  db.foo.insert(msg.Body, done)

  // If the `insert` function calls the callback without an error, the
  // message will be deleted from the queue

  // If called _with_ an error, the message will NOT be deleted and the
  // error will be emitted back so we can log it
})

queue.on('error', function (err) {
  // The error returned by the `insert` function will end up here
  console.log('Ups, something went wrong!')
  cosnole.log(err.stack)
})
```

#### Event: 'error'

Emitted if the module encounters an error.

```js
queue.on('error', function (err) {
  // ...
})
```

## Debug output

You can enable debug output using the `DEBUG=simple-sqs` environment
variable.

## License

MIT
