// admin.js
import { auth, db, storage } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const $ = id => document.getElementById(id);

function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

/* ---- AUTHENTICATION ---- */
onAuthStateChanged(auth, (user) => {
    if (user) {
        $('login-section').classList.add('hidden');$('dashboard-section').classList.remove('hidden');
        listenToMembers();
        listenToEvents();
    } else {
        $('login-section').classList.remove('hidden');$('dashboard-section').classList.add('hidden');
    }
});

$('login-btn').addEventListener('click', async () => {
    const email = $('login-email').value.trim();
    const password = $('login-password').value.trim();$('login-error').textContent = '';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Logged in successfully!");
    } catch (err) {
        $('login-error').textContent = "Invalid credentials. Please check your email/password.";
    }
});

$('logout-btn').addEventListener('click', () => signOut(auth));

/* ---- TABS SWITCHING ---- */
$('tab-members-btn').addEventListener('click', () => switchTab('members'));$('tab-events-btn').addEventListener('click', () => switchTab('events'));

function switchTab(tab) {
    if (tab === 'members') {
        $('tab-members').classList.remove('hidden');$('tab-events').classList.add('hidden');
        $('tab-members-btn').classList.add('active');$('tab-events-btn').classList.remove('active');
    } else {
        $('tab-events').classList.remove('hidden');$('tab-members').classList.add('hidden');
        $('tab-events-btn').classList.add('active');$('tab-members-btn').classList.remove('active');
    }
}

/* ---- HELPER: UPLOAD FILE TO STORAGE ---- */
async function uploadImage(file, folder) {
    const filename = `${folder}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, path: filename };
}

/* ---- MEMBERS MANAGEMENT ---- */
$('member-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = "Uploading photo & saving...";

    try {
        const file = $('member-photo').files[0];
        const { url, path } = await uploadImage(file, 'members');

        await addDoc(collection(db, 'members'), {
            name: $('member-name').value.trim(),
            role: $('member-role').value.trim(),
            linkedin: $('member-linkedin').value.trim() || '#',
            instagram: $('member-instagram').value.trim() || '#',
            photoUrl: url,
            storagePath: path,
            createdAt: new Date()
        });

        $('member-form').reset();
        showToast("Member added successfully!");
    } catch (err) {
        console.error(err);
        showToast("Error adding member.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Save Member`;
    }
});

function listenToMembers() {
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        const host = $('members-list');
        if (snapshot.empty) {
            host.innerHTML = '<p style="color:#888;">No members added yet.</p>';
            return;
        }
        host.innerHTML = snapshot.docs.map(docSnap => {
            const m = docSnap.data();
            return `
                <div class="item-row">
                    <img src="${m.photoUrl}" alt="${m.name}">
                    <div class="item-info">
                        <h4>${m.name}</h4>
                        <p>${m.role}</p>
                    </div>
                    <button class="danger" style="width:auto;" onclick="deleteMember('${docSnap.id}', '${m.storagePath}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    });
}

window.deleteMember = async (id, path) => {
    if (!confirm("Are you sure you want to delete this member?")) return;
    try {
        await deleteDoc(doc(db, 'members', id));
        if (path) await deleteObject(ref(storage, path)).catch(() => {});
        showToast("Member deleted.");
    } catch (err) {
        showToast("Error deleting member.");
    }
};

/* ---- EVENTS MANAGEMENT ---- */
$('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = "Uploading banner & saving...";

    try {
        const file = $('event-photo').files[0];
        const { url, path } = await uploadImage(file, 'events');

        await addDoc(collection(db, 'events'), {
            title: $('event-title').value.trim(),
            date: $('event-date').value,
            description: $('event-desc').value.trim(),
            link: $('event-link').value.trim() || '#',
            bannerUrl: url,
            storagePath: path,
            createdAt: new Date()
        });

        $('event-form').reset();
        showToast("Event added successfully!");
    } catch (err) {
        console.error(err);
        showToast("Error adding event.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-calendar-plus"></i> Save Event`;
    }
});

function listenToEvents() {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snapshot) => {
        const host = $('events-list');
        if (snapshot.empty) {
            host.innerHTML = '<p style="color:#888;">No events added yet.</p>';
            return;
        }
        host.innerHTML = snapshot.docs.map(docSnap => {
            const ev = docSnap.data();
            return `
                <div class="item-row">
                    <img src="${ev.bannerUrl}" alt="${ev.title}">
                    <div class="item-info">
                        <h4>${ev.title}</h4>
                        <p>Date: ${ev.date}</p>
                    </div>
                    <button class="danger" style="width:auto;" onclick="deleteEvent('${docSnap.id}', '${ev.storagePath}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');
    });
}

window.deleteEvent = async (id, path) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
        await deleteDoc(doc(db, 'events', id));
        if (path) await deleteObject(ref(storage, path)).catch(() => {});
        showToast("Event deleted.");
    } catch (err) {
        showToast("Error deleting event.");
    }
};