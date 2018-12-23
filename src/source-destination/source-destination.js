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
const MBR = require("mbr");
const GPT = require("gpt");
const events_1 = require("events");
const fileType = require("file-type");
const path_1 = require("path");
const process_1 = require("process");
const xxhash_1 = require("xxhash");
const BlockMap = require("blockmap");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const utils_1 = require("../utils");
const progress_1 = require("./progress");
// Seed value 0x45544348 = ASCII "ETCH"
const SEED = 0x45544348;
const BITS = process_1.arch === 'x64' || process_1.arch === 'aarch64' ? 64 : 32;
class CountingHashStream extends xxhash_1.Stream {
    constructor() {
        super(...arguments);
        this.bytesWritten = 0;
    }
    _transform(chunk, encoding, callback) {
        super._transform(chunk, encoding, () => {
            callback();
            this.bytesWritten += chunk.length;
        });
    }
}
exports.CountingHashStream = CountingHashStream;
exports.ProgressHashStream = progress_1.makeClassEmitProgressEvents(CountingHashStream, 'bytesWritten', 'bytesWritten', constants_1.PROGRESS_EMISSION_INTERVAL);
function createHasher() {
    const hasher = new exports.ProgressHashStream(SEED, BITS);
    hasher.on('finish', () => __awaiter(this, void 0, void 0, function* () {
        const checksum = (yield utils_1.streamToBuffer(hasher)).toString('hex');
        hasher.emit('checksum', checksum);
    }));
    return hasher;
}
exports.createHasher = createHasher;
class SourceDestinationFs {
    // Adapts a SourceDestination to an fs like interface (so it can be used in udif for example)
    constructor(source) {
        this.source = source;
    }
    open(path, options, callback) {
        callback(null, 1);
    }
    close(fd, callback) {
        callback(null);
    }
    fstat(fd, callback) {
        this.source
            .getMetadata()
            .then(metadata => {
            if (metadata.size === undefined) {
                callback(new Error('No size'));
                return;
            }
            callback(null, { size: metadata.size });
        })
            .catch(callback);
    }
    read(fd, buffer, bufferOffset, length, sourceOffset, callback) {
        this.source
            .read(buffer, bufferOffset, length, sourceOffset)
            .then((res) => {
            callback(null, res.bytesRead, res.buffer);
        })
            .catch(callback);
    }
}
exports.SourceDestinationFs = SourceDestinationFs;
class Verifier extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.progress = { bytes: 0, position: 0, speed: 0 };
    }
    handleEventsAndPipe(stream, meter) {
        meter.on('progress', (progress) => {
            this.progress = progress;
            this.emit('progress', progress);
        });
        stream.on('end', this.emit.bind(this, 'end'));
        meter.on('finish', this.emit.bind(this, 'finish'));
        stream.once('error', () => {
            stream.unpipe(meter);
            meter.end();
            if (stream instanceof BlockMap.ReadStream) {
                stream.destroy();
            }
        });
        stream.pipe(meter);
    }
}
exports.Verifier = Verifier;
class StreamVerifier extends Verifier {
    constructor(source, checksum, size) {
        super();
        this.source = source;
        this.checksum = checksum;
        this.size = size;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = yield this.source.createReadStream(false, 0, this.size - 1);
            stream.on('error', this.emit.bind(this, 'error'));
            const hasher = createHasher();
            hasher.on('error', this.emit.bind(this, 'error'));
            hasher.on('checksum', (streamChecksum) => {
                if (streamChecksum !== this.checksum) {
                    this.emit('error', new errors_1.ChecksumVerificationError(`Source and destination checksums do not match: ${this.checksum} !== ${streamChecksum}`, streamChecksum, this.checksum));
                }
            });
            this.handleEventsAndPipe(stream, hasher);
        });
    }
}
exports.StreamVerifier = StreamVerifier;
class SparseStreamVerifier extends Verifier {
    constructor(source, blockMap) {
        super();
        this.source = source;
        this.blockMap = blockMap;
    }
    wrapErrorAndEmit(error) {
        // Transforms the error into a VerificationError if needed
        if (error.message.startsWith('Invalid checksum')) {
            error = new errors_1.VerificationError(error.message);
        }
        this.emit('error', error);
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            let stream;
            if (yield this.source.canRead()) {
                stream = new BlockMap.ReadStream('', this.blockMap, {
                    fs: new SourceDestinationFs(this.source),
                });
                stream.on('error', this.wrapErrorAndEmit.bind(this));
            }
            else if (yield this.source.canCreateReadStream()) {
                // TODO: will this ever be used?
                // if yes, originalStream should be unpiped from the transform and destroyed on error
                const originalStream = yield this.source.createReadStream();
                originalStream.on('error', this.emit.bind(this, 'error'));
                const transform = BlockMap.createFilterStream(this.blockMap);
                transform.on('error', this.wrapErrorAndEmit.bind(this));
                originalStream.pipe(transform);
                stream = transform;
            }
            else {
                throw new errors_1.NotCapable();
            }
            const meter = new progress_1.ProgressWritable({ objectMode: true });
            this.handleEventsAndPipe(stream, meter);
        });
    }
}
exports.SparseStreamVerifier = SparseStreamVerifier;
function detectGPT(buffer) {
    // TODO: GPT typings
    let blockSize = 512;
    // Attempt to parse the GPT from several offsets,
    // as the block size of the image may vary (512,1024,2048,4096);
    // For example, ISOs will usually have a block size of 4096,
    // but raw images a block size of 512 bytes
    while (blockSize <= 4096) {
        try {
            return GPT.parse(buffer.slice(blockSize));
        }
        catch (error) { }
        blockSize *= 2;
    }
}
class SourceDestination extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.isOpen = false;
    }
    static register(Cls) {
        if (Cls.mimetype !== undefined) {
            SourceDestination.mimetypes.set(Cls.mimetype, Cls);
        }
    }
    canRead() {
        return __awaiter(this, void 0, void 0, function* () {
            return false;
        });
    }
    canWrite() {
        return __awaiter(this, void 0, void 0, function* () {
            return false;
        });
    }
    canCreateReadStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return false;
        });
    }
    canCreateSparseReadStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return false;
        });
    }
    canCreateWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return false;
        });
    }
    canCreateSparseWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return false;
        });
    }
    getMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.metadata === undefined) {
                this.metadata = yield this._getMetadata();
            }
            return this.metadata;
        });
    }
    _getMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new errors_1.NotCapable();
        });
    }
    read(buffer, bufferOffset, length, sourceOffset) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new errors_1.NotCapable();
        });
    }
    write(buffer, bufferOffset, length, fileOffset) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new errors_1.NotCapable();
        });
    }
    createReadStream(emitProgress = false, start = 0, end) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new errors_1.NotCapable();
        });
    }
    createSparseReadStream(generateChecksums = false) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new errors_1.NotCapable();
        });
    }
    createWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new errors_1.NotCapable();
        });
    }
    createSparseWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new errors_1.NotCapable();
        });
    }
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isOpen) {
                yield this._open();
                this.isOpen = true;
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isOpen) {
                yield this._close();
                this.isOpen = false;
            }
        });
    }
    _open() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    _close() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    createVerifier(checksumOrBlockmap, size) {
        if (checksumOrBlockmap instanceof BlockMap) {
            return new SparseStreamVerifier(this, checksumOrBlockmap);
        }
        else {
            if (size === undefined) {
                throw new Error('A size argument is required for creating a stream checksum verifier');
            }
            return new StreamVerifier(this, checksumOrBlockmap, size);
        }
    }
    getMimeTypeFromName() {
        return __awaiter(this, void 0, void 0, function* () {
            const metadata = yield this.getMetadata();
            if (metadata.name === undefined) {
                return;
            }
            const extension = path_1.extname(metadata.name).toLowerCase();
            if (extension === '.dmg') {
                return 'application/x-apple-diskimage';
            }
        });
    }
    getMimeTypeFromContent() {
        return __awaiter(this, void 0, void 0, function* () {
            let stream;
            try {
                stream = yield this.createReadStream(false, 0, 263); // TODO: constant
            }
            catch (error) {
                if (error instanceof errors_1.NotCapable) {
                    return;
                }
                throw error;
            }
            const ft = fileType(yield utils_1.streamToBuffer(stream));
            if (ft !== null) {
                return ft.mime;
            }
        });
    }
    getMimetype() {
        return __awaiter(this, void 0, void 0, function* () {
            let mimetype = yield this.getMimeTypeFromName();
            if (mimetype === undefined) {
                mimetype = yield this.getMimeTypeFromContent();
            }
            return mimetype;
        });
    }
    getInnerSource() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.open();
            const metadata = yield this.getMetadata();
            if (metadata.isEtch === true) {
                return this;
            }
            const mimetype = yield this.getMimetype();
            if (mimetype === undefined) {
                return this;
            }
            const Cls = SourceDestination.mimetypes.get(mimetype);
            if (Cls === undefined) {
                return this;
            }
            const innerSource = new Cls(this);
            return yield innerSource.getInnerSource();
        });
    }
    getPartitionTable() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: this should be in partitioninfo
            // missing parts in partitioninfo:
            // * read from Buffer directly (can be avoided using a Buffer backed FileDisk)
            // * try detecting GPT at different offsets (see detectGPT above)
            const stream = yield this.createReadStream(false, 0, 65535); // TODO: constant
            const buffer = yield utils_1.streamToBuffer(stream);
            const gpt = detectGPT(buffer);
            if (gpt !== undefined) {
                return {
                    type: 'gpt',
                    partitions: gpt.partitions.map((partition) => {
                        return {
                            type: partition.type.toString(),
                            id: partition.guid.toString(),
                            name: partition.name,
                            firstLBA: partition.firstLBA,
                            lastLBA: partition.lastLBA,
                            extended: false,
                        };
                    }),
                };
            }
            else {
                try {
                    const mbr = MBR.parse(buffer);
                    return {
                        type: 'mbr',
                        partitions: mbr.partitions.map((partition) => {
                            return {
                                type: partition.type,
                                id: null,
                                name: null,
                                firstLBA: partition.firstLBA,
                                lastLBA: partition.lastLBA,
                                extended: partition.extended,
                            };
                        }),
                    };
                }
                catch (error) { }
            }
        });
    }
}
SourceDestination.imageExtensions = [
    'img',
    'iso',
    'bin',
    'dsk',
    'hddimg',
    'raw',
    'dmg',
    'sdcard',
    'rpi-sdimg',
    'wic',
];
SourceDestination.mimetypes = new Map();
exports.SourceDestination = SourceDestination;
//# sourceMappingURL=source-destination.js.map