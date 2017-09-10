const { survivalStatus } = require('./config.json');

const binClaims = (client, collection, chartID) => {
  // bins all elements in collection into
  // [6_unbinned, 5_killed, 4_impaired, 3_weakened, 2_unaffected]
  // 1. intersect collection with each of the survivalList entries
  // 2. create ID patent:claim ZLISTS for each intersection
  // 2.1 for each bin, get the list and map it to hmget Patent Claim
  // return the namespace of the ZLISTS for use in deDuplicate

  return client.keys(`chart${chartID}:index`)
    .then(result =>
      // if there is an index, delete all of the members so we can start fresh
      result.length > 0 ? client.smembers(`chart${chartID}:index`) : 0)
    .then(listing => listing !== 0 ? client.del(...listing, `chart${chartID}:index`) : 0)
    .then(() => {
      // store the intersection of temp:chartID:(each bin) which is the partial collection with survivalList (the whole collection)
      const cmdList = survivalStatus.map(bin => ['sinterstore', `temp:chart${chartID}:${bin}`, `survivalList:${bin}`, collection])
      return client.multi(cmdList).exec()
    })
    .then(result => {
      // now have a 5 element array, each containing a list of claimID's that were in the partial collection
      console.log('got resulting array with %d members', result.length);
      // map each of these, then map each element, to a series of hmgets
      const scmdList = [].concat(...result.map((resultSet, index) => [
        ['smembers', `temp:chart${chartID}:${survivalStatus[index]}`],
        ['del', `temp:chart${chartID}:${survivalStatus[index]}`]]
      ));
      //console.log(scmdList);
      return client.multi(scmdList).exec()
    })
    .then(results => {
      console.log('converting to patent:claim list');
      // the result array contains [results], 1 or 0, [results], 1 or 0, so filter it down to just results 
      return Promise.all(results.filter(item => item !== 0 && item !== 1).map((resultSet, index) => {
        return client.multi(resultSet.map(item => ['hmget', item, 'ID', 'Patent', 'Claim'])).exec()
          .then(zresults => {
            // so for each element there is a large array of [ID, Patent, Claim]
            // but a few may be undefined, if there were no matches
            console.log('%d elements added to %s', zresults.length, survivalStatus[index]);
            const zCmdList = zresults.map(result => {
              if (result.length === 3) {
                return ['zadd', `chart${chartID}:${survivalStatus[index]}`, result[0], `${result[1]}:${result[2]}`]
              } else {
                return ['zadd', `chart${chartID}:${survivalStatus[index]}`]
              }
            });
            // add non-empty sets to the index
            if (resultSet.length !== 0) {
              zCmdList.push(['sadd', `chart${chartID}:index`, `chart${chartID}:${survivalStatus[index]}`]);
            }
            // console.log('executing new query %j')
            return client.multi(zCmdList).exec()
          })
      }))
    })
    .then(() => client.multi(survivalStatus.map(item => ['zcard', `chart${chartID}:${item}`])).exec())
    .then(result => {
      // console.log('%j unique claims added', numUnique);
      return Promise.resolve(
        survivalStatus.map((bin, index) => {
          return { type: bin, count: results[index] }
        }).sort((a, b) => a.type < b.type)
      )
    })
    .catch(err => Promise.reject(err))
}


// deDup - removes overlaps between bins and preserves only the worst outcome
// @param client = redis.client
// @param chartID = number, the number of the chart
// @param checkArray = array<survival bins> - the survival status values
// returns string 'chartID${chartID}'

const deDup = (client, chartID, checkArray) => {
  const end = checkArray.length;
  console.log('de-duplicating chart %d', chartID);
  // optimized way to only ensure the worst case status is kept and duplicates removed
  return Promise.all(checkArray.map((current, index, input) => {
    // console.log('processing element %d, value %s, total length %d', index, current, end)
    const intersect = (intIdx) => {
      // currently the indexing calls itself, so short-circuit that one
      if (intIdx === index) return Promise.resolve(intIdx + 1);
      // console.log('intersecting %s with %s', checkArray[index], checkArray[intIdx]);
      // now the loop - intersect, add to index, get the contents of the intersection
      return client.multi()
        .zinterstore(`chart${chartID}:${checkArray[index]}_${checkArray[intIdx]}`, 2, `chart${chartID}:${checkArray[index]}`, `chart${chartID}:${checkArray[intIdx]}`)
        .zrange(`chart${chartID}:${checkArray[index]}_${checkArray[intIdx]}`, 0, -1)
        .exec()
        .then(result => {
          // take the last element of the result, which is the list of overlapping items
          // and remove those from the lower-numbered set. Some may be empty (no overlaps) so skip those
          // add any created table to the index
          // console.log(result);
          const overlaps = result.pop();
          console.log('%d intersections found between %s and %s', result[0], checkArray[index], checkArray[intIdx]);
          return result[0] > 0
            ? client.multi([
              ['sadd', `chart${chartID}:index`, `chart${chartID}:${checkArray[index]}_${checkArray[intIdx]}`],
              ['zrem', `chart${chartID}:${checkArray[intIdx]}`, overlaps]
            ]).exec()
            : 'skipped'
        })
        .then(result => {
          // console.log(result);
          return Promise.resolve(intIdx + 1)
        })
        .catch(err => Promise.reject(err))
    }

    const check = (checkIdx) => {
      //console.log('check called on %d / %d', index, end);
      // checks to see if we are at the end of the array of bins
      return (checkIdx === end);
    }

    const cycle = (intersect, check, cycleIdx, isDone = false) => {
      // console.log('cycle called on %s,index %d', checkArray[cycleIdx], cycleIdx)
      if (isDone) return 'done';
      return intersect(cycleIdx).then(nextIdx => cycle(intersect, check, nextIdx, check(nextIdx)))
    }
    return cycle(intersect, check, index);
  }))
    .then(() => Promise.resolve(`chart${chartID}:`))
    .catch(err => Promise.reject(err))
}

const deDuplicate = (client, namespace) => {
  // goes through the survival tables at chart${chartID}:index, which contain duplicates
  // and produce new 'out' tables, which only score the worst outcome
  // create a copy of the survival zsets
  const firstSeries = survivalStatus.map(item => ['zunionstore', `${namespace}:out:${item}`, 1, `${namespace}:${item}`]);
  return client.multi(firstSeries).exec()
    .then(() => client.multi()
      // A) store the intersection of killed and impaired
      // use aggregate max so it doesn't add the scores together
      // do this with array.reduce in one pass? 
      .zinterstore(`${namespace}:out:k_i:`, 2, `${namespace}:out:killed:`, `${namespace}:out:impaired:`, 'AGGREGATE', 'MAX')
      // B) return all values of the intersection
      .zrange(`${namespace}:out:k_i:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      // C) remove any items from the lower set that were moved up
      .zrem(`${namespace}:out:impaired:`, result.pop())
      // repeat A-B-C for killed intersects weakened
      .zinterstore(`${namespace}:out:k_w:`, 2, `${namespace}:out:killed:`, `${namespace}:out:weakened:`, 'AGGREGATE', 'MAX')
      .zrange(`${namespace}:out:k_w:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem(`${namespace}:out:weakened:`, result.pop())
      // repeat A-B-C for killed intersects unaffected
      .zinterstore(`${namespace}:out:k_ua:`, 2, `${namespace}:out:killed:`, `${namespace}:out:unaffected:`, 'AGGREGATE', 'MAX')
      .zrange(`${namespace}:out:k_ua:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem(`${namespace}:out:unaffected:`, result.pop())
      // repeat A-B-C for killed intersects unbinned
      .zinterstore(`${namespace}:out:k_ub:`, 2, `${namespace}:out:killed:`, `${namespace}:out:unbinned:`, 'AGGREGATE', 'MAX')
      .zrange(`${namespace}:out:k_ub:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem(`${namespace}:out:unbinned:`, result.pop())
      // finally merge all of the patents that were killed + [anything] into killed
      .zunionstore(`${namespace}:out:killed:`, 5, `${namespace}:out:killed:`, `${namespace}:out:k_i:`, `${namespace}:out:k_w:`, `${namespace}:out:k_ua:`, `${namespace}:out:k_ub:`, 'AGGREGATE', 'MAX')
      // now repeat for the intersection of impaired + anything
      .zinterstore(`${namespace}:out:i_w:`, 2, `${namespace}:out:impaired:`, `${namespace}:out:weakened:`, 'AGGREGATE', 'MAX')
      .zrange(`${namespace}:out:i_w:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem(`${namespace}:out:weakened:`, result.pop())
      .zinterstore(`${namespace}:out:i_ua:`, 2, `${namespace}:out:impaired:`, `${namespace}:out:unaffected:`, 'AGGREGATE', 'MAX')
      .zrange(`${namespace}:out:i_ua:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem(`${namespace}:out:unaffected:`, result.pop())
      .zinterstore(`${namespace}:out:i_ub:`, 2, `${namespace}:out:impaired:`, `${namespace}:out:unbinned:`, 'AGGREGATE', 'MAX')
      .zrange(`${namespace}:out:i_ub:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem(`${namespace}:out:unbinned:`, result.pop())
      .zunionstore(`${namespace}:out:impaired:`, 4, `${namespace}:out:impaired:`, `${namespace}:out:i_w:`, `${namespace}:out:i_ua:`, `${namespace}:out:i_ub:`, 'AGGREGATE', 'MAX')
      // and for weakened + anything
      .zinterstore(`${namespace}:out:w_ua:`, 2, `${namespace}:out:weakened:`, `${namespace}:out:unaffected:`, 'AGGREGATE', 'MAX')
      .zrange(`${namespace}:out:w_ua:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem(`${namespace}:out:unaffected:`, result.pop())
      .zinterstore(`${namespace}:out:w_ub:`, 2, `${namespace}:out:weakened:`, `${namespace}:out:unbinned:`, 'AGGREGATE', 'MAX')
      .zrange(`${namespace}:out:w_ub:`, 0, -1)
      .exec()
    )
    .then(result => client.multi()
      .zrem(`${namespace}:out:unbinned:`, result.pop())
      .zunionstore(`${namespace}:out:weakened:`, 3, `${namespace}:out:weakened:`, `${namespace}:out:w_ua:`, `${namespace}:out:w_ub:`, 'AGGREGATE', 'MAX')
      // finally, write the index
      .sadd(index)
      .exec()
    )
    // currently ignoring overlap between unbinned and unaffected
    .then(results => Promise.resolve(results))
    .catch(err => Promise.reject(err));
}

const survivalAnalysis = (client, scope, chartID) => {
  let returnData = {};
  let scopeData = [];
  let bins = survivalStatus;
  if (scope === 'all') {
    scopeData = ['keys', 'clientID:*'];
  } else {
    scopeData = ['keys', `${scope}*`];
  }
  return client.multi(scopeData).exec()
    .then(result => {
      console.log('%d keys found in %s', result.length, scope)
      // otherwise we already have this data available
      returnData.totalClaims = result.length;
      return Promise.resolve('done');
    })
    .then(() => binClaims(client, `${scope}`, chartID)) //TODO: fix the scope)
    .then(unique => {
      returnData.uniqueClaims = unique;
      return deDup(client, chartID, bins.reverse())
    })
    .then(result => {
      returnData.survival = result;
      return Promise.resolve(returnData);
    })
    .catch(err => Promise.reject(err))
}

module.exports = {
  survivalAnalysis,
  binClaims,
  deDup
}