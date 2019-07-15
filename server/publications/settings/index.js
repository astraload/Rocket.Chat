import { Meteor } from 'meteor/meteor';

import { Settings } from '../../../app/models';
import { hasPermission } from '../../../app/authorization';
import './emitter';

Meteor.methods({
	'public-settings/get'(updatedAt) {
		console.time('public-settings/get');
		const records = Settings.findNotHiddenPublic().fetch();

		if (updatedAt instanceof Date) {
			const update = records.filter(function(record) {
				return record._updatedAt > updatedAt;
			});

			const remove = Settings.trashFindDeletedAfter(updatedAt, {
				hidden: {
					$ne: true,
				},
				public: true,
			}, {
				fields: {
					_id: 1,
					_deletedAt: 1,
				},
			}).fetch();

			console.timeEnd('public-settings/get');
			return {
				update,
				remove,
			};
		}
		console.timeEnd('public-settings/get');
		return records;
	},
	'private-settings/get'(updatedAfter) {
		if (!Meteor.userId()) {
			return [];
		}
		if (!hasPermission(Meteor.userId(), 'view-privileged-setting')) {
			return [];
		}

		if (!(updatedAfter instanceof Date)) {
			return Settings.findNotHidden().fetch();
		}

		const records = Settings.findNotHidden({ updatedAfter }).fetch();
		return {
			update: records,
			remove: Settings.trashFindDeletedAfter(updatedAfter, {
				hidden: {
					$ne: true,
				},
			}, {
				fields: {
					_id: 1,
					_deletedAt: 1,
				},
			}).fetch(),
		};
	},
});
