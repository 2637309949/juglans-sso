
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
