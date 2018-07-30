const app = require("./lib/server.js")
const router = require("./router/routes.js")
// console.log(router)

const middleware = require("./middleware")

app.use("/url",middleware.urlParser)
app.use(middleware.extendRes)
app.use("/router", router)
module.exports = app
