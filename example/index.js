const sleep = require('sleep-promise');
const Throat = require('../');
const fs = require('fs');
// console.log(new Date(), 'begin main');
const throat = Throat(3, 3000);
const jsondata = [];

function gen(name) {
  let a = 0;
  return function() {
    console.log(new Date(), '【start】'.padEnd(15), name, a);
    return a++;
  }
}

function genAwait(name, time = 10000) {
  let a = 0;
  return async function() {
    let x = a;
    const now = new Date();
    console.log(new Date(), '【await start】'.padEnd(15), name, x);
    const count = a++;
    await sleep(time);
    console.log(new Date(), '【await end】'.padEnd(15), name, x);
    jsondata.push({
      name: `${name}${count}`,
      from: now.toISOString(),
      to: new Date().toISOString(),
    });

    return x;
  }
}

const runnerA = genAwait('a', 2500);
const runnerB = genAwait('b', 1500);
const runnerC = genAwait('c', 20000);

setInterval(() => {
  // console.log(new Date(), 'throat A');
  throat(runnerA);
}, 1000);

setInterval(() => {
  // console.log(new Date(), 'throat B');
  throat(runnerB);
}, 1000);


setInterval(() => {
  // console.log(new Date(), 'throat C');
  throat(runnerC);
}, 1000);

process.on('exit', () => {
  console.log('DONE');
});

process.on('SIGINT', () => {
  // fs.writeFileSync('/tmp/data.json', JSON.stringify(jsondata));
  process.exit();
});