const router = require("../lib/server.js").router;

//  处理上传的文件
const fs = require('fs');
const formidable = require('formidable');

//  路径
const path = require('path');

//  处理html字符串，语法类似于jq
const cheerio = require('cheerio')

//  md5加密模块
const crypto = require('crypto');

//  工具类
const mysqlUtil = require('../utils/mysqlUtil.js');
const dataUtil = require('../utils/dataUtil.js');
const cookie = require('../cookie/cookie.js');
const cookie = require('../session/session.js');
const errHandler = require('../utils/errUtil.js').handleError
// const dataUtil = require('../utils/dataUtil.js');

/*
*  接口格式：http://www.wwwung.cn/api/pathname[?...params][?&page=xxx&pageCount=xxx]
*  返回数据格式:
*  {
*     status: 1成功0失败,
*    data: 成功时返回数据，失败时返回失败msg
*  }
*/

router.get('/blogs', (req, res) => {
  const start = req.query.start || 0;
  const end = req.query.end || 5;
  const mold = req.query.mold || 0;
  const sql = `select id, title, time, clickNumber, userId, type, up, support, star, mold, content, textContent, commentNumber, total from
                    (select id, title, time, clickNumber, userId, type, up, support, star, mold, content, textContent, commentNumber from
                    (select id, title, time, clickNumber, userId, type, up, support, star, mold, content, textContent from article where mold=` + mold + `) as a
                    left join
                    (select count(id) as commentNumber, blogId from comment group by blogId) as b
                    on a.id=b.blogId) as c left join
                    (select count(id) as total from article where mold=` + mold + `) as d on c.id
                    order by time desc limit ` + start + `,` + end;
  mysqlUtil.query(sql)
  .then(rsl => {
    res.success(rsl);
  })
  .catch(err => {
    errHandler(err);
    res.failure(err);
  })
})

router.post('/loginIn', (req, res) => {
  let postData = '';
  req.on('data', chunk => {
    postData += chunk;
  })
  req.on('end', () => {
    const sessionId = cookie.getSessionIdfromCookie(req.headers.cookie);
    const user = session.querySession(sessionId);
    if (user) {
      return res.success(user);
    }
    const data = JSON.parse(postData);
    const sql = "select id, pwd, name, phone, sex, qq, email, address, lastLoginIp, birthday, description, imageUrl, school, registerTime, weibo, locked, power from users where name=" + data.name + " limit 1";
    mysqlUtil.query(sql)
    .then(rsl => {
      if (!rsl.length || rsl[0].pwd !== data.psw) {
        return res.failure('账号或密码错误');
      }
      const hash = crypto.createHash('md5');
      hash.update(user.name);
      const sessionId = hash.digest('hex');
      session.setSession(Object.assign({
        sessionId
      }, rsl[0]))
      res.writeHead(200, {
        //  如果没有httpOnly这个属性的话，那么在浏览器application里会找不到cookie，只能在network里请求的详细信息里看到
        'Set-Cookie': 'sessionId=' + sessionId + ';Max-Age=86400;httpOnly:false'
      })
      res.success('登录成功');
    })
    .catch(err => {
      errHandler(err);
      res.failure('登录失败');
    })
  })
})


module.exports = router
