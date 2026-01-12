import * as vscode from 'vscode';
import { parseHeader, decryptCNV } from './fileFormats/cnv/decryptor';


export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel("CNV");

	const showWarningOnIncorrectCnvEncoding = async (document: vscode.TextDocument) => {
		const isEncodingCorrect = document.encoding === 'windows1250';
		const isLineEndingCorrect = document.eol === vscode.EndOfLine.CRLF;
		if (isEncodingCorrect && isLineEndingCorrect) {
			return true;
		}
		if (document.isUntitled) {
			return false;
		}
		outputChannel.appendLine(`${document.fileName} uses ${document.encoding} and ${document.eol}`);
		const result = await vscode.window.showWarningMessage(`CNV script ${document.fileName} should be opened in windows1250 code page using CRLF line endings. Should reopen?`, 'Reopen');
		if (result === 'Reopen') {
			await document.save();
			await vscode.workspace.openTextDocument(document.uri, { encoding: 'windows1250' });
			return true;
		} else {
			return false;
		}
	};

	const decodeCnvInDocument = async (document: vscode.TextDocument) => {
		outputChannel.appendLine(`New tab opened: ${document.fileName} [${document.languageId}]`);
		if (document.languageId !== 'cnv') {
			return;
		}

		if (!await showWarningOnIncorrectCnvEncoding(document)) {
			throw new Error("Cannot decipher CNV file using incorrect encoding");
		}

		let editor = vscode.window.visibleTextEditors.find(editor => editor.document === document);
		let selection = new vscode.Selection(0, 0, 0, 0);
		if (editor) {
			selection = editor.selection;
			outputChannel.appendLine(`Making ${document.fileName} read-only...`);
			// TODO: There's a bug on startup that causes decoded files not to be marked as dirty
			vscode.commands.executeCommand('workbench.action.files.setActiveEditorReadonlyInSession');
		}
		const firstLine = document.getText(new vscode.Range(0, 0, 1, 0)).trim();
		const parsedHeader = parseHeader(firstLine);
		if (!parsedHeader) {
			outputChannel.appendLine(`File already deciphered: ${document.fileName} [${document.languageId}], ${firstLine}, ${parsedHeader}`);
			vscode.commands.executeCommand('workbench.action.files.resetActiveEditorReadonlyInSession');
			outputChannel.appendLine(`Made ${document.fileName} writable again.`);
			return;
		}
		const documentText = document.getText();
		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.replace(
			document.uri,
			new vscode.Range(document.positionAt(0), document.positionAt(documentText.length)),
			decryptCNV(documentText),
			{ label: 'Decipher CNV', needsConfirmation: false }
		);

		try {
			await vscode.window.withProgress(
				{ location: vscode.ProgressLocation.Notification, title: 'Decoding...' },
				(progress, token) => vscode.workspace.applyEdit(workspaceEdit));
		} finally {
			editor = vscode.window.visibleTextEditors.find(editor => editor.document === document);
			if (editor) {
				vscode.commands.executeCommand('workbench.action.files.resetActiveEditorReadonlyInSession');
				outputChannel.appendLine(`Made ${document.fileName} writable again.`);
				editor.selection = selection;
			}
		}
	};

	vscode.workspace.textDocuments.filter(document => document.languageId === 'cnv').forEach(decodeCnvInDocument);
	vscode.workspace.onDidOpenTextDocument(decodeCnvInDocument);
}
