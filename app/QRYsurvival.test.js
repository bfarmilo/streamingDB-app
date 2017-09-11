const { survivalAnalysis, binClaims, deDup, allClaims } = require('./QRYsurvival.js');
const { survivalStatus } = require('./config.json');
const redis = require('promise-redis')();
const client = redis.createClient();

// Test generating a custom ZLIST for survival analysis
survivalAnalysis(client, 'all', 5)
  .then(result => {
    console.log(result);
    return client.quit()})
  .catch(err => console.error(err));