Javascript / Nodejs Module to communicate with Netgear routers via soap interface. The initial code
was inspired on this Python version: https://github.com/balloob/pynetgear

# Example code:

```
const NetgearRouter = require('netgear');

// password, username, host and port are optional. Defaults are: 'password', 'admin', 'routerlogin.net', 80/5000
const router = new NetgearRouter('your password'); // [password], [user], [host], [port]

// function to get various information
async function getRouterInfo() {
	try {
		// Get router type, soap version, firmware version and internet connection status without login
		const currentSetting = await router.getCurrentSetting();
		console.log(currentSetting);

		// for other methods you first need to be logged in.
		await router.login(); // [password], [username], [host], [port] will override previous settings

		// Get router type, serial number, hardware version, firmware version, soap version, firewall version, etc.
		const info = await router.getInfo();
		console.log(info);

		// get a list of attached devices
		const attachedDevices = await router.getAttachedDevices();
		console.log(attachedDevices);

		// get traffic statistics for this day and this month. Note: traffic monitoring must be enabled in router
		const traffic = await router.getTrafficMeter();
		console.log(traffic);

		// check for new router firmware and release note
		const firmware = await router.checkNewFirmware();
		console.log(firmware);

	}	catch (error) {
		console.log(error);
	}
}

getRouterInfo();


// function to block or allow an attached device
async function blockOrAllow(mac, action) {
	try {
		await router.login();
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


// function to reboot router
async function reboot() {
	try {
		await router.login();
		// Reboot the router
		await router.reboot();
	}	catch (error) {
		console.log(error);
	}
}

reboot();
```


# Supported routers
In general: If you can use the genie app to manage the router then this module will most likely work. The module is confirmed to work with WNDR4500v2, R6250, R7000, R7800, R8000 and Orbi.
You can check the router version by browsing to http://routerlogin.net/currentsetting.htm . According to the NETGEAR Genie app description, the following routers should work:

Wi-Fi Routers:
AC1450
Centria (WNDR4700, WND4720)
JNR1010
JNR3210
JR6150
JWNR2010
R6050
R6100
R6200
R6220
R6250
R6300
R6400
R6700
R6900
R7000
R7500
R7500
R7800
R7900
R8000
R8300
R8500
R9000
WNDR3400v2
WNDR3700v3
WNDR3800
WNDR4000
WNDR4300
WNDR4500
WNDRMAC
WNR1000v2
WNR1500
WNR2020
WNR2020v2
WNR2000v3
WNR2200
WNR2500
WNR3500Lv2
WNR612v2
WNR614

DSL Modem Gateways:
DGN2200B
DGND3700B
D3600
D6000
D6100
D6200
D6000
D6200B
D6300
D6300B
D6400
D7000
D7800
DGN1000
DGN2200v3
DGN2200v4
DGND3700v2
DGND3800B
DGND4000

Cable Gateway:
C7000
C6300
C6250
C3700
C3000
N450
