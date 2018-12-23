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
const readable_stream_1 = require("readable-stream");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const utils_1 = require("./utils");
const progress_1 = require("./source-destination/progress");
const debug = _debug('etcher:writer:block-write-stream');
class BlockWriteStream extends readable_stream_1.Writable {
    constructor(destination, firstBytesToKeep = 0, maxRetries = 5) {
        super({ objectMode: true, highWaterMark: 1 });
        this.destination = destination;
        this.firstBytesToKeep = firstBytesToKeep;
        this.maxRetries = maxRetries;
        this.bytesWritten = 0;
        this._firstBuffers = [];
        this._buffers = [];
        this._bytes = 0;
        if (firstBytesToKeep !== 0 &&
            firstBytesToKeep % this.destination.blockSize !== 0) {
            throw new Error('firstBytesToKeep must be a multiple of the destination blockSize');
        }
    }
    writeChunk(buffer, position, flushing = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let retries = 0;
            while (true) {
                try {
                    const { bytesWritten } = yield this.destination.write(buffer, 0, buffer.length, position);
                    if (!flushing) {
                        this.bytesWritten += bytesWritten;
                    }
                    return;
                }
                catch (error) {
                    if (errors_1.isTransientError(error)) {
                        if (retries < this.maxRetries) {
                            retries += 1;
                            yield bluebird_1.delay(constants_1.RETRY_BASE_TIMEOUT * retries);
                            continue;
                        }
                        error.code = 'EUNPLUGGED';
                    }
                    throw error;
                }
            }
        });
    }
    writeBuffers() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._bytes >= constants_1.CHUNK_SIZE) {
                let block = Buffer.concat(this._buffers);
                const length = Math.floor(block.length / this.destination.blockSize) *
                    this.destination.blockSize;
                this._buffers.length = 0;
                this._bytes = 0;
                if (block.length !== length) {
                    this._buffers.push(block.slice(length));
                    this._bytes += block.length - length;
                    block = block.slice(0, length);
                }
                yield this.writeChunk(block, this.bytesWritten);
            }
        });
    }
    __write(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('_write', buffer.length, this.bytesWritten);
            // Keep the first blocks in memory and write them once the rest has been written.
            // This is to prevent Windows from mounting the device while we flash it.
            if (this.bytesWritten < this.firstBytesToKeep) {
                const end = this.bytesWritten + buffer.length;
                if (end <= this.firstBytesToKeep) {
                    this._firstBuffers.push(buffer);
                    this.bytesWritten += buffer.length;
                }
                else {
                    const difference = this.firstBytesToKeep - this.bytesWritten;
                    this._firstBuffers.push(buffer.slice(0, difference));
                    this._buffers.push(buffer.slice(difference));
                    this._bytes += buffer.length - difference;
                    this.bytesWritten += difference;
                    yield this.writeBuffers();
                }
            }
            else if (this._bytes === 0 &&
                buffer.length >= constants_1.CHUNK_SIZE &&
                buffer.length % this.destination.blockSize === 0) {
                yield this.writeChunk(buffer, this.bytesWritten);
            }
            else {
                this._buffers.push(buffer);
                this._bytes += buffer.length;
                yield this.writeBuffers();
            }
        });
    }
    _write(buffer, encoding, callback) {
        utils_1.asCallback(this.__write(buffer), callback);
    }
    __final() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('_final');
            try {
                if (this._bytes) {
                    yield this.writeChunk(Buffer.concat(this._buffers, this._bytes), this.bytesWritten);
                }
                let position = 0;
                for (let i = 0; i < this._firstBuffers.length; i++) {
                    const buffer = this._firstBuffers[i];
                    yield this.writeChunk(buffer, position, true);
                    position += buffer.length;
                }
            }
            catch (error) {
                this.destroy();
                throw error;
            }
        });
    }
    /**
     * @summary Write buffered data before a stream ends, called by stream internals
     */
    _final(callback) {
        utils_1.asCallback(this.__final(), callback);
    }
}
exports.BlockWriteStream = BlockWriteStream;
exports.ProgressBlockWriteStream = progress_1.makeClassEmitProgressEvents(BlockWriteStream, 'bytesWritten', 'bytesWritten', constants_1.PROGRESS_EMISSION_INTERVAL);
//# sourceMappingURL=block-write-stream.js.map