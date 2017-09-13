"use strict";

const express = require('express');
const router = express.Router();
const redis = require('promise-redis')();
const find = require('../app/PTABfind.js');
const { survivalAnalysis } = require('../app/QRYsurvival.js');
const { initDB } = require('../app/PTABredis.js');
const { getEntityData } = require('../app/QRYtypes.js');
const config = require('../app/config.json');

let client; // need this global for the other functions to re-use
let clientActive = false;

// these are namespaces that you can use to select a graph to view
const searchableSet = [
  'class',
  'FWDStatus',
  'status',
  'patentownertype',
  'petitionertype'
];

const startClient = () => {
  const client = redis.createClient();
  setListener(client);
  return client;
  /* return redis.createClient(
    6380,
    config.database.server,
    {
      password: config.database.keyPrime,
      tls: {
        servername: config.database.server
      }
    }
  ) */
};

const setListener = (connection) => {
  connection.on('end', () => {
    console.log('connection closed');
    clientActive = false;
  });
  connection.on('connect', () => {
    console.log('connection opened');
    clientActive = true;
  });
  connection.on('error', (err) => {
    console.error('connection error !', err)
  });
}

// check redis DB, initialize if req'd
router.get('/reset', (req, res, next) => {
  if (!clientActive) client = startClient();
  client.flushdb()
    .then(() => initDB(client))
    .then(() => getEntityData(client))
    .then(ok => {
      return client.quit()
      console.log(ok)
    })
    .catch(err => console.error(err));
})


/* GET list of records by query */
router.get('/run', function (req, res, next) {
  if (!clientActive) client = startClient();
  find.setClient(client);
  console.log(req.query);
  find.lookUp(req.query.field, req.query.value, req.query.cursor, decodeURIComponent(req.query.table))
    .then(result => {
      console.log('%d results returned', result.count)
      res.json(result);
    })
    .then(() => client.quit())
    .catch(err => console.error(err));
});

// gets a list of fields for querying
router.get('/fields', function (req, res, next) {
  if (!clientActive) client = startClient();
  client.smembers('fieldList')
    .then((result) => {
      res.json(result)
    })
    .catch(err => console.error(err));
});

// gets a list of tables for querying
router.get('/tables', function (req, res, next) {
  if (!clientActive) client = startClient();
  client.multi(searchableSet.map(item => ['keys', `${item}:*`])).exec()
    .then(result => {
      res.json(['all'].concat(...result))
    })
    .catch(err => console.error(err));
});

// survival data
router.get('/survival', function (req, res, next) {
  if (!clientActive) client = startClient();
  // pulls the count of claim survival statistics
  console.log('received request to update chart %d - %s', req.query.chart, req.query.table);
  survivalAnalysis(client, decodeURIComponent(req.query.table), req.query.chart)
    .then(result => {
      res.json(result)
    })
    .catch(err => console.error(err))
});

router.post('/multiedit', function (req, res, next) {
  // applies a change to the existing recordset
  // request should contain a list of ID's
  // field to change
  // new value
  console.log(req.body);
  // pass the json request body as the first argument,
  // the field as second argument
  // the newValue as third argument
});

router.get('/survivaldetail2', (req, res, next) => {
  if (!clientActive) client = startClient();
  let returnValue = {};
  find.zrangeScan(decodeURIComponent(req.query.table), req.query.cursor)
    // now go look up the duplicates for each
    .then(tempResults => {
      returnValue.cursor = tempResults.cursor;
      returnValue.count = tempResults.count;
      returnValue.totalCount = tempResults.totalCount;
      return tempResults.data.map(item => ['smembers', `patent:${item}`])
    })
    .then(cmdList => {
      // console.log('command list for getting duplicates %j', cmdList)
      return client.multi(cmdList).exec()
    })
    .then(result => {
      console.log('%d matching results found', result.length);
      return [].concat(...result).map(item => ['hgetall', item]);
    })
    // call client multi exec
    .then(cmdList => {
      //console.log('command list for hget operation %j', cmdList);
      return client.multi(cmdList).exec();
    })
    // return the result in JSON form
    .then(data => {
      data.sort((a, b) => a.Patent === b.Patent ?
        parseInt(a.Claim, 10) - parseInt(b.Claim, 10)
        : parseInt(a.Patent, 10) - parseInt(b.Patent, 10)
      );
      return data;
    })
    .then(sortedData => {
      returnValue.data = sortedData;
      return res.json(returnValue);
    })
    .catch(err => console.error(err))
});

module.exports = router;

// helper functions needed:
// 1: sort by (?sortBy=)
// 2: 