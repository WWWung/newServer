const router = require("../lib/server.js").router;

const mysqlUtil = require('../utils/mysqlUtil.js');
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
  // console.log(2)
  // res.end("blogs")
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
    res.failure(err);
  })
})


module.exports = router
