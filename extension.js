const vscode = require("vscode");
var findInFiles = require("find-in-files");
const fs = require("fs");

function activate(context) {
    let allIds = {};

    let completionProvider = vscode.languages.registerCompletionItemProvider({
            scheme: "file",
            language: "html"
        }, {
            provideCompletionItems(document, position, token, context) {
                let data = allIds;
                let keys = Object.keys(data);
                let items = [];
                keys.forEach(key => {
                    let item = createAutoCompleteItem(key, data[key], document);
                    items.push(item);
                });

                items.push(i18nSnippet());
                items.push(i18nAttributeSnippet());
                return items;
            }
        },
        "@"
    );

    getAlli18nIds(data => {
        allIds = data;
    });

    const commandRegistration = vscode.commands.registerTextEditorCommand(
        "editor.calci18n",
        editor => {
            getAlli18nIds(data => {
                allIds = data;
            });
        }
    );
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;

function i18nSnippet() {
    let item = new vscode.CompletionItem(
        "i18n=",
        vscode.CompletionItemKind.Snippet
    );
    item.insertText = new vscode.SnippetString("i18n='@@${1:id}'");
    item.detail = 'i18n="@@Id"';
    return item;
}

function i18nAttributeSnippet() {
    let item = new vscode.CompletionItem(
        "i18n-attribute",
        vscode.CompletionItemKind.Snippet
    );
    item.insertText = new vscode.SnippetString("i18n-${1:attr}='@@${2:id}'");
    item.detail = 'i18n-attribute="@@Id"';

    return item;
}

function createAutoCompleteItem(key, data, position) {
    let item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Value);
    item.insertText = key.replace("@@", "");
    item.filterText = key;
    item.detail = "Used " + data.count + " Time(s)"
    if (data.line) {
        item.detail += "\nExample:\n" + data.line.join('\n');
    }
    if (data.fileNames) {
        let fileNames = data.fileNames.map(s => truncate(s, 15));
        item.detail += "\n In Files:\n" + fileNames.join('\n');
    }

    return item;
}

function getAlli18nIds(callback) {
    let src = vscode.workspace.getConfiguration("angular-i18n").src;

    findInFiles
        .find("@@[A-Z,a-z,0-9]+", vscode.workspace.rootPath + "/" + src, ".html$")
        .then(function (results) {
            let allKeys = [];
            let map = {};

            for (var result in results) {
                for (let match in results[result].matches) {
                    let id = results[result].matches[match];

                    let lineString = "";
                    for (let line in results[result].line) {
                        lineString += " " + results[result].line[line];
                    }
                    if (allKeys.includes(id)) {
                        map[id].count++;
                        map[id].fileNames.push(result);
                    } else {
                        allKeys.push(id);
                        map[id] = {
                            count: 1
                        };
                        map[id].fileNames = [result];
                    }
                    var re = new RegExp("'[\"|a-zA-Z0-9 ]+" + id);

                    var val = re.exec(lineString);
                    if (val != null) {
                        var string = val[0];
                        string = string.replace("'", "").replace(id, "");
                        if (map[id].line == null) {
                            map[id].line = [string];
                        } else {
                            map[id].line.push(string);
                        }
                    }
                }
                callback(map);
            }
        });
}

function truncate(n, len) {
    n= n.replace('.component.','.c.')
    var ext = n.substring(n.lastIndexOf(".") + 1, n.length).toLowerCase();
    var filename = n.replace('.' + ext, '');
    if (filename.length <= len) {
        return n;
    }
    filename = (n.length > len ? '...' : '') + filename.substr(filename.length - len, filename.length);
    return filename + '.' + ext;
}