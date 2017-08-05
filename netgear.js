'use strict';

const http = require('http');
const parseString = require('xml2js').parseString;
// const util = require('util');

const ACTION_LOGIN = 'urn:NETGEAR-ROUTER:service:ParentalControl:1#Authenticate';
const ACTION_GET_INFO = 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetInfo';
const ACTION_GET_ATTACHED_DEVICES = 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice';
const ACTION_GET_ATTACHED_DEVICES2 = 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice2';
const ACTION_GET_TRAFFIC_METER = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetTrafficMeterStatistics';
const ACTION_CONFIGURATION_STARTED = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#ConfigurationStarted';
const ACTION_CONFIGURATION_FINISHED = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#ConfigurationFinished';
const ACTION_SET_BLOCK_DEVICE = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#SetBlockDeviceByMAC';

const SESSION_ID = 'A7D88AE69687E58D9A00'; // '10588AE69687E58D9A00'

const REGEX_ATTACHED_DEVICES = new RegExp('<NewAttachDevice>(.*)</NewAttachDevice>');
const REGEX_NEW_TODAY_UPLOAD = new RegExp('<NewTodayUpload>(.*)</NewTodayUpload>');
const REGEX_NEW_TODAY_DOWNLOAD = new RegExp('<NewTodayDownload>(.*)</NewTodayDownload>');
const UNKNOWN_DEVICE_DECODED = '<unknown>';
const UNKNOWN_DEVICE_ENCODED = '&lt;unknown&gt;';

const DEFAULT_HOST = 'routerlogin.net';
const DEFAULT_USER = 'admin';
const DEFAULT_PORT = 5000;

function soapLogin(sessionId, username, password) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?>
	  <SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
	    <SOAP-ENV:Header>
	    	<SessionID>${sessionId}</SessionID>
	    </SOAP-ENV:Header>
	    <SOAP-ENV:Body>
		    <Authenticate>
			    <NewUsername>${username}</NewUsername>
			    <NewPassword>${password}</NewPassword>
		    </Authenticate>
	    </SOAP-ENV:Body>
	  </SOAP-ENV:Envelope>
	  `;
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
    </SOAP-ENV:Envelope>`;
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


function isValidResponse(resp) {
	const validResponse = resp.statusCode === 200 && resp.body.includes('<ResponseCode>000</ResponseCode>');
	if (!validResponse) {
		console.log(resp.body);
		console.log(resp.statusCode);
	}
	return (validResponse);
}

class NetgearRouter {
	// Represents a session to a Netgear Router.
	constructor(password, host, user, port) {
		this.password = password;
		this.host = host || DEFAULT_HOST;
		this.username = user || DEFAULT_USER;
		this.port = port || DEFAULT_PORT;
		this.soap_url = `http://${this.host}:${this.port}/soap/server_sa/`;
		this.logged_in = false;
		this.login();
	}

	getCurrentSetting() {
		// Get router information without need for credentials
		// console.log('Get current settings');
		return new Promise((resolve, reject) => {
			http.get(`http://${this.host}/currentsetting.htm`, (res) => {
				// res.setEncoding('utf8');
				const { statusCode } = res;
				if (statusCode !== 200) {
					reject(Error(statusCode));
					return;
				}
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
					// console.log(`BODY: ${chunk}`);
				});
				res.on('end', () => {
					res.body = resBody;
					if (!res.body.includes('SOAPVersion=') && !res.body.includes('Model=')) {
						reject(Error('This is not a valid Netgear router'));
						return;
					}
					const currentSetting = {};
					const entries = res.body.split('\r\n');
					for (const entry in entries) {
						const info = entries[entry].split('=');
						if (info.length === 2) {
							currentSetting[info[0]] = info[1];
						}
					}
					resolve(currentSetting);
				});
			});
		});
	}

	login() {
		// Resolves promise of login status. Rejects if login fails or error occurred.
		console.log('Login');
		return new Promise((resolve, reject) => {
			const message = soapLogin(SESSION_ID, this.username, this.password);
			this._makeRequest(ACTION_LOGIN, message, false)
				.then((result) => {
					this.logged_in = isValidResponse(result);
					if (this.logged_in) { 
						resolve(this.logged_in);
						console.log('Login succesfull!');
					} else {
						if (result.body.includes('<ResponseCode>401</ResponseCode>')) {
							reject(Error('incorrect username/password, or reboot netgear required'));
						} else { reject(Error(`${result.statusCode}`)); }
					}
				})
				.catch((err) => {	// login failed...
					if (err.message.includes('<ResponseCode>401</ResponseCode>')) {		// should I make it err.includes ?
						reject(Error('incorrect username/password, or reboot netgear required'));
					} else reject(Error(err));
				});
		});
	}

	getInfo() {
		// Resolves promise of device information. Rejects if error occurred.
		console.log('Get router info');
		return new Promise((resolve, reject) => {
			const message = soapGetInfo(SESSION_ID);
			this._makeRequest(ACTION_GET_INFO,	message)
				.then((result) => {
					parseString(result.body, (err, res) => {
						if (err) { reject(Error(err)); return; }
						const entries = res['soap-env:Envelope']['soap-env:Body'][0]['m:GetInfoResponse'][0];
						if (Object.keys(entries).length < 2) {
							reject(Error('Error parsing device-list'));
							return;
						}
						const info = {};
						for (const property in entries) {
							if (entries.hasOwnProperty(property) && Array.isArray(entries[property])) {
								info[property] = entries[property][0];
							}
						}
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
						resolve(info);
					});
				})
				.catch((error) => {
					reject(Error(error));
				});
		});
	}

	getAttachedDevices() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices');
		return new Promise((resolve, reject) => {
			const message = soapAttachedDevices(SESSION_ID);
			this._makeRequest(ACTION_GET_ATTACHED_DEVICES, message)
				.then((result) => {
					const devices = [];
					const raw = REGEX_ATTACHED_DEVICES.exec(result.body)[1];
					const decoded = raw.replace(UNKNOWN_DEVICE_ENCODED, UNKNOWN_DEVICE_DECODED);
					const entries = decoded.split('@');
					if (entries.length <= 1) {
						reject(Error('Error parsing device-list'));
						return;
					}
					// First element is the total device count
					const entryCount = parseInt(entries.shift(), 10);
					if (entryCount <= 0 || NaN) {
						reject(Error('Error parsing device-list'));
						return;
					}
					for (const entry in entries) {
						const info = entries[entry].split(';');
						if (info.length === 0) {
							reject(Error('Error parsing device-list'));
							return;
						}
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
					resolve(devices);
				})
				.catch((error) => {
					reject(Error(error));	// reuest failed because login failed
				});
		});
	}

	getAttachedDevices2() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		// console.log('Get attached devices2');
		return new Promise((resolve, reject) => {
			const message = soapAttachedDevices2(SESSION_ID);
			this._makeRequest(ACTION_GET_ATTACHED_DEVICES2, message)
				.then((result) => {
					parseString(result.body, (err, res) => {
						if (err) { reject(Error(err)); return; }
						const entries = res['soap-env:Envelope']['soap-env:Body'][0]['m:GetAttachDevice2Response'][0]['NewAttachDevice'][0]['Device'];
						if (entries.length < 1) {
							reject(Error('Error parsing device-list'));
							return;
						}
						const entryCount = entries.length;
						const devices = [];
						for (let i = 0; i < entryCount; i++) {
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
								Upload: Number(entries[i].Upload[0]),
								Download: Number(entries[i].Download[0]),
								QosPriority: Number(entries[i].QosPriority[0]),	// 1, 2, 3, 4
							};
							devices.push(device);
						}
						resolve(devices);
					});
				})
				.catch((error) => {
					reject(Error(error));	// reuest failed because login failed
				});
		});
	}

	getTrafficMeter() {
		// Resolves promise of traffic meter stats. Rejects if error occurred.
		// console.log('Get traffic meter');
		return new Promise((resolve, reject) => {
			const message = soapTrafficMeter(SESSION_ID);
			this._makeRequest(ACTION_GET_TRAFFIC_METER,	message)
				.then((result) => {
					// console.log(result.body);
					const newTodayUpload = Number(REGEX_NEW_TODAY_UPLOAD.exec(result.body)[1]);
					const newTodayDownload = Number(REGEX_NEW_TODAY_DOWNLOAD.exec(result.body)[1]);
					const traffic = {	newTodayUpload, newTodayDownload };	// in Mbytes
					resolve(traffic);
				})
				.catch((error) => {
					reject(Error(error));
				});
		});
	}


	configurationStarted() {
	    // Resolves promise of config start status. Rejects if error occurred.
		console.log('start configuration');
		return new Promise((resolve, reject) => {
			const message = soapConfigurationStarted(SESSION_ID);
			this._makeRequest(ACTION_CONFIGURATION_STARTED, message, false)
				.then((result) => {
					if (isValidResponse(result)) { 
						resolve(true);
						// console.log(result.body);
					}
				    else { reject(Error(`${result.statusCode}`)); }
				})
				.catch((err) => {	// config start failed...
                  reject(Error(err));
				});
		});
	}
	
	
	configurationFinished() {
	    // Resolves promise of config finish status. Rejects if error occurred.
		console.log('finish configuration');
		return new Promise((resolve, reject) => {
			const message = soapConfigurationFinished(SESSION_ID);
			this._makeRequest(ACTION_CONFIGURATION_FINISHED, message, false)
				.then((result) => {
					if (isValidResponse(result)) { 
						resolve(true);
						// console.log(result.body);
					}
				    else { reject(Error(`${result.statusCode}`)); }
				})
				.catch((err) => {	// config start failed...
                  reject(Error(err));
				});
		});
	}

	setBlockDevice(MAC, AllowOrBlock) {
		// Resolves promise of AllowOrBlock status. Rejects if error occurred.
		console.log('setBlockDevice started');
		return new Promise((resolve, reject) => {
			const message = soapSetBlockDevice(SESSION_ID, MAC, AllowOrBlock);
			this._makeRequest(ACTION_SET_BLOCK_DEVICE, message)
			  .then((res) => {
				console.log('finished doing setblockdevice');
				resolve(res.body);
			  })
			  .catch((error) => {
				reject(error);
			  });
		});
	}

	_makeRequest(action, message, tryLoginAfterFailure) {
		return new Promise((resolve, reject) => {
			const headers = {SOAPAction: action};
			const options = {
				host: this.host,
				port: this.port,
				path: '/soap/server_sa/',
				headers,
				method: 'POST',
			};
			const req = http.request(options, (res) => {
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.on('end', () => {
					res.body = resBody;
					const success = isValidResponse(res);
					if (success) { resolve(res); return; } // resolve the request
					else { reject(res.body); } // request failed after retry
				});
			});
			req.on('error', (e) => {
				console.log(`problem with request: ${e.message}`);
				reject(e.message);
				return;
			});
			req.write(message);
			req.end();
		});
	}
}

module.exports = NetgearRouter;
