const OSS = require('ali-oss')
const axios = require('axios')

/**
 * 获取oss上传配置信息
 *
 * @param {*} api 获取oss配置的接口连接
 * @param {*} transfer 处理响应数据
 * @return {*} 
 */
async function getOssConfigByApi(api, transfer) {
  const res = await axios.get(api)
  let data = res.data.data || res.data || {}
  if (typeof transfer === 'function') {
    data = transfer(res.data)
    console.log('data', data)
  }
  if (data.expiration) {
    data.refreshSTSTokenInterval = new Date(data.expiration).getTime() - Date.now() - 10
    data.refreshSTSToken = (api, transfer) => refreshSTSToken(api, transfer)
  }
  return data
}

/**
 * 刷新oss token 信息
 * @returns 
 */
async function refreshSTSToken(api, transfer) {
  const { refreshSTSTokenInterval, refreshSTSToken, ...rest } = await getOssConfigByApi(api, transfer)
  return rest
}

async function getOssConfig({ api, transfer, config }) {
  let ossConfig = {}
  if (api) {
    ossConfig = await getOssConfigByApi(api, transfer)
  } else if (config) {
    ossConfig = config
  }
  return ossConfig
}

async function createOssClient({ api, transfer, config }) {
  const data = await getOssConfig({ api, transfer, config })
  return new OSS(data)
}

async function ossUpload(client, uploadFileList) {
  const promises = uploadFileList.map(item => {
    return uploadSingleFile(client, item)
  })
  const list = await Promise.all(promises)
  return list
} 


/**
 * 上传单个文件
 * @param {*} client oss 实例
 * @param {*} info 上传文件信息
 * @returns 
 */
async function uploadSingleFile(client, info) {
  const data = await client.put(info.name, info.file)
  return {
    name: info.name,
    url: data.url,
  }
}

exports.createOssClient = createOssClient
exports.ossUpload = ossUpload