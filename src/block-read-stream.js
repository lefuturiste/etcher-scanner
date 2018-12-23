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
const readable_stream_1 = require("readable-stream");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const progress_1 = require("./source-destination/progress");
class BlockReadStream extends readable_stream_1.Readable {
    constructor(source, bytesRead = 0, end = Infinity, chunkSize = constants_1.CHUNK_SIZE, maxRetries = 5) {
        super({ objectMode: true, highWaterMark: 2 });
        this.source = source;
        this.bytesRead = bytesRead;
        this.end = end;
        this.maxRetries = maxRetries;
        this.chunkSize = Math.max(Math.floor(chunkSize / this.source.blockSize) * this.source.blockSize, this.source.blockSize);
    }
    tryRead(buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            // Tries to read `this.maxRetries` times if the error is transient.
            // Throws EUNPLUGGED if all retries failed.
            let retries = 0;
            while (true) {
                try {
                    return yield this.source.read(buffer, 0, buffer.length, this.bytesRead);
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
    __read() {
        return __awaiter(this, void 0, void 0, function* () {
            const toRead = this.end - this.bytesRead + 1; // end is inclusive
            if (toRead <= 0) {
                this.push(null);
                return;
            }
            // Read chunkSize bytes if available, else all remaining bytes.
            const length = Math.min(this.chunkSize, toRead);
            const buffer = Buffer.allocUnsafe(length);
            try {
                const { bytesRead } = yield this.tryRead(buffer);
                if (bytesRead === 0) {
                    this.push(null);
                    return;
                }
                this.bytesRead += bytesRead;
                this.push(buffer.slice(0, bytesRead));
            }
            catch (error) {
                this.emit('error', error);
            }
        });
    }
    _read() {
        this.__read();
    }
}
exports.BlockReadStream = BlockReadStream;
exports.ProgressBlockReadStream = progress_1.makeClassEmitProgressEvents(BlockReadStream, 'bytesRead', 'bytesRead', constants_1.PROGRESS_EMISSION_INTERVAL);
//# sourceMappingURL=block-read-stream.js.map