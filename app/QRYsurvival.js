const deDuplicate = (client) => {
  // goes through the initial 'survival' tables, which contain duplicates
  // and produce new 'out' tables, which only score the worst outcome
  const index = ['out:killed', 'out:weakened', 'out:impaired', 'out:unaffected', 'out:unbinned',
    'out:k_i', 'out:k_w', 'out:k_ua', 'out:k_ub', 'out:i_w', 'out:i_ua', 'out:i_ub', 'out:w_ua', 'out:w_ub']
  return client.sadd('out:index', index)
    .then(() => client.multi()
      //.del(index)
      // create a copy of the survival zsets
      .zunionstore('out:killed', 1, 'survival:5_killed')
      .zunionstore('out:weakened', 1, 'survival:3_weakened')
      .zunionstore('out:impaired', 1, 'survival:4_impaired')
      .zunionstore('out:unaffected', 1, 'survival:2_unaffected')
      .zunionstore('out:unbinned', 1, 'survival:6_unbinned')
      // now store the intersection of the sets (order matters !)
      // use aggregate max so it doesn't add the scores together
      .zinterstore('out:k_i', 2, 'out:killed', 'out:impaired', 'AGGREGATE', 'MAX')
      .zrange('out:k_i', 0, -1)
      .exec())
    .then(result => client.multi()
      .zrem('out:impaired', result.pop())
      .zinterstore('out:k_w', 2, 'out:killed', 'out:weakened', 'AGGREGATE', 'MAX')
      .zrange('out:k_w', 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem('out:weakened', result.pop())
      .zinterstore('out:k_ua', 2, 'out:killed', 'out:unaffected', 'AGGREGATE', 'MAX')
      .zrange('out:k_ua', 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem('out:unaffected', result.pop())
      .zinterstore('out:k_ub', 2, 'out:killed', 'out:unbinned', 'AGGREGATE', 'MAX')
      .zrange('out:k_ub', 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem('out:unbinned', result.pop())
      // finally merge all of the patents that were killed + [anything] into killed
      .zunionstore('out:killed', 5, 'out:killed', 'out:k_i', 'out:k_w', 'out:k_ua', 'out:k_ub', 'AGGREGATE', 'MAX')
      // now repeat for the intersection of impaired + anything
      .zinterstore('out:i_w', 2, 'out:impaired', 'out:weakened', 'AGGREGATE', 'MAX')
      .zrange('out:i_w', 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem('out:weakened', result.pop())
      .zinterstore('out:i_ua', 2, 'out:impaired', 'out:unaffected', 'AGGREGATE', 'MAX')
      .zrange('out:i_ua', 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem('out:unaffected', result.pop())
      .zinterstore('out:i_ub', 2, 'out:impaired', 'out:unbinned', 'AGGREGATE', 'MAX')
      .zrange('out:i_ub', 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem('out:unbinned', result.pop())
      .zunionstore('out:impaired', 4, 'out:impaired', 'out:i_w', 'out:i_ua', 'out:i_ub', 'AGGREGATE', 'MAX')
      // and for weakened + anything
      .zinterstore('out:w_ua', 2, 'out:weakened', 'out:unaffected', 'AGGREGATE', 'MAX')
      .zrange('out:w_ua', 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem('out:unaffected', result.pop())
      .zinterstore('out:w_ub', 2, 'out:weakened', 'out:unbinned', 'AGGREGATE', 'MAX')
      .zrange('out:w_ub', 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem('out:unbinned', result.pop())
      .zunionstore('out:weakened', 3, 'out:weakened', 'out:w_ua', 'out:w_ub', 'AGGREGATE', 'MAX')
      .exec()
    )
    // currently ignoring overlap between unbinned and unaffected
    .then(results => Promise.resolve(results))
    .catch(err => Promise.reject(err));
}

const survivalAnalysis = (client) => {
  let returnData = {};
  return deDuplicate(client)
    .then(() => client.smembers('binValues'))
    .then(bins => {
      return client.multi()
        .zcard(`out:${bins[0].match(/_(.*)/)[1]}`)
        .zcard(`out:${bins[1].match(/_(.*)/)[1]}`)
        .zcard(`out:${bins[2].match(/_(.*)/)[1]}`)
        .zcard(`out:${bins[3].match(/_(.*)/)[1]}`)
        .zcard(`out:${bins[4].match(/_(.*)/)[1]}`)
        .zcard('uniqueClaims')
        .llen('allClaims')
        .exec()
        .then(results => {
          returnData.totalClaims = results.pop();
          returnData.uniqueClaims = results.pop();
          returnData.survival = bins.map((bin, index) => {
            return { type: bin, count: results[index] }
          }).sort((a, b) => a.type < b.type);
          return bins;
        })
        .then(bins => client.multi(bins.map(bin => ['llen', `survivalList:${bin}`])).exec())
        .then(survivalDup => {
          returnData.survivalDup = bins.map((bin, index) => {
            return { type: bin, count: survivalDup[index] };
          }).sort((a, b) => a.type < b.type);
          //console.log(returnData);
          return Promise.resolve(returnData);
        })
    })
    .catch(err => Promise.reject(err))
}

module.exports = {
  survivalAnalysis
}