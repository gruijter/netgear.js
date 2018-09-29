const NetgearRouter = require('./netgear.js');

// password, username, host and port are optional. Defaults are: 'password', 'admin', 'routerlogin.net', 80/5000
const router = new NetgearRouter(process.argv[2].toString() || 'your_password'); // [password], [user], [host], [port]

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

		// get a list of attached devices with more information (only for SOAP V3)
		const attachedDevices2 = await router.getAttachedDevices2();
		console.log(attachedDevices2);

		// get traffic statistics for this day and this month. Note: traffic monitoring must be enabled in router
		const traffic = await router.getTrafficMeter();
		console.log(traffic);

	}	catch (error) {
		console.log(error);
	}
}

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

// function to enable/disable wifi
async function doWifiStuff() {
	try {
		await router.login();
		// enable 2.4GHz guest wifi
		await router.setGuestAccessEnabled(true);
		// enable 2nd 2.4GHz guest wifi. Only available on some routers
		await router.setGuestAccessEnabled2(true);
		// disable 5GHz guest wifi
		await router.set5GGuestAccessEnabled(false);
		// disable 2nd 5GHz guest wifi. Only available on some routers
		await router.set5GGuestAccessEnabled2(false);
	}	catch (error) {
		console.log(error);
	}
}

// function to reboot router
async function reboot() {
	try {
		await router.login();
		// Reboot the router
		router.reboot();
	}	catch (error) {
		console.log(error);
	}
}


getRouterInfo();
// blockOrAllow('AA:BB:CC:DD:EE:FF', 'Block');
// blockOrAllow('AA:BB:CC:DD:EE:FF', 'Allow');
// doWifiStuff();
// reboot();
