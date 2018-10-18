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

// node test password
// username, host and port are optional. Defaults are: 'admin', 'routerlogin.net', autodetect port: 80 or 5000
const router = new NetgearRouter(
	process.argv[2], // password
	process.argv[3], // user
	process.argv[4], // host
	process.argv[5], // port
);

// function to get various information
async function getRouterInfo() {
	try {
		// Get router type, soap version, firmware version and internet connection status without login
		const currentSetting = await router.getCurrentSetting();
		console.log(currentSetting);

		// for other methods you first need to be logged in.
		await router.login(); // [password], [username], [host], [port] will override previous settings

		// Get router type, serial number, hardware version, firmware version, soap version, firewall version, etc.
		const info = await router.getInfo();
		console.log(info);

		// Get the support features.
		const supportFeatures = await router.getSupportFeatureListXML();
		console.log(supportFeatures);

		// get a list of attached devices
		const attachedDevices = await router.getAttachedDevices();
		console.log(attachedDevices);

		// get traffic statistics for this day and this month. Note: traffic monitoring must be enabled in router
		const traffic = await router.getTrafficMeter();
		console.log(traffic);

		// check for new router firmware and release note
		const firmware = await router.checkNewFirmware();
		console.log(firmware);

		// logout
		console.log('going to logout now');
		await router.logout();

	}	catch (error) {
		console.log(error);
	}
}

// function to block or allow an attached device
async function blockOrAllow(mac, action) {
	try {
		await router.login();
		const success = await router.setBlockDevice(mac, action);
		console.log(`${action} for ${mac} succesfull!`);
	}	catch (error) {
		console.log(error);
	}
}

// function to retrieve Guest Wifi status
async function getGuestWifiStatus() {
	try {
		await router.login();
		const guestWifiEnabled = await router.getGuestWifiEnabled();
		console.log(`2.4G-1 Guest wifi enabled: ${guestWifiEnabled}`);
		const guestWifi5GEnabled = await router.get5GGuestWifiEnabled();
		console.log(`5G-1 Guest wifi enabled: ${guestWifi5GEnabled}`);
		const guestWifi5G2Enabled = await router.get5GGuestWifi2Enabled();
		console.log(`5G-2 Guest wifi enabled: ${guestWifi5G2Enabled}`);
	} catch (error) {
		console.log(error);
	}
}

// function to enable/disable wifi
async function doWifiStuff() {
	try {
		await router.login();
		// enable 2.4GHz-1 guest wifi
		await router.setGuestWifi(true);
		console.log('2.4-1 enabled');
		// disable 5GHz-1 guest wifi
		await router.set5GGuestWifi(false);
		console.log('5-1 disabled');
		// disable 5GHz-2 guest wifi
		await router.set5GGuestWifi2(false);
		console.log('5-2 disabled');
	}	catch (error) {
		console.log(error);
	}
}

// function to update router firmware
async function updateNewFirmware() {
	try {
		await router.login();
		console.log('trying to update router firmware');
		await router.updateNewFirmware();
	}	catch (error) {
		console.log(error);
	}
}

// function to do internet speed test (takes long time!)
async function speedTest() {
	try {
		await router.login();
		console.log('speed test is starting... (wait a minute)')
		const speed = await router.speedTest(); // takes 1 minute to respond!
		console.log(speed);
	}	catch (error) {
		console.log(error);
	}
}

// function to reboot router
async function reboot() {
	try {
		await router.login();
		// Reboot the router
		console.log('going to reboot the router now')
		await router.reboot();
	}	catch (error) {
		console.log(error);
	}
}


getRouterInfo();
// blockOrAllow('AA:BB:CC:DD:EE:FF', 'Block');
// blockOrAllow('AA:BB:CC:DD:EE:FF', 'Allow');
// getGuestWifiStatus();
// doWifiStuff();
// reboot();
// updateNewFirmware();
// speedTest();
