const state = require('./state.js')
const fs = require('fs')
const path = require('path')
const getMP3Duration = require('get-mp3-duration')
const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

const apikey = require('../credentials/watson-tts.json').apikey
const apiUrl = require('../credentials/watson-tts.json').url
const rootPath = path.resolve(__dirname, '..')

function synthesize_audio(text, mp3Path) {
  return new Promise((resolve, reject) => {
    console.log(`> [textToSpeech-robot] Synthesizing audio from text: "${text}"`)

    const textToSpeech = new TextToSpeechV1({
      authenticator: new IamAuthenticator({
        apikey: apikey,
      }),
      url: apiUrl,
    });

    const synthesizeParams = {
      text: text,
      accept: 'audio/mp3',
      voice: 'pt-BR_IsabelaV3Voice',
    };
    
    textToSpeech.synthesize(synthesizeParams)
    .then(audio => {    
      audio.result
            .pipe(fs.createWriteStream(mp3Path))
            .on('finish', resolve)
            .on('error', reject);
    })
    .catch(err => {
      console.log('error:', err);
    });
  });
}

async function createSpeechForSentences(content){
  for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
    const text = content.sentences[sentenceIndex].text;
    const outputPath = `${rootPath}/content/${sentenceIndex}-textToSpeech.mp3`;
    await synthesize_audio(text, outputPath)
      .then(() => {
        const buffer = fs.readFileSync(outputPath)
        const duration = getMP3Duration(buffer)
        console.log('duration: ', duration, 'ms')
        const duration_seconds_rounded = Math.ceil(duration/1000)
        console.log('rounded: ', duration_seconds_rounded, 's')
      })
  }
}

async function robot() {
  const content = state.load()
  await createSpeechForSentences(content)
}

module.exports = robot
