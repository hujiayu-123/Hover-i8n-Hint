import * as vscode from 'vscode';
import { loadI18nResources } from './i18nLoader';
import { config } from './config';
import * as path from 'path';

let i18nResources: Record<string, string> = {};
let decorationTimeout: NodeJS.Timeout | undefined = undefined;
let hoverProvider: vscode.Disposable | undefined = undefined;
let fileWatcher: vscode.FileSystemWatcher | undefined = undefined;
let decorationType: vscode.TextEditorDecorationType;

export async function activate(context: vscode.ExtensionContext) {
    console.log('HoverShowDes 插件已激活');

    try {
        i18nResources = await loadI18nResources();
        console.log(`已加载 ${Object.keys(i18nResources).length} 个国际化key`);
        
        // 设置文件监听器
        setupFileWatcher(context);
    } catch (error) {
        console.error('加载国际化资源失败:', error);
        vscode.window.showErrorMessage('国际化资源加载失败，插件功能受限');
    }
    
    // 创建装饰器类型
    decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            color: '#888',
            margin: '0 0 0 3px'
        }
    });

    // 注册Hover提供器
    registerHoverProvider();
    
    // 注册文本装饰器
    registerTextDecorator();
    
    // 监听编辑器变化
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);
    
    // 监听文档变化
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);
    
    // 初始化装饰器
    if (vscode.window.activeTextEditor) {
        updateDecorations(vscode.window.activeTextEditor);
    }

    // 刷新命令
    const refreshCommand = vscode.commands.registerCommand('hoverShowDes.refresh', async () => {
        vscode.window.showInformationMessage('正在刷新国际化资源...');
        try {
            i18nResources = await loadI18nResources(true);
            console.log(`重新加载了 ${Object.keys(i18nResources).length} 个国际化key`);
            registerHoverProvider(); // 重新注册Hover提供器
            updateDecorationsInAllEditors(); // 更新所有编辑器中的装饰器
        } catch (error) {
            vscode.window.showErrorMessage('刷新国际化资源失败: ' + error);
        }
    });

    // 切换启用状态命令
    const toggleCommand = vscode.commands.registerCommand('hoverShowDes.toggle', () => {
        config.enabled = !config.enabled;
        vscode.window.showInformationMessage(`国际化提示已${config.enabled ? '启用' : '禁用'}`);
        if (config.enabled) {
            registerHoverProvider();
            updateDecorationsInAllEditors();
        } else {
            if (hoverProvider) {
                hoverProvider.dispose();
                hoverProvider = undefined;
            }
            clearDecorationsInAllEditors();
        }
    });

    context.subscriptions.push(
        refreshCommand,
        toggleCommand,
        decorationType
    );
}

// 更新所有编辑器中的装饰器
function updateDecorationsInAllEditors() {
    vscode.window.visibleTextEditors.forEach(editor => {
        updateDecorations(editor);
    });
}

// 清除所有编辑器中的装饰器
function clearDecorationsInAllEditors() {
    vscode.window.visibleTextEditors.forEach(editor => {
        editor.setDecorations(decorationType, []);
    });
}

// 注册文本装饰器
function registerTextDecorator() {
    // 已通过事件监听实现，无需额外注册
}

// 更新装饰器
function updateDecorations(editor: vscode.TextEditor) {
    if (!config.enabled) return;
    
    // 判断是否在zh.js文件中
    const fileName = editor.document.fileName.toLowerCase();
    if (fileName.endsWith('zh.js')) {
        // 在zh.js文件中不显示装饰器
        editor.setDecorations(decorationType, []);
        return;
    }
    
    // 检查文件类型是否支持
    const languageId = editor.document.languageId;
    const supportedLanguages = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'vue', 'html'];
    if (!supportedLanguages.includes(languageId)) {
        editor.setDecorations(decorationType, []);
        return;
    }
    
    // 延迟更新以避免频繁计算
    if (decorationTimeout) {
        clearTimeout(decorationTimeout);
        decorationTimeout = undefined;
    }
    
    decorationTimeout = setTimeout(() => {
        const decorations: vscode.DecorationOptions[] = [];
        const document = editor.document;
        const text = document.getText();
        
        // 跟踪已添加的key位置，避免重复
        const addedPositions = new Set<string>();
        
        // 分行处理，找出所有可能的国际化key
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const keys = findI18nKeysInLine(line);
            
            for (const keyInfo of keys) {
                const key = keyInfo.key;
                const value = i18nResources[key];
                
                if (value) {
                    // 创建位置标识符
                    const posKey = `${i}:${keyInfo.start}:${keyInfo.end}`;
                    
                    // 避免在同一位置添加多个装饰器
                    if (!addedPositions.has(posKey)) {
                        addedPositions.add(posKey);
                        
                        // 创建装饰器选项
                        const decoration: vscode.DecorationOptions = {
                            range: new vscode.Range(
                                new vscode.Position(i, keyInfo.start),
                                new vscode.Position(i, keyInfo.end)
                            ),
                            renderOptions: {
                                after: {
                                    contentText: ` → ${value}`
                                }
                            }
                        };
                        
                        decorations.push(decoration);
                    }
                }
            }
        }
        
        // 应用装饰器
        editor.setDecorations(decorationType, decorations);
        
    }, 200);
}

// 设置文件监听器，监听国际化资源文件的变化
function setupFileWatcher(context: vscode.ExtensionContext) {
    if (fileWatcher) {
        fileWatcher.dispose();
    }
    
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    
    // 修改为监听所有语言资源文件
    fileWatcher = vscode.workspace.createFileSystemWatcher('**/*{zh,en}.js');
    
    // 当文件变化时重新加载资源
    fileWatcher.onDidChange(async (uri) => {
        console.log(`检测到国际化资源文件变化: ${uri.fsPath}`);
        vscode.window.setStatusBarMessage('国际化资源文件已更新，正在重新加载...', 3000);
        
        try {
            i18nResources = await loadI18nResources(true);
            console.log(`重新加载了 ${Object.keys(i18nResources).length} 个国际化key`);
            vscode.window.setStatusBarMessage(`已重新加载 ${Object.keys(i18nResources).length} 个国际化key`, 3000);
        } catch (error) {
            console.error('重新加载资源失败:', error);
        }
    });
    
    // 当文件创建时重新加载资源
    fileWatcher.onDidCreate(async (uri) => {
        console.log(`检测到新增国际化资源文件: ${uri.fsPath}`);
        vscode.window.setStatusBarMessage('发现新的国际化资源文件，正在加载...', 3000);
        
        try {
            i18nResources = await loadI18nResources(true);
            console.log(`加载了 ${Object.keys(i18nResources).length} 个国际化key`);
        } catch (error) {
            console.error('加载新资源文件失败:', error);
        }
    });
    
    context.subscriptions.push(fileWatcher);
}

function registerHoverProvider() {
    // 先移除旧的provider
    if (hoverProvider) {
        hoverProvider.dispose();
    }

    if (!config.enabled) return;

    // 创建新的provider - 添加html和vue文件支持
    hoverProvider = vscode.languages.registerHoverProvider(
        ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'vue', 'html'],
        {
            // 设置较高的优先级，使我们的提示能覆盖VS Code的内置提示
            provideHover(document, position, token) {
                // 获取当前行文本
                const line = document.lineAt(position.line).text;
                
                // 检查文件名，如果是zh.js则不显示提示
                const fileName = document.fileName.toLowerCase();
                if (fileName.endsWith('zh.js')) {
                    return null; // 在zh.js文件中不显示提示
                }
                
                // 查找这一行中所有可能的国际化key
                const i18nKeys = findI18nKeysInLine(line);
                
                // 检查光标是否位于某个key上
                for (const keyInfo of i18nKeys) {
                    const keyRange = new vscode.Range(
                        new vscode.Position(position.line, keyInfo.start),
                        new vscode.Position(position.line, keyInfo.end)
                    );
                    
                    if (keyRange.contains(position)) {
                        const key = keyInfo.key;
                        const value = i18nResources[key];
                        
                        if (value) {
                            // 创建更明显的提示
                            const hoverContent = new vscode.MarkdownString();
                            hoverContent.isTrusted = true;
                            hoverContent.appendMarkdown(`### 国际化提示\n\n**${key}**: ${value}`);
                            
                            return new vscode.Hover(hoverContent);
                        }
                    }
                }
                
                return null;
            }
        }
    );
}

// 查找一行中的所有国际化key
function findI18nKeysInLine(line: string): Array<{key: string, start: number, end: number}> {
    const keys: Array<{key: string, start: number, end: number}> = [];
    
    // 在en.js文件中，国际化key通常以这种形式出现：'l0001': 'Search',
    // 先尝试更精确的匹配，以避免重复
    const keyValueRegex = /'(l\d+)':\s*'([^']+)'/g;
    let match;
    
    while ((match = keyValueRegex.exec(line)) !== null) {
        const key = match[1]; // 例如 'l0001'
        
        if (!i18nResources[key]) continue;
        
        const keyStart = line.indexOf(key, match.index);
        const keyEnd = keyStart + key.length;
        
        // 检查是否已经添加过这个key
        if (!keys.some(k => k.key === key && k.start === keyStart && k.end === keyEnd)) {
            keys.push({
                key,
                start: keyStart,
                end: keyEnd
            });
        }
    }
    
    // 如果使用精确匹配没找到，再尝试其他模式
    if (keys.length === 0) {
        // 匹配多种格式的国际化key
        const patterns = [
            // JavaScript/TypeScript 格式
            { regex: /window\.LanData\.R\['(l\d+)'\]/g, group: 1 },
            { regex: /window\.LanData\.R\["(l\d+)"\]/g, group: 1 },
            { regex: /LanData\.R\['(l\d+)'\]/g, group: 1 },
            { regex: /LanData\.R\["(l\d+)"\]/g, group: 1 },
            { regex: /R\['(l\d+)'\]/g, group: 1 },
            { regex: /R\["(l\d+)"\]/g, group: 1 },
            { regex: /R\.(l\d+)/g, group: 1 },
            { regex: /t\(['"]?(l\d+)['"]?\)/g, group: 1 },
            { regex: /i18n\.t\(['"]?(l\d+)['"]?\)/g, group: 1 },
            // 添加匹配en.js文件中的格式，但更精确
            { regex: /'(l\d+)':/g, group: 1 },
            { regex: /"(l\d+)":/g, group: 1 },
            
            // HTML/Vue 模板格式
            { regex: /\{\{\s*(l\d+)\s*\}\}/g, group: 1 }, // {{ l1001 }}
            { regex: /v-text=['"]?(l\d+)['"]?/g, group: 1 }, // v-text="l1001"
            { regex: /v-html=['"]?(l\d+)['"]?/g, group: 1 }, // v-html="l1001"
            { regex: /:text=['"]?(l\d+)['"]?/g, group: 1 }, // :text="l1001"
            { regex: /:title=['"]?(l\d+)['"]?/g, group: 1 }, // :title="l1001"
            { regex: /:placeholder=['"]?(l\d+)['"]?/g, group: 1 }, // :placeholder="l1001"
            { regex: /:label=['"]?(l\d+)['"]?/g, group: 1 }, // :label="l1001"
            { regex: /tiplan=['"]?(l\d+)['"]?/g, group: 1 }, // tiplan="l1008"
            { regex: /lan=['"]?(l\d+)['"]?/g, group: 1 }, // lan="l1007"
            { regex: /data-i18n=['"]?(l\d+)['"]?/g, group: 1 }, // data-i18n="l1001"
            { regex: /i18n-key=['"]?(l\d+)['"]?/g, group: 1 }, // i18n-key="l1001"
        ];
        
        for (const pattern of patterns) {
            while ((match = pattern.regex.exec(line)) !== null) {
                const key = match[pattern.group];
                if (!key || !i18nResources[key]) continue;
                
                const keyStart = line.indexOf(key, match.index);
                const keyEnd = keyStart + key.length;
                
                // 检查是否已经添加过这个key
                if (!keys.some(k => k.key === key && k.start === keyStart && k.end === keyEnd)) {
                    keys.push({
                        key,
                        start: keyStart,
                        end: keyEnd
                    });
                }
            }
        }
    }
    
    return keys;
}

export function deactivate() {
    console.log('HoverShowDes 插件已停用');
    if (hoverProvider) {
        hoverProvider.dispose();
    }
    if (fileWatcher) {
        fileWatcher.dispose();
    }
} 