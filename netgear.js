/* eslint-disable prefer-destructuring */
/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017, 2018, Robin de Gruijter <gruijter@hotmail.com> */

'use strict';

const http = require('http');
const parseXml = require('xml-js');
const util = require('util');
const dns = require('dns');
const dgram = require('dgram');
// const net = require('net');
// const Buffer = require('buffer').Buffer;
const os = require('os');
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
const regexNewUplinkBandwidth = new RegExp(/<NewUplinkBandwidth>(.*)<\/NewUplinkBandwidth>/);
const regexNewDownlinkBandwidth = new RegExp(/<NewDownlinkBandwidth>(.*)<\/NewDownlinkBandwidth>/);
const regexNewSettingMethod = new RegExp(/<NewSettingMethod>(.*)<\/NewSettingMethod>/);
const regexUplinkBandwidth = new RegExp(/<NewOOKLAUplinkBandwidth>(.*)<\/NewOOKLAUplinkBandwidth>/);
const regexDownlinkBandwidth = new RegExp(/<NewOOKLADownlinkBandwidth>(.*)<\/NewOOKLADownlinkBandwidth>/);
const regexAveragePing = new RegExp(/<AveragePing>(.*)<\/AveragePing>/);
const regexParentalControl = new RegExp(/<ParentalControl>(.*)<\/ParentalControl>/);
const regexNewQoSEnableStatus = new RegExp(/<NewQoSEnableStatus>(.*)<\/NewQoSEnableStatus>/);
const regexNewBlockDeviceEnable = new RegExp(/<NewBlockDeviceEnable>(.*)<\/NewBlockDeviceEnable>/);
const regexNewTrafficMeterEnable = new RegExp(/<NewTrafficMeterEnable>(.*)<\/NewTrafficMeterEnable>/);
const regexNewControlOption = new RegExp(/<NewControlOption>(.*)<\/NewControlOption>/);
const regexNewMonthlyLimit = new RegExp(/<NewMonthlyLimit>(.*)<\/NewMonthlyLimit>/);
const regexRestartHour = new RegExp(/<RestartHour>(.*)<\/RestartHour>/);
const regexRestartMinute = new RegExp(/<RestartMinute>(.*)<\/RestartMinute>/);
const regexRestartDay = new RegExp(/<RestartDay>(.*)<\/RestartDay>/);

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
// 						+ '\u0001-\uD7FF'
// 						+ '\uE000-\uFFFD'
// 						+ '\ud800\udc00-\udbff\udfff'
// 						+ ']+';

class NetgearRouter {
	constructor(password, username, host, port) {
		this.host = host || defaultHost;
		this.port = port;
		this.username = username || defaultUser;
		this.password = password || defaultPassword;
		this.timeout = 20000;
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

	/**
	* Discovers a netgear router in the network. Also sets the discovered ip address and soap port for this session.
	* @returns {Promise<currentSetting>} The discovered router info, including host ip address and soap port.
	*/
	async discover() {
		try {
			const discoveredInfo = await this._discoverHostInfo();	// also adds host ip to discovered router info
			const soapPort = await this._getSoapPort(discoveredInfo.host);
			discoveredInfo.port = soapPort;	// add soap port to discovered router info
			this.host = discoveredInfo.host;
			this.port = discoveredInfo.port;
			return Promise.resolve(discoveredInfo);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Login to the router. Passing parameters will override the previous settings.
	* If host and port are not set, login will try to auto discover these.
	* @param {string} [password] - The login password.
	* @param {string} [user] - The login username.
	* @param {string} [host] - The url or ip address of the router.
	* @param {number} [port] - The SOAP port of the router.
	* @returns {Promise<loggedIn>} The loggedIn state.
	*/
	async login(password, username, host, port) {
		try {
			this.password = password || await this.password;
			this.username = username || await this.username;
			this.host = host || await this.host;
			this.port = port || await this.port;
			if (!this.host || this.host === '' || !this.port) {
				await this.discover()
					.catch(() => {
						throw Error('Cannot login: host IP and/or SOAP port not set');
					});
			}
			let loggedIn = false;
			// new login failed, trying new login method
			this.loginMethod = 2;
			const message = soap.login(this.sessionId, this.username, this.password);
			loggedIn = await this._makeRequest(soap.action.login, message)
				.catch(() => {
					this.cookie = undefined; // reset the cookie
					return false;
				});
			if (!loggedIn) {
				// trying old login method
				this.loginMethod = 1;
				const messageOld = soap.loginOld(this.sessionId, this.username, this.password);
				loggedIn = await this._makeRequest(soap.action.loginOld, messageOld)
					.catch(() => false);
			}
			if (!loggedIn) throw Error('Failed to login');
			this.loggedIn = true;
			return Promise.resolve(this.loggedIn);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Logout from the router.
	* @returns {Promise<loggedIn>} The loggedIn state.
	*/
	async logout() {
		try {
			const message = soap.logout(this.sessionId);
			await this._makeRequest(soap.action.logout, message);
			this.loggedIn = false;
			return Promise.resolve(this.loggedIn);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get router information without need for credentials.
	* @param {string} [host] - The url or ip address of the router.
	* @returns {Promise<currentSetting>}
	*/
	async getCurrentSetting(host) {
		try {
			const host1 = host || this.host;
			const headers = {
			};
			const options = {
				hostname: host1,
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
				currentSetting.host = host1; // add the host address to the information
				currentSetting.port = this.port; // add port address to the information
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
			throw Error('Unknow error');
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get router information.
	* @returns {Promise<info>}
	*/
	async getInfo() {
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
			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get router SupportFeatureList.
	* @returns {Promise<supportFeatureList>}
	*/
	async getSupportFeatureListXML() {
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
			const supportFeatureList = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					supportFeatureList[property] = entries[property]._text;
				}
			});
			return Promise.resolve(supportFeatureList);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get array of attached devices.
	* @returns {Promise.<AttachedDevice[]>}
	*/
	async getAttachedDevices() {
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

	/**
	* Get traffic meter statistics.
	* @returns {Promise.<trafficStatistics>}
	*/
	async getTrafficMeter() {
		try {
			const message = soap.trafficMeter(this.sessionId);
			const result = await this._makeRequest(soap.action.getTrafficMeter,	message);
			const newTodayUpload = Number(regexNewTodayUpload.exec(result.body)[1].replace(',', ''));
			const newTodayDownload = Number(regexNewTodayDownload.exec(result.body)[1].replace(',', ''));
			const newMonthUpload = Number(regexNewMonthUpload.exec(result.body)[1].split('/')[0].replace(',', ''));
			const newMonthDownload = Number(regexNewMonthDownload.exec(result.body)[1].split('/')[0].replace(',', ''));
			const trafficStatistics = {
				newTodayUpload, newTodayDownload, newMonthUpload, newMonthDownload,
			};
			return Promise.resolve(trafficStatistics);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get Parental Control Enable Status (true / false).
	* @returns {Promise.<parentalControlEnabled>}
	*/
	async getParentalControlEnableStatus() {
		try {
			await this._configurationStarted();
			const message = soap.getParentalControlEnableStatus(this.sessionId);
			const result = await this._makeRequest(soap.action.getParentalControlEnableStatus, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning`);
				});
			const parentalControlEnabled = regexParentalControl.exec(result.body)[1] === '1';
			return Promise.resolve(parentalControlEnabled);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Enable or Disable Parental Controls
	* @param {boolean} enable - true to enable, false to disable.
	* @returns {Promise<finished>}
	*/
	async enableParentalControl(enable) {
		try {
			await this._configurationStarted();
			const message = soap.enableParentalControl(this.sessionId, enable);
			await this._makeRequest(soap.action.enableParentalControl, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get QoS Enable Status (true / false).
	* @returns {Promise.<qosEnabled>}
	*/
	async getQoSEnableStatus() {
		try {
			await this._configurationStarted();
			const message = soap.getQoSEnableStatus(this.sessionId);
			const result = await this._makeRequest(soap.action.getQoSEnableStatus, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning`);
				});
			const qosEnabled = regexNewQoSEnableStatus.exec(result.body)[1] === '1';
			return Promise.resolve(qosEnabled);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Enable or Disable QoS
	* @param {boolean} enable - true to enable, false to disable.
	* @returns {Promise<finished>}
	*/
	async setQoSEnableStatus(enable) {
		try {
			await this._configurationStarted();
			const message = soap.setQoSEnableStatus(this.sessionId, enable);
			await this._makeRequest(soap.action.setQoSEnableStatus, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get Traffic Meter Enable Status (true / false).
	* @returns {Promise.<trafficMeterEnabled>}
	*/
	async getTrafficMeterEnabled() {
		try {
			const message = soap.getTrafficMeterEnabled(this.sessionId);
			const result = await this._makeRequest(soap.action.getTrafficMeterEnabled, message);
			const trafficMeterEnabled = regexNewTrafficMeterEnable.exec(result.body)[1] === '1';
			return Promise.resolve(trafficMeterEnabled);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get Traffic Meter options
	* @returns {Promise.<{newControlOption, newNewMonthlyLimit, restartHour, restartMinute, restartDay}>}
	*/
	async getTrafficMeterOptions() {
		try {
			const message = soap.getTrafficMeterOptions(this.sessionId);
			const result = await this._makeRequest(soap.action.getTrafficMeterOptions, message);
			const newControlOption = regexNewControlOption.exec(result.body)[1];
			const newNewMonthlyLimit = Number(regexNewMonthlyLimit.exec(result.body)[1].replace(',', ''));
			const restartHour = Number(regexRestartHour.exec(result.body)[1]);
			const restartMinute = Number(regexRestartMinute.exec(result.body)[1]);
			const restartDay = Number(regexRestartDay.exec(result.body)[1]);
			const trafficMeterOptions = {
				newControlOption, newNewMonthlyLimit, restartHour, restartMinute, restartDay,
			};
			return Promise.resolve(trafficMeterOptions);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Enable or Disable Traffic Meter statistics
	* @param {boolean} enable - true to enable, false to disable.
	* @returns {Promise<finished>}
	*/
	async enableTrafficMeter(enabled) { // true or false
		try {
			await this._configurationStarted();
			const message = soap.enableTrafficMeter(this.sessionId, enabled);
			await this._makeRequest(soap.action.enableTrafficMeter, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning.`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get Bandwidt Control options
	* @returns {Promise.<{newUplinkBandwidth, newDownlinkBandwidth, enabled}>}
	*/
	async getBandwidthControlOptions() {
		try {
			const message = soap.getBandwidthControlOptions(this.sessionId);
			const result = await this._makeRequest(soap.action.getBandwidthControlOptions, message);
			const newUplinkBandwidth = Number(regexNewUplinkBandwidth.exec(result.body)[1].replace(',', ''));
			const newDownlinkBandwidth = Number(regexNewDownlinkBandwidth.exec(result.body)[1].replace(',', ''));
			const enabled = Number(regexNewSettingMethod.exec(result.body)[1]);
			const bandwidthControlOptions = {
				newUplinkBandwidth, newDownlinkBandwidth, enabled,
			};
			return Promise.resolve(bandwidthControlOptions);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* sets Qos bandwidth options
	* @param {number} newUplinkBandwidth - maximum uplink bandwidth (Mb/s).
	* @param {number} newDownlinkBandwidth - maximum downlink bandwidth (Mb/s).
	* @returns {Promise<finished>}
	*/
	async setBandwidthControlOptions(newUplinkBandwidth, newDownlinkBandwidth) {
		try {
			await this._configurationStarted();
			const message = soap.setBandwidthControlOptions(this.sessionId, newUplinkBandwidth, newDownlinkBandwidth);
			await this._makeRequest(soap.action.setBandwidthControlOptions, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get BlockDeviceEnabled status (= device access control)
	* @returns {Promise<blockDeviceEnabled>}
	*/
	async getBlockDeviceEnableStatus() {
		try {
			const message = soap.getBlockDeviceEnableStatus(this.sessionId);
			const result = await this._makeRequest(soap.action.getBlockDeviceEnableStatus, message);
			const blockDeviceEnabled = regexNewBlockDeviceEnable.exec(result.body)[1] === '1';
			return Promise.resolve(blockDeviceEnabled);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Enable or Disable BlockDevice (= device access control)
	* @param {boolean} enable - true to enable, false to disable.
	* @returns {Promise<finished>}
	*/
	async setBlockDeviceEnable(enable) {
		try {
			await this._configurationStarted();
			const message = soap.setBlockDeviceEnable(this.sessionId, enable);
			await this._makeRequest(soap.action.setBlockDeviceEnable, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async enableBlockDeviceForAll() {	// deprecated? see setBlockDeviceEnable
		// enables Block Device (= access control). Rejects if error occurred.
		// console.log('enableBlockDeviceForAll started');
		try {
			await this._configurationStarted();
			const message = soap.enableBlockDeviceForAll(this.sessionId);
			await this._makeRequest(soap.action.enableBlockDeviceForAll, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Enable or Disable BlockDevice (= device access control)
	* @param {string} MAC - MAC address of the device to block or allow.
	* @param {string} AllowOrBlock - either 'Allow' or 'Block'.
	* @returns {Promise<MAC>}
	*/
	async setBlockDevice(MAC, AllowOrBlock) {
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

	/**
	* Get 2.4GHz-1 guest Wifi status
	* @returns {Promise<enabled>}
	*/
	async getGuestWifiEnabled() {
		try {
			const message = soap.getGuestAccessEnabled(this.sessionId);
			const result = await this._makeRequest(soap.action.getGuestAccessEnabled,	message);
			return Promise.resolve(result.body.includes('<NewGuestAccessEnabled>1</NewGuestAccessEnabled>'));
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Enable or Disable 2.4GHz-1 guest Wifi
	* @param {boolean} enable - true to enable, false to disable.
	* @returns {Promise<wifiSetMethod>}
	*/
	async setGuestWifi(enable) { // true or false
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

	/**
	* Get 5GHz-1 guest Wifi status
	* @returns {Promise<enabled>}
	*/
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

	/**
	* Enable or Disable 5GHz-1 guest Wifi
	* @param {boolean} enable - true to enable, false to disable.
	* @returns {Promise<wifiSetMethod>}
	*/
	async set5GGuestWifi(enable) { // true or false
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

	/**
	* Get 5GHz-2 guest Wifi status
	* @returns {Promise<enabled>}
	*/
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

	/**
	* Enable or Disable 5GHz-2 guest Wifi
	* @param {boolean} enable - true to enable, false to disable.
	* @returns {Promise<wifiSetMethod>}
	*/
	async set5GGuestWifi2(enable) { // true or false
		const method = await this._set5GGuestAccessEnabled2(enable);
		return Promise.resolve(method);
	}

	/**
	* Reboot the router
	* @returns {Promise<finished>}
	*/
	async reboot() {
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

	/**
	* Check present firmware level, and new firmware level if available
	* @returns {Promise<newFirmwareInfo>}
	*/
	async checkNewFirmware() {
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

	/**
	* Update the firmware of the router
	* @returns {Promise<finished>}
	*/
	async updateNewFirmware() {
		try {
			const message = soap.updateNewFirmware(this.sessionId);
			await this._makeRequest(soap.action.updateNewFirmware,	message);
			return Promise.resolve(true); // firmware update request successfull
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Perform Internet bandwidth speedtest (Note: takes a minute to respond)
	* @returns {Promise<speed>}
	*/
	async speedTest() {
		try {
			await this._speedTestStart();
			await setTimeoutPromise(55 * 1000, 'waiting is done');
			const speed = await this._getSpeedTestResult();
			return Promise.resolve(speed);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Send Wake On Lan command to a mac address
	* @param {string} MAC - MAC address of the device to wake.
	* @param {string} [secureOnPassword = '00:00:00:00:00:00'] - optional WOL Password.
	* @returns {Promise<finished>}
	*/
	async wol(MAC, secureOnPassword) {
		try {
			// const getBroadcastAddr = (ip, netmask) => {
			// 	const a = ip.split('.').map(s => parseInt(s, 10));
			// 	const b = netmask.split('.').map(s => parseInt(s, 10));
			// 	const c = [];
			// 	// eslint-disable-next-line no-bitwise
			// 	for (let i = 0; i < a.length; i += 1) c.push((a[i] & b[i]) | (b[i] ^ 255));
			// 	return c.join('.');
			// };
			// const address = getBroadcastAddr(iface.address, iface.netmask);
			const options = {
				port: 9,
				address: '255.255.255.255',
			};
			const result = await this._sendWol(MAC, secureOnPassword, options);
			return result;
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
				device.NameUserSet = (entries[i].NameUserSet._text === 'true');	// e.g. false
				device.MAC = entries[i].MAC._text;					// e.g. '61:56:FA:1B:E1:21'
				device.ConnectionType = entries[i].ConnectionType._text;	// e.g. 'wired', '2.4GHz', 'Guest Wireless 2.4G'
				device.SSID = entries[i].SSID._text;				// e.g. 'MyWiFi'
				device.Linkspeed = Number(entries[i].Linkspeed._text);	// e.g. 38
				device.SignalStrength = Number(entries[i].SignalStrength._text);	// number <= 100
				device.AllowOrBlock = entries[i].AllowOrBlock._text;			// 'Allow' or 'Block'
				device.Schedule = entries[i].Schedule._text;							// e.g. false
				device.DeviceType = Number(entries[i].DeviceType._text);	// a number
				device.DeviceTypeUserSet = (entries[i].DeviceTypeUserSet._text === 'true');	// e.g. false,
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
					device.DeviceModelUserSet = (entries[i].DeviceModelUserSet._text === 'true'); // e.g. false,
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

	async _discoverHostInfo() {
		// returns a promise of the netgear router info including host IP address, or rejects with an error
		try {
			let info = await dnsLookupPromise('routerlogin.net')
				.then((netgear) => {
					const hostToTest = netgear.address || netgear;	// weird, sometimes it doesn't have .address
					return this.getCurrentSetting(hostToTest);
				})
				.catch(() => undefined);
			if (!info) {	// routerlogin.net is not working...
				[info] = await this._discoverAllHostsInfo();
			}
			if (!info) {
				throw Error('Netgear host could not be discovered');
			}
			return Promise.resolve(info);	// info.host has the ipAddress
		} catch (error) {
			this.lastResponse = error;
			return Promise.reject(error);
		}
	}

	async _discoverAllHostsInfo() {
		// returns a promise with an array of info on all discovered netgears, assuming class C network, or rejects with an error
		const timeOutBefore = this.timeout;
		try {
			const hostsToTest = [];	// make an array of all host IP's in the LAN
			// const servers = dns.getServers() || [];	// get the IP address of all routers in the LAN
			const networks = [];
			const ifaces = os.networkInterfaces();	// get ip address info from all network interfaces
			Object.keys(ifaces).forEach((ifName) => {
				ifaces[ifName].forEach((iface) => {
					if (iface.family === 'IPv4' && !iface.internal) {
						networks.push(iface);
					}
				});
			});
			networks.map((network) => {
				for (let host = 1; host <= 254; host += 1) {
					const ipToTest = network.address.replace(/\.\d+$/, `.${host}`);
					hostsToTest.push(ipToTest);
				}
				return hostsToTest;
			});
			this.timeout = 3000;	// temporarily set http timeout to 3 seconds
			const allHostsPromise = hostsToTest.map(async (hostToTest) => {
				const result = await this.getCurrentSetting(hostToTest)
					.catch(() => undefined);
				return result;
			});
			const allHosts = await Promise.all(allHostsPromise);
			const discoveredHosts = allHosts.filter(host => host);
			this.timeout = timeOutBefore;	// reset the timeout
			return Promise.resolve(discoveredHosts);
		} catch (error) {
			this.timeout = timeOutBefore;
			this.lastResponse = error;
			return Promise.reject(error);
		}
	}

	async _getSoapPort(host1) {
		// returns a promise of the soap port (80 or 5000 or undefined), or rejects with an error
		try {
			if (!host1 || host1 === '') {
				throw Error('getSoapPort failed: Host ip is not provided');
			}
			const portBefore = this.port;
			let soapPort;
			// try port 5000 first
			this.port = 5000;
			await this.login()
				.catch(() => false);
			if (JSON.stringify(this.lastResponse).includes('<ResponseCode>')) {
				soapPort = 5000;
			} else { 	// 5000 failed, try port 80 now
				this.port = 80;
				await this.login()
					.catch(() => false);
				if (JSON.stringify(this.lastResponse).includes('<ResponseCode>')) {
					soapPort = 80;
				}
			}
			this.port = portBefore;
			return soapPort;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _sendWol(mac, secureOnPassword, options) {
		try {
			// check if mac is valid
			const macPatched = mac.replace(/:/g, '');
			if (macPatched.length !== 12 || macPatched.match(/[^a-fA-F0-9]/)) {
				throw new Error(`Invalid MAC address: ${mac}`);
			}
			// check if password is valid
			const password = secureOnPassword || '00'.repeat(6);
			const passwordPatched = password.replace(/:/g, '');
			if (passwordPatched.length !== 12 || passwordPatched.match(/[^a-fA-F0-9]/)) {
				throw new Error(`Invalid secureOn password: ${secureOnPassword}`);
			}
			// create magic packet
			const magicPacket = Buffer.from('ff'.repeat(6) + macPatched.repeat(16) + passwordPatched, 'hex');
			// set the options to broadcast on port 9
			await this._makeUdpRequest(options, magicPacket);
			return Promise.resolve(mac);
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
			this.lastResponse = result.body;
			if (result.headers['set-cookie']) {
				this.cookie = result.headers['set-cookie'];
			}
			if (result.statusCode !== 200) {
				this.lastResponse = result.statusCode;
				throw Error(`HTTP request Failed. Status Code: ${result.statusCode}`);
			}
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

	_makeUdpRequest(options, msg) {
		return new Promise((resolve, reject) => {
			const broadcast = '255.255.255.255';
			// const protocol = net.isIPv6(options.address) ? 'udp6' : 'udp4';
			const client = dgram.createSocket('udp4');
			client.once('listening', () => {
				client.setBroadcast(options.address === broadcast);
			});
			client.once('error', (e) => {
				client.close();
				this.lastResponse = e;
				reject(e);
			});
			client.send(msg, options.port, options.address, (e) => {
				client.close();
				if (e) {
					this.lastResponse = e;
					return reject(e);
				}
				return resolve(true);
			});
		});
	}

}

module.exports = NetgearRouter;


// definitions for JSDoc

/**
* @class NetgearRouter
* @classdesc Class representing a session with a Netgear router.

* @param {string} [password = 'password'] - The login password.
* @param {string} [user = 'admin'] - The login username.
* @param {string} [host = 'routerlogin.net'] - The url or ip address of the router. Leave empty to try autodiscovery.
* @param {number} [port] - The SOAP port of the router. Leave empty to try autodiscovery.
* @property {number} timeout - http timeout in milliseconds. Defaults to 20000.
* @property {boolean} loggedIn - login state.
* @example // create a router session, login to router, fetch attached devices
	const Netgear = require('netgear');

	const router = new Netgear();

	async function getDevices() {
		try {
			await router.login('myPassword');
			const deviceArray = await router.getAttachedDevices();
			console.log(deviceArray);
		} catch (error) {
			console.log(error);
		}
	}

	getDevices();
	*/


/**
* @typedef AttachedDevice
* @description Object representing the state of a device attached to the Netgear router.
* @property {string} ip - e.g. '10.0.0.10'
* @property {string} Name - '--' for unknown.
* @property {boolean} NameUserSet - e.g. false
* @property {string} MAC - e.g. '61:56:FA:1B:E1:21'
* @property {string} ConnectionType - e.g. 'wired', '2.4GHz', 'Guest Wireless 2.4G'
* @property {string} SSID - e.g. 'MyWiFi'
* @property {number} LinkSpeed - e.g. 38
* @property {number} SignalStrength - number <= 100
* @property {string} AllowOrBlock - e.g. 'Allow'
* @property {boolean} Schedule - e.g. false
* @property {number} DeviceType - e.g. 20
* @property {boolean} DeviceTypeUserSet - e.g. true
* @property {string} DeviceTypeName - e.g. ''
* @property {string} DeviceModel - e.g. ''
* @property {boolean} DeviceModelUserSet - e.g. false
* @property {number} Upload - e.g. 0
* @property {number} Download - e.g. 0
* @property {number} QosPriority - e.g. 2
* @property {number} Grouping - e.g. 0
* @property {number} SchedulePeriod - e.g. 0
* @property {string} ConnAPMAC - e.g. ''
* @example // AttachedDevice
{ IP: 192.168.1.24,
  Name: 'MyIPHONE',
  NameUserSet: true,
  MAC: 'E1:4F:25:68:34:BA',
  ConnectionType: '2.4GHz',
  SSID: 'MyNetworkID',
  Linkspeed: 70
  SignalStrength: 64,
  AllowOrBlock: 'Allow',
  Schedule: 'false',
  DeviceType: 17,
  DeviceTypeUserSet: true,
  DeviceTypeName: '',
  DeviceModelUserSet: false,
  Upload: 0,
  Download: 0,
  QosPriority: 3,
  Grouping: 0,
  SchedulePeriod: 0,
  ConnAPMAC: '' }
*/

/**
* @typedef currentSetting
* @description currentSetting is an object with properties similar to this.
* @property {string} Firmware: e.g. 'V1.0.2.60WW'
* @property {string} RegionTag e.g. 'R7800_WW'
* @property {string} Region e.g. 'ww'
* @property {string} Model  e.g. 'R7800'
* @property {string} InternetConnectionStatus e.g. 'Up'
* @property {string} ParentalControlSupported e.g. '1'
* @property {string} SOAPVersion e.g. '3.43'
* @property {string} ReadyShareSupportedLevel e.g. '29'
* @property {string} XCloudSupported e.g. '1'
* @property {string} LoginMethod e.g. '2.0'
* @property {string} host e.g. '192.168.1.1'
* @property {string} port e.g. '80'
* @example // currentSetting (depending on router type)
{ Firmware: 'V1.0.2.60WW',
  RegionTag: 'R7800_WW',
  Region: 'ww',
  Model: 'R7800',
  InternetConnectionStatus: 'Up',
  ParentalControlSupported: '1',
  SOAPVersion: '3.43',
  ReadyShareSupportedLevel: '29',
  XCloudSupported: '1',
  LoginMethod: '2.0',
  host: '192.168.1.1',
  port: 80 }
*/

/**
* @typedef info
* @description info is an object with properties similar to this.
* @property {string} ModelName e.g. 'R7800'
* @property {string} Description e.g. 'Netgear Smart Wizard 3.0, specification 1.6 version'
* @property {string} SerialNumber e.g. '1LG23B71067B2'
* @property {string} Firmwareversion  e.g. 'V1.0.2.60'
* @property {string} SmartAgentversion e.g. '3.0'
* @property {string} FirewallVersion e.g. 'net-wall 2.0'
* @property {string} VPNVersion e.g. undefined
* @property {string} OthersoftwareVersion e.g. 'N/A'
* @property {string} Hardwareversion e.g. 'R7800'
* @property {string} Otherhardwareversion e.g. 'N/A'
* @property {string} FirstUseDate e.g. 'Saturday, 20 Feb 2016 23:40:20'
* @property {string} DeviceName e.g. 'R7800'
* @property {string} FirmwareDLmethod e.g. 'HTTPS'
* @property {string} FirmwareLastUpdate e.g. '2018_10.23_11:47:18'
* @property {string} FirmwareLastChecked e.g. '2018_11.14_15:5:37'
* @property {string} DeviceMode e.g. '0'
* @property {string} DeviceModeCapability e.g. '0;1;2'
* @property {string} DeviceNameUserSet e.g. 'false'
* @example // info (depending on router type)
{ ModelName: 'R7800',
  Description: 'Netgear Smart Wizard 3.0, specification 1.6 version',
  SerialNumber: '**********',
  Firmwareversion: 'V1.0.2.60',
  SmartAgentversion: '3.0',
  FirewallVersion: 'net-wall 2.0',
  VPNVersion: undefined,
  OthersoftwareVersion: 'N/A',
  Hardwareversion: 'R7800',
  Otherhardwareversion: 'N/A',
  FirstUseDate: 'Sunday, 30 Sep 2007 01:10:03',
  DeviceName: 'R7800',
  FirmwareDLmethod: 'HTTPS',
  FirmwareLastUpdate: '2018_10.23_11:47:18',
  FirmwareLastChecked: '2018_11.25_20:29:3',
  DeviceMode: '0',
  DeviceModeCapability: '0;1;2',
  DeviceNameUserSet: 'false' }
*/

/**
* @typedef supportFeatureList
* @description supportFeatureList is an object with properties similar to this.
* @property {string} DynamicQoS e.g. '1.0'
* @property {string} OpenDNSParentalControl e.g. '1.0'
* @property {string} AccessControl e.g. '1.0'
* @property {string} SpeedTest  e.g. '2.0'
* @property {string} GuestNetworkSchedule e.g. '1.0'
* @property {string} TCAcceptance e.g. '1.0'
* @property {string} DeviceTypeIdentification e.g. '1.0'
* @property {string} AttachedDevice e.g. '2.0'
* @property {string} NameNTGRDevice e.g. '1.0'
* @property {string} SmartConnect e.g. '2.0'
* @property {string} MaxMonthlyTrafficLimitation e.g. '4095000000'
* @example // supportFeatureList (depending on router type)
{ DynamicQoS: '1.0',
  OpenDNSParentalControl: '1.0',
  AccessControl: '1.0',
  SpeedTest: '2.0',
  GuestNetworkSchedule: '1.0',
  TCAcceptance: '1.0',
  DeviceTypeIdentification: '1.0',
  AttachedDevice: '2.0',
  NameNTGRDevice: '1.0',
  SmartConnect: '2.0',
  MaxMonthlyTrafficLimitation: '4095000000' }
*/

/**
* @typedef trafficStatistics
* @description trafficStatistics is an object with these properties (in Mbytes).
* @property {number} newTodayUpload e.g. 561.29
* @property {number} newTodayDownload e.g. 5436
* @property {number} newMonthUpload e.g. 26909
* @property {number} newMonthDownload  e.g. 151850
* @example // trafficStatitics
{ newTodayUpload: 92.15,
  newTodayDownload: 743.3,
  newMonthUpload: 92.15,
  newMonthDownload: 743.3 }
*/

/**
* @typedef newFirmwareInfo
* @description newFirmwareInfo is an object with these properties.
* @property {string} currentVersion e.g. 'V1.0.2.60'
* @property {string} newVersion e.g. ''
* @property {string} releaseNote e.g. ''
* @example // trafficStatitics
{ currentVersion: 'V1.0.2.60', newVersion: '', releaseNote: '' }
*/
