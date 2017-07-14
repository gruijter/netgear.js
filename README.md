Javascript / Nodejs Module to communicate with Netgear routers via soap interface. The code
is based on this Python version: https://github.com/balloob/pynetgear

# How to use:

```
const NetgearRouter = require('netgear.js');

// host, username and port are optional. Defaults are: 'routerlogin.net', 'admin', 5000
const router = new NetgearRouter(password, [host], [username], [port]);

router.getAttachedDevices()
	.then((result) => {
		console.log(result);
	})
	.catch((error) => {
		console.log(error);
	});

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
According to the NETGEAR Genie app description, the following routers should work:

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
