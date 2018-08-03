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
const session = require('../session/session.js');
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
  const sessionId = cookie.getSessionIdfromCookie(req.headers.cookie);
  const user = session.querySession(sessionId);
  if (user) {
    return res.success(user);
  }
  const data = req.body;
  const sql = "select id, pwd, name, phone, sex, qq, email, address, lastLoginIp, birthday, description, imageUrl, school, registerTime, weibo, locked, power from users where name=" + data.name + " limit 1";
  mysqlUtil.query(sql)
  .then(rsl => {
    if (!rsl.length || rsl[0].pwd !== data.psw) {
      return res.failure('账号或密码错误');
    }
    const hash = crypto.createHash('md5');
    hash.update(data.name);
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

router.post('/submitArticle', (req, res) => {
  const data = req.body;
  const sqlData = dataUtil.handleData(data);
  let sql = "";
  if (data.hasOwnProperty("id")) {
    sql = 'update article set ' + sqlData + 'where id=' + data.id;
  } else {
    sql = 'insert into article set ' + sqlData;
  }
  mysqlUtil.query(sql)
  .then(rsl => {
    res.success()
  })
  .catch(err => {
    errHandler(err);
    res.failure('插入博客失败');
  })
})

router.post('/register', (req, res) => {
  const data = req.body;
  const sql = "select id from users where name=" + data.name + ' limit 1';
  mysqlUtil.query(sql)
  .then(rsl => {
    if (rsl.length) {
      return res.failure('账号已存在');
    }
    const sqlData = dataUtil.handleData(data);
    const sql = "insert into users set " + sqlData;
    return mysqlUtil.query(sql)
  })
  .then(fields => {
    const hash = crypto.createHash('md5');
    hash.update(data.name);
    const sessionId = hash.digest('hex');
    data.sessionId = sessionId;
    data.id = fields.insertId
    session.setSession(data);
    res.writeHead(200, {
      //  如果没有httpOnly这个属性的话，那么在浏览器application里会找不到cookie，只能在network里请求的详细信息里看到
      'Set-Cookie': 'sessionId=' + sessionId + ';Max-Age=86400;httpOnly:false'
    })
    res.success({
      id: fields.insertId,
      msg: '注册成功'
    })
  })
  .catch(err => {
    res.failure('注册失败');
  })
})

router.get('/isLogin', (req, res) => {
  const sessionId = cookieUtil.getSessionIdfromCookie(req.headers.cookie);
  if (req.headers.cookie && sessionId) {
    const user = session.querySession(sessionId);
    if (!user) {
      return res.failure('未登录');
    }
    return res.success(user);
  }
  res.failure('未登录');
})

router.post('/portrait', (req, res) => {
  const form = new formidable.IncomingForm();
  //保留文件扩展名
  form.keepExtensions = true;
  form.encoding = 'utf-8';

  //  这一步是设置文件上传处理之后的保存位置
  form.uploadDir = path.join(__dirname, '../assets/imgs')
  form.parse(req, (err, fields, files) => {
    if (err) {
      errHandler(err);
      return res.failure('图片上传失败');
    }

    //  由于文件保存之后会自动随机生成一个名字，所以利用nodejs的rename方法更改为上传时候的文件名
    const imgName = Date.now() + encodeURIComponent(files.image.name);
    fs.rename(files.image.path, path.join(__dirname, '../assets/imgs/' + imgName), (err) => {
      if(err){
        res.failure('图片上传失败');
      }else{
        res.success({ name: imgName });
      }
    });
  })
})

router.get('/article', (req, res) => {
  const id = req.query.id;
  const sql = 'update article set clickNumber=clickNumber+1 where id=' + id;
  const data = {};
  mysqlUtil.query(sql)
  .then(rsl => {
    const sql = `select commentNumber, id, title, time, clickNumber, userId, type, content, up, mold, star, prevTitle, prevId, nextId, nextTitle from
                     (select c.id, c.title, c.time as time, c.clickNumber as clickNumber, c.userId as userId, c.type as type, c.content as content, c.up as up, c.mold as mold, c.star as star, c.prevTitle, c.prevId, d.id as nextId, d.title as nextTitle from
                     (select a.id as id, a.title as title, a.time as time, a.clickNumber as clickNumber, a.userId as userId, a.type as type, a.content as content, a.up as up, a.mold as mold, a.star as star, b.title as prevTitle, b.id as prevId from
                     (select id, title, time, clickNumber, userId, type, content, up, support, star, mold from article where id=` + id + `)
                     as a left join
                     (select id, title, mold from article where id>` + id + ` order by id asc limit 1)
                     as b on b.mold=a.mold) as c left join
                     (select id, title, mold from article where id<` + id + ` order by id desc limit 1)
                     as d on c.mold=d.mold) as e,
                     (select count(id) as commentNumber from comment where blogId=` + id + `) as f`;
    return mysqlUtil.query(sql)
  })
  .then(rsl => {
    //  查询一篇博客及其上下篇信息的结果
    Object.assign(data, sql[0]);
    const sql = 'select id, userId, blogId from followed where blogId=' + id;
    return mysqlUtil.query(rsl)
  })
  .then(rsl => {
    //  查询这篇博客所有关注这篇博客的用户信息
    data.followedUser = rsl;
    res.success(data);
  })
  .catch(err => {
    errHandler(err);
    res.failure('博客查询失败');
  })

})

router.get('/loginOut', (req, res) => {
  if (!req.headers.cookie) {
    res.success({msg: "已登出"});
  } else {
    const sessionId = cookie.getSessionIdfromCookie(req.headers.cookie);
    session.deleteSession(sessionId)
    res.writeHead(200, {
      'Set-Cookie': 'sessionId=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
    })
    res.success({msg: "已登出"});
  }
})

router.post('/subComent', (req, res) => {
  const sqlData = dataUtil.handleData(req.body);
  const sql = 'insert into comment set ' + sqlData;
  mysqlUtil.query(sql)
  .then(rsl => {
    res.success({msg: '评论成功'});
  })
  .catch(err => {
    res.failure('评论失败');
  })
})

router.post('/editInfo', (req, res) => {
  const user = req.body;
  const id = user.id;
  const sqlData = dataUtil.handleData(user);
  const sql = 'update users set ' + sqlData + ' where id=' + id;
  mysqlUtil.query(sql)
  .then(rsl => {
    res.success({msg: '信息更新成功'});
  })
  .catch(err => {
    errHandler(err);
    res.failure('信息更新失败');
  })
})

router.get('/self', (req, res) => {
  const id = req.query.id;
  const sql = 'select id, name, phone, sex, qq, email, address, lastLoginIp, birthday, description, imageUrl, school, registerTime, weibo, locked from users where id=' + id;
  mysqlUtil.query(sql)
  .then(rsl => {
    if (rsl.length) {
      res.success(rsl);
    } else {
      res.failure('账号不存在');
    }
  })
  .catch(err => {
    errHandler(err);
    res.failure('获取信息失败');
  })
})

router.get('/edit', (req, res) => {
  const sql = 'select id, title, time, type, content, up, support, star, mold, textContent from  article where id=' + id;
  mysqlUtil.query(sql)
  .then(rsl => {
    if (rsl.length) {
      res.success(rsl[0]);
    } else {
      res.failure('博客不存在');
    }
  })
  .catch(err => {
    errHandler(err);
    res.failure('获取博客失败');
  })
})

router.post('/message', (req, res) => {
  const message1 = JSON.parse(JSON.stringify(req.body));
  const message2 = JSON.parse(JSON.stringify(req.body));
  //  创建两个对象，收件人和发件人各一份
  //  userid属性代表这条私信属于哪个用户，friendid代表与userid交互的用户
  //  这样设计的目的在于，把每条私信创建了两份，在查表的时候更加方便，同时当某一方删除私信的时候，另一方不受影响
  //  劣势：使数据库变得冗余；两份content占用过多空间（可以把content再单独做一份表，因为两份私信的内容是相同的）

  //  type 0 代表是发送的信息 type 1代表是接收的信息
  message1.type = 0;

  message2.userId = message1.friendId;
  message2.friendId = message1.userId;
  message2.type = 1;

  Promise.all([
    mysqlUtil.query('insert into secret_message set ' + dataUtil.handleData(message1)),
    mysqlUtil.query('insert into secret_message set ' + dataUtil.handleData(message2))
  ]).then(rsl => {
    res.success({msg: '发送成功'});
  }).catch(err => {
    res.failure('发送失败');
  })
})

router.get('/unreadmsg', (req, res) => {
  const receiveId = req.query.receiveId;
  const sql = 'select count(id) as count from secret_message where type=1 and status = 0 and userId=' + receiveId;
  mysqlUtil.query(sql)
  .then(rsl => {
    res.success(rsl[0])
  })
  .catch(err => {
    errHandler(err);
    res.failure('获取未读消息失败');
  })
})

router.get('/messagelist', (req, res) => {
  res.failure('待续...')
})

router.get('/caht', (req, res) => {
  const start = req.query.start || 0;
  const count = req.query.count || 5;
  const data = {
    start: Number.parseInt(start),
    count: Number.parseInt(count)
  };
  const sql = 'select * from secret_message where friendId=' + req.query.friendId + ' and userId=' + req.query.userId + ' order by time desc limit ' + start + ',' + count;
  mysqlUtil.query(sql)
  .then(rsl => {
    data.data = rsl;
    const sql = 'select count(id) as total from secret_message where userId=' + query.userId + ' and friendId=' + query.friendId;
    return mysqlUtil.query(sql);
  })
  .then(rsl => {
    data.total = rsl[0].total;
    res.success(data);
  })
  .catch(err => {
    errHandler(err);
    res.failure('返回聊天信息失败');
  })
})

router.get('/readAll', (req, res) => {
  const sql = 'update secret_message set status=1 where status=0 and type=1 and userId=' + query.userId;
  mysqlUtil.query(sql)
  .then(rsl => {
    res.success({ msg: '设置所有消息已读成功' });
  })
  .catch(err => {
    res.failure('设置所有消息已读失败')
  })
})

router.get('/getwords', (req, res) => {
  const page = query.page || 1;
  const pageCount = query.pageCount || 20;
  const limitStart = (page - 1) * pageCount;
  const data = {
    page: Number.parseInt(page),
    pageCount: Number.parseInt(pageCount),
  }
  const sql = 'select c.id, c.userId, c.time, c.reply, c.content, c.replyContent, c.replyUserId, c.targetName, users.name as name, imageUrl from '
            + '((select b.id, b.userId, b.time, b.reply, b.content, b.replyContent, b.replyUserId, users.name as targetName from '
            + '(select a.userId, a.id, a.reply, a.time, a.content as content, words.content as replyContent, words.userId as replyUserId from words as a left join words on a.reply=words.id) as b '
            + 'left join users on b.replyUserId=users.id)) as c inner join users on c.userId=users.id order by time desc limit ' + limitStart + ', ' + pageCount;
  mysqlUtil.query(sql)
  .then(rsl => {
    data.data = rsl;
    const sql = 'select count(id) as total from words';
    return mysqlUtil.query(sql);
  })
  .then(rsl => {
    data.total = rsl[0].total;
    res.sucess(data);
  })
  .catch('返回聊天信息失败');
})

router.post('/leaveword', (req, res) => {
  const sqlData = dataUtil.handleData(req.body);
  const sql = 'insert into words set ' + sqlData;
  mysqlUtil.query(sql)
  .then(rsl => {
    res.success({ msg: "留言成功" });
  })
  .catch(err => {
    errHandler(err);
    res.failure('留言失败');
  })
})

router.get('/readreply', (req, res) => {
  res.failure('未开放');
})

router.get('/comments', (req, res) => {
  const page = req.query.page || 1;
  const pageCount = req.query.pageCount || 20;
  const limitStart = (page - 1) * pageCount;
  const data = {
    page: Number.parseInt(page),
    pageCount: Number.parseInt(pageCount),
  }
  const sql = `select comment.id, blogId, userId, content, time, floor, users.name as username, imageUrl from comment
              inner join users
              on userId=users.id and blogId=` + req.query.blogId + `
              order by time desc limit ` + limitStart + `,` + pageCount;
  mysqlUtil.query(sql)
  .then(rsl => {
    data.data = rsl;
    const sql = 'select count(id) as total from comment where blogId=' + req.query.blogId;
    return mysqlUtil.query(sql)
  })
  .then(rsl => {
    data.total = rsl[0].total;
    res.success(data);
  })
  .catch(err => {
    res.failure('查看评论失败');
  })
})

router.get('/follow', (req, res) => {
  const sql = 'select id from followed where blogId=' + req.query.blogId + ' and userId=' + req.query.userId;
  mysqlUtil.query(sql)
  .then(rsl => {
    if (rsl.length) {
      res.failure('已经收藏');
    } else {
      const sql = 'insert into followed (blogId, userId) values(' + req.query.blogId + ',' + req.query.userId + ')';
      mysqlUtil.query(sql)
      .then(field => {
        const data = {
          id: field.insertId,
          msg: '收藏成功'
        }
        res.success(data)
      })
      .catch(err => {
        errHandler(err);
        res.failure('收藏失败');
      })
    }
  })
  .catch(err => {
    errHandler(err);
    res.failure('收藏失败');
  })
})

router.get('/unfollow', (req, res) => {
  const sql = 'delete from followed where blogId=' + query.blogId + ' and userId=' + query.userId;
  mysqlUtil.query(sql)
  .then(rsl => {
    res.success({ msg: "取消收藏成功" });
  })
  .catch(err => {
    errHandler(err);
    res.failure('取消收藏失败');
  })
})

router.get('/followlist', (req, res) => {
  const page = query.page || 1;
  const pageCount = query.pageCount || 20;
  const limitStart = (page - 1) * pageCount;
  const data = {
    page: Number.parseInt(page),
    pageCount: Number.parseInt(pageCount)
  }
  const sql = `select a.id, a.userId, a.blogId, title, clickNumber, commentNumber from
              (select followed.id as id, followed.userId, blogId, title, clickNumber from followed, article where blogId=article.id and followed.userId=` + query.userId + `)
              as a left join (select count(id) as commentNumber, blogId from comment group by blogId) as b on b.blogId=a.blogId limit ` + limitStart + `, ` + pageCount;
  mysqlUtil.query(sql)
  .then(rsl => {
    data.data = rsl;
    const sql = 'select count(id) as total from followed where followed.userId=' + req.query.userId;
    return mysqlUtil.query(sql);
  })
  .then(rsl => {
    data.total = rsl[0].total;
    res.success(data);
  })
  .catch(err => {
    errHandler(err);
    res.failure('获取收藏列表失败');
  })
})

module.exports = router
