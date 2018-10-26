/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017, 2018, Robin de Gruijter <gruijter@hotmail.com> */

// INSTRUCTIONS FOR TESTING FROM DESKTOP:
// install node (https://nodejs.org)
// install this package: > npm i netgear
// run the test (from the test folder): > node test password

'use strict';

const NetgearRouter = require('../netgear.js');
const { version } = require('../package.json');
// const util = require('util');

let log = [];
const router = new NetgearRouter();

// function to setup the router session
async function setupSession(password, user, host, port) {
	try {
		log.push('===========================================');
		log.push(`starting test on Netgear package version ${version}`);
		router.password = password || router.password;
		router.username = user || router.username;
		log.push('trying to auto discover the router...');
		log.push(await router.discover());
		router.host = host || router.host;
		router.port = port || router.port;
	}	catch (error) {
		log.push(error);
		router.password = '*****';
		log.push(router);
	}
}

// function to get various information
async function getRouterInfo() {
	try {
		// // Get router type, soap version, firmware version and internet connection status without login
		// log.push('getting currentSetting...');
		// const currentSetting = await router.getCurrentSetting();
		// log.push(currentSetting);

		// for other methods you first need to be logged in.
		log.push('trying to login...');
		await router.login(); // [password], [username], [host], [port] will override previous settings
		log.push(`login method: ${router.loginMethod}`);

		// Get router type, serial number, hardware version, firmware version, soap version, firewall version, etc.
		log.push('trying to getInfo...');
		const info = await router.getInfo();
		info.SerialNumber = '**********';
		log.push(info);

		// Get the support features.
		log.push('trying to get supportFeatures...');
		const supportFeatures = await router.getSupportFeatureListXML();
		log.push(supportFeatures);

		// get a list of attached devices
		log.push('trying to get attachedDevices...');
		const attachedDevices = await router.getAttachedDevices();
		log.push(`Number of attached devices: ${attachedDevices.length}, method: ${router.getAttachedDevicesMethod}`);

		// get guest wifi status
		log.push('trying to get Guest Wifi Status...');
		await router.getGuestWifiEnabled()
			.then((enabled) => { log.push(`2.4G-1 Guest wifi enabled: ${enabled}`); })
			.catch(() => { log.push('2.4G-1 Guest wifi is not available');	});
		await router.get5GGuestWifiEnabled()
			.then((enabled) => { log.push(`5.0G-1 Guest wifi enabled: ${enabled}, method: ${router.guestWifiMethod.get50_1}`); })
			.catch(() => { log.push(`5.0G-1 Guest wifi is not available, method: ${router.guestWifiMethod.get50_1}`); });
		await router.get5GGuestWifi2Enabled()
			.then((enabled) => { log.push(`5.0G-2 Guest wifi enabled: ${enabled}`); })
			.catch(() => { log.push('5.0G-2 Guest wifi is not available');	});

		// get traffic statistics for this day and this month. Note: traffic monitoring must be enabled in router
		log.push('trying to get trafficMeter...');
		const traffic = await router.getTrafficMeter();
		log.push(traffic);

		// check for new router firmware and release note
		log.push('trying to check newFirmware...');
		const firmware = await router.checkNewFirmware();
		log.push(firmware);

		// logout
		log.push('trying to logout...');
		await router.logout();
		log.push('test finished o.k. :)');

	}	catch (error) {
		log.push(error);
		router.password = '*****';
		log.push(router);
	}
}

// function to block or allow an attached device
async function blockOrAllow(mac, action) {
	try {
		await router.login();
		await router.setBlockDevice(mac, action);
		log.push(`${action} for ${mac} succesfull!`);
	}	catch (error) {
		log.push(error);
		router.password = '*****';
		log.push(router);
	}
}

// function to enable/disable wifi
async function doWifiStuff() {
	try {
		await router.login();
		// enable 2.4GHz-1 guest wifi
		await router.setGuestWifi(true);
		log.push('2.4-1 enabled');
		// disable 5GHz-1 guest wifi
		await router.set5GGuestWifi(false);
		log.push('5-1 disabled');
		// disable 5GHz-2 guest wifi
		await router.set5GGuestWifi2(false);
		log.push('5-2 disabled');
	}	catch (error) {
		log.push(error);
		router.password = '*****';
		log.push(router);
	}
}

// function to update router firmware
async function updateNewFirmware() {
	try {
		await router.login();
		log.push('trying to update router firmware');
		await router.updateNewFirmware();
	}	catch (error) {
		log.push(error);
		router.password = '*****';
		log.push(router);
	}
}

// function to do internet speed test (takes long time!)
async function speedTest() {
	try {
		await router.login();
		log.push('speed test is starting... (wait a minute)');
		const speed = await router.speedTest(); // takes 1 minute to respond!
		log.push(speed);
	}	catch (error) {
		log.push(error);
		router.password = '*****';
		log.push(router);
	}
}

// function to reboot router
async function reboot() {
	try {
		await router.login();
		// Reboot the router
		log.push('going to reboot the router now');
		await router.reboot();
	}	catch (error) {
		log.push(error);
		router.password = '*****';
		log.push(router);
	}
}

exports.discover = () => {
	try {
		return Promise.resolve(router.discover());
	}	catch (error) {
		return Promise.reject(error);
	}
};

exports.test = async (password, user, host, port) => {
	log = [];	// empty the log
	try {
		await setupSession(password, user, host, port);
		await getRouterInfo();
		// await blockOrAllow('AA:BB:CC:DD:EE:FF', 'Block');
		// await blockOrAllow('AA:BB:CC:DD:EE:FF', 'Allow');
		// await speedTest();
		// await doWifiStuff();
		// await updateNewFirmware();
		// await reboot();
		return Promise.resolve(log);
	}	catch (error) {
		return Promise.resolve(log);
	}
};
