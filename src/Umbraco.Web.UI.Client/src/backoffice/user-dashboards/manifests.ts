import type { ManifestUserDashboard, ManifestWithLoader } from '@umbraco-cms/models';

export const manifests: Array<ManifestWithLoader<ManifestUserDashboard>> = [
	{
		type: 'userDashboard',
		alias: 'Umb.UserDashboard.Test',
		name: 'Test User Dashboard',
		elementName: 'umb-user-dashboard-test',
		loader: () => import('./user-dashboard-test.element'),
		weight: 2,
		meta: {
			label: 'Test User Dashboard',
			pathname: 'test/test/test',
		},
	},
];
