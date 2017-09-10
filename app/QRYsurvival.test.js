const { survivalAnalysis, binClaims, deDup } = require('./QRYsurvival.js');
const { survivalStatus } = require('./config.json');
const redis = require('promise-redis')();
const client = redis.createClient();

const bins=survivalStatus;

bins.reverse();

// Test generating a custom ZLIST for survival analysis
client.keys('patentowner*').then(result => result.length).then(length => {
  console.log('%d patentowner keys found', length)
  if (length === 0) {
    return getEntityData(client)
  }
  return Promise.resolve('done');
})
  .then(() => binClaims(client, 'patentownertype:lawfirm', "97"))
  .then(() => deDup(client, "97", bins))
  .then(result => client.quit())
  .catch(err => console.error(err));