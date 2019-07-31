import fs from 'fs';

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';
import v8Profiler from 'v8-profiler-node8';


import { hasPermission, hasRole, getUsersInRole } from '../../../authorization';
import { Subscriptions, Rooms } from '../../../models';
import { removeUserFromRoom } from '../functions';

Meteor.methods({
	startProfile() {
		function saveProfile(profile) {
			console.log('saving profile to disk...');
			const name = Random.id();
			const outputLocation = `/tmp/${ name }.cpuprofile`;
			const writeToDisk = Meteor.wrapAsync(fs.writeFile);
			profile.export(Meteor.bindEnvironment(function(error, result) {
				writeToDisk(outputLocation, result);
			}));
		}
		console.log('starting profiling...', v8Profiler);
		v8Profiler.setSamplingInterval(500);
		v8Profiler.startProfiling('onStart', true);
		setTimeout(Meteor.bindEnvironment(() => {
			const profile = v8Profiler.stopProfiling('onStart');
			saveProfile(profile);
			profile.delete();
			console.log('profiling finished');
		}), 120 * 1000);
	},
	leaveRoom(rid) {
		check(rid, String);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'leaveRoom' });
		}

		const room = Rooms.findOneById(rid);
		const user = Meteor.user();

		if (room.t === 'd' || (room.t === 'c' && !hasPermission(user._id, 'leave-c')) || (room.t === 'p' && !hasPermission(user._id, 'leave-p'))) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'leaveRoom' });
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, user._id, { fields: { _id: 1 } });
		if (!subscription) {
			throw new Meteor.Error('error-user-not-in-room', 'You are not in this room', { method: 'leaveRoom' });
		}

		// If user is room owner, check if there are other owners. If there isn't anyone else, warn user to set a new owner.
		if (hasRole(user._id, 'owner', room._id)) {
			const numOwners = getUsersInRole('owner', room._id).count();
			if (numOwners === 1) {
				throw new Meteor.Error('error-you-are-last-owner', 'You are the last owner. Please set new owner before leaving the room.', { method: 'leaveRoom' });
			}
		}

		return removeUserFromRoom(rid, user);
	},
});
