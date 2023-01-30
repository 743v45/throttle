'use strict';
const sleep = require('sleep-promise');
const debug = require('debug')('throat');

function throatInternal(size, ms) {
  var queue = new Queue();
  var s = size | 0;
  var followIndex = 0;
  var followTime = new Array(size);

  function run(fn, self, args) {
    if ((s | 0) !== 0) {
      s = (s | 0) - 1;
      const time = sleepTime();
      debug('run function after %s ms', time);
      return sleep(time).then(() => {
        return new Promise(function (resolve) {
          resolve(fn.apply(self, args));
        })
      }).then(onFulfill, onReject);
    }
    return new Promise(function (resolve) {
      queue.push(new Delayed(resolve, fn, self, args));
    }).then(runDelayed);
  }
  function runDelayed(d) {
    const time = sleepTime();
    debug('run delay function after %s ms', time);
    return sleep(time).then(() => {
      return new Promise(function (resolve) {
        resolve(d.fn.apply(d.self, d.args));
      })
    }).then(onFulfill, onReject);
  }
  function onFulfill(result) {
    release();
    return result;
  }
  function onReject(error) {
    release();
    throw error;
  }
  function release() {
    var next = queue.shift();
    if (next) {
      next.resolve(next);
    } else {
      s = (s | 0) + 1;
    }
  }

  function sleepTime() {
    const now = new Date().getTime();
    let diffTime = ms - (now - (followTime[followIndex] || 0));
    diffTime = diffTime >= 0 ? diffTime : 0;

    followTime[followIndex] = now + diffTime;
    if (++followIndex === size) {
      followIndex = 0;
    }

    return diffTime;
  }

  return run;
}

function earlyBound(size, ms, fn) {
  const run = throatInternal(size | 0, ms);
  return function () {
    var args = new Array(arguments.length);
    for (var i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }
    return run(fn, this, args);
  };
}
function lateBound(size, ms) {
  const run = throatInternal(size | 0, ms);
  return function (fn) {
    if (typeof fn !== 'function') {
      throw new TypeError(
        'Expected throat fn to be a function but got ' + typeof fn
      );
    }
    var args = new Array(arguments.length - 1);
    for (var i = 1; i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
    return run(fn, this, args);
  };
}
module.exports = function throat(size, ms, fn) {
  if (typeof size !== 'number') {
    throw new TypeError(
      'Expected throat size to be a number but got ' + typeof size
    );
  }

  if (typeof ms !== 'number') {
    throw new TypeError(
      'Expected throat ms to be a number but got ' + typeof ms
    );
  }

  if (fn !== undefined && typeof fn !== 'function') {
    throw new TypeError(
      'Expected throat fn to be a function but got ' + typeof fn
    );
  }
  if (typeof fn === 'function') {
    return earlyBound(size | 0, ms, fn);
  } else {
    return lateBound(size | 0, ms);
  }
};

module.exports.default = module.exports;

function Delayed(resolve, fn, self, args) {
  this.resolve = resolve;
  this.fn = fn;
  this.self = self || null;
  this.args = args;
}

var blockSize = 64;
function Queue() {
  this._s1 = [];
  this._s2 = [];
  this._shiftBlock = this._pushBlock = new Array(blockSize);
  this._pushIndex = 0;
  this._shiftIndex = 0;
}

Queue.prototype.push = function (value) {
  if (this._pushIndex === blockSize) {
    this._pushIndex = 0;
    this._s1[this._s1.length] = this._pushBlock = new Array(blockSize);
  }
  this._pushBlock[this._pushIndex++] = value;
};

Queue.prototype.shift = function () {
  if (this._shiftIndex === blockSize) {
    var s2 = this._s2;
    if (s2.length === 0) {
      var s1 = this._s1;
      if (s1.length === 0) {
        return undefined;
      }
      this._s1 = s2;
      s2 = this._s2 = s1.reverse();
    }
    this._shiftIndex = 0;
    this._shiftBlock = s2.pop();
  }
  if (
    this._pushBlock === this._shiftBlock &&
    this._pushIndex === this._shiftIndex
  ) {
    return undefined;
  }
  var result = this._shiftBlock[this._shiftIndex];
  this._shiftBlock[this._shiftIndex++] = null;
  return result;
};
