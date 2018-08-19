/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017, 2018, Robin de Gruijter <gruijter@hotmail.com> */

'use strict';

const http = require('http');
const { parseString } = require('xml2js');
// const util = require('util');

const actionLogin = 'urn:NETGEAR-ROUTER:service:ParentalControl:1#Authenticate';
const actionGetInfo = 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetInfo';
const actionGetAttachedDevices = 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice';
const actionGetAttachedDevices2 = 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice2';
const actionGetTrafficMeter = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetTrafficMeterStatistics';
const actionConfigurationStarted = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#ConfigurationStarted';
const actionConfigurationFinished = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#ConfigurationFinished';
const actionSetBlockDevice = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#SetBlockDeviceByMAC';
const actionSetGuestAccessEnabled = 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetGuestAccessEnabled';
const actionSet5GGuestAccessEnabled = 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Set5GGuestAccessEnabled';
// const actionSetGuestAccessEnabled2 = 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetGuestAccessEnabled2';
const actionReboot = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#Reboot';

const defaultSessionId = 'A7D88AE69687E58D9A00';	// '10588AE69687E58D9A00'

const regexResponseCode = new RegExp(/<ResponseCode>(.*)<\/ResponseCode>/);
const regexAttachedDevices = new RegExp(/<NewAttachDevice>(.*)<\/NewAttachDevice>/);
const regexNewTodayUpload = new RegExp(/<NewTodayUpload>(.*)<\/NewTodayUpload>/);
const regexNewTodayDownload = new RegExp(/<NewTodayDownload>(.*)<\/NewTodayDownload>/);
const regexNewMonthUpload = new RegExp(/<NewMonthUpload>(.*)<\/NewMonthUpload>/);
const regexNewMonthDownload = new RegExp(/<NewMonthDownload>(.*)<\/NewMonthDownload>/);
// const unknownDeviceDecoded = 'unknown';
// const unknownDeviceEncoded = '&lt;unknown&gt;';

const defaultHost = 'routerlogin.net';
const defaultUser = 'admin';
const defaultPassword = 'password';
// const defaultPort = 5000;	// 80 for orbi and R7800

function soapLogin(sessionId, username, password) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<Authenticate>
<NewUsername xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${username}</NewUsername>
<NewPassword xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${password}</NewPassword>
</Authenticate>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function soapGetInfo(sessionId) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:GetInfo xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceInfo:1">
</M1:GetInfo>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

function soapConfigurationStarted(sessionId) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:ConfigurationStarted xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
<NewSessionID>${sessionId}</NewSessionID>
</M1:ConfigurationStarted>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

function soapConfigurationFinished(sessionId) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:ConfigurationFinished xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
<NewStatus>ChangesApplied</NewStatus>
</M1:ConfigurationFinished>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

function soapSetBlockDevice(sessionId, mac, AllowOrBlock) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:SetBlockDeviceByMAC xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
<NewAllowOrBlock>${AllowOrBlock}</NewAllowOrBlock>
<NewMACAddress>${mac}</NewMACAddress>
</M1:SetBlockDeviceByMAC>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

function soapAttachedDevices(sessionId) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance"	xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:GetAttachDevice xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceInfo:1">
</M1:GetAttachDevice>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

function soapAttachedDevices2(sessionId) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:GetAttachDevice2 xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceInfo:1">
</M1:GetAttachDevice2>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

function soapTrafficMeter(sessionId) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:GetTrafficMeterStatistics xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1"></M1:GetTrafficMeterStatistics>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

function soapSetGuestAccessEnabled(sessionId, enabled) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:SetGuestAccessEnabled xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
<NewGuestAccessEnabled>${enabled*1}</NewGuestAccessEnabled>
</M1:SetGuestAccessEnabled>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

function soapSet5GGuestAccessEnabled(sessionId, enabled) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:Set5GGuestAccessEnabled xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
<NewGuestAccessEnabled>${enabled*1}</NewGuestAccessEnabled>
</M1:Set5GGuestAccessEnabled>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

// function soapSetGuestAccessEnabled2(sessionId, enabled, ssid, ssid_key1, ssid_key2, ssid_key3, ssid_key4, securityMode) { // max 16 char per ssid_key chunk
// 	return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
// <SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
// <SOAP-ENV:Header>
// <SessionID>${sessionId}</SessionID>
// </SOAP-ENV:Header>
// <SOAP-ENV:Body>
// <M1:SetGuestAccessEnabled2 xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
// <NewGuestAccessEnabled>${enabled*1}</NewGuestAccessEnabled>
// <NewKey1>${ssid_key1}</NewKey1>
// <NewKey2>${ssid_key2}</NewKey2>
// <NewKey3>${ssid_key3}</NewKey3>
// <NewKey4>${ssid_key4}</NewKey4>
// <NewSSID>${ssid}</NewSSID>
// <NewSecurityMode>WPA2-PSK</NewSecurityMode>
// </M1:SetGuestAccessEnabled2>
// </SOAP-ENV:Body>
// </SOAP-ENV:Envelope>
// `;
// }


function soapReboot(sessionId) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
<SOAP-ENV:Header>
<SessionID>${sessionId}</SessionID>
</SOAP-ENV:Header>
<SOAP-ENV:Body>
<M1:Reboot xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
</M1:Reboot>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>
`;
}

class NetgearRouter {
	// Represents a session to a Netgear Router.
	constructor(password, user, host, port) {
		this.host = host || defaultHost;
		this.port = port || this.__getSoapPort(this.host)
			.catch(() => { this.port = 80; });
		this.username = user || defaultUser;
		this.password = password || defaultPassword;
		this.sessionId = defaultSessionId;
		this.timeout = 15000;
		this.soapVersion = undefined;	// 2 or 3
		this.loggedIn = false;
		this.configStarted = false;
	}

	async login(password, user, host, port) {
		// console.log('Login');
		try {
			if (this.soapVerion === undefined) {
				await this.getCurrentSetting(host);
			}
			this.host = host || this.host;
			this.port = port || await this.port;
			this.username = user || this.username;
			this.password = password || this.password;
			const message = soapLogin(this.sessionId, this.username, this.password);
			await this._makeRequest(actionLogin, message);
			this.loggedIn = true;
			return Promise.resolve(this.loggedIn);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	__getSoapPort(host) {
		// Resolves promise of soap port without need for credentials. Rejects if error occurred.
		// console.log('Get soap port');
		host = host || this.host;
		return new Promise((resolve, reject) => {
			const req1 = http.get(`http://${host}:5000/soap/server_sa/`, (result1) => {
				if (result1.statusCode === 400 || result1.statusCode === 401) {
					return resolve(5000);
				}
				const req2 = http.get(`http://${host}:80/soap/server_sa/`, (result2) => {
					if (result2.statusCode === 400 || result2.statusCode === 401) {
						return resolve(80);
					}
					return reject(Error('cannot determine the soap port'));
				});
				// 5000 and 80 failed...
				req2.on('error', () => reject(Error('cannot determine the soap port')));
				return reject(Error('cannot determine the soap port'));
			});
			// 5000 failed, assume 80...
			req1.on('error', () => resolve(80));
		});
	}

	async __getSoapVersion(host) {
		// Resolves promise of soap version without need for credentials. Rejects if error occurred.
		// console.log('Get soap version');
		host = host || this.host;
		try {
			const currentSetting = await this.getCurrentSetting(host);
			const soapVersion = parseInt(currentSetting.SOAPVersion, 10) || 2;
			this.soapVersion = soapVersion;
			return Promise.resolve(soapVersion);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async getCurrentSetting(host) {
		// Resolves promise of router information without need for credentials. Rejects if error occurred.
		// console.log('Get current setting');
		try {
			host = host || this.host;
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

	getInfo() {
		// Resolves promise of router information. Rejects if error occurred.
		// console.log('Get router info');
		return new Promise((resolve, reject) => {
			const message = soapGetInfo(this.sessionId);
			this._makeRequest(actionGetInfo,	message)
				.then((result) => {
					const patchedBody = result.body
						.replace(/soap-env:envelope/gi, 'soap-env:envelope')
						.replace(/soap-env:body/gi, 'soap-env:body');
					parseString(patchedBody, async (err, res) => {
						if (err) {
							return reject(err);
						}
						const entries = res['soap-env:envelope']['soap-env:body'][0]['m:GetInfoResponse'][0];
						if (Object.keys(entries).length < 2) {
							return reject(Error('Error parsing router info'));
						}
						const info = {};
						Object.keys(entries).forEach((property) => {
							if (Object.prototype.hasOwnProperty.call(entries, property) && Array.isArray(entries[property])) {
								info[property] = entries[property][0];
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
						return resolve(info);
					});
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	async getAttachedDevices() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices');
		try {
			const message = soapAttachedDevices(this.sessionId);
			const result = await this._makeRequest(actionGetAttachedDevices, message);
			const devices = [];
			const patchedBody = result.body
				.replace(/\r?\n|\r/g, ' ')
				.replace(/&lt/g, '')
				.replace(/&gt/g, '')
				.replace(/<Name>/g, '<Name><![CDATA[')
				.replace(/<\/Name>/g, ']]></Name>')
				.replace(/<DeviceModel>/g, '<DeviceModel><![CDATA[')
				.replace(/<\/DeviceModel>/g, ']]></DeviceModel>')
				.replace(/<DeviceTypeName>/g, '<DeviceTypeName><![CDATA[')
				.replace(/<\/DeviceTypeName>/g, ']]></DeviceTypeName>');
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
					const device = {
						IP: info[1],				// e.g. '10.0.0.10'
						Name: info[2],			// '--' for unknown
						MAC: info[3],				// e.g. '61:56:FA:1B:E1:21'
						ConnectionType: 'unknown',	// 'wired' or 'wireless'
						Linkspeed: 0,				// number >= 0, or NaN for wired linktype
						SignalStrength: 0,	// number <= 100
						AllowOrBlock: 'unknown',		// 'Allow' or 'Block'
					};
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

	getAttachedDevices2() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices2');
		return new Promise((resolve, reject) => {
			const message = soapAttachedDevices2(this.sessionId);
			this._makeRequest(actionGetAttachedDevices2, message)
				.then((result) => {
					// Fix use of special characters in the devicename
					// Netgear output is not conforming to XML standards!
					const patchedBody = result.body
						.replace(/<Name>/g, '<Name><![CDATA[')
						.replace(/<\/Name>/g, ']]></Name>')
						.replace(/<DeviceModel>/g, '<DeviceModel><![CDATA[')
						.replace(/<\/DeviceModel>/g, ']]></DeviceModel>')
						.replace(/<DeviceTypeName>/g, '<DeviceTypeName><![CDATA[')
						.replace(/<\/DeviceTypeName>/g, ']]></DeviceTypeName>')
						.replace(/soap-env:envelope/gi, 'soap-env:envelope')
						.replace(/soap-env:body/gi, 'soap-env:body');
					parseString(patchedBody, async (err, res) => {
						if (err) {
							reject(Error(`Error parsing xml device-list: ${err}`));
							return;
						}
						const entries = res['soap-env:envelope']['soap-env:body'][0]['m:GetAttachDevice2Response'][0].NewAttachDevice[0].Device;
						if (entries === undefined) {
							reject(Error(`Error parsing device-list (entries undefined) ${res}`));
							return;
						}
						if (entries.length < 1) {
							reject(Error('Error parsing device-list'));
						}
						const entryCount = entries.length;
						const devices = [];
						for (let i = 0; i < entryCount; i += 1) {
							const device = {
								IP: entries[i].IP[0],						// e.g. '10.0.0.10'
								Name: entries[i].Name[0],				// '--' for unknown
								NameUserSet: entries[i].NameUserSet[0] === 'true',	// e.g. 'false'
								MAC: entries[i].MAC[0],					// e.g. '61:56:FA:1B:E1:21'
								ConnectionType: entries[i].ConnectionType[0],	// e.g. 'wired', '2.4GHz', 'Guest Wireless 2.4G'
								SSID: entries[i].SSID[0],				// e.g. 'MyWiFi'
								Linkspeed: entries[i].Linkspeed[0],
								SignalStrength: Number(entries[i].SignalStrength[0]),	// number <= 100
								AllowOrBlock: entries[i].AllowOrBlock[0],			// 'Allow' or 'Block'
								Schedule: entries[i].Schedule[0],							// e.g. 'false'
								DeviceType: Number(entries[i].DeviceType[0]),	// a number
								DeviceTypeUserSet: entries[i].DeviceTypeUserSet[0] === 'true',	// e.g. 'false',
								DeviceTypeName: '',	// unknown, found in orbi response
								DeviceModel: '', // unknown, found in R7800 and orbi response
								DeviceModelUserSet: false, // // unknown, found in orbi response
								Upload: Number(entries[i].Upload[0]),
								Download: Number(entries[i].Download[0]),
								QosPriority: Number(entries[i].QosPriority[0]),	// 1, 2, 3, 4
								Grouping: '0',
								SchedulePeriod: '0',
								ConnAPMAC: '', // unknown, found in orbi response
							};
							if (Object.keys(entries[i]).length >= 18) { // only available for certain routers?:
								device.DeviceModel = entries[i].DeviceModel[0]; // '',
								device.Grouping = Number(entries[i].Grouping[0]); // 0
								device.SchedulePeriod = Number(entries[i].SchedulePeriod[0]); // 0
							}
							if (Object.keys(entries[i]).length >= 21) { // only available for certain routers?:
								device.DeviceTypeName = entries[i].DeviceTypeName[0]; // '',
								device.DeviceModelUserSet = entries[i].DeviceModelUserSet[0] === 'true'; // e.g. 'false',
								device.ConnAPMAC = entries[i].ConnAPMAC[0]; // MAC of connected orbi?
							}
							devices.push(device);
						}
						resolve(devices);
					});
				})
				.catch((error) => {
					reject(error);	// request failed because login failed
				});
		});
	}

	async getTrafficMeter() {
		// Resolves promise of traffic meter stats. Rejects if error occurred.
		// console.log('Get traffic meter');
		try {
			const message = soapTrafficMeter(this.sessionId);
			const result = await this._makeRequest(actionGetTrafficMeter,	message);
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

	setGuestAccessEnabled(enabled) { // true or false
		// Resolves promise of setGuestAccess (wifi). Rejects if error occurred.
		// console.log('setGuestAccess requested');
		return new Promise(async (resolve, reject) => {
			await this.configurationStarted()
				.catch((err) => {
					reject(Error(`setGuestAccessEnabled request failed. (config started failure: ${err})`));
				});
			const message = soapSetGuestAccessEnabled(this.sessionId, enabled);
			await this._makeRequest(actionSetGuestAccessEnabled, message)
				.catch((error) => {
					reject(error);
				});
			await this.configurationFinished()
				.catch((err) => {
					let responseCode = err;
					if (err.message.includes('<ResponseCode>')) {
						responseCode = regexResponseCode.exec(err)[1];
					}
					reject(Error(`setGuestAccessEnabled finished with warning. (config finished failure: ${responseCode})`));
				});
			return resolve(true);
		});
	}

	set5GGuestAccessEnabled(enabled) { // true or false
		// Resolves promise of setGuestAccess (wifi). Rejects if error occurred.
		// console.log('setGuestAccess requested');
		return new Promise(async (resolve, reject) => {
			await this.configurationStarted()
				.catch((err) => {
					reject(Error(`set5GGuestAccessEnabled request failed. (config started failure: ${err})`));
				});
			const message = soapSet5GGuestAccessEnabled(this.sessionId, enabled);
			await this._makeRequest(actionSet5GGuestAccessEnabled, message)
				.catch((error) => {
					reject(error);
				});
			await this.configurationFinished()
				.catch((err) => {
					let responseCode = err;
					if (err.message.includes('<ResponseCode>')) {
						responseCode = regexResponseCode.exec(err)[1];
					}
					reject(Error(`set5GGuestAccessEnabled finished with warning. (config finished failure: ${responseCode})`));
				});
			return resolve(true);
		});
	}

	setBlockDevice(MAC, AllowOrBlock) {
		// Resolves promise of AllowOrBlock status. Rejects if error occurred.
		// console.log('setBlockDevice started');
		return new Promise(async (resolve, reject) => {
			try {
				await this.configurationStarted()
					.catch((err) => {
						reject(Error(`Block/Allow failed for ${MAC}. (config started failure: ${err})`));
					});
				const message = soapSetBlockDevice(this.sessionId, MAC, AllowOrBlock);
				await this._makeRequest(actionSetBlockDevice, message)
					.catch((error) => {
						if (error.message.includes('Invalid response code from router: 001')) {
							this.loggedIn = true;
							return reject(Error(`Block/Allow failed for ${MAC}. Unknown MAC address?`));
						} else if (error.message.includes('Invalid response code from router: 002')) {
							return reject(Error(`Block/Allow failed for ${MAC}. Device not connected?`));
						}
						return reject(error);
					});
				await this.configurationFinished()
					.catch((err) => {
						let responseCode = err;
						if (err.message.includes('<ResponseCode>')) {
							responseCode = regexResponseCode.exec(err)[1];
						}
						reject(Error(`Block/Allow finished with warning for ${MAC}. (config finished failure: ${responseCode})`));
					});
				return resolve(true);
			} catch (error) {
				return reject(error);
			}
		});
	}

	async reboot() {
		// Resolves promise of reboot started. Rejects if error occurred.
		// console.log('router reboot requested');
		try {
			await this.configurationStarted()
				.catch((err) => {
					throw Error(`Reboot request failed. (config started failure: ${err})`);
				});
			const message = soapReboot(this.sessionId);
			await this._makeRequest(actionReboot,	message);
			await this.configurationFinished()
				.catch((err) => {
					const responseCode = regexResponseCode.exec(err)[1];
					throw Error(`Reboot request finished with warning. (config finished failure: ${responseCode})`);
				});
			return Promise.resolve(true); // reboot initiated
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async configurationStarted() {
		// Resolves promise of config start status. Rejects if error occurred.
		// console.log('start configuration');
		try {
			const message = soapConfigurationStarted(this.sessionId);
			await this._makeRequest(actionConfigurationStarted, message);
			this.configStarted = true;
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}


	async configurationFinished() {
		// Resolves promise of config finish status. Rejects if error occurred.
		// console.log('finish configuration');
		try {
			if (this.configStarted === false) {	// already finished
				return Promise.resolve(true);
			}
			this.configStarted = false;
			const message = soapConfigurationFinished(this.sessionId);
			await this._makeRequest(actionConfigurationFinished, message)
				.catch((err) => {	// config finished failed...
					if (err.message.includes('<ResponseCode>501</ResponseCode>')) {
						return Promise.resolve('finished with warning');	// config already finished before
					}
					this.configStarted = true;
					throw err;
				});
			return Promise.resolve(true);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async _makeRequest(action, message) {
		try {
			if (!this.loggedIn && action !== actionLogin) {
				return Promise.reject(Error('Not logged in'));
			}
			const headers = {
				SOAPAction: action,
				Connection: 'keep-alive',
				'Content-Length': Buffer.byteLength(message),
				'User-Agent': 'node-netgearjs',
			};
			const options = {
				hostname: this.host,
				port: this.port,
				path: '/soap/server_sa/',
				headers,
				method: 'POST',
			};
			const result = await this._makeHttpRequest(options, message);
			// request successfull
			if (result.statusCode === 200 && result.body.includes('<ResponseCode>000</ResponseCode>')) {
				return Promise.resolve(result);
			}
			// request failed
			this.loggedIn = false;
			if (result.statusCode !== 200) {
				throw Error(`HTTP request Failed. Status Code: ${result.statusCode}`);
			}
			if (result.body.includes('<ResponseCode>401</ResponseCode>')) {
				throw Error('incorrect username/password');
			}
			if (result.body.includes('<ResponseCode>')) {
				const responseCode = regexResponseCode.exec(result.body)[1];
				throw Error(`Invalid response code from router: ${responseCode}`);
			}
			throw Error('Invalid response. Wrong IP or SOAP port?');
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
				reject(e);
			});
		});
	}

}

module.exports = NetgearRouter;
