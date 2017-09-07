const redis = require('promise-redis')();
const dataSet = require('../public/javascripts/1216-RP-10452 - claimdata.json').claimData;
const config = require('./config.json');

const client = redis.createClient({
  host: config.database.server
});

client.on('error', err => {
  console.log(err);
  client.quit();
});

client.on('connect', () => {
  console.log('connected');
  client.flushdb((err1, ok) => {
    if (err1) {
      console.error(err1);
    } else {
      initDB((err, data) => {
        if (err) console.error(err);
        console.log('completed with %d records analyzed', data)
        client.quit();
      });
    }
  });
});

const initDB = (callback) => {
  // push list of binValues
  client.sadd(['binValues', ...config.survivalStatus]);

  // push list of keys
  client.sadd(['fieldList'].concat(Object.keys(dataSet[0])));

  //push list of searchable tables
  client.sadd(['searchable', 'all', 'killed:300', 'killed:700', 'killed:electronics', 'temp:killed', 'temp:unpat', 'temp:unpat_claim']);

  // TODO: change to a multi

  const output = dataSet.map((item, index) => {
    // create a claim survival bins
    let survivalStatus = '6_unbinned';
    if (item.Status === 'Terminated-Adverse Judgment' || (item.Status === 'FWD Entered' && item.Invalid) || item.Status === 'Waiver Filed' || item.FWDStatus.toLowerCase() === 'unpatentable') {
      // Terminated with Adverse Judgment (patent owner gives up)
      // Decided and deemed invalid
      // PO Waives the claims
      survivalStatus = '5_killed'
    } else if (item.Status === 'Terminated-Settled' && item.Instituted) {
      // Settled after Institution
      // Instituted
      survivalStatus = '4_impaired'
    } else if ((item.Status === 'FWD Entered' && !item.Invalid) || (item.Status === 'Terminated-Settled' && !item.Instituted) || (item.Status === 'Terminated-Denied')) {
      // Decision - not invalid
      // Settled but not Instituted
      // IPR Denied
      survivalStatus = '2_unaffected';
    } else if ((item.Status === 'Instituted')) {
      // Instituted - no decision yet
      survivalStatus = '3_weakened';
    }
    client.zadd(`survival:${survivalStatus}`, index, `${item.Patent}:${item.Claim}`);
    client.lpush(`survivalList:${survivalStatus}`, `claimID:${index}`)

    // make a table of records
    client.hmset(`claimID:${index}`,
      'ID', index,
      'IPR', item.IPR,
      'DateFiled', item.DateFiled,
      'Status', item.Status,
      'FWDStatus', item.FWDStatus.toLowerCase(),
      'Petitioner', item.Petitioner,
      'PatentOwner', item.PatentOwner,
      'Patent', item.Patent,
      'MainUSPC', item.MainUSPC,
      'Claim', item.Claim,
      'Instituted', (item.Instituted ? 1 : 0),
      'Invalid', (item.Invalid ? 1 : 0),
      'survivalStatus', survivalStatus
    );
    // a set of status Types
    client.sadd('statusTypes', item.Status);

    // a set of FWDStatus Types
    client.sadd('FWDStatusTypes', item.FWDStatus.toLowerCase());

    // bin by FWDStatus to check
    client.sadd(`FWDStatus:${item.FWDStatus.toLowerCase()}`, `claimID:${index}`);

    // patent.claim by index
    client.sadd(`patent:${item.Patent}:${item.Claim}`, `claimID:${index}`);

    // a set of killed claims
    if (item.FWDStatus.toLowerCase() === 'unpatentable') {
      client.zadd('unpatentable', index, `${item.Patent}:${item.Claim}`);
      client.zadd('unpatentable_claim', index, `claimID:${index}`)
    }

    // create sets for all status except FWD entered
    switch (item.Status) {
      case 'Instituted':
        client.sadd('status:instituted', `claimID:${index}`);
        break;
      case 'Notice OF Filing Date Accorded': case 'Filing Date Accorded':
        client.sadd('status:filed', `claimID:${index}`);
        break;
      case 'Terminated-Dismissed':
        client.sadd('status:dismissed', `claimID:${index}`);
        break;
      case 'Terminated-Denied':
        client.sadd('status:denied', `claimID:${index}`);
        break;
      case 'Terminated-Other':
        client.sadd('status:other', `claimID:${index}`);
        break;
      case 'Waiver Filed':
        client.sadd('status:waived', `claimID:${index}`);
        break;
      case 'Terminated-Settled':
        client.sadd('status:settled', `claimID:${index}`);
        break;
      case 'Terminated-Adverse Judgment':
        client.sadd('status:lostCase', `claimID:${index}`)
        break;
      case 'FWD Entered':
        client.sadd('status:decided', `claimID:${index}`);
        break;
      default:
    }
    // create a list based on the first number of the USPC
    let mainClass = item.MainUSPC.split('/')[0]
    mainClass = mainClass.length > 2 ? mainClass.match(/(\d)\d{2}/) : [0, 0];
    if (mainClass !== null) client.sadd(`class:${mainClass[1]}00`, `claimID:${index}`);

    // creates a set of patent-claim, useful for unique claims
    client.zadd('uniqueClaims', index, `${item.Patent}:${item.Claim}`);
    client.lpush('allClaims', `${item.Patent}:${item.Claim}`);

    return true;
  });
  if (output.length === dataSet.length) {
    return callback(null, output.length);
  }
}

module.exports = {
  initDB
}