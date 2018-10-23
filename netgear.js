/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017, 2018, Robin de Gruijter <gruijter@hotmail.com> */

'use strict';

const http = require('http');
const parseXml = require('xml-js');
const util = require('util');
const dns = require('dns');
const soap = require('./soapcalls');

const setTimeoutPromise = util.promisify(setTimeout);
const dnsLookupPromise = util.promisify(dns.lookup);

const regexResponseCode = new RegExp(/<ResponseCode>(.*)<\/ResponseCode>/);
const regexAttachedDevices = new RegExp(/<NewAttachDevice>(.*)<\/NewAttachDevice>/);
const regexNewTodayUpload = new RegExp(/<NewTodayUpload>(.*)<\/NewTodayUpload>/);
const regexNewTodayDownload = new RegExp(/<NewTodayDownload>(.*)<\/NewTodayDownload>/);
const regexNewMonthUpload = new RegExp(/<NewMonthUpload>(.*)<\/NewMonthUpload>/);
const regexNewMonthDownload = new RegExp(/<NewMonthDownload>(.*)<\/NewMonthDownload>/);
const regexCurrentVersion = new RegExp(/<CurrentVersion>(.*)<\/CurrentVersion>/);
const regexNewVersion = new RegExp(/<NewVersion>(.*)<\/NewVersion>/);
const regexReleaseNote = new RegExp(/<ReleaseNote>(.*)<\/ReleaseNote>/);
const regexUplinkBandwidth = new RegExp(/<NewOOKLAUplinkBandwidth>(.*)<\/NewOOKLAUplinkBandwidth>/);
const regexDownlinkBandwidth = new RegExp(/<NewOOKLADownlinkBandwidth>(.*)<\/NewOOKLADownlinkBandwidth>/);
const regexAveragePing = new RegExp(/<AveragePing>(.*)<\/AveragePing>/);

const defaultHost = 'routerlogin.net';
const defaultUser = 'admin';
const defaultPassword = 'password';
// const defaultPort = 5000;	// 80 for orbi and R7800
const defaultSessionId = 'A7D88AE69687E58D9A00';	// '10588AE69687E58D9A00'

class AttachedDevice {
	constructor() {
		this.IP = undefined;					// e.g. '10.0.0.10'
		this.Name = undefined;				// '--' for unknown
		this.NameUserSet = undefined;	// e.g. 'false'
		this.MAC = undefined;					// e.g. '61:56:FA:1B:E1:21'
		this.ConnectionType = undefined;	// e.g. 'wired', '2.4GHz', 'Guest Wireless 2.4G'
		this.SSID = undefined;				// e.g. 'MyWiFi'
		this.Linkspeed = undefined;
		this.SignalStrength = undefined;	// number <= 100
		this.AllowOrBlock = undefined;		// 'Allow' or 'Block'
		this.Schedule = undefined;				// e.g. 'false'
		this.DeviceType = undefined;	// a number
		this.DeviceTypeUserSet = undefined;	// e.g. 'false',
		this.DeviceTypeName = undefined;	// unknown, found in orbi response
		this.DeviceModel = undefined; // unknown, found in R7800 and orbi response
		this.DeviceModelUserSet = undefined; // unknown, found in orbi response
		this.Upload = undefined;
		this.Download = undefined;
		this.QosPriority = undefined;	// 1, 2, 3, 4
		this.Grouping = undefined;
		this.SchedulePeriod = undefined;
		this.ConnAPMAC = undefined; // unknown, found in orbi response
	}
}

// filters for illegal xml characters
// XML 1.0
// #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
const xml10pattern = '[^'
										+ '\u0009\r\n'
										+ '\u0020-\uD7FF'
										+ '\uE000-\uFFFD'
										+ '\ud800\udc00-\udbff\udfff'
										+ ']';

// // XML 1.1
// // [#x1-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
// const xml11pattern = '[^'
// 										+ '\u0001-\uD7FF'
// 										+ '\uE000-\uFFFD'
// 										+ '\ud800\udc00-\udbff\udfff'
// 										+ ']+';

class NetgearRouter {
	// Represents a session to a Netgear Router.
	constructor(password, user, host, port) {
		this.host = host || defaultHost;
		this.port = port;
		this.username = user || defaultUser;
		this.password = password || defaultPassword;
		this.timeout = 10000;
		this.sessionId = defaultSessionId;
		this.cookie = undefined;
		this.loggedIn = false;
		this.configStarted = false;
		this.soapVersion = undefined;	// 2 or 3
		this.loginMethod = undefined;	// 2.0 for newer models
		this.getAttachedDevicesMethod = undefined;
		this.guestWifiMethod = {
			set24_1: undefined,
			get50_1: undefined,
			set50_1: undefined,
		};
		this.lastResponse = undefined;
	}

	async discover() {
		// returns a promise of the discovered hostIp and soapPort of the router. Also sets the values to this
		try {
			const hostIp = await this._getHostIp();
			const soapPort = await this._getSoapPort();
			return Promise.resolve({ hostIp, soapPort });
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async login(password, user, host, port) {
		// console.log('Login');
		try {
			this.password = password || await this.password;
			this.username = user || await this.username;
			this.host = host || await this.host;
			this.port = port || await this.port;
			if (!this.host || this.host === '' || !this.port) {
				throw Error('Cannot login: host IP and/or SOAP port not set');
			}
			// try new login method
			this.loginMethod = 2;
			const message = soap.login(this.sessionId, this.username, this.password);
			await this._makeRequest(soap.action.login, message)
				.catch(() => {	// new login failed, trying old login
					this.loginMethod = 1;
					this.cookie = undefined; // reset the cookie
					const messageOld = soap.loginOld(this.sessionId, this.username, this.password);
					return this._makeRequest(soap.action.loginOld, messageOld)
						.catch(() => {
							throw Error('Failed to login');
						});
				});
			this.loggedIn = true;
			return Promise.resolve(this.loggedIn);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async logout() {
		// console.log('logout');
		try {
			const message = soap.logout(this.sessionId);
			await this._makeRequest(soap.action.logout, message);
			this.loggedIn = false;
			return Promise.resolve(this.loggedIn);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async getCurrentSetting(host1) {
		// Resolves promise of router information without need for credentials. Rejects if error occurred.
		// console.log('Get current setting');
		try {
			const host = host1 || this.host;
			const headers = {
			};
			const options = {
				hostname: host,
				port: 80,
				path: '/currentsetting.htm',
				headers,
				method: 'GET',
			};
			const result = await this._makeHttpRequest(options, '');
			this.lastResponse = result.body;
			// request successfull
			if (result.statusCode === 200 && result.body.includes('Model=')) {
				const currentSetting = {};
				const entries = result.body.replace(/\n/g, '').split('\r');
				Object.keys(entries).forEach((entry) => {
					const info = entries[entry].split('=');
					if (info.length === 2) {
						currentSetting[info[0]] = info[1];
					}
				});
				// this.loginMethod = Number(currentSetting.LoginMethod) || 1;
				this.soapVersion = parseInt(currentSetting.SOAPVersion, 10) || 2;
				return Promise.resolve(currentSetting);
			}
			// request failed
			if (result.statusCode !== 200) {
				throw Error(`HTTP request Failed. Status Code: ${result.statusCode}`);
			}
			if (!result.body.includes('Model=')) {
				throw Error('This is not a valid Netgear router');
			}
			return Promise.reject(Error('Unknow error'));
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async getInfo() {
		// Resolves promise of router information. Rejects if error occurred.
		// console.log('Get router info');
		try {
			const message = soap.getInfo(this.sessionId);
			const result = await this._makeRequest(soap.action.getInfo,	message);
			const patchedBody = result.body
				.replace(xml10pattern, '')
				.replace(/soap-env:envelope/gi, 'soap-env:envelope')
				.replace(/soap-env:body/gi, 'soap-env:body');
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(patchedBody, parseOptions);
			const entries = rawJson['soap-env:envelope']['soap-env:body']['m:GetInfoResponse'];
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					info[property] = entries[property]._text;
				}
			});
			// info is an object with the following properties:
			// 	ModelName: e.g. 'R7000'
			// 	Description: e.g. 'Netgear Smart Wizard 3.0, specification 0.7 version'
			// 	SerialNumber: e.g. '1LG23B71067B2'
			// 	Firmwareversion: e.g. 'V1.0.9.6'
			// 	SmartAgentversion: // e.g. '3.0'
			// 	FirewallVersion: // e.g. 'ACOS NAT-Netfilter v3.0.0.5 (Linux Cone NAT Hot Patch 06/11/2010)'
			// 	VPNVersion: // e.g. 'N/A'
			// 	OthersoftwareVersion: // e.g. '1.2.19'
			// 	Hardwareversion: // e.g. 'R7000'
			// 	Otherhardwareversion: // e.g. 'N/A'
			// 	FirstUseDate: // e.g. 'Saturday, 20 Feb 2016 23:40:20'
			// info.SerialNumber = 'TEST';
			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async getSupportFeatureListXML() {
		// console.log('Get suported feature list XML');
		try {
			const message = soap.getSupportFeatureListXML(this.sessionId);
			const result = await this._makeRequest(soap.action.getSupportFeatureListXML, message);
			const patchedBody = result.body
				.replace(xml10pattern, '')
				.replace(/soap-env:envelope/gi, 'soap-env:envelope')
				.replace(/soap-env:body/gi, 'soap-env:body');
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(patchedBody, parseOptions);
			const entries = rawJson['soap-env:envelope']['soap-env:body']['m:GetSupportFeatureListXMLResponse'].newFeatureList.features;
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					info[property] = entries[property]._text;
				}
			});
			// info is an object with the following properties (R7800):
			//	DynamicQoS: '1.0',
			//	OpenDNSParental: '1.0',
			//	AccessControl: '1.0',
			//	SpeedTest: '2.0',
			//	GuestNetworkSchedule: '1.0',
			//	TCAcceptance: '1.0',
			//	DeviceTypeIdentification: '1.0',
			//	AttachedDevice: '2.0',
			//	NameNTGRDevice: '1.0',
			//	SmartConnect: '2.0',
			//	MaxMonthlyTrafficLimitation: '4095000000'
			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async getAttachedDevices() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices');
		this.getAttachedDevicesMethod = 2;
		const devices = await this._getAttachedDevices2()
			.catch(() => {
				// console.log('trying old method');
				this.getAttachedDevicesMethod = 1;
				return this._getAttachedDevices()
					.catch(err => Promise.reject(err));
			});
		return Promise.resolve(devices);
	}

	async getTrafficMeter() {
		// Resolves promise of traffic meter stats. Rejects if error occurred.
		// console.log('Get traffic meter');
		try {
			const message = soap.trafficMeter(this.sessionId);
			const result = await this._makeRequest(soap.action.getTrafficMeter,	message);
			const newTodayUpload = Number(regexNewTodayUpload.exec(result.body)[1].replace(',', ''));
			const newTodayDownload = Number(regexNewTodayDownload.exec(result.body)[1].replace(',', ''));
			const newMonthUpload = Number(regexNewMonthUpload.exec(result.body)[1].split('/')[0].replace(',', ''));
			const newMonthDownload = Number(regexNewMonthDownload.exec(result.body)[1].split('/')[0].replace(',', ''));
			const traffic = {
				newTodayUpload, newTodayDownload, newMonthUpload, newMonthDownload,
			};	// in Mbytes
			return Promise.resolve(traffic);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async setBlockDevice(MAC, AllowOrBlock) {
		// Resolves promise of AllowOrBlock status. Rejects if error occurred.
		// console.log('setBlockDevice started');
		try {
			await this._configurationStarted();
			const message = soap.setBlockDevice(this.sessionId, MAC, AllowOrBlock);
			await this._makeRequest(soap.action.setBlockDevice, message); // response code 1 = unknown MAC?, 2= device not connected?
			await this._configurationFinished()
				.catch(() => {
					// console.log(`Block/Allow finished with warning for ${MAC}`);
				});
			return Promise.resolve(MAC);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async getGuestWifiEnabled() {
		// console.log('Get 2.4GHz Guest wifi enabled status');
		try {
			const message = soap.getGuestAccessEnabled(this.sessionId);
			const result = await this._makeRequest(soap.action.getGuestAccessEnabled,	message);
			return Promise.resolve(result.body.includes('<NewGuestAccessEnabled>1</NewGuestAccessEnabled>'));
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async setGuestWifi(enable) { // true or false
		// turn 2.4GHz-1 guest wifi on or off
		// console.log('setGuestWifi started');
		this.guestWifiMethod.set24_1 = 1;
		const method = await this._setGuestAccessEnabled(enable)
			.catch(async () => {
				// console.log('trying method 2');
				this.guestWifiMethod.set24_1 = 2;
				return this._setGuestAccessEnabled2(enable)
					.catch(err => Promise.reject(err));
			});
		return Promise.resolve(method);
	}

	async get5GGuestWifiEnabled() {
		// console.log('Get 5GHz-1 Guest wifi enabled status');
		try {
			// try method R8000
			this.guestWifiMethod.get50_1 = 2;
			const message = soap.get5G1GuestAccessEnabled(this.sessionId);
			const result = await this._makeRequest(soap.action.get5G1GuestAccessEnabled2, message)
				.catch(() => {
					// console.log('trying alternative method');	// try method R7800
					this.guestWifiMethod.get50_1 = 1;
					return Promise.resolve(this._makeRequest(soap.action.get5G1GuestAccessEnabled, message));
				});
			return Promise.resolve(result.body.includes('<NewGuestAccessEnabled>1</NewGuestAccessEnabled>'));
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async set5GGuestWifi(enable) { // true or false
		// turn 5GHz-1 guest wifi on or off
		this.guestWifiMethod.set50_1 = 2;
		const method = await this._set5G1GuestAccessEnabled2(enable)
			.catch(async () => {
				// console.log('trying method 2');
				this.guestWifiMethod.set50_1 = 1;
				return this._set5G1GuestAccessEnabled(enable)
					.catch(err => Promise.reject(err));
			});
		return Promise.resolve(method);
	}

	async get5GGuestWifi2Enabled() {
		// console.log('Get 5GHz-1 Guest wifi enabled status');
		try {
			// try method R8000
			const message = soap.get5GGuestAccessEnabled2(this.sessionId);
			const result = await this._makeRequest(soap.action.get5GGuestAccessEnabled2, message);
			return Promise.resolve(result.body.includes('<NewGuestAccessEnabled>1</NewGuestAccessEnabled>'));
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async set5GGuestWifi2(enable) { // true or false
		// turn 5GHz-2 guest wifi on or off
		// console.log('setGuestWifi started');
		const method = await this._set5GGuestAccessEnabled2(enable);
		return Promise.resolve(method);
	}

	async reboot() {
		// Resolves promise of reboot started. Rejects if error occurred.
		// console.log('router reboot requested');
		try {
			await this._configurationStarted()
				.catch((err) => {
					throw Error(`Reboot request failed. (config started failure: ${err})`);
				});
			const message = soap.reboot(this.sessionId);
			await this._makeRequest(soap.action.reboot,	message);
			await this._configurationFinished()
				.catch(() => {
				// console.log(`Reboot finished with warning`);
				});
			return Promise.resolve(true); // reboot initiated
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async checkNewFirmware() {
		// check present firmware lever, and new firmware level if available
		// console.log('check new firmware requested');
		try {
			const message = soap.checkNewFirmware(this.sessionId);
			const result = await this._makeRequest(soap.action.checkNewFirmware,	message);
			const currentVersion = regexCurrentVersion.exec(result.body)[1];
			const newVersion = regexNewVersion.exec(result.body)[1];
			const releaseNote = regexReleaseNote.exec(result.body)[1];
			return Promise.resolve({ currentVersion, newVersion, releaseNote });
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async updateNewFirmware() {
		// Update the firmware of the router
		// console.log('router firmware update requested');
		try {
			const message = soap.updateNewFirmware(this.sessionId);
			await this._makeRequest(soap.action.updateNewFirmware,	message);
			return Promise.resolve(true); // firmware update request successfull
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async speedTest() {
		// Resolves promise of speed after 1 minute
		// console.log('internet speed test requested');
		try {
			await this._speedTestStart();
			await setTimeoutPromise(55 * 1000, 'waiting is done');
			const speed = await this._getSpeedTestResult();
			return Promise.resolve(speed);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _speedTestStart() {
		// start internet bandwith speedtest
		// console.log('speed test requested');
		try {
			await this._configurationStarted();
			const message = soap.speedTestStart(this.sessionId);
			await this._makeRequest(soap.action.speedTestStart,	message);
			await this._configurationFinished()
				.catch(() => {
				// console.log(`Speedtest finished with warning`);
				});
			return Promise.resolve(true); // speedtest initiated
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _getSpeedTestResult() {
		// get results of internet bandwith speedtest
		// console.log('speed test results requested');
		try {
			const message = soap.speedTestResult(this.sessionId);
			const result = await this._makeRequest(soap.action.speedTestResult,	message);
			const uplinkBandwidth = Number(regexUplinkBandwidth.exec(result.body)[1]);
			const downlinkBandwidth = Number(regexDownlinkBandwidth.exec(result.body)[1]);
			const averagePing = Number(regexAveragePing.exec(result.body)[1]);
			return Promise.resolve({ uplinkBandwidth, downlinkBandwidth, averagePing });
		} catch (error) {
			// resultcode 001 or 002 = no results yet?
			return Promise.reject(error);
		}
	}

	async _getAttachedDevices() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices');
		try {
			const message = soap.attachedDevices(this.sessionId);
			const result = await this._makeRequest(soap.action.getAttachedDevices, message);
			const devices = [];
			const patchedBody = result.body
				.replace(/\r?\n|\r/g, ' ')
				.replace(/&lt/g, '')
				.replace(/&gt/g, '');
			const raw = regexAttachedDevices.exec(patchedBody)[1];
			const entries = raw.split('@');
			if (entries.length < 1) {
				throw Error('Error parsing device-list (soap v2)');
			}
			Object.keys(entries).forEach((entry) => {
				const info = entries[entry].split(';');
				if (info.length === 0) {
					throw Error('Error parsing device-list (soap v2)');
				}
				if (info.length >= 5) { // Ignore first element if it is the total device count (info.length == 1)
					const device = new AttachedDevice();
					device.IP = info[1];		// e.g. '10.0.0.10'
					device.Name = info[2];	// '--' for unknown
					device.MAC = info[3];		// e.g. '61:56:FA:1B:E1:21'
					device.ConnectionType = 'unknown';	// 'wired' or 'wireless'
					device.Linkspeed = 0;		// number >= 0, or NaN for wired linktype
					device.SignalStrength = 0;	// number <= 100
					device.AllowOrBlock = 'unknown';		// 'Allow' or 'Block'
					// Not all routers will report link type and rate
					if (info.length >= 7) {
						device.ConnectionType = info[4];
						device.Linkspeed = parseInt(info[5], 10);
						device.SignalStrength = parseInt(info[6], 10);
					}
					if (info.length >= 8) {
						device.AllowOrBlock = info[7];
					}
					devices.push(device);
				}
				return devices;
			});
			return Promise.resolve(devices);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _getAttachedDevices2() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices2');
		try {
			const message = soap.attachedDevices2(this.sessionId);
			const result = await this._makeRequest(soap.action.getAttachedDevices2, message);
			const patchedBody = result.body
				.replace(/&lt/g, '')
				.replace(/&gt/g, '')
				.replace(/<Name>/g, '<Name><![CDATA[')
				.replace(/<\/Name>/g, ']]></Name>')
				.replace(/<DeviceModel>/g, '<DeviceModel><![CDATA[')
				.replace(/<\/DeviceModel>/g, ']]></DeviceModel>')
				.replace(/<DeviceTypeName>/g, '<DeviceTypeName><![CDATA[')
				.replace(/<\/DeviceTypeName>/g, ']]></DeviceTypeName>')
				.replace(xml10pattern, '')
				.replace(/soap-env:envelope/gi, 'soap-env:envelope')
				.replace(/soap-env:body/gi, 'soap-env:body');

			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(patchedBody, parseOptions);
			let entries;
			try {
				entries = rawJson['soap-env:envelope']['soap-env:body']['m:GetAttachDevice2Response'].NewAttachDevice.Device;
			} catch (err) {
				// console.log(rawJson);
				// console.log(err);
				throw err;
			}
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					info[property] = entries[property]._text;
				}
			});
			if (entries === undefined) {
				throw Error(`Error parsing device-list (entries undefined) ${rawJson}`);
			}
			if (entries.length < 1) {
				throw Error('Error parsing device-list');
			}
			const entryCount = entries.length;
			const devices = [];
			for (let i = 0; i < entryCount; i += 1) {
				const device = new AttachedDevice();
				device.IP = entries[i].IP._text;						// e.g. '10.0.0.10'
				device.Name = entries[i].Name._cdata;				// '--' for unknown
				device.NameUserSet = (entries[i].NameUserSet._text === 'true');	// e.g. 'false'
				device.MAC = entries[i].MAC._text;					// e.g. '61:56:FA:1B:E1:21'
				device.ConnectionType = entries[i].ConnectionType._text;	// e.g. 'wired', '2.4GHz', 'Guest Wireless 2.4G'
				device.SSID = entries[i].SSID._text;				// e.g. 'MyWiFi'
				device.Linkspeed = entries[i].Linkspeed._text;
				device.SignalStrength = Number(entries[i].SignalStrength._text);	// number <= 100
				device.AllowOrBlock = entries[i].AllowOrBlock._text;			// 'Allow' or 'Block'
				device.Schedule = entries[i].Schedule._text;							// e.g. 'false'
				device.DeviceType = Number(entries[i].DeviceType._text);	// a number
				device.DeviceTypeUserSet = (entries[i].DeviceTypeUserSet._text === 'true');	// e.g. 'false',
				device.DeviceTypeName = '';	// unknown, found in orbi response
				device.DeviceModel = ''; // unknown, found in R7800 and orbi response
				device.DeviceModelUserSet = false; // // unknown, found in orbi response
				device.Upload = Number(entries[i].Upload._text);
				device.Download = Number(entries[i].Download._text);
				device.QosPriority = Number(entries[i].QosPriority._text);	// 1, 2, 3, 4
				device.Grouping = '0';
				device.SchedulePeriod = '0';
				device.ConnAPMAC = ''; // unknown, found in orbi response
				if (Object.keys(entries[i]).length >= 18) { // only available for certain routers?:
					device.DeviceModel = entries[i].DeviceModel._cdata; // '',
					device.Grouping = Number(entries[i].Grouping._text); // 0
					device.SchedulePeriod = Number(entries[i].SchedulePeriod._text); // 0
				}
				if (Object.keys(entries[i]).length >= 21) { // only available for certain routers?:
					device.DeviceTypeName = entries[i].DeviceTypeName._cdata; // '',
					device.DeviceModelUserSet = (entries[i].DeviceModelUserSet._text === 'true'); // e.g. 'false',
					device.ConnAPMAC = entries[i].ConnAPMAC._text; // MAC of connected orbi?
				}
				devices.push(device);
			}
			return Promise.resolve(devices);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _setGuestAccessEnabled(enabled) { // true or false
		// enable or disable 2.4Ghz-1 Guest Wifi
		// console.log('setGuestAccess requested');
		try {
			await this._configurationStarted();
			const message = soap.setGuestAccessEnabled(this.sessionId, enabled);
			await this._makeRequest(soap.action.setGuestAccessEnabled, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`setGuestAccessEnabled finished with warning.`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _setGuestAccessEnabled2(enabled) { // true or false
		// enable or disable 2.4Ghz-1 Guest Wifi on certain routers like R8000
		// console.log('setGuestAccess requested');
		try {
			await this._configurationStarted();
			const message = soap.setGuestAccessEnabled2(this.sessionId, enabled);
			await this._makeRequest(soap.action.setGuestAccessEnabled2, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`setGuestAccessEnabled2 finished with warning.`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _set5G1GuestAccessEnabled(enabled) { // true or false
		// enable or disable 5Ghz-1 Guest Wifi
		// console.log('setGuestAccess requested');
		await this._configurationStarted();
		const message = soap.set5G1GuestAccessEnabled(this.sessionId, enabled);
		await this._makeRequest(soap.action.set5G1GuestAccessEnabled, message);
		await this._configurationFinished()
			.catch(() => {
				// console.log(`set5G1GuestAccessEnabled finished with warning.`);
			});
		return Promise.resolve(true);
	}

	async _set5G1GuestAccessEnabled2(enabled) { // true or false
		// enable or disable 5Ghz-1 Guest Wifi on certain routers like R8000
		// console.log('setGuestAccess requested');
		await this._configurationStarted();
		const message = soap.set5G1GuestAccessEnabled2(this.sessionId, enabled);
		await this._makeRequest(soap.action.set5G1GuestAccessEnabled2, message);
		await this._configurationFinished()
			.catch(() => {
				// console.log(`set5G1GuestAccessEnabled2 finished with warning.`);
			});
		return Promise.resolve(true);
	}

	async _set5GGuestAccessEnabled2(enabled) { // true or false
		// enable or disable 5Ghz-2 Guest Wifi on certain routers like R8000
		// console.log('setGuestAccess requested');
		await this._configurationStarted();
		const message = soap.set5GGuestAccessEnabled2(this.sessionId, enabled);
		await this._makeRequest(soap.action.set5GGuestAccessEnabled2, message);
		await this._configurationFinished()
			.catch(() => {
				// console.log(`set5GGuestAccessEnabled2 finished with warning.`);
			});
		return Promise.resolve(true);
	}

	async _configurationStarted() {
		// Resolves promise of config start status. Rejects if error occurred.
		// console.log('start configuration');
		try {
			const message = soap.configurationStarted(this.sessionId);
			await this._makeRequest(soap.action.configurationStarted, message);
			this.configStarted = true;
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(Error(`Config started error: ${error}`));
		}
	}

	async _configurationFinished() {
		// Resolves promise of config finish status. Rejects if error occurred.
		// console.log('finish configuration');
		try {
			if (this.configStarted === false) {	// already finished
				return Promise.resolve(true);
			}
			this.configStarted = false;
			const message = soap.configurationFinished(this.sessionId);
			await this._makeRequest(soap.action.configurationFinished, message)
				.catch((err) => {	// config finished failed...
					this.configStarted = true;
					throw err;
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(Error(`Config finished error: ${error}`));
		}
	}

	async _getHostIp() {
		// sets and returns a promise of the IP address of the router, or rejects with an error
		try {
			const ipAddress = await dnsLookupPromise('routerlogin.net')
				.then(result => result.address)
				.catch(() => undefined);
			if (ipAddress) {
				this.host = ipAddress;
				return Promise.resolve(ipAddress);
			}
			// routerlogin.net could not be resolved
			const servers = dns.getServers() || [];
			const routerIp = servers[0];
			if (routerIp) {
				this.host = routerIp;
				return Promise.resolve(routerIp);
			}
			// no IP could be found
			throw Error('Host IP address could not be discovered');
		} catch (error) {
			this.lastResponse = error;
			return Promise.reject(error);
		}
	}

	async _getSoapPort() {
		// sets and returns a promise of the soap port (80 or 5000), or rejects with an error
		// this.host must be correctly set first
		try {
			if (!this.host || this.host === '') {
				throw Error('getSoapPort failed: Host ip is not set');
			}
			const portBefore = this.port;
			// try port 5000 first
			this.port = 5000;
			await this.login()
				.catch(() => false);
			if (JSON.stringify(this.lastResponse).includes('<ResponseCode>')) {
				return 5000;
			}
			// 5000 failed, try port 80 now
			this.port = 80;
			await this.login()
				.catch(() => false);
			if (JSON.stringify(this.lastResponse).includes('<ResponseCode>')) {
				return 80;
			}
			// no SOAP port found
			this.port = portBefore;
			throw Error('No valid SOAP port found on the host address');
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _makeRequest(action, message) {
		try {
			if (!this.loggedIn && action !== soap.action.login && action !== soap.action.loginOld) {
				return Promise.reject(Error('Not logged in'));
			}
			const headers = {
				SOAPAction: action,
				'Cache-Control': 'no-cache',
				'User-Agent': 'node-netgearjs',
				'Content-type': 'multipart/form-data',
				'Content-Length': Buffer.byteLength(message),
				Connection: 'Keep-Alive',
			};
			if (this.cookie) {
				headers.Cookie = this.cookie;
			}
			const options = {
				hostname: this.host,
				port: this.port,
				path: '/soap/server_sa/',
				headers,
				method: 'POST',
			};
			const result = await this._makeHttpRequest(options, message);
			if (result.headers['set-cookie']) {
				this.cookie = result.headers['set-cookie'];
			}
			if (result.statusCode !== 200) {
				this.lastResponse = result.statusCode;
				throw Error(`HTTP request Failed. Status Code: ${result.statusCode}`);
			}
			this.lastResponse = result.body;
			const responseCodeRegex = regexResponseCode.exec(result.body);
			if (responseCodeRegex === null) {
				throw Error('no response code from router');
			}
			const responseCode = Number(responseCodeRegex[1]);
			if (responseCode === 0) {
				return Promise.resolve(result);
			}
			// request failed
			if (responseCode === 401) {
				this.loggedIn = false;
				throw Error('Unauthorized. Incorrect username/password?');
			}
			throw Error(`Invalid response code from router: ${responseCode}`);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	_makeHttpRequest(options, postData) {
		return new Promise((resolve, reject) => {
			const req = http.request(options, (res) => {
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.once('end', () => {
					res.body = resBody;
					return resolve(res); // resolve the request
				});
			});
			req.write(postData);
			req.end();
			req.setTimeout(this.timeout, () => {
				req.abort();
			});
			req.once('error', (e) => {
				this.lastResponse = e;	// e.g. ECONNREFUSED on wrong soap port or wrong IP // ECONNRESET on wrong IP
				reject(e);
			});
		});
	}

}

module.exports = NetgearRouter;
