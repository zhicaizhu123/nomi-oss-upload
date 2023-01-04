const { resolve, extname, basename } = require('path')
const { pathExistsSync, statSync, writeFileSync, readJSONSync } = require('fs-extra')
const colors = require('colors')
const fg = require('fast-glob');
const ora = require('ora')
const spinner = ora('loading')
const { getUrlStream, getAbsolutePath, isLink, getRandomString } = require('./utils')
const { createOssClient, ossUpload } = require('./oss')
const { promptAPI, promptDir, promptFileType, promptFileInfo, promptRemoteInfo, promptRandom } = require('./prompt');

const DEFAULT_CONFIG_FILE = 'nomi.upload.config.js'
const DEFAULT_UPLOADED_FILE = 'nomi.uploaded.json'

function verbose(...args) {
  process.env.NOMI_UPLOAD_DEBUG && console.log(colors.blue('debug：'), ...args)
}

/**
 * 生成oss保存的文件路径
 * @param {*} filePath 文件路径
 * @param {*} dir 存储目录
 * @param {*} random 是否生成随机的文件名称
 * @returns 
 */
function generateName(filePath, dir, random) {
  const name = random ? `${getRandomString()}_${Date.now()}${extname(filePath)}` : basename(filePath)
  return `${dir}/${name}`
}

/**
 * 根据文件路径/目录路径获取所有需要上传的图片
 * @param {*} file 文件路径/目录路径，相对路径
 * @returns 
 */
function getFiles(file) {
  const filePath = getAbsolutePath(file)
  if (pathExistsSync(filePath)) {
    const stat = statSync(filePath)
    let files = []
    if (stat.isDirectory()) {
      const entries = fg.sync(['**'], { onlyFiles: true, cwd: filePath, ignore: ['**/node_modules/**'] });
      files = entries.map(file => resolve(filePath, file))
    } else {
      files = [filePath]
    }
    return files
  } else {
    console.log(colors.red('输入的文件或目录路径不正确'))
    process.exit(1)
  }
}


/**
 * 获取要上传的文件信息
 * @param {*} options 命令参数
 * @returns 
 */
function getFileInfoList(options) {
  const files = getFiles(options.file || '.')
  const savedFileList = files.map(file => {
    const name = generateName(file, options.saveDir, options.random)
    return {
      name,
      file,
    }
  })
  return savedFileList
}


/**
 * 生成远端文件的文件名
 *
 * @param {*} url
 * @param {*} options
 * @return {*} 
 */
function generateRemoteUrlFileName(url, options) {
  const { saveDir, random } = options
  if (saveDir) {
    return generateName(url, saveDir, random)
  }
  return url.replace(/^http(s?):\/\/[^/]+/g, "")
}

/**
 * 将线上地址内容转化成符合oss上传的信息
 * @param {*} options 命令参数
 * @returns 
 */
async function getRemoteUrlInfoList(options) {
  const url = options.url
  if (url && isLink(url)) {
    // 指定单个文件
    const data = await getUrlStream(url)
    return [{
      name: generateRemoteUrlFileName(url, options),
      file: data
    }]
  } else {
    // 上传配置文件中的所有文件
    const urlFile = getAbsolutePath(options.urlFile)
    if (pathExistsSync(urlFile)) {
      const stat = statSync(urlFile)
      if (stat.isFile()) {
        const config = readJSONSync(urlFile)
        const promises = config.map(item => {
          return getUrlStream(item)
        })
        const data = await Promise.all(promises)
        return data.map((item, index) => ({
          name: generateRemoteUrlFileName(config[index], options.saveDir),
          file: item,
        }))
      }
    } else {
      console.log(colors.red('上传文件列表不存在'))
      process.exit(1)
    }
  }
  
}

/**
 * 解析待上传文件信息
 * @param {*} options 命令参数
 * @returns 
 */
async function getUploadFileList(options) {
  let fileList = []
  if (options.url || options.urlFile) {
    spinner.start('parsing remote file url...')
    // 根据配置文件上传
    fileList = await getRemoteUrlInfoList(options)
    spinner.succeed('parsed remote file url success')
  } else {
    // 根据文件/目录上传
    fileList = getFileInfoList(options)
  }
  return fileList
}

function setOptionsByConfigFile(options) {
  const customConfigFile = getAbsolutePath(options.config || DEFAULT_CONFIG_FILE)
  options.ossApiConfig = {}
  options.ossConfig = void 0
  if (pathExistsSync(customConfigFile)) {
    const defineConfig = require(getAbsolutePath(customConfigFile))
    let data
    if (typeof defineConfig === 'function') {
      data = defineConfig()
    } else {
      data = defineConfig
    }
    const { ossApiConfig, ossConfig, saveDir, random, debug } = data || {}
    options.ossApiConfig = ossApiConfig || {}
    options.ossConfig = ossConfig
    if (saveDir) {
      options.saveDir = saveDir
    }
    if (random) {
      options.random = !!random
    }
    if (debug) {
      options.random = !!debug
    }
  }
  return options
}

/**
 * 初始化
 * @param {*} api 获取 oss 配置信息接口
 * @param {*} options 参数配置
 */
async function init(options) {
  const config = { ...setOptionsByConfigFile(options) }
  if (!!options.debug) {
    process.env.NOMI_UPLOAD_DEBUG = true
  }
  const apiAnswers = await promptAPI(options.ossApiConfig.url || config.api)
  const typeAnswers = await promptFileType(config.file, config.url, config.urlFile)
  const fileInfoAnswers = await promptFileInfo(typeAnswers.type)
  const remoteInfoAnswers = await promptRemoteInfo(fileInfoAnswers.remoteType)
  const dirAnswers = await promptDir(config.saveDir)
  const randomAnswers = await promptRandom(config.random)
  Object.assign(config, apiAnswers, dirAnswers, typeAnswers, fileInfoAnswers, remoteInfoAnswers, randomAnswers);
  verbose('CLI config', config)
  upload(config);
}



/**
 * 上传
 * @param {*} options 命令行参数
 */
async function upload(options) {
  try {
    // 获取要上传的文件数据
    const uploadFileList = await getUploadFileList(options)

    spinner.start('init oss client....')
    const client = await createOssClient({
      api: options.ossApiConfig.url || config.api,
      transfer:  options.ossApiConfig.transferResponse,
      config: options.ossConfig
    })
    spinner.succeed('init oss client success ')

    spinner.start('uploading files....')
    const res = await ossUpload(client, uploadFileList)
    spinner.succeed('uploaded success, more upload info please see ' + colors.blue(process.cwd() + '/' + DEFAULT_UPLOADED_FILE))
    
    writeFileSync('./' + DEFAULT_UPLOADED_FILE, JSON.stringify(res, null, 4))
  } catch(err) {
    console.log();
    console.log(colors.red(err.message));
    spinner.stop();
  }
}

module.exports = init