# nomi-oss-upload
基于 [ali-oss](https://www.npmjs.com/package/ali-oss) 上传的脚手架工具。

## 安装
```bash
npm i -g nomi-oss-upload
```

## 使用
```bash
# 上传
nomi-oss-upload [options]

# 帮助文档
nomi-oss-upload --help
```

## options 参数说明
#### config
> CLI 上传配置文件
> 
> 默认值：`nomi.upload.config.js`

使用方式：`-c`, `--config`
```bash
nomi-oss-upload -c upload.config.js
```

配置文件参数：

| 参数 | 描述 | 类型 | 默认值 |
| -----| ---- | ---- | ---- |
| ossApiConfig | 通过接口动态获取配置 | 参考下面的 ossApiConfig 配置 | - |
| ossConfig | 固定配置 | 需要符合[ali-oss 配置](https://www.npmjs.com/package/ali-oss#ossoptions) |  - |
| saveDir | 上传文件时保存的oss目录 | string |  - |
| random | 是否生成随机文件名称 | boolean |  - |
| debug | 是否开启调试模式 | boolean |  - |

ossApiConfig 配置：
| 参数 | 描述 | 类型 | 默认值 |
| -----| ---- | ---- | ---- |
| url | 通过接口动态获取配置 | 单元格 | - |
| transferResponse | 固定配置 | 单元格 |  - |



配置文件示例：
```javascript
module.exports = {
    // 从接口动态获取配置
    ossApiConfig: {
      // 动态获取oss配置的接口地址
      url: "https://xxx.xx.xxx",
      // 转化接口响应数据，需要符合 ali-oss 初始化实例的参数字段 https://www.npmjs.com/package/ali-oss#ossoptions
      transferResponse: (data) => {
        const { securityToken: stsToken, accessKeyId, accessKeySecret, region, bucketName: bucket, endpoint, expiration } = data.data
        const res = {
          accessKeyId,
          region,
          bucket,
          accessKeySecret,
          endpoint,
          stsToken,
        }
        if (expiration && typeof expiration === 'string') {
          res.expiration = new Date(expiration).getTime()
        }
        return res
      }
    },
    // 本地固定配置
    ossConfig: {
      region: "",
      bucket: "",
      endpoint: "",
      accessKeyId: "",
      accessKeySecret: "",
      stsToken: ""
    },
    // 上传文件时保存的oss目录
    saveDir: 'nomi',
    // 随机生成文件名称
    random: true,
    // 开启调试模式
    debug: false,
}
```

⚠️注意：
- CLI会优先取配置文件定义的字段，如果配置文件没有的情况下，才会取命令行参数字段
- 优先取 `ossApiConfig` 配置， 如果没有配置才会取 `ossConfig` 配置
- 无论是动态获取的配置还是固定的配置都需要符合 [ali-oss 初始化参数](https://www.npmjs.com/package/ali-oss#ossoptions)

#### api
> 用于获取oss上传文件配置接口url，例如：https://example.com/api/oss/aliyun/get-oss-config

使用方式：`-a`, `--api`
```bash
nomi-oss-upload --api https://example.com/api/oss/aliyun/get-oss-config
```

url响应结构：
```typescript
interface Res {
    accessKeyId: string
    bucket: string
    accessKeySecret: string
    endpoint: string
    stsToken: string
    region?: string
    expiration?: number
}
```

#### file
> 待上传本地文件路径或目录路径（相对路径）

使用方式：`-f`, `--file`
```bash
nomi-oss-upload --file path/to/example.json
```

#### saveDir
> 上传文件时保存的oss目录

使用方式：`-s`, `--saveDir`
```bash
nomi-oss-upload --saveDir testDir
```
⚠️注意：目录后不需要`/`，如果是多层级目录可以写成`parent/child`格式。

#### urlFile
> 本地配置文件路径（相对路径），文件中包含要上传的远端url列表，文件格式为 `json`

json文件内容格式如下：
```json
[
    "https://example.com/test.png",
    "https://example.com/test.jpg",
    "https://example.com/test.docx",
    "https://example.com/test.ppt",
    "https://example.com/test.json"
    // ...
]
```

使用方式：`-uf`, `--urlFile`
```bash
nomi-oss-upload --urlFile path/to/example.config.json
```

#### url
> 待上传的远端url（完整的有效路径）

使用方式：`-u`, `--url`
```bash
nomi-oss-upload --url https://example.com/example.jpg
```

#### random
> 是否随机生成文件名称

使用方式：`-r`, `--random`
```bash
nomi-oss-upload --random
```

#### debug
> 是否开启调试模式

使用方式：`-d`, `--debug`
```bash
nomi-oss-upload --debug
```