# Hover I18n Hint - 国际化提示

## 功能介绍

这是一个 VSCode 插件，能在代码编辑器中悬停在国际化 key（如 l0359）上时显示对应的中文文案，提高开发效率。

### 主要特性

- ✅ **悬停提示**：鼠标悬停在国际化 key 上时显示对应的中文文案
- ✅ **智能识别**：支持多种格式的国际化 key（l0359, L0359, 'l0359', "l0359", {l0359}）
- ✅ **多文件支持**：自动查找并加载项目中的国际化资源文件
- ✅ **多格式支持**：支持多种格式的国际化资源文件，包括常见的IIFE格式
- ✅ **绝对路径支持**：可以使用绝对路径直接指向资源文件
- ✅ **实时更新**：监听资源文件变更，自动更新提示内容
- ✅ **高性能**：针对大文件做了性能优化，不影响编辑器体验
- ✅ **可配置**：支持自定义资源文件路径、key 格式等
- ✅ **诊断工具**：内置诊断命令，帮助排查和解决资源加载问题
- ✅ **实时监听**：自动监听国际化资源文件变化，无需重启即可更新提示

## 安装方法

### 从 VS Code 扩展商店安装

1. 打开 VS Code
2. 点击左侧扩展图标
3. 搜索 "Hover I18n Hint"
4. 点击 "安装" 按钮

### 从 OpenVSX 安装

1. 在支持 OpenVSX 的编辑器中（如 VS Code、Theia、Codium 等）
2. 打开扩展面板
3. 搜索 "Hover I18n Hint" 或 "hover-i18n-hint"
4. 点击安装

或者访问：https://open-vsx.org/extension/HoverI18nHint/hover-i18n-hint

### 从 VSIX 文件安装

1. 下载最新的 `.vsix` 文件
2. 在 VS Code 中，选择 "扩展" -> "从 VSIX 安装..."
3. 选择下载的 `.vsix` 文件

## 使用方法

插件会自动在工作区中查找国际化资源文件（默认路径：`app/iframe/locale/zh.js`）。如果找到了资源文件，则会自动加载并在编辑器中启用悬停提示功能。

**交互方式**：将鼠标悬停在国际化 key 上，会显示一个带有中文文案的提示框。

### 支持的文件类型

- JavaScript (.js)
- TypeScript (.ts)
- React (.jsx, .tsx)
- Vue (.vue)
- HTML (.html)
- JSON (.json)

### 支持的 key 格式

- 直接使用：`l0359`, `L0359`
- 字符串形式：`'l0359'`, `"l0359"`
- 对象访问形式：`R['l0359']`, `R["l0359"]`, `R.l0359`
- window访问形式：`window.LanData.R['l0359']`, `LanData.R['l0359']`
- 函数调用形式：`t('l0359')`, `i18n.t('l0359')`
- JSX 中使用：`{l0359}`
- 对象属性：`strings.l0359`

### 支持的资源文件格式

插件支持多种常见的国际化资源文件格式：

1. **IIFE格式（立即执行函数）**
   ```js
   (function(window){
       var zhCn={
           name:'zhCn',
           R:{
               'l0001':'搜索',
               'l0025': '病案等级',
               // ...
           }
       }
       window.LanData = zhCn;
   })(this)
   ```

2. **导出对象格式**
   ```js
   export default {
     l0001: '搜索',
     l0002: '保存',
     // ...
   }
   ```

3. **CommonJS格式**
   ```js
   module.exports = {
     l0001: '搜索',
     l0002: '保存',
     // ...
   }
   ```

4. **常量对象格式**
   ```js
   const R = {
     l0001: '搜索',
     l0002: '保存',
     // ...
   }
   ```

## 配置选项

可以在 VS Code 的设置中配置以下选项：

| 配置项                      | 说明                         | 默认值                      |
|----------------------------|-----------------------------|-----------------------------|
| `hoverI18nHint.i18nFilePath` | 国际化资源文件路径（相对于工作区或绝对路径） | `app/iframe/locale/zh.js`  |
| `hoverI18nHint.enabled`     | 启用/禁用国际化提示          | `true`                      |
| `hoverI18nHint.showInlineText` | 是否在国际化标记后直接显示对应文案 | `true`                |

## 命令

可以通过命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）执行以下命令：

- `HoverI18nHint: 刷新国际化资源`：手动刷新国际化资源并更新提示
- `HoverI18nHint: 切换国际化提示`：启用/禁用提示功能

## 常见问题

### 没有显示提示

1. 检查是否正确安装并启用了插件
2. 确认当前文件类型是否受支持
3. 尝试将鼠标精确地悬停在国际化key上（必须直接悬停在key文本上）
4. 尝试手动指定国际化资源文件的绝对路径
5. 执行 `HoverI18nHint: 刷新国际化资源` 命令
6. 查看VSCode输出面板中的插件日志

### 识别到的 key 数量不正确

1. 检查 zh.js 文件格式是否符合插件支持的格式
2. 查看输出面板中的日志，确认资源文件是否被正确加载
3. 可能需要调整正则表达式以匹配项目中使用的特定key格式

### 更新zh.js后提示没有更新

当你更新zh.js文件后，插件会自动检测变化并重新加载资源。如果没有自动更新，你可以：

1. 等待几秒钟，文件系统监听器有时会有短暂延迟
2. 执行 `HoverI18nHint: 刷新国际化资源` 命令手动刷新
3. 确保修改的zh.js文件是插件正在使用的那个（可以查看输出面板中的日志确认）

## 开发者指南

如果你想参与这个项目的开发或自行构建插件，以下是相关命令和指南。

### 开发环境搭建

1. 克隆仓库
   ```bash
   git clone https://github.com/hujiayu-123/Hover-i8n-Hint.git
   cd Hover-i8n-Hint
   ```

2. 安装依赖
   ```bash
   npm install
   ```

### 编译命令

开发过程中，你可以使用以下命令编译代码：

```bash
# 编译一次
npm run compile

# 监听文件变化并自动编译
npm run watch
```

### 调试

在 VS Code 中打开项目，按下 F5 键启动调试会话，这将在新的扩展开发主机窗口中运行插件。

### 测试

运行测试用例：

```bash
npm run test
```

### 打包和发布

1. 打包 VSIX 文件

   首先确保版本号已更新（package.json 中的 version 字段）。

   ```bash
   # 安装 vsce 工具（如果尚未安装）
   npm install -g @vscode/vsce

   # 编译项目
   npm run compile

   # 打包
   vsce package
   ```

   这会在当前目录生成一个 `.vsix` 文件。

2. 发布到 VS Code 扩展市场

   ```bash
   # 登录（首次使用需要创建个人访问令牌）
   vsce login HoverI18nHint

   # 发布
   vsce publish
   ```

   或者直接通过版本号发布：

   ```bash
   # 发布补丁版本（增加第三位版本号）
   vsce publish patch

   # 发布次要版本（增加第二位版本号）
   vsce publish minor

   # 发布主要版本（增加第一位版本号）
   vsce publish major
   ```

3. 发布到 OpenVSX

   OpenVSX 是开源的扩展注册表，支持多种编辑器（VS Code、Theia、Codium 等）。

   ```bash
   # 安装 ovsx 工具（如果尚未安装）
   npm install -g ovsx

   # 首次发布需要创建 namespace（只需要执行一次）
   ovsx create-namespace HoverI18nHint -p YOUR_ACCESS_TOKEN

   # 发布到 OpenVSX
   ovsx publish hover-i18n-hint-VERSION.vsix -p YOUR_ACCESS_TOKEN
   ```

   或者直接发布当前目录中的 VSIX 文件：

   ```bash
   # 发布最新的 VSIX 文件
   ovsx publish -p YOUR_ACCESS_TOKEN
   ```

   **获取 OpenVSX Access Token：**
   1. 访问 https://open-vsx.org/
   2. 注册账号并登录
   3. 在设置中生成 Access Token
   4. 将 `YOUR_ACCESS_TOKEN` 替换为实际的 token

   **扩展链接：**
    - OpenVSX: https://open-vsx.org/extension/HoverI18nHint/hover-i18n-hint


## 反馈与贡献

欢迎提交问题和建议，或者参与项目开发：

- [提交 Issue](https://github.com/hujiayu-123/Hover-i8n-Hint/issues)
- [贡献代码](https://github.com/hujiayu-123/Hover-i8n-Hint/pulls)

## 许可证

[MIT](LICENSE) 