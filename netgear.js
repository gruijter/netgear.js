/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.

 * Copyright 2017, 2018, Robin de Gruijter <gruijter@hotmail.com>*/

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
const unknownDeviceDecoded = 'unknown';
const unknownDeviceEncoded = '&lt;unknown&gt;';

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


function isValidResponse(resp) {
	const validResponse = resp.body.includes('<ResponseCode>000</ResponseCode>');
	// if validResponse {
	// 	const responseCode = regexResponseCode.exec(resp.body)[1];
	// }
	return (validResponse);
}

function getSoapBody(soapData) {
	return new Promise((resolve, reject) => {
		let keyEnvelope;
		let keyBody;
		Object.keys(soapData).forEach((key1) => {
			if (key1.toLowerCase() === 'soap-env:envelope') {
				keyEnvelope = key1;
				Object.keys(soapData[key1]).forEach((key2) => {
					if (key2.toLowerCase() === 'soap-env:body') {
						keyBody = key2;
					}
				});
			}
		});
		try {
			return resolve(soapData[keyEnvelope][keyBody][0]);
		} catch (error) {
			return reject(Error('Error parsing soap body'));
		}
	});
}


class NetgearRouter {
	// Represents a session to a Netgear Router.
	constructor(password, user, host, port) {
		this.host = host || defaultHost;
		this.port = port || this.getSoapPort(this.host)
			.catch(() => { this.port = 80; });
		this.username = user || defaultUser;
		this.password = password || defaultPassword;
		this.sessionId = defaultSessionId;
		this.soapVersion = undefined;	// 2 or 3, will be filled with getSoapVersion() or getCurrentSetting()
		this.loggedIn = false;
		this.configStarted = false;
		// this.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1, maxFreeSockets: 1 });
	}

	async login(password, user, host, port) {
		// Resolves promise of login status. Rejects if login fails or error occurred.
		// console.log('Login');
		if (this.soapVerion === undefined) {
			await this.getCurrentSetting(host)
				.catch(console.log);
		}
		this.host = host || this.host;
		this.port = port || this.port;
		this.username = user || this.username;
		this.password = password || this.password;
		return new Promise((resolve, reject) => {
			const message = soapLogin(this.sessionId, this.username, this.password);
			this._makeRequest(actionLogin, message)
				.then((result) => {
					this.loggedIn = isValidResponse(result);
					if (this.loggedIn) {
						return resolve(this.loggedIn);
					}
					return reject(Error(`${result.statusCode}`));
				})
				.catch((err) => {	// login failed...
					if (err.message.includes('<ResponseCode>401</ResponseCode>')) {
						return reject(Error('incorrect username/password'));
					}
					if (!err.message.includes('<ResponseCode>')) {
						return reject(Error('wrong IP or wrong SOAP port'));
					}
					return reject(err);
				});
		});
	}

	getSoapPort(host) {
		// Resolves promise of soap port without need for credentials. Rejects if error occurred.
		// console.log('Get soap port');
		host = host || this.host;
		return new Promise((resolve, reject) => {
			const req = http.get(`http://${host}:80/soap/server_sa/`, () => {
				this.port = 80;
				return resolve(80);
			});
			req.on('error', () => { // try 5000 now
				const req2 = http.get(`http://${host}:5000/soap/server_sa/`, () => {
					this.port = 5000;
					return resolve(5000);
				});
				req2.on('error', () => {
					reject(Error('cannot determine the soap port'));
				});
			});
		});
	}

	getSoapVersion(host) {
		// Resolves promise of soap version without need for credentials. Rejects if error occurred.
		// console.log('Get soap version');
		host = host || this.host;
		return new Promise(async (resolve, reject) => {
			try {
				const currentSetting = await this.getCurrentSetting(host);
				const soapVersion = parseInt(currentSetting.SOAPVersion, 10) || 2;
				this.soapVersion = soapVersion;
				return resolve(soapVersion);
			} catch (error) {
				return reject(error);
			}
		});
	}

	getCurrentSetting(host) {
		// Resolves promise of router information without need for credentials. Rejects if error occurred.
		// console.log('Get current setting');
		host = host || this.host;
		return new Promise((resolve, reject) => {
			const req = http.get(`http://${host}/currentsetting.htm`, (res) => {
				// res.setEncoding('utf8');
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.on('end', () => {
					res.body = resBody;
					if (res.body === '') { return reject(Error('Error getting current setting')); }
					if (!res.body.includes('Model=')) {
						return reject(Error('This is not a valid Netgear router'));
					}
					const currentSetting = {};
					const entries = res.body.replace(/\n/g, '').split('\r');
					Object.keys(entries).forEach((entry) => {
						const info = entries[entry].split('=');
						if (info.length === 2) {
							currentSetting[info[0]] = info[1];
						}
					});
					this.soapVersion = parseInt(currentSetting.SOAPVersion, 10) || 2;
					return resolve(currentSetting);
				});
			});
			req.setTimeout(5000, () => {
				req.abort();
				return reject(Error('Connection timeout. Wrong ip?'));
			});
			req.on('error', (e) => {
				reject(e);
			});
		});
	}

	getInfo() {
		// Resolves promise of device information. Rejects if error occurred.
		// console.log('Get router info');
		return new Promise((resolve, reject) => {
			const message = soapGetInfo(this.sessionId);
			this._makeRequest(actionGetInfo,	message)
				.then((result) => {
					parseString(result.body, async (err, res) => {
						if (err) {
							return reject(err);
						}
						const soapBody = await getSoapBody(res)
							.catch((error) => {
								reject(error);
							});
						// const entries = res['soap-env:Envelope']['soap-env:Body'][0]['m:GetInfoResponse'][0];
						const entries = soapBody['m:GetInfoResponse'][0];
						if (Object.keys(entries).length < 2) {
							return reject(Error('Error parsing device-list'));
						}
						const info = {};
						Object.keys(entries).forEach((property) => {
							if (entries.hasOwnProperty(property) && Array.isArray(entries[property])) {
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

	getAttachedDevices() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices');
		return new Promise((resolve, reject) => {
			const message = soapAttachedDevices(this.sessionId);
			this._makeRequest(actionGetAttachedDevices, message)
				.then((result) => {
					const devices = [];
					const raw = regexAttachedDevices.exec(result.body)[1];
					const decoded = raw.replace(unknownDeviceEncoded, unknownDeviceDecoded);
					const entries = decoded.split('@');
					if (entries.length < 1) {
						return reject(Error('Error parsing device-list (soap v2)'));
					}
					Object.keys(entries).forEach((entry) => {
						const info = entries[entry].split(';');
						if (info.length === 0) {
							return reject(Error('Error parsing device-list (soap v2)'));
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
					return resolve(devices);
				})
				.catch((error) => {
					reject(error);	// request failed because login failed
				});
		});
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
						.replace(/<\/DeviceTypeName>/g, ']]></DeviceTypeName>');
					parseString(patchedBody, async (err, res) => {
						if (err) {
							reject(Error(`Error parsing xml device-list: ${err}`));
							return;
						}
						const soapBody = await getSoapBody(res)
							.catch((error) => {
								reject(error);
							});
						const entries = soapBody['m:GetAttachDevice2Response'][0].NewAttachDevice[0].Device;
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

	getTrafficMeter() {
		// Resolves promise of traffic meter stats. Rejects if error occurred.
		// console.log('Get traffic meter');
		return new Promise((resolve, reject) => {
			const message = soapTrafficMeter(this.sessionId);
			this._makeRequest(actionGetTrafficMeter,	message)
				.then((result) => {
					const newTodayUpload = Number(regexNewTodayUpload.exec(result.body)[1].replace(',', ''));
					const newTodayDownload = Number(regexNewTodayDownload.exec(result.body)[1].replace(',', ''));
					const newMonthUpload = Number(regexNewMonthUpload.exec(result.body)[1].split('/')[0].replace(',', ''));
					const newMonthDownload = Number(regexNewMonthDownload.exec(result.body)[1].split('/')[0].replace(',', ''));
					const traffic = {	newTodayUpload, newTodayDownload, newMonthUpload, newMonthDownload };	// in Mbytes
					return resolve(traffic);
				})
				.catch((error) => {
					reject(error);
				});
		});
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
						if (error.message.includes('<ResponseCode>002</ResponseCode>')) {
							return reject(Error(`Block/Allow failed for ${MAC}. Unknown MAC address?`));
						} else if (error.message.includes('<ResponseCode>402</ResponseCode>')) {
							return reject(Error(`Block/Allow failed for ${MAC}. Unknown MAC address.`));
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

	reboot() {
		// Resolves promise of reboot started. Rejects if error occurred.
		// console.log('router reboot requested');
		return new Promise(async (resolve, reject) => {
			await this.configurationStarted()
				.catch((err) => {
					reject(Error(`Reboot request failed. (config started failure: ${err})`));
				});
			const message = soapReboot(this.sessionId);
			this._makeRequest(actionReboot,	message)
				.then(async (result) => {
					await this.configurationFinished()
						.then(() => {
							resolve(true); // reboot initiated
						})
						.catch((err) => {
							const responseCode = regexResponseCode.exec(err)[1];
							return reject(Error(`Reboot request finished with warning. (config finished failure: ${responseCode})`));
						});
				})
				.catch((error) => {
					reject(error);
				});
		});
	}

	configurationStarted() {
		// Resolves promise of config start status. Rejects if error occurred.
		// console.log('start configuration');
		return new Promise((resolve, reject) => {
			const message = soapConfigurationStarted(this.sessionId);
			this._makeRequest(actionConfigurationStarted, message)
				.then((result) => {
					if (isValidResponse(result)) {
						this.configStarted = true;
						return resolve(true);
					}
					return reject(Error(`${result.statusCode}`));
				})
				.catch((err) => {	// config start failed...
					reject(err);
				});
		});
	}


	configurationFinished() {
		// Resolves promise of config finish status. Rejects if error occurred.
		// console.log('finish configuration');
		return new Promise((resolve, reject) => {
			if (this.configStarted === false) {	// already finished
				return resolve(true);
			}
			this.configStarted = false;
			const message = soapConfigurationFinished(this.sessionId);
			this._makeRequest(actionConfigurationFinished, message)
				.then((result) => {
					if (isValidResponse(result)) {
						return resolve(true);
					}
					return reject(Error(`${result.statusCode}`));
				})
				.catch((err) => {	// config finished failed...
					if (err.message.includes('<ResponseCode>501</ResponseCode>')) {
						return resolve('finished with warning');	// config already finished before
					}
					this.configStarted = true;
					return reject(err);
				});
		});
	}

	_makeRequest(action, message) {
		// console.log(this.httpAgent);
		return new Promise((resolve, reject) => {
			if (!this.loggedIn && action !== actionLogin) {
				return reject(Error('Not logged in'));
			}
			const headers = {
				SOAPAction: action,
				Connection: 'keep-alive',
				'Content-Length': Buffer.byteLength(message),
				// Host: `${this.host}:${this.port}`,
				// Pragma: 'no-cache',
				// Accept: 'text/xml',
				// 'Accept-Encoding': 'gzip, deflate',
				// 'Content-Type': 'text/xml; charset="UTF-8"',
				// 'Cache-Control': 'no-cache',
				// 'Accept-Language': 'nl-nl',
				'User-Agent': 'node-netgearjs',
			};
			const options = {
				hostname: this.host,
				port: this.port,
				path: '/soap/server_sa/',
				headers,
				method: 'POST',
				// agent: this.httpAgent,
				// auth: `${this.username}:${this.password}`,
			};
			const router = this;
			const req = http.request(options, (res) => {
				const { statusCode } = res;
				const contentType = res.headers['content-type'];
				let error;
				if (statusCode !== 200) {
					error = new Error(`Request Failed. Status Code: ${statusCode}`);
				}
				if (error) {
					// consume response data to free up memory
					res.resume();
					reject(error);
					return;
				}
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.on('end', () => {
					res.body = resBody;
					const success = isValidResponse(res);
					if (success) { return resolve(res); } // resolve the request
					router.loggedIn = false; // request failed
					reject(Error(`invalid response code from router`)); //: ${res.body}`));
				});
			});
			req.on('error', (e) => {
				reject(e);
			});
			req.setTimeout(15000, () => {
				req.abort();
				reject(Error('Connection timeout'));
			});
			req.write(message);
			req.end();
		});
	}
}

module.exports = NetgearRouter;
