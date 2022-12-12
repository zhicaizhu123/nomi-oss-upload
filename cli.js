#!/usr/bin/env node
const init = require('.')
const pkg = require('./package.json')
const { Command } = require('commander');
const program = new Command();

const cliName = Object.keys(pkg.bin)[0]

program
  .name(cliName)
  .description('基于 ali-oss 的文件上传CLI')
  .version(pkg.version)
  .option('-a, --api <string>', '获取oss上传文件配置接口url')
  .option('-f, --file <string>', '待上传本地文件路径或目录路径')
  .option('-s, --saveDir <string>', '上传文件时保存的oss目录')
  .option('-c, --configFile <string>', '本地配置文件路径，文件中包含要上传的远端url列表，文件为 .json 格式')
  .option('-u, --url <string>', '待上传的远端url')
  .option('-r, --random', '是否随机生成文件名称')
  .option('-d, --debug', '是否开启调试模式')

program.parse(process.argv)

init(program.opts())