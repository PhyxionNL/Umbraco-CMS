import { css, html } from 'lit';
import { UUITextStyles } from '@umbraco-ui/uui-css/lib';
import { customElement, property } from 'lit/decorators.js';
import { UmbPropertyEditorExtensionElement } from '@umbraco-cms/backoffice/extensions-registry';
import { UmbLitElement } from '@umbraco-cms/internal/lit-element';
import { UmbDataTypePropertyCollection } from '@umbraco-cms/backoffice/data-type';

@customElement('umb-property-editor-ui-number')
export class UmbPropertyEditorUINumberElement extends UmbLitElement implements UmbPropertyEditorExtensionElement {


	@property()
	value = '';

	@property({ type: Array, attribute: false })
	public config = new UmbDataTypePropertyCollection();

	private onInput(e: InputEvent) {
		this.value = (e.target as HTMLInputElement).value;
		this.dispatchEvent(new CustomEvent('property-value-change'));
	}

	render() {
		return html`<uui-input .value=${this.value} type="number" @input=${this.onInput}></uui-input>`;
	}

	static styles = [
		UUITextStyles,
		css`
			uui-input {
				width: 100%;
			}
		`,
	];
}

export default UmbPropertyEditorUINumberElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-property-editor-ui-number': UmbPropertyEditorUINumberElement;
	}
}
