import { Meteor } from 'meteor/meteor';

import { EmojiCustom } from '../../../models';

Meteor.methods({
	listEmojiCustom(options = {}) {
		this.unblock();
		return EmojiCustom.find(options).fetch();
	},
});
