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
const child_process_1 = require("child_process");
const _debug = require("debug");
const os_1 = require("os");
const fs_1 = require("./fs");
const tmp_1 = require("./tmp");
const debug = _debug('etcher-sdk:diskpart');
const DISKPART_DELAY = 2000;
const DISKPART_RETRIES = 5;
const PATTERN = /PHYSICALDRIVE(\d+)/i;
const execAsync = (command) => __awaiter(this, void 0, void 0, function* () {
    return yield new Promise((resolve, reject) => {
        child_process_1.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
});
/**
 * @summary Run a diskpart script
 * @param {Array<String>} commands - list of commands to run
 */
const runDiskpart = (commands) => __awaiter(this, void 0, void 0, function* () {
    if (os_1.platform() !== 'win32') {
        return;
    }
    yield bluebird_1.using(tmp_1.tmpFileDisposer(false), (file) => __awaiter(this, void 0, void 0, function* () {
        yield fs_1.writeFile(file.path, commands.join('\r\n'));
        const { stdout, stderr } = yield execAsync(`diskpart /s ${file.path}`);
        debug('stdout:', stdout);
        debug('stderr:', stderr);
    }));
});
/**
 * @summary Clean a device's partition tables
 * @param {String} device - device path
 * @example
 * diskpart.clean('\\\\.\\PhysicalDrive2')
 *   .then(...)
 *   .catch(...)
 */
exports.clean = (device) => __awaiter(this, void 0, void 0, function* () {
    if (os_1.platform() !== 'win32') {
        return;
    }
    const match = device.match(PATTERN);
    if (match === null) {
        throw new Error(`Invalid device: "${device}"`);
    }
    debug('clean', device);
    const deviceId = match.pop();
    let errorCount = 0;
    while (errorCount <= DISKPART_RETRIES) {
        try {
            yield runDiskpart([`select disk ${deviceId}`, 'clean', 'rescan']);
            return;
        }
        catch (error) {
            errorCount += 1;
            if (errorCount <= DISKPART_RETRIES) {
                yield bluebird_1.delay(DISKPART_DELAY);
            }
            else {
                throw new Error(`Couldn't clean the drive, ${error.failure.message} (code ${error.failure.code})`);
            }
        }
    }
});
//# sourceMappingURL=diskpart.js.map