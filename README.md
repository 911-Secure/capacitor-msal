# Capacitor MSAL Plugin

This is an OAuth 2 client plugin for Capacitor. It uses the Microsoft Authentication Library (MSAL) to authenticate the user and acquire access tokens.

## Installing

Currently, this package is only hosted at GitHub.

```
npm install github:911-Secure/capacitor-msal
```

## Configuration

### Web

This plugin is not supported in a pure web application.

### Electron

Both the Electron implementation and the needed registration function are exported as ES Modules. The `esm` package is recommended to import these modules.

Create a script (e.g. `plugins.js`) with the following content.
```js
// Enable ECMAScript Modules.
const load = require('esm')(module, {
	mainFields: ['module']
});

// Import the plugin and register function.
const { registerElectronPlugin } = load('@capacitor/electron/dist/esm');
const { Msal } = load('capacitor-msal/electron');

// Register the plugin.
registerElectronPlugin(Msal);
```

Add the newly created script to the main window as a preload script. For example,
```js
mainWindow = new BrowserWindow({
	height: 920,
	width: 1600,
	show: false,
	webPreferences: {
		nodeIntegration: true,
		preload: path.join(__dirname, 'plugins.js')
	}
});
```

Finally, this plugin only works with single instance applications. The following code should be present in your main process.
```js
const isFirstInstance = app.requestSingleInstanceLock();
if (!isFirstInstance) {
	app.quit();
	return;
}
```

### Android

Coming soon&trade;

### iOS

Coming soon&trade;
