# nomi-oss-upload
基于 `ali-oss` 上传的脚手架工具。

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
### api
> 用于获取oss上传文件配置接口url，例如：https://example.com/api/oss/aliyun/get-oss-config

使用方式：`-a`, `--api`
```bash
nomi-oss-upload -a https://example.com/api/oss/aliyun/get-oss-config
```

url响应结构：
```typescript
interface Res {
    expiration: number
    accessKeyId: string
    region: string
    bucketName: string
    accessKeySecret: string
    endpoint: string
    securityToken: string
}
```

### file
> 待上传本地文件路径或目录路径（相对路径）

使用方式：`-f`, `--file`
```bash
nomi-oss-upload -f path/to/example.json
```

### saveDir
> 上传文件时保存的oss目录

使用方式：`-s`, `--saveDir`
```bash
nomi-oss-upload -s testDir
```
⚠️注意：目录后不需要`/`，如果是多层级目录可以写成`parent/child`格式。

### configFile
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

使用方式：`-c`, `--configFile`
```bash
nomi-oss-upload -c path/to/example.config.json
```

### url
> 待上传的远端url（完整的有效路径）

使用方式：`-u`, `--url`
```bash
nomi-oss-upload -c https://example.com/example.jpg
```

### random
> 是否随机生成文件名称

使用方式：`-r`, `--random`
```bash
nomi-oss-upload -r
```

### debug
> 是否开启调试模式

使用方式：`-d`, `--debug`
```bash
nomi-oss-upload -d
```