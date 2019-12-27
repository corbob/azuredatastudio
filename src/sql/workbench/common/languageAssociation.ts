/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import { IEditorInput, EditorInput } from 'vs/workbench/common/editor';
import { ServicesAccessor, IInstantiationService, BrandedService } from 'vs/platform/instantiation/common/instantiation';
import { find } from 'vs/base/common/arrays';
import { UntitledTextEditorInput } from 'vs/workbench/common/editor/untitledTextEditorInput';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { getCodeEditor } from 'vs/editor/browser/editorBrowser';

export type InputCreator = (servicesAccessor: ServicesAccessor, activeEditor: IEditorInput) => EditorInput | undefined;
export type BaseInputCreator = (activeEditor: IEditorInput) => IEditorInput;

export interface ILanguageAssociation {

}

type ILanguageAssociationSignature<Service extends BrandedService[]> = new (...services: Service) => ILanguageAssociation;

export interface ILanguageAssociationRegistry {
	registerLanguageAssociation<Services extends BrandedService[]>(language: string, contribution: ILanguageAssociationSignature<Services>, isDefault?: boolean): void;
	getAssociations(): Array<{ language: string, contribution: ILanguageAssociation, isDefault?: boolean }>;
}

const languageAssociationRegistery = new class implements ILanguageAssociationRegistry {
	private associations = new Array<{ language: string, contribution: ILanguageAssociation, isDefault?: boolean }>();

	registerLanguageAssociation<Services extends BrandedService[]>(language: string, contribution: ILanguageAssociationSignature<Services>, isDefault?: boolean): void {
		this.associations.push({ language, contribution, isDefault });
	}

	getAssociations(): Array<{ language: string, contribution: ILanguageAssociation, isDefault?: boolean }> {
		return this.associations.slice();
	}
};

export const Extensions = {
	LanguageAssociations: 'workbench.contributions.editor.languageAssociation'
};

Registry.add(Extensions.LanguageAssociations, languageAssociationRegistery);

export function doHandleUpgrade(accessor: ServicesAccessor, editor: EditorInput): EditorInput {
	if (editor instanceof UntitledTextEditorInput || editor instanceof FileEditorInput) {
		const instantiationService = accessor.get(IInstantiationService);
		const activeWidget = getCodeEditor(editor);
		const textModel = activeWidget.getModel();
		const oldLanguage = textModel.getLanguageIdentifier().language;
		const association = find(languageAssociationRegistery.getAssociations(), l => l.language === oldLanguage);
		if (association) {
			return instantiationService.invokeFunction(association.creator, editor);
		}
	}
	return editor;
}
