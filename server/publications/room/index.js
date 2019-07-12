import { Meteor } from 'meteor/meteor';
import _ from 'underscore';
import moment from 'moment';
import log4js from 'log4js';
import { Random } from 'meteor/random';
import { roomTypes } from '../../../app/utils';
import { hasPermission } from '../../../app/authorization';
import { Rooms } from '../../../app/models';
import { settings } from '../../../app/settings';

import './emitter';

log4js.configure({
	appenders: {
		console: {
			type: 'console',
		},
		logstash: {
			url: 'http://status.rc.astraload.com:8080',
			type: '@log4js-node/logstash-http',
			logType: 'application',
			logChannel: 'test',
			application: 'Rocket.chat',
		},
	},
	categories: {
		default: { appenders: ['console', 'logstash'], level: 'info' },
	},
});
const logger = log4js.getLogger('myLogger');


export const fields = {
	_id: 1,
	name: 1,
	fname: 1,
	t: 1,
	cl: 1,
	u: 1,
	// usernames: 1,
	topic: 1,
	announcement: 1,
	announcementDetails: 1,
	muted: 1,
	unmuted: 1,
	_updatedAt: 1,
	archived: 1,
	jitsiTimeout: 1,
	description: 1,
	default: 1,
	customFields: 1,
	lastMessage: 1,
	retention: 1,
	prid: 1,

	// @TODO create an API to register this fields based on room type
	livechatData: 1,
	tags: 1,
	sms: 1,
	facebook: 1,
	code: 1,
	joinCodeRequired: 1,
	open: 1,
	v: 1,
	label: 1,
	ro: 1,
	reactWhenReadOnly: 1,
	sysMes: 1,
	sentiment: 1,
	tokenpass: 1,
	streamingOptions: 1,
	broadcast: 1,
	encrypted: 1,
	e2eKeyId: 1,
	departmentId: 1,
	servedBy: 1,
};

const roomMap = (record) => {
	if (record) {
		return _.pick(record, ...Object.keys(fields));
	}
	return {};
};

Meteor.methods({
	'rooms/get'(updatedAt) {
		const methodStartTime = moment();
		const callingId = Random.id();
		const methodName = 'rooms/get';
		const options = { fields };

		if (!Meteor.userId()) {
			if (settings.get('Accounts_AllowAnonymousRead') === true) {
				return Rooms.findByDefaultAndTypes(true, ['c'], options).fetch();
			}
			return [];
		}
		if (updatedAt instanceof Date) {
			const update = Rooms.findBySubscriptionUserIdUpdatedAfter(Meteor.userId(), updatedAt, options).fetch();
			const methodAfterUpdateTime = moment();
			const afterUpdateDiff = methodAfterUpdateTime.diff(methodStartTime);

			logger.info({ methodName, afterUpdateDiff, callingId });

			const methodBeforeRemoveTime = moment();
			const remove = Rooms.trashFindDeletedAfter(updatedAt, {}, { fields: { _id: 1, _deletedAt: 1 } }).fetch();
			const methodAfterRemoveTime = moment();
			const afterAfterRemoveDiff = methodAfterRemoveTime.diff(methodBeforeRemoveTime);
			logger.info({ methodName, afterAfterRemoveDiff, callingId });
			logger.info({ methodName, wholeMethodTime: methodAfterRemoveTime.diff(methodStartTime), callingId });
			return {
				update,
				remove,
			};
		}

		return Rooms.findBySubscriptionUserId(Meteor.userId(), options).fetch();
	},

	getRoomByTypeAndName(type, name) {
		const userId = Meteor.userId();

		if (!userId && settings.get('Accounts_AllowAnonymousRead') === false) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getRoomByTypeAndName' });
		}

		const roomFind = roomTypes.getRoomFind(type);

		const room = roomFind ? roomFind.call(this, name) : Rooms.findByTypeAndName(type, name);

		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'getRoomByTypeAndName' });
		}

		if (!Meteor.call('canAccessRoom', room._id, userId)) {
			throw new Meteor.Error('error-no-permission', 'No permission', { method: 'getRoomByTypeAndName' });
		}

		if (settings.get('Store_Last_Message') && !hasPermission(userId, 'preview-c-room')) {
			delete room.lastMessage;
		}

		return roomMap(room);
	},
});
