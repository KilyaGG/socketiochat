const { Server } = require('socket.io');
const http = require('http');

//variables

let CHAT_MESSAGES = [];
let CHAT_USERS = new Map();



//classes

class User {
  constructor(name, chatRole, globalRole, messages, id) {
    this.name = name;
    this.chatRole = chatRole;
    this.globalRole = globalRole;
    this.messages = messages;
    this.id = id;
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

  socket.emit('data-user-join', SendChatDataOnJoin())

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
    CHAT_MESSAGES.push(messageData);
    
    user = getUserByID(socket.id);
    user.messages.push(messageData);

    if (publicMessage) {
      socket.broadcast.emit('new-chat-message', messageData);
    }

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


function getUserByID(id) {
  try {
      user = CHAT_USERS.get(id);
      return user;
  } catch { console.log(`User not found! UserID: ${socket.id}`)}
}

function emitServerAction (actionType, data = '') {

  if (!actionType || typeof(actionType) != "string") return sendServerMessage('This command does not exist.', 'action', data.sender);

  if (actionType === "/clearAll") {
    CHAT_MESSAGES = [];
    io.emit('clear-chat', {data});
    console.log("Chat cleared");
  }
  else {
    return sendServerMessage('This command does not exist.', 'action', data.sender);
  }


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
  CHAT_USERS.set(id, user);
}

function SendChatDataOnJoin() {
  chatData = {CHAT_MESSAGES: CHAT_MESSAGES};
  return chatData;
}

// Запуск сервера
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});