/* =====================================================================
   ROBOTRONIX ADMIN (Git-Backed)
   Data: Commits directly to GitHub via the REST API.
   ===================================================================== */

// 🛑 CHANGE THIS TO YOUR ACTUAL GITHUB USERNAME AND REPO NAME
const REPO = 'robotronix-hash/robotronix_website'; 

let GITHUB_TOKEN = localStorage.getItem('gh_admin_token') || null;
let currentDataSha = '';
let draft = [];

const $ = id => document.getElementById(id);

function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function createInitialAvatar(name) {
    const cleanName = String(name || "Member").replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+/i, "").trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : cleanName.slice(0, 2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760"><rect width="600" height="760" fill="#f4f5f7"/><circle cx="300" cy="330" r="118" fill="#7fd1c1" stroke="#101010" stroke-width="8"/><text x="300" y="372" text-anchor="middle" font-family="Arial, sans-serif" font-size="112" font-weight="700" fill="#101010">${escapeHtml(initials.toUpperCase())}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const photoFor = person => (person.img && person.img.trim() ? person.img : createInitialAvatar(person.name));

let toastTimer;
function showToast(message) { 
    const toast = $("admin-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function show(element, visible) {
    if (!element) return;
    element.classList.toggle("open", visible);
    element.setAttribute("aria-hidden", String(!visible));
}

function resizeImage(file, maxSize = 500, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read that file"));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error("That file isn't a readable image"));
            image.onload = () => {
                let { width, height } = image;
                const scale = Math.min(1, maxSize / Math.max(width, height));
                width = Math.round(width * scale);
                height = Math.round(height * scale);
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(image, 0, 0, width, height);
                let dataUrl = canvas.toDataURL("image/jpeg", quality);
                if (dataUrl.length > 600000) dataUrl = canvas.toDataURL("image/jpeg", 0.5);
                const base64 = dataUrl.split(',')[1];
                resolve({ dataUrl, base64 });
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function blankPerson(name = "New Member") {
    return { name, img: "", isNewPhoto: false, instagram: "#", instagramHandle: "@username", linkedin: "#", linkedinHandle: name };
}

/* ---- GitHub API Handlers ---- */
async function ghFetch(path, options = {}) {
    const url = `https://api.github.com/repos/${REPO}/${path}`;
    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
    const res = await fetch(url, { ...options, headers });
    if(!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `GitHub Error: ${res.status}`);
    }
    return res.json();
}

async function checkAuth() {
    const bootEl = $("admin-boot");
    if(!GITHUB_TOKEN) {
        bootEl.style.display = "none";
        show($("admin-login"), true);
        return;
    }
    try {
        await ghFetch(''); 
        bootEl.style.display = "none";
        show($("admin-login"), false);
        show($("admin-panel"), true);
        await loadFromGitHub();
    } catch(e) {
        GITHUB_TOKEN = null;
        localStorage.removeItem('gh_admin_token');
        bootEl.style.display = "none";
        show($("admin-login"), true);
    }
}
checkAuth();

$("admin-login-btn")?.addEventListener("click", async () => {
    const token = $("admin-token").value.trim();
    if(!token) return $("admin-error").textContent = "Please enter your token.";
    
    const btn = $("admin-login-btn");
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    
    GITHUB_TOKEN = token;
    try {
        await ghFetch('');
        localStorage.setItem('gh_admin_token', token);
        $("admin-error").textContent = "";
        show($("admin-login"), false);
        show($("admin-panel"), true);
        await loadFromGitHub();
    } catch(e) {
        GITHUB_TOKEN = null;
        $("admin-error").textContent = `Login failed: ${e.message}. Check token permissions and repo name.`;
    } finally {
        btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> LOG IN`;
    }
});

$("admin-logout")?.addEventListener("click", () => {
    GITHUB_TOKEN = null;
    localStorage.removeItem('gh_admin_token');
    show($("admin-panel"), false);
    show($("admin-login"), true);
    $("admin-token").value = "";
    showToast("Logged out.");
});

async function loadFromGitHub() {
    try {
        const res = await ghFetch('contents/data.json?ref=main');
        currentDataSha = res.sha;
        const jsonStr = decodeURIComponent(escape(window.atob(res.content)));
        const data = JSON.parse(jsonStr);
        
        draft = data.map(row => ({
            ...row,
            isNewPhoto: false,
            members: (row.members || []).map(m => ({...m, isNewPhoto: false}))
        }));
        renderAdmin();
    } catch (error) {
        console.error(error);
        showToast("Could not load data. Check your token permissions.");
    }
}

/* ---- RENDER EDITOR ---- */
const positionsHost = $("admin-positions");
function renderAdmin() {
    if (!positionsHost) return;
    if (!draft.length) {
        positionsHost.innerHTML = `<div class="admin-empty"><p>No positions yet.</p></div>`;
        return;
    }
    positionsHost.innerHTML = draft.map((head, h) => `
        <div class="admin-position-card">
            <div class="admin-position-head">
                <strong>${escapeHtml(head.role)} — ${escapeHtml(head.name)}</strong>
                <div class="admin-toolbar">
                    <button class="admin-btn small" data-act="up" data-h="${h}" title="Move up"><i class="fa-solid fa-arrow-up"></i></button>
                    <button class="admin-btn small" data-act="down" data-h="${h}" title="Move down"><i class="fa-solid fa-arrow-down"></i></button>
                    <button class="admin-btn small" data-act="add-member" data-h="${h}"><i class="fa-solid fa-user-plus"></i> MEMBER</button>
                    <button class="admin-btn small danger" data-act="del-head" data-h="${h}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="admin-position-body">
                <div class="admin-photo-box">
                    <img class="admin-photo-preview" src="${escapeHtml(photoFor(head))}" alt="${escapeHtml(head.name)}">
                    <input type="file" accept="image/*" class="file-input" data-photo="head" data-h="${h}">
                    <button class="admin-btn small" data-act="upload" data-h="${h}"><i class="fa-solid fa-image"></i> UPLOAD PHOTO</button>
                    <button class="admin-btn small" data-act="clear-photo" data-h="${h}">REMOVE PHOTO</button>
                </div>
                <div class="admin-grid">
                    <div class="admin-field"><label>Position / Role</label><input type="text" data-h="${h}" data-field="role" value="${escapeHtml(head.role)}"></div>
                    <div class="admin-field"><label>Full name</label><input type="text" data-h="${h}" data-field="name" value="${escapeHtml(head.name)}"></div>
                    <div class="admin-field"><label>Instagram URL</label><input type="url" data-h="${h}" data-field="instagram" value="${escapeHtml(head.instagram)}"></div>
                    <div class="admin-field"><label>Instagram handle</label><input type="text" data-h="${h}" data-field="instagramHandle" value="${escapeHtml(head.instagramHandle)}"></div>
                    <div class="admin-field"><label>LinkedIn URL</label><input type="url" data-h="${h}" data-field="linkedin" value="${escapeHtml(head.linkedin)}"></div>
                    <div class="admin-field"><label>LinkedIn label</label><input type="text" data-h="${h}" data-field="linkedinHandle" value="${escapeHtml(head.linkedinHandle)}"></div>
                </div>
            </div>
            <div class="admin-members">
                <h5>Team members (${head.members.length})</h5>
                ${head.members.map((member, m) => `
                    <div class="admin-member-row">
                        <img src="${escapeHtml(photoFor(member))}" alt="${escapeHtml(member.name)}">
                        <div class="admin-member-fields">
                            <div class="admin-field"><label>Name</label><input type="text" data-h="${h}" data-m="${m}" data-field="name" value="${escapeHtml(member.name)}"></div>
                            <div class="admin-field"><label>Instagram URL</label><input type="url" data-h="${h}" data-m="${m}" data-field="instagram" value="${escapeHtml(member.instagram)}"></div>
                            <div class="admin-field"><label>Instagram handle</label><input type="text" data-h="${h}" data-m="${m}" data-field="instagramHandle" value="${escapeHtml(member.instagramHandle)}"></div>
                            <div class="admin-field"><label>LinkedIn URL</label><input type="url" data-h="${h}" data-m="${m}" data-field="linkedin" value="${escapeHtml(member.linkedin)}"></div>
                        </div>
                        <div class="admin-member-actions">
                            <input type="file" accept="image/*" class="file-input" data-photo="member" data-h="${h}" data-m="${m}">
                            <button class="admin-btn small" data-act="upload" data-h="${h}" data-m="${m}" title="Upload photo"><i class="fa-solid fa-image"></i></button>
                            <button class="admin-btn small" data-act="promote" data-h="${h}" data-m="${m}" title="Promote"><i class="fa-solid fa-arrow-up-right-dots"></i></button>
                            <button class="admin-btn small danger" data-act="del-member" data-h="${h}" data-m="${m}" title="Remove"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `).join("") || '<p class="admin-muted">No team members yet.</p>'}
            </div>
        </div>
    `).join("");
}

positionsHost?.addEventListener("input", event => {
    const input = event.target;
    if (!input.matches("input[data-field]")) return;
    const h = Number(input.dataset.h);
    const field = input.dataset.field;
    if (input.dataset.m !== undefined) draft[h].members[Number(input.dataset.m)][field] = input.value;
    else draft[h][field] = input.value;
});

positionsHost?.addEventListener("click", event => {
    const button = event.target.closest("button[data-act]");
    if (!button) return;
    const act = button.dataset.act;
    const h = Number(button.dataset.h);
    const m = button.dataset.m !== undefined ? Number(button.dataset.m) : null;

    switch (act) {
        case "upload":
            const selector = m === null ? `input[data-photo="head"][data-h="${h}"]` : `input[data-photo="member"][data-h="${h}"][data-m="${m}"]`;
            positionsHost.querySelector(selector)?.click();
            break;
        case "clear-photo":
            draft[h].img = ""; draft[h].isNewPhoto = false; renderAdmin(); break;
        case "del-head":
            if (!confirm(`Delete "${draft[h].role}"?`)) return;
            draft.splice(h, 1); renderAdmin(); break;
        case "del-member":
            if (!confirm(`Remove ${draft[h].members[m].name}?`)) return;
            draft[h].members.splice(m, 1); renderAdmin(); break;
        case "add-member": draft[h].members.push(blankPerson()); renderAdmin(); break;
        case "promote":
            const person = draft[h].members.splice(m, 1)[0];
            draft.push({ ...person, role: "New Position", members: [] }); renderAdmin(); break;
        case "up":
            if (h > 0) { [draft[h - 1], draft[h]] = [draft[h], draft[h - 1]]; renderAdmin(); } break;
        case "down":
            if (h < draft.length - 1) { [draft[h + 1], draft[h]] = [draft[h], draft[h + 1]]; renderAdmin(); } break;
    }
});

positionsHost?.addEventListener("change", async event => {
    const input = event.target;
    if (!input.matches('input[type="file"][data-photo]')) return;
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;

    const h = Number(input.dataset.h);
    const target = input.dataset.photo === "head" ? draft[h] : draft[h].members[Number(input.dataset.m)];

    try {
        const processed = await resizeImage(file);
        target.img = processed.dataUrl; 
        target.rawBase64 = processed.base64; 
        target.isNewPhoto = true; 
        renderAdmin();
        showToast("Preview updated. Press SAVE & PUBLISH to secure it.");
    } catch (error) {
        console.error(error);
        showToast(error.message || "Upload failed.");
    }
});

$("admin-add-position")?.addEventListener("click", () => {
    draft.push({ ...blankPerson("New Head"), role: "New Position", members: [] });
    renderAdmin();
    positionsHost.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
});

/* ---- SAVE TO GITHUB ---- */
$("admin-save")?.addEventListener("click", async () => {
    const button = $("admin-save");
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> COMMITTING TO GITHUB...`;
    
    try {
        for (let head of draft) {
            if (head.isNewPhoto && head.rawBase64) {
                const fileName = `images/photo_${Date.now()}_${Math.floor(Math.random()*100)}.jpg`;
                const res = await ghFetch(`contents/${fileName}`, {
                    method: 'PUT',
                    body: JSON.stringify({ message: `Upload photo for ${head.name}`, content: head.rawBase64, branch: 'main' })
                });
                head.img = res.content.download_url;
                head.isNewPhoto = false;
            }
            for (let member of head.members) {
                if (member.isNewPhoto && member.rawBase64) {
                    const fileName = `images/photo_${Date.now()}_${Math.floor(Math.random()*100)}.jpg`;
                    const res = await ghFetch(`contents/${fileName}`, {
                        method: 'PUT',
                        body: JSON.stringify({ message: `Upload photo for ${member.name}`, content: member.rawBase64, branch: 'main' })
                    });
                    member.img = res.content.download_url;
                    member.isNewPhoto = false;
                }
            }
        }

        const cleanData = draft.map(head => ({
            role: head.role, name: head.name, img: head.img || "",
            instagram: head.instagram, instagramHandle: head.instagramHandle,
            linkedin: head.linkedin, linkedinHandle: head.linkedinHandle,
            members: head.members.map(member => ({
                name: member.name, img: member.img || "",
                instagram: member.instagram, instagramHandle: member.instagramHandle,
                linkedin: member.linkedin, linkedinHandle: member.linkedinHandle
            }))
        }));

        const jsonContent = JSON.stringify(cleanData, null, 2);
        const base64Content = window.btoa(unescape(encodeURIComponent(jsonContent)));

        const res = await ghFetch('contents/data.json', {
            method: 'PUT',
            body: JSON.stringify({
                message: 'Admin Panel: Update committee data',
                content: base64Content,
                sha: currentDataSha,
                branch: 'main'
            })
        });
        currentDataSha = res.content.sha;
        
        showToast("Saved! Vercel is now rebuilding the site (takes ~60 seconds).");
    } catch (error) {
        console.error(error);
        showToast("Save failed. Make sure your GitHub token has write access.");
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
});

$("admin-export")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "data.json"; link.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded.");
});

window.addEventListener("beforeunload", event => {
    if (draft.some(head => head.isNewPhoto || head.members.some(m => m.isNewPhoto))) {
        event.preventDefault();
        event.returnValue = "";
    }
});