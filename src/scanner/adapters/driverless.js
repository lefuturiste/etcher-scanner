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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const bluebird_1 = require("bluebird");
const process_1 = require("process");
const driverless_1 = require("../../source-destination/driverless");
const adapter_1 = require("./adapter");
const utils_1 = require("../../utils");
const SCAN_INTERVAL = 1000;
class DriverlessDeviceAdapter_ extends adapter_1.Adapter {
    constructor() {
        super(...arguments);
        // Emits 'attach', 'detach' and 'ready'
        this.drives = new Map();
        this.running = false;
        this.ready = false;
    }
    start() {
        this.running = true;
        this.scanLoop();
    }
    stop() {
        this.running = false;
        this.ready = false;
        this.drives.clear();
    }
    scanLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            // This imort fails on anything else than win32 and this class will only be exported on win32
            this.listDriverlessDevices = (yield Promise.resolve().then(() => require('winusb-driver-generator'))).listDriverlessDevices;
            while (this.running) {
                this.scan();
                if (!this.ready) {
                    this.ready = true;
                    this.emit('ready');
                }
                yield bluebird_1.delay(SCAN_INTERVAL);
            }
        });
    }
    scan() {
        const drives = this.listDrives();
        if (this.running) {
            // we may have been stopped while listing the drives.
            const oldDevices = new Set(this.drives.keys());
            const newDevices = new Set(drives.keys());
            for (const removed of utils_1.difference(oldDevices, newDevices)) {
                this.emit('detach', this.drives.get(removed));
                this.drives.delete(removed);
            }
            for (const added of utils_1.difference(newDevices, oldDevices)) {
                const drive = drives.get(added);
                const driverlessDevice = new driverless_1.DriverlessDevice(drive);
                this.emit('attach', driverlessDevice);
                this.drives.set(added, driverlessDevice);
            }
        }
    }
    listDrives() {
        const devices = this.listDriverlessDevices();
        const result = new Map();
        for (const device of devices) {
            result.set(device.did, device);
        }
        return result;
    }
}
exports.DriverlessDeviceAdapter = process_1.platform === 'win32' ? DriverlessDeviceAdapter_ : undefined;
//# sourceMappingURL=driverless.js.map