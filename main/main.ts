import { app, BrowserWindow } from "electron"
import fetch from "node-fetch"

let mainWindow: BrowserWindow | null

app.on("ready", createMainWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (mainWindow === null) {
    createMainWindow()
  }
})

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  })
  mainWindow.on("closed", () => {
    mainWindow = null
  })
  mainWindow.loadFile("../index.html")
  mainWindow.webContents.openDevTools()
}

function githubAuthorization() {
  const clientId = process.env.CLIENT_ID
  const clientSecret = process.env.CLIENT_SECRET
  if (!clientId) throw new Error(`No process.env.CLIENT_ID!`)
  if (!clientSecret) throw new Error(`No process.env.CLIENT_SECRET!`)
  const scopes = ["user:email", "notifications"]
  const authURL =
    "https://github.com/login/oauth/authorize?client_id=" +
    clientId +
    "&scope=" +
    scopes

  let window: BrowserWindow | null = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: false },
  })
  window.on("close", () => {
    window = null
  })

  window.loadURL(authURL)
  window.show()

  window.webContents.on("will-redirect", (event, url) => {
    const error = getErrorByUrl(url)
    if (error) {
      // TODO: handle error
      console.error(error)
      return
    }
    const code = getCodeByUrl(url)
    if (!code) {
      // TODO: handle error
      console.error("No code! What's happen?")
      return
    }

    return requestGithubToken(clientId, clientSecret, code)
      .then(res => res.json())
      .then(json => {
        // TODO: is it true?
        const accessToken = json.access_token as string
        return accessToken
      })
      .finally(() => {
        window && window.destroy()
      })
  })
}

function getErrorByUrl(url: string) {
  const error = /\?error=(.+)$/.exec(url)
  return error
}
function getCodeByUrl(url: string) {
  const raw_code = /code=([^&]*)/.exec(url) || null
  const code = raw_code && raw_code.length > 1 ? raw_code[1] : null
  return code
}

function requestGithubToken(
  clientId: string,
  clientSecret: string,
  code: string,
) {
  return fetch("https://github.com/login/oauth/access_token", {
    method: "post",
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }),
    headers: { "Content-Type": "application/json" },
  })
}
