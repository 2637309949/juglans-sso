// Copyright (c) 2018-2020 Double.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

const path = require('path')
const _ = require('lodash')
const render = require('koa-ejs')
const Identity = require('../../../juglans-identity')
const Delivery = require('../../../juglans-delivery')
const sso = require('../../../juglans-sso')
const { authOption, modelOption } = Identity.options
const { redis } = require('./utils')

const users = [{
  username: 'root',
  password: '111111'
}]

module.exports = function (app) {
  app.Use(Delivery({
    urlPrefix: '/assets',
    root: path.join(__dirname, '../../public')
  }))
  app.Use(function ({ httpProxy }) {
    render(httpProxy, {
      root: path.join(__dirname, '../../template'),
      layout: 'layout',
      viewExt: 'ejs',
      cache: false,
      debug: false
    })
    httpProxy.use(function (ctx, next) {
      ctx.state = ctx.state || {}
      ctx.state.now = new Date()
      ctx.state.ip = ctx.ip
      ctx.state.version = '2.0.0'
      ctx.state.config = {}
      return next()
    })
  })
  app.Use(
    Identity({
      fakeTokens: [],
      fakeUrls: [/\/api\/upload\/.*$/, /\/api\/favicon\.ico$/, /\/api\/test\/mock\/login/]
    }).addOptions(
      authOption(async function (ctx) {
        const form = _.pick(ctx.request.body, 'username', 'password')
        const one = users.find(x => x.username === form.username && x.password === form.password)
        if (one) {
          return {
            username: one.username,
          }
        }
        return null
      }),
      modelOption(Identity.model.RedisModel({ redis }))
    )
  )
  app.Use(sso.Server({
    async register (ctx, info) {
      users.push(info)
      return true
    }
  }))
}