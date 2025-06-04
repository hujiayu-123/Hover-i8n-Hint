# Hover I18n Hint - 国际化提示

## 功能介绍

这是一个 VSCode 插件，能在代码编辑器中悬停在国际化 key（如 l0359）上时显示对应的中文文案，提高开发效率。

### 主要特性

- ✅ **国际化 key 提示**：直接在 key 旁边显示对应的中文文案
- ✅ **智能识别**：支持多种格式的国际化 key（l0359, L0359, 'l0359', "l0359", {l0359}）
- ✅ **多文件支持**：自动查找并加载项目中的国际化资源文件
- ✅ **多格式支持**：支持多种格式的国际化资源文件，包括常见的IIFE格式
- ✅ **绝对路径支持**：可以使用绝对路径直接指向资源文件
- ✅ **实时更新**：监听资源文件变更，自动更新提示内容
- ✅ **高性能**：针对大文件做了性能优化，不影响编辑器体验
- ✅ **可配置**：支持自定义资源文件路径、key 格式等
- ✅ **诊断工具**：内置诊断命令，帮助排查和解决资源加载问题

## 安装方法

### 从 VS Code 扩展商店安装

1. 打开 VS Code
2. 点击左侧扩展图标
3. 搜索 "Hover I18n Hint"
4. 点击 "安装" 按钮

### 从 VSIX 文件安装

1. 下载最新的 `.vsix` 文件
2. 在 VS Code 中，选择 "扩展" -> "从 VSIX 安装..."
3. 选择下载的 `.vsix` 文件

## 使用方法

插件会自动在工作区中查找国际化资源文件（默认路径：`app/iframe/locale/zh.js`）。如果找到了资源文件，则会自动加载并在编辑器中显示国际化提示。

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
| `hoverI18nHint.localePath` | 国际化资源文件路径（相对于工作区或绝对路径） | `app/iframe/locale/zh.js`  |
| `hoverI18nHint.language`   | 默认语言                     | `zh`                        |
| `hoverI18nHint.keyPrefixes`| 支持的 key 前缀              | `["_t.R", "R", "LanData.R", "i18n.t"]` |
| `hoverI18nHint.autoDetect` | 自动检测国际化资源文件         | `true`                      |
| `hoverI18nHint.keyFormat`  | 支持的 key 正则表达式格式     | `["l\\d{4,}", "L\\d{4,}"]`  |
| `hoverI18nHint.maxFileSizeKB`| 处理文件的最大大小（KB）   | `100`                       |

## 命令

可以通过命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）执行以下命令：

- `Hover I18n Hint: 测试国际化提示`：测试插件是否正常工作
- `Hover I18n Hint: 刷新国际化提示`：手动刷新当前编辑器中的提示
- `Hover I18n Hint: 切换国际化提示`：启用/禁用提示功能
- `Hover I18n Hint: 诊断国际化资源加载问题`：帮助诊断和解决资源文件加载问题

## 常见问题

### 没有显示提示

1. 检查是否正确安装并启用了插件
2. 确认当前文件类型是否受支持
3. 执行 `Hover I18n Hint: 诊断国际化资源加载问题` 命令，按照提示操作
4. 尝试手动指定国际化资源文件的绝对路径
5. 执行 `Hover I18n Hint: 刷新国际化提示` 命令
6. 查看输出面板（`Ctrl+Shift+U` 或 `Cmd+Shift+U`）中的 "Hover I18n Hint" 日志

### 识别到的 key 数量不正确

1. 检查 zh.js 文件格式是否符合插件支持的格式
2. 查看输出面板中的日志，确认资源文件是否被正确加载
3. 调整配置中的 `keyFormat` 选项以匹配项目中使用的 key 格式

### 大文件性能问题

对于超过配置的 `maxFileSizeKB` 大小的文件，插件会自动跳过处理以避免性能问题。可以根据实际情况调整此值。

## 反馈与贡献

欢迎提交问题和建议，或者参与项目开发：

- [提交 Issue](https://github.com/yourusername/hover-i18n-hint/issues)
- [贡献代码](https://github.com/yourusername/hover-i18n-hint/pulls)

## 许可证

[MIT](LICENSE) 