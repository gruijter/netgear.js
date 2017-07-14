Javascript / Nodejs Module to communicate with Netgear routers via soap interface. The code
is based on this Python version: https://github.com/balloob/pynetgear

# How to use:

```
const NetgearRouter = require('netgear.js');

// host, username and port are optional. Defaults are: 'routerlogin.net', 'admin', 5000
const router = new NetgearRouter(password, [host], [username], [port]);

//Get router type, soap version, firmware version and internet connection status
router.getCurrentSetting()
	.then((result) => {
		console.log(result);
	})
	.catch((error) => {
		console.log(error);
	});

// get a list of attached devices
router.getAttachedDevices()
	.then((result) => {
		console.log(result);
	})
	.catch((error) => {
		console.log(error);
	});

// get a list of attached devices with more information (only for certain firmwares?)
router.getAttachedDevices2()
	.then((result) => {
		console.log(result);
	})
	.catch((error) => {
		console.log(error);
	});

// get traffic statistics for this day
router.getTrafficMeter()
	.then((result) => {
		console.log(result);
	})
	.catch((error) => {
		console.log(error);
	});
```


# Supported routers

It has been tested with the Netgear R7000 router.
According to the NETGEAR Genie app description, the following routers might also work:

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
