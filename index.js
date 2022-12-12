const { resolve, extname, basename } = require('path')
const { pathExistsSync, statSync, writeFileSync, readJSONSync } = require('fs-extra')
const OSS = require('ali-oss')
const axios = require('axios')
const colors = require('colors')
const fg = require('fast-glob');
const ora = require('ora')
const inquirer = require('inquirer')
const spinner = ora('loading')

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

function getAbsolutePath(filePath) {
  return resolve(process.cwd(), filePath)
}

/**
 * 获取oss上传签名和其他信息
 * @param {*} api 获取oss配置的接口连接
 * @returns 
 */
async function getStsConfig(api) {
  spinner.start('fetching oss config information...')
  const res = await axios.get(api)
  spinner.succeed('fetch oss config success')
  const {
    expiration = Date.now() + 30 * 60 * 1000,
    accessKeyId = '',
    region = '',
    bucketName = '',
    accessKeySecret = '',
    endpoint = '',
    securityToken = '',
  } = res.data.data || res.data || {}

  return {
    expiration,
    accessKeyId,
    region,
    bucket: bucketName,
    accessKeySecret,
    endpoint,
    stsToken: securityToken,
    refreshSTSToken,
    refreshSTSTokenInterval: 3 * 60 * 1000,
  }
}

/**
 * 刷新oss token 信息
 * @returns 
 */
async function refreshSTSToken() {
  const { region, bucket, accessKeyId, accessKeySecret, stsToken, endpoint } = await getStsConfig()
  return {
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    stsToken,
    endpoint,
  }
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
  const remoteUrl = options.url
  if (remoteUrl && isLink(remoteUrl)) {
    // 指定单个文件
    const data = await getUrlStream(remoteUrl)
    return [{
      name: generateRemoteUrlFileName(remoteUrl, options),
      file: data
    }]
  } else {
    // 上传配置文件中的所有文件
    const configFile = getAbsolutePath(options.configFile)
    if (pathExistsSync(configFile)) {
      const stat = statSync(configFile)
      if (stat.isFile()) {
        const config = readJSONSync(configFile)
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
  if (options.url || options.configFile) {
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

function getTypeOptions() {
  return [
    {
      name: '本地文件上传',
      value: 'local'
    },
    {
      name: '远端文件链接上传',
      value: 'remote'
    },
  ]
}

function getRemoteTypeOptions() {
  return [
    {
      name: '远端文件链接',
      value: 'url'
    },
    {
      name: '配置文件',
      value: 'config'
    },
  ]
}

/**
 * 校验本地文件目录是否有效
 * @param {*} file 
 * @returns 
 */
function validateFile(file) {
  return file && pathExistsSync(getAbsolutePath(file))
}

/**
 * 校验远端文件链接或配置文件是否有效
 * @param {*} remoteUrl 
 * @param {*} configFile 
 * @returns 
 */
function validateRemote(remoteUrl, configFile) {
  if (remoteUrl) return true
  if (configFile) {
    const filePath = getAbsolutePath(configFile)
    if (!pathExistsSync(filePath)) return false
    const stat = statSync(filePath)
    if (stat.isFile()) {
      // 必须为 json 文件
      return extname(filePath) === '.json'
    }
  }
  return false
}

function isLink(url) {
  return /((https|http|ftp|rtsp|mms)?:\/\/)(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?(([0-9]{1,3}\.){3}[0-9]{1,3}|([0-9a-z_!~*'()-]+\.)*([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\.[a-z]{2,6})(:[0-9]{1,4})?((\/?)|(\/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+\/?)/.test(url)
}

async function promptAPI(api) {
  const promptOptions = []
  if (!api || !isLink(api)) {
    promptOptions.push({
      type: 'input',
      name: 'api',
      message: '请输入获取oss配置信息接口连接',
    })
  }
  const answers = await inquirer.prompt(promptOptions);
  return answers
}

async function promptDir(saveDir) {
  const promptOptions = []
  if (!saveDir) {
    promptOptions.push({
      type: 'input',
      name: 'saveDir',
      message: '请输入文件保存的目录，如果不存在则会自动创建',
      default: 'nomi'
    })
  }
  const answers = await inquirer.prompt(promptOptions);
  return answers
}

async function promptFileType(file, url, configFile) {
  const promptOptions = []
  const hasLocalFile = validateFile(file)
  const hasRemote = validateRemote(url, configFile)
  if (!hasLocalFile && !hasRemote) {
    promptOptions.push({
      type: 'list',
      name: 'type',
      message: '请选择上传方式',
      choices: getTypeOptions(),
    })
  }
  const answers = await inquirer.prompt(promptOptions);
  return answers
}

async function promptFileInfo(type) {
  const promptOptions = []
  if (type === 'local') {
    // 填写本地文件
    promptOptions.push({
      type: 'input',
      name: 'file',
      message: '请输入要上传的文件或则目录的相对路径',
      default: '.',
      validate: function (value) {
        const done = this.async();
        setTimeout(() => {
          if (!pathExistsSync(getAbsolutePath(value))) {
            done('请输入正确的路径');
            return;
          }
          done(null, true);
        }, 0);
      },
    })
  } else if (type === 'remote') {
    // 填写远端文件
    promptOptions.push({
      type: 'list',
      name: 'remoteType',
      message: '请选择上传远端文件的方式',
      choices: getRemoteTypeOptions(),
    })
  }
  const answers = await inquirer.prompt(promptOptions);
  return answers
}

async function promptRemoteInfo(remoteType) {
  const promptOptions = []
  if (remoteType === 'url') {
    promptOptions.push({
      type: 'input',
      name: 'url',
      message: '请输入要上传的远端文件链接',
      validate: function (value) {
        const done = this.async();
        setTimeout(() => {
          if (!value || !isLink(value)) {
            done('请输入有效的远端文件链接');
            return;
          }
          done(null, true);
        }, 0);
      },
    })
  } else if (remoteType === 'config') {
    promptOptions.push({
      type: 'input',
      name: 'configFile',
      message: '请输入要包含远端链接列表的.json配置文件相对路径',
      validate: function (value) {
        const done = this.async();
        setTimeout(() => {
          if (!value || !pathExistsSync(getAbsolutePath(value))) {
            done('请输入有效的配置文件相对路径');
            return;
          }
          done(null, true);
        }, 0);
      },
    })
  }
  const answers = await inquirer.prompt(promptOptions);
  return answers
}

async function promptRandom(random) {
  const promptOptions = []
  if (!random) {
    promptOptions.push({
      type: 'confirm',
      name: 'random',
      message: '是否生成随机文件名称',
      default: true
    })
  }
  const answers = await inquirer.prompt(promptOptions);
  return answers
}

/**
 * 初始化
 * @param {*} api 获取 oss 配置信息接口
 * @param {*} options 参数配置
 */
async function init(options) {
  const config = { ...options }
  const apiAnswers = await promptAPI(config.api)
  const typeAnswers = await promptFileType(config.file, config.url, config.configFile)
  const fileInfoAnswers = await promptFileInfo(typeAnswers.type)
  const remoteInfoAnswers = await promptRemoteInfo(fileInfoAnswers.remoteType)
  const dirAnswers = await promptDir(config.saveDir)
  const randomAnswers = await promptRandom(config.random)
  Object.assign(config, apiAnswers, dirAnswers, typeAnswers, fileInfoAnswers, remoteInfoAnswers, randomAnswers);
  options.debug && console.log('config', config);
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
    const config = await getStsConfig(options.api)
    const client = new OSS(config)
    const promises = uploadFileList.map(item => {
      return uploadSingleFile(client, item)
    })
    spinner.start('uploading files....')
    const list = await Promise.all(promises)
    spinner.succeed('uploaded success, more upload info please see ' + colors.blue(process.cwd() + '/uploaded_list.json'))
    writeFileSync('./uploaded_list.json', JSON.stringify(list, null, 4))
  } catch(err) {
    console.log();
    console.log(colors.red(err.message));
    spinner.stop();
  }
}

module.exports = init