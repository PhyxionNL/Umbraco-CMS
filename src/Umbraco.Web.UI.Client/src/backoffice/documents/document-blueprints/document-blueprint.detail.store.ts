import type { DocumentBlueprintDetails } from '@umbraco-cms/models';
import { UmbContextToken } from '@umbraco-cms/context-api';
import { createObservablePart, ArrayState } from '@umbraco-cms/observable-api';
import { UmbStoreBase } from '@umbraco-cms/store';
import { UmbControllerHostInterface } from '@umbraco-cms/controller';


export const UMB_DocumentBlueprint_DETAIL_STORE_CONTEXT_TOKEN = new UmbContextToken<UmbDocumentBlueprintDetailStore>('UmbDocumentBlueprintDetailStore');


/**
 * @export
 * @class UmbDocumentBlueprintDetailStore
 * @extends {UmbStoreBase}
 * @description - Details Data Store for Document Blueprints
 */
export class UmbDocumentBlueprintDetailStore extends UmbStoreBase {


	// TODO: use the right type:
	#data = new ArrayState<DocumentBlueprintDetails>([], (x) => x.key);


	constructor(host: UmbControllerHostInterface) {
		super(host, UMB_DocumentBlueprint_DETAIL_STORE_CONTEXT_TOKEN.toString());
	}

	/**
	 * @description - Request a Data Type by key. The Data Type is added to the store and is returned as an Observable.
	 * @param {string} key
	 * @return {*}  {(Observable<DocumentBlueprintDetails | undefined>)}
	 * @memberof UmbDocumentBlueprintDetailStore
	 */
	getByKey(key: string) {
		// TODO: use backend cli when available.
		fetch(`/umbraco/management/api/v1/document-blueprint/details/${key}`)
			.then((res) => res.json())
			.then((data) => {
				this.#data.append(data);
			});

		return createObservablePart(this.#data, (documents) =>
			documents.find((document) => document.key === key)
		);
	}

	// TODO: make sure UI somehow can follow the status of this action.
	/**
	 * @description - Save a DocumentBlueprint.
	 * @param {Array<DocumentBlueprintDetails>} Dictionaries
	 * @memberof UmbDocumentBlueprintDetailStore
	 * @return {*}  {Promise<void>}
	 */
	save(data: DocumentBlueprintDetails[]) {
		// fetch from server and update store
		// TODO: use Fetcher API.
		let body: string;

		try {
			body = JSON.stringify(data);
		} catch (error) {
			console.error(error);
			return Promise.reject();
		}

		// TODO: use backend cli when available.
		return fetch('/umbraco/management/api/v1/document-blueprint/save', {
			method: 'POST',
			body: body,
			headers: {
				'Content-Type': 'application/json',
			},
		})
			.then((res) => res.json())
			.then((data: Array<DocumentBlueprintDetails>) => {
				this.#data.append(data);
			});
	}

	// TODO: How can we avoid having this in both stores?
	/**
	 * @description - Delete a Data Type.
	 * @param {string[]} keys
	 * @memberof UmbDocumentBlueprintDetailStore
	 * @return {*}  {Promise<void>}
	 */
	async delete(keys: string[]) {
		// TODO: use backend cli when available.
		await fetch('/umbraco/backoffice/document-blueprint/delete', {
			method: 'POST',
			body: JSON.stringify(keys),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		this.#data.remove(keys);
	}
}
