// Copyright (c) 2018-2020 Double.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

const Identity = require('../../../juglans-identity')
const { modelOption } = Identity.options
const sso = require('../../../juglans-sso')
const { redis } = require('./utils')

module.exports = function (app) {
    app.Use(Identity({
        fakeTokens: [],
        fakeUrls: [/\/api\/upload\/.*$/, /\/api\/favicon\.ico$/, /\/api\/test\/mock\/login/]
    }).addOptions(
        modelOption(Identity.model.RedisModel({ redis }))
    ))
    app.Use(sso.Client({
        server: 'http://127.0.0.1:3001',
        client: 'http://127.0.0.1:3002',
        callback: async function(ctx, info) {
            // binding 
            console.log('info = ', info)
        }
    }))
}