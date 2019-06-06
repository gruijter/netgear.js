## Nodejs package to communicate with Netgear routers via its SOAP interface.
Can do (almost) everything the Netgear Nighthawk, Orbi or Genie app can do.

## Supported routers
In general: If you can use the Nighthawk Orbi or Genie app to manage the router, then this node package will most likely work. Some functionality, like blocking/unblocking an attached device, only work on certain router types. MAKE SURE YOU ARE ON THE LATEST ROUTER FIRMWARE!

You can check your router version by browsing to [routerlogin.net](http://routerlogin.net/currentsetting.htm). According to the Genie and NETGEAR Nighthawk app description, at least the following routers or extenders should work:

Nighthawk: AX8 AX12 Tri-Band AX12 XR300 XR450 XR500 XR700 AC2100 AC2400 AC2600 R9000 R8900 R8500 R8300 R8000 R8000P R7900P R7960P R7900 R7800 R7000P R7000 R6900P R6900v2 R6900 R6850 R6800 R7450 R6700v3 R6700v2 R6400v2 R6400 R6350 R6260 R6230 R6220 R6120 R6080 R6020

Nighthawk Extenders: EX7700

Other Wi-Fi Routers: Orbi AC1450 Centria (WNDR4700, WND4720) JNR1010 JNR3210 JR6150 JWNR2010 R6050 R6100 R6200  R6250 R6300 R7500 WNDR3400v2 WNDR3700v3 WNDR3800 WNDR4000 WNDR4300 WNDR4500 WNDRMAC WNR1000v2 WNR1500 WNR2020 WNR2020v2 WNR2000v3 WNR2200 WNR2500 WNR3500Lv2 WNR612v2 WNR614

DSL Modem Gateways: DGN2200B DGND3700B D3600 D6000 D6100 D6200 D6000 D6200B D6300 D6300B D6400 D7000 D7800 DGN1000 DGN2200v3 DGN2200v4 DGND3700v2 DGND3800B DGND4000

Cable Gateway: C7000 C6300 C6250 C3700 C3000 N450

## Installation:
```
> npm i netgear
```

## Test:
```
> npm test yourPassword
```

## Documentation:
[Detailed documentation](https://gruijter.github.io/netgear.js/ "Netgear.js documentation")


## Quickstart:
```
// create a router session, login to router, fetch attached devices
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
```

## Example code:
```
const NetgearRouter = require('netgear');

// password, username, host and port are optional. Defaults are: 'password', 'admin', 'routerlogin.net', undefined
const router = new NetgearRouter(); // [password], [user], [host], [port]

// auto discovery a netgear router, including IP address and SOAP port. The discovered address and SOAP port will override previous settings
router.discover()
	.then(discovered => console.log(discovered))
	.catch(error => console.log(error));

// function to get various information
async function getRouterInfo() {
	try {
		// Get router type, soap version, firmware version and internet connection status without login
		const currentSetting = await router.getCurrentSetting();
		console.log(currentSetting);

		// for other methods you first need to be logged in.
		await router.login('your_password'); // [password], [username], [host], [port] will override previous settings

		// Get router type, serial number, hardware version, firmware version, soap version, firewall version, etc.
		const info = await router.getInfo();
		console.log(info);

		// Get the support features.
		const supportFeatures = await router.getSupportFeatureListXML();
		console.log(supportFeatures);

		// Get the parental control status.
		const parentalControlEnabled = await router.getParentalControlEnableStatus();
		console.log(`Parental Controls enabled: ${parentalControlEnabled}`);

		// Get the qosEnableStatus.
		const qosEnabled = await router.getQoSEnableStatus();
		console.log(`Qos Enabled: ${qosEnabled}`);

		// Get the BlockDeviceEnabled Status (= device access control)
		const accessControlEnabled = await router.getBlockDeviceEnableStatus();
		console.log(`Device Access Control enabled: ${accessControlEnabled}`);

		// get a list of attached devices
		const attachedDevices = await router.getAttachedDevices();
		console.log(attachedDevices);

		// get the trafficMeterEnabled status
		const trafficMeterEnabled = await router.getTrafficMeterEnabled();
		console.log(`Traffic Meter Enabled: ${trafficMeterEnabled}`);

		// get the trafficMeterOptions
		const trafficMeterOptions = await router.getTrafficMeterOptions();
		console.log(trafficMeterOptions);

		// get traffic statistics for this day and this month. Note: traffic monitoring must be enabled in router
		const traffic = await router.getTrafficMeter();
		console.log(traffic);

		// check for new router firmware and release note
		const firmware = await router.checkNewFirmware();
		console.log(firmware);

		// logout
		console.log('going to logout now');
		await router.logout();

	}	catch (error) {
		console.log(error);
	}
}

getRouterInfo();


// function to block or allow an attached device
async function blockOrAllow(mac, action) {
	try {
		await router.login();
		await router.setBlockDeviceEnable(true);
		const success = await router.setBlockDevice(mac, action);
		console.log(success);
	}	catch (error) {
		console.log(error);
	}
}

// block a device with mac 'AA:BB:CC:DD:EE:FF'
blockOrAllow('AA:BB:CC:DD:EE:FF', 'Block');

// allow a device with mac 'AA:BB:CC:DD:EE:FF'
blockOrAllow('AA:BB:CC:DD:EE:FF', 'Allow');


// function to retrieve Guest Wifi status
async function getGuestWifiStatus() {
	try {
		await router.login();
		const guestWifiEnabled = await router.getGuestWifiEnabled();
		console.log(`2.4G-1 Guest wifi enabled: ${guestWifiEnabled}`);
		const guestWifi5GEnabled = await router.get5GGuestWifiEnabled();
		console.log(`5G-1 Guest wifi enabled: ${guestWifi5GEnabled}`);
		const guestWifi5G2Enabled = await router.get5GGuestWifi2Enabled();
		console.log(`5G-2 Guest wifi enabled: ${guestWifi5G2Enabled}`);
	} catch (error) {
		console.log(error);
	}
}

getGuestWifiStatus();


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

doWifiStuff();


// function to enable/disable QOS
async function doQosStuff() {
	try {
		await router.login();
		// Set the qosEnableStatus.
		await router.setQoSEnableStatus(true);
		console.log('Qos enabled');
		// Set the getBandwidthControlOptions.
		console.log('trying to set Qos Bandwidth options...');
		await router.setBandwidthControlOptions(60.5, 50.5);	// in MB/s
		// Get the getBandwidthControlOptions.
		console.log('trying to get Qos Bandwidth options...');
		const bandwidthControlOptions = await router.getBandwidthControlOptions();
		console.log(bandwidthControlOptions);
	}	catch (error) {
		console.log(error);
	}
}

doQosStuff();


// function to enable/disable TrafficMeter
async function doTrafficMeterStuff() {
	try {
		await router.login();
		// enable trafficMeter.
		await router.enableTrafficMeter(true);
		console.log('Traffic meter enabled');
	}	catch (error) {
		console.log(error);
	}
}

doTrafficMeterStuff();


// function to enable/disable parental control
async function doParentalControlStuff() {
	try {
		await router.login();
		// disable parental control
		await router.enableParentalControl(false);
		console.log('Parental control disabled');
	}	catch (error) {
		console.log(error);
	}
}

doParentalControlStuff();


// function to update router firmware
async function updateNewFirmware() {
	try {
		await router.login();
		console.log('trying to update router firmware');
		await router.updateNewFirmware();
	}	catch (error) {
		console.log(error);
	}
}

updateNewFirmware();


// function to do internet speed test (takes long time!)
async function speedTest() {
	try {
		await router.login();
		console.log('speed test is starting... (wait a minute)')
		const speed = await router.speedTest(); // takes 1 minute to respond!
		console.log(speed);
	}	catch (error) {
		console.log(error);
	}
}

speedTest();


// function to reboot router
async function reboot() {
	try {
		await router.login();
		// Reboot the router
		console.log('going to reboot the router now')
		await router.reboot();
	}	catch (error) {
		console.log(error);
	}
}

reboot();


// function to send WakeOnLan command to a device
async function wol(MAC, secureOnPassword) {
	try {
		console.log(`performing WOL for ${mac}`)
		await router.wol(MAC, secureOnPassword);
	}	catch (error) {
		console.log(error);
	}
}

wol('AA:BB:CC:DD:EE:FF', '00:00:00:00:00:00');
```
