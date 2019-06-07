/* eslint-disable no-console */
/* eslint-disable import/no-unresolved */
// testing from runkit is not (yet) supported.
// please try testing from a desktop (see test.js)

const NetgearRouter = require('netgear');

const router = new NetgearRouter({ password: 'password' });

router.getCurrentSetting()
	.then(console.log)
	.catch(console.log);

router.login()
	.then(() => {
		router.getInfo()
			.then(console.log)
			.catch(console.log);

		router.getAttachedDevices()
			.then(console.log)
			.catch(console.log);
	})
	.catch(console.log);
