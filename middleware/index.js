const url = require("url");

module.exports = {
  urlParser (req, res, next) {
    req.query = url.parse(req.url, true).query
    next()
  },
  extendRes (req, res, next) {
    res.failure = msg => {
      const data = {
        status: 0,
        data: msg
      }
      res.end(JSON.stringify(data))
    }
    res.success = rsl => {
      const data = {
        status: 1,
        data: rsl
      }
      res.end(JSON.stringify(data))
    }
    next();
  },
  bodyParser (req, res, next) {
    if (req.method === "post") {
      let postData = "";
      req.on('data', chunk => {
        postData += chunk;
      })
      req.on('end', () => {
        req.body = JSON.parse(postData);
        next()
      })
    } else {
      req.body = {};
      next()
    }
  }
}
