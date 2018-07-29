const mysql = require("mysql");
const config = require("../config");
const pool = mysql.createPool(config.mysql)

exports.query = sql => new Promise((resolve, reject) => {
  pool.getConnection((err, con) => {
    if (err) {

    } else {
      sql = sql.replace(/\n/g, ' ');
      con.query(sql, (err, rsl) => {
        con.release()
        if (err) {
          reject(err);
        } else {
          resolve(rsl);
        }
      })
    }
  })
})
