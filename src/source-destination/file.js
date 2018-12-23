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
// Can't use "import { constants, ReadStream, WriteStream } from 'fs';"
// as ReadStream and WriteStream are defined as interfaces in @types/node
// and are not imported in the generated js. They are classes, not interfaces.
const fs = require("fs");
const path_1 = require("path");
const progress_1 = require("./progress");
const source_destination_1 = require("./source-destination");
const constants_1 = require("../constants");
const fs_1 = require("../fs");
const destination_sparse_write_stream_1 = require("../destination-sparse-write-stream");
const block_read_stream_1 = require("../block-read-stream");
exports.ProgressWriteStream = progress_1.makeClassEmitProgressEvents(
// type definitions for node 6 export fs.WriteStream as an interface, but it's a class.
// @ts-ignore
fs.WriteStream, 'bytesWritten', 'bytesWritten', constants_1.PROGRESS_EMISSION_INTERVAL);
class File extends source_destination_1.SourceDestination {
    constructor(path, flags) {
        super();
        this.path = path;
        this.flags = flags;
        this.blockSize = 512;
    }
    _canRead() {
        return (this.flags === File.OpenFlags.Read ||
            this.flags === File.OpenFlags.ReadWrite ||
            this.flags === File.OpenFlags.WriteDevice);
    }
    _canWrite() {
        return (this.flags === File.OpenFlags.ReadWrite ||
            this.flags === File.OpenFlags.WriteDevice);
    }
    canRead() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._canRead();
        });
    }
    canWrite() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._canWrite();
        });
    }
    canCreateReadStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._canRead();
        });
    }
    canCreateWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._canWrite();
        });
    }
    canCreateSparseWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._canWrite();
        });
    }
    _getMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                size: (yield fs_1.stat(this.path)).size,
                name: path_1.basename(this.path),
            };
        });
    }
    read(buffer, bufferOffset, length, sourceOffset) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield fs_1.read(this.fd, buffer, bufferOffset, length, sourceOffset);
        });
    }
    write(buffer, bufferOffset, length, fileOffset) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield fs_1.write(this.fd, buffer, bufferOffset, length, fileOffset);
        });
    }
    createReadStream(emitProgress = false, start = 0, end) {
        return __awaiter(this, void 0, void 0, function* () {
            if (emitProgress) {
                return new block_read_stream_1.ProgressBlockReadStream(this, start, end);
            }
            else {
                return new block_read_stream_1.BlockReadStream(this, start, end);
            }
        });
    }
    createWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = new exports.ProgressWriteStream(null, {
                fd: this.fd,
                autoClose: false,
            });
            stream.on('finish', stream.emit.bind(stream, 'done'));
            return stream;
        });
    }
    createSparseWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = new destination_sparse_write_stream_1.ProgressDestinationSparseWriteStream(this);
            stream.on('finish', stream.emit.bind(stream, 'done'));
            return stream;
        });
    }
    _open() {
        return __awaiter(this, void 0, void 0, function* () {
            this.fd = yield fs_1.open(this.path, this.flags);
        });
    }
    _close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs_1.close(this.fd);
        });
    }
}
exports.File = File;
(function (File) {
    let OpenFlags;
    (function (OpenFlags) {
        OpenFlags[OpenFlags["Read"] = fs.constants.O_RDONLY] = "Read";
        OpenFlags[OpenFlags["ReadWrite"] = fs.constants.O_RDWR | fs.constants.O_CREAT] = "ReadWrite";
        OpenFlags[OpenFlags["WriteDevice"] = fs.constants.O_RDWR |
            fs.constants.O_NONBLOCK |
            fs.constants.O_SYNC] = "WriteDevice";
    })(OpenFlags = File.OpenFlags || (File.OpenFlags = {}));
})(File = exports.File || (exports.File = {}));
//# sourceMappingURL=file.js.map