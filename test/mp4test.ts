import {createFile, DataStream} from 'mp4box';
import {RI} from '@predy-js/player'

const {constants} = RI;

const canvas = document.getElementById('app') as HTMLCanvasElement;
canvas.width = 2160;
canvas.height = 2160;
const ctx = canvas.getContext('2d');

const videoFrames: VideoFrame[] = [];
const videoChunks: EncodedVideoChunk[] = [];
const chunks: EncodedVideoChunk[] = [];
const decoder = new VideoDecoder({
    output(frame) {
        // console.log('frame', frame);
        videoFrames.push(frame);
        ctx.drawImage(frame, 0, 0);
        checkFrameReady();
        frame.close();
    },
    error(e) {
        console.error(e);
    },
});

let videoBuffer: Uint8Array

// document.getElementById('file-input').addEventListener('change', function(event) {
//     var file = (event.target as HTMLInputElement).files[0];
//     var reader = new FileReader();
//     reader.onload = function(e) {
//         var arrayBuffer = e.target.result as ArrayBuffer;
//         var buffer = new Uint8Array(arrayBuffer).buffer;
fetch('./asset/colorx2.mp4') // alphax05 colorx2.mp4
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => {
    var buffer = new Uint8Array(arrayBuffer).buffer;
        (buffer as any).fileStart = 0

        var mp4box = createFile();
        mp4box.onError = function(e) {
            console.error("MP4Box parsing error: " + e);
        };
        mp4box.onReady = function(info) {
            // console.log("MP4 file info: ", info);
            const track = info.videoTracks[0];
            decoder.configure({
                codec: track.codec,
                codedWidth: track.track_width,
                codedHeight: track.track_height,
                description: description(mp4box.getTrackById(track.id)),
                hardwareAcceleration: 'prefer-hardware'
            })

            mp4box.setExtractionOptions(track.id, null, { nbSamples: 1 });
            mp4box.start();
        };
        mp4box.onSamples = function (id, user, samples) {
            // console.log('onsamples', samples);
            const sample = samples[0];
            const chunk = new EncodedVideoChunk({
                type: sample.is_sync ? "key" : "delta",
                duration: 1e6 * sample.duration / sample.timescale,
                data: sample.data,
                timestamp: 1e6 * sample.cts / sample.timescale
            });
            chunks.push(chunk);
            videoChunks.push(chunk);
            processNewChunk();
        }
        mp4box.appendBuffer(buffer);
    // };
    // reader.readAsArrayBuffer(file);
});

let nextFrameTimestamp = 0;
let lastDecodeTime = 0;
function processNewChunk() {
    if (videoChunks.length > 0) {
        const now = performance.now();
        
        if (now >= nextFrameTimestamp) {
            const chunk = videoChunks.shift();

            if (chunk) {
                nextFrameTimestamp = now + (chunk.duration / 1000); 
                lastDecodeTime = now;
                decoder.decode(chunk);
            }
        } else {
            setTimeout(processNewChunk, nextFrameTimestamp - now);
        }
    }
}

function checkFrameReady() {
    if (videoFrames.length) {
        const vf = videoFrames[0];
        if (vf && !videoBuffer) {
            videoBuffer = new Uint8Array(vf.allocationSize());
            createVideoTextures(vf, videoBuffer.buffer);
        }
        processNewChunk();
    } 
}

async function createVideoTextures(frame: VideoFrame, buffer: ArrayBuffer) {
    let f0
    try {
        // console.log('frame', frame, buffer, typeof frame.codedHeight);
        f0 = frame.clone();
        console.log('f', f0);
        
        // await f.copyTo(buffer);

        const f = new VideoFrame(frame);
        await f.copyTo(buffer);
    } catch (e) {
        console.error('Error caught:', e);
        // document.getElementById('err').innerHTML = JSON.stringify(frame.codedWidth);
    } finally {
        // console.log('videoBuffer', buffer);
        // document.getElementById('err').innerHTML += "finally";
        // document.getElementById('err').innerHTML = JSON.stringify(f);

        // frame.close();
    }
    
}

function description(track: any) {
    //const trak = this.#file.getTrackById(track.id);
    for (const entry of track.mdia.minf.stbl.stsd.entries) {
        const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
        if (box) {
            const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
            box.write(stream);
            return new Uint8Array(stream.buffer, 8);  // Remove the box header.
        }
    }
    throw new Error("avcC, hvcC, vpcC, or av1C box not found");
}
