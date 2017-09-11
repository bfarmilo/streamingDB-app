const redis = require('promise-redis')();
const client = redis.createClient();
const find = require('./PTABfind.js');
const { getEntityData } = require('./QRYtypes.js');
const { binClaims } = require('./QRYsurvival.js');

//find.setClient(client);

//lookUp has two modes:

/*
//1: Search all records mode: pass 'JSON key', 'value'
find.lookUp('Instituted', '1', 'all')
.then(res => {
  console.log('PatentOwner===Personalized returns %d records', res.count);
  return res;
})
.then(() => client.quit())
.catch(err => console.error(err));
 */

//2: Search a given Set: pass 'JSON key', 'value', 'Set to Search'
/* find.lookUp('PatentOwner', '(npe)', 'temp:killed')
  .then(res => console.log('temp:killed contains %d records where PatentOwner===Personalized', res.count))
  .catch(err => console.error(err)); */

// Test getting entity data and splitting out npe etc.

/*  console.log(extractMultiples('D & D Group Pty (company); A PTY (npe)').map(item => extractTypes(item))) */


// Test generating a custom ZLIST for survival analysis
client.keys('patentowner*').then(result => result.length).then(length => {
  console.log('%d patentowner keys found', length)
  if (length === 0) {
    return getEntityData(client)
  }
  return Promise.resolve('done');
})
  .then(() => binClaims(client, 'patentownertype:person', "99"))
  .then(result => console.log(result.length))
  .then(() => client.quit())
  .catch(err => console.error(err));

