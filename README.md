# Capacitor MSAL Plugin

This is an OAuth 2 client plugin for Capacitor. It uses the Microsoft Authentication Library (MSAL) to authenticate the user and acquire access tokens.

## Installing

```bash
npm install capacitor-msal
```

## Configuration

The `capacitor-msal` plugin needs to be imported into your application to register the plugin with Capacitor. In your app's entry point (such as `main.ts` in Angular applications), add the following line:
```ts
import 'capacitor-msal';
```

Once imported, the plugin needs to be initialized with app-specific values. In your initialization logic (such as `APP_INTIALIZER` in Angular), call the `Msal.init()` method. For example:
```ts
import { Plugins } from '@capacitor/core';
const { Msal } = Plugins;

await Msal.init({
	auth: {
		clientId: 'YOUR_CLIENT_ID'
	}
});
```

The `init` method accepts all configuration options from [MSAL.js](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options). Note that some options may not be supported on all platforms. The only required parameter is `clientId`.

### Web

The Web platform is implemented as a passthrough to MSAL.js. No extra configuration is needed.

### Electron

Once this plugin has been installed in your application, the Electron implementation needs to be installed into your Electron app as a dependency. Assuming your Electron app is one level below your root `package.json`, use the following command.
```bash
npm install ../node_modules/capacitor-msal/electron/
```

Next, the Electron implementation needs to be imported into your application as a preload script. This implementation is exported as ES Modules. The `esm` package is recommended to import this module.

Create a script (e.g. `preload.js`) with the following content.
```js
require('@capacitor/electron/dist/electron-bridge');
const importEsm = require('esm')(module, {
	mainFields: ['module']
});
importEsm('capacitor-msal/electron');
```
This will run in the renderer process to add Msal to the Capacitor Plugins proxy.

Add the newly created script to the main window as a preload script. For example,
```js
mainWindow = new BrowserWindow({
	height: 920,
	width: 1600,
	show: false,
	webPreferences: {
		nodeIntegration: true,
		preload: path.join(__dirname, 'preload.js')
	}
});
```

Configuration options within the `auth` section can also be specified in the `capacitor.config.json` file. Options specified in this file will override the options specified in the `init` method. For example:
```json
{
	"appId": "YOUR_APP_ID",
	"plugins": {
		"Msal": {
			"redirectUri": "https://login.microsoftonline.com/common/oauth2/nativeclient"
		}
	}
}
```

### Android

Coming soon&trade;

### iOS

Coming soon&trade;
