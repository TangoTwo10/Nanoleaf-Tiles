//==============================================================================
/**
@file		pi main.js
@brief		Nanoleaf Plugin
@copyright	(c) 2021, fSoft, Ltd.
			This source code is licensed under the MIT-style license found in the LICENSE file.
**/
//==============================================================================

// Global web socket
window.websocket = null;
// Global Plugin settings
window.nanoControllerCache = {status: ""};
window.nanoControllers = {};
window.nanoIP = null;
window.nanoToken = null;
window.nanoControllerIPs = [];
window.name = "PI";

var globalSettings = {};
var setupWindow;

// Setup the websocket and handle communication
function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
	// Parse parameter from string to object
	var actionInfo = JSON.parse(inActionInfo);
	var info = JSON.parse(inInfo);
	var streamDeckVersion = info['application']['version'];
	var pluginVersion = info['plugin']['version'];
	// Set settings
	settings = actionInfo['payload']['settings'];
	// Retrieve language
	var language = info['application']['language'];
	// Retrieve action identifier
	var action = actionInfo['action'];
	var device = actionInfo['device'];

	// Open the websocket to Stream Deck
	// Use 127.0.0.1 because Windows needs 300ms to resolve localhost
	window.websocket = new WebSocket('ws://127.0.0.1:' + inPort);

	// Websocket is closed
	window.websocket.onclose = function (evt) {
		var reason = WebsocketError(evt);
		log('Websocket closed: ', reason);
	};

	// Websocket received a message
	window.websocket.onerror = function (evt) {
		log('Websocket error', evt, evt.data);
	};

	// Websocket received a message
	window.websocket.onmessage = function (inEvent) {
		// Received message from Stream Deck
		var jsonObj = JSON.parse(inEvent.data);
		var event = jsonObj['event'];
		var jsonPayload = jsonObj['payload'];
		var settings;
		// Events
		switch (event) {
			case 'didReceiveGlobalSettings':
				// Set global settings
				if (jsonPayload['settings']['nanoControllers'] !== undefined) {
					window.nanoControllers = jsonPayload['settings']['nanoControllers'];
					// If at least one controller is configured build the nanoControllerCache
					if (Object.keys(window.nanoControllers).length > 0 && window.nanoControllerCache['status'] == "") {
						// Refresh the cache
						Nanoleaf.buildcache()
					}
				}
				break;
			case 'didReceiveSettings':
				settings = jsonPayload['settings'];
				// Set settings
				if (context in actions) {
					actions[context].setSettings(settings);
				}
				break;
			case 'sendToPropertyInspector':
				// Load controllers
				window.nanoControllers = jsonPayload['settings'];
				if ((window.nanoControllers == null) || (window.nanoControllers == undefined)) {
					window.nanoControllers = {};
				}
				if (Object.keys(window.nanoControllers).length > 0 && window.nanoControllerCache['status'] == "") {
					// Refresh the cache
					Nanoleaf.buildcache()
					pi.loadControllers();
				} else {
					pi.loadControllers();
				}
				break;
			default:
				log('Unprocessed event = ', event);
		}
	};

	// WebSocket is connected, send message
	window.websocket.onopen = function () {
		// Register property inspector to Stream Deck
		registerPluginOrPI(inRegisterEvent, inUUID);
		// Request the global settings of the plugin
		requestGlobalSettings(inUUID);
	};

	// Create actions
	var pi;
	if (action === 'com.fsoft.nanoleaf.power') {
		pi = new PowerPI(inUUID, language, streamDeckVersion, pluginVersion);
	} else if (action === 'com.fsoft.nanoleaf.brightness' || action === 'com.fsoft.nanoleaf.brightnessd') {
		pi = new BrightnessPI(inUUID, language, streamDeckVersion, pluginVersion, action, device);
	} else if (action === 'com.fsoft.nanoleaf.color') {
		pi = new ColorPI(inUUID, language, streamDeckVersion, pluginVersion);
	} else if (action === 'com.fsoft.nanoleaf.effect') {
		pi = new EffectPI(inUUID, language, streamDeckVersion, pluginVersion);
	}
}
