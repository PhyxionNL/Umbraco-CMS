import type { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '../../constants.js';
import { UMB_DOCUMENT_ENTITY_TYPE, UMB_EDIT_DOCUMENT_WORKSPACE_PATH_PATTERN } from '../../constants.js';
import { UmbRollbackRepository } from '../repository/rollback.repository.js';
import { UmbDocumentItemRepository, type UmbDocumentItemModel } from '../../repository/index.js';
import type { UmbRollbackModalData, UmbRollbackModalValue } from './types.js';
import { diffWords, type Change } from '@umbraco-cms/backoffice/external/diff';
import { css, customElement, html, nothing, repeat, state, unsafeHTML } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { UmbUserItemRepository } from '@umbraco-cms/backoffice/user';
import { UMB_PROPERTY_DATASET_CONTEXT } from '@umbraco-cms/backoffice/property';
import type { UUISelectEvent } from '@umbraco-cms/backoffice/external/uui';
import { UMB_APP_LANGUAGE_CONTEXT, UmbLanguageItemRepository } from '@umbraco-cms/backoffice/language';
import { UMB_ENTITY_CONTEXT, type UmbEntityUnique } from '@umbraco-cms/backoffice/entity';
import { UmbVariantId } from '@umbraco-cms/backoffice/variant';

import '../../modals/shared/document-variant-language-picker.element.js';

type DocumentVersion = {
	id: string;
	date: string;
	user: string;
	isCurrentlyPublishedVersion: boolean;
	preventCleanup: boolean;
};

@customElement('umb-rollback-modal')
export class UmbRollbackModalElement extends UmbModalBaseElement<UmbRollbackModalData, UmbRollbackModalValue> {
	@state()
	versions: DocumentVersion[] = [];

	@state()
	selectedVersion?: {
		date: string;
		name: string;
		user: string;
		id: string;
		properties: {
			alias: string;
			value: string;
		}[];
	};

	@state()
	selectedCulture?: string;

	@state()
	availableVariants: Option[] = [];

	@state()
	isInvariant = true;

	#rollbackRepository = new UmbRollbackRepository(this);
	#userItemRepository = new UmbUserItemRepository(this);
	#workspaceContext?: typeof UMB_DOCUMENT_WORKSPACE_CONTEXT.TYPE;

	#localizeDateOptions: Intl.DateTimeFormatOptions = {
		day: 'numeric',
		month: 'long',
		hour: 'numeric',
		minute: '2-digit',
	};

	#documentUnique: UmbEntityUnique | undefined;
	#documentItem: UmbDocumentItemModel | undefined;
	#currentAppCulture: string | undefined;
	#currentDatasetCulture: string | undefined;

	constructor() {
		super();

		this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, (instance) => {
			this.#currentDatasetCulture = instance.getVariantId().culture ?? undefined;
			this.#selectCulture();
		});

		this.consumeContext(UMB_APP_LANGUAGE_CONTEXT, (instance) => {
			this.#currentAppCulture = instance.getAppCulture();
			this.#selectCulture();
		});

		this.consumeContext(UMB_ENTITY_CONTEXT, async (instance) => {
			if (instance.getEntityType() !== UMB_DOCUMENT_ENTITY_TYPE) {
				throw new Error(`Entity type is not ${UMB_DOCUMENT_ENTITY_TYPE}`);
			}

			this.#documentUnique = instance?.getUnique();

			if (!this.#documentUnique) {
				throw new Error('Document unique is not set');
			}

			const { data: documentItems } = await new UmbDocumentItemRepository(this).requestItems([this.#documentUnique]);
			this.#documentItem = documentItems?.[0];
			const itemVariants = this.#documentItem?.variants ?? [];

			this.isInvariant = itemVariants.length === 1 && new UmbVariantId(itemVariants[0].culture).isInvariant();
			this.#selectCulture();

			const cultures = itemVariants.map((x) => x.culture).filter((x) => x !== null) as string[];
			const { data: languageItems } = await new UmbLanguageItemRepository(this).requestItems(cultures);

			if (languageItems) {
				this.availableVariants = languageItems.map((language) => {
					return {
						name: language.name,
						value: language.unique,
						selected: language.unique === this.selectedCulture,
					};
				});
			} else {
				this.availableVariants = [];
			}

			this.#requestVersions();
		});
	}

	#selectCulture() {
		this.selectedCulture = this.isInvariant ? undefined : (this.#currentDatasetCulture ?? this.#currentAppCulture);
	}

	async #requestVersions() {
		if (!this.#documentUnique) {
			throw new Error('Document unique is not set');
		}

		const { data } = await this.#rollbackRepository.requestVersionsByDocumentId(
			this.#documentUnique,
			this.selectedCulture,
		);
		if (!data) return;

		const tempItems: DocumentVersion[] = [];

		const uniqueUserIds = [...new Set(data?.items.map((item) => item.user.id))];

		const { data: userItems } = await this.#userItemRepository.requestItems(uniqueUserIds);

		data?.items.forEach((item: any) => {
			if (item.isCurrentDraftVersion) return;

			tempItems.push({
				date: item.versionDate,
				user:
					userItems?.find((user) => user.unique === item.user.id)?.name || this.localize.term('general_unknownUser'),
				isCurrentlyPublishedVersion: item.isCurrentPublishedVersion,
				id: item.id,
				preventCleanup: item.preventCleanup,
			});
		});

		this.versions = tempItems;
		const id = tempItems.find((item) => item.isCurrentlyPublishedVersion)?.id;

		if (id) {
			this.#selectVersion(id);
		}
	}

	async #selectVersion(id: string) {
		const version = this.versions.find((item) => item.id === id);
		if (!version) return;

		const { data } = await this.#rollbackRepository.requestVersionById(id);
		if (!data) return;

		this.selectedVersion = {
			date: version.date,
			user: version.user,
			name: data.variants.find((x) => x.culture === this.selectedCulture)?.name || data.variants[0].name,
			id: data.id,
			properties: data.values
				.filter((x) => x.culture === this.selectedCulture || !x.culture) // When invariant, culture is undefined or null.
				.map((value: any) => {
					return {
						alias: value.alias,
						value: value.value,
					};
				}),
		};
	}

	#onRollback() {
		if (!this.selectedVersion) return;

		const id = this.selectedVersion.id;
		const culture = this.availableVariants.length > 1 ? this.selectedCulture : undefined;
		this.#rollbackRepository.rollback(id, culture);

		const docUnique = this.#workspaceContext?.getUnique() ?? '';
		// TODO Use the load method on the context instead of location.href, when it works.
		// this.#workspaceContext?.load(docUnique);
		location.href = UMB_EDIT_DOCUMENT_WORKSPACE_PATH_PATTERN.generateAbsolute({ unique: docUnique });
		this.modalContext?.reject();
	}

	#onCancel() {
		this.modalContext?.reject();
	}

	#onVersionClicked(id: string) {
		this.#selectVersion(id);
	}

	#onPreventCleanup(event: Event, id: string, preventCleanup: boolean) {
		event.preventDefault();
		event.stopImmediatePropagation();
		this.#rollbackRepository.setPreventCleanup(id, preventCleanup);

		const version = this.versions.find((item) => item.id === id);
		if (!version) return;

		version.preventCleanup = preventCleanup;
		this.requestUpdate('versions');
	}

	#onChangeCulture(event: UUISelectEvent) {
		const value = event.target.value;

		this.selectedCulture = value.toString();
		this.#requestVersions();
	}

	#renderCultureSelect() {
		return html`
			<div id="language-select">
				<b>${this.localize.term('general_language')}</b>
				<uui-select @change=${this.#onChangeCulture} .options=${this.availableVariants}></uui-select>
			</div>
		`;
	}

	#renderVersions() {
		return html` ${this.#renderCultureSelect()}
		${repeat(
			this.versions,
			(item) => item.id,
			(item) => {
				return html`
					<div
						@click=${() => this.#onVersionClicked(item.id)}
						@keydown=${() => {}}
						class="rollback-item ${this.selectedVersion?.id === item.id ? 'active' : ''}">
						<div>
							<p class="rollback-item-date">
								<umb-localize-date date="${item.date}" .options=${this.#localizeDateOptions}></umb-localize-date>
							</p>
							<p>${item.user}</p>
							<p>${item.isCurrentlyPublishedVersion ? this.localize.term('rollback_currentPublishedVersion') : ''}</p>
						</div>
						<uui-button
							look="secondary"
							@click=${(event: Event) => this.#onPreventCleanup(event, item.id, !item.preventCleanup)}
							label=${item.preventCleanup
								? this.localize.term('contentTypeEditor_historyCleanupEnableCleanup')
								: this.localize.term('contentTypeEditor_historyCleanupPreventCleanup')}></uui-button>
					</div>
				`;
			},
		)}`;
	}

	#renderCurrentVersion() {
		if (!this.selectedVersion) return;

		let currentPropertyValues = this.#workspaceContext?.getData()?.values ?? [];

		currentPropertyValues = currentPropertyValues.filter((x) => x.culture === this.selectedCulture || !x.culture); // When invariant, culture is undefined or null.

		const diffs: Array<{ alias: string; diff: Change[] }> = [];

		const nameDiff = diffWords(this.#workspaceContext?.getName() ?? '', this.selectedVersion.name);
		diffs.push({ alias: 'name', diff: nameDiff });

		this.selectedVersion.properties.forEach((item) => {
			const draftValue = currentPropertyValues.find((x) => x.alias === item.alias);

			if (!draftValue) return;

			const draftValueString = trimQuotes(JSON.stringify(draftValue.value));
			const versionValueString = trimQuotes(JSON.stringify(item.value));

			const diff = diffWords(draftValueString, versionValueString);
			diffs.push({ alias: item.alias, diff });
		});

		/**
		 *
		 * @param str
		 */
		function trimQuotes(str: string): string {
			return str.replace(/^['"]|['"]$/g, '');
		}

		return html`
			${unsafeHTML(this.localize.term('rollback_diffHelp'))}
			<uui-table>
				<uui-table-column style="width: 0"></uui-table-column>
				<uui-table-column></uui-table-column>

				<uui-table-head>
					<uui-table-head-cell>${this.localize.term('general_alias')}</uui-table-head-cell>
					<uui-table-head-cell>${this.localize.term('general_value')}</uui-table-head-cell>
				</uui-table-head>
				${repeat(
					diffs,
					(item) => item.alias,
					(item) => {
						const diff = diffs.find((x) => x?.alias === item.alias);
						return html`
							<uui-table-row>
								<uui-table-cell>${item.alias}</uui-table-cell>
								<uui-table-cell>
									${diff
										? diff.diff.map((part) =>
												part.added
													? html`<span class="diff-added">${part.value}</span>`
													: part.removed
														? html`<span class="diff-removed">${part.value}</span>`
														: part.value,
											)
										: nothing}
								</uui-table-cell>
							</uui-table-row>
						`;
					},
				)}
			</uui-table>
		`;
	}

	get currentVersionHeader() {
		return (
			this.localize.date(this.selectedVersion?.date ?? new Date(), this.#localizeDateOptions) +
			' - ' +
			this.selectedVersion?.user
		);
	}

	override render() {
		return html`
			<umb-body-layout headline="Rollback">
				<div id="main">
					<uui-box headline=${this.localize.term('rollback_versions')} id="box-left">
						<div>${this.#renderVersions()}</div>
					</uui-box>
					<uui-box headline=${this.currentVersionHeader} id="box-right"> ${this.#renderCurrentVersion()} </uui-box>
				</div>
				<umb-footer-layout slot="footer">
					<uui-button
						slot="actions"
						look="secondary"
						@click=${this.#onCancel}
						label=${this.localize.term('general_cancel')}></uui-button>
					<uui-button
						slot="actions"
						look="primary"
						@click=${this.#onRollback}
						label=${this.localize.term('actions_rollback')}></uui-button>
				</umb-footer-layout>
			</umb-body-layout>
		`;
	}

	static override styles = [
		UmbTextStyles,
		css`
			:host {
				color: var(--uui-color-text);
			}
			#language-select {
				display: flex;
				flex-direction: column;
				padding: var(--uui-size-space-5);
				padding-bottom: 0;
				gap: var(--uui-size-space-2);
				font-size: 15px;
			}
			uui-table {
				--uui-table-cell-padding: var(--uui-size-space-1) var(--uui-size-space-4);
				margin-top: var(--uui-size-space-5);
			}
			uui-table-head-cell:first-child {
				border-top-left-radius: var(--uui-border-radius);
			}
			uui-table-head-cell:last-child {
				border-top-right-radius: var(--uui-border-radius);
			}
			uui-table-head-cell {
				background-color: var(--uui-color-surface-alt);
			}
			uui-table-head-cell:last-child,
			uui-table-cell:last-child {
				border-right: 1px solid var(--uui-color-border);
			}
			uui-table-head-cell,
			uui-table-cell {
				border-top: 1px solid var(--uui-color-border);
				border-left: 1px solid var(--uui-color-border);
			}
			uui-table-row:last-child uui-table-cell {
				border-bottom: 1px solid var(--uui-color-border);
			}
			uui-table-row:last-child uui-table-cell:last-child {
				border-bottom-right-radius: var(--uui-border-radius);
			}
			uui-table-row:last-child uui-table-cell:first-child {
				border-bottom-left-radius: var(--uui-border-radius);
			}

			.diff-added,
			ins {
				background-color: #00c43e63;
			}
			.diff-removed,
			del {
				background-color: #ff35356a;
			}
			.rollback-item {
				position: relative;
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: var(--uui-size-space-5);
				cursor: pointer;
			}
			.rollback-item::after {
				content: '';
				position: absolute;
				inset: 2px;
				display: block;
				border: 2px solid transparent;
				pointer-events: none;
			}
			.rollback-item.active::after,
			.rollback-item:hover::after {
				border-color: var(--uui-color-selected);
			}
			.rollback-item:not(.active):hover::after {
				opacity: 0.5;
			}
			.rollback-item p {
				margin: 0;
				opacity: 0.5;
			}
			p.rollback-item-date {
				opacity: 1;
			}
			.rollback-item uui-button {
				white-space: nowrap;
			}
			#main {
				display: flex;
				gap: var(--uui-size-space-4);
				width: 100%;
				height: 100%;
			}

			#box-left {
				--uui-box-default-padding: 0;
				max-width: 500px;
				flex: 1;
				overflow: auto;
				height: 100%;
			}

			#box-right {
				flex: 1;
				overflow: auto;
				height: 100%;
			}
		`,
	];
}

export default UmbRollbackModalElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-rollback-modal': UmbRollbackModalElement;
	}
}
