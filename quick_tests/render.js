const state = require('../robots/state.js')
const spawn = require('child_process').spawn
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const gm = require('gm').subClass({imageMagick: true})
const videoshow = require('videoshow')
const fs = require('fs')
const path = require('path')
const rootPath = path.resolve(__dirname, '..')
const subtitle = require('subtitle')
var fffmpeg = require('fluent-ffmpeg');
const getMP3Duration = require('get-mp3-duration')

async function mergeFilesAsync(content)
{
    return new Promise((resolve, reject) => {
        const videoDestinationPath = `./content/output.mp4`
        var cmd = fffmpeg({priority: 20}).videoCodec(videoCodec).fps(videoFps)
        .on('error', function(err) {
            console.log('> [video-robot] An error occurred: ' + err.message);
            resolve()
        })
        .on('end', function() {
            console.log('> [video-robot] ', videoDestinationPath, ': Processing finished !');
            resolve()
        });

        for(let imageIndex = 0; imageIndex < content.sentences.length; imageIndex++) {
            const videoPath = `./content/${imageIndex}-withFilters.mp4`
            cmd.input(videoPath);
        }
    
        cmd.mergeToFile(videoDestinationPath)
    });
}

const content = state.load()
const videoCodec = 'libx264'
const videoFps = 30;

async function robot() {
    await mergeFilesAsync(content)
}

robot()