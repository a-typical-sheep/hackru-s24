/**
 * @param {string} message
 * @param {string} [defaultValue=""]
 * @returns {Promise<string|null>}
 */
function showPrompt(message, defaultValue = "") {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.style.position = "fixed";
      modal.style.top = "0";
      modal.style.left = "0";
      modal.style.width = "100%";
      modal.style.height = "100%";
      modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      modal.style.zIndex = "10000";
      const container = document.createElement("div");
      container.style.backgroundColor = "#fff";
      container.style.padding = "20px";
      container.style.borderRadius = "8px";
      container.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.3)";
      container.style.minWidth = "300px";
      const messageEl = document.createElement("div");
      messageEl.textContent = message;
      container.appendChild(messageEl);
      const input = document.createElement("input");
      input.type = "text";
      input.value = defaultValue;
      input.style.width = "100%";
      input.style.marginTop = "10px";
      container.appendChild(input);
      const btnContainer = document.createElement("div");
      btnContainer.style.marginTop = "15px";
      btnContainer.style.textAlign = "right";
      const okButton = document.createElement("button");
      okButton.textContent = "OK";
      okButton.style.marginRight = "5px";
      btnContainer.appendChild(okButton);
      const cancelButton = document.createElement("button");
      cancelButton.textContent = "Cancel";
      btnContainer.appendChild(cancelButton);
      container.appendChild(btnContainer);
      modal.appendChild(container);
      document.body.appendChild(modal);
      input.focus();
      okButton.onclick = () => {
        const value = input.value;
        document.body.removeChild(modal);
        resolve(value);
      };
      cancelButton.onclick = () => {
        document.body.removeChild(modal);
        resolve(null);
      };
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          okButton.click();
        }
      });
    });
  }
  function readCsv(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  function parsePdf(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function () {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
          const maxPages = pdf.numPages;
          const pagePromises = [];
          for (let i = 1; i <= maxPages; i++) {
            pagePromises.push(
              pdf.getPage(i).then((page) =>
                page.getTextContent().then((textContent) =>
                  textContent.items.map((item) => item.str).join(" ")
                )
              )
            );
          }
          Promise.all(pagePromises).then((pagesText) => {
            resolve(pagesText.join("\n"));
          });
        }).catch(reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  function processThinkTags(text) {
    let result = "";
    let pos = 0;
    let inThink = false;
    const openTag = "<think>";
    const closeTag = "</think>";
    while (true) {
      let openIndex = text.indexOf(openTag, pos);
      let closeIndex = text.indexOf(closeTag, pos);
      if (!inThink && openIndex !== -1 && (closeIndex === -1 || openIndex < closeIndex)) {
        result += text.substring(pos, openIndex);
        result += '<div class="thinking">';
        inThink = true;
        pos = openIndex + openTag.length;
      } else if (inThink && closeIndex !== -1) {
        result += text.substring(pos, closeIndex);
        result += "</div>";
        inThink = false;
        pos = closeIndex + closeTag.length;
      } else {
        result += text.substring(pos);
        break;
      }
    }
    return result;
  }
  marked.setOptions({ headerIds: false, mangle: false, sanitize: false });
  let viewMode = "chat";
  
  document.addEventListener("DOMContentLoaded", async () => {
    const dashboardBtn = document.getElementById("dashboard-btn");
    const newChatButtonEl = document.getElementById("new-chat");
    const importChatButtonEl = document.getElementById("import-chat");
    const chatListEl = document.getElementById("chat-list");
    const chatDisplayEl = document.getElementById("chat-display");
    const dashboardViewEl = document.getElementById("dashboard-view");
    const chatInputEl = document.getElementById("chat-input");
    const fileInputEl = document.getElementById("file-input");
    const sendButtonEl = document.getElementById("send-button");
  
    let chats = [];
    let activeChatId = null;
    const statuses = ["Not Assigned", "Not Started", "In Progress", "Completed"];
  
    function createNewChat() {
      return { id: Date.now(), messages: [], status: "Not Assigned" };
    }
  
    async function saveChatsToDisk() {
      await window.electronAPI.saveChats(chats);
    }
    async function loadChatsFromDisk() {
      const result = await window.electronAPI.loadChats();
      if (result.success && Array.isArray(result.chats) && result.chats.length > 0) {
        chats = result.chats;
        activeChatId = chats[0].id;
      }
    }
  
    function renderChatList() {
      chatListEl.querySelectorAll(".chat-item").forEach((el) => el.remove());
      chats.forEach((chat) => {
        const chatItem = document.createElement("div");
        chatItem.className = "chat-item";
        const titleSpan = document.createElement("span");
        titleSpan.className = "chat-title";
        titleSpan.textContent = chat.title || "New Chat";
        titleSpan.onclick = () => {
          activeChatId = chat.id;
          viewMode = "chat";
          updateMainView();
        };
        chatItem.appendChild(titleSpan);
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "chat-actions";
        const renameBtn = document.createElement("button");
        renameBtn.textContent = "R";
        renameBtn.title = "Rename chat";
        renameBtn.onclick = async (e) => {
          e.stopPropagation();
          const newTitle = await showPrompt("Enter new chat name:", chat.title || "New Chat");
          if (newTitle && newTitle.trim()) {
            chat.title = newTitle;
            renderChatList();
            saveChatsToDisk();
          }
        };
        actionsDiv.appendChild(renameBtn);
        const exportBtn = document.createElement("button");
        exportBtn.textContent = "E";
        exportBtn.title = "Export chat";
        exportBtn.onclick = async (e) => {
          e.stopPropagation();
          const result = await window.electronAPI.exportChat(chat);
          if (result.success) {
            if (confirm("Click OK to copy exported chat to clipboard. Cancel to save as file.")) {
              navigator.clipboard.writeText(result.data);
              alert("Exported chat copied to clipboard!");
            } else {
              const fileResult = await window.electronAPI.saveChatToFile(result.data);
              if (fileResult.success) {
                alert("Chat exported to file successfully.");
              } else {
                alert("Error saving file: " + fileResult.error);
              }
            }
          } else {
            alert("Error exporting chat: " + result.error);
          }
        };
        actionsDiv.appendChild(exportBtn);
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "X";
        deleteBtn.title = "Delete chat";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm("Are you sure you want to delete this chat?")) {
            chats = chats.filter((c) => c.id !== chat.id);
            if (activeChatId === chat.id) {
              activeChatId = chats.length ? chats[0].id : null;
            }
            renderChatList();
            updateMainView();
            saveChatsToDisk();
          }
        };
        actionsDiv.appendChild(deleteBtn);
        chatItem.appendChild(actionsDiv);
        chatListEl.appendChild(chatItem);
      });
    }
  
    function renderChatView() {
      chatDisplayEl.style.display = "block";
      dashboardViewEl.style.display = "none";
      chatDisplayEl.innerHTML = "";
      const chat = chats.find((c) => c.id === activeChatId);
      if (chat) {
        chat.messages.forEach((msg) => {
          const msgDiv = document.createElement("div");
          msgDiv.className = msg.role;
          if (msg.role === "user" && msg.displayContent) {
            msgDiv.textContent = msg.displayContent;
          } else if (msg.role === "assistant") {
            let processedText = processThinkTags(msg.content);
            let html = marked.parse(processedText);
            msgDiv.innerHTML = `<div class="markdown-content">${html}</div>`;
          } else {
            msgDiv.textContent = msg.content;
          }
          chatDisplayEl.appendChild(msgDiv);
        });
        chatDisplayEl.scrollTop = chatDisplayEl.scrollHeight;
      }
    }
  
    function renderDashboard() {
      chatDisplayEl.style.display = "none";
      dashboardViewEl.style.display = "block";
      dashboardViewEl.innerHTML = "";
      const board = document.createElement("div");
      board.className = "dashboard-columns";
      statuses.forEach((status) => {
        const column = document.createElement("div");
        column.className = "kanban-column";
        column.dataset.status = status;
        const header = document.createElement("h3");
        header.textContent = status;
        column.appendChild(header);
        column.addEventListener("dragover", (e) => {
          e.preventDefault();
          column.style.backgroundColor = "#e2e6ea";
        });
        column.addEventListener("dragleave", (e) => {
          column.style.backgroundColor = "#f1f3f5";
        });
        column.addEventListener("drop", (e) => {
          e.preventDefault();
          column.style.backgroundColor = "#f1f3f5";
          const chatId = parseInt(e.dataTransfer.getData("text/plain"), 10);
          const chat = chats.find((c) => c.id === chatId);
          if (chat) {
            chat.status = status;
            renderDashboard();
            renderChatList();
            saveChatsToDisk();
          }
        });
        chats.filter(c => c.status === status).forEach((chat) => {
          const card = document.createElement("div");
          card.className = "card";
          card.textContent = chat.title || "New Chat";
          card.draggable = true;
          card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", chat.id);
          });
          card.addEventListener("click", () => {
            activeChatId = chat.id;
            viewMode = "chat";
            updateMainView();
          });
          column.appendChild(card);
        });
        board.appendChild(column);
      });
      dashboardViewEl.appendChild(board);
    }
  
    function updateMainView() {
      if (viewMode === "chat") {
        renderChatView();
      } else if (viewMode === "dashboard") {
        renderDashboard();
      }
    }
  
    newChatButtonEl.addEventListener("click", () => {
      const newChat = createNewChat();
      chats.push(newChat);
      activeChatId = newChat.id;
      renderChatList();
      viewMode = "chat";
      updateMainView();
      saveChatsToDisk();
    });
  
    importChatButtonEl.addEventListener("click", async () => {
      if (confirm("Click OK to import from file. Cancel to paste encrypted chat text.")) {
        const fileResult = await window.electronAPI.openChatFromFile();
        if (fileResult.success) {
          const result = await window.electronAPI.importChat(fileResult.data);
          if (result.success) {
            result.chat.id = Date.now() + Math.floor(Math.random() * 10000);
            result.chat.status = result.chat.status || "Not Assigned";
            chats.push(result.chat);
            activeChatId = result.chat.id;
            renderChatList();
            viewMode = "chat";
            updateMainView();
            saveChatsToDisk();
          } else {
            alert("Error importing chat: " + result.error);
          }
        } else {
          alert("File open error: " + fileResult.error);
        }
      } else {
        const encryptedText = await showPrompt("Paste the encrypted chat text here:");
        if (encryptedText) {
          const result = await window.electronAPI.importChat(encryptedText);
          if (result.success) {
            result.chat.id = Date.now() + Math.floor(Math.random() * 10000);
            result.chat.status = result.chat.status || "Not Assigned";
            chats.push(result.chat);
            activeChatId = result.chat.id;
            renderChatList();
            viewMode = "chat";
            updateMainView();
            saveChatsToDisk();
          } else {
            alert("Error importing chat: " + result.error);
          }
        } else {
          alert("No encrypted text was provided.");
        }
      }
    });
  
    dashboardBtn.addEventListener("click", () => {
      viewMode = "dashboard";
      updateMainView();
    });
  
    sendButtonEl.addEventListener("click", async () => {
      let baseMessage = chatInputEl.value.trim();
      if (!baseMessage) return;
      const chat = chats.find((c) => c.id === activeChatId);
      if (!chat) return;
      // assistant message
      let apiPreface = "";
      if (chat.messages.filter(m => m.role === "user").length === 0) {
        apiPreface = "You are to come up with some hypothese relevant to the prompt below and any files, if they are also attached. If there are files attached, you should analyze them and understand them fully. Once you have done so, come up with possible gaps in the papers and/or possible improvements based on that. If there is data attached, you should think about the data and its patterns as well. Based on al of this information, come up with some possible hypotheses for future papers and GIVE EACH ONE A SCORE from 0 to 100 based on how likely that hypothesis is to be true and have a good outcome. In addition, for each hypothesis provide some background/information on how to set up such an experiment to test that hypothesis.\n";
      }
      const displayMessage = baseMessage;
      const apiMessage = apiPreface + baseMessage;
      const files = fileInputEl.files;
      let fullAttachmentsText = "";
      let summaryFilenames = [];
      if (files && files.length > 0) {
        for (const file of files) {
          summaryFilenames.push(file.name);
          let fileContent = "";
          if (file.name.toLowerCase().endsWith(".pdf")) {
            try { fileContent = await parsePdf(file); }
            catch (err) { fileContent = "[Error reading PDF file]"; }
          } else if (file.name.toLowerCase().endsWith(".csv")) {
            try { fileContent = await readCsv(file); }
            catch (err) { fileContent = "[Error reading CSV file]"; }
          }
          fullAttachmentsText += `\nFile: ${file.name}\n${fileContent}\n`;
        }
        fileInputEl.value = "";
      }
      let finalApiMessage = apiMessage;
      let finalDisplayMessage = displayMessage;
      if (fullAttachmentsText) {
        finalApiMessage += "\nThere are file/files attached, analyze them and complete the prompt\n" + fullAttachmentsText;
        finalDisplayMessage += "\nAttached files: " + summaryFilenames.join(", ");
      }
      chat.messages.push({ role: "user", content: finalApiMessage, displayContent: finalDisplayMessage });
      updateMainView();
      chatInputEl.value = "";
      chat.messages.push({ role: "assistant", content: "" });
      const assistantMsgDiv = document.createElement("div");
      assistantMsgDiv.className = "assistant";
      assistantMsgDiv.innerHTML = "";
      chatDisplayEl.appendChild(assistantMsgDiv);
      chatDisplayEl.scrollTop = chatDisplayEl.scrollHeight;
      sendButtonEl.disabled = true;
      window.electronAPI.removeChatStreamListeners();
      let fullResponse = "";
      const updateInterval = setInterval(() => {
        let processed = processThinkTags(fullResponse);
        let html = marked.parse(processed);
        assistantMsgDiv.innerHTML = `<div class="markdown-content">${html}</div>`;
        chat.messages[chat.messages.length - 1].content = assistantMsgDiv.innerHTML;
        chatDisplayEl.scrollTop = chatDisplayEl.scrollHeight;
      }, 100);
      window.electronAPI.onChatStream((data) => {
        fullResponse += data;
      });
      window.electronAPI.onChatStreamEnd((data) => {
        clearInterval(updateInterval);
        let processed = processThinkTags(fullResponse);
        let html = marked.parse(processed);
        assistantMsgDiv.innerHTML = `<div class="markdown-content">${html}</div>`;
        chat.messages[chat.messages.length - 1].content = assistantMsgDiv.innerHTML;
        chatDisplayEl.scrollTop = chatDisplayEl.scrollHeight;
        sendButtonEl.disabled = false;
        saveChatsToDisk();
      });
      await window.electronAPI.startChat(chat.messages);
    });
  
    await loadChatsFromDisk();
    if (chats.length === 0) {
      const newChat = createNewChat();
      chats.push(newChat);
      activeChatId = newChat.id;
    }
    renderChatList();
    updateMainView();
  });
  