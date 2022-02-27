/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017 - 2022, Robin de Gruijter <gruijter@hotmail.com> */

/* eslint-disable no-await-in-loop */
/* eslint-disable prefer-destructuring */
/* eslint-disable max-classes-per-file */

'use strict';

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const http = require('http');
const https = require('https');
const parseXml = require('xml-js');
const Queue = require('smart-request-balancer');
const util = require('util');
const dns = require('dns');
const dgram = require('dgram');
// const net = require('net');
// const Buffer = require('buffer').Buffer;
const os = require('os');
const soap = require('./soapcalls');
// const { hasUncaughtExceptionCaptureCallback } = require('process');

const setTimeoutPromise = util.promisify(setTimeout);
const dnsLookupPromise = util.promisify(dns.lookup);

const regexResponseCode = /<ResponseCode>(.*)<\/ResponseCode>/;
const regexAttachedDevices = /<NewAttachDevice>(.*)<\/NewAttachDevice>/s;
const regexAllowedDevices = /<NewAllowDeviceList>(.*)<\/NewAllowDeviceList>/s;
const regexNewTodayUpload = /<NewTodayUpload>(.*)<\/NewTodayUpload>/;
const regexNewTodayDownload = /<NewTodayDownload>(.*)<\/NewTodayDownload>/;
const regexNewMonthUpload = /<NewMonthUpload>(.*)<\/NewMonthUpload>/;
const regexNewMonthDownload = /<NewMonthDownload>(.*)<\/NewMonthDownload>/;
const regexCurrentVersion = /<CurrentVersion>(.*)<\/CurrentVersion>/;
const regexNewVersion = /<NewVersion>(.*)<\/NewVersion>/;
const regexReleaseNote = /<ReleaseNote>(.*)<\/ReleaseNote>/s;
const regexNewUplinkBandwidth = /<NewUplinkBandwidth>(.*)<\/NewUplinkBandwidth>/;
const regexNewDownlinkBandwidth = /<NewDownlinkBandwidth>(.*)<\/NewDownlinkBandwidth>/;
const regexCurrentDeviceBandwidth = /<NewCurrentDeviceBandwidth>(.*)<\/NewCurrentDeviceBandwidth>/;
const regexCurrentDeviceUpBandwidth = /<NewCurrentDeviceUpBandwidth>(.*)<\/NewCurrentDeviceUpBandwidth>/;
const regexCurrentDeviceDownBandwidth = /<NewCurrentDeviceDownBandwidth>(.*)<\/NewCurrentDeviceDownBandwidth>/;
const regexNewSettingMethod = /<NewSettingMethod>(.*)<\/NewSettingMethod>/;
const regexUplinkBandwidth = /<NewOOKLAUplinkBandwidth>(.*)<\/NewOOKLAUplinkBandwidth>/;
const regexDownlinkBandwidth = /<NewOOKLADownlinkBandwidth>(.*)<\/NewOOKLADownlinkBandwidth>/;
const regexAveragePing = /<AveragePing>(.*)<\/AveragePing>/;
const regexParentalControl = /<ParentalControl>(.*)<\/ParentalControl>/;
const regexNewQoSEnableStatus = /<NewQoSEnableStatus>(.*)<\/NewQoSEnableStatus>/;
const regexNewSmartConnectEnable = /<NewSmartConnectEnable>(.*)<\/NewSmartConnectEnable>/;
const regexNewBlockDeviceEnable = /<NewBlockDeviceEnable>(.*)<\/NewBlockDeviceEnable>/;
const regexNewTrafficMeterEnable = /<NewTrafficMeterEnable>(.*)<\/NewTrafficMeterEnable>/;
const regexNewControlOption = /<NewControlOption>(.*)<\/NewControlOption>/;
const regexNewMonthlyLimit = /<NewMonthlyLimit>(.*)<\/NewMonthlyLimit>/;
const regexRestartHour = /<RestartHour>(.*)<\/RestartHour>/;
const regexRestartMinute = /<RestartMinute>(.*)<\/RestartMinute>/;
const regexRestartDay = /<RestartDay>(.*)<\/RestartDay>/;
const regexNewAvailableChannel = /<NewAvailableChannel>(.*)<\/NewAvailableChannel>/;
const regexNewChannel = /<NewChannel>(.*)<\/NewChannel>/;
const regexNew5GChannel = /<New5GChannel>(.*)<\/New5GChannel>/;
const regexNew5G1Channel = /<New5G1Channel>(.*)<\/New5G1Channel>/;
const regexNewLogDetails = /<NewLogDetails>(.*)<\/NewLogDetails>/s;
const regexSysUpTime = /<SysUpTime>(.*)<\/SysUpTime>/;
const regexNewEthernetLinkStatus = /<NewEthernetLinkStatus>(.*)<\/NewEthernetLinkStatus>/;

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
		this.DeviceTypeV2 = undefined;	// e.g. 1, found in R7000 response
		this.DeviceTypeUserSet = undefined;	// e.g. 'false',
		this.DeviceTypeName = undefined;	// unknown, found in orbi response
		this.DeviceTypeNameV2 = undefined;	// 'Computer (Generic)', found in R7000 response
		this.DeviceModel = undefined; // unknown, found in R7800 and orbi response
		this.DeviceModelUserSet = undefined; // boolean , found in orbi response
		this.Upload = undefined;	// e.g. 0
		this.Download = undefined;	// e.g. 0
		this.QosPriority = undefined;	// 1, 2, 3, 4
		this.Grouping = undefined; // e.g. 0
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

const patchBody = (body) => body
	.replace(xml10pattern, '')
	.replace(/soap-env:envelope/gi, 'v:Envelope')
	.replace(/soap-env:body/gi, 'v:Body');

class NetgearRouter {
	// password, username, host and port are deprecated. Now use { password: '', username: '', host:'routerlogin.net', port: 80, timeout: 19000, tls: false}
	constructor(opts, username, host, port) {
		const options = opts || {};
		this.host = options.host || host || defaultHost;
		this.port = options.port || port;	// defaults with tls: 443, 5555. no tls: 5000, 80
		this.tls = options.tls === undefined ? (this.port !== 80) : options.tls; // set tls true as default, except when using port 80
		this.username = options.username || username || defaultUser;
		this.password = options.password || opts || defaultPassword;
		this.timeout = options.timeout || 18000;
		this.sessionId = defaultSessionId;
		this.cookie = undefined;
		this.loggedIn = false;
		this.configStarted = false;
		this.soapVersion = undefined;	// 2 or 3
		this.loginMethod = undefined;	// 2 for newer models, 1 for old models
		this.getAttachedDevicesMethod = undefined;	// 2 or 1
		this.checkNewFirmwareMethod = undefined;	// 2 or 1
		this.guestWifiMethod = {
			set24_1: undefined,
			get50_1: undefined,
			set50_1: undefined,
		};
		this.lastResponse = undefined;
		this._initQueue();
	}

	/**
	* Discovers a netgear router in the network. Also sets the discovered ip address and soap port for this session.
	* @returns {Promise.<currentSetting>} The discovered router info, including host ip address and soap port.
	*/
	async discover() {
		try {
			const discoveredInfo = await this._discoverHostInfo();
			this.host = discoveredInfo.host;
			this.port = discoveredInfo.port;
			this.tls = discoveredInfo.tls;
			return Promise.resolve(discoveredInfo);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Login to the router. Passing options will override any existing session settings.
	* If host or port are not set, login will try to auto discover these.
	* @param {sessionOptions} [options] - configurable session options
	* @returns {Promise.<loggedIn>} The loggedIn state.
	*/
	async login(opts, username, host, port) {
		try {
			const options = opts || {};
			if (typeof opts === 'string') {
				this.password = opts;
			} else {
				this.password = options.password || this.password;
			}
			this.host = options.host || host || await this.host;
			this.port = options.port || port || await this.port;
			this.tls = options.tls === undefined ? await this.tls : options.tls;
			this.username = options.username || username || this.username;
			this.timeout = options.timeout || this.timeout;
			if (!this.host || this.host === '') {
				await this.discover()
					.catch(() => {
						throw Error('Cannot login: host IP and/or SOAP port not set');
					});
			}
			// discover soap port, tls and login method supported by router
			if (!this.loginMethod || !this.port) {
				const currentSetting = await this.getCurrentSetting(); // will set this.loginMethod
				if (!this.port) this.port = currentSetting.port; // keep manually set port
				if (this.tls === undefined) this.tls = currentSetting.tls; // keep manual set tls
			}
			let loggedIn = false;
			const messageNew = soap.login(this.sessionId, this.username, this.password);
			const messageOld = soap.loginOld(this.sessionId, this.username, this.password);
			// use old method if opts method 1 selected, or auto method selected and loginMethod < 2
			if (options.method === 1 || (!options.method && this.loginMethod < 2)) {
				this.cookie = undefined; // reset the cookie
				loggedIn = await this._queueMessage(soap.action.loginOld, messageOld)
					.then(() => true)
					.catch(() => false);
			}
			// use new method if opts method 2 selected, or auto method selected and loginMethod = 2
			if (options.method === 2 || (!options.method && this.loginMethod >= 2)) {
				loggedIn = await this._queueMessage(soap.action.login, messageNew)
					.then(() => true)
					.catch(() => {
						this.cookie = undefined; // reset the cookie
						return false;
					});
			}
			// use old login method as first fallback, only if auto method selected
			if (!options.method && !loggedIn) {
				loggedIn = await this._queueMessage(soap.action.loginOld, messageOld)
					.then(() => true)
					.catch(() => false);
			}
			// use new login method as second fallback, only if auto method selected
			if (!options.method && !loggedIn) {
				loggedIn = await this._queueMessage(soap.action.login, messageNew)
					.catch(() => {
						this.cookie = undefined; // reset the cookie
						return false;
					});
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
	* @returns {Promise.<loggedIn>} The loggedIn state.
	*/
	async logout() {
		try {
			const message = soap.logout(this.sessionId);
			await this._queueMessage(soap.action.logout, message);
			this.loggedIn = false;
			return Promise.resolve(this.loggedIn);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get router information without need for credentials. Autodiscovers the SOAP port and TLS
	* @param {string} [host] - The url or ip address of the router.
	* @returns {Promise.<currentSetting>}
	*/
	async getCurrentSetting(host, timeout) {
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
			const result = await this._makeHttpRequest(options, '', timeout);
			this.lastResponse = result.body;
			// request failed
			if (result.statusCode !== 200) {
				throw Error(`HTTP request Failed. Status Code: ${result.statusCode}`);
			}
			if (!result.body.includes('Model=')) {
				throw Error('This is not a valid Netgear router');
			}
			// request successfull
			const currentSetting = {};
			const entries = result.body.split(/[\r\n\t\s]+/gm);
			Object.keys(entries).forEach((entry) => {
				const info = entries[entry].split('=');
				if (info.length === 2) {
					currentSetting[info[0]] = info[1];
				}
			});
			currentSetting.host = host1; // add the host address to the information
			currentSetting.port = await this._getSoapPort(host1); // add port address to the information
			currentSetting.tls = false;
			if (currentSetting.port === 443 || currentSetting.port === 5555) currentSetting.tls = true; // add tls to the information
			this.loginMethod = Number(currentSetting.LoginMethod) || 1;
			this.soapVersion = parseInt(currentSetting.SOAPVersion, 10) || 2;
			return Promise.resolve(currentSetting);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get system Info.
	* @returns {Promise.<systemInfo>}
	*/
	async getSystemInfo() {
		try {
			const message = soap.getSystemInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.getSystemInfo, message);
			// parse xml to json object
			const parseOptions = {
				compact: true, nativeType: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetSystemInfoResponse'];
			const systemInfo = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					systemInfo[property] = entries[property]._text;
				}
			});
			return Promise.resolve(systemInfo);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get router logs.
	* @param {boolean} [parse = false] - will parse the results to json if true
	* @returns {Promise.<logs>}
	*/
	async getSystemLogs(parse) {
		try {
			const message = soap.getSystemLogs(this.sessionId);
			const result = await this._queueMessage(soap.action.getSystemLogs, message);
			if (!result.body.includes('</NewLogDetails>')) throw Error('Incorrect or incomplete response from router');
			const raw = regexNewLogDetails.exec(result.body)[1];
			const entries = raw
				.split(/[\r\n]+/gm)
				.filter((entry) => entry.length > 0);
			if (entries.length < 1) {
				throw Error('No log entries found');
			}
			if (!parse) {
				return Promise.resolve(entries);
			}
			// start parsing stuff
			const logs = entries
				.map((entry) => {
					const items = entry.split(',');
					return {
						string: entry,
						event: `${entry.split(']')[0]}`.replace(/[[\]]/g, ''),
						info: items[0].split(']')[1] ? items[0].split(']')[1].trim() : undefined,
						ts: Date.parse(`${items[items.length - 2]}, ${items[items.length - 1]}`),
					};
				});
			return Promise.all(logs);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get router uptime since last boot.
	* @returns {Promise.<hh:mm:ss>}
	*/
	async getSysUpTime() {
		try {
			const message = soap.getSysUpTime(this.sessionId);
			const result = await this._queueMessage(soap.action.getSysUpTime, message);
			if (!result.body.includes('</SysUpTime>')) throw Error('Incorrect or incomplete response from router');
			const sysUpTime = regexSysUpTime.exec(result.body)[1];
			return Promise.resolve(sysUpTime);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* @typedef NTPservers
	* @description TimeZoneInfo is an object with these properties.
	* @property {string} NTPServer1 e.g. 'time-g.netgear.com'
	* @property {string} NTPServer2 e.g. 'time-g.netgear.com'
	* @property {string} NTPServer3 e.g. 'time-g.netgear.com'
	* @property {string} NTPServer4 e.g. 'time-g.netgear.com'
	* @example // NTPservers
{
	NTPServer1: 'time-g.netgear.com',
	NTPServer2: 'time-g.netgear.com',
	NTPServer3: 'time-g.netgear.com',
	NTPServer4: 'time-g.netgear.com'
}
	*/

	/**
	* Get NTP servers.
	* @returns {Promise.<NTPservers>}
	*/
	async getNTPServers() {
		try {
			const message = soap.getNTPServers(this.sessionId);
			const result = await this._queueMessage(soap.action.getNTPServers, message);
			if (!result.body.includes('m:GetInfoResponse')) throw Error('Incorrect or incomplete response from router');
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetInfoResponse'];
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					const propname = property.replace('New', '');
					info[propname] = entries[property]._text;
				}
			});
			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* @typedef timeZoneInfo
	* @description TimeZoneInfo is an object with these properties.
	* @property {string} TimeZone e.g. '+1'
	* @property {string} DaylightSaving e.g. '0'
	* @property {string} IndexValue e.g. '19'
	* @example // timeZoneInfo
{ TimeZone: '+1', DaylightSaving: '0', IndexValue: '19' }
	*/

	/**
	* Get TimeZone.
	* @returns {Promise.<timeZoneInfo>}
	*/
	async getTimeZoneInfo() {
		try {
			const message = soap.getTimeZoneInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.getTimeZoneInfo, message);
			if (!result.body.includes('m:GetTimeZoneInfoResponse')) throw Error('Incorrect or incomplete response from router');

			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetTimeZoneInfoResponse'];
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					const propname = property.replace('New', '');
					// propname = propname.charAt(0).toLowerCase() + propname.slice(1);
					info[propname] = entries[property]._text;
				}
			});

			// const regExTimeZone = /<NewTimeZone>(.*)<\/NewTimeZone>/;
			// const regExDaylightSaving = /<NewDaylightSaving>(.*)<\/NewDaylightSaving>/;
			// const regExIndexValue = /<NewIndexValue>(.*)<\/NewIndexValue>/;
			// const info = {
			// 	timeZone: result.body.match(regExTimeZone)[1],
			// 	daylightSaving: result.body.match(regExDaylightSaving)[1],
			// 	indexValue: result.body.match(regExIndexValue)[1],
			// };

			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get router information.
	* @returns {Promise.<info>}
	*/
	async getInfo() {
		try {
			const message = soap.getInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.getInfo,	message);
			// const patchedBody = patchBody(result.body);
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetInfoResponse'];
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					const propname = property.replace('New', '');
					info[propname] = entries[property]._text;
				}
			});
			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get router SupportFeatureList.
	* @returns {Promise.<supportFeatureList>}
	*/
	async getSupportFeatureListXML() {
		try {
			const message = soap.getSupportFeatureListXML(this.sessionId);
			const result = await this._queueMessage(soap.action.getSupportFeatureListXML, message);
			// const patchedBody = patchBody(result.body);
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetSupportFeatureListXMLResponse'].newFeatureList.features;
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
	* Get Device Config.
	* @returns {Promise.<deviceConfig>}
	*/
	async getDeviceConfig() {
		try {
			const message = soap.getDeviceConfig(this.sessionId);
			const result = await this._queueMessage(soap.action.getDeviceConfig, message);
			// const patchedBody = patchBody(result.body);
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetInfoResponse'];
			const deviceConfig = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					deviceConfig[property] = entries[property]._text;
				}
			});
			return Promise.resolve(deviceConfig);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get Allowed Device list.
	* @returns {Promise.<allowedDevice[]>}
	*/
	async getDeviceListAll() {
		try {
			const message = soap.getDeviceListAll(this.sessionId);
			const result = await this._queueMessage(soap.action.getDeviceListAll, message);
			const devices = [];
			const body = result.body
				.replace(/&amp;/gi, '&')
				.replace(/&lt;/gi, '<')
				.replace(/&gt;/gi, '>');
			const raw = regexAllowedDevices.exec(body)[1];
			const entries = raw.split('@');
			entries.forEach((entry, index) => {
				const info = entry.split(';');
				// info must be larger then 0 chars
				if (info.length === 0) {
					throw Error('Error parsing device-list');
				}
				// check if first entry is number of entries
				if (index === 0 && info.length === 1) {
					if (Number(entry) !== entries.length - 1) throw Error('Error parsing device-list - number mismatch');
					return;
				}
				// error when not enough info elements
				if (info.length < 4) throw Error('Error parsing device-list - not enough elements');
				// throw error on invalid mac format
				if (info[1].length !== 17) throw Error('Error parsing device-list - invalid mac format');
				const device = {
					MAC: info[1],		// e.g. '61:56:FA:1B:E1:21'
					Name: info[2],	// '--' for unknown
					ConnectionType: info[3],	// 'wired' or 'wireless'
				};
				devices.push(device);
			});
			return Promise.all(devices);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get LAN config
	* @returns {Promise.<LANConfig>}
	*/
	async getLANConfig() {
		try {
			const message = soap.getLANConfig(this.sessionId);
			const result = await this._queueMessage(soap.action.getLANConfig, message);
			// const patchedBody = patchBody(result.body);
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetInfoResponse'];
			const LANConfig = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					LANConfig[property] = entries[property]._text;
				}
			});
			return Promise.resolve(LANConfig);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get Internet connection status, e.g. 'Up'
	* @returns {Promise.<ethernetLinkStatus>}
	*/
	async getEthernetLinkStatus() {
		try {
			const message = soap.getEthernetLinkStatus(this.sessionId);
			const result = await this._queueMessage(soap.action.getEthernetLinkStatus, message);
			if (!result.body.includes('</NewEthernetLinkStatus>')) throw Error('Incorrect or incomplete response from router');
			const ethernetLinkStatus = regexNewEthernetLinkStatus.exec(result.body)[1];
			return Promise.resolve(ethernetLinkStatus);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get WAN config
	* @returns {Promise.<WANConfig>}
	*/
	async getWANConfig() {
		try {
			const message = soap.getWANIPConnection(this.sessionId);
			const result = await this._queueMessage(soap.action.getWANIPConnection, message);
			// const patchedBody = patchBody(result.body);
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetInfoResponse'];
			const WANConfig = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					WANConfig[property] = entries[property]._text;
				}
			});
			return Promise.resolve(WANConfig);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* @typedef WANConnectionType
	* @description WANConnectionType is an object with these properties.
	* @property {string} ConnectionType e.g. 'DHCP'
	* @example // WANConnectionType
{ ConnectionType: 'DHCP' }
	*/

	/**
	* Get WAN Connection Type
	* @returns {Promise.<WANConnectionType>}
	*/
	async getWANConnectionType() {
		try {
			const message = soap.getWANConnectionTypeInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.getWANConnectionTypeInfo, message);

			if (!result.body.includes('m:GetConnectionTypeInfoResponse')) throw Error('Incorrect or incomplete response from router');

			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetConnectionTypeInfoResponse'];
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					const propname = property.replace('New', '');
					// propname = propname.charAt(0).toLowerCase() + propname.slice(1);
					info[propname] = entries[property]._text;
				}
			});
			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* @typedef WANInternetPort
	* @description WANInternetPort is an object with these properties.
	* @property {string} InternetPortInfo e.g. '1@1;Ethernet'
	* @example // WANInternetPort
{ InternetPortInfo: '1@1;Ethernet' }
	*/

	/**
	* Get WAN Internet Port Info
	* @returns {Promise.<WANInternetPort>}
	*/
	async getWANInternetPort() {
		try {
			const message = soap.getWANInternetPortInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.getWANInternetPortInfo, message);
			if (!result.body.includes('m:GetInternetPortInfoResponse')) throw Error('Incorrect or incomplete response from router');

			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetInternetPortInfoResponse'];
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					const propname = property.replace('New', '');
					// propname = propname.charAt(0).toLowerCase() + propname.slice(1);
					info[propname] = entries[property]._text;
				}
			});
			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get WAN DNS LookUpStatus
	* @returns {Promise.<WANDNSLookUpStatus>}
	*/
	async getWANDNSLookUpStatus() {
		try {
			const message = soap.getWANDNSLookUpStatus(this.sessionId);
			const result = await this._queueMessage(soap.action.getWANDNSLookUpStatus, message);
			if (!result.body.includes('m:GetDNSLookUpStatusResponse')) throw Error('Incorrect or incomplete response from router');

			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetInternetPortInfoResponse'];
			const info = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					const propname = property.replace('New', '');
					// propname = propname.charAt(0).toLowerCase() + propname.slice(1);
					info[propname] = entries[property]._text;
				}
			});
			return Promise.resolve(info);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get Port Mapping Info
	* @returns {Promise.<portMapping>}
	*/
	async getPortMappingInfo() {
		try {
			const message = soap.getPortMappingInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.getPortMappingInfo, message);
			const patchedBody = patchBody(result.body);
			// parse xml to json object
			const parseOptions = {
				compact: true, ignoreDeclaration: true, ignoreAttributes: true, spaces: 2,
			};
			const rawJson = parseXml.xml2js(patchedBody, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetPortMappingInfoResponse'];
			const portMapping = {};
			Object.keys(entries).forEach((property) => {
				if (Object.prototype.hasOwnProperty.call(entries, property)) {
					portMapping[property] = entries[property]._text;
				}
			});
			return Promise.resolve(portMapping);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get array of attached devices.
	* @param {number} [method = 0] - 0: auto, 1: v1 (old), 2: v2 (new)
	* @returns {Promise.<AttachedDevice[]>}
	*/
	async getAttachedDevices(method) {
		try {
			let devices;
			this.getAttachedDevicesMethod = method;
			if (method === 1) {
				devices = await this._getAttachedDevices();
			} else if (method === 2) {
				devices = await this._getAttachedDevices2();
			} else {
				this.getAttachedDevicesMethod = 0;
				devices = await this._getAttachedDevices()
					.catch(() => this._getAttachedDevices2());
			}
			return Promise.all(devices);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get traffic meter statistics.
	* @returns {Promise.<trafficStatistics>}
	*/
	async getTrafficMeter() {
		try {
			const message = soap.trafficMeter(this.sessionId);
			const result = await this._queueMessage(soap.action.getTrafficMeter,	message);
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
			const result = await this._queueMessage(soap.action.getParentalControlEnableStatus, message);
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
	* Set the device name
	* @param {string} name - e.g. 'MyNetgearRouter'
	* @returns {Promise<finished>}
	*/
	async setNetgearDeviceName(name) {
		try {
			const lanConfig = await this.getLANConfig();
			const MAC = lanConfig.NewLANMACAddress;
			const message = soap.setNetgearDeviceName(this.sessionId, MAC, name);
			await this._queueMessage(soap.action.setNetgearDeviceName, message);
			return Promise.resolve(true);
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
			await this._queueMessage(soap.action.enableParentalControl, message);
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
			const message = soap.getQoSEnableStatus(this.sessionId);
			const result = await this._queueMessage(soap.action.getQoSEnableStatus, message);
			const qosEnabled = regexNewQoSEnableStatus.exec(result.body)[1] === '1';
			return Promise.resolve(qosEnabled);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get QOS Device bandwith. Only works on R7000
	* @returns {Promise.<currentDeviceBandwidth>}
	*/
	async getCurrentDeviceBandwidth() {
		try {
			const message = soap.getCurrentDeviceBandwidth(this.sessionId);
			const result = await this._queueMessage(soap.action.getCurrentDeviceBandwidth, message);
			const currentDeviceBandwidth = regexCurrentDeviceBandwidth.exec(result.body)[1];
			// response:
			// <m:GetCurrentDeviceBandwidthResponse xmlns:m="urn:NETGEAR-ROUTER:service:AdvancedQoS:1">
			// 	<NewCurrentDeviceBandwidth>0</NewCurrentDeviceBandwidth>
			// </m:GetCurrentDeviceBandwidthResponse>
			return Promise.resolve(currentDeviceBandwidth);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get QOS getCurrentAppBandwidthByMAC. Only works on R7000
	* @returns {Promise.<{ currentDeviceUpBandwidth, currentDeviceDownBandwidth }>}
	*/
	async getCurrentBandwidthByMAC(mac) {
		try {
			const message = soap.getCurrentBandwidthByMAC(this.sessionId, mac);
			const result = await this._queueMessage(soap.action.getCurrentBandwidthByMAC, message);
			const currentDeviceUpBandwidth = regexCurrentDeviceUpBandwidth.exec(result.body)[1];
			const currentDeviceDownBandwidth = regexCurrentDeviceDownBandwidth.exec(result.body)[1];
			// response:
			// <m:GetCurrentBandwidthByMACResponse	xmlns:m="urn:NETGEAR-ROUTER:service:AdvancedQoS:1">
			// 		<NewCurrentDeviceUpBandwidth>0</NewCurrentDeviceUpBandwidth>
			// 		<NewCurrentDeviceDownBandwidth>0</NewCurrentDeviceDownBandwidth>
			// 	</m:GetCurrentBandwidthByMACResponse>
			return Promise.resolve({ currentDeviceUpBandwidth, currentDeviceDownBandwidth });
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
			await this._queueMessage(soap.action.setQoSEnableStatus, message);
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
			const result = await this._queueMessage(soap.action.getTrafficMeterEnabled, message);
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
			const result = await this._queueMessage(soap.action.getTrafficMeterOptions, message);
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
			await this._queueMessage(soap.action.enableTrafficMeter, message);
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
			const result = await this._queueMessage(soap.action.getBandwidthControlOptions, message);
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
			await this._queueMessage(soap.action.setBandwidthControlOptions, message);
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
			const result = await this._queueMessage(soap.action.getBlockDeviceEnableStatus, message);
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
			await this._queueMessage(soap.action.setBlockDeviceEnable, message);
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
			await this._queueMessage(soap.action.enableBlockDeviceForAll, message);
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
			await this._queueMessage(soap.action.setBlockDevice, message); // response code 1 = unknown MAC?, 2= device not connected?
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
			const result = await this._queueMessage(soap.action.getGuestAccessEnabled,	message);
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
					.catch((err) => Promise.reject(err));
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
			const result = await this._queueMessage(soap.action.get5G1GuestAccessEnabled2, message)
				.catch(() => {
					// console.log('trying alternative method');	// try method R7800
					this.guestWifiMethod.get50_1 = 1;
					return Promise.resolve(this._queueMessage(soap.action.get5G1GuestAccessEnabled, message));
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
					.catch((err) => Promise.reject(err));
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
			const result = await this._queueMessage(soap.action.get5GGuestAccessEnabled2, message);
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
	* Get available Wifi channels
	* @param {string} [band = '2.4G'] - '2.4G', '5G' or '5G1'
	* @returns {Promise.<channels[]>}
	*/
	async getWifiChannels(band) {
		// console.log('Get available wifi channels');
		try {

			const message = soap.getAvailableChannel(this.sessionId, band || '2.4G');
			const result = await this._queueMessage(soap.action.getAvailableChannel, message);
			const availableChannels = regexNewAvailableChannel.exec(result.body)[1];
			const availableChannelsArray = availableChannels.split(',');
			return Promise.all(availableChannelsArray);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Set the wifi channel
	* @param {string} [channel = 'Auto'] - e.g. '6'
	* @param {string} [band = '2.4G'] - '2.4G', '5G' or '5G1'
	* @returns {Promise<finished>}
	*/
	async setWifiChannel(channel, band) {
		// console.log('setting wifi channel');
		try {
			const chnl = channel || 'Auto';
			const availableChannels = await this.getWifiChannels(band);
			if (!availableChannels.includes(chnl)) throw Error('Channel is not supported on this band');
			await this._configurationStarted();
			if (band === '5G') {
				const message = soap.set5GChannel(this.sessionId, chnl);
				await this._queueMessage(soap.action.set5GChannel, message);
			} else if (band === '5G1') {
				const message = soap.set5G1Channel(this.sessionId, chnl);
				await this._queueMessage(soap.action.set5G1Channel, message);
			} else {
				const message = soap.setChannel(this.sessionId, chnl);
				await this._queueMessage(soap.action.setChannel, message);
			}
			await this._configurationFinished()
				.catch(() => {
					// console.log(`setGuestAccessEnabled finished with warning.`);
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get 2.4G Wifi channel info
	* @returns {Promise.<channel>}
	*/
	async getChannelInfo() {
		// console.log('Get available 2.4G channel');
		try {

			const message = soap.getChannelInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.getChannelInfo, message);
			const channel = regexNewChannel.exec(result.body)[1];
			return Promise.resolve(channel);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get 5G-1 Wifi channel info
	* @returns {Promise.<channel>}
	*/
	async get5GChannelInfo() {
		// console.log('Get available 5G channel');
		try {

			const message = soap.get5GChannelInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.get5GChannelInfo, message);
			const channel5G = regexNew5GChannel.exec(result.body)[1];
			return Promise.resolve(channel5G);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get 5G-2 Wifi channel info
	* @returns {Promise.<channel>}
	*/
	async get5G1ChannelInfo() {
		// console.log('Get available 5G-2 channel');
		try {

			const message = soap.get5G1ChannelInfo(this.sessionId);
			const result = await this._queueMessage(soap.action.get5G1ChannelInfo, message);
			const channel5G1 = regexNew5G1Channel.exec(result.body)[1];
			return Promise.resolve(channel5G1);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Get smartConnect Enable Status (true / false).
	* @returns {Promise.<smartConnectEnabled>}
	*/
	async getSmartConnectEnabled() {
		try {
			await this._configurationStarted();
			const message = soap.getSmartConnectEnabled(this.sessionId);
			const result = await this._queueMessage(soap.action.getSmartConnectEnabled, message);
			await this._configurationFinished()
				.catch(() => {
					// console.log(`finished with warning`);
				});
			const smartConnectEnabled = regexNewSmartConnectEnable.exec(result.body)[1] === '1';
			return Promise.resolve(smartConnectEnabled);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	* Enable or Disable smartConnect
	* @param {boolean} enable - true to enable, false to disable.
	* @returns {Promise<finished>}
	*/
	async setSmartConnectEnabled(enable) {
		try {
			await this._configurationStarted();
			const message = soap.setSmartConnectEnabled(this.sessionId, enable);
			await this._queueMessage(soap.action.setSmartConnectEnabled, message);
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
			await this._queueMessage(soap.action.reboot,	message);
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
			// first try new method
			this.checkNewFirmwareMethod = 2;
			const message = soap.checkAppNewFirmware(this.sessionId);
			let result = await this._queueMessage(soap.action.checkAppNewFirmware, message)
				.catch(() => false);
			// try old method on fail
			if (!result) {
				this.checkNewFirmwareMethod = 1;
				const message2 = soap.checkNewFirmware(this.sessionId);
				result = await this._queueMessage(soap.action.checkNewFirmware, message2);
			}
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
			await this._queueMessage(soap.action.updateNewFirmware,	message).catch(() => false);
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
			await this._queueMessage(soap.action.speedTestStart,	message);
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
			const result = await this._queueMessage(soap.action.speedTestResult,	message);
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
		try {
			const message = soap.attachedDevices(this.sessionId);
			const result = await this._queueMessage(soap.action.getAttachedDevices, message);
			const body = result.body
				.replace(/&amp;/gi, '&')
				.replace(/&lt;/gi, '<')
				.replace(/&gt;/gi, '>');
			const raw = regexAttachedDevices.exec(body)[1];
			const entries = raw.split('@');
			const devices = [];
			entries.forEach((entry, index) => {
				// console.log(index);
				const info = entry.split(';');
				// info must be larger then 0 chars
				if (info.length === 0) {
					throw Error('Error parsing device-list (method 1)');
				}
				// check if first entry is number of entries
				if (index === 0 && info.length === 1) {
					if (Number(entry) !== entries.length - 1) throw Error('Error parsing device-list - number mismatch (method 1)');
					return;
				}
				// error when not enough info elements
				if (info.length < 5) throw Error('Error parsing device-list - not enough elements (method 1)');
				// throw error on invalid mac format
				if (info[3].length !== 17) throw Error('Error parsing device-list - invalid mac format (method 1)');
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
			});
			return Promise.all(devices);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _getAttachedDevices2() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices2');
		try {
			const message = soap.attachedDevices2(this.sessionId);
			const result = await this._queueMessage(soap.action.getAttachedDevices2, message);
			// const patchedBody = patchBody(result.body);
			// parse xml to json object
			const parseOptions = {
				compact: true, nativeType: true, ignoreDeclaration: true, ignoreAttributes: true,
			};
			const rawJson = parseXml.xml2js(result.body, parseOptions);
			const entries = rawJson['v:Envelope']['v:Body']['m:GetAttachDevice2Response'].NewAttachDevice.Device;
			if (!Array.isArray(entries)) throw Error('Error parsing device-list');
			const devices = entries.map((entry) => {
				const device = {};
				Object.keys(entry).forEach((key) => {
					device[key] = entry[key]._text;
				});
				// throw error on invalid mac format
				if (device.MAC.length !== 17) throw Error('Error parsing device-list');
				return device;
			});
			return Promise.all(devices);
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
			await this._queueMessage(soap.action.setGuestAccessEnabled, message);
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
			await this._queueMessage(soap.action.setGuestAccessEnabled2, message);
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
		await this._queueMessage(soap.action.set5G1GuestAccessEnabled, message);
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
		await this._queueMessage(soap.action.set5G1GuestAccessEnabled2, message);
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
		await this._queueMessage(soap.action.set5GGuestAccessEnabled2, message);
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
			await this._queueMessage(soap.action.configurationStarted, message);
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
			await this._queueMessage(soap.action.configurationFinished, message)
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
			let info;
			// first try routerlogin.net
			const host = await dnsLookupPromise('routerlogin.net').catch(() => undefined); // orbilogin.com/net has redirects?
			if (host) info = await this.getCurrentSetting(host.address || host).catch(() => undefined); // weird, sometimes it doesn't have .address
			// else try ip scanning
			if (!info) [info] = await this._discoverAllHostsInfo();
			return Promise.resolve(info);	// info.host has the ipAddress
		} catch (error) {
			this.lastResponse = error;
			return Promise.reject(error);
		}
	}

	async _discoverAllHostsInfo() {
		// returns a promise with an array of info on all discovered netgears, assuming class C network, or rejects with an error
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
			networks.forEach((network) => {
				for (let host = 1; host <= 254; host += 1) {
					const ipToTest = network.address.replace(/\.\d+$/, `.${host}`);
					hostsToTest.push(ipToTest);
				}
				return hostsToTest;
			});
			// temporarily set http timeout to 4 seconds
			const allHostsPromise = hostsToTest.map((hostToTest) => Promise.resolve(this.getCurrentSetting(hostToTest, 4000).catch(() => undefined)));
			const allHosts = await Promise.all(allHostsPromise);
			const discoveredHosts = allHosts.filter((host) => host);
			if (!discoveredHosts[0]) {
				throw Error('No Netgear router could be discovered');
			}
			return Promise.all(discoveredHosts);
		} catch (error) {
			this.lastResponse = error;
			return Promise.reject(error);
		}
	}

	async _getSoapPort(host1) {
		// returns a promise of the soap port (80, 443, 5000, 5555 or undefined), or rejects with an error
		try {
			if (!host1 || host1 === '') {
				throw Error('getSoapPort failed: Host ip is not provided');
			}
			const message = soap.getInfo(this.sessionId);
			const action = soap.action.getInfo;
			// try port 443 with TLS
			const result443 = await this._makeRequest2(action, message, host1, 443, true, 3000)
				.catch(() => ({ body: null }));
			if (JSON.stringify(result443.body).includes('<ResponseCode>')) {
				return Promise.resolve(443);
			}
			// try port 5555 with TLS
			const result5555 = await this._makeRequest2(action, message, host1, 5555, true, 3000)
				.catch(() => ({ body: null }));
			if (JSON.stringify(result5555.body).includes('<ResponseCode>')) {
				return Promise.resolve(5555);
			}
			// try port 5000 without TLS
			const result5000 = await this._makeRequest2(action, message, host1, 5000, false, 3000)
				.catch(() => ({ body: null }));
			if (JSON.stringify(result5000.body).includes('<ResponseCode>')) {
				return Promise.resolve(5000);
			}
			// try port 80 without TLS
			const result80 = await this._makeRequest2(action, message, host1, 80, false, 3000)
				.catch(() => ({ body: null }));
			if (JSON.stringify(result80.body).includes('<ResponseCode>')) {
				return Promise.resolve(80);
			}
			// soap port could not be found
			return Promise.resolve(undefined);
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
				soapaction: action,
				'cache-control': 'no-cache',
				'user-agent': 'node-netgearjs',
				'content-type': 'multipart/form-data',
				'content-length': Buffer.byteLength(message),
				connection: 'Keep-Alive',
			};
			if (this.cookie) {
				headers.cookie = this.cookie;
			}
			const options = {
				hostname: this.host,
				port: this.port,
				path: '/soap/server_sa/',
				rejectUnauthorized: false,
				headers,
				method: 'POST',
			};
			let result;
			if (this.tls) {
				result = await this._makeHttpsRequest(options, message);
			} else {
				result = await this._makeHttpRequest(options, message);
			}
			this.lastResponse = result.body;
			if (result.headers['set-cookie']) {
				this.cookie = result.headers['set-cookie'];
			}
			if (result.statusCode !== 200) {
				this.lastResponse = result.statusCode;
				throw Error(`HTTP request Failed. Status Code: ${result.statusCode}`);
			}
			const responseCodeRegex = regexResponseCode.exec(result.body);
			const responseCode = responseCodeRegex ? Number(responseCodeRegex[1]) : null;
			if (responseCode === null) {
				throw Error('no response code from router');
			}
			if (responseCode === 0) {
				result.body = patchBody(result.body);
				if (!result.body.includes('</v:Envelope>')) throw Error('Incomplete soap response received');
				return Promise.resolve(result);
			}
			// request failed
			if (responseCode === 1) {
				throw Error('1 Unknown. The requested function is not available');
			}
			if (responseCode === 401) {
				this.loggedIn = false;
				throw Error('401 Unauthorized. Incorrect password?');
			}
			if (responseCode === 404) {
				throw Error('404 Not Found. The requested function/page is not available');
			}
			throw Error(`Invalid response code from router: ${responseCode}`);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	// soap request without login check, and without using this
	// used for _getSoapPort
	async _makeRequest2(action, message, host, port, tls, timeout) {
		try {
			const headers = {
				soapaction: action,
				'cache-control': 'no-cache',
				'user-agent': 'node-netgearjs',
				'content-type': 'multipart/form-data',
				'content-length': Buffer.byteLength(message),
				// connection: 'Keep-Alive',
			};
			if (this.cookie) {
				headers.cookie = this.cookie;
			}
			const options = {
				hostname: host,
				port,
				rejectUnauthorized: false,
				path: '/soap/server_sa/',
				headers,
				method: 'POST',
			};
			let result;
			if (tls) {
				result = await this._makeHttpsRequest(options, message, timeout);
			} else {
				result = await this._makeHttpRequest(options, message, timeout);
			}
			return Promise.resolve(result);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	// queue stuff
	_initQueue() {
		const config = {
			rules: {				// Describing our rules by rule name
				common: {			// Common rule. Will be used if you won't provide rule argument
					rate: 3,		// Allow to send 3 messages
					limit: 1,		// per 1 second
					priority: 1,	// Rule priority. The lower priority is, the higher chance that this rule will execute faster
				},
			},
			overall: {				// Overall queue rates and limits
				rate: 10,
				limit: 1,
			},
			retryTime: 2,		// Default retry time (seconds). Can be configured in retry fn
			ignoreOverallOverheat: true,	// Should we ignore overheat of queue itself
		};
		this.queue = new Queue(config);
	}

	_queueMessage(action, msg) {
		const key = Date.now(); // 'homey';
		const requestHandler = () => this._makeRequest(action, msg)
			.then((response) => response)
			.catch((error) => {
				// if (error.message && (error.message.includes('throttled') || error.message.includes('429'))) {
				// 	return retry();
				// }
				throw error;
			});
		return this.queue.request(requestHandler, key);
	}

	_makeHttpRequest(options, postData, timeout) {
		return new Promise((resolve, reject) => {
			const opts = options;
			opts.timeout = timeout || this.timeout;
			const req = http.request(opts, (res) => {
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.once('end', () => {
					if (!res.complete) {
						return reject(Error('The connection was terminated while the message was still being sent'));
					}
					res.body = resBody;
					return resolve(res); // resolve the request
				});
			});
			req.on('error', (e) => {
				req.destroy();
				this.lastResponse = e;	// e.g. ECONNREFUSED on wrong soap port or wrong IP // ECONNRESET on wrong IP
				return reject(e);
			});
			req.on('timeout', () => {
				req.destroy();
			});
			// req.write(postData);
			req.end(postData);
		});
	}

	_makeHttpsRequest(options, postData, timeout) {
		return new Promise((resolve, reject) => {
			const opts = options;
			opts.timeout = timeout || this.timeout;
			const req = https.request(opts, (res) => {
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.once('end', () => {
					if (!res.complete) {
						return reject(Error('The connection was terminated while the message was still being sent'));
					}
					res.body = resBody;
					return resolve(res); // resolve the request
				});
			});
			req.on('error', (e) => {
				req.destroy();
				this.lastResponse = e;	// e.g. ECONNREFUSED on wrong soap port or wrong IP // ECONNRESET on wrong IP
				return reject(e);
			});
			req.on('timeout', () => {
				req.destroy();
			});
			// req.write(postData);
			req.end(postData);
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
			client.on('error', (e) => {
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
* @param {sessionOptions} [options] - configurable session options
* @property {boolean} loggedIn - login state.
* @example // create a router session, login to router, fetch attached devices
	const Netgear = require('netgear');

	const router = new Netgear();

	async function getDevices() {
		try {
			const options = { password: 'myPassword' };
			await router.login(options);
			const deviceArray = await router.getAttachedDevices();
			console.log(deviceArray);
		} catch (error) {
			console.log(error);
		}
	}

	getDevices();
*/

/**
* @typedef sessionOptions
* @description Set of configurable options to set on the router class
* @property {string} [password = 'password'] - The login password. Defaults to 'password'.
* @property {string} [username = 'admin'] - The login username. Defaults to 'admin'.
* @property {string} [host = 'routerlogin.net'] - The url or ip address of the router. Leave undefined to try autodiscovery.
* @property {number} [port = 80] - The SOAP port of the router. Leave undefined to try autodiscovery.
* @property {number} [method = 0] - 0: auto, 1: v1 (old), 2: v2 (new)
* @property {number} [timeout = 18000] - http(s) timeout in milliseconds. Defaults to 18000ms.
* @property {boolean} [tls = false] - Use TLS/SSL (HTTPS) for SOAP calls. Defaults to false.
* @example // router options
{ password: 'mySecretPassword',
  host:'routerlogin.net',
  port: 5000,
  timeout: 19000,
  tls: false }
*/

/**
* @typedef AttachedDevice
* @description Object representing the state of a device attached to the Netgear router, with properties similar to this.
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
* @typedef allowedDevice
* @description allowedDevice is an object with these properties.
* @property {string} MAC - e.g. '61:56:FA:1B:E1:21'
* @property {string} Name - '--' for unknown
* @property {string} ConnectionType - e.g. 'wired', '2.4GHz', 'Guest Wireless 2.4G'
* @example // allowedDevice
{ MAC: '6F:A1:F8:04:9F:E2',
  Name: 'OPENELEC',
  ConnectionType: 'wireless' }
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
* @property {number} port e.g. 80
* @property {boolean} TLS e.g. true
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
  port: 80
  TLS: false }
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
* @property {string} DeviceMode e.g. '0' 0=router, 1=AP mode
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
* @example // newFirmwareInfo
{ currentVersion: 'V1.0.2.60', newVersion: '', releaseNote: '' }
*/

/**
* @typedef systemInfo
* @description systemInfo is an object with these properties.
* @property {number} NewCPUUtilization e.g. 21
* @property {number} NewPhysicalMemory e.g. 256
* @property {number} NewMemoryUtilization e.g. 72
* @property {number} NewPhysicalFlash e.g. 128
* @property {number} NewAvailableFlash e.g. 128
* @example // systemInfo
{ NewCPUUtilization: 21,
  NewPhysicalMemory: 256,
  NewMemoryUtilization: 72,
  NewPhysicalFlash: 128,
  NewAvailableFlash: 128 }
*/

/**
* @typedef LANConfig
* @description LANConfig is an object with properties similar to this.
* @property {string} NewLANSubnet e.g. '255.255.255.0'
* @property {string} NewWANLAN_Subnet_Match e.g. '1'
* @property {string} NewLANMACAddress e.g. 'B07AB9A81D1A'
* @property {string} NewLANIP e.g. '192.168.0.1'
* @property {string} NewDHCPEnabled e.g. 'true'
* @example // LANConfig
{ NewLANSubnet: '255.255.255.0',
  NewWANLAN_Subnet_Match: '1',
  NewLANMACAddress: 'B07FB9F81DEA',
  NewLANIP: '10.0.0.1',
  NewDHCPEnabled: 'true' }
*/

/**
* @typedef WANConfig
* @description WANConfig is an object with properties similar to this.
* @property {string} NewEnable e.g. '1'
* @property {string} NewConnectionType e.g. 'DHCP'
* @property {string} NewExternalIPAddress e.g. '66.220.144.18'
* @property {string} NewSubnetMask e.g. '255.255.255.0'
* @property {string} NewAddressingType e.g. 'DHCP'
* @property {string} NewDefaultGateway e.g. '66.220.144.254'
* @property {string} NewMACAddress e.g. 'B07AB9A81D1B',
* @property {string} NewMACAddressOverride e.g. '0',
* @property {string} NewMaxMTUSize e.g. '1500',
* @property {string} NewDNSEnabled e.g. '1',
* @property {string} NewDNSServers e.g. '66.220.144.254'
* @example // WANConfig
{ NewEnable: '1',
  NewConnectionType: 'DHCP',
  NewExternalIPAddress: '66.220.144.18',
  NewSubnetMask: '255.255.255.0',
  NewAddressingType: 'DHCP',
  NewDefaultGateway: '66.220.144.254',
  NewMACAddress: 'B07FB9F81DEB',
  NewMACAddressOverride: '0',
  NewMaxMTUSize: '1500',
  NewDNSEnabled: '1',
  NewDNSServers: '66.220.144.254' }
*/

/**
* @typedef portMapping
* @description portMapping is an object with properties similar to this.
* @property {number} NewPortMappingNumberOfEntries e.g. 0
* @property {object} NewPortMappingInfo e.g. undefined
* @example // portMapping
{ NewPortMappingNumberOfEntries: '0',
  NewPortMappingInfo: undefined }
*/

/**
* @typedef deviceConfig
* @description deviceConfig is an object with properties similar to this.
* @property {string} BlankState e.g. '0'
* @property {string} NewBlockSiteEnable e.g. '0'
* @property {string} NewBlockSiteName e.g. '0'
* @property {string} NewTimeZone e.g. '+2'
* @property {string} NewDaylightSaving e.g. '1'
* @example // deviceConfig
{ BlankState: '0',
  NewBlockSiteEnable: '0',
  NewBlockSiteName: '0',
  NewTimeZone: '+2',
  NewDaylightSaving: '1' }
*/

/**
* @typedef channels
* @description channels is an array with the available wifi channels.
* @example // channels
[ 'Auto', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13' ]
*/

/**
* @typedef logs
* @description logs is an array with the log events.
* @property {string} string the logentry as string
* @property {string} event the event type
* @property {string} info event information
* @property {object} ts timestamp of the event
* @example // parsed logs
[	{	string: '[admin login] from source 10.0.0.2, Wednesday, October 02, 2019 20:00:41',
		event: 'admin login',
		info: 'from source 10.0.0.2',
		ts: 1570039241000 },
	{	string: '[DHCP IP: 10.0.0.3] to MAC address e1:4f:25:68:34:ba, Wednesday, October 02, 2019 20:00:39',
		event: 'DHCP IP: 10.0.0.3',
		info: 'to MAC address e1:4f:25:68:34:ba',
		ts: 1570039239000 },
	{	string: '[LAN access from remote] from 77.247.108.110:55413 to 10.0.0.5:443, Wednesday, October 02, 2019 19:59:39',
		event: 'LAN access from remote',
		info: 'from 77.247.108.110:55413 to 10.0.0.5:443',
		ts: 1570039179000 } ]
 */
