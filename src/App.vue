<template>
  <div class="chat-container">
    <div class = "chat-content">
      <div class="chatMessages" ref="chatMessagesContainer"></div>
      <div class="messageHolder">
        <input v-model="text" id="input1" @keypress.enter="userSendMessage" placeholder="Введите сообщение...">
        <button @click="userSendMessage()">➤</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, nextTick } from 'vue'
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');


//variables




// сокеты
socket.on("connect", () => {

    console.log(socket.id);

    socket.on('new-chat-member', (data) => {
      sendMessageOnUserAction(data.id, 'join');
    })

    socket.on('chat-member-left', (data) => {
      sendMessageOnUserAction(data.id, 'left');
    })

    socket.on('new-chat-message', (messageData) => {
      addMessageToList(messageData);
    });

    socket.on('data-user-join', (CHAT_DATA) => {
      CHAT_DATA.CHAT_MESSAGES.forEach((message: MessageData) => {
        addMessageToList(message);
      });
    });

    socket.on('clear-chat', (data) => {
      if (chatMessagesContainer.value) {
        chatMessagesContainer.value.innerHTML = '';
      }   
    });

    socket.on('server-message', (data) => {
      const messageElement = document.createElement("p");
      messageElement.innerHTML = data.text;
      messageElement.classList.add("chat-message");
      if (data.type === "action") {
        messageElement.classList.add("action-user")
      }
      message(messageElement);
    });
    

});

class MessageData {
  text: string;
  classes: DOMTokenList;
  sender: string;
  type: string;

  constructor(text: string, classes: DOMTokenList, sender: string, type: string) {
    this.text = text;
    this.sender = sender;
    this.classes = classes;
    this.type = type;
  }

}

const text = ref('')
const chatMessagesContainer = ref<HTMLDivElement | null>(null)
let messageType = 'user-message';
const userSendMessage = () => {
  if (!text.value.trim()) return
  
  const messageText = text.value;
  text.value = "";


  const messageElement = document.createElement("p");
  messageElement.classList.add("chat-message");
  if (messageText.startsWith('/')) {
    messageType = 'user-command';
    messageElement.classList.add("chat-command");
  }
  messageElement.innerHTML = messageText;
  message(messageElement);


  const messageData = new MessageData(messageElement.innerHTML, messageElement.classList, '', messageType);
  socket.emit('new-chat-message', messageData);
}

function sendMessageOnUserAction(username: string, action: string) {
  const messageElement = document.createElement("p");
  messageElement.classList.add("chat-message");
  messageElement.classList.add("action-user");
  if (action === "join") {
    console.log(`User joined ${username}`);
    messageElement.innerHTML = `User ${username} just joined`;
  }
  if (action === "left") {
    console.log(`User left ${username}`);
    messageElement.innerHTML = `User ${username} left`;    
  }
  if (action === undefined || action === null || typeof(action) != "string") {
    console.error(`Undefined action on user ${username}`);
    messageElement.innerHTML = `User ${username} did something weird!`;  
  }
  const messageData = new MessageData(messageElement.innerHTML, messageElement.classList, '', 'user-action');
  socket.emit('new-chat-message', messageData);
  message(messageElement);
}

function addMessageToList(messageData: MessageData) {
    const messageElement = document.createElement("p");
    for (const key in messageData.classes) {
      if (messageData.classes.hasOwnProperty(key)) {
          const value = messageData.classes[key];
          messageElement.classList.add(value)
      }
    }
    messageElement.innerHTML = messageData.text;
    message(messageElement);
}

function message(messageElement: HTMLElement) {
  if (chatMessagesContainer.value) {
      chatMessagesContainer.value.appendChild(messageElement);
      nextTick(() => {
        chatMessagesContainer.value?.scrollTo({
          top: chatMessagesContainer.value.scrollHeight,
          behavior: 'smooth'
        });
      });
  }
}


</script>

<style scoped>


body, html {
  margin: 0px !important;
  padding: 0;
  height: 100%;
  font-family: 'Lato', sans-serif;
  background-color: #f5f5f5;
}


.chat-content {
  margin-left: 200px;
  /*background-image: url("./assets/images/wallaper.png");*/
  background-color: #a8a8a8;
  height: 100vh;
}

/* Контейнер чата */
.chatMessages {
  height: calc(100vh - 120px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px;
}



/* Контейнер для ввода сообщений */
.messageHolder {
  bottom: 0;
  left: 0;
  right: 0;
  border-top: 1px solid #e0e0e000;
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: 300px;
  width: 1300px;
  font-family: 'Lato', sans-serif;

}

:deep(.chat-message) {
  max-width: 40%;
  padding: 12px 16px;
  border-radius: 18px;
  margin: 4px 0;
  word-wrap: break-word;
  position: relative;
  animation: fadeIn 0.3s ease-in;
  background-color: #616161;
  color: white;
  font-family: 'Lato', sans-serif;
  border-bottom-right-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  line-height: 1.4;
  font-size: 14px;
}

:deep(.action-user) {
  align-self: center;
}

:deep(.chat-command) {
  color:aqua;
}



/* Поле ввода */
#input1 {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  outline: none;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

#input1:focus {
  border-color: #5d5d5d;
  box-shadow: 0 0 0 2px rgba(83, 83, 83, 0.2);
}

/* Кнопка отправки */
button {
  padding: 12px 20px;
  background-color: #000000;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #6b6b6b;
}

button:active {
  transform: scale(0.98);
}

/* Анимация появления сообщений */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Стили для скроллбара */
.chatMessages::-webkit-scrollbar {
  width: 6px;
}

.chatMessages::-webkit-scrollbar-track {
  background: transparent;
}

.chatMessages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chatMessages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .chatMessages {
    padding: 12px;
    height: calc(100vh - 60px);
  }
  
  .messageHolder {
    padding: 12px;
  }
  
  #input1 {
    padding: 10px 14px;
  }
  
  button {
    padding: 10px 16px;
  }
}
</style>