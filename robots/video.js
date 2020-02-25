const state = require('./state.js')
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

const fromRoot = relPath => path.resolve(rootPath, relPath)

const robot = async() => {
    const loop = 8;
    const videoCodec = 'libx264'
    const videoFps = 30;
    const content = state.load()
    await convertAllImages(content)   
    await createYoutubeThumbnail()
    await createConfigForEachImage(content)
    //await createConfigVideo(content)
    await createSubtitlesForEachImage(content)
    //await createSubtitles(content)
    await renderYoutubeVideoForEachImage(content)
    await applyVideoFilters(content)
    //await renderYoutubeVideo(content)
    //await mergeSubtitlesAndYoutubeVideoForEachImage(content)
    //await mergeSubtitlesAndYoutubeVideo(content)
    await mergeFilesAsync(content)
    state.save(content)

    async function convertAllImages(content){
        for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
            await convertImage(sentenceIndex, content.sentences[sentenceIndex])
        }
    }
    
    async function convertImage(sentenceIndex, sentence){
        return new Promise((resolve, reject) => {
            const inputFile = fromRoot(`./content/${sentenceIndex}-original.png[0]`)
            const outputFile = fromRoot(`./content/${sentenceIndex}-converted.png`)
            const width = 1920
            const height = 1080

        gm()
            .in(inputFile)
            .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-blur', '0x9')
                .out('-resize', `${width}x${height}^`)
            .out(')')
            .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-resize', `${width}x${height}`)
            .out(')')
            .out('-delete', '0')
            .out('-gravity', 'center')
            .out('-compose', 'over')
            .out('-composite')
            .out('-extent', `${width}x${height}`)        
                .write(outputFile, (error) => {
                    if(error){  
                        return reject(error)
                    }

                    console.log(`> [video-robot] Imagem convertida: ${outputFile}`)
                    sentence.imagePath = outputFile
                    resolve()                
                })
        })       
    }

    async function createYoutubeThumbnail(){
        return new Promise((resolve, reject) => {
            gm()
            .in('./content/0-converted.png')
            .write('./content/youtube-thumbnail.jpg', (error) =>{
                if(error){
                    return reject(error)
                }

                console.log('> [video-robot]  criando thumbnail do youtube')
                resolve()
            })
        })
    }
    
    async function createConfigVideo(content){
        const nameVideo = `${content.searchTerm.trim().replace(' ','')}.mp4`
        const destinationPath = `${rootPath}/content/${nameVideo}`
       
        var images = []

        for(let imageIndex = 0; imageIndex < content.sentences.length; imageIndex++){
            images.push(content.sentences[imageIndex].imagePath);
        }

        var videoConfig =  {
            output: destinationPath,            
            options: {
              fps: 30,
              loop: loop,
              transition: true,
              transitionDuration: 1,
              videoBitrate: 1024, 
              videoCodec: 'libx264',         
              size: "1920x1080",
              audioBitrate: "128k",
              audioChannels: 2,
              format: "mp4",
              outputOptions: ['-pix_fmt yuv420p']           
            },
            images: images
          }

        state.saveVideoConfig(videoConfig)
        content.destinationPath = destinationPath
        content.nameVideo = nameVideo
    }

    function getDurationTTSAudio(path) {
        const buffer = fs.readFileSync(path)
        const duration = getMP3Duration(buffer)
        return duration
    }

    async function createConfigForEachImage(content){
        for(let imageIndex = 0; imageIndex < content.sentences.length; imageIndex++){
            const videoOutputPath = `${rootPath}/content/${imageIndex}.mp4`;
            const configPath = `${rootPath}/content/${imageIndex}-videoConfig.json`;
            const subtitlePath = `./content/${imageIndex}-subtitle.srt`;
            const textToSpeechDuration = getDurationTTSAudio(`${rootPath}/content/${imageIndex}-textToSpeech.mp3`)
            const roundedDuration = Math.ceil(textToSpeechDuration/1000);
            const totalDuration = roundedDuration + 1;
            var images = [];
            images.push(content.sentences[imageIndex].imagePath);
            
            var videoConfig =  {
                output: videoOutputPath,
                options: {
                  fps: 30,
                  loop: totalDuration,
                  transition: true,
                  transitionDuration: 1,
                  videoBitrate: 1024, 
                  videoCodec: 'libx264',         
                  size: "1920x1080",
                  audioBitrate: "128k",
                  audioChannels: 2,
                  format: "mp4",
                  outputOptions: ['-pix_fmt yuv420p'],
                },
                images: images
            }

            state.saveVideoConfig(videoConfig, configPath)
        }
    }

    
    async function createSubtitlesForEachImage(content){
        for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
            const subtitleOutputPath = `${rootPath}/content/${sentenceIndex}-subtitle.srt`;
            const textToSpeechDuration = getDurationTTSAudio(`${rootPath}/content/${sentenceIndex}-textToSpeech.mp3`)

            const subtitles = []

            const sub = {
                start: 0,
                end: textToSpeechDuration,
                text: content.sentences[sentenceIndex].text
            }

            subtitles.push(sub);
            
            const srt = subtitle.stringify(subtitles)            
            state.saveVideoSubtitle(srt, subtitleOutputPath)
        }
    }

    async function createSubtitles(content){
        const subtitles = []
        const timeBreak = 1000; // milliseconds
        const sentenceDuration = (loop - 1) * timeBreak; // milliseconds

        let currentTime = timeBreak;       
        let subDuration = sentenceDuration;

        for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){

            const sub = {
                start: currentTime,
                end: subDuration,
                text: content.sentences[sentenceIndex].text
            }
            subtitles.push(sub);

            currentTime = subDuration + timeBreak
            subDuration = sentenceDuration + currentTime
        }

          const srt = subtitle.stringify(subtitles)
          
          state.saveVideoSubtitle(srt)
    }

    async function renderYoutubeVideo(content){
        return new Promise((resolve, reject) => {
            const ffmpegRender = `videoshow`     
            const videoConfig = `${rootPath}/videoConfig.json`
            const audionPath = `${rootPath}/templates/1/newsroom.mp3`

            const options = [                
                '--config', videoConfig,
                '--output', content.destinationPath,
                '--audio', audionPath               
            ]

            console.log('> [video-robot] renderizando o video...', ffmpegRender, options.join(' '))
            
            var cmd = `${ffmpegRender} ${options.join(' ')}`

            exec(cmd, function(error, stdout, stderr) {
                if(error){
                    console.error(`Error: ${error}`)
                }

                if(stdout){
                    console.log('> [video-robot] Video rendenizado', stdout)
                }

                if(stderr){
                    console.error('stderr', stderr)
                }         
                resolve()           
            });
        })
    }

    async function renderYoutubeVideoForEachImage(content){
        return new Promise((resolve, reject) => {
            for(let imageIndex = 0; imageIndex < content.sentences.length; imageIndex++){
                const videoOutputPath = `${rootPath}/content/${imageIndex}.mp4`;
                const videoConfig = `${rootPath}/content/${imageIndex}-videoConfig.json`;            
                const audionPath = `${rootPath}/content/${imageIndex}-textToSpeech.mp3`;
                const ffmpegRender = `videoshow`                

                const options = [                
                    '--config', videoConfig,
                    '--output', videoOutputPath,
                    '--audio', audionPath               
                ]

                console.log('> [video-robot] renderizando o video...', ffmpegRender, options.join(' '))
                
                var cmd = `${ffmpegRender} ${options.join(' ')}`

                execSync(cmd, function (error, stdout, stderr) {
                    if (error) {
                        console.error(`Error: ${error}`);
                    }
                    if (stdout) {
                        console.log('> [video-robot] Video rendenizado', stdout);
                    }
                    if (stderr) {
                        console.error('stderr', stderr);
                    }
                    //resolve()           
                });
            }

            resolve()
        })
    }

    function ffmpegRun(videoPath, videoDestinationPath, outputOptions){
        return new Promise((resolve, reject) => {            
            const videoCodec = 'libx264'
            fffmpeg(videoPath)
                .videoCodec(videoCodec)            
                .outputOptions(outputOptions)
                .on('stderr', function(stderrLine) {
                    //console.log('> [video-robot] Stderr output: ' + stderrLine)
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

    async function mergeSubtitlesAndYoutubeVideoForEachImage(content){
        for(let imageIndex = 0; imageIndex < content.sentences.length; imageIndex++) {
            const subtitlePath = `./content/${imageIndex}-subtitle.srt`;
            const videoPath = `./content/${imageIndex}.mp4`;
            const videoDestinationPath = `./content/${imageIndex}-subtitled.mp4`
            const outputOptions = `-vf subtitles=${subtitlePath}:force_style='Fontsize=28,Outline=2,PrimaryColour=&HFFFFFF&'"`
            console.log(`> [video-robot] Adding subtitles: "${outputOptions}"`)
            await ffmpegRun(videoPath, videoDestinationPath, outputOptions);
        }
    }

    async function applyVideoFilters(content){
        for(let imageIndex = 0; imageIndex < content.sentences.length; imageIndex++) {
            const subtitlePath = `./content/${imageIndex}-subtitle.srt`;
            const videoPath = `./content/${imageIndex}.mp4`;
            const videoDestinationPath = `./content/${imageIndex}-withFilters.mp4`
            //const outputOptions = `-vf zoompan=z='if(lte(pzoom,1.0),1.2,max(1.001,pzoom-0.002))':d=1:x='iw/2-(iw/zoom/2)':y='0':s=1920x1080:fps=30,subtitles=${subtitlePath}:force_style='Fontsize=28,Outline=2,PrimaryColour=&HFFFFFF&'"`
            const outputOptions = `-vf zoompan=z='min(pzoom+0.0005,1.5)':d=1:s=1920x1080:fps=30,subtitles=${subtitlePath}:force_style='Fontsize=28,Outline=2,PrimaryColour=&HFFFFFF&'"`
            console.log(`> [video-robot] Applying video filters: "${outputOptions}"`)
            await ffmpegRun(videoPath, videoDestinationPath, outputOptions);
        }
    }
    
    async function mergeSubtitlesAndYoutubeVideo(content){
        const subtitlePath = './content/subtitle.srt'
        const videoPath = `./content/${content.nameVideo}`
        //const videoDestinationPath = `./content/s_${content.nameVideo}`
        const videoDestinationPath = `./content/output.mp4`
        //const outputOptions = `-vf subtitles=${subtitlePath}:force_style='Fontsize=26,Outline=2,PrimaryColour=&HFFFFFF&'" `
        const outputOptions = `-vf subtitles=${subtitlePath}:force_style='Fontsize=26,Outline=2,PrimaryColour=&HFFFFFF&'"`

        fffmpeg(videoPath)
            .videoCodec(videoCodec)            
            .outputOptions(outputOptions)
            .on('error', function(err) {
                console.error(`Error: ${err}`)
            })
            .save(videoDestinationPath)
            .on('end', function() {
                console.log('success')              
            })
    }

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
}

module.exports = robot