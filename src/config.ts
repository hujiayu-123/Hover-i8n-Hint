import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

export function getConfig() {
  const config = vscode.workspace.getConfiguration('hoverI18nHint');
  return {
    localePath: config.get<string>('localePath', 'app/iframe/locale/zh.js'),
    language: config.get<string>('language', 'zh'),
    keyPrefixes: config.get<string[]>('keyPrefixes', ['_t.R', 'R', 'LanData.R']),
    autoDetect: config.get<boolean>('autoDetect', true)
  };
}

// 在工作区中自动查找可能的国际化资源文件
export async function findLocaleFiles(): Promise<string[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return [];
  }
  
  const results: string[] = [];
  const patterns = [
    '**/locale/zh.js',
    '**/locale/zh_CN.js',
    '**/locales/zh.js',
    '**/locales/zh_CN.js',
    '**/i18n/zh.js',
    '**/i18n/zh_CN.js',
    '**/translations/zh.js',
    '**/lang/zh.js',
    '**/test/sample/zh.js',
    'test/sample/zh.js',
    '**/zh.js',
    '**/static/zh.js',
    '**/assets/zh.js',
    '**/js/zh.js',
    '**/src/zh.js',
    '**/public/zh.js',
    '**/resources/zh.js',
    '**/language/zh.js',
    '**/languages/zh.js',
    '**/app/zh.js',
    '**/common/zh.js'
  ];
  
  try {
    const extensionPath = vscode.extensions.getExtension('hover-i18n-hint')?.extensionUri.fsPath;
    if (extensionPath) {
      const samplePath = path.join(extensionPath, 'test', 'sample', 'zh.js');
      if (fs.existsSync(samplePath)) {
        console.log(`找到插件示例文件: ${samplePath}`);
        results.push(samplePath);
      }
    }
  } catch (error) {
    console.error('查找插件示例文件时出错:', error);
  }
  
  for (const folder of workspaceFolders) {
    const rootPath = folder.uri.fsPath;
    
    for (const pattern of patterns) {
      try {
        const files = glob.sync(pattern, { cwd: rootPath });
        for (const file of files) {
          const fullPath = path.join(rootPath, file);
          console.log(`找到国际化文件: ${fullPath}`);
          results.push(fullPath);
        }
      } catch (error) {
        console.error('查找国际化文件时出错:', error);
      }
    }
  }
  
  return [...new Set(results)];
} 