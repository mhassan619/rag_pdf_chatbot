/**
 * IntellectRAG Engine — Frontend Application Logic
 * Production-Ready Chat + Document Upload Interface
 */
// ============================================================
// Configuration
// ============================================================
const CONFIG = {
  // Purani line: API_BASE: '/api',
  API_BASE: '/api', // <--- Bas yeh local address lagao
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: ['application/pdf'],
  PARTICLE_COUNT: 25,
  TOAST_DURATION: 4000,
  TYPING_DELAY: 800,
};
// ============================================================
// State Management
// ============================================================
const AppState = {
  messages: [],
  uploadedFiles: [],
  isProcessing: false,
  isSidebarOpen: false,
  documentLoaded: false,
  chatHistory: [],
};
// ============================================================
// DOM References
// ============================================================
const DOM = {};
function cacheDOMReferences() {
  DOM.app = document.getElementById('app');
  DOM.sidebar = document.getElementById('sidebar');
  DOM.sidebarOverlay = document.getElementById('sidebar-overlay');
  DOM.menuBtn = document.getElementById('menu-btn');
  DOM.chatMessages = document.getElementById('chat-messages');
  DOM.chatWelcome = document.getElementById('chat-welcome');
  DOM.chatInput = document.getElementById('chat-input');
  DOM.sendBtn = document.getElementById('send-btn');
  DOM.uploadCard = document.getElementById('upload-card');
  DOM.uploadInput = document.getElementById('upload-input');
  DOM.uploadProgress = document.getElementById('upload-progress');
  DOM.progressBar = document.getElementById('progress-bar');
  DOM.progressText = document.getElementById('progress-text');
  DOM.fileList = document.getElementById('file-list');
  DOM.fileEmpty = document.getElementById('file-empty');
  DOM.statusDot = document.getElementById('status-dot');
  DOM.statusText = document.getElementById('status-text');
  DOM.toastContainer = document.getElementById('toast-container');
  DOM.tempSlider = document.getElementById('temp-slider');
  DOM.tempValue = document.getElementById('temp-value');
  DOM.modelSelect = document.getElementById('model-select');
  DOM.particlesContainer = document.getElementById('particles');
}
// ============================================================
// Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  cacheDOMReferences();
  initEventListeners();
  initParticles();
  init3DCardEffects();
  checkAPIHealth();
});
// ============================================================
// Event Listeners
// ============================================================
function initEventListeners() {
  // Hamburger menu toggle
  DOM.menuBtn.addEventListener('click', toggleSidebar);
  DOM.sidebarOverlay.addEventListener('click', closeSidebar);
  // File upload
  DOM.uploadCard.addEventListener('click', () => DOM.uploadInput.click());
  DOM.uploadInput.addEventListener('change', handleFileSelect);
  DOM.uploadCard.addEventListener('dragover', handleDragOver);
  DOM.uploadCard.addEventListener('dragleave', handleDragLeave);
  DOM.uploadCard.addEventListener('drop', handleDrop);
  // Chat input
  DOM.chatInput.addEventListener('keydown', handleInputKeydown);
  DOM.chatInput.addEventListener('input', autoResizeTextarea);
  DOM.sendBtn.addEventListener('click', sendMessage);
  // Temperature slider
  DOM.tempSlider.addEventListener('input', (e) => {
    DOM.tempValue.textContent = e.target.value;
  });
  // Window resize handler
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && AppState.isSidebarOpen) {
      closeSidebar();
    }
  });
  // Escape key to close sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && AppState.isSidebarOpen) {
      closeSidebar();
    }
  });
}
// ============================================================
// Sidebar Toggle (Mobile)
// ============================================================
function toggleSidebar() {
  AppState.isSidebarOpen ? closeSidebar() : openSidebar();
}
function openSidebar() {
  AppState.isSidebarOpen = true;
  DOM.sidebar.classList.add('open');
  DOM.sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  AppState.isSidebarOpen = false;
  DOM.sidebar.classList.remove('open');
  DOM.sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}
// ============================================================
// File Upload
// ============================================================
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  DOM.uploadCard.classList.add('drag-over');
}
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  DOM.uploadCard.classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  DOM.uploadCard.classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}
function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
  // Reset input so same file can be re-uploaded
  e.target.value = '';
}
async function processFile(file) {
  // Validate file type
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Only PDF files are supported.', 'error');
    return;
  }
  // Validate file size
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showToast('File size exceeds 50MB limit.', 'error');
    return;
  }
  // Show progress
  DOM.uploadProgress.classList.add('active');
  animateProgress(0);
  DOM.progressText.textContent = 'Uploading document...';
  const formData = new FormData();
  formData.append('file', file);
  try {
    animateProgress(40);
    DOM.progressText.textContent = 'Processing chunks...';
    const response = await fetch(`${CONFIG.API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    animateProgress(80);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Upload failed');
    }
    const data = await response.json();
    animateProgress(100);
    DOM.progressText.textContent = 'Processing complete!';
    // Update state
    AppState.documentLoaded = true;
    const fileEntry = {
      name: file.name,
      size: formatFileSize(file.size),
      chunks: data.chunks_created,
      status: 'ready',
    };
    AppState.uploadedFiles.push(fileEntry);
    // Update UI
    renderFileList();
    updateStatus(true);
    showToast(`${file.name} processed — ${data.chunks_created} chunks created.`, 'success');
    // Hide progress after a moment
    setTimeout(() => {
      DOM.uploadProgress.classList.remove('active');
      animateProgress(0);
    }, 1500);
  } catch (error) {
    console.error('Upload error:', error);
    DOM.uploadProgress.classList.remove('active');
    animateProgress(0);
    showToast(error.message || 'Failed to upload document.', 'error');
  }
}
function animateProgress(targetWidth) {
  DOM.progressBar.style.width = `${targetWidth}%`;
}
// ============================================================
// File List Rendering
// ============================================================
function renderFileList() {
  if (AppState.uploadedFiles.length === 0) {
    DOM.fileEmpty.style.display = 'flex';
    DOM.fileList.innerHTML = '';
    return;
  }
  DOM.fileEmpty.style.display = 'none';
  DOM.fileList.innerHTML = AppState.uploadedFiles
    .map(
      (file, i) => `
    <li class="file-item" style="animation: fadeSlideUp 0.3s ease ${i * 0.1}s both">
      <div class="file-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <div class="file-info">
        <div class="file-name">${escapeHTML(file.name)}</div>
        <div class="file-meta">${file.size} · ${file.chunks} chunks</div>
      </div>
      <span class="file-badge file-badge--ready">Ready</span>
    </li>
  `
    )
    .join('');
}
// ============================================================
// Chat Functionality
// ============================================================
function handleInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
function autoResizeTextarea() {
  DOM.chatInput.style.height = 'auto';
  DOM.chatInput.style.height = Math.min(DOM.chatInput.scrollHeight, 120) + 'px';
}
async function sendMessage() {
  const question = DOM.chatInput.value.trim();
  if (!question || AppState.isProcessing) return;
  // Hide welcome screen
  if (DOM.chatWelcome) {
    DOM.chatWelcome.style.display = 'none';
  }
  // Add user message
  addMessage('user', question);
  AppState.chatHistory.push({ role: 'user', content: question });
  // Clear input
  DOM.chatInput.value = '';
  DOM.chatInput.style.height = 'auto';
  DOM.sendBtn.disabled = true;
  AppState.isProcessing = true;
  // Show typing indicator
  showTypingIndicator();
  try {
    const formData = new FormData();
    formData.append('question', question);
    formData.append('history', JSON.stringify(AppState.chatHistory));
    const response = await fetch(`${CONFIG.API_BASE}/chat`, {
      method: 'POST',
      body: formData,
    });
    removeTypingIndicator();
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Chat request failed');
    }
    const data = await response.json();
    const answer = data.answer || 'I couldn\'t generate a response. Please try again.';
    const sources = data.sources || [];
    addMessage('assistant', answer, sources);
    AppState.chatHistory.push({ role: 'assistant', content: answer });
  } catch (error) {
    removeTypingIndicator();
    console.error('Chat error:', error);
    addMessage('assistant', `⚠️ ${error.message || 'Something went wrong. Please try again.'}`);
  } finally {
    AppState.isProcessing = false;
    DOM.sendBtn.disabled = false;
    DOM.chatInput.focus();
  }
}
// ============================================================
// Message Rendering
// ============================================================
function addMessage(role, content, sources = []) {
  const messageEl = document.createElement('div');
  messageEl.className = `message message--${role}`;
  const avatarLetter = role === 'user' ? 'U' : 'IR';
  const avatarHTML = `<div class="message__avatar">${avatarLetter}</div>`;
  let sourcesHTML = '';
  if (sources.length > 0) {
    const chips = sources
      .slice(0, 3)
      .map((s) => `<span class="source-chip" title="${escapeHTML(s)}">${escapeHTML(truncate(s, 50))}</span>`)
      .join('');
    sourcesHTML = `
      <div class="message__sources">
        <div class="message__sources-title">📎 Referenced Sources</div>
        ${chips}
      </div>
    `;
  }
  // Convert markdown-like formatting
  const formattedContent = formatMessageContent(content);
  messageEl.innerHTML = `
    ${avatarHTML}
    <div class="message__content">
      ${formattedContent}
      ${sourcesHTML}
    </div>
  `;
  DOM.chatMessages.appendChild(messageEl);
  scrollToBottom();
}
function formatMessageContent(text) {
  // Simple markdown-like formatting
  let html = escapeHTML(text);
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code: `text`
  html = html.replace(
    /`(.*?)`/g,
    '<code style="background:rgba(0,98,255,0.1);padding:2px 6px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:0.82em;">$1</code>'
  );
  // Newlines to <br>
  html = html.replace(/\n/g, '<br>');
  return html;
}
function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = `
    <div class="message__avatar" style="background:var(--gradient-accent);color:white;width:36px;height:36px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;flex-shrink:0;">IR</div>
    <div class="typing-indicator__dots">
      <span class="typing-indicator__dot"></span>
      <span class="typing-indicator__dot"></span>
      <span class="typing-indicator__dot"></span>
    </div>
  `;
  DOM.chatMessages.appendChild(indicator);
  scrollToBottom();
}
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}
function scrollToBottom() {
  requestAnimationFrame(() => {
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  });
}
// ============================================================
// Status & Health Check
// ============================================================
async function checkAPIHealth() {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/health`);
    if (response.ok) {
      updateStatus(true);
    } else {
      updateStatus(false);
    }
  } catch {
    updateStatus(false);
  }
}
function updateStatus(isOnline) {
  if (isOnline) {
    DOM.statusDot.classList.remove('status-dot--inactive');
    DOM.statusText.textContent = AppState.documentLoaded ? 'RAG Active' : 'Online';
  } else {
    DOM.statusDot.classList.add('status-dot--inactive');
    DOM.statusText.textContent = 'Offline';
  }
}
// ============================================================
// Toast Notifications
// ============================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = {
    success: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };
  toast.innerHTML = `${icons[type] || icons.info}<span>${escapeHTML(message)}</span>`;
  DOM.toastContainer.appendChild(toast);
  // Auto-remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, CONFIG.TOAST_DURATION);
}
// ============================================================
// 3D Card Effects (Mouse Tracking)
// ============================================================
function init3DCardEffects() {
  const cards = document.querySelectorAll('.feature-card, .upload-card');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}
// ============================================================
// Floating Particles
// ============================================================
function initParticles() {
  if (!DOM.particlesContainer) return;
  // Reduce particles on mobile for performance
  const count = window.innerWidth < 768 ? 10 : CONFIG.PARTICLE_COUNT;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${12 + Math.random() * 18}s`;
    particle.style.animationDelay = `${Math.random() * 15}s`;
    particle.style.width = `${2 + Math.random() * 3}px`;
    particle.style.height = particle.style.width;
    particle.style.opacity = `${0.1 + Math.random() * 0.3}`;
    DOM.particlesContainer.appendChild(particle);
  }
}
// ============================================================
// Utility Functions
// ============================================================
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '...' : str;
}
