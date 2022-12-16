import { UUITextStyles } from '@umbraco-ui/uui-css/lib';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { umbExtensionsRegistry } from '@umbraco-cms/extensions-registry';
import type { ManifestWorkspaceView } from '@umbraco-cms/models';
import { UmbContextConsumerMixin, UmbContextProviderMixin } from '@umbraco-cms/context-api';
import type { UmbDocumentStore } from 'src/core/stores/document/document.store';

import '../shared/workspace-content/workspace-content.element';

@customElement('umb-editor-document')
export class UmbEditorDocumentElement extends UmbContextConsumerMixin(UmbContextProviderMixin(LitElement)) {
	static styles = [
		UUITextStyles,
		css`
			:host {
				display: block;
				width: 100%;
				height: 100%;
			}
		`,
	];

	@property()
	entityKey!: string;

	constructor() {
		super();

		this._registerEditorViews();

		this.consumeContext('umbDocumentStore', (documentStore: UmbDocumentStore) => {
			this.provideContext('umbContentStore', documentStore);
		});
	}

	private _registerEditorViews() {
		const dashboards: Array<ManifestWorkspaceView> = [
			{
				type: 'workspaceView',
				alias: 'Umb.EditorView.Document.Edit',
				name: 'Document Editor Edit View',
				loader: () => import('../shared/workspace-content/views/edit/workspace-view-content-edit.element'),
				weight: 200,
				meta: {
					workspaces: ['Umb.Workspace.Document'],
					label: 'Info',
					pathname: 'content',
					icon: 'document',
				},
			},
			{
				type: 'workspaceView',
				alias: 'Umb.EditorView.Document.Info',
				name: 'Document Editor Info View',
				loader: () => import('../shared/workspace-content/views/info/workspace-view-content-info.element'),
				weight: 100,
				meta: {
					workspaces: ['Umb.Workspace.Document'],
					label: 'Info',
					pathname: 'info',
					icon: 'info',
				},
			},
		];

		dashboards.forEach((dashboard) => {
			if (umbExtensionsRegistry.isRegistered(dashboard.alias)) return;
			umbExtensionsRegistry.register(dashboard);
		});
	}

	render() {
		return html`<umb-workspace-content .entityKey=${this.entityKey} alias="Umb.Workspace.Document"></umb-workspace-content>`;
	}
}

export default UmbEditorDocumentElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-editor-document': UmbEditorDocumentElement;
	}
}
