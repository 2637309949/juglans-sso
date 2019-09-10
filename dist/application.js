"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// Copyright (c) 2018-2020 Double.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.
const url = require('url');

const assert = require('assert').strict;

const deepmerge = require('deepmerge');

const fetch = require('node-fetch');

const is = require('is');

const defaultCfg = {
  route: {
    login: '/login',
    logout: '/logout',
    redirect: '/redirect',
    home: '/'
  },
  pages: {
    login: 'pages/login',
    index: 'index'
  },

  redirect(ctx, info) {
    return _asyncToGenerator(function* () {})();
  }

};

module.exports.Server = function () {
  let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (
    /*#__PURE__*/
    function () {
      var _ref2 = _asyncToGenerator(function* (_ref) {
        let {
          router,
          identity
        } = _ref;
        assert.ok(is.object(identity), 'sso dependent on identity plugins!');
        cfg = deepmerge.all([defaultCfg, cfg]); // fake url

        identity.options.fakeUrls.push(cfg.route.home);
        identity.options.fakeUrls.push(cfg.route.login);
        identity.options.fakeUrls.push(cfg.route.logout); // handle for login

        router.get(cfg.route.login,
        /*#__PURE__*/
        function () {
          var _ref3 = _asyncToGenerator(function* (ctx) {
            let token = yield identity.getToken(ctx);
            const valid = yield identity.verifyToken(token && token.accessToken);

            if (!valid) {
              yield ctx.render(cfg.pages.login, {
                _csrf: ctx.state.csrf,
                action: cfg.route.login + '?' + ctx.querystring
              });
            } else {
              const redirect = ctx.query.redirect_uri || ctx.query.redirect;

              if (redirect) {
                if (redirect.indexOf('?') != -1) {
                  ctx.redirect(redirect + '&accessToken=' + token.accessToken);
                } else {
                  ctx.redirect(redirect + '?accessToken=' + token.accessToken);
                }
              } else {
                ctx.redirect(cfg.route.home);
              }
            }
          });

          return function (_x2) {
            return _ref3.apply(this, arguments);
          };
        }()); // post login

        router.post(cfg.route.login,
        /*#__PURE__*/
        function () {
          var _ref4 = _asyncToGenerator(function* (ctx) {
            try {
              const ret = yield identity.options.auth(ctx);

              if (ret) {
                const info = yield identity.obtainToken(ret);
                ctx.cookies.set('accessToken', info.accessToken, {
                  maxAge: 60 * 60 * identity.options.expiresIn
                });
                const redirect = ctx.query.redirect_url || ctx.query.redirect;

                if (redirect) {
                  if (redirect.indexOf('?') != -1) {
                    ctx.redirect(redirect + '&accessToken=' + info.accessToken);
                  } else {
                    ctx.redirect(redirect + '?accessToken=' + info.accessToken);
                  }
                } else {
                  ctx.redirect(cfg.route.home);
                }
              } else {
                yield ctx.render(cfg.pages.login, {
                  _csrf: ctx.state.csrf,
                  action: cfg.route.login + '?' + ctx.querystring,
                  message: 'User does not exist or password does not match'
                });
              }
            } catch (error) {
              yield ctx.render(cfg.pages.login, {
                _csrf: ctx.state.csrf,
                action: cfg.route.login + '?' + ctx.querystring,
                message: error.message
              });
            }
          });

          return function (_x3) {
            return _ref4.apply(this, arguments);
          };
        }()); // handle logout

        router.get(cfg.route.logout,
        /*#__PURE__*/
        function () {
          var _ref5 = _asyncToGenerator(function* (ctx, next) {
            const token = yield identity.getToken(ctx); // revoke token

            yield identity.model.revokeToken(token && token.accessToken); // revoke cookie

            ctx.cookies.set('accessToken'); // redirect

            const redirect = ctx.query.redirect_url || ctx.query.redirect;

            if (redirect) {
              ctx.redirect(redirect);
            } else {
              ctx.redirect(cfg.route.home);
            }
          });

          return function (_x4, _x5) {
            return _ref5.apply(this, arguments);
          };
        }()); // handle home

        router.get(cfg.route.home,
        /*#__PURE__*/
        function () {
          var _ref6 = _asyncToGenerator(function* (ctx, next) {
            yield ctx.render(cfg.pages.index, {
              _csrf: ctx.state.csrf
            });
          });

          return function (_x6, _x7) {
            return _ref6.apply(this, arguments);
          };
        }());
      });

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    }()
  );
};

module.exports.Client = function () {
  let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return (
    /*#__PURE__*/
    function () {
      var _ref8 = _asyncToGenerator(function* (_ref7) {
        let {
          router,
          identity
        } = _ref7;
        assert.ok(is.string(cfg.server), 'server url must be provided!');
        assert.ok(is.string(cfg.client), 'client url must be provided!');
        cfg = deepmerge.all([defaultCfg, cfg]); // handle for login

        identity.options.fakeUrls.push(cfg.route.login);
        identity.options.fakeUrls.push(cfg.route.logout); // redirect to sso

        router.get(cfg.route.login,
        /*#__PURE__*/
        function () {
          var _ref9 = _asyncToGenerator(function* (ctx, next) {
            const redirect = ctx.query.redirect || ctx.query.redirect_uri || '';
            let from = url.resolve(cfg.client, cfg.route.redirect + '?redirect_url=' + redirect);
            from = encodeURIComponent(from);
            ctx.redirect(url.resolve(cfg.server, cfg.route.login + '?redirect_url=' + from));
          });

          return function (_x9, _x10) {
            return _ref9.apply(this, arguments);
          };
        }()); // redirect to sso

        router.get(cfg.route.logout,
        /*#__PURE__*/
        function () {
          var _ref10 = _asyncToGenerator(function* (ctx) {
            const token = yield identity.getToken(ctx); // revoke token

            yield identity.model.revokeToken(token && token.accessToken); // revoke cookie

            ctx.cookies.set('identity'); // redirect

            const redirect = ctx.query.redirect_url || ctx.query.redirect;

            if (redirect) {
              ctx.redirect(redirect);
            } else {
              ctx.redirect(cfg.route.home);
            }
          });

          return function (_x11) {
            return _ref10.apply(this, arguments);
          };
        }()); // redirect from sso

        router.get(cfg.route.redirect,
        /*#__PURE__*/
        function () {
          var _ref11 = _asyncToGenerator(function* (ctx, next) {
            const redirect = ctx.query.redirect || ctx.query.redirect_uri || '';

            if (ctx.query.accessToken) {
              ctx.cookies.set('identity', info.accessToken, {
                maxAge: 60 * 60 * identity.options.expiresIn
              });
            }

            const info = yield fetch(url.resolve(cfg.server, identity.options.route.identityToken), {
              method: 'POST',
              headers: {
                'accessToken': ctx.query.accessToken
              }
            }).then(res => res.json());
            yield cfg.redirect(ctx, info);

            if (!redirect) {
              ctx.redirect(cfg.route.home);
            } else {
              ctx.redirect(redirect);
            }
          });

          return function (_x12, _x13) {
            return _ref11.apply(this, arguments);
          };
        }());
      });

      return function (_x8) {
        return _ref8.apply(this, arguments);
      };
    }()
  );
};