// avoid auto-connecting before user is authenticated
// determine API URL (static fallback for localhost)
const API_URL = (typeof window !== 'undefined' && (window._env_?.API_URL || window.CONFIG?.API_URL)) || "http://localhost:3000";
const socket = io(API_URL, { 
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  withCredentials: true
});

// State
let currentRoomCode = '';
let currentUsername = '';
let currentUserId = socket.id || '';
let isInRoom = false;
let messages = [];
let pinnedMsg = null;
let replyToMessage = null;
let isRecording = false;
let typingTimeout;

// Emojis & Stickers
const emojis = ['😀','😂','😍','🤔','😱','🎉','✨','🔥','👍','👎','❤️','💔','😭','😴','🤗','🎈','🎁','⭐','🌟','💫','🙏','🤝','👏','🎊','🎀','🍕','🍔','🍟','🎂','☕'];
const stickers = ['👍','❤️','😂','😱','🎉','🥳'];

// Settings
const settings = {
  darkMode: localStorage.getItem('darkMode') === 'true',
  notifications: true,
  sound: true,
  timestamp: true,
  language: localStorage.getItem('language') || 'en'
};

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const chatContainer = document.getElementById('chatContainer');
const infoPanel = document.getElementById('infoPanel');
const usernameInput = document.getElementById('usernameInput');
const roomNameInput = document.getElementById('roomNameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const isGroupToggle = document.getElementById('isGroupToggle');
const messageInput = document.getElementById('messageInput');
const messagesArea = document.getElementById('messagesArea');
const roomName = document.getElementById('roomName');
const roomStatus = document.getElementById('roomStatus');
const roomAvatar = document.getElementById('roomAvatar');
const membersList = document.getElementById('membersList');
const memberCount = document.getElementById('memberCount');

// Event Listeners for Welcome Buttons
// the create/join buttons are shown only after authentication
document.getElementById('createRoomBtn').addEventListener('click', showCreateForm);
document.getElementById('joinRoomBtn').addEventListener('click', showJoinForm);
document.getElementById('confirmCreateBtn').addEventListener('click', createRoom);
document.getElementById('confirmJoinBtn').addEventListener('click', joinRoom);
document.getElementById('cancelCreateBtn').addEventListener('click', hideForm);
document.getElementById('cancelJoinBtn').addEventListener('click', hideForm);

// authentication buttons
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
registerBtn.addEventListener('click', handleRegister);
loginBtn.addEventListener('click', handleLogin);

// logout
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn?.addEventListener('click', () => {
  fetch('/logout', { method: 'POST' }).finally(() => {
    location.reload();
  });
});

// attachment button listener
const attachBtn = document.getElementById('attachBtn');
attachBtn?.addEventListener('click', () => {
  document.getElementById('attachInput').click();
});
document.getElementById('attachInput').addEventListener('change', handleAttachment);

// call variables
let peerConnection = null;
let localStream = null;
let callTarget = null;


// Chat Button Listeners  
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('infoBtn').addEventListener('click', toggleInfoPanel);
document.getElementById('closeInfoBtn').addEventListener('click', toggleInfoPanel);
document.getElementById('searchMsgBtn').addEventListener('click', toggleSearchBar);
document.getElementById('closeSearchBtn').addEventListener('click', toggleSearchBar);
document.getElementById('emojiBtn').addEventListener('click', showEmojiPicker);
document.getElementById('imageBtn').addEventListener('click', handleImageUpload);
document.getElementById('stickerBtn').addEventListener('click', showStickerPicker);
document.getElementById('voiceBtn').addEventListener('click', handleVoiceMessage);
document.getElementById('callBtn').addEventListener('click', simulateCall);

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.querySelector('.chat-sidebar').classList.toggle('collapsed');
});

// drag-drop attachments
messagesArea.addEventListener('dragover', (e) => {
  e.preventDefault();
});
messagesArea.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      attachedFile = { name: file.name, type: file.type, data: evt.target.result };
      sendMessage();
    };
    reader.readAsDataURL(file);
  }
});

// Message Input
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// auto-save draft
messageInput.addEventListener('input', () => {
  if (currentRoomCode) {
    localStorage.setItem('draft_' + currentRoomCode, messageInput.value);
  }
});

messageInput.addEventListener('input', () => {
  if (!isInRoom) return;
  clearTimeout(typingTimeout);
  socket.emit('typing', { code: currentRoomCode });
  typingTimeout = setTimeout(() => {
    socket.emit('typing_stop', { code: currentRoomCode });
  }, 2000);
});

// Initialize
function init() {
  if (settings.darkMode) enableDarkMode();
  initializeEmojiGrid();
  initializeStickerGrid();
  socket.emit('get_python_environment_details');
  checkSession();
  requestNotificationPermission();
  registerServiceWorker();
}

// service worker registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(e => console.log('SW kayıt hatası', e));
  }
}

// Desktop notifications
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then();
  }
}

// --- end-to-end encryption helpers ---
async function getRoomKey(code) {
  let raw = localStorage.getItem('key_' + code);
  if (raw) {
    const buf = Uint8Array.from(atob(raw), c=>c.charCodeAt(0));
    return await crypto.subtle.importKey('raw', buf, {'name':'AES-GCM'}, true, ['encrypt','decrypt']);
  }
  // generate new
  const key = await crypto.subtle.generateKey({name:'AES-GCM', length: 256}, true, ['encrypt','decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  localStorage.setItem('key_' + code, b64);
  return key;
}

async function encryptText(text) {
  if (!currentRoomCode) return text;
  const key = await getRoomKey(currentRoomCode);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(text);
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc);
  const blob = new Uint8Array(cipher);
  return ivToString(iv) + ':' + btoa(String.fromCharCode(...blob));
}

async function decryptText(ciphertext) {
  if (!currentRoomCode) return ciphertext;
  try {
    const [ivstr, data] = ciphertext.split(':');
    const iv = stringToIv(ivstr);
    const buf = Uint8Array.from(atob(data), c=>c.charCodeAt(0));
    const key = await getRoomKey(currentRoomCode);
    const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, buf);
    return new TextDecoder().decode(plain);
  } catch (e) {
    return ciphertext; // not encrypted or failed
  }
}

function ivToString(iv) {
  return Array.from(iv).map(b=>('0'+b.toString(16)).slice(-2)).join('');
}

function stringToIv(str) {
  const arr = new Uint8Array(str.match(/.{2}/g).map(h=>parseInt(h,16)));
  return arr;
}

function showDesktopNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

// WebRTC call helpers
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function initiateCall(targetId) {
  if (peerConnection) return;
  callTarget = targetId;
  peerConnection = new RTCPeerConnection(configuration);
  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) socket.emit('ice-candidate', { candidate, target: callTarget });
  };
  peerConnection.ontrack = (evt) => {
    document.getElementById('remoteVideo').srcObject = evt.streams[0];
  };
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    document.getElementById('localVideo').srcObject = localStream;
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('video-offer', { offer, target: callTarget });
    new bootstrap.Modal(document.getElementById('videoCallModal')).show();
  } catch (e) {
    console.error('Call error', e);
  }
}

function endCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    callTarget = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  document.getElementById('remoteVideo').srcObject = null;
  document.getElementById('localVideo').srcObject = null;
  bootstrap.Modal.getInstance(document.getElementById('videoCallModal')).hide();
  showNotification('Görüşme sona erdi', 'info');
}

socket.on('video-offer', async ({ offer, from }) => {
  if (peerConnection) return;
  callTarget = from;
  showNotification('Gelen arama', 'Birisi seni arıyor');
  showDesktopNotification('Gelen arama', 'Sohbette birisi seni arıyor');
  peerConnection = new RTCPeerConnection(configuration);
  peerConnection.onicecandidate = ({ candidate }) => {
    if (candidate) socket.emit('ice-candidate', { candidate, target: callTarget });
  };
  peerConnection.ontrack = (evt) => {
    document.getElementById('remoteVideo').srcObject = evt.streams[0];
  };
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    document.getElementById('localVideo').srcObject = localStream;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('video-answer', { answer, target: callTarget });
    new bootstrap.Modal(document.getElementById('videoCallModal')).show();
  } catch (e) {
    console.error('Offer handling error', e);
  }
});

socket.on('video-answer', async ({ answer, from }) => {
  if (peerConnection && from === callTarget) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on('ice-candidate', async ({ candidate, from }) => {
  if (peerConnection && from === callTarget) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('ICE candidate error', e);
    }
  }
});

// hook end call button
const endCallBtn = document.getElementById('endCallBtn');
endCallBtn?.addEventListener('click', endCall);

// Authentication helpers
function handleRegister() {
  const username = usernameInput.value.trim();
  const password = document.getElementById('passwordInput').value;
  if (!username || !password) {
    showNotification('Kullanıcı adı ve parola gerekli', 'error');
    return;
  }
  fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => {
    if (!res.ok) throw new Error('Kayıt başarısız');
    return res.json();
  }).then(data => {
    if (data.success) {
      afterAuth(username);
      showNotification('Kayıt başarıyla tamamlandı!', 'success');
    }
  }).catch(err => {
    showNotification(err.message || 'Kayıt hatası', 'error');
  });
}

function handleLogin() {
  const username = usernameInput.value.trim();
  const password = document.getElementById('passwordInput').value;
  if (!username || !password) {
    showNotification('Kullanıcı adı ve parola gerekli', 'error');
    return;
  }
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => {
    if (!res.ok) throw new Error('Giriş başarısız');
    return res.json();
  }).then(data => {
    if (data.success) {
      afterAuth(username);
      showNotification('Giriş başarılı!', 'success');
    }
  }).catch(err => {
    showNotification(err.message || 'Giriş hatası', 'error');
  });
}

function checkSession() {
  fetch('/session').then(res => res.json()).then(data => {
    if (data.username) {
      afterAuth(data.username);
    }
  }).catch(() => {
    // still allow socket to stay disconnected
  });
}

function afterAuth(username) {
  currentUsername = username;
  usernameInput.value = username;
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('roomSection').style.display = 'block';
  // connect socket now that we have a session
  if (!socket.connected) socket.connect();
}

// Welcome Screen Functions
function showCreateForm() {
  if (!currentUsername) {
    showNotification('Önce giriş yapmalısın.', 'error');
    return;
  }
  document.getElementById('createForm').style.display = 'block';
  document.getElementById('joinForm').style.display = 'none';
}

// handle draft restoration
function restoreDraft() {
  if (currentRoomCode) {
    const d = localStorage.getItem('draft_' + currentRoomCode);
    if (d) messageInput.value = d;
  }
}

function showJoinForm() {
  if (!currentUsername) {
    showNotification('Önce giriş yapmalısın.', 'error');
    return;
  }
  document.getElementById('joinForm').style.display = 'block';
  document.getElementById('createForm').style.display = 'none';
}

function hideForm() {
  document.getElementById('createForm').style.display = 'none';
  document.getElementById('joinForm').style.display = 'none';
}

// Room Functions
function createRoom() {
  if (!currentUsername) {
    showNotification('Önce giriş yapmalısın.', 'error');
    return;
  }
  const roomName = roomNameInput.value.trim();
  const isGroup = isGroupToggle.checked;
  const createBtn = document.getElementById('confirmCreateBtn');
  const payload = {
    roomName: roomName || `${currentUsername}'ın sohbeti`,
    isGroup
  };
  console.log('🔧 createRoom payload', payload);
  
  // Disable button
  createBtn.disabled = true;
  
  // Ensure socket is connected
  if (!socket.connected) {
    console.log('Socket not connected, connecting...');
    socket.connect();
    socket.once('connect', () => {
      socket.emit('create_room', payload);
    });
  } else {
    socket.emit('create_room', payload);
  }
  
  // close create form while waiting
  document.getElementById('createForm').style.display = 'none';
  
  // Re-enable button after 3 seconds
  setTimeout(() => {
    createBtn.disabled = false;
  }, 3000);
}

function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();
  const joinBtn = document.getElementById('confirmJoinBtn');
  
  if (!currentUsername || !code) {
    showNotification('Kullanıcı ve kod gerekli!', 'error');
    return;
  }
  
  if (code.length !== 6) {
    showNotification('Kod 6 karakter olmalı!', 'error');
    return;
  }
  
  // disable to prevent multiple clicks
  joinBtn.disabled = true;
  const emitJoin = () => {
    console.log('emitting join_room', code);
    socket.emit('join_room', { code });
  };

  if (!socket.connected) {
    console.log('Socket not connected, connecting...');
    showNotification('Sunucuya bağlı değilsin, bağlanılıyor...', 'info');
    socket.connect();
    socket.once('connect', emitJoin);
  } else {
    emitJoin();
  }
  
  // Re-enable button after 3 seconds if no response
  setTimeout(() => {
    joinBtn.disabled = false;
  }, 3000);
}

// Chat Functions
async function sendMessage() {
  let message = messageInput.value.trim();
  if (!message && !attachedFile) return;
  message = await encryptText(message);
  
  const payload = {
    message,
    code: currentRoomCode,
    image: null,
    file: attachedFile || null,
    replyTo: replyToMessage
  };
  socket.emit('send_message', payload);
  
  messageInput.value = '';
  attachedFile = null;
  document.getElementById('replyContainer').style.display = 'none';
  messageInput.focus();
}

let attachedFile = null;

function handleAttachment(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    attachedFile = {
      name: file.name,
      type: file.type,
      data: evt.target.result
    };
    showNotification(`Dosya eklendi: ${file.name}`, 'info');
  };
  reader.readAsDataURL(file);
  document.getElementById('attachInput').value = '';
}

function formatMessageText(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);
  // bold **text**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // italic *text*
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // code `text`
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  // linkify
  escaped = escaped.replace(/(https?:\/\/[\w\-\.\/~?&=+#%]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  return escaped;
}

function displayMessage(msg) {
  const isOwn = msg.userId === currentUserId;
  const div = document.createElement('div');
  let cls = isOwn ? 'message own' : 'message other';
  if (!isOwn && currentUsername && msg.message && msg.message.includes('@' + currentUsername)) {
    cls += ' mention';
  }
  div.className = cls;
  div.setAttribute('data-msg-id', msg.id);
  
  let timeStr = settings.timestamp ? formatTime(msg.timestamp) : '';
  let imgPart = '';
  if (msg.image) {
    if (msg.viewOnce && msg.userId !== currentUserId) {
      imgPart = `<img src="${msg.image}" class="message-image blurred" onclick="viewOnce('${msg.id}')">`;
    } else {
      imgPart = `<img src="${msg.image}" class="message-image" onclick="expandImage('${msg.image}')">`;
    }
  }
  let locPart = '';
  if (msg.location) {
    locPart = `<div class="message-location"><a href="https://www.google.com/maps?q=${msg.location.lat},${msg.location.lon}" target="_blank">📍 Konum</a></div>`;
  }
  let fwdNote = '';
  if (msg.forwarded) {
    fwdNote = `<small class="forward-note">🔁 iletildi</small>`;
  }
  let html = `
    <div class="message-bubble">
      ${!isOwn ? `<small style="font-weight:600;">${escapeHtml(msg.username)}</small>` : ''}
      ${fwdNote}
      ${imgPart}
      ${msg.file ? `<div class="message-file"><a href="${msg.file.data}" download="${msg.file.name}">${msg.file.name}</a></div>` : ''}
      ${locPart}
      <div class="message-text">${formatMessageText(msg.message)}</div>
      ${timeStr ? `<div class="message-time">${timeStr}</div>` : ''}
      <div class="reaction-bar" id="reactions-${msg.id}"></div>
    </div>
  `;

  div.innerHTML = html;
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, msg.id, isOwn);
  });
  
  messagesArea.appendChild(div);
  updateMessageReactions(msg);
  scrollToBottom();
}

function updateMessageReactions(msg) {
  const container = document.getElementById(`reactions-${msg.id}`);
  if (!container) return;
  container.innerHTML = '';
  const counts = {};
  Object.values(msg.reactions || {}).forEach(e => counts[e] = (counts[e]||0)+1);
  Object.entries(counts).forEach(([emoji,count]) => {
    const span = document.createElement('span');
    span.className = 'reaction-item';
    span.textContent = `${emoji} ${count}`;
    container.appendChild(span);
  });
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Emoji Functions
function initializeEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  emojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-item';
    btn.textContent = emoji;
    btn.onclick = () => selectEmoji(emoji);
    grid.appendChild(btn);
  });
}

let reactionTarget = null;
function selectEmoji(emoji) {
  if (reactionTarget) {
    socket.emit('emoji_reaction', { messageId: reactionTarget, emoji, code: currentRoomCode });
    reactionTarget = null;
  } else {
    messageInput.value += emoji;
  }
  messageInput.focus();
  bootstrap.Modal.getInstance(document.getElementById('emojiModal')).hide();
}

function showEmojiPicker() {
  new bootstrap.Modal(document.getElementById('emojiModal')).show();
}

// Sticker Functions
function initializeStickerGrid() {
  const grid = document.getElementById('stickerGrid');
  stickers.forEach(sticker => {
    const btn = document.createElement('button');
    btn.className = 'sticker-item';
    btn.textContent = sticker;
    btn.onclick = () => selectSticker(sticker);
    grid.appendChild(btn);
  });
}

function selectSticker(sticker) {
  socket.emit('send_message', {
    message: sticker,
    code: currentRoomCode,
    image:null,
    replyTo: replyToMessage
  });
  messageInput.focus();
  bootstrap.Modal.getInstance(document.getElementById('stickerModal')).hide();
}

function showStickerPicker() {
  new bootstrap.Modal(document.getElementById('stickerModal')).show();
}

// Voice Message (Simulation)
function handleVoiceMessage() {
  if (isRecording) {
    isRecording = false;
    showNotification('Ses kaydedildi! 🎤', 'success');
  } else {
    isRecording = true;
    showNotification('Ses kaydediliyor... 🔴', 'info');
    setTimeout(() => {
      if (isRecording) {
        isRecording = false;
        socket.emit('send_message', {
          message: '[🎤 Ses Mesajı]',
          code: currentRoomCode,
          image: null,
          replyTo: replyToMessage
        });
      }
    },3000);
  }
}

// Location & Image Upload
function sendLocation() {
  if (!navigator.geolocation) {
    showNotification('Konum paylaşımı desteklenmiyor', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    socket.emit('send_message', {
      message: '📍 Konum',
      code: currentRoomCode,
      image: null,
      file: null,
      location: { lat: latitude, lon: longitude }
    });
  }, () => {
    showNotification('Konum alınamadı', 'error');
  });
}

function handleImageUpload() {
  document.getElementById('imageInput').click();
}

document.getElementById('locationBtn').addEventListener('click', sendLocation);

document.getElementById('imageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const viewOnce = confirm('Tek seferlik görünsün mü?');
    const reader = new FileReader();
    reader.onload = (evt) => {
      socket.emit('send_message', {
        message: messageInput.value || '[📷 Resim]',
        image: evt.target.result,
        viewOnce,
        code: currentRoomCode,
        replyTo: replyToMessage
      });
      messageInput.value = '';
      document.getElementById('imageInput').value = '';
      replyToMessage = null;
      document.getElementById('replyContainer').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
});

function expandImage(src) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:10001;cursor:pointer;';
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:8px;';
  modal.appendChild(img);
  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
}

function viewOnce(msgId) {
  const msg = messages.find(m=>m.id===msgId);
  if (!msg) return;
  expandImage(msg.image);
  // mark as viewed, remove image portion
  if (!msg.userId || msg.userId===currentUserId) return;
  msg.image = null;
  updateViewOnce(msgId);
}

function updateViewOnce(msgId) {
  const el = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (el) {
    const img = el.querySelector('.message-image');
    if (img) img.remove();
  }
}

// Info Panel
function toggleInfoPanel() {
  infoPanel.classList.toggle('active');
}

// Search Bar
function toggleSearchBar() {
  const searchContainer = document.getElementById('searchBarContainer');
  searchContainer.style.display = searchContainer.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('messageSearch')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  document.querySelectorAll('[data-msg-id]').forEach(el => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(query) ? '' : 'none';
  });
});

// Context Menu
function showContextMenu(e, msgId, isOwn) {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.cssText = `top:${e.pageY}px;left:${e.pageX}px;`;
  let html = '';
  if (isOwn) {
    html += `
      <button onclick="editMessage('${msgId}')">✏️ Düzenle</button>
      <button onclick="deleteMessage('${msgId}')">🗑️ Sil</button>
      <button onclick="pinMessage('${msgId}')">📌 Sabitle</button>
    `;
  }
  html += `<button onclick="replyToMsg('${msgId}')">↩️ Cevap</button>`;
  html += `<button onclick="reactToMsg('${msgId}')">😊 Tepki</button>`;
  html += `<button onclick="translateMsg('${msgId}')">🌍 Çevir</button>`;
  html += `<button onclick="speakMsg('${msgId}')">🔊 Oku</button>`;
  html += `<button onclick="forwardMessage('${msgId}')">🔁 İlet</button>`;
  menu.innerHTML = html;
  document.body.appendChild(menu);
  setTimeout(() => menu.remove(), 3000);
}

function forwardMessage(msgId) {
  const target = prompt('Sohbet kodunu girerek iletin:');
  if (!target) return;
  socket.emit('forward_message', { messageId: msgId, targetCode: target.trim().toUpperCase() });
}
async function translateMsg(msgId) {

  const msg = messages.find(m => m.id === msgId);
  if (!msg || !msg.message) return;

  try {

    const res = await fetch('/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: msg.message,
        target: settings.language
      })
    });

    const data = await res.json();

    showNotification(`Çeviri: ${data.translatedText}`, 'info');

  } catch (err) {

    showNotification('Çeviri hatası', 'error');

  }

}
function speakMsg(msgId) {
  const msg = messages.find(m=>m.id===msgId);
  if (!msg || !msg.message) return;
  const utter = new SpeechSynthesisUtterance(msg.message);
  utter.lang = settings.language || 'en-US';
  speechSynthesis.speak(utter);
}

function reactToMsg(msgId) {
  reactionTarget = msgId;
  showEmojiPicker();
}

function editMessage(msgId) {
  const msg = messages.find(m => m.id === msgId);
  if (!msg) return;
  
  const newText = prompt('Mesajları düzenle:', msg.message);
  if (newText && newText.trim()) {
    socket.emit('edit_message', {
      messageId: msgId,
      message: newText.trim(),
      code: currentRoomCode
    });
  }
}

function deleteMessage(msgId) {
  if (confirm('Mesajı sil?')) {
    socket.emit('delete_message', {
      messageId: msgId,
      code: currentRoomCode
    });
  }
}

function pinMessage(msgId) {
  socket.emit('pin_message', {
    messageId: msgId,
    code: currentRoomCode
  });
}

function replyToMsg(msgId) {
  const msg = messages.find(m => m.id === msgId);
  if (!msg) return;
  
  replyToMessage = msgId;
  const container = document.getElementById('replyContainer');
  document.getElementById('replyUser').textContent = msg.username;
  document.getElementById('replyText').textContent = msg.message;
  container.style.display = 'block';
}

document.getElementById('cancelReplyBtn')?.addEventListener('click', () => {
  replyToMessage = null;
  document.getElementById('replyContainer').style.display = 'none';
});

// Call Simulation
function simulateCall() {
  const modal = new bootstrap.Modal(document.getElementById('callModal'));
  modal.show();
  setTimeout(() => modal.hide(), 5000);
}

// Settings
function enableDarkMode() {
  document.body.classList.add('dark-mode');
  settings.darkMode = true;
  localStorage.setItem('darkMode', 'true');
}

// translation & tts settings
const langSelect = document.getElementById('langSelect');
if (langSelect) {
  settings.language = localStorage.getItem('language') || langSelect.value;
  langSelect.value = settings.language;
  langSelect.addEventListener('change', (e) => {
    settings.language = e.target.value;
    localStorage.setItem('language', settings.language);
  });
}

function disableDarkMode() {
  document.body.classList.remove('dark-mode');
  settings.darkMode = false;
  localStorage.setItem('darkMode', 'false');
}

document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
  e.target.checked ? enableDarkMode() : disableDarkMode();
});

// Notifications
function showNotification(message, type = 'info') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
  alert.style.cssText = 'position:fixed;top:20px;right:20px;max-width:400px;z-index:9999;';
  alert.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 4000);
}

// Socket Events
// global error messages from server
socket.on('error_message', (msg) => {
  showNotification(msg, 'error');
});
// connection errors
socket.on('connect_error', (err) => {
  console.error('socket connect_error', err);
  showNotification('Sunucu bağlantı hatası, sayfayı yenile.', 'error');
});

socket.on('connect', () => {
  currentUserId = socket.id;
  console.log('✓ Bağlı');
});

socket.on('room_created', (data) => {
  console.log('received room_created', data);
  currentRoomCode = data.code;
  isInRoom = true;
  welcomeScreen.style.display = 'none';
  chatContainer.style.display = 'block';
  
  roomName.textContent = data.roomName || 'Yeni Sohbet';
  roomAvatar.textContent = (data.roomName || currentUsername).charAt(0).toUpperCase();
  
  messagesArea.innerHTML = '<div class="empty-state"><p style="text-align:center;">✨ Sohbet başladı!<br><small>Davet kodu: ' + data.code + '</small></p></div>';
  showNotification(`Oda oluşturuldu! Kod: ${data.code}`, 'success');
});

socket.on('joined_room', (data) => {
  console.log('received joined_room', data);
  currentRoomCode = data.code;
  isInRoom = true;
  welcomeScreen.style.display = 'none';
  chatContainer.style.display = 'block';
  
  socket.emit('get_room_info', { code: data.code });
  showNotification(`Sohbete katıldın!`, 'success');
  restoreDraft();
});

socket.on('room_history', (history) => {
  messages = history || [];
  messagesArea.innerHTML = '';
  messages.forEach(m => displayMessage(m));
});

// listen for generic error messages from server
socket.on('error_message', (msg) => {
  showNotification(msg, 'error');
});

socket.on('room_created', (data) => {
  console.log('received room_created', data);
  currentRoomCode = data.code;
  isInRoom = true;
  welcomeScreen.style.display = 'none';
  chatContainer.style.display = 'block';
  
  roomName.textContent = data.roomName || 'Yeni Sohbet';
  roomAvatar.textContent = (data.roomName || currentUsername).charAt(0).toUpperCase();
  
  messagesArea.innerHTML = '<div class="empty-state"><p style="text-align:center;">✨ Sohbet başladı!<br><small>Davet kodu: ' + data.code + '</small></p></div>';
  showNotification(`Oda oluşturuldu! Kod: ${data.code}`, 'success');
});

socket.on('joined_room', (data) => {
  console.log('received joined_room', data);
  currentRoomCode = data.code;
  isInRoom = true;
  welcomeScreen.style.display = 'none';
  chatContainer.style.display = 'block';
  
  socket.emit('get_room_info', { code: data.code });
  showNotification(`Sohbete katıldın!`, 'success');
  restoreDraft();
});

socket.on('room_history', (history) => {
  messages = history || [];
  messagesArea.innerHTML = '';
  messages.forEach(m => displayMessage(m));
});

socket.on('room_info', (room) => {
  roomName.textContent = room.name || 'Sohbet';
  roomAvatar.textContent = room.name?.charAt(0).toUpperCase() || 'S';
  memberCount.textContent = room.users.length;
  
  membersList.innerHTML = '';
  room.users.forEach(user => {
    const div = document.createElement('div');
    div.className = 'member-item';
    div.innerHTML = `
      <div class="member-avatar">${user.username.charAt(0).toUpperCase()}</div>
      <div class="member-info">
        <strong>${user.username}</strong>
        <small>${user.role === 'admin' ? '👑 Admin' : 'Üye'}</small>
      </div>
      <button class="btn btn-sm btn-outline-primary call-user" data-id="${user.id}" title="Ara"><i class="bi bi-telephone"></i></button>
    `;
    membersList.appendChild(div);
  });
  // attach handlers
  document.querySelectorAll('.call-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-id');
      initiateCall(target);
    });
  });
});

socket.on('receive_message', async (msg) => {
  // decrypt message if necessary
  msg.message = await decryptText(msg.message);
  messages.push(msg);
  displayMessage(msg);
  
  if (msg.userId !== currentUserId) {
    if (settings.sound) playNotificationSound();
    if (msg.message && currentUsername && msg.message.includes('@' + currentUsername)) {
      showNotification('Sana mesaj atıldı', 'info');
      showDesktopNotification('Mention', `${msg.username} seni etiketledi`);
    }
    if (document.hidden) {
      showDesktopNotification('Yeni mesaj', `${msg.username}: ${msg.message || msg.file?.name || ''}`);
    }
  }
});

socket.on('online_users', (users) => {
  memberCount.textContent = users.length;
  roomStatus.textContent = `${users.length} çevrimiçi`;
});

socket.on('user_typing', (data) => {
  const container = document.getElementById('typingContainer');
  if (data.username && data.username.length) {
    document.getElementById('typingUser').textContent = data.username;
    container.style.display = 'block';
    clearTimeout(window.typingHide);
    window.typingHide = setTimeout(() => {
      container.style.display = 'none';
    }, 3000);
  }
});

socket.on('message_deleted', (msgId) => {
  const el = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (el) el.remove();
});

socket.on('message_edited', (msg) => {
  const el = document.querySelector(`[data-msg-id="${msg.id}"]`);
  if (el) {
    el.querySelector('.message-text').textContent = escapeHtml(msg.message);
  }
});

socket.on('message_pinned', (msg) => {
  pinnedMsg = msg;
  const container = document.getElementById('pinnedContainer');
  document.getElementById('pinnedText').textContent = `${msg.username}: ${msg.message}`;
  container.style.display = 'block';
});

socket.on('emoji_reaction', (data) => {
  // update local message
  const msg = messages.find(m => m.id === data.messageId);
  if (msg) {
    msg.reactions = data.reactions;
    updateMessageReactions(msg);
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', init);
enableDarkMode();

// Notification Sound
function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = 800;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.log('Ses oynatılamıyor', e);
  }
}