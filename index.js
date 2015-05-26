'use strict'

var util = require('util')
var EventEmitter = require('events').EventEmitter
var AWS = require('aws-sdk')
var debug = require('debug')('simple-sqs')

var defaultOpts = {
  apiVersion: '2012-11-05',
  region: 'us-east-1'
}

module.exports = function (opts) {
  return function (queue, cb) {
    queue = new Queue(queue, opts)
    if (cb) queue.on('message', cb)
    return queue
  }
}

var Queue = function (queue, opts) {
  if (!(this instanceof Queue)) return new Queue(queue, opts)

  EventEmitter.call(this)

  this.queue = queue
  this.opts = opts || defaultOpts
  this.once('newListener', this._start.bind(this))
}

util.inherits(Queue, EventEmitter)

Queue.prototype._start = function (event, fn) {
  if (event !== 'message') return this.once('newListener', this._start.bind(this))
  this.sqs = new AWS.SQS(this.opts)
  process.nextTick(this.poll.bind(this))
}

Queue.prototype.deleteMsg = function (msg) {
  var self = this
  var opts = {
    QueueUrl: this.queue,
    ReceiptHandle: msg.ReceiptHandle
  }
  debug('[%s] Deleting message...', msg.MessageId)
  this.sqs.deleteMessage(opts, function (err) {
    if (err) self.emit('error', err)
  })
}

Queue.prototype.poll = function () {
  var self = this
  var opts = {
    QueueUrl: this.queue
  }
  debug('Polling queue...')
  this.sqs.receiveMessage(opts, function (err, data) {
    if (err) {
      self.emit('error', err)
      debug('Waiting 5 seconds before retrying...')
      setTimeout(self.poll.bind(self), 1000 * 5)
      return
    }
    (data.Messages || []).forEach(self._processMsg.bind(self))
    self.poll()
  })
}

Queue.prototype._processMsg = function (msg) {
  var self = this
  debug('[%s] Processing message...', msg.MessageId)
  try {
    msg.Body = JSON.parse(msg.Body)
  } catch (e) {
    debug('[%s] Could not parse message', msg.MessageId)
    e.MessageId = msg.MessageId
    e.Body = msg.Body
    this.emit('error', e)
    this.deleteMsg(msg) // since the message could not be parsed, there is no need in trying again
    return
  }
  this.emit('message', msg, function (err) {
    if (err) return self.emit('error', err)
    self.deleteMsg(msg)
  })
}
