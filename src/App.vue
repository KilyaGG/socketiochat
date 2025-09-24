<template>
  <div class="chat-container">
    <div class = "chat-content">
      <div class="chatMessages" ref="chatMessagesContainer" @scroll="handleChatScroll">
        <div 
          v-for="(msg, index) in chatMessages" 
          :key="index" 
          class="chat-message"
          :class="{
            'action-user': msg.type === 'action',
            'chat-command': msg.type === 'command'
          }"
          v-html="msg.text"
        ></div>
      </div>
      <div class="messageHolder">
        <input v-model="text" id="input1" @keypress.enter="userSendMessage" placeholder="Введите сообщение...">
        <button @click="userSendMessage()">➤</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, nextTick, onMounted } from 'vue'
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Реактивный массив сообщений
const chatMessages = ref<Array<{text: string, type: string}>>([]);
const text = ref('')
const chatMessagesContainer = ref<HTMLDivElement | null>(null)
let USER_CURRENT_SESSION_ID: string;
let lastChatContainerSize: number;

// сокеты
socket.on("connect", () => {

    console.log(socket.id);
    USER_CURRENT_SESSION_ID = <string>socket.id;

    socket.on('new-chat-member', (data) => {
      sendMessageOnUserAction(data.id, 'join');
    })

    socket.on('chat-member-left', (data) => {
      sendMessageOnUserAction(data.id, 'left');
    })

    socket.on('new-chat-message', (messageData) => {
      addMessageToList(messageData);
    });

    socket.on('data-user-join', (CHAT_JSON) => {
      const parsedData = JSON.parse(CHAT_JSON);
      const chatMap = new Map(parsedData);
      for (const [key, value] of chatMap as Map<string, MessageData>) {
        const message = new MessageData(value.text, value.classes, value.sender, value.type);
        addMessageToList(message);
      }
    });

    socket.on('load-new-messages', (CHAT_JSON) => {
      const parsedData = JSON.parse(CHAT_JSON);
      const chatMap = new Map(parsedData);
      for (const [key, value] of (Array.from(chatMap) as [string, MessageData][]).reverse()) {
        const message = new MessageData(value.text, value.classes, value.sender, value.type);
        addMessageToList(message, true);
      }
    });

    socket.on('clear-chat', (data) => {
      chatMessages.value = [];
    });

    socket.on('server-message', (data) => {
      chatMessages.value.push({
        text: data.text,
        type: data.type === "action" ? "action" : "message"
      });
      scrollToBottom();
    });
    

});

class MessageData {
  text: string;
  classes: string[]; // Изменено на массив строк
  sender: string;
  type: string;

  constructor(text: string, classes: string[], sender: string, type: string) {
    this.text = text;
    this.sender = sender;
    this.classes = classes;
    this.type = type;
  }

}

onMounted(() => {
  if (chatMessagesContainer.value) {
    lastChatContainerSize = chatMessagesContainer.value.scrollHeight;
    console.log('Начальная высота элемента:', lastChatContainerSize);
  }
});

const userSendMessage = () => {
  if (!text.value.trim()) return
  
  const messageText = text.value;
  text.value = "";

  let messageType = 'message';
  const classes = ['chat-message'];
  
  if (messageText.startsWith('/')) {
    messageType = 'command';
    classes.push('chat-command');
  }

  // Добавляем сообщение в реактивный массив
  chatMessages.value.push({
    text: messageText,
    type: messageType
  });

  scrollToBottom();

  // Эмитим событие сокета (сохраняем оригинальную логику)
  const messageData = new MessageData(messageText, classes, '', messageType);
  socket.emit('new-chat-message', messageData);
}

function sendMessageOnUserAction(username: string, action: string) {
  let messageText = '';
  
  if (action === "join") {
    console.log(`User joined ${username}`);
    messageText = `User ${username} just joined`;
  }
  if (action === "left") {
    console.log(`User left ${username}`);
    messageText = `User ${username} left`;    
  }
  if (action === undefined || action === null || typeof(action) != "string") {
    console.error(`Undefined action on user ${username}`);
    messageText = `User ${username} did something weird!`;  
  }

  // Добавляем action сообщение
  chatMessages.value.push({
    text: messageText,
    type: 'action'
  });

  scrollToBottom();

  // Эмитим событие сокета (сохраняем оригинальную логику)
  const messageData = new MessageData(
    messageText, 
    ['chat-message', 'action-user'], 
    '', 
    'user-action'
  );
  socket.emit('new-chat-message', messageData);
}

function addMessageToList(messageData: MessageData, addToTop = false) {
  // Определяем тип сообщения на основе classes (теперь это массив строк)
  let messageType = 'message';
  if (messageData.classes.includes('action-user')) {
    messageType = 'action';
  } else if (messageData.classes.includes('chat-command')) {
    messageType = 'command';
  }

  if (!addToTop) {
    chatMessages.value.push({
      text: messageData.text,
      type: messageType
    });

    scrollToBottom();
  }
  else {
    chatMessages.value.unshift({
      text: messageData.text,
      type: messageType
    });    
  }
}

const handleChatScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  if (target.scrollHeight === lastChatContainerSize) {
    if (target.scrollTop <= target.scrollHeight/10) {
      socket.emit('request-new-messages', {id: USER_CURRENT_SESSION_ID});
      console.log("LMAOLMAO");
    }
    console.log(`Scroll Y: ${target.scrollTop} Element Height: ${target.scrollHeight}`);
  }
  else {
    lastChatContainerSize = target.scrollHeight;
  }
};

function scrollToBottom() {
  nextTick(() => {
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTo({
        top: chatMessagesContainer.value.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
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