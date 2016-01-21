'use strict'

var test = require('tape')
var AWS = require('aws-sdk')
var SQS = require('./')

test('EventEmitter', function (t) {
  var queue = SQS()()
  t.ok(queue instanceof require('events').EventEmitter)
  t.end()
})

test('init with default options', function (t) {
  var queue = SQS()()
  t.deepEquals(queue.opts, { apiVersion: '2012-11-05', region: 'us-east-1' })
  t.end()
})

test('init with custom options', function (t) {
  var queue = SQS({ foo: 'bar' })()
  t.deepEquals(queue.opts, { foo: 'bar' })
  t.end()
})

test('no messages', function (t) {
  var polls = 0
  var orig = AWS.SQS
  AWS.SQS = function () {
    this.receiveMessage = function (opts, cb) {
      polls++
      process.nextTick(cb.bind(null, null, {}))
    }
    this.deleteMessage = function (opts, cb) {
      t.ok(false, 'should not call deleteMessage')
    }
  }

  var queue = SQS()('foo', function (msg, done) {
    t.ok(false, 'should not call message callback')
  })

  setTimeout(function () {
    t.ok(polls > 1, 'should poll multiple times')
    queue.poll = function () {} // stop polling
    AWS.SQS = orig
    t.end()
  }, 20)
})

test('process messages while keep polling', function (t) {
  var polls = 0
  var orig = AWS.SQS
  AWS.SQS = function () {
    this.receiveMessage = function (opts, cb) {
      process.nextTick(cb.bind(null, null, { Messages: [{ Body: '{"foo":true}' }] }))
    }
    this.deleteMessage = function (opts, cb) {
      t.ok(false, 'should not call deleteMessage')
    }
  }

  var queue = SQS()('foo', function (msg, done) {
    polls++
    t.deepEquals(msg, { Body: { foo: true } })
  })

  setTimeout(function () {
    t.ok(polls > 1, 'should call callback multiple times')
    queue.poll = function () {} // stop polling
    AWS.SQS = orig
    t.end()
  }, 20)
})

test('wait', function (t) {
  var deletes = 0
  var processed = 0
  var processing = false
  var orig = AWS.SQS
  AWS.SQS = function () {
    this.receiveMessage = function (opts, cb) {
      t.ok(!processing)
      process.nextTick(cb.bind(null, null, { Messages: [{ Body: '{}' }] }))
    }
    this.deleteMessage = function (opts, cb) {
      deletes++
      process.nextTick(cb)
    }
  }

  var queue = SQS({ wait: true })('foo', function (msg, done) {
    processing = true
    setTimeout(function () {
      processed++
      processing = false
      done()
    }, 20)
  })

  setTimeout(function () {
    t.ok(deletes === processed, 'should delete all processed messages')
    queue.poll = function () {} // stop polling
    AWS.SQS = orig
    t.end()
  }, 100)
})

test('pollInterval', function (t) {
  var polls = 0
  var orig = AWS.SQS
  AWS.SQS = function () {
    this.receiveMessage = function (opts, cb) {
      polls++
      process.nextTick(cb.bind(null, null, { Messages: [{ Body: '{}' }] }))
    }
    this.deleteMessage = function (opts, cb) {
      process.nextTick(cb)
    }
  }

  var queue = SQS({ pollInterval: 100 })('foo', function (msg, done) {
    process.nextTick(done)
    if (polls === 2) {
      queue.poll = function () {} // stop polling
      AWS.SQS = orig
      t.end()
    }
  })

  setTimeout(function () {
    t.equal(polls, 1)
  }, 50)
})

test('pollInterval > wait', function (t) {
  var polls = 0
  var didWait = false
  var orig = AWS.SQS
  AWS.SQS = function () {
    this.receiveMessage = function (opts, cb) {
      polls++
      process.nextTick(cb.bind(null, null, { Messages: [{ Body: '{}' }] }))
    }
    this.deleteMessage = function (opts, cb) {
      process.nextTick(cb)
    }
  }

  var queue = SQS({ wait: true, pollInterval: 200 })('foo', function (msg, done) {
    process.nextTick(done)
    if (polls === 2) {
      t.ok(didWait)
      queue.poll = function () {} // stop polling
      AWS.SQS = orig
      t.end()
    }
  })

  setTimeout(function () {
    didWait = true
    t.equal(polls, 1)
  }, 100)
})
