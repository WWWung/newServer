exports.getSessionIdfromCookie = function (cookie) {
  if (!cookie) {
    return false;
  }
  var sessionId = null;
  let cookieArr = cookie.split(';');
  for (let i=0; i<cookieArr.length; i++){
    let arr = cookieArr[i].split('=');
    if (arr.length > 1 && arr[0].trim() === 'sessionId') {
      sessionId = arr[1];
      break;
    }
  }
  return sessionId;
}
