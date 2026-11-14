const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')

const [htmlPath, outputPath] = process.argv.slice(2)

app.whenReady().then(async () => {
  console.log('CAPTURE: start', htmlPath, outputPath)
  const win = new BrowserWindow({
    width: 1400,
    height: 1350,
    show: false
  })

  win.webContents.on('did-finish-load', () => console.log('CAPTURE: loaded'))
  win.webContents.on('did-fail-load', (_event, code, desc) => console.log('CAPTURE: fail', code, desc))

  try {
    await win.loadFile(htmlPath)
    console.log('CAPTURE: file loaded')
    await new Promise((resolve) => setTimeout(resolve, 700))
    const pageHeight = await win.webContents.executeJavaScript(
      'Math.ceil(document.documentElement.scrollHeight)'
    )
    win.setContentSize(1400, Math.max(800, pageHeight + 20))
    await new Promise((resolve) => setTimeout(resolve, 300))
    const image = await win.webContents.capturePage()
    console.log('CAPTURE: page captured', image.getSize())
    fs.writeFileSync(outputPath, image.toPNG())
    console.log('CAPTURE: saved')
  } catch (error) {
    console.error('CAPTURE ERROR:', error)
  }
  app.exit(0)
})
