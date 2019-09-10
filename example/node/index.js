// Copyright (c) 2018-2020 Double.  All rights reserved.
// Use of this source code is governed by a MIT style
// license that can be found in the LICENSE file.

const Juglans = require('../../../juglans')

const app = new Juglans({ name: 'Juglans V1.0' })
app.Config({
  name: 'Juglans V1.0',
  prefix: '',
  port: 3002,
  debug: true
})
require('./plugins')(app)
app.Run()
