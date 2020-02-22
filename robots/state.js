const fs = require('fs')
const contentFilePath = './content.json'
const scriptFilePath = './content/after-effects-script.js'
const configFilePath = './videoConfig.json'
const subtitleFilePath = './content/subtitle.srt'

function save(content) {
  const contentString = JSON.stringify(content)
  return fs.writeFileSync(contentFilePath, contentString)
}

function saveScript(content) {
  const contentString = JSON.stringify(content)
  const scriptString = `var content = ${contentString}`
  return fs.writeFileSync(scriptFilePath, scriptString)
}

function load() {
  const fileBuffer = fs.readFileSync(contentFilePath, 'utf-8')
  const contentJson = JSON.parse(fileBuffer)
  return contentJson
}

const saveVideoConfig = (videoConfig) => {
  const contentString = JSON.stringify(videoConfig)
  return fs.writeFileSync(configFilePath, contentString)
}

const saveVideoSubtitle = (subtitle) => {
  return fs.writeFileSync(subtitleFilePath, subtitle)
}

module.exports = {
  save,
  load,
  saveVideoConfig,
  saveVideoSubtitle
}