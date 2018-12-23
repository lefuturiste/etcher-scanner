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
const crypto_1 = require("crypto");
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("./fs");
const TMP_RANDOM_BYTES = 6;
const TMP_DIR = os_1.tmpdir();
const TRIES = 5;
const randomFilePath = () => {
    return path_1.join(TMP_DIR, `${crypto_1.randomBytes(TMP_RANDOM_BYTES).toString('hex')}.tmp`);
};
exports.tmpFile = (keepOpen = true) => __awaiter(this, void 0, void 0, function* () {
    let fd;
    let path;
    let ok = false;
    for (let i = 0; i < TRIES; i++) {
        path = randomFilePath();
        try {
            fd = yield fs_1.open(path, 'wx+');
            ok = true;
            break;
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }
    if (!ok) {
        throw new Error(`Could not generate a temporary filename in ${TRIES} tries`);
    }
    if (!keepOpen && fd !== undefined) {
        yield fs_1.close(fd);
        fd = undefined;
    }
    return { fd, path: path };
});
exports.tmpFileDisposer = (keepOpen = true) => {
    return bluebird_1.resolve(exports.tmpFile(keepOpen)).disposer((result) => __awaiter(this, void 0, void 0, function* () {
        if (keepOpen && result.fd !== undefined) {
            yield fs_1.close(result.fd);
        }
        yield fs_1.unlink(result.path);
    }));
};
//# sourceMappingURL=tmp.js.map