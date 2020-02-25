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


function ffmpegRun(videoPath, videoDestinationPath, outputOptions){
    return new Promise((resolve, reject) => {            
        const videoCodec = 'libx264'
        fffmpeg(videoPath)
            .videoCodec(videoCodec)            
            .outputOptions(outputOptions)
            .on('stderr', function(stderrLine) {
                console.log('> [video-robot] Stderr output: ' + stderrLine)
            })
            .on('error', function(err) {
                console.error(`> [video-robot] Error: ${err}`)
                reject(err)
            })
            .save(videoDestinationPath)
            .on('end', function() {
                console.log('> [video-robot] success')
                resolve()
            })
    });
}

    
async function applyVideoFilters(content){
    for(let imageIndex = 0; imageIndex < content.sentences.length; imageIndex++) {
        const subtitlePath = `./content/${imageIndex}-subtitle.srt`;
        const videoPath = `./content/${imageIndex}.mp4`;
        const videoDestinationPath = `./content/${imageIndex}-zoomIn.mp4`
        //const outputOptions = `-vf zoompan=z='if(lte(pzoom,1.0),1.2,max(1.001,pzoom-0.002))':d=1:x='iw/2-(iw/zoom/2)':y='0':s=1920x1080:fps=30,subtitles=${subtitlePath}:force_style='Fontsize=28,Outline=2,PrimaryColour=&HFFFFFF&'"`
        const outputOptions = `-vf zoompan=z='min(pzoom+0.0005,1.5)':d=1:s=1920x1080:fps=30,subtitles=${subtitlePath}:force_style='Fontsize=28,Outline=2,PrimaryColour=&HFFFFFF&'"`
        console.log(`> [video-robot] Zooming in: "${outputOptions}"`)
        await ffmpegRun(videoPath, videoDestinationPath, outputOptions);
    }
}

async function robot() {
    const content = state.load()
    await applyVideoFilters(content);
}

robot();