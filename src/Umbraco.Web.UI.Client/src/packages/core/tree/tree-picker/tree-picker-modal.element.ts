import type { UmbTreeSelectionConfiguration } from '../types.js';
import type { UmbTreePickerModalData, UmbTreePickerModalValue } from './tree-picker-modal.token.js';
import { html, customElement, state, ifDefined } from '@umbraco-cms/backoffice/external/lit';
import {
	UMB_WORKSPACE_MODAL,
	UmbModalBaseElement,
	UmbModalRouteRegistrationController,
} from '@umbraco-cms/backoffice/modal';
import { UmbDeselectedEvent, UmbSelectedEvent, UmbSelectionChangeEvent } from '@umbraco-cms/backoffice/event';
import type { UmbTreeElement, UmbTreeItemModelBase } from '@umbraco-cms/backoffice/tree';

@customElement('umb-tree-picker-modal')
export class UmbTreePickerModalElement<TreeItemType extends UmbTreeItemModelBase> extends UmbModalBaseElement<
	UmbTreePickerModalData<TreeItemType>,
	UmbTreePickerModalValue
> {
	@state()
	_selectionConfiguration: UmbTreeSelectionConfiguration = {
		multiple: false,
		selectable: true,
		selection: [],
	};

	@state()
	_createButton: boolean = false;

	@state()
	_createPath?: string;

	connectedCallback() {
		super.connectedCallback();

		// TODO: We should make a nicer way to observe the value..  [NL]
		// This could be by observing when the modalCOntext gets set. [NL]
		if (this.modalContext) {
			this.observe(this.modalContext.value, (value) => {
				this._selectionConfiguration.selection = value?.selection ?? [];
			});
		}

		// Same here [NL]
		this._selectionConfiguration.multiple = this.data?.multiple ?? false;

		// TODO: If data.enableCreate is true, we should add a button to create a new item. [NL]
		// Does the tree know enough about this, for us to be able to create a new item? [NL]
		// I think we need to be able to get entityType and a parentId?, or do we only allow creation in the root? and then create via entity actions? [NL]
		// To remove the hardcoded URLs for workspaces of entity types, we could make an create event from the tree, which either this or the sidebar impl. will pick up and react to. [NL]
		// Or maybe the tree item context base can handle this? [NL]
		// Maybe its a general item context problem to be solved. [NL]
		if (this._createButton) {
			new UmbModalRouteRegistrationController(this, UMB_WORKSPACE_MODAL)
				.addAdditionalPath('document-type')
				.onSetup(() => {
					return { data: { entityType: 'document-type', preset: {} } };
				})
				.observeRouteBuilder((routeBuilder) => {
					this._createPath = routeBuilder({});
				});
		}
	}

	#onSelectionChange(event: UmbSelectionChangeEvent) {
		event.stopPropagation();
		const element = event.target as UmbTreeElement;
		this.value = { selection: element.getSelection() };
		this.modalContext?.dispatchEvent(new UmbSelectionChangeEvent());
	}

	#onSelected(event: UmbSelectedEvent) {
		event.stopPropagation();
		this.modalContext?.dispatchEvent(new UmbSelectedEvent(event.unique));
	}

	#onDeselected(event: UmbDeselectedEvent) {
		event.stopPropagation();
		this.modalContext?.dispatchEvent(new UmbDeselectedEvent(event.unique));
	}

	render() {
		return html`
			<umb-body-layout headline="Select">
				<uui-box>
					<umb-tree
						alias=${ifDefined(this.data?.treeAlias)}
						.props=${{
							hideTreeItemActions: true,
							hideTreeRoot: this.data?.hideTreeRoot,
							selectionConfiguration: this._selectionConfiguration,
							filter: this.data?.filter,
							selectableFilter: this.data?.pickableFilter,
						}}
						@selection-change=${this.#onSelectionChange}
						@selected=${this.#onSelected}
						@deselected=${this.#onDeselected}></umb-tree>
				</uui-box>
				<div slot="actions">
					<uui-button label=${this.localize.term('general_close')} @click=${this._rejectModal}></uui-button>
					<uui-button
						label=${this.localize.term('general_choose')}
						look="primary"
						color="positive"
						@click=${this._submitModal}></uui-button>
				</div>
			</umb-body-layout>
		`;
	}
}

export default UmbTreePickerModalElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-tree-picker-modal': UmbTreePickerModalElement<UmbTreeItemModelBase>;
	}
}
