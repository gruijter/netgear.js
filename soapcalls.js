/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017 - 2019, Robin de Gruijter <gruijter@hotmail.com> */

'use strict';

exports.action = {
	// device config
	loginOld: 'urn:NETGEAR-ROUTER:service:ParentalControl:1#Authenticate',
	login: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#SOAPLogin',
	logout: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#SOAPLogout',
	reboot: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#Reboot',
	checkNewFirmware: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#CheckNewFirmware',
	checkAppNewFirmware: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#CheckAppNewFirmware', // ***NEW***
	updateNewFirmware: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#UpdateNewFirmware',
	configurationStarted: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#ConfigurationStarted',
	configurationFinished: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#ConfigurationFinished',
	getDeviceConfig: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetInfo',	// ***NEW***

	// device config, block/allow device related
	getBlockDeviceEnableStatus: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetBlockDeviceEnableStatus',
	setBlockDeviceEnable: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#SetBlockDeviceEnable',
	enableBlockDeviceForAll: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#EnableBlockDeviceForAll', // deprecated?
	setBlockDevice: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#SetBlockDeviceByMAC',

	// device config, traffic meter related
	getTrafficMeterEnabled: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetTrafficMeterEnabled',
	getTrafficMeterOptions: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetTrafficMeterOptions',
	getTrafficMeter: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetTrafficMeterStatistics',
	enableTrafficMeter: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#EnableTrafficMeter',

	// device config, LAN/WAN related
	getLANConfig: 'urn:NETGEAR-ROUTER:service:LANConfigSecurity:1#GetInfo',	// ***NEW***
	getWANIPConnection: 'urn:NETGEAR-ROUTER:service:WANIPConnection:1#GetInfo', // ***NEW***

	// parental control
	getParentalControlEnableStatus: 'urn:NETGEAR-ROUTER:service:ParentalControl:1#GetEnableStatus',
	enableParentalControl: 'urn:NETGEAR-ROUTER:service:ParentalControl:1#EnableParentalControl',

	// device info
	getInfo: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetInfo',
	getSupportFeatureListXML: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetSupportFeatureListXML',
	getAttachedDevices: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice',
	getAttachedDevices2: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice2',

	// AdvancedQoS
	speedTestStart: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#SetOOKLASpeedTestStart',
	speedTestResult: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetOOKLASpeedTestResult',
	getQoSEnableStatus: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetQoSEnableStatus',
	setQoSEnableStatus: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#SetQoSEnableStatus',
	getBandwidthControlOptions: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetBandwidthControlOptions',
	setBandwidthControlOptions: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#SetBandwidthControlOptions',

	// WLANConfiguration
	getGuestAccessEnabled: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetGuestAccessEnabled',	// 2.4G-1 R7800/R8000
	get5G1GuestAccessEnabled: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GGuestAccessEnabled',	// 5G-1 R7800
	get5G1GuestAccessEnabled2: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5G1GuestAccessEnabled',	// 5G-1 R8000
	get5GGuestAccessEnabled2: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GGuestAccessEnabled2',	// 5G-2 R8000
	setGuestAccessEnabled: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetGuestAccessEnabled',	// 2.4G-1 R7800
	setGuestAccessEnabled2: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetGuestAccessEnabled2',	// 2.4G-1 R8000
	set5G1GuestAccessEnabled: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Set5GGuestAccessEnabled',	// 5G-1 R7800
	set5G1GuestAccessEnabled2: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Set5G1GuestAccessEnabled2',	// 5G-1 R8000
	set5GGuestAccessEnabled2: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Set5GGuestAccessEnabled2',	// 5G-2 R8000
	getSmartConnectEnabled: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#IsSmartConnectEnabled',	// ***NEW***
	setSmartConnectEnabled: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetSmartConnectEnable',	// ***NEW***

	// Potentially NEW STUFF > still needs to be implemented in soapcalls.js
	// urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetCurrentAppBandwidth
	// urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetCurrentDeviceBandwidth
	// urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetCurrentAppBandwidthByMAC
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetWPASecurityKeys
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GWPASecurityKeys
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Set5GWLANWPAPSKByPassphrase
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetGuestAccessNetworkInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetGuestAccessNetwork
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GGuestAccessNetworkInfo
	// urn:NETGEAR-ROUTER:service:ParentalControl:1#GetAllMACAddresses
	// urn:NETGEAR-ROUTER:service:ParentalControl:1#GetDNSMasqDeviceID
	// urn:NETGEAR-ROUTER:service:ParentalControl:1#SetDNSMasqDeviceID
	// urn:NETGEAR-ROUTER:service:ParentalControl:1#DeleteMACAddress
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#SetTrafficMeterOptions
	// urn:NETGEAR-ROUTER:service:DeviceInfo:1#SetDeviceNameIconByMAC

	// NEW STUFF > still needs to be implemented in netger.js
	setUserOptionsTC: 'urn:NETGEAR-ROUTER:service:UserOptionsTC:1#SetUserOptionsTC',	// ***NEW***
	getAvailableChannel: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetAvailableChannel',	// ***NEW***
	setNetgearDeviceName: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#SetNetgearDeviceName', // ***NEW***

};

const soapEnvelope = (sessionId, soapBody) => {
	const soapRequest = `<!--?xml version="1.0" encoding= "UTF-8" ?-->
	<v:Envelope
	xmlns:v="http://schemas.xmlsoap.org/soap/envelope/">
	<v:Header>
		<SessionID>${sessionId}</SessionID>
	</v:Header>
	${soapBody}
	</v:Envelope>`;
	return soapRequest;
};

exports.loginOld = (sessionId, username, password) => {
	const soapBody = `<v:Body>
	<Authenticate>
		<NewUsername xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${username}</NewUsername>
		<NewPassword xsi:type="xsd:string" xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance">${password}</NewPassword>
	</Authenticate>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.login = (sessionId, username, password) => {
	const soapBody = `<v:Body>
	<M1:SOAPLogin xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
		<Username>${username}</Username>
		<Password>${password}</Password>
	</M1:SOAPLogin>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.logout = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:SOAPLogout xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetInfo xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceInfo:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getSupportFeatureListXML = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetSupportFeatureListXML xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceInfo:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getLANConfig = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:LANConfigSecurity:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getWANIPConnection = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:WANIPConnection:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getDeviceConfig = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getParentalControlEnableStatus = (sessionId) => {
	const soapBody = `<v:Body>
		<GetEnableStatus>
		</GetEnableStatus>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.enableParentalControl = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<EnableParentalControl>
			<NewEnable>${enabled * 1}</NewEnable>
		</EnableParentalControl>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getQoSEnableStatus = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetQoSEnableStatus xmlns:M1="urn:NETGEAR-ROUTER:service:AdvancedQoS:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getBlockDeviceEnableStatus = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetBlockDeviceEnableStatus xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getTrafficMeterEnabled = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetTrafficMeterEnabled xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.enableTrafficMeter = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<M1:EnableTrafficMeter xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
			<NewTrafficMeterEnable>${enabled * 1}</NewTrafficMeterEnable>
		</M1:EnableTrafficMeter>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getTrafficMeterOptions = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetTrafficMeterOptions xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getBandwidthControlOptions = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetBandwidthControlOptions xmlns:M1="urn:NETGEAR-ROUTER:service:AdvancedQoS:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.enableBlockDeviceForAll = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:EnableBlockDeviceForAll xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setQoSEnableStatus = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<M1:SetQoSEnableStatus xmlns:M1="urn:NETGEAR-ROUTER:service:AdvancedQoS:1">
		  <NewQoSEnable>${enabled * 1}</NewQoSEnable>
		</M1:SetQoSEnableStatus>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setBandwidthControlOptions = (sessionId, newUplinkBandwidth, newDownlinkBandwidth) => {
	const soapBody = `<v:Body>
		<M1:SetBandwidthControlOptions xmlns:M1="urn:NETGEAR-ROUTER:service:AdvancedQoS:1">
		  <NewUplinkBandwidth>${newUplinkBandwidth}</NewUplinkBandwidth>
		  <NewDownlinkBandwidth>${newDownlinkBandwidth}</NewDownlinkBandwidth>
		  <NewSettingMethod>1</NewSettingMethod>
		</M1:SetBandwidthControlOptions>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setBlockDeviceEnable = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<M1:SetBlockDeviceEnable xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
		  <NewBlockDeviceEnable>${enabled * 1}</NewBlockDeviceEnable>
		</M1:SetBlockDeviceEnable>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setBlockDevice = (sessionId, mac, allowOrBlock) => {
	const soapBody = `<v:Body>
		<M1:SetBlockDeviceByMAC xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
			<NewAllowOrBlock>${allowOrBlock}</NewAllowOrBlock>
			<NewMACAddress>${mac}</NewMACAddress>
		</M1:SetBlockDeviceByMAC>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.configurationStarted = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:ConfigurationStarted xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
			<NewSessionID>${sessionId}</NewSessionID>
		</M1:ConfigurationStarted>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.configurationFinished = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:ConfigurationFinished xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
			<NewStatus>ChangesApplied</NewStatus>
		</M1:ConfigurationFinished>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.attachedDevices = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetAttachDevice xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceInfo:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.attachedDevices2 = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetAttachDevice2 xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceInfo:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.trafficMeter = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetTrafficMeterStatistics xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getGuestAccessEnabled = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetGuestAccessEnabled xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.get5G1GuestAccessEnabled = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:Get5G1GuestAccessEnabled xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.get5GGuestAccessEnabled2 = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:Get5GGuestAccessEnabled2 xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setGuestAccessEnabled = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<M1:SetGuestAccessEnabled xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewGuestAccessEnabled>${enabled * 1}</NewGuestAccessEnabled>
		</M1:SetGuestAccessEnabled>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setGuestAccessEnabled2 = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<M1:SetGuestAccessEnabled2 xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewGuestAccessEnabled>${enabled * 1}</NewGuestAccessEnabled>
		</M1:SetGuestAccessEnabled2>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.set5G1GuestAccessEnabled = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<M1:Set5G1GuestAccessEnabled xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewGuestAccessEnabled>${enabled * 1}</NewGuestAccessEnabled>
		</M1:Set5G1GuestAccessEnabled>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.set5G1GuestAccessEnabled2 = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<M1:Set5G1GuestAccessEnabled2 xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewGuestAccessEnabled>${enabled * 1}</NewGuestAccessEnabled>
		</M1:Set5G1GuestAccessEnabled2>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.set5GGuestAccessEnabled2 = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<M1:Set5GGuestAccessEnabled2 xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewGuestAccessEnabled>${enabled * 1}</NewGuestAccessEnabled>
		</M1:Set5GGuestAccessEnabled2>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.reboot = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:Reboot xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.checkNewFirmware = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:CheckNewFirmware xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.checkAppNewFirmware = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:CheckAppNewFirmware xmlns:n0="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
			<CheckDurationSecond>150</CheckDurationSecond>
		</n0:CheckAppNewFirmware>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.updateNewFirmware = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:UpdateNewFirmware xmlns:M1="urn:NETGEAR-ROUTER:service:DeviceConfig:1">
		  <YesOrNo>1</YesOrNo>
		</M1:UpdateNewFirmware>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.speedTestStart = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:SetOOKLASpeedTestStart xmlns:M1="urn:NETGEAR-ROUTER:service:AdvancedQoS:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.speedTestResult = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetOOKLASpeedTestResult xmlns:M1="urn:NETGEAR-ROUTER:service:AdvancedQoS:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getSmartConnectEnabled = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:IsSmartConnectEnabled xmlns:n0="urn:NETGEAR-ROUTER:service:WLANConfiguration:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setSmartConnectEnabled = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<n0:SetSmartConnectEnable xmlns:n0="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewSmartConnectEnable>${enabled * 1}</NewSmartConnectEnable>
		</n0:SetSmartConnectEnable>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

// new stuff

// no clue what this does....
exports.setUserOptionsTC = (sessionId, enabled) => {
	const soapBody = `<v:Body>
		<n0:SetUserOptionsTC xmlns:n0="urn:NETGEAT-ROUTER:service:UserOptionsTC:1">
		<UserOptions>${enabled * 1}</UserOptions>
		</n0:SetUserOptionsTC>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

// band = 2.4G or 5G
exports.getAvailableChannel = (sessionId, band) => {
	const soapBody = `<v:Body>
		<n0:GetAvailableChannel xmlns:n0="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewBand>${band}</NewBand>
		</n0:GetAvailableChannel>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setNetgearDeviceName = (sessionId, MAC, name) => {
	const soapBody = `<v:Body>
		<n0:SetNetgearDeviceName xmlns:n0="urn:NETGEAR-ROUTER:service:DeviceInfo:1">
			<MAC>${MAC}</MAC>
			<Name>${name}</Name>
		</n0:SetNetgearDeviceName>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};
