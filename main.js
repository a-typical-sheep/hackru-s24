const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const OpenAI = require('openai').default;

// sha256 used for now
const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(String('randomkey'))
  .digest('base64')
  .substr(0, 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

const chatsFile = path.join(app.getPath('userData'), 'chats.enc');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle('start-chat', async (event, messages) => {
  const openai = new OpenAI({
    // omitted to prevent unauthorized users on github
    baseURL: '',
    apiKey: ''
  });

  try {
    const stream = await openai.chat.completions.create({
      model: 'tgi',
      messages,
      stream: true
    });

    for await (const chunk of stream) {
      event.sender.send('chat-stream', chunk.choices[0]?.delta?.content || '');
    }
  } catch (err) {
    console.error('Streaming error:', err);
    event.sender.send('chat-stream', '[Error receiving stream]');
  }

  event.sender.send('chat-stream-end', 'done');
  return 'done';
});

//save chat
ipcMain.handle('save-chats', async (event, chats) => {
  try {
    const data = JSON.stringify(chats);
    const encryptedData = encrypt(data);
    fs.writeFileSync(chatsFile, encryptedData, 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error saving chats:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('load-chats', async (event) => {
  try {
    if (fs.existsSync(chatsFile)) {
      const encryptedData = fs.readFileSync(chatsFile, 'utf8');
      const decryptedData = decrypt(encryptedData);
      const chats = JSON.parse(decryptedData);
      return { success: true, chats };
    } else {
      return { success: true, chats: [] };
    }
  } catch (err) {
    console.error('Error loading chats:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('export-chat', async (event, chat) => {
  try {
    const data = JSON.stringify(chat);
    const encryptedData = encrypt(data);
    return { success: true, data: encryptedData };
  } catch (err) {
    console.error('Error exporting chat:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('import-chat', async (event, encryptedData) => {
  try {
    const decryptedData = decrypt(encryptedData);
    const chat = JSON.parse(decryptedData);
    return { success: true, chat };
  } catch (err) {
    console.error('Error importing chat:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-chat-to-file', async (event, encryptedData) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Exported Chat',
    defaultPath: 'chat.enc',
    filters: [{ name: 'Encrypted Chat', extensions: ['enc'] }]
  });
  if (canceled || !filePath) {
    return { success: false, error: 'File save canceled' };
  }
  try {
    fs.writeFileSync(filePath, encryptedData, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-chat-from-file', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Open Exported Chat',
    properties: ['openFile'],
    filters: [{ name: 'Encrypted Chat', extensions: ['enc'] }]
  });
  if (canceled || filePaths.length === 0) {
    return { success: false, error: 'File open canceled' };
  }
  try {
    const encryptedData = fs.readFileSync(filePaths[0], 'utf8');
    return { success: true, data: encryptedData };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
