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
const mountutils_1 = require("mountutils");
const os_1 = require("os");
const block_write_stream_1 = require("../block-write-stream");
const destination_sparse_write_stream_1 = require("../destination-sparse-write-stream");
const diskpart_1 = require("../diskpart");
const file_1 = require("./file");
/**
 * @summary Time, in milliseconds, to wait before unmounting on success
 */
const UNMOUNT_ON_SUCCESS_TIMEOUT_MS = 2000;
const DEFAULT_BLOCK_SIZE = 512;
const WIN32_FIRST_BYTES_TO_KEEP = 64 * 1024;
const USE_ALIGNED_IO = os_1.platform() === 'win32' || os_1.platform() === 'darwin';
const unmountDiskAsync = bluebird_1.promisify(mountutils_1.unmountDisk);
class BlockDevice extends file_1.File {
    constructor(drive, unmountOnSuccess = false) {
        super(drive.raw, file_1.File.OpenFlags.WriteDevice);
        this.drive = drive;
        this.unmountOnSuccess = unmountOnSuccess;
        this.emitsProgress = false;
        this.blockSize = drive.blockSize || DEFAULT_BLOCK_SIZE;
    }
    get isSystem() {
        return this.drive.isSystem;
    }
    get raw() {
        return this.drive.raw;
    }
    get device() {
        return this.drive.device;
    }
    get devicePath() {
        return this.drive.devicePath;
    }
    get description() {
        return this.drive.description;
    }
    get mountpoints() {
        return this.drive.mountpoints;
    }
    get size() {
        return this.drive.size;
    }
    _getMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                size: this.drive.size,
            };
        });
    }
    canWrite() {
        return __awaiter(this, void 0, void 0, function* () {
            return !this.drive.isReadOnly;
        });
    }
    canCreateWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return !this.drive.isReadOnly;
        });
    }
    canCreateSparseWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            return !this.drive.isReadOnly;
        });
    }
    createWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = new block_write_stream_1.ProgressBlockWriteStream(this, os_1.platform() === 'win32' ? WIN32_FIRST_BYTES_TO_KEEP : 0);
            stream.on('finish', stream.emit.bind(stream, 'done'));
            return stream;
        });
    }
    createSparseWriteStream() {
        return __awaiter(this, void 0, void 0, function* () {
            const stream = new destination_sparse_write_stream_1.ProgressDestinationSparseWriteStream(this, os_1.platform() === 'win32' ? WIN32_FIRST_BYTES_TO_KEEP : 0);
            stream.on('finish', stream.emit.bind(stream, 'done'));
            return stream;
        });
    }
    _open() {
        const _super = Object.create(null, {
            _open: { get: () => super._open }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (os_1.platform() !== 'win32') {
                yield unmountDiskAsync(this.drive.device);
            }
            yield diskpart_1.clean(this.drive.device);
            yield _super._open.call(this);
        });
    }
    _close() {
        const _super = Object.create(null, {
            _close: { get: () => super._close }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super._close.call(this);
            // Closing a file descriptor on a drive containing mountable
            // partitions causes macOS to mount the drive. If we try to
            // unmount too quickly, then the drive might get re-mounted
            // right afterwards.
            if (this.unmountOnSuccess) {
                yield bluebird_1.delay(UNMOUNT_ON_SUCCESS_TIMEOUT_MS);
                yield unmountDiskAsync(this.drive.device);
            }
        });
    }
    offsetIsAligned(offset) {
        return offset % this.blockSize === 0;
    }
    alignOffsetBefore(offset) {
        return Math.floor(offset / this.blockSize) * this.blockSize;
    }
    alignOffsetAfter(offset) {
        return Math.ceil(offset / this.blockSize) * this.blockSize;
    }
    alignedRead(buffer, bufferOffset, length, sourceOffset) {
        const _super = Object.create(null, {
            read: { get: () => super.read }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const start = this.alignOffsetBefore(sourceOffset);
            const end = this.alignOffsetAfter(sourceOffset + length);
            const alignedBuffer = Buffer.allocUnsafe(end - start);
            const { bytesRead } = yield _super.read.call(this, alignedBuffer, 0, alignedBuffer.length, start);
            const offset = sourceOffset - start;
            alignedBuffer.copy(buffer, bufferOffset, offset, offset + length);
            return { buffer, bytesRead: Math.min(length, bytesRead - offset) };
        });
    }
    read(buffer, bufferOffset, length, sourceOffset) {
        const _super = Object.create(null, {
            read: { get: () => super.read }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (USE_ALIGNED_IO &&
                !(this.offsetIsAligned(sourceOffset) && this.offsetIsAligned(length))) {
                return yield this.alignedRead(buffer, bufferOffset, length, sourceOffset);
            }
            else {
                return yield _super.read.call(this, buffer, bufferOffset, length, sourceOffset);
            }
        });
    }
    alignedWrite(buffer, bufferOffset, length, fileOffset) {
        const _super = Object.create(null, {
            read: { get: () => super.read },
            write: { get: () => super.write }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const start = this.alignOffsetBefore(fileOffset);
            const end = this.alignOffsetAfter(fileOffset + length);
            const alignedBuffer = Buffer.allocUnsafe(end - start);
            yield _super.read.call(this, alignedBuffer, 0, alignedBuffer.length, start);
            const offset = fileOffset - start;
            buffer.copy(alignedBuffer, offset, bufferOffset, length);
            yield _super.write.call(this, alignedBuffer, 0, alignedBuffer.length, start);
            return { buffer, bytesWritten: length };
        });
    }
    write(buffer, bufferOffset, length, fileOffset) {
        const _super = Object.create(null, {
            write: { get: () => super.write }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (USE_ALIGNED_IO &&
                !(this.offsetIsAligned(fileOffset) && this.offsetIsAligned(length))) {
                return yield this.alignedWrite(buffer, bufferOffset, length, fileOffset);
            }
            else {
                return yield _super.write.call(this, buffer, bufferOffset, length, fileOffset);
            }
        });
    }
}
exports.BlockDevice = BlockDevice;
//# sourceMappingURL=block-device.js.map
