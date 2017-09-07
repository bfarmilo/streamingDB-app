"use strict";

const express = require('express');
const router = express.Router();
const redis = require('promise-redis')();
const find = require('../app/PTABfind.js');
const { survivalAnalysis } = require('../app/QRYsurvival.js');
const config = require('../app/config.json');

const client = redis.createClient({
  host: config.database.server
})

find.setClient(client);

const searchableSet = [
  'class',
  'FWDStatus',
  'status',
  'survivalList'
];

/* GET list of records by query */
router.get('/run', function (req, res, next) {
  console.log(req.query);
  find.lookUp(req.query.field, req.query.value, req.query.cursor, decodeURIComponent(req.query.table))
    .then(result => {
      console.log('%d results returned', result.count)
      res.json(result);
    })
    .catch(err => console.error(err));
});

// gets a list of fields for querying
router.get('/fields', function (req, res, next) {
  client.smembers('fieldList')
    .then((result) => {
      res.json(result)
    })
    .catch(err => console.error(err));
});

// gets a list of tables for querying
router.get('/tables', function (req, res, next) {
  client.multi(searchableSet.map(item => ['keys', `${item}:*`])).exec()
    .then(result => {
      res.json(['all'].concat(...result))
    })
    .catch(err => console.error(err));
});

// survival data
router.get('/survival', function (req, res, next) {
  // pulls the count of claim survival statistics
  survivalAnalysis(client)
    .then(result => {
      res.json(result)
    })
    .catch(err => console.error(err))
})

router.get('/multiedit', (req, res, next) => {
  // applies a change to the existing recordset
  // request should contain a list of ID's
  // field to change
  // new value
  console.log(req.body);
  req.json()
  console.log(req);
  // pass the json request body as the first argument,
  // the field as second argument
  // the newValue as third argument
})

router.get('/survivaldetail', function (req, res, next) {
  find.lookupByScore(decodeURIComponent(req.query.table), 'tempTable')
    // the json request should include a table
    // so call lookupByScore with the table, this generates a set
    // get smembers
    .then(() => client.smembers('tempTable'))
    // map to 'hgetall', item
    .then(result => {
      console.log('%d matching results found', result.length);
      console.log(result[0], result[1])
      return result.map(item => ['hgetall', item])
    })
    // call client multi exec
    .then(cmdList => client.multi(cmdList).exec())
    // return the result in JSON form
    .then(data => res.json(data))
    // cleanup
    //.then(() => client.del('tempTable'))
    .catch(err => console.error(err))
})

module.exports = router;

// helper functions needed:
// 1: sort by (?sortBy=)
// 2: 