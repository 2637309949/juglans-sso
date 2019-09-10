// Copyright (c) 2018-2020 Double.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.
const path = require('path')
const additions = require('../../../juglans-addition')
const redis = additions.redis
const logger = additions.logger
const winston = logger.winston

const repo = module.exports

// logger init
repo.logger = logger
  .add(new winston.transports.File({ filename: path.join(__dirname, 'error.log'), level: 'error', maxsize: 5 * 1024 }))
  .add(new winston.transports.File({ filename: path.join(__dirname, 'combined.log'), maxsize: 5 * 1024 }))

// redis init
repo.Redis = redis.Redis
repo.redis = redis.Connect('redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 3
}, function (err) {
  if (err) {
    repo.logger.info(`Redis:redis://127.0.0.1:6379 connect failed!`)
    repo.logger.error(err.stack || err.message)
  } else {
    repo.logger.info(`Redis:redis://127.0.0.1:6379 connect successfully!`)
  }
})
