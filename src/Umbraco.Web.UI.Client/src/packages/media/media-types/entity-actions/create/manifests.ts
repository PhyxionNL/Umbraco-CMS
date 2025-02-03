import {
	UMB_MEDIA_TYPE_ENTITY_TYPE,
	UMB_MEDIA_TYPE_FOLDER_ENTITY_TYPE,
	UMB_MEDIA_TYPE_ROOT_ENTITY_TYPE,
} from '../../entity.js';

import { manifests as defaultManifests } from './default/manifests.js';
import { manifests as folderManifests } from './folder/manifests.js';
import type { UmbExtensionManifestKind } from '@umbraco-cms/backoffice/extension-registry';

export const manifests: Array<UmbExtensionManifest | UmbExtensionManifestKind> = [
	{
		type: 'entityAction',
		kind: 'create',
		alias: 'Umb.EntityAction.MediaType.Create',
		name: 'Create Media Type Entity Action',
		weight: 1200,
		forEntityTypes: [UMB_MEDIA_TYPE_ENTITY_TYPE, UMB_MEDIA_TYPE_ROOT_ENTITY_TYPE, UMB_MEDIA_TYPE_FOLDER_ENTITY_TYPE],
	},
	// TODO: Deprecated: Will be removed in 17.0.0
	{
		type: 'modal',
		alias: 'Umb.Modal.MediaTypeCreateOptions',
		name: 'Media Type Create Options Modal',
		element: () => import('./modal/media-type-create-options-modal.element.js'),
	},
	...defaultManifests,
	...folderManifests,
];
