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
const fs = require("fs");
function close(fd) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => {
            fs.close(fd, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}
exports.close = close;
function fstat(fd) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            fs.fstat(fd, (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(stats);
            });
        });
    });
}
exports.fstat = fstat;
function fsync(fd) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => {
            fs.fsync(fd, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}
exports.fsync = fsync;
function open(path, flags, mode = 0o666) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            fs.open(path, flags, mode, (err, fd) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(fd);
            });
        });
    });
}
exports.open = open;
function read(fd, buffer, offset, length, position) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ bytesRead, buffer });
            });
        });
    });
}
exports.read = read;
function readFile(path, options = {
    encoding: null,
    flag: 'r',
}) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            fs.readFile(path, options, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            });
        });
    });
}
exports.readFile = readFile;
function stat(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            fs.stat(path, (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(stats);
            });
        });
    });
}
exports.stat = stat;
function writeFile(path, data, options = { encoding: 'utf8', mode: 0o666, flag: 'w' }) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => {
            fs.writeFile(path, data, options, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}
exports.writeFile = writeFile;
function unlink(path) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => {
            fs.unlink(path, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}
exports.unlink = unlink;
function write(fd, buffer, offset, length, position) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            fs.write(fd, buffer, offset, length, position, (err, bytesWritten, buffer) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ bytesWritten, buffer });
            });
        });
    });
}
exports.write = write;
//# sourceMappingURL=fs.js.map