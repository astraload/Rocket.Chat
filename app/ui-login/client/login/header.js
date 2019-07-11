import { Template } from 'meteor/templating';

import { settings } from '../../../settings';

Template.loginHeader.helpers({
	logoUrl() {
		const asset = settings.get('Assets_logo');
		if (asset != null) {
			return `${ asset.url || asset.defaultUrl }`;
		}
	},
});
