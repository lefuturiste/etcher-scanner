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
const _debug = require("debug");
const drivelist_1 = require("drivelist");
const adapter_1 = require("./adapter");
const block_device_1 = require("../../source-destination/block-device.js");
const utils_1 = require("../../utils");
// Exported so it can be mocked in tests
exports.listDrives = () => {
    return new Promise((resolve, reject) => {
        drivelist_1.list((error, drives) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(drives);
        });
    });
};
const debug = _debug('etcher-sdk:block-device-adapter');
const SCAN_INTERVAL = 1000;
const USBBOOT_RPI_COMPUTE_MODULE_NAMES = [
    '0001',
    'RPi-MSD- 0001',
    'File-Stor Gadget',
    'Linux File-Stor Gadget USB Device',
    'Linux File-Stor Gadget Media',
];
const driveKey = (drive) => {
    return drive.device + '|' + drive.size + '|' + drive.description;
};
class BlockDeviceAdapter extends adapter_1.Adapter {
    constructor(includeSystemDrives = () => false) {
        super();
        this.includeSystemDrives = includeSystemDrives;
        // Emits 'attach', 'detach', 'ready' and 'error' events
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
            while (this.running) {
                yield this.scan();
                if (!this.ready) {
                    this.ready = true;
                    this.emit('ready');
                }
                yield bluebird_1.delay(SCAN_INTERVAL);
            }
        });
    }
    scan() {
        return __awaiter(this, void 0, void 0, function* () {
            const drives = yield this.listDrives();
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
                    const blockDevice = new block_device_1.BlockDevice(drive);
                    this.emit('attach', blockDevice);
                    this.drives.set(added, blockDevice);
                }
            }
        });
    }
    listDrives() {
        return __awaiter(this, void 0, void 0, function* () {
            let drives;
            const result = new Map();
            try {
                drives = yield exports.listDrives();
            }
            catch (error) {
                debug(error);
                this.emit('error', error);
                return result;
            }
            drives = drives.filter((drive) => {
                return (
                // Always ignore RAID attached devices, as they are in danger-country;
                // Even flashing RAIDs intentionally can have unintended effects
                drive.busType !== 'RAID' &&
                    // Exclude errored drives
                    !drive.error &&
                    // Exclude system drives if needed
                    (this.includeSystemDrives() || !drive.isSystem) &&
                    // Exclude drives with no size
                    typeof drive.size === 'number');
            });
            drives.forEach((drive) => {
                // TODO: Find a better way to detect that a certain
                // block device is a compute module initialized
                // through usbboot.
                if (USBBOOT_RPI_COMPUTE_MODULE_NAMES.includes(drive.description)) {
                    drive.description = 'Compute Module';
                    drive.icon = 'raspberrypi'; // TODO: Should this be in the sdk?
                    drive.isSystem = false;
                }
                if (/PhysicalDrive/i.test(drive.device) && drive.mountpoints.length) {
                    // Windows
                    drive.displayName = drive.mountpoints.map(m => m.path).join(', ');
                }
                else {
                    drive.displayName = drive.device;
                }
            });
            for (const drive of drives) {
                result.set(driveKey(drive), drive);
            }
            return result;
        });
    }
}
exports.BlockDeviceAdapter = BlockDeviceAdapter;
//# sourceMappingURL=block-device.js.map
