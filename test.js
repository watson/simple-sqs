'use strict'

var test = require('tape')
var SimpleSqs = require('./')

test('EventEmitter', function (t) {
  var queue = SimpleSqs()()
  t.ok(queue instanceof require('events').EventEmitter)
  t.end()
})

test('init with default options', function (t) {
  var queue = SimpleSqs()()
  t.deepEquals(queue.opts, { apiVersion: '2012-11-05', region: 'us-east-1' })
  t.end()
})

test('init with custom options', function (t) {
  var queue = SimpleSqs({ foo: 'bar' })()
  t.deepEquals(queue.opts, { foo: 'bar' })
  t.end()
})
