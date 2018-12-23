"use strict";
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
const progress_1 = require("./source-destination/progress");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const utils_1 = require("./utils");
class DestinationSparseWriteStream extends readable_stream_1.Writable {
    constructor(destination, firstBytesToKeep = 0, maxRetries = 5) {
        super({ objectMode: true });
        this.destination = destination;
        this.firstBytesToKeep = firstBytesToKeep;
        this.maxRetries = maxRetries;
        this.bytesWritten = 0;
        this._firstChunks = [];
    }
    writeChunk(chunk, flushing = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let retries = 0;
            while (true) {
                try {
                    this.position = chunk.position;
                    yield this.destination.write(chunk.buffer, 0, chunk.length, chunk.position);
                    if (!flushing) {
                        this.position += chunk.length;
                        this.bytesWritten += chunk.length;
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
    __write(chunk) {
        return __awaiter(this, void 0, void 0, function* () {
            // Keep the first blocks in memory and write them once the rest has been written.
            // This is to prevent Windows from mounting the device while we flash it.
            if (chunk.position < this.firstBytesToKeep) {
                const end = chunk.position + chunk.length;
                if (end <= this.firstBytesToKeep) {
                    this._firstChunks.push(chunk);
                    this.position = chunk.position + chunk.length;
                    this.bytesWritten += chunk.length;
                }
                else {
                    const difference = this.firstBytesToKeep - chunk.position;
                    this._firstChunks.push({
                        position: chunk.position,
                        buffer: chunk.buffer.slice(0, difference),
                        length: difference,
                    });
                    this.position = this.firstBytesToKeep;
                    this.bytesWritten += difference;
                    const remainingBuffer = chunk.buffer.slice(difference);
                    yield this.writeChunk({
                        position: this.firstBytesToKeep,
                        buffer: remainingBuffer,
                        length: remainingBuffer.length,
                    });
                }
            }
            else {
                yield this.writeChunk(chunk);
            }
        });
    }
    _write(chunk, enc, callback) {
        utils_1.asCallback(this.__write(chunk), callback);
    }
    __final() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                for (const chunk of this._firstChunks) {
                    yield this.writeChunk(chunk, true);
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
exports.DestinationSparseWriteStream = DestinationSparseWriteStream;
exports.ProgressDestinationSparseWriteStream = progress_1.makeClassEmitProgressEvents(DestinationSparseWriteStream, 'bytesWritten', 'position', constants_1.PROGRESS_EMISSION_INTERVAL);
//# sourceMappingURL=destination-sparse-write-stream.js.map