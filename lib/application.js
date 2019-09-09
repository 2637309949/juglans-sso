// Copyright (c) 2018-2020 Double.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

const url = require('url')
const assert = require('assert').strict
const deepmerge = require('deepmerge')
const fetch = require('node-fetch')
const is = require('is')

const defaultCfg = {
  route: {
    login: '/login',
    logout: '/logout',
    redirect: '/redirect',
    home: '/'
  },
  callback(ctx) {
  }
}

module.exports.Server = (cfg = {}) => async function ({ router, identity }) {
  assert.ok(is.object(identity), 'sso dependent on identity plugins!')
  cfg = deepmerge.all([defaultCfg, cfg])
  identity.options.fakeUrls.push(cfg.route.home)
  identity.options.fakeUrls.push(cfg.route.login)
  identity.options.fakeUrls.push(cfg.route.logout)
  router.get(cfg.route.login, async function (ctx, next) {
    let token = await identity.getToken(ctx)
    const valid = await identity.verifyToken(token && token.accessToken)
    if (!valid) {
      await ctx.render('login', { _csrf: ctx.state.csrf, action: cfg.route.login + '?' + ctx.querystring })
      return
    } else {
      const redirect = ctx.query.redirect_uri || ctx.query.redirect
      if (redirect) {
        if (redirect.indexOf('?') != -1) {
          ctx.redirect(redirect + '&accessToken=' + token.accessToken)
        } else {
          ctx.redirect(redirect + '?accessToken=' + token.accessToken)
        }
      } else {
        ctx.redirect(cfg.route.home)
      }
    }
  })

  router.post(cfg.route.login, async function (ctx, next) {
    try {
      const ret = await identity.options.auth(ctx)
      if (ret) {
        const info = await identity.obtainToken(ret)
        ctx.cookies.set('identity', info.accessToken,
          {
            maxAge: 60 * 60 * 24
          }
        )
        const redirect = ctx.query.redirect_url || ctx.query.redirect
        if (redirect) {
          if (redirect.indexOf('?') != -1) {
            ctx.redirect(redirect + '&accessToken=' + info.accessToken)
          } else {
            ctx.redirect(redirect + '?accessToken=' + info.accessToken)
          }
        } else {
          ctx.redirect(cfg.route.home)
        }
      } else {
        await ctx.render('login', { _csrf: ctx.state.csrf, message: 'user does not exist or password does not match' })
      }
    } catch (error) {
      await ctx.render('login', { _csrf: ctx.state.csrf, message: error.message })
    }
  })

  router.get(cfg.route.logout, async function (ctx, next) {
    await ctx.render('logout', { _csrf: ctx.state.csrf })
  })

  router.get(cfg.route.home, async function (ctx, next) {
    await ctx.render('main', { _csrf: ctx.state.csrf })
  })
}

module.exports.Client = (cfg = {}) => async function ({ router, identity }) {
  assert.ok(is.string(cfg.server), 'server url must be provided!')
  assert.ok(is.string(cfg.client), 'client url must be provided!')
  cfg = deepmerge.all([defaultCfg, cfg])
  identity.options.fakeUrls.push(cfg.route.login)
  identity.options.fakeUrls.push(cfg.route.logout)
  router.get(cfg.route.login, async function (ctx, next) {
    const redirect = ctx.query.redirect || ctx.query.redirect_uri || ''
    let from = url.resolve(cfg.client, cfg.route.redirect + '?redirect_url=' + redirect)
    from = encodeURIComponent(from)
    ctx.redirect(url.resolve(cfg.server, cfg.route.login + '?redirect_url=' + from))
  })
  router.get(cfg.route.logout, async function (ctx, next) {
    await ctx.render('logout', { _csrf: ctx.state.csrf })
  })
  router.get(cfg.route.redirect, async function (ctx, next) {
    const redirect = ctx.query.redirect || ctx.query.redirect_uri || ''
    if (ctx.query.accessToken) {
      ctx.cookies.set('identity', ctx.query.accessToken,
        {
          maxAge: 60 * 60 * 24
        }
      )
    }
    const info = await fetch(url.resolve(cfg.server, identity.options.route.identityToken), { method: 'POST', headers: { 'accessToken': ctx.query.accessToken } }).then(res => res.json())
    await cfg.callback(ctx, info)
    if (!redirect) {
      ctx.redirect(cfg.route.home)
    } else {
      ctx.redirect(redirect)
    }
  })
}