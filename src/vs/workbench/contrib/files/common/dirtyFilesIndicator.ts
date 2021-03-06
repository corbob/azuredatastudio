/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { VIEWLET_ID } from 'vs/workbench/contrib/files/common/files';
import { ILifecycleService } from 'vs/platform/lifecycle/common/lifecycle';
import { Disposable, MutableDisposable } from 'vs/base/common/lifecycle';
import { IActivityService, NumberBadge } from 'vs/workbench/services/activity/common/activity';
import { IWorkingCopyService, IWorkingCopy, WorkingCopyCapabilities } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { IFilesConfigurationService, AutoSaveMode } from 'vs/workbench/services/filesConfiguration/common/filesConfigurationService';

export class DirtyFilesIndicator extends Disposable implements IWorkbenchContribution {
	private readonly badgeHandle = this._register(new MutableDisposable());

	private lastKnownDirtyCount: number | undefined;

	private get hasDirtyCount(): boolean {
		return typeof this.lastKnownDirtyCount === 'number' && this.lastKnownDirtyCount > 0;
	}

	constructor(
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@IActivityService private readonly activityService: IActivityService,
		@IWorkingCopyService private readonly workingCopyService: IWorkingCopyService,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Working copy dirty indicator
		this._register(this.workingCopyService.onDidChangeDirty(c => this.onWorkingCopyDidChangeDirty(c)));

		// Lifecycle
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	private onWorkingCopyDidChangeDirty(workingCopy: IWorkingCopy): void {
		const gotDirty = workingCopy.isDirty();
		if (gotDirty && !!(workingCopy.capabilities & WorkingCopyCapabilities.AutoSave) && this.filesConfigurationService.getAutoSaveMode() === AutoSaveMode.AFTER_SHORT_DELAY) {
			return; // do not indicate dirty of working copies that are auto saved after short delay
		}

		if (gotDirty || this.hasDirtyCount) {
			this.updateActivityBadge();
		}
	}

	private updateActivityBadge(): void {
		const dirtyCount = this.workingCopyService.dirtyCount;
		this.lastKnownDirtyCount = dirtyCount;

		// Indicate dirty count in badge if any
		if (dirtyCount > 0) {
			this.badgeHandle.value = this.activityService.showActivity(
				VIEWLET_ID,
				new NumberBadge(dirtyCount, num => num === 1 ? nls.localize('dirtyFile', "1 unsaved file") : nls.localize('dirtyFiles', "{0} unsaved files", dirtyCount)),
				'explorer-viewlet-label'
			);
		} else {
			this.badgeHandle.clear();
		}
	}
}
