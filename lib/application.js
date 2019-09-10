// Copyright (c) 2018-2020 Double.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

const url = require('url')
const assert = require('assert').strict
const deepmerge = require('deepmerge')
const fetch = require('node-fetch')
const _ = require('lodash')
const is = require('is')

const defaultCfg = {
  route: {
    register: '/register',
    login: '/login',
    logout: '/logout',
    redirect: '/redirect',
    home: '/'
  },
  pages: {
    login: 'pages/login',
    index: 'index'
  },
  async binding (ctx, info) {
  },
  async register (ctx, info) {
  }
}

module.exports.Server = (cfg = {}) => async function ({ router, identity }) {
  assert.ok(is.object(identity), 'sso dependent on identity plugins!')
  cfg = deepmerge.all([defaultCfg, cfg])
  // fake url
  identity.options.fakeUrls.push(cfg.route.home)
  identity.options.fakeUrls.push(cfg.route.login)
  identity.options.fakeUrls.push(cfg.route.logout)
  identity.options.fakeUrls.push(cfg.route.register)

  // handle for login
  router.get(cfg.route.login, async function (ctx) {
    let token = await identity.getToken(ctx)
    const valid = await identity.verifyToken(token && token.accessToken)
    if (!valid) {
      await ctx.render(cfg.pages.login, { _csrf: ctx.state.csrf, action: cfg.route.login + '?' + ctx.querystring })
    } else {
      const redirect = ctx.query.redirect_uri || ctx.query.redirect
      if (redirect) {
        if (redirect.indexOf('?') !== -1) {
          ctx.redirect(redirect + '&accessToken=' + token.accessToken)
        } else {
          ctx.redirect(redirect + '?accessToken=' + token.accessToken)
        }
      } else {
        ctx.redirect(cfg.route.home)
      }
    }
  })

  // post login
  router.post(cfg.route.login, async function (ctx) {
    try {
      const ret = await identity.options.auth(ctx)
      if (ret) {
        const info = await identity.obtainToken(ret)
        ctx.cookies.set('accessToken', info.accessToken, { maxAge: 60 * 60 * identity.options.expiresIn })
        const redirect = ctx.query.redirect_url || ctx.query.redirect
        if (redirect) {
          if (redirect.indexOf('?') !== -1) {
            ctx.redirect(redirect + '&accessToken=' + info.accessToken)
          } else {
            ctx.redirect(redirect + '?accessToken=' + info.accessToken)
          }
        } else {
          ctx.redirect(cfg.route.home)
        }
      } else {
        await ctx.render(cfg.pages.login, { _csrf: ctx.state.csrf, action: cfg.route.login + '?' + ctx.querystring, message: 'User does not exist or password does not match' })
      }
    } catch (error) {
      await ctx.render(cfg.pages.login, { _csrf: ctx.state.csrf, action: cfg.route.login + '?' + ctx.querystring, message: error.message })
    }
  })

  // post register
  router.post(cfg.route.register, async function (ctx) {
    try {
      const form = _.pick(ctx.request.body, 'username', 'password', 'email')
      const ret = await cfg.register(ctx, form)
      if (ret) {
        await ctx.render(cfg.pages.login, { _csrf: ctx.state.csrf, action: cfg.route.login + '?' + ctx.querystring })
      } else {
        await ctx.render(cfg.pages.login, { _csrf: ctx.state.csrf, action: cfg.route.login + '?' + ctx.querystring, message: 'Incorrect username or password' })
      }
    } catch (error) {
      await ctx.render(cfg.pages.login, { _csrf: ctx.state.csrf, action: cfg.route.login + '?' + ctx.querystring, message: error.message })
    }
  })

  // handle logout
  router.get(cfg.route.logout, async function (ctx, next) {
    const token = await identity.getToken(ctx)
    // revoke token
    await identity.model.revokeToken(token && token.accessToken)
    // revoke cookie
    ctx.cookies.set('accessToken')
    // redirect
    const redirect = ctx.query.redirect_url || ctx.query.redirect
    if (redirect) {
      ctx.redirect(redirect)
    } else {
      ctx.redirect(cfg.route.home)
    }
  })

  // handle home
  router.get(cfg.route.home, async function (ctx, next) {
    // token just has accessToken for route`home` if fake url
    let token = await identity.getToken(ctx)
    const authorized = await identity.verifyToken(token && token.accessToken)
    // reload token again
    if (authorized) {
      token = await identity.model.findToken(token && token.accessToken)
    }
    // extra token info
    const user = (token && token.extra) || {}
    // render index
    await ctx.render(cfg.pages.index, { _csrf: ctx.state.csrf, authorized, user })
  })
}

module.exports.Client = (cfg = {}) => async function ({ router, identity }) {
  assert.ok(is.string(cfg.server), 'server url must be provided!')
  assert.ok(is.string(cfg.client), 'client url must be provided!')
  cfg = deepmerge.all([defaultCfg, cfg])

  // handle for login
  identity.options.fakeUrls.push(cfg.route.login)
  identity.options.fakeUrls.push(cfg.route.logout)

  // redirect to sso
  router.get(cfg.route.login, async function (ctx, next) {
    const redirect = ctx.query.redirect || ctx.query.redirect_uri || ''
    let from = url.resolve(cfg.client, cfg.route.redirect + '?redirect_url=' + redirect)
    from = encodeURIComponent(from)
    ctx.redirect(url.resolve(cfg.server, cfg.route.login + '?redirect_url=' + from))
  })

  // redirect to sso
  router.get(cfg.route.logout, async function (ctx) {
    const token = await identity.getToken(ctx)
    // revoke token
    await identity.model.revokeToken(token && token.accessToken)
    // revoke cookie
    ctx.cookies.set('identity')
    // redirect
    const redirect = ctx.query.redirect_url || ctx.query.redirect
    if (redirect) {
      ctx.redirect(redirect)
    } else {
      ctx.redirect(cfg.route.home)
    }
  })

  // redirect from sso
  router.get(cfg.route.redirect, async function (ctx, next) {
    const redirect = ctx.query.redirect || ctx.query.redirect_uri || ''
    if (ctx.query.accessToken) {
      ctx.cookies.set('identity', ctx.query.accessToken, { maxAge: 60 * 60 * identity.options.expiresIn })
    }
    const info = await fetch(url.resolve(cfg.server, identity.options.route.identityToken), { method: 'POST', headers: { 'accessToken': ctx.query.accessToken } }).then(res => res.json())
    await cfg.binding(ctx, info)
    if (!redirect) {
      ctx.redirect(cfg.route.home)
    } else {
      ctx.redirect(redirect)
    }
  })
}
