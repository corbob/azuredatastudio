/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createMemoizer } from 'vs/base/common/decorators';
import { Disposable } from 'vs/base/common/lifecycle';
import { EDITOR_FONT_DEFAULTS, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import * as colorRegistry from 'vs/platform/theme/common/colorRegistry';
import { DARK, ITheme, IThemeService, LIGHT } from 'vs/platform/theme/common/themeService';
import { Emitter } from 'vs/base/common/event';

interface WebviewThemeData {
	readonly activeTheme: string;
	readonly styles: { readonly [key: string]: string | number; };
}

export class WebviewThemeDataProvider extends Disposable {


	private static readonly MEMOIZER = createMemoizer();

	private readonly _onThemeDataChanged = this._register(new Emitter<void>());
	public readonly onThemeDataChanged = this._onThemeDataChanged.event;

	constructor(
		@IThemeService private readonly _themeService: IThemeService,
		@IConfigurationService private readonly _configurationService: IConfigurationService,
	) {
		super();

		this._register(this._themeService.onThemeChange(() => {
			this.reset();
		}));

		const webviewConfigurationKeys = ['editor.fontFamily', 'editor.fontWeight', 'editor.fontSize'];
		this._register(this._configurationService.onDidChangeConfiguration(e => {
			if (webviewConfigurationKeys.some(key => e.affectsConfiguration(key))) {
				this.reset();
			}
		}));
	}

	public getTheme(): ITheme {
		return this._themeService.getTheme();
	}

	@WebviewThemeDataProvider.MEMOIZER
	public getWebviewThemeData(): WebviewThemeData {
		const configuration = this._configurationService.getValue<IEditorOptions>('editor');
		const editorFontFamily = configuration.fontFamily || EDITOR_FONT_DEFAULTS.fontFamily;
		const editorFontWeight = configuration.fontWeight || EDITOR_FONT_DEFAULTS.fontWeight;
		const editorFontSize = configuration.fontSize || EDITOR_FONT_DEFAULTS.fontSize;

		const theme = this._themeService.getTheme();
		const exportedColors = colorRegistry.getColorRegistry().getColors().reduce((colors, entry) => {
			const color = theme.getColor(entry.id);
			if (color) {
				colors['vscode-' + entry.id.replace('.', '-')] = color.toString();
			}
			return colors;
		}, {} as { [key: string]: string; });

		const styles = {
			'vscode-font-family': '-apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", "Ubuntu", "Droid Sans", sans-serif',
			'vscode-font-weight': 'normal',
			'vscode-font-size': '13px',
			'vscode-editor-font-family': editorFontFamily,
			'vscode-editor-font-weight': editorFontWeight,
			'vscode-editor-font-size': editorFontSize + 'px',
			...exportedColors
		};

		const activeTheme = ApiThemeClassName.fromTheme(theme);
		return { styles, activeTheme };
	}

	private reset() {
		WebviewThemeDataProvider.MEMOIZER.clear();
		this._onThemeDataChanged.fire();
	}
}

enum ApiThemeClassName {
	light = 'vscode-light',
	dark = 'vscode-dark',
	highContrast = 'vscode-high-contrast'
}

namespace ApiThemeClassName {
	export function fromTheme(theme: ITheme): ApiThemeClassName {
		switch (theme.type) {
			case LIGHT: return ApiThemeClassName.light;
			case DARK: return ApiThemeClassName.dark;
			default: return ApiThemeClassName.highContrast;
		}
	}
}
