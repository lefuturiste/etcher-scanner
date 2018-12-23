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
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const speedometer = require("speedometer");
const constants_1 = require("../constants");
function makeClassEmitProgressEvents(Cls, attribute, positionAttribute, interval) {
    // This returns a class that extends Cls, tracks for `attribute` updates and emits `progress` events every `interval` based on it.
    //  * the type of `attribute` must be a number;
    //  * the position attribute of emitted events will be copied from the `positionAttribute` of the instances.
    return class extends Cls {
        constructor(...args) {
            super(...args);
            this._attributeDelta = 0;
            const meter = speedometer();
            const state = { position: 0, bytes: 0, speed: 0 };
            const update = () => {
                state.bytes += this._attributeDelta;
                // Ignore because I don't know how to express that positionAttribute is a key of T instances
                // @ts-ignore
                const position = this[positionAttribute];
                if (position !== undefined) {
                    state.position = position;
                }
                state.speed = meter(this._attributeDelta);
                this._attributeDelta = 0;
                this.emit('progress', state);
            };
            // TODO: setInterval only when attribute is set
            const timer = setInterval(update, interval);
            const clear = () => {
                clearInterval(timer);
            };
            this.once('error', clear);
            // Writable streams
            this.once('finish', clear);
            this.once('finish', update);
            // Readable streams
            this.once('end', clear);
            this.once('end', update);
        }
        get [attribute]() {
            return this._attributeValue;
        }
        set [attribute](value) {
            if (this._attributeValue !== undefined) {
                this._attributeDelta += value - this._attributeValue;
            }
            this._attributeValue = value;
        }
    };
}
exports.makeClassEmitProgressEvents = makeClassEmitProgressEvents;
class CountingWritable extends stream_1.Writable {
    constructor() {
        super(...arguments);
        this.bytesWritten = 0;
    }
    _write(chunk, enc, callback) {
        if (Buffer.isBuffer(chunk)) {
            this.bytesWritten = this.position = this.bytesWritten + chunk.length;
        }
        else {
            this.bytesWritten += chunk.buffer.length;
            this.position = chunk.position + chunk.buffer.length;
        }
        callback();
    }
}
exports.CountingWritable = CountingWritable;
exports.ProgressWritable = makeClassEmitProgressEvents(CountingWritable, 'bytesWritten', 'position', constants_1.PROGRESS_EMISSION_INTERVAL);
//# sourceMappingURL=progress.js.map