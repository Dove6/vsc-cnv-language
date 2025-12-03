import * as vscode from 'vscode';
import { decryptCNV } from 'reksio-formats/cnv/decryptor';

const textEncoder = (() => {
	const WINDOWS_1250_DECODE_LUT = [
		0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
		17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
		32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
		47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61,
		62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
		77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91,
		92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105,
		106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
		119, 120, 121, 122, 123, 124, 125, 126, 127, 160, 164, 166, 167,
		168, 169, 171, 172, 173, 174, 176, 177, 180, 181, 182, 183, 184,
		187, 193, 194, 196, 199, 201, 203, 205, 206, 211, 212, 214, 215,
		218, 220, 221, 223, 225, 226, 228, 231, 233, 235, 237, 238, 243,
		244, 246, 247, 250, 252, 253, 258, 259, 260, 261, 262, 263, 268,
		269, 270, 271, 272, 273, 280, 281, 282, 283, 313, 314, 317, 318,
		321, 322, 323, 324, 327, 328, 336, 337, 340, 341, 344, 345, 346,
		347, 350, 351, 352, 353, 354, 355, 356, 357, 366, 367, 368, 369,
		377, 378, 379, 380, 381, 382, 711, 728, 729, 731, 733, 8211, 8212,
		8216, 8217, 8218, 8220, 8221, 8222, 8224, 8225, 8226, 8230, 8240, 8249, 8250, 8364, 8482
	];

	const WINDOWS_1250_ENCODE_LUT: number[] = [];
	WINDOWS_1250_DECODE_LUT.forEach((c, i) => WINDOWS_1250_ENCODE_LUT[c] = i);

	return {
		encoding: 'windows1250',
		encode: (input: string) => new Uint8Array(input.split('').map(c => WINDOWS_1250_ENCODE_LUT[c.codePointAt(0)!] ?? '?'.charCodeAt(0))),
		encodeInto: (source: string, destination: Uint8Array) => {
			const read = Math.min(source.length, destination.length);
			for (let i = 0; i < read; i++) {
				destination[i] = WINDOWS_1250_ENCODE_LUT[source[i].codePointAt(0)!] ?? '?'.charCodeAt(0);
			}
			return {
				read,
				written: read,
			};
		},
	};
})();

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
		const parsedHeader = firstLine.match(/^\{<([CD]):(\d+)>\}$/);
		if (!parsedHeader) {
			outputChannel.appendLine(`File already deciphered: ${document.fileName} [${document.languageId}], ${firstLine}, ${parsedHeader}`);
			return;
		}
		const documentTextWithHeader = document.getText();
		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.replace(
			document.uri,
			new vscode.Range(document.positionAt(0), document.positionAt(documentTextWithHeader.length)),
			decryptCNV(textEncoder.encode(document.getText()).buffer),
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
