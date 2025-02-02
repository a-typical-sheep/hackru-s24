const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startChat: (messages) => ipcRenderer.invoke('start-chat', messages),
  onChatStream: (callback) =>
    ipcRenderer.on('chat-stream', (event, data) => callback(data)),
  onChatStreamEnd: (callback) =>
    ipcRenderer.once('chat-stream-end', (event, data) => callback(data)),
  removeChatStreamListeners: () => ipcRenderer.removeAllListeners('chat-stream'),
  saveChats: (chats) => ipcRenderer.invoke('save-chats', chats),
  loadChats: () => ipcRenderer.invoke('load-chats'),
  exportChat: (chat) => ipcRenderer.invoke('export-chat', chat),
  importChat: (encryptedData) => ipcRenderer.invoke('import-chat', encryptedData),
  saveChatToFile: (encryptedData) =>
    ipcRenderer.invoke('save-chat-to-file', encryptedData),
  openChatFromFile: () => ipcRenderer.invoke('open-chat-from-file')
});
