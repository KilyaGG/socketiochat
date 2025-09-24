const { Server } = require('socket.io');
const http = require('http');

//variables

const CHAT_MESSAGES = new Map();
let CHAT_USERS = new Map();
let MESSAGES_START_SEND = -20;
let LAST_MESSAGE_ID = 0;


//classes

class User {
  constructor(name, chatRole, globalRole, messages, id, topMessageLoadedIdx, bottomMessageLoadedIdx) {
    this.name = name;
    this.chatRole = chatRole;
    this.globalRole = globalRole;
    this.messages = messages;
    this.id = id;
    this.topMessageLoadedIdx = topMessageLoadedIdx;
    this.bottomMessageLoadedIdx = bottomMessageLoadedIdx;
  }
}



// Создаем HTTP сервер
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Разрешаем все домены для разработки
    methods: ["GET", "POST"]
  }
});

// Обработка подключения клиента
io.on('connection', (socket) => {
  console.log('Клиент подключился:', socket.id);

  initUser(socket.id);

  socket.emit('data-user-join', SendChatDataOnJoin(socket.id))

  socket.broadcast.emit('new-chat-member', {id: socket.id});

  socket.on('new-chat-message', (messageData) => {
    let publicMessage = true;
    if (messageData.type === 'message') {
      messageData.sender = socket.id;
    }
    if (messageData.type === 'action') {
      messageData.sender = "server";
      publicMessage = false;
    }
    if (messageData.type === 'command') {
      messageData.sender = socket.id;
      userCommandWorker(messageData);
    }
    LAST_MESSAGE_ID++;
    CHAT_MESSAGES.set(LAST_MESSAGE_ID, messageData);
    
    user = getUserByID(socket.id);
    user.messages.push(messageData);

    if (publicMessage) {
      socket.broadcast.emit('new-chat-message', messageData);
    }

  });

  socket.on('request-new-messages', (userdata) => {
    messagesToSend = giveNewMessagesByRequest(userdata.id);
    socket.emit('load-new-messages', (messagesToSend));
  });

  // Обработка отключения клиента
  socket.on('disconnect', () => {
    console.log('Клиент отключился:', socket.id);
    socket.broadcast.emit('chat-member-left', {id: socket.id});
  });

});


function sendServerMessage(message, type, address = undefined) {
  if (!address) {
    io.emit('server-message', {text: message, type: type});
  }
  if (address) {
    io.to(address).emit('server-message', {text: message, type: type});
  }
}
function giveNewMessagesByRequest(id) {
  user = getUserByID(id);
  let messagesToSend = sliceMap(CHAT_MESSAGES, MESSAGES_START_SEND + user.topMessageLoadedIdx, user.bottomMessageLoadedIdx);
  user.bottomMessageLoadedIdx = user.topMessageLoadedIdx;
  user.topMessageLoadedIdx += MESSAGES_START_SEND;
  const chatDataJSON = JSON.stringify(Array.from(messagesToSend));
  return chatDataJSON;
}

function getUserByID(id) {
  try {
      user = CHAT_USERS.get(id);
      return user;
  } catch { console.log(`User not found! UserID: ${socket.id}`)}
}

function emitServerAction (actionType, data = '') {

  if (!actionType || typeof(actionType) != "string") return sendServerMessage('This command does not exist.', 'action', data.sender);

  if (actionType === "/clearAll") {
    CHAT_MESSAGES.clear();
    io.emit('clear-chat', {data});
    console.log("Chat cleared");
  }
  else {
    return sendServerMessage('This command does not exist.', 'action', data.sender);
  }


}

function sliceMap(map, start, end) {
    // Обработка отрицательных индексов как в Array.slice()
    const size = map.size;
    
    // Преобразование start (аналогично Array.slice())
    let startIndex = start === undefined ? 0 : start;
    if (startIndex < 0) {
        startIndex = Math.max(size + startIndex, 0);
    } else {
        startIndex = Math.min(startIndex, size);
    }
    
    // Преобразование end (аналогично Array.slice())
    let endIndex = end === undefined ? size : end;
    if (endIndex < 0) {
        endIndex = Math.max(size + endIndex, 0);
    } else {
        endIndex = Math.min(endIndex, size);
    }
    
    // Если start >= end или start >= size, возвращаем пустой Map
    if (startIndex >= endIndex || startIndex >= size) {
        return new Map();
    }
    
    // Создаем новый Map с нужными элементами
    const result = new Map();
    let index = 0;
    
    for (const [key, value] of map) {
        if (index >= startIndex && index < endIndex) {
            result.set(key, value);
        }
        index++;
        if (index >= endIndex) break;
    }
    
    return result;
}


function userCommandWorker(data) {

  user = getUserByID(data.sender);

  if (data.text === "/setadmin") {
    user.chatRole = "Admin";
    sendServerMessage('You are admin now', 'action', data.sender);
    console.log(`${user.id} changed role to Admin.`)
    return;
  }

  if (user.chatRole === "Admin") {
    emitServerAction(data.text, {sender: data.sender});
  }
}

function initUser(id) {
  user = new User();
  user.id = id;
  user.name = id;
  user.messages = [];
  user.chatRole = "user";
  user.topMessageLoadedIdx = 0;
  user.bottomMessageLoadedIdx = 0;
  CHAT_USERS.set(id, user);
}

function SendChatDataOnJoin(id) {
  user = getUserByID(id);
  let messagesToSend = sliceMap(CHAT_MESSAGES, MESSAGES_START_SEND);
  user.topMessageLoadedIdx += MESSAGES_START_SEND;
  const chatDataJSON = JSON.stringify(Array.from(messagesToSend));
  return chatDataJSON;
}

// Запуск сервера
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});