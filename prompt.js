const { extname } = require('path')
const { pathExistsSync, statSync } = require('fs-extra')
const inquirer = require('inquirer')
const { isLink, getAbsolutePath } = require('./utils')


/**
 * 获取支持上传的方式
 *
 * @return {*} 
 */
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


/**
 * 支持上传源文件类型
 *
 * @return {*} 
 */
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
 * @returns 
 */
function validateRemote(remoteUrl) {
  if (!remoteUrl) return false
  return isLink(remoteUrl)
}


/**
 * 校验配置文件是否有效
 *
 * @param {*} configFile
 * @return {*} 
 */
function validateConfigFile(configFile) {
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


/**
 * 获取上传配置信息方式
 *
 * @param {*} configType
 */
async function promptGetOssConfigType(configType) {
  
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
  const hasRemote = validateRemote(url)
  const hasConfigFile = validateConfigFile(configFile)
  if (!hasLocalFile && !hasRemote && !hasConfigFile) {
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
      name: 'urlFile',
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

exports.promptAPI = promptAPI
exports.promptDir = promptDir
exports.promptFileType = promptFileType
exports.promptFileInfo = promptFileInfo
exports.promptRemoteInfo = promptRemoteInfo
exports.promptRemoteInfo = promptRemoteInfo
exports.promptRandom = promptRandom