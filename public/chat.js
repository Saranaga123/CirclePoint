const socket = io();
const chatDiv = document.getElementById('chat');
const input = document.getElementById('msgInput');
const usernameInput = document.getElementById('usernameInput');
const usernameSection = document.getElementById('username-section');
const chatSection = document.getElementById('chat-section');

function setUsername() {
  const username = usernameInput.value.trim();
  if (!username) return alert("Please enter a name");

  socket.emit('setUsername', username);

  usernameSection.classList.add('hidden');
  chatSection.classList.remove('hidden');
}

socket.on('chat:message', (data) => {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');

  msgDiv.innerHTML = `
    <span class="user">${data.user}</span>
    <span class="time">[${data.time}]</span>:
    <span class="text">${data.text}</span>
  `;

  chatDiv.appendChild(msgDiv);
  chatDiv.scrollTop = chatDiv.scrollHeight;
});

function sendMsg() {
  const msg = input.value.trim();
  if (!msg) return;

  socket.emit('chat:message', msg);
  input.value = '';
}
