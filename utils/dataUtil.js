
//  如果是数字,null或者undefined就不做任何处理，如果是字符串就在两边加上 ' 符号
const handleValue = value => typeof value === 'number' || value === null || value === undefined ? value : "'" + value + "'";

//  处理post得来的数据：取键名、键值和问号用来组成sql语句
exports.handleData =  (data, type) => {
  let target = null;
  if(typeof data === 'string'){
    try {
      target = JSON.parse(data);
    } catch (e) {
      console.log('请效验数据格式');
      return '';
    }
  }else if(typeof data === 'object'){
    target = data;
  }
  let keyStr = '';
  for(let key in target){
    if(key === 'id'){
      continue;
    }
    keyStr += ',' + key + '=' + handleValue(target[key]);
  }
  keyStr = keyStr.slice(1);
  return keyStr
}
