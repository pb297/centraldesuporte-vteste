// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD4YxKISCBoT40DbnXYbaCGUN8OrMqdPFo",
    authDomain: "central-de-suporte.firebaseapp.com",
    projectId: "central-de-suporte",
    storageBucket: "central-de-suporte.firebasestorage.app",
    messagingSenderId: "165275848027",
    appId: "1:165275848027:web:c2f9122e5e533f7e6cde7e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global variables
let currentUser = null;
let selectedTags = new Set();

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check authentication
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'admin-login2.html';
            return;
        }
        currentUser = user;
        setupEventListeners();
        loadNotes();
    });
}

function setupEventListeners() {
    // Form submission
    const noteForm = document.getElementById('noteForm');
    noteForm.addEventListener('submit', handleNoteSave);

    // Modal controls
    const newNoteBtn = document.getElementById('newNoteBtn');
    const newNoteEmptyBtn = document.getElementById('newNoteEmptyBtn');
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modal = document.getElementById('noteModal');

    newNoteBtn.addEventListener('click', () => openModal());
    newNoteEmptyBtn.addEventListener('click', () => openModal());
    closeBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());

    // Tag management
    const addTagBtn = document.getElementById('addTagBtn');
    const tagInput = document.getElementById('tagInput');

    addTagBtn.addEventListener('click', handleAddTag);
    tagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    });
}

async function handleNoteSave(e) {
    e.preventDefault();

    if (!currentUser) {
        showToast('Você precisa estar logado para salvar notas', 'error');
        return;
    }

    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');

    const noteData = {
        title: titleInput.value.trim(),
        content: contentInput.value.trim(),
        tags: Array.from(selectedTags),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser.uid
    };

    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('notes')
            .add(noteData);

        showToast('Nota salva com sucesso!');
        closeModal();
        await loadNotes();
    } catch (error) {
        console.error('Erro ao salvar nota:', error);
        showToast('Erro ao salvar a nota', 'error');
    }
}

function handleAddTag() {
    const tagInput = document.getElementById('tagInput');
    const tags = tagInput.value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && !selectedTags.has(tag));

    tags.forEach(tag => selectedTags.add(tag));
    updateTagsDisplay();
    tagInput.value = '';
}

function updateTagsDisplay() {
    const container = document.getElementById('selectedTags');
    container.innerHTML = Array.from(selectedTags)
        .map(tag => `
            <span class="tag">
                ${tag}
                <button type="button" onclick="removeTag('${tag}')" class="tag-remove">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
}

function removeTag(tag) {
    selectedTags.delete(tag);
    updateTagsDisplay();
}

function openModal() {
    const modal = document.getElementById('noteModal');
    selectedTags.clear();
    updateTagsDisplay();
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('noteModal');
    const form = document.getElementById('noteForm');
    form.reset();
    selectedTags.clear();
    updateTagsDisplay();
    modal.style.display = 'none';
}

async function loadNotes() {
    if (!currentUser) return;

    try {
        const snapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('notes')
            .orderBy('createdAt', 'desc')
            .get();

        const notesGrid = document.getElementById('notesGrid');
        const emptyState = document.getElementById('emptyState');

        if (snapshot.empty) {
            notesGrid.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        notesGrid.innerHTML = snapshot.docs.map(doc => {
            const note = doc.data();
            return `
                <div class="note-card" data-id="${doc.id}">
                    <h3>${note.title}</h3>
                    <p>${note.content}</p>
                    <div class="note-tags">
                        ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <div class="note-footer">
                        <span class="note-date">${formatDate(note.createdAt)}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar notas:', error);
        showToast('Erro ao carregar notas', 'error');
    }
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toastIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} toast-icon`;
    
    toast.style.display = 'block';
    
    // Reset animation
    const progress = toast.querySelector('.toast-progress');
    progress.style.animation = 'none';
    progress.offsetHeight; // Trigger reflow
    progress.style.animation = null;
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}