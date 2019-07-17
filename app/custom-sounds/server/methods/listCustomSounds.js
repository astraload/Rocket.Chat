import { Meteor } from 'meteor/meteor';

import { CustomSounds } from '../../../models';

Meteor.methods({
	listCustomSounds() {
		this.unblock();
		return CustomSounds.find({}).fetch();
	},
});
