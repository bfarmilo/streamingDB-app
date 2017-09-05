const redis = require('promise-redis')();
const config = require('./config.json');

const client = redis.createClient({
  host: config.database.server
});

client.on('connect', () => console.log('connected'));
client.on('error', err => console.log(err));

const deDuplicate = (callback) => {
  client.multi()
    .zunionstore('out:killed', 1, 'survival:5_killed')
    .zunionstore('out:weakened', 1, 'survival:3_weakened')
    .zunionstore('out:impaired', 1, 'survival:4_impaired')
    .zunionstore('out:unaffected', 1, 'survival:2_unaffected')
    .zunionstore('out:unbinned', 1, 'survival:6_unbinned')
    .zinterstore('out:k.i', 2, 'out:killed', 'out:impaired')
    .zinterstore('out:k.w', 2, 'out:killed', 'out:weakened')
    .zinterstore('out:k.ua', 2, 'out:killed', 'out:unaffected')
    .zinterstore('out:k.ub', 2, 'out:killed', 'out:unbinned')
    .zunionstore('out:killed', 5, 'out:killed', 'out:k.i', 'out:k.w', 'out:k.ua', 'out:k.ub', 'AGGREGATE MAX')
    .zrem('out:weakened', 'out:k.w')
    .zrem('out:impaired', 'out:k.i')
    .zrem('out:unaffected', 'out:k.ua')
    .zrem('out:unbinned', 'out:k.ub')
    .del('out:k.i')
    .del('out:k.w')
    .del('out:k.ua')
    .del('out:k.ub')
    .zinterstore('out:i.w', 2, 'out:impaired', 'out:weakened')
    .zinterstore('out:i.ua', 2, 'out:impaired', 'out:unaffected')
    .zinterstore('out:i.ub', 2, 'out:impaired', 'out:unbinned')
    .zunionstore('out:impaired', 4, 'out:impaired', 'out:i.w', 'out:i.ua', 'out:i.ub', 'AGGREGATE MAX')
    .zrem('out:weakened', 'out:i.w')
    .zrem('out:unaffected', 'out:i.ua')
    .zrem('out:unbinned', 'out:i.ub')
    .del('out:i.w')
    .del('out:i.ua')
    .del('out:i.ub')
    .zinterstore('out:w.ua', 2, 'out:weakened', 'out:unaffected')
    .zinterstore('out:w.ub', 2, 'out:weakened', 'out:unbinned')
    .zunionstore('out:weakened', 3, 'out:weakened', 'out:w.ua', 'out:w.ub', 'AGGREGATE MAX')
    .zrem('out:unaffected', 'out:w.ua')
    .zrem('out:unbinned', 'out:w.ub')
    .del('out:w.ua')
    .del('out:w.ub')
    .exec()
    .then((results) => callback(null, results))
    .catch((err) => callback(err));
}

const survivalAnalysis = (callback) => {
  client.smembers('binValues', (err, bins) => {
    client.multi()
      .zcard(`out:${bins[0].match(/_(.*)/)[1]}`)
      .zcard(`out:${bins[1].match(/_(.*)/)[1]}`)
      .zcard(`out:${bins[2].match(/_(.*)/)[1]}`)
      .zcard(`out:${bins[3].match(/_(.*)/)[1]}`)
      .zcard(`out:${bins[4].match(/_(.*)/)[1]}`)
      .zcard('uniqueClaims')
      .llen('allClaims')
      .exec((err, results) => {
        if (err) {
          console.error(err)
        } else {
          const totalClaims = results.pop();
          const uniqueClaims = results.pop();
          const survival = [];
          for (let i = 0; i < results.length; i += 1) {
            survival.push({ type: bins[i], count: results[i] })
          }
          // Total Claims
          console.log('Total claims: %s', totalClaims);
          // Total Instituted
          // Unique Claims
          console.log('Unique claims: %d', uniqueClaims);
          // Unique Claims by disposition
          console.log('Claim Survival Count\n%j', survival.map(item => `${item.type}: ${item.count}`));
          console.log('%j', survival.map(item => `${item.type}: ${Math.round(1000 * (item.count / uniqueClaims)) / 10}%`));
          return callback(null, 'OK')
        }
      });
  });
}

deDuplicate((err2, data) => {
  survivalAnalysis((err3, done2) => {
    if (err3) throw err3;
    client.zrange('unpatentable', 0, -1, 'WITHSCORES')
      .then(rangeResult => convertZtoS(rangeResult, 'temp:unpat'))
      .then(newData => client.zrange('unpatentable_claim', 0, -1, 'WITHSCORES'))
      .then(rangeResult2 => convertZtoS(rangeResult2, 'temp:unpat_claim'))
      .then(newData => client.sdiffstore('doublecount', 'temp:unpat_claim', 'temp:unpat'))
      .then(numAdded => {
        console.log('merged %d records into %s', numAdded, 'doublecount');
        return byClassCode()
      })
      .then(sample => {
        // console.log(sample);
        return scanNext(sample, 'killed:300')
      })
      .then(sample => {
        // console.log(sample);
        client.quit();
      })
      .catch(err2 => {
        client.quit();
        throw err2;
      });

  });
});

const convertZtoS = (result, key) => {
  let index = true;
  console.log('creating new table %s', key);
  const keyList = result.reduce((accum, item) => {
    if (index) {

    } else {
      accum.push(['sadd', key, `claimID:${item}`])
    }
    index = !index;
    return accum
  }, []);
  keyList.push(['smembers', key]);
  return client.multi(keyList).exec()
}

const byClassCode = () => {
  return client.zrange('survival:5_killed', 0, -1, 'WITHSCORES')
    .then(rangeResult => convertZtoS(rangeResult, 'temp:killed'))
    .then(killed => {
      const result = killed.pop();
      const output = result.map(item => ['hmget', `${item}`, 'Patent', 'Claim'])
      return client.multi(output).exec()
    })
    .then(dat => {
      // dat is now temp:killed converted into claimID's
      console.log('merging results')
      const merge = [
        ['sinterstore', 'killed:300', 'class:300', 'temp:killed'],
        ['sinterstore', 'killed:700', 'temp:killed', 'class:700'],
        ['sunionstore', 'killed:electronics', 'killed:300', 'killed:700']
      ]
      return client.multi(merge).exec()
    })
    .then(done => scanNext([0, 0], 'killed:300'))
}

const scanNext = (recordList, key) => {
  // expects an array of claim ID's in the form \d{1-5} or claimID:\d{1-5}
  // and the last element the cursor
  return client.sscan(key, recordList.pop())
    .then(scanResult => returnRecords(scanResult))
}

const returnRecords = (recordList) => {
  console.log('returnRecords called with %s records', recordList[1].length);
  let query = [];
  if (recordList[1][0].match("claimID")) {
    query = recordList[1].map(item => ['hgetall', `${item}`])
  } else {
    query = recordList[1].map(item => ['hgetall', `claimID:${item}`]);
  }
  return client.multi(query).exec()
    .then(output => output.concat(recordList[0]))
}

