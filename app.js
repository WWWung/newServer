const app = require("./lib/server.js")
const router = require("./routes")
// console.log(router)

const middleware = require("./middleware")

app.use(middleware.urlParser)
app.use(middleware.extendRes)
app.use(middleware.bodyParser)
app.use("/router", router)
app.post("/test", (req, res) => {
  res.success(req.body)
})
module.exports = app
