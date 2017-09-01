const MAXRESULTS = 100;

let client;
let nextCursor = 0;

const oneLoop = (cursor, field, matchPat, target) => {
  let returnCursor = cursor;
  let scanTarget = [['scan', cursor, 'MATCH', 'claim*']]
  if (target !== 'all') {
    scanTarget = [['sscan', target, cursor]];
  }
  return client.multi(scanTarget).exec()
    .then(claimList => {
      // console.log('claimList %j', claimList);
      // take the listing (element 1) and map it into a ['hmget', 'ID', field]
      const query = claimList[0][1].map(item => ['hmget', item, 'ID', field]);
      // take the cursor(element 0) and store it
      returnCursor = claimList[0][0];
      // client.multi to generate a result set of arrays [id, field]
      return client.multi(query).exec()
    })
    .then(results => {
      // console.log('results %j', results);
      // results.find(results.map(item => item[0]).match(pattern))
      return results.filter(item => item[1].includes(matchPat))
    })
    .then(matches => {
      //console.log('matches: %j, %d', matches, matches.length);
      const result = matches.length > 0 ? { returnCursor, matches: matches.map(item => item[0]) } : { returnCursor }
      //console.log('resulting matches %j', result);
      return Promise.resolve(result);
    })
    // resolve with an array [cursor, [matches]]
    .catch(error => Promise.reject(error));
}

const matchField = (accum, cursor, field, pattern, target) => {
  return oneLoop(cursor, field, pattern, target)
    .then(scanResult => {
      // console.log('oneLoop result %j', scanResult);
      if (scanResult.hasOwnProperty("matches")) {
        console.log('matches added %j', scanResult.matches);
        accum.push(scanResult.matches);
      }
      return scanResult.returnCursor;
    })
    .then(csr => {
      console.log(accum.length);
      if (accum.length < MAXRESULTS && csr !== "0") {
        return matchField(accum, csr, field, pattern, target)
      } else {
        nextCursor = csr;
        const last = accum.map(item => ['hgetall', `claimID:${item}`]);
        // console.log(last);
        return client.multi(last).exec();
      }
    })
    .then(result => {
      // console.log(result);
      return result;
    })
    .catch(err => err);
}


const lookUp = (field, value, cursor, target = 'all') => {
  // console.log(target);
  return matchField([], cursor, field, value, target)
    .then(result => {
      console.log(result);
      return Promise.resolve({ cursor: nextCursor, count: result.length, data: result });
    })
    .catch(err => Promise.reject(err));
}

const survivalAnalysis = () => {
  return client.smembers('binValues')
    .then(bins => {
      return client.multi()
        .zcard(`survival:${bins[0]}`)
        .zcard(`survival:${bins[1]}`)
        .zcard(`survival:${bins[2]}`)
        .zcard(`survival:${bins[3]}`)
        .zcard(`survival:${bins[4]}`)
        .zcard('uniqueClaims')
        .llen('allClaims')
        .exec()
        .then(results => {
          const totalClaims = results.pop();
          const uniqueClaims = results.pop();
          const survival = [];
          for (let i = 0; i < results.length; i += 1) {
            survival.push({ type: bins[i], count: results[i] })
          }
          survival.sort((a, b) => a.type < b.type);
          // Total Claims
          console.log('Total claims: %s', totalClaims);
          // Total Instituted
          // Unique Claims
          console.log('Unique claims: %d', uniqueClaims);
          // Unique Claims by disposition
          console.log('Claim Survival Count\n%j', survival.map(item => `${item.type}: ${item.count}`));
          console.log('%j', survival.map(item => `${item.type}: ${Math.round(1000 * (item.count / uniqueClaims)) / 10}%`));
          console.log('sending result %j', { totalClaims, uniqueClaims, survival });
          return Promise.resolve({ totalClaims, uniqueClaims, survival });
        })
    })
    .catch(err => Promise.reject(err))
}

module.exports = {
  setClient: (inClient) => { client = inClient },
  lookUp,
  survivalAnalysis
}