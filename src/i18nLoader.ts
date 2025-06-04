import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { I18nMap } from './types';
import * as os from 'os';

// 内置的示例国际化数据（用于测试或无工作区时）
const DEFAULT_I18N_DATA: I18nMap = {
  l0359: '检验检查',
  l0360: '化验单',
  l1001: '患者信息',
  l1002: '诊断报告',
  l1003: '医嘱',
  l1004: '处方',
  l1005: '手术记录',
  l1006: '随访计划'
};

// 全局日志通道引用
let outputChannel: vscode.OutputChannel | null = null;

// 设置输出通道
export function setOutputChannel(channel: vscode.OutputChannel) {
  outputChannel = channel;
}

// 日志输出函数
function log(message: string, isError = false) {
  console.log(message);
  if (outputChannel) {
    outputChannel.appendLine(message);
  }
  if (isError) {
    console.error(message);
  }
}

// 在所有工作区中查找资源文件
function findResourceFiles(relativePath: string): string[] {
  const results: string[] = [];
  
  // 检查是否为绝对路径
  if (path.isAbsolute(relativePath)) {
    log(`检测到绝对路径: ${relativePath}`);
    if (fs.existsSync(relativePath)) {
      log(`找到资源文件: ${relativePath}`);
      results.push(relativePath);
      return results;
    } else {
      log(`绝对路径文件不存在: ${relativePath}`);
    }
  }
  
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    log('无工作区，使用内置数据');
    return results;
  }
  
  // 查找每个工作区中的资源文件
  for (const folder of vscode.workspace.workspaceFolders) {
    try {
      const fullPath = path.join(folder.uri.fsPath, relativePath);
      if (fs.existsSync(fullPath)) {
        log(`在工作区 ${folder.name} 中找到资源文件: ${fullPath}`);
        results.push(fullPath);
      }
    } catch (error) {
      log(`在工作区 ${folder.name} 中查找资源文件时出错: ${error}`, true);
    }
  }
  
  return results;
}

// 从文件内容中提取国际化数据的不同方法
function extractI18nDataFromContent(content: string): I18nMap {
  log('尝试解析国际化资源文件...');
  
  // 记录文件内容的前 200 个字符，帮助调试
  log(`文件内容前 200 个字符: ${content.substring(0, 200)}`);
  
  let result: I18nMap = {};
  
  try {
    // 方法 1: 尝试匹配 const R = {...} 模式
    log('尝试方法 1: 匹配 const R = {...} 模式');
    const rObjectMatch = content.match(/const\s+R\s*=\s*({[^;]*})/);
    if (rObjectMatch && rObjectMatch[1]) {
      try {
        // 使用 eval 解析对象（仅用于测试环境）
        const parsed = eval('(' + rObjectMatch[1] + ')');
        if (parsed && typeof parsed === 'object') {
          log(`方法 1 成功解析，找到 ${Object.keys(parsed).length} 个条目`);
          
          // 输出前 5 个条目作为示例
          const keys = Object.keys(parsed).slice(0, 5);
          keys.forEach(key => {
            log(`- ${key}: ${parsed[key]}`);
          });
          
          return parsed;
        }
      } catch (evalErr) {
        log(`方法 1 解析失败: ${evalErr}`, true);
      }
    }
    
    // 方法 2: 尝试匹配 export default {...} 模式
    log('尝试方法 2: 匹配 export default {...} 模式');
    // 改进正则表达式，处理多行 export default 情况
    const exportDefaultRegex = /export\s+default\s*({[\s\S]*?}(?=;|\s*\/\/|\s*\/\*|\s*$))/;
    const exportDefaultMatch = content.match(exportDefaultRegex);
    if (exportDefaultMatch && exportDefaultMatch[1]) {
      try {
        // 清理代码，处理可能的注释
        let cleanCode = exportDefaultMatch[1].replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        const parsed = eval('(' + cleanCode + ')');
        if (parsed && typeof parsed === 'object') {
          log(`方法 2 成功解析，找到 ${Object.keys(parsed).length} 个条目`);
          
          // 输出前 5 个条目作为示例
          const keys = Object.keys(parsed).slice(0, 5);
          keys.forEach(key => {
            log(`- ${key}: ${parsed[key]}`);
          });
          
          return parsed;
        }
      } catch (evalErr) {
        log(`方法 2 解析失败: ${evalErr}`, true);
      }
    }
    
    // 方法 3: 尝试匹配 module.exports = {...} 模式
    log('尝试方法 3: 匹配 module.exports = {...} 模式');
    const moduleExportsMatch = content.match(/module\.exports\s*=\s*({[\s\S]*?}(?=;|\s*\/\/|\s*\/\*|\s*$))/);
    if (moduleExportsMatch && moduleExportsMatch[1]) {
      try {
        let cleanCode = moduleExportsMatch[1].replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        const parsed = eval('(' + cleanCode + ')');
        if (parsed && typeof parsed === 'object') {
          log(`方法 3 成功解析，找到 ${Object.keys(parsed).length} 个条目`);
          return parsed;
        }
      } catch (evalErr) {
        log(`方法 3 解析失败: ${evalErr}`, true);
      }
    }
    
    // 方法 4: 直接尝试解析整个文件作为 JavaScript 对象
    log('尝试方法 4: 直接解析文件');
    try {
      // 尝试将整个文件作为模块执行
      const tmpFilePath = path.join(os.tmpdir(), 'i18n_temp.js');
      fs.writeFileSync(tmpFilePath, `
        const module = { exports: {} };
        const exports = module.exports;
        ${content}
        if (typeof exports.default === 'object') {
          return exports.default;
        }
        return module.exports;
      `);
      
      const vm = require('vm');
      const sandbox = {};
      vm.createContext(sandbox);
      const script = new vm.Script(fs.readFileSync(tmpFilePath, 'utf8'));
      const parsed = script.runInContext(sandbox);
      
      if (parsed && typeof parsed === 'object') {
        log(`方法 4 成功解析，找到 ${Object.keys(parsed).length} 个条目`);
        
        // 输出前 5 个条目作为示例
        const keys = Object.keys(parsed).slice(0, 5);
        keys.forEach(key => {
          log(`- ${key}: ${parsed[key]}`);
        });
        
        return parsed;
      }
    } catch (err) {
      log(`方法 4 解析失败: ${err}`, true);
    }
    
    // 方法 5: 尝试匹配所有的 'lXXXX': '文本' 模式
    log('尝试方法 5: 匹配所有的 key-value 对');
    
    // 增强的正则表达式，支持多种格式:
    // - l0001: '文本'
    // - 'l0001': '文本'
    // - "l0001": "文本"
    // - L0001: '文本'
    // - l0001 : '文本' (带空格)
    const keyValueRegex = /(['"]?)([lL]\d{4,})(['"]?)\s*:\s*(['"])([^'"]*)\4/g;
    let match;
    let count = 0;
    
    while ((match = keyValueRegex.exec(content)) !== null) {
      const key = match[2];
      const value = match[5];
      result[key] = value;
      count++;
    }
    
    if (count > 0) {
      log(`方法 5 成功解析，找到 ${count} 个条目`);
      
      // 输出前 5 个条目作为示例
      const keys = Object.keys(result).slice(0, 5);
      keys.forEach(key => {
        log(`- ${key}: ${result[key]}`);
      });
      
      return result;
    }
    
    // 方法 6: 处理 IIFE 格式的 zh.js 文件
    // 格式: (function(window){ var zhCn={name:'zhCn',R:{...}} window.LanData = zhCn; })(this)
    log('尝试方法 6: 处理 IIFE 格式的 zh.js 文件');
    try {
      // 查找 zhCn.R 对象
      const rObjectRegex = /var\s+zhCn\s*=\s*{[^}]*name\s*:\s*['"]zhCn['"][^}]*,\s*R\s*:\s*({[\s\S]*?})(?=\s*})/;
      const rObjectMatch = content.match(rObjectRegex);
      
      if (rObjectMatch && rObjectMatch[1]) {
        // 替换函数调用和commonHM等变量（可能出现在值中的特殊情况）
        let cleanCode = rObjectMatch[1]
          .replace(/commonHM\.[\w\.]+(\['[\w]+']\)?)?/g, "''") // 替换commonHM变量引用
          .replace(/\?.*:/g, ':') // 替换三元表达式
          .replace(/,(\s*})/g, '$1'); // 修复尾随逗号
        
        try {
          // 先将代码包装在对象中以便解析
          const parsed = eval('({' + cleanCode + '})');
          if (parsed && typeof parsed === 'object') {
            log(`方法 6 成功解析，找到对象`);
            
            // 收集所有符合格式的键值对
            const i18nData: I18nMap = {};
            let entryCount = 0;
            
            // 遍历解析出的对象，提取所有格式为 'lXXXX': '文本' 的键值对
            for (const key in parsed) {
              if (key.match(/^[lL]\d{4,}$/) && typeof parsed[key] === 'string') {
                i18nData[key] = parsed[key];
                entryCount++;
              }
            }
            
            if (entryCount > 0) {
              log(`方法 6 成功提取国际化数据，找到 ${entryCount} 个条目`);
              
              // 输出前 5 个条目作为示例
              const keys = Object.keys(i18nData).slice(0, 5);
              keys.forEach(key => {
                log(`- ${key}: ${i18nData[key]}`);
              });
              
              return i18nData;
            }
          }
        } catch (evalErr) {
          log(`方法 6 解析对象失败: ${evalErr}`, true);
        }
      }
      
      // 如果上面的方法失败，使用正则表达式直接提取 R 对象中的键值对
      log('尝试方法 6 备选: 直接提取 R 对象中的键值对');
      const rSectionRegex = /R\s*:\s*{([\s\S]*?)}\s*}/;
      const rSectionMatch = content.match(rSectionRegex);
      
      if (rSectionMatch && rSectionMatch[1]) {
        const rSection = rSectionMatch[1];
        const i18nKeyValueRegex = /['"]([lL]\d{4,})['"]:\s*['"]([^'"]*)['"]/g;
        let kvMatch;
        const i18nData: I18nMap = {};
        let entryCount = 0;
        
        while ((kvMatch = i18nKeyValueRegex.exec(rSection)) !== null) {
          const key = kvMatch[1];
          const value = kvMatch[2];
          i18nData[key] = value;
          entryCount++;
        }
        
        if (entryCount > 0) {
          log(`方法 6 备选成功提取国际化数据，找到 ${entryCount} 个条目`);
          
          // 输出前 5 个条目作为示例
          const keys = Object.keys(i18nData).slice(0, 5);
          keys.forEach(key => {
            log(`- ${key}: ${i18nData[key]}`);
          });
          
          return i18nData;
        }
      }
    } catch (e) {
      log(`方法 6 处理过程中出现错误: ${e}`, true);
    }
  } catch (e) {
    log(`解析过程中出现错误: ${e}`, true);
  }
  
  log('所有解析方法都失败，返回空结果');
  return {};
}

// 读取并解析国际化资源文件，返回 key-value 映射
export async function loadI18nResource(relativePath: string): Promise<I18nMap> {
  return new Promise((resolve) => {
    // 查找所有工作区中的资源文件
    const resourceFiles = findResourceFiles(relativePath);
    
    // 尝试查找插件自身的测试样例文件
    if (resourceFiles.length === 0) {
      try {
        const extensionPath = vscode.extensions.getExtension('hover-i18n-hint')?.extensionUri.fsPath;
        if (extensionPath) {
          const samplePath = path.join(extensionPath, 'test', 'sample', 'zh.js');
          if (fs.existsSync(samplePath)) {
            log(`未找到工作区资源文件，尝试使用插件测试样例: ${samplePath}`);
            resourceFiles.push(samplePath);
          }
        }
      } catch (err) {
        log(`查找插件样例文件时出错: ${err}`, true);
      }
    }
    
    // 如果找不到资源文件，使用默认数据
    if (resourceFiles.length === 0) {
      log(`未找到任何资源文件: ${relativePath}，使用内置数据`);
      return resolve(DEFAULT_I18N_DATA);
    }
    
    // 尝试读取找到的第一个资源文件
    const fullPath = resourceFiles[0];
    log(`加载资源文件: ${fullPath}`);
    
    // 读取并解析文件
    fs.readFile(fullPath, 'utf-8', (err, content) => {
      if (err) {
        log(`读取资源文件失败: ${err.message}，使用内置数据`, true);
        return resolve(DEFAULT_I18N_DATA);
      }
      
      // 从文件内容中提取国际化数据
      const extractedData = extractI18nDataFromContent(content);
      
      // 如果提取成功且有数据，则使用提取的数据
      if (Object.keys(extractedData).length > 0) {
        log(`成功从文件中提取 ${Object.keys(extractedData).length} 个国际化条目`);
        return resolve(extractedData);
      }
      
      // 如果提取失败，使用默认数据
      log('从文件中提取数据失败，使用内置数据');
      resolve(DEFAULT_I18N_DATA);
    });
  });
}

// 监听资源文件变更，回调 reload
export function watchI18nResource(relativePath: string, onChange: () => void) {
  const resourceFiles = findResourceFiles(relativePath);
  
  if (resourceFiles.length === 0) {
    log('无法监听资源文件变更，使用内置数据');
    return;
  }
  
  // 监听找到的所有资源文件
  for (const fullPath of resourceFiles) {
    try {
      fs.watch(fullPath, { persistent: false }, () => {
        log(`检测到资源文件变更: ${fullPath}`);
        onChange();
      });
      log(`正在监听文件变更: ${fullPath}`);
    } catch (error) {
      log(`监听资源文件变更失败: ${fullPath}: ${error}`, true);
    }
  }
}

export type { I18nMap } from './types'; 