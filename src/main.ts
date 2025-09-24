import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

let KeyPressed: string;

document.addEventListener('keydown', (event) => {
    if (event.code === "ControlLeft") {
      KeyPressed = event.code;
    }
});

document.addEventListener('keyup', (event) => {
  if (event.code === "ControlLeft") {
    KeyPressed = '';
  }
});

document.addEventListener('wheel', (event) => {
  if (KeyPressed === "ControlLeft") {
      const target = event.target as HTMLElement;
      event.preventDefault();
  }
}, { passive: false });



app.mount('#app')



