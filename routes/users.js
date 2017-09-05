"use strict";

const express = require('express');
const router = express.Router();
const redis = require('promise-redis')();
const find = require('../app/PTABfind.js');
const config = require('../app/config.json');

const client = redis.createClient({
  host: config.database.server
})

find.setClient(client);

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

router.get('/fields', function (req, res, next) {
  client.smembers('fieldList')
    .then((result) => {
      res.json(result)
    })
    .catch(err => console.error(err));
});

router.get('/tables', function (req, res, next) {
  client.smembers('searchable')
    .then((result) => {
      res.json(result)
    })
    .catch(err => console.error(err));
});

router.get('/survival', function (req, res, next) {
  // pulls the count of claim survival statistics
  find.survivalAnalysis()
  .then(result => {
    res.json(result)
  })
  .catch(err => console.error(err))
})

router.get('/multiedit', (req, res, next) => {
  // applies a change to the existing recordset
  console.log(req.body);
  req.json()
  // pass the json request body as the first argument,
  // the field as second argument
  // the newValue as third argument
})

module.exports = router;

// helper functions needed:
// 1: sort by (?sortBy=)
// 2: 