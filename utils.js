const { resolve } = require('path')
const axios = require('axios')


/**
 * 判断是否为有效链接
 *
 * @param {*} url 线上地址
 * @return {*} 
 */
function isLink(url) {
  return /((https|http|ftp|rtsp|mms)?:\/\/)(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?(([0-9]{1,3}\.){3}[0-9]{1,3}|([0-9a-z_!~*'()-]+\.)*([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\.[a-z]{2,6})(:[0-9]{1,4})?((\/?)|(\/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+\/?)/.test(url)
}

/**
 * 获取绝对路径
 *
 * @param {*} filePath
 * @return {*} 
 */
function getAbsolutePath(filePath) {
  return resolve(process.cwd(), filePath)
}

/**
 * 获取线上地址内容的流信息
 * @param {*} url  线上地址
 * @returns 
 */
async function getUrlStream(url) {
  const res = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer'
  })
  return res.data
}

/**
 * 获取随机字符串
 * @param {} len 字符串长度
 * @returns 
 */
function getRandomString(len = 10) {
  // 生成随机名
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
  const maxPos = chars.length
  let pwd = ''
  for (let i = 0; i < len; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * maxPos))
  }
  return pwd
}


exports.isLink = isLink
exports.getAbsolutePath = getAbsolutePath
exports.getUrlStream = getUrlStream
exports.getRandomString = getRandomString

