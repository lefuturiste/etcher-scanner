"use strict";
/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const usbboot_1 = require("../../source-destination/usbboot");
const adapter_1 = require("./adapter");
let UsbbootScanner = undefined;
try {
    // tslint:disable: no-var-requires
    UsbbootScanner = require('node-raspberrypi-usbboot').UsbbootScanner;
}
catch (error) {
    console.warn('Failed to import node-raspberrypi-usbboot:', error);
}
class UsbbootDeviceAdapter extends adapter_1.Adapter {
    constructor() {
        super();
        this.drives = new Map();
        if (UsbbootScanner !== undefined) {
            this.scanner = new UsbbootScanner();
            this.scanner.on('attach', this.onAttach.bind(this));
            this.scanner.on('detach', this.onDetach.bind(this));
            this.scanner.on('ready', this.emit.bind(this, 'ready'));
            this.scanner.on('error', this.emit.bind(this, 'error'));
        }
        else {
            console.warn('node-raspberrypi-usbboot not available');
            setImmediate(this.emit.bind(this, 'ready'));
        }
    }
    start() {
        this.scanner.start();
    }
    stop() {
        this.scanner.stop();
    }
    onAttach(device) {
        let drive = this.drives.get(device);
        if (drive === undefined) {
            drive = new usbboot_1.UsbbootDrive(device);
            this.drives.set(device, drive);
        }
        this.emit('attach', drive);
    }
    onDetach(device) {
        const drive = this.drives.get(device);
        this.drives.delete(device);
        this.emit('detach', drive);
    }
}
exports.UsbbootDeviceAdapter = UsbbootDeviceAdapter;
//# sourceMappingURL=usbboot.js.map