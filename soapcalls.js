/* This Source Code Form is subject to the terms of the Mozilla Public
	License, v. 2.0. If a copy of the MPL was not distributed with this
	file, You can obtain one at http://mozilla.org/MPL/2.0/.

	Copyright 2017 - 2022, Robin de Gruijter <gruijter@hotmail.com> */

'use strict';

exports.action = {
	// device config
	loginOld: 'urn:NETGEAR-ROUTER:service:ParentalControl:1#Authenticate',
	login: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#SOAPLogin',
	logout: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#SOAPLogout',
	reboot: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#Reboot',
	checkNewFirmware: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#CheckNewFirmware',
	checkAppNewFirmware: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#CheckAppNewFirmware',
	updateNewFirmware: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#UpdateNewFirmware',
	configurationStarted: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#ConfigurationStarted',
	configurationFinished: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#ConfigurationFinished',
	getDeviceConfig: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetInfo',
	getTimeZoneInfo: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetTimeZoneInfo', // ***NEW***

	getNTPServers: 'urn:NETGEAR-ROUTER:service:Time:1#GetInfo',	// ***NEW***

	// device config, block/allow device related
	getDeviceListAll: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetDeviceListAll', // ***NEW*** gives list of all allowed devices
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
	getLANConfig: 'urn:NETGEAR-ROUTER:service:LANConfigSecurity:1#GetInfo',
	getWANIPConnection: 'urn:NETGEAR-ROUTER:service:WANIPConnection:1#GetInfo',	// external IP, gateway, MAC, MTU, DNS
	getEthernetLinkStatus: 'urn:NETGEAR-ROUTER:service:WANEthernetLinkConfig:1#GetEthernetLinkStatus', // ***NEW***
	getPortMappingInfo: 'urn:NETGEAR-ROUTER:service:WANIPConnection:1#GetPortMappingInfo', // ***NEW***
	getWANConnectionTypeInfo: 'urn:NETGEAR-ROUTER:service:WANIPConnection:1#GetConnectionTypeInfo', // ***NEW*** > e.g. DHCP
	getWANInternetPortInfo: 'urn:NETGEAR-ROUTER:service:WANIPConnection:1#GetInternetPortInfo', // ***NEW*** > e.g. Ethernet

	// parental control
	getParentalControlEnableStatus: 'urn:NETGEAR-ROUTER:service:ParentalControl:1#GetEnableStatus',
	enableParentalControl: 'urn:NETGEAR-ROUTER:service:ParentalControl:1#EnableParentalControl',

	// device info
	getInfo: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetInfo',
	getSupportFeatureListXML: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetSupportFeatureListXML',
	getAttachedDevices: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice',
	getAttachedDevices2: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetAttachDevice2',
	setNetgearDeviceName: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#SetNetgearDeviceName',
	getSystemLogs: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetSystemLogs', // ***NEW***
	getSystemInfo: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetSystemInfo', // ***NEW***
	getSysUpTime: 'urn:NETGEAR-ROUTER:service:DeviceInfo:1#GetSysUpTime',	// ***NEW***

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
	getSmartConnectEnabled: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#IsSmartConnectEnabled',
	setSmartConnectEnabled: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetSmartConnectEnable',
	getAvailableChannel: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetAvailableChannel',
	getChannelInfo: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetChannelInfo',
	get5GChannelInfo: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GChannelInfo',
	get5G1ChannelInfo: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5G1ChannelInfo',
	setChannel: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetChannel',
	set5GChannel: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Set5GChannel',
	set5G1Channel: 'urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Set5G1Channel',

	// NEW STUFF, untested or unkown what it does
	getCurrentDeviceBandwidth: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetCurrentDeviceBandwidth',	// ***NEW*** response on R7000, not R7800
	getCurrentBandwidthByMAC: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetCurrentBandwidthByMAC', // ***NEW*** response on R7000, not R7800

	// NEW STUFF > still needs to be implemented in netger.js
	setUserOptionsTC: 'urn:NETGEAR-ROUTER:service:UserOptionsTC:1#SetUserOptionsTC',	// ***NEW***
	getBandwidthControlEnableStatus: 'urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetBandwidthControlEnableStatus', // ***NEW***

	// Potentially NEW STUFF > still needs to be implemented in soapcalls.js

	// getCurrentAppBandwidth: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetCurrentAppBandwidth',	// cannot get this to work yet...
	// getCurrentAppBandwidthByMAC: 'urn:NETGEAR-ROUTER:service:AdvancedQoS:1#GetCurrentAppBandwidthByMAC', // cannot get this to work yet...
	// getWANDNSLookUpStatus: 'urn:NETGEAR-ROUTER:service:WANIPConnection:1#GetDNSLookUpStatus', // ***NEW*** cannot get this to work on R7800

	// urn:NETGEAR-ROUTER:service:AdvancedQOS:1#GetDevicePriorityByMAC

	// urn:NETGEAR-ROUTER:service:WANIPConnection:1#GetRemoteManagementEnableStatus

	// urn:NETGEAR-ROUTER:service:WANIPConnection:1#GetPPPConnStatus

	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetWEPSecurityKeys
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GWEPSecurityKeys
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetWPASecurityKeys
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GWPASecurityKeys
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5G1WPASecurityKeys
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Set5GWLANWPAPSKByPassphrase
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetGuestAccessNetworkInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#SetGuestAccessNetwork
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GGuestAccessNetworkInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5G1GuestAccessNetworkInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5G1Info
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GSSID
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetRegion
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetSSID
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetSSIDBroadcast
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetWirelessMode > e.g. 600Mbps
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GWirelessMode > e.g 1300Mbps
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetWPSMode
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetWPSPINInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Is5GSupported
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Is60GSupported
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#Get5GBandChannelInfo
	// urn:NETGEAR-ROUTER:service:WLANConfiguration:1#GetSupportMode

	// urn:NETGEAR-ROUTER:service:ParentalControl:1#GetAllMACAddresses
	// urn:NETGEAR-ROUTER:service:ParentalControl:1#GetDNSMasqDeviceID
	// urn:NETGEAR-ROUTER:service:ParentalControl:1#DeleteMACAddress

	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#SetTrafficMeterOptions
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetBlockDeviceStateByDefault
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetBlockSiteInfo
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetDeviceListByMode
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetQoSRules
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetStaticRouteTbl
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#IsDLNAEnabled
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#IsDLNASupported
	// urn:NETGEAR-ROUTER:service:DeviceConfig:1#GetConfigInfo	> gives config file in Base64-encoded string

	// urn:NETGEAR-ROUTER:service:DeviceInfo:1#SetDeviceNameIconByMAC

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

exports.getNTPServers = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetInfo xsi:nil="true" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getTimeZoneInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetTimeZoneInfo xsi:nil="true" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getSysUpTime = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetSysUpTime xsi:nil="true" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getSystemInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetSystemInfo xsi:nil="true" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getSystemLogs = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetSystemLogs xsi:nil="true" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getLANConfig = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:LANConfigSecurity:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getEthernetLinkStatus = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetEthernetLinkStatus xsi:nil="true" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getWANIPConnection = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:WANIPConnection:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getWANConnectionTypeInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:WANIPConnection:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getWANDNSLookUpStatus = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:WANIPConnection:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getWANInternetPortInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:WANIPConnection:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getPortMappingInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetPortMappingInfo xmlns:n0="urn:NETGEAR-ROUTER:service:WANIPConnection:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getDeviceConfig = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetInfo xmlns:n0="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getDeviceListAll = (sessionId) => {
	const soapBody = `<v:Body>
		<n0:GetDeviceListAll xmlns:n0="urn:NETGEAR-ROUTER:service:DeviceConfig:1" />
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

exports.getCurrentDeviceBandwidth = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetCurrentDeviceBandwidth xmlns:M1="urn:NETGEAR-ROUTER:service:AdvancedQoS:1">
		</M1:GetCurrentDeviceBandwidth>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getCurrentBandwidthByMAC = (sessionId, mac) => {
	const soapBody = `<v:Body>
		<M1:GetCurrentBandwidthByMAC xmlns:M1="urn:NETGEAR-ROUTER:service:AdvancedQoS:1>
			<NewMACAddress>${mac}</NewMACAddress>
		</M1:GetCurrentBandwidthByMAC>
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

exports.getBandwidthControlEnableStatus = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetBandwidthControlEnableStatus xsi:nil="true" />
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

// band = 2.4G or 5G or 5G1???
exports.getAvailableChannel = (sessionId, band) => {
	const soapBody = `<v:Body>
		<n0:GetAvailableChannel xmlns:n0="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewBand>${band}</NewBand>
		</n0:GetAvailableChannel>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.setChannel = (sessionId, channel) => {
	const soapBody = `<v:Body>
		<M1:SetChannel xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<NewChannel>${channel}</NewChannel>
		</M1:SetChannel>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.set5GChannel = (sessionId, channel) => {
	const soapBody = `<v:Body>
		<M1:Set5GChannel xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<New5GChannel>${channel}</New5GChannel>
		</M1:Set5GChannel>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.set5G1Channel = (sessionId, channel) => {
	const soapBody = `<v:Body>
		<M1:Set5G1Channel xmlns:M1="urn:NETGEAR-ROUTER:service:WLANConfiguration:1">
			<New5G1Channel>${channel}</New5G1Channel>
		</M1:Set5G1Channel>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.getChannelInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:GetChannelInfo/>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.get5GChannelInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:Get5GChannelInfo/>
	</v:Body>`;
	return soapEnvelope(sessionId, soapBody);
};

exports.get5G1ChannelInfo = (sessionId) => {
	const soapBody = `<v:Body>
		<M1:Get5G1ChannelInfo/>
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
