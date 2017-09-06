const deDuplicate = (client) => {
  // goes through the initial 'survival' tables, which contain duplicates
  // and produce new 'out' tables, which only score the worst outcome
  const index = ['out:killed', 'out:weakened', 'out:impaired', 'out:unaffected', 'out:unbinned',
    'out:k_i', 'out:k_w', 'out:k_ua', 'out:k_ub', 'out:i_w', 'out:i_ua', 'out:i_ub', 'out:w_ua', 'out:w_ub']
  return client.sadd('out:index', index)
    .then(() => client.multi()
      .del(index)
      .zunionstore('out:killed', 1, 'survival:5_killed')
      .zunionstore('out:weakened', 1, 'survival:3_weakened')
      .zunionstore('out:impaired', 1, 'survival:4_impaired')
      .zunionstore('out:unaffected', 1, 'survival:2_unaffected')
      .zunionstore('out:unbinned', 1, 'survival:6_unbinned')
      .zinterstore('out:k_i', 2, 'out:killed', 'out:impaired')
      .zinterstore('out:k_w', 2, 'out:killed', 'out:weakened')
      .zinterstore('out:k_ua', 2, 'out:killed', 'out:unaffected')
      .zinterstore('out:k_ub', 2, 'out:killed', 'out:unbinned')
      .zunionstore('out:killed', 5, 'out:killed', 'out:k_i', 'out:k_w', 'out:k_ua', 'out:k_ub', 'AGGREGATE MAX')
      .zrem('out:weakened', 'out:k_w')
      .zrem('out:impaired', 'out:k_i')
      .zrem('out:unaffected', 'out:k_ua')
      .zrem('out:unbinned', 'out:k_ub')
      .zinterstore('out:i_w', 2, 'out:impaired', 'out:weakened')
      .zinterstore('out:i_ua', 2, 'out:impaired', 'out:unaffected')
      .zinterstore('out:i_ub', 2, 'out:impaired', 'out:unbinned')
      .zunionstore('out:impaired', 4, 'out:impaired', 'out:i_w', 'out:i_ua', 'out:i_ub', 'AGGREGATE MAX')
      .zrem('out:weakened', 'out:i_w')
      .zrem('out:unaffected', 'out:i_ua')
      .zrem('out:unbinned', 'out:i_ub')
      .zinterstore('out:w_ua', 2, 'out:weakened', 'out:unaffected')
      .zinterstore('out:w_ub', 2, 'out:weakened', 'out:unbinned')
      .zunionstore('out:weakened', 3, 'out:weakened', 'out:w_ua', 'out:w_ub', 'AGGREGATE MAX')
      .zrem('out:unaffected', 'out:w_ua')
      .zrem('out:unbinned', 'out:w_ub')
      .exec()
    )
    .then(results => Promise.resolve(results))
    .catch(err => Promise.reject(err));
}

const survivalAnalysis = (client) => {
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
          const totalClaims = results.pop();
          const uniqueClaims = results.pop();
          const survival = bins.map((bin, index) => {
            return { type: bin, count: results[index] }
          }).sort((a, b) => a.type < b.type);
          return Promise.resolve({ totalClaims, uniqueClaims, survival });
        })
    })
    .catch(err => Promise.reject(err))
}

module.exports = {
  survivalAnalysis
}