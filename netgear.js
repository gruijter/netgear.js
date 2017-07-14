'use strict';

const request = require('request');
const parseString = require('xml2js').parseString;

const ACTION_LOGIN = 'urn:NETGEAR-ROUTER:service:ParentalControl:1#Authenticate';
const ACTION_GET_ATTACHED_DEVICES = 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice';
const ACTION_GET_ATTACHED_DEVICES2 = 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice2';
const ACTION_GET_TRAFFIC_METER = 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetTrafficMeterStatistics';
const SESSION_ID = 'A7D88AE69687E58D9A00';

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
	    	<SessionID xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${sessionId}</SessionID>
	    </SOAP-ENV:Header>
	    <SOAP-ENV:Body>
		    <Authenticate>
		    <NewUsername xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${username}</NewUsername>
		    <NewPassword xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${password}</NewPassword>
		    </Authenticate>
	    </SOAP-ENV:Body>
	  </SOAP-ENV:Envelope>`;
}

function soapAttachedDevices(sessionId) {
	return `<?xml version="1.0" encoding="utf-8" standalone="no"?> +
    <SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" +
			xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" +
			xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" +
			xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"> +
    <SOAP-ENV:Header> +
    <SessionID>${sessionId}</SessionID> +
    </SOAP-ENV:Header> +
    <SOAP-ENV:Body> +
    <M1:GetAttachDevice xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceInfo:1"> +
    </M1:GetAttachDevice> +
    </SOAP-ENV:Body> +
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
	</SOAP-ENV:Envelope>`;
}


function soapTrafficMeter(sessionId) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="no"?> +
		<SOAP-ENV:Envelope xmlns:SOAPSDK1="http://www.w3.org/2001/XMLSchema" +
		  xmlns:SOAPSDK2="http://www.w3.org/2001/XMLSchema-instance" +
		  xmlns:SOAPSDK3="http://schemas.xmlsoap.org/soap/encoding/" +
		  xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"> +
		<SOAP-ENV:Header> +
		<SessionID>${sessionId}</SessionID> +
		</SOAP-ENV:Header> +
		<SOAP-ENV:Body> +
		<M1:GetTrafficMeterStatistics xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1"></M1:GetTrafficMeterStatistics> +
		</SOAP-ENV:Body> +
		</SOAP-ENV:Envelope>`;
}

function getSoapHeader(action) {
	return { SOAPAction: action };
}

function isValidResponse(resp) {
	return (resp.statusCode === 200 && resp.body.includes('<ResponseCode>000</ResponseCode>'));
}

class NetgearRouter {
	// Represents a session to a Netgear Router.
	constructor(password, host, user, port) {
		// Initialize a Netgear session.
		this.password = password;
		this.host = host || DEFAULT_HOST;
		this.username = user || DEFAULT_USER;
		this.port = port || DEFAULT_PORT;
		this.soap_url = `http://${this.host}:${this.port}/soap/server_sa/`;
		this.logged_in = false;
	}

	getCurrentSetting() {
		// Get router information without need for credentials
		return new Promise((resolve, reject) => {
			request(`http://${this.host}/currentsetting.htm`, (error, response, body) => {
				if (error) { reject(error); }	else {
					if (!body.includes('SOAPVersion=') && !body.includes('Model=')) {
						reject('This is not a valid Netgear router');
						return;
					}
					const currentSetting = {};
					const entries = body.split('\r\n');
					for (const entry in entries) {
						const info = entries[entry].split('=');
						if (info.length === 2) {
							currentSetting[info[0]] = info[1];
						}
					}
					resolve(currentSetting);
				}
			});
		});
	}

	login() {
		// Login to the router. Will be called automatically by other actions.
		console.log('Login');
		return new Promise((resolve, reject) => {
			const message = soapLogin({
				sessionId: SESSION_ID,
				username: this.username,
				password: this.password,
			});
			this.makeRequest(ACTION_LOGIN, message)
			.then((result) => {
				// console.log(result.statusCode);
				console.log(result.body);
				this.logged_in = isValidResponse(result);
				if (this.logged_in) { resolve(this.logged_in); } else {
					if (result.body.includes('<ResponseCode>401</ResponseCode>')) {
						reject('incorrect username/password, or reboot netgear required');
					} else { reject(Error(`${result.statusCode}`)); }
				}
			})
			.catch((err) => {	// login failed...
				reject(Error(err));
			});
		});
	}

	getAttachedDevices() {
		// Resolves promise list of connected devices to the router. Rejects if error occurred.
		console.log('Get attached devices');
		return new Promise((resolve, reject) => {
			const message = soapAttachedDevices({ sessionId: SESSION_ID });
			this.makeRequest(ACTION_GET_ATTACHED_DEVICES, message)
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
						IP: info[1],									// e.g. '10.0.0.10'
						Name: info[2],								// '--' for unknown
						MAC: info[3],									// e.g. '61:56:FA:1B:E1:21'
						ConnectionType: 'unknown',		// 'wired' or 'wireless'
						Linkspeed: 0,									// number >= 0, or NaN for wired linktype
						SignalStrength: 0,						// number <= 100
						AllowOrBlock: 'unknown',			// 'Allow' or 'Block'
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
		console.log('Get attached devices2');
		return new Promise((resolve, reject) => {
			const message = soapAttachedDevices2({ sessionId: SESSION_ID });
			this.makeRequest(ACTION_GET_ATTACHED_DEVICES2, message)
			.then((result) => {
				parseString(result.body, (err, res) => {
					if (err) { reject(err); return; }
					const entries = res['soap-env:Envelope']['soap-env:Body'][0]['m:GetAttachDevice2Response'][0]['NewAttachDevice'][0]['Device'];
					if (entries.length < 1) {
						reject(Error('Error parsing device-list'));
						return;
					}
					const entryCount = entries.length;
					const devices = [];
					for (let i = 0; i < entryCount; i++) {
						const device = {
							IP: entries[i].IP[0],																	// e.g. '10.0.0.10'
							Name: entries[i].Name[0],															// '--' for unknown
							NameUserSet: entries[i].NameUserSet[0] === 'true',		// e.g. 'false'
							MAC: entries[i].NameUserSet[0],												// e.g. '61:56:FA:1B:E1:21'
							ConnectionType: entries[i].ConnectionType[0],					// e.g. 'wired', '2.4GHz', 'Guest Wireless 2.4G'
							SSID: entries[i].ConnectionType[0],										// e.g. 'MyWiFi'
							Linkspeed: entries[i].Linkspeed[0],
							SignalStrength: Number(entries[i].SignalStrength[0]),	// number <= 100
							AllowOrBlock: entries[i].AllowOrBlock[0],							// 'Allow' or 'Block'
							Schedule: entries[i].Schedule[0],											// e.g. 'false'
							DeviceType: Number(entries[i].DeviceType[0]),					// a number
							DeviceTypeUserSet: entries[i].DeviceTypeUserSet[0] === 'true',		// e.g. 'false',
							Upload: Number(entries[i].Upload[0]),
							Download: Number(entries[i].Download[0]),
							QosPriority: Number(entries[i].QosPriority[0]),				// 1, 2, 3, 4
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
		console.log('Get traffic meter');
		return new Promise((resolve, reject) => {
			const message = soapTrafficMeter({ sessionId: SESSION_ID });
			this.makeRequest(ACTION_GET_TRAFFIC_METER,	message)
			.then((result) => {
				console.log(result.body);
				const newTodayUpload = Number(REGEX_NEW_TODAY_UPLOAD.exec(result.body)[1]);
				const newTodayDownload = Number(REGEX_NEW_TODAY_DOWNLOAD.exec(result.body)[1]);
				const traffic = {	newTodayUpload, newTodayDownload };	// in Mbytes
				resolve(traffic);
			})
			.catch((error) => {
				console.log(error);
				reject(Error(error));
			});
		});
	}

	makeRequest(action, message) {
		return new Promise((resolve, reject) => {
			if (!this.logged_in && action !== ACTION_LOGIN) {	// if not already loggedin, try to login first
				console.log('not logged in, trying first time login now');
				this.login()
				.then((result) => {	// continue with request after successful login
					if (this.logged_in) {	this.makeRequest(action, message); } else {
						reject('not getting valid response or login fails');
					}
				})
				.catch((error) => {
					reject(error);	// reuest failed because login failed
				});
			}
			// start with actual request here
			const headers = getSoapHeader(action);
			request.post({
				url: this.soap_url,
				headers,
				data: message,
			}, function (error, response, body) {
				if (error) {
					reject(error);
					return;
				}
				this.logged_in = isValidResponse(response);
				if (!this.logged_in && action !== ACTION_LOGIN) {	// try to login first if repsonse failed, but only once
					console.log('no valid response, trying to login again');
					this.login()
					.then((result) => {	// continue with request after successful login
						if (this.logged_in) {	this.makeRequest(action, message); } else {
							reject('not getting valid response or login fails');
						}
					})
					.catch((error) => {
						reject(error);	// reuest failed because login failed
					});
				} else { resolve(response); }	// resolve the request
			});
		});
	}

}

module.exports = NetgearRouter;
