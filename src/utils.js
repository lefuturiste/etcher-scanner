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
function streamToBuffer(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('error', reject);
            stream.on('data', chunks.push.bind(chunks));
            stream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
    });
}
exports.streamToBuffer = streamToBuffer;
function sparseStreamToBuffer(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        const chunks = [];
        yield new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('end', resolve);
            stream.on('data', chunks.push.bind(chunks));
        });
        if (chunks.length === 0) {
            return Buffer.alloc(0);
        }
        const lastChunk = chunks[chunks.length - 1];
        const result = Buffer.alloc(lastChunk.position + lastChunk.buffer.length);
        for (const chunk of chunks) {
            chunk.buffer.copy(result, chunk.position);
        }
        return result;
    });
}
exports.sparseStreamToBuffer = sparseStreamToBuffer;
function difference(setA, setB) {
    const _difference = new Set(setA);
    for (const elem of setB) {
        _difference.delete(elem);
    }
    return _difference;
}
exports.difference = difference;
function asCallback(promise, callback) {
    promise
        .then((value) => {
        callback(undefined, value);
    })
        .catch(callback);
}
exports.asCallback = asCallback;
//# sourceMappingURL=utils.js.map