const url = require("url")

//  方法
const methods = ["get", "post", "options", "delete", "put", "all", "use"];

//  遍历路由池
function queryRoutes(routes, method, path) {
  return (req, res) => {
    const lazy = lazyRoute(routes);
    //  递归执行
    console.log(routes);
    (function next() {
      const route = lazy.next().value;
      console.log(route);
      if (!route) {
        //  如果已经遍历完了，返回未找到
        return res.end('err')
      }
      if (route.path === path && route.method === method) {
        //  路由匹配上了则执行该方法（路由中间件）
        route.fn(req, res);
      } else if (route.method === "use") {
        //  如果是use方法，则执行里面的函数并且将next函数传入（非路由中间件）
        route.fn(req, res, next)
      } else {
        //  继续遍历
        next()
      }
    })()
  }
}

//  定义一个构造器
function* lazyRoute(arr) {
  yield* arr
}

//  创建app
function createApplication() {
  //  返回一个函数作为createServer的回调函数使用
  let app = (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const path = url.parse(req.url, true).pathname.substring(4);
    const method = req.method.toLowerCase();
    const router = queryRoutes(app.stack, method, path);
    router(req, res)
  }
  app.router = function (req, res, next) {
    //
    console.log('app下的stack未找到匹配路由，现在进入router下的stack')
    app.stack.push(...app.router.routes)
    // console.log(app.stack)
    next()
  }
  //  定义路由池
  app.router.routes = []
  app.router.stack = []
  app.stack = [];
  //  每当app或者router注册一个中间件的时候，把这个中间件传入路由池等待遍历
  methods.forEach(method => {
    app.router[method] = app[method] = function (path, fn) {
      const route = {method}
      if (typeof path === "function") {
        route.fn = path;
        route.path = '/'
      } else {
        route.fn = fn;
        route.path = path;
      }
      app.router.routes.push(route)
      this.stack.push(route)
    }
  })
  return app
}

const app = createApplication()

module.exports = app
