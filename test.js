/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017, 2018, Robin de Gruijter <gruijter@hotmail.com> */

'use strict';

const NetgearRouter = require('./netgear.js');

// password, username, host and port are optional. Defaults are: 'password', 'admin', 'routerlogin.net', 80/5000
const router = new NetgearRouter(process.argv[2].toString() || 'your_password'); // [password], [user], [host], [port]

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
		console.log(success);
	}	catch (error) {
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

// function to reboot router
async function reboot() {
	try {
		await router.login();
		// Reboot the router
		await router.reboot();
	}	catch (error) {
		console.log(error);
	}
}

// function to update router firmware
async function updateNewFirmware() {
	try {
		await router.login();
		await router.updateNewFirmware();
	}	catch (error) {
		console.log(error);
	}
}

// function to do internet speed test (takes long time!)
async function speedTest() {
	try {
		await router.login();
		const speed = await router.speedTest(); // takes 1 minute to respond!
		console.log(speed);
	}	catch (error) {
		console.log(error);
	}
}

getRouterInfo();
// blockOrAllow('AA:BB:CC:DD:EE:FF', 'Block');
// blockOrAllow('AA:BB:CC:DD:EE:FF', 'Allow');
// doWifiStuff();
// reboot();
// updateNewFirmware();
// speedTest();
