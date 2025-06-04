import * as vscode from 'vscode';
import { loadI18nResource, watchI18nResource, I18nMap, setOutputChannel } from './i18nLoader';
import { getConfig, findLocaleFiles } from './config';
import * as path from 'path';
import * as fs from 'fs';

let i18nMap: I18nMap = {};
let decorationType: vscode.TextEditorDecorationType;
let outputChannel: vscode.OutputChannel;
let updateTimeout: NodeJS.Timeout | null = null;
let isEnabled = true;

export async function activate(context: vscode.ExtensionContext) {
  console.log('---------------');
  console.log('插件激活: Hover I18n Hint');
  console.log('---------------');
  
  // 创建输出通道
  outputChannel = vscode.window.createOutputChannel('Hover I18n Hint');
  outputChannel.show();
  
  // 设置 i18nLoader 的输出通道
  setOutputChannel(outputChannel);
  
  // 创建装饰器类型
  decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      margin: '0 0 0 10px',
      color: '#888',
      fontStyle: 'italic'
    }
  });
  
  try {
    // 获取配置
    const config = getConfig();
    outputChannel.appendLine(`配置的国际化资源路径: ${config.localePath}`);
    
    // 尝试查找国际化资源文件
    let localePath = config.localePath;
    
    // 如果启用了自动检测，则尝试查找可能的国际化资源文件
    if (config.autoDetect) {
      outputChannel.appendLine('自动检测国际化资源文件...');
      const localeFiles = await findLocaleFiles();
      
      if (localeFiles.length > 0) {
        outputChannel.appendLine(`找到 ${localeFiles.length} 个可能的国际化资源文件:`);
        localeFiles.forEach(file => outputChannel.appendLine(`- ${file}`));
        
        // 使用第一个找到的文件
        localePath = localeFiles[0];
        outputChannel.appendLine(`使用: ${localePath}`);
        
        // 如果找到多个文件，显示选择菜单
        if (localeFiles.length > 1) {
          const options = localeFiles.map(file => path.basename(path.dirname(file)) + '/' + path.basename(file));
          const selected = await vscode.window.showQuickPick(options, {
            placeHolder: '选择要使用的国际化资源文件'
          });
          
          if (selected) {
            const index = options.indexOf(selected);
            if (index !== -1) {
              localePath = localeFiles[index];
              outputChannel.appendLine(`用户选择: ${localePath}`);
            }
          }
        }
      }
    }
    
    // 加载国际化资源
    outputChannel.appendLine(`加载国际化资源: ${localePath}`);
    i18nMap = await loadI18nResource(localePath);
    
    // 简化日志输出，只显示条目数量
    outputChannel.appendLine(`已加载 ${Object.keys(i18nMap).length} 个国际化条目`);
    
    // 防抖更新当前编辑器的装饰器
    debounceUpdateDecorations(vscode.window.activeTextEditor);
    
    // 当编辑器更改时更新装饰器 (使用防抖)
    vscode.window.onDidChangeActiveTextEditor(editor => {
      debounceUpdateDecorations(editor);
    }, null, context.subscriptions);
    
    // 当文档更改时更新装饰器 (使用防抖和限制更新范围)
    vscode.workspace.onDidChangeTextDocument(event => {
      if (!isEnabled) return;
      
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        // 仅当编辑操作较少时才更新
        if (event.contentChanges.length < 10) {
          debounceUpdateDecorations(editor);
        }
      }
    }, null, context.subscriptions);
    
    // 监听资源文件变更（如果有工作区）
    watchI18nResource(localePath, async () => {
      outputChannel.appendLine('检测到国际化资源文件变更，重新加载...');
      i18nMap = await loadI18nResource(localePath);
      debounceUpdateDecorations(vscode.window.activeTextEditor);
    });
    
    // 添加测试命令
    const testCommand = vscode.commands.registerCommand('hoverI18nHint.test', () => {
      outputChannel.show();
      outputChannel.appendLine(`已加载 ${Object.keys(i18nMap).length} 个条目`);
      vscode.window.showInformationMessage(`已加载 ${Object.keys(i18nMap).length} 个国际化条目`);
    });
    context.subscriptions.push(testCommand);
    
    // 添加手动刷新装饰器命令
    const refreshCommand = vscode.commands.registerCommand('hoverI18nHint.refresh', () => {
      updateDecorations(vscode.window.activeTextEditor);
      vscode.window.showInformationMessage('已刷新国际化文案显示');
    });
    context.subscriptions.push(refreshCommand);
    
    // 添加启用/禁用命令
    const toggleCommand = vscode.commands.registerCommand('hoverI18nHint.toggle', () => {
      isEnabled = !isEnabled;
      
      if (isEnabled) {
        updateDecorations(vscode.window.activeTextEditor);
        vscode.window.showInformationMessage('已启用国际化文案显示');
      } else {
        if (vscode.window.activeTextEditor) {
          vscode.window.activeTextEditor.setDecorations(decorationType, []);
        }
        vscode.window.showInformationMessage('已禁用国际化文案显示');
      }
    });
    context.subscriptions.push(toggleCommand);
    
    // 添加诊断命令，帮助用户检查文件路径问题
    const diagnosticCommand = vscode.commands.registerCommand('hoverI18nHint.diagnose', async () => {
      outputChannel.show();
      outputChannel.appendLine('=== 开始诊断 ===');
      
      // 获取配置
      const config = getConfig();
      outputChannel.appendLine(`当前配置的国际化资源路径: ${config.localePath}`);
      
      // 检查绝对路径
      if (path.isAbsolute(config.localePath)) {
        outputChannel.appendLine(`检测到绝对路径配置`);
        
        try {
          const fileExists = fs.existsSync(config.localePath);
          outputChannel.appendLine(`文件是否存在: ${fileExists ? '是' : '否'}`);
          
          if (fileExists) {
            try {
              const stats = fs.statSync(config.localePath);
              outputChannel.appendLine(`文件大小: ${stats.size} 字节`);
              outputChannel.appendLine(`最后修改时间: ${stats.mtime}`);
              
              // 尝试读取文件头部
              const content = fs.readFileSync(config.localePath, 'utf-8').substring(0, 200);
              outputChannel.appendLine(`文件头部内容: ${content}`);
            } catch (error) {
              outputChannel.appendLine(`读取文件信息失败: ${error}`);
            }
          }
        } catch (error) {
          outputChannel.appendLine(`检查文件存在性失败: ${error}`);
        }
      } else {
        // 检查相对路径在各工作区中的情况
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          outputChannel.appendLine('当前没有打开的工作区');
        } else {
          outputChannel.appendLine(`检查相对路径在 ${workspaceFolders.length} 个工作区中的情况:`);
          
          for (const folder of workspaceFolders) {
            const fullPath = path.join(folder.uri.fsPath, config.localePath);
            outputChannel.appendLine(`工作区: ${folder.name}`);
            outputChannel.appendLine(`完整路径: ${fullPath}`);
            
            try {
              const fileExists = fs.existsSync(fullPath);
              outputChannel.appendLine(`文件是否存在: ${fileExists ? '是' : '否'}`);
              
              if (fileExists) {
                try {
                  const stats = fs.statSync(fullPath);
                  outputChannel.appendLine(`文件大小: ${stats.size} 字节`);
                } catch (error) {
                  outputChannel.appendLine(`读取文件信息失败: ${error}`);
                }
              }
            } catch (error) {
              outputChannel.appendLine(`检查文件存在性失败: ${error}`);
            }
            
            outputChannel.appendLine('---');
          }
        }
      }
      
      // 查找可能的国际化文件
      outputChannel.appendLine('尝试自动查找可能的国际化资源文件:');
      const localeFiles = await findLocaleFiles();
      
      if (localeFiles.length > 0) {
        outputChannel.appendLine(`找到 ${localeFiles.length} 个可能的国际化资源文件:`);
        localeFiles.forEach(file => outputChannel.appendLine(`- ${file}`));
        
        // 询问用户是否要使用找到的文件
        const selected = await vscode.window.showQuickPick(
          ['是，使用第一个找到的文件', '否，保持当前设置'].concat(
            localeFiles.map(file => `使用: ${file}`)
          ),
          { placeHolder: '是否要使用找到的国际化资源文件?' }
        );
        
        if (selected && selected.startsWith('使用:')) {
          const filePath = selected.substring(4).trim();
          
          // 更新设置
          await vscode.workspace.getConfiguration('hoverI18nHint').update(
            'localePath', 
            filePath,
            vscode.ConfigurationTarget.Workspace
          );
          
          outputChannel.appendLine(`已更新配置，使用文件: ${filePath}`);
          
          // 重新加载国际化资源
          i18nMap = await loadI18nResource(filePath);
          debounceUpdateDecorations(vscode.window.activeTextEditor);
          
          vscode.window.showInformationMessage(`已加载国际化资源文件: ${path.basename(filePath)}`);
        } else if (selected === '是，使用第一个找到的文件') {
          // 更新设置
          await vscode.workspace.getConfiguration('hoverI18nHint').update(
            'localePath', 
            localeFiles[0],
            vscode.ConfigurationTarget.Workspace
          );
          
          outputChannel.appendLine(`已更新配置，使用文件: ${localeFiles[0]}`);
          
          // 重新加载国际化资源
          i18nMap = await loadI18nResource(localeFiles[0]);
          debounceUpdateDecorations(vscode.window.activeTextEditor);
          
          vscode.window.showInformationMessage(`已加载国际化资源文件: ${path.basename(localeFiles[0])}`);
        }
      } else {
        outputChannel.appendLine('未找到任何可能的国际化资源文件');
        
        // 提示用户手动设置路径
        const input = await vscode.window.showInputBox({
          prompt: '未找到国际化资源文件，请手动输入完整路径',
          value: config.localePath,
          validateInput: (value) => {
            if (!value) return '路径不能为空';
            return null;
          }
        });
        
        if (input) {
          // 更新设置
          await vscode.workspace.getConfiguration('hoverI18nHint').update(
            'localePath', 
            input,
            vscode.ConfigurationTarget.Workspace
          );
          
          outputChannel.appendLine(`已更新配置，使用文件: ${input}`);
          
          // 重新加载国际化资源
          i18nMap = await loadI18nResource(input);
          debounceUpdateDecorations(vscode.window.activeTextEditor);
          
          if (Object.keys(i18nMap).length > 8) { // 大于默认数据的条目数
            vscode.window.showInformationMessage(`成功加载国际化资源文件: ${path.basename(input)}`);
          } else {
            vscode.window.showWarningMessage(`可能未正确加载文件: ${path.basename(input)}，仍使用默认数据`);
          }
        }
      }
      
      outputChannel.appendLine('=== 诊断完成 ===');
    });
    context.subscriptions.push(diagnosticCommand);
    
    // 显示成功消息
    vscode.window.showInformationMessage(`国际化提示已启用，加载了 ${Object.keys(i18nMap).length} 个条目`);
    
    outputChannel.appendLine('插件激活完成! 请在编辑器中查看国际化文案提示');
  } catch (error) {
    outputChannel.appendLine(`错误: ${error}`);
    console.error('插件激活过程中发生错误:', error);
    vscode.window.showErrorMessage(`插件激活遇到问题，但将使用内置数据继续工作`);
  }
}

// 防抖函数，避免频繁更新装饰器
function debounceUpdateDecorations(editor?: vscode.TextEditor) {
  if (!isEnabled) return;
  
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  updateTimeout = setTimeout(() => {
    updateDecorations(editor);
    updateTimeout = null;
  }, 300);
}

// 更新装饰器
function updateDecorations(editor?: vscode.TextEditor) {
  if (!isEnabled || !editor) {
    return;
  }
  
  // 限制文件大小，避免大文件卡顿
  if (editor.document.getText().length > 100000) {
    return; // 跳过大文件
  }
  
  const decorations: vscode.DecorationOptions[] = [];
  const text = editor.document.getText();
  
  // 增强版正则表达式，支持更多形式的国际化key
  // 1. 直接使用的key: l0359, L0359
  // 2. 字符串形式: 'l0359', "l0359"
  // 3. 对象访问: R.l0359, strings.l0359
  // 4. JSX中的使用: {l0359}
  
  // 匹配模式1: 直接使用的key (非字符串，非对象属性)
  const pattern1 = /\b([lL]\d{4,})\b(?!\s*[:=]|['"])/g;
  
  // 匹配模式2: 字符串形式的key
  const pattern2 = /['"]([lL]\d{4,})['"]/g;
  
  // 匹配模式3: JSX中的使用 {l0359}
  const pattern3 = /\{([lL]\d{4,})\}/g;
  
  // 使用模式1匹配
  let match;
  let count = 0;
  const maxDecorations = 500; // 限制装饰器数量
  
  // 检查是否为zh.js文件 - 这类文件不需要显示装饰器
  const fileName = editor.document.fileName.toLowerCase();
  if (fileName.endsWith('zh.js') || fileName.endsWith('zh_cn.js') || fileName.endsWith('locale.js')) {
    return; // 跳过国际化资源文件
  }
  
  // 辅助函数，用于从i18nMap中获取值，考虑到可能的不同结构
  const getI18nValue = (key: string): string | undefined => {
    // 标准化key（统一小写以便于查找）
    const normalizedKey = key.toLowerCase();
    
    // 直接查找
    if (i18nMap[key]) {
      return i18nMap[key];
    }
    
    // 尝试查找小写版本
    if (i18nMap[normalizedKey]) {
      return i18nMap[normalizedKey];
    }
    
    return undefined;
  };
  
  while ((match = pattern1.exec(text)) && count < maxDecorations) {
    const key = match[1];
    const value = getI18nValue(key);
    
    if (value) {
      count++;
      
      const startPos = editor.document.positionAt(match.index);
      const endPos = editor.document.positionAt(match.index + key.length);
      
      const decoration: vscode.DecorationOptions = {
        range: new vscode.Range(startPos, endPos),
        hoverMessage: new vscode.MarkdownString(`**${key}**: ${value}`),
        renderOptions: {
          after: {
            contentText: ` → ${value}`,
          }
        }
      };
      
      decorations.push(decoration);
    }
  }
  
  // 使用模式2匹配
  while ((match = pattern2.exec(text)) && count < maxDecorations) {
    const key = match[1];
    const value = getI18nValue(key);
    
    if (value) {
      count++;
      
      const startPos = editor.document.positionAt(match.index + 1); // +1 跳过引号
      const endPos = editor.document.positionAt(match.index + key.length + 1);
      
      const decoration: vscode.DecorationOptions = {
        range: new vscode.Range(startPos, endPos),
        hoverMessage: new vscode.MarkdownString(`**${key}**: ${value}`),
        renderOptions: {
          after: {
            contentText: ` → ${value}`,
          }
        }
      };
      
      decorations.push(decoration);
    }
  }
  
  // 使用模式3匹配
  while ((match = pattern3.exec(text)) && count < maxDecorations) {
    const key = match[1];
    const value = getI18nValue(key);
    
    if (value) {
      count++;
      
      const startPos = editor.document.positionAt(match.index + 1); // +1 跳过 {
      const endPos = editor.document.positionAt(match.index + key.length + 1);
      
      const decoration: vscode.DecorationOptions = {
        range: new vscode.Range(startPos, endPos),
        hoverMessage: new vscode.MarkdownString(`**${key}**: ${value}`),
        renderOptions: {
          after: {
            contentText: ` → ${value}`,
          }
        }
      };
      
      decorations.push(decoration);
    }
  }
  
  editor.setDecorations(decorationType, decorations);
  
  // 输出诊断信息
  if (count > 0) {
    outputChannel.appendLine(`在当前文件中找到并显示了 ${count} 个国际化提示`);
  }
}

export function deactivate() {
  console.log('插件停用: Hover I18n Hint');
  if (decorationType) {
    decorationType.dispose();
  }
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
} 