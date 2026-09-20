/* =====================================================================
   ROBOTRONIX CLUB — PUBLIC SITE SCRIPT  (ES module)
   ===================================================================== */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const LenisCtor = window.Lenis || class {
    constructor() {} raf() {} on() {}
    stop() { document.body.style.overflow = "hidden"; }
    start() { document.body.style.overflow = ""; }
    scrollTo(target, options = {}) {
        const top = typeof target === "number" ? target : (target?.getBoundingClientRect?.().top ?? 0) + window.scrollY + (options.offset || 0);
        window.scrollTo({ top, behavior: "smooth" });
    }
    get scroll() { return window.scrollY; }
};

const lenis = new LenisCtor({
    duration: prefersReducedMotion ? 0 : 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: "vertical", gestureOrientation: "vertical",
    smoothWheel: !prefersReducedMotion, wheelMultiplier: 1, touchMultiplier: 1.6, smoothTouch: false
});

function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

const EVENT_LINKS = {
    inauguration: "PASTE_INAUGURATION_LINK_HERE",
    ideathon: "https://www.mxesa.in/event/sdg-ideathon/"
};
const IDEATHON_LIVE_END = new Date("2026-09-15T23:59:59");

const FALLBACK_CLUB_DATA = [
    { role: "Club Director", name: "Ms. Shravani Gadkari", img: "", instagram: "#", instagramHandle: "@username", linkedin: "#", linkedinHandle: "Shravani Gadkari", members: [] }
];

function normalizePerson(person = {}) {
    return {
        name: person.name || "Member", img: person.img || "",
        instagram: person.instagram || "#", instagramHandle: person.instagramHandle || "@username",
        linkedin: person.linkedin || "#", linkedinHandle: person.linkedinHandle || person.name || "LinkedIn"
    };
}

function normalizeData(data) {
    if (!Array.isArray(data)) return [];
    return data.map(head => ({
        ...normalizePerson(head),
        role: head.role || "Position",
        members: Array.isArray(head.members) ? head.members.map(normalizePerson) : []
    }));
}

let CLUB_DATA = [];

/* ---- Data loading from Git ---- */
async function loadFromDataFile() {
    try {
        const response = await fetch("data.json?t=" + new Date().getTime());
        if (!response.ok) return null;
        const json = await response.json();
        return Array.isArray(json) && json.length ? normalizeData(json) : null;
    } catch (error) {
        return null;
    }
}

/* =====================================================================
   HELPERS
   ===================================================================== */
function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function buildSocialButtons(person) {
    const buttons = [];
    if (person.instagram && person.instagram !== "#") {
        buttons.push(`<a class="btn-social-pill" href="${escapeHtml(person.instagram)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"><i class="fa-brands fa-instagram"></i><span>${escapeHtml(person.instagramHandle || "Instagram")}</span></a>`);
    }
    if (person.linkedin && person.linkedin !== "#") {
        buttons.push(`<a class="btn-social-pill" href="${escapeHtml(person.linkedin)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"><i class="fa-brands fa-linkedin-in"></i><span>${escapeHtml(person.linkedinHandle || "LinkedIn")}</span></a>`);
    }
    return buttons.join("");
}

function createInitialAvatar(name) {
    const cleanName = String(name || "Member").replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+/i, "").trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : cleanName.slice(0, 2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 760"><rect width="600" height="760" fill="#f4f5f7"/><circle cx="300" cy="330" r="118" fill="#7fd1c1" stroke="#101010" stroke-width="8"/><text x="300" y="372" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="112" font-weight="700" fill="#101010">${escapeHtml(initials.toUpperCase())}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function photoFor(person) {
    return person.img && person.img.trim() ? person.img : createInitialAvatar(person.name);
}

function addImageFallback(img, fallbackName) {
    if (!img) return;
    img.addEventListener("error", () => {
        if (img.dataset.fallbackApplied === "true") return;
        img.dataset.fallbackApplied = "true";
        img.src = createInitialAvatar(fallbackName);
    });
}

/* =====================================================================
   RENDERERS
   ===================================================================== */
function renderTeamSlider() {
    const teamSlider = document.getElementById("team-slider");
    if (!teamSlider) return;
    teamSlider.innerHTML = "";

    CLUB_DATA.forEach((head, index) => {
        const card = document.createElement("div");
        card.className = "brutal-team-column";
        const hasTeam = Array.isArray(head.members) && head.members.length > 0;
        const headImg = photoFor(head);

        const memberRows = hasTeam ? head.members.map(member => `
            <div class="team-member-row">
                <div class="team-member-row-main">
                    <span class="team-member-name">${escapeHtml(member.name)}</span>
                    <button type="button" class="member-reveal-btn" aria-expanded="false" title="Show socials"><i class="fa-solid fa-plus"></i></button>
                </div>
                <div class="team-member-socials">${buildSocialButtons(member)}</div>
            </div>
        `).join("") : "";

        card.innerHTML = `
            <div class="team-flip brutal-card ${hasTeam ? "has-team" : ""}" tabindex="0" role="button" aria-label="Flip to reveal details">
                <div class="team-flip-inner">
                    <div class="team-flip-front">
                        <div class="team-img-wrapper"><img src="${escapeHtml(headImg)}" alt="${escapeHtml(head.role)}" class="team-bg-img" loading="lazy"></div>
                        <div class="team-front-info"><p class="role">${escapeHtml(head.role)}</p><p class="name-preview">${escapeHtml(head.name)}</p></div>
                    </div>
                    <div class="team-flip-back bg-lime">
                        <div class="team-flip-avatar"><img src="${escapeHtml(headImg)}" alt="${escapeHtml(head.name)}" class="team-avatar-img" loading="lazy"></div>
                        <h3>${escapeHtml(head.name)}</h3><p class="role-sub">${escapeHtml(head.role)}</p>
                        <div class="team-flip-socials">${buildSocialButtons(head)}</div>
                    </div>
                </div>
            </div>
            ${hasTeam ? `<button class="team-toggle-btn brutal-card" data-index="${index}" aria-expanded="false">VIEW TEAM (${head.members.length}) <i class="fa-solid fa-chevron-down"></i></button><div class="team-members-panel brutal-card" data-lenis-prevent>${memberRows}</div>` : ""}
        `;
        card.querySelectorAll(".team-bg-img, .team-avatar-img").forEach(img => addImageFallback(img, head.name));
        teamSlider.appendChild(card);
    });

    teamSlider.querySelectorAll(".team-toggle-btn").forEach(button => {
        button.addEventListener("click", () => {
            const column = button.closest(".brutal-team-column");
            if (!column) return;
            const expanded = column.classList.toggle("expanded");
            button.setAttribute("aria-expanded", String(expanded));
        });
    });

    teamSlider.querySelectorAll(".team-member-row").forEach(row => {
        row.addEventListener("click", event => {
            if (event.target.closest("a")) return;
            const revealed = row.classList.toggle("revealed");
            const btn = row.querySelector(".member-reveal-btn");
            if (btn) btn.innerHTML = revealed ? '<i class="fa-solid fa-minus"></i>' : '<i class="fa-solid fa-plus"></i>';
        });
    });

    teamSlider.querySelectorAll(".team-flip").forEach(flip => {
        const toggleFlip = () => flip.classList.toggle("flipped");
        flip.addEventListener("click", event => { if (event.target.closest("a")) return; toggleFlip(); });
        flip.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleFlip(); } });
    });
}

function flattenDirectory() {
    const people = [];
    CLUB_DATA.forEach(head => {
        people.push({ name: head.name, role: head.role, group: "CORE COMMITTEE", img: photoFor(head), socials: buildSocialButtons(head), isHead: true });
        head.members.forEach(member => {
            people.push({ name: member.name, role: `${head.role} — Team`, group: head.role, img: photoFor(member), socials: buildSocialButtons(member), isHead: false });
        });
    });
    return people;
}

function buildMembersModal(filterText = "") {
    const membersModalList = document.getElementById("members-modal-list");
    const memberCountLabel = document.getElementById("member-count-label");
    if (!membersModalList) return;

    const query = filterText.trim().toLowerCase();
    const people = flattenDirectory();
    const visible = query ? people.filter(person => `${person.name} ${person.role}`.toLowerCase().includes(query)) : people;

    if (!visible.length) {
        membersModalList.innerHTML = `<div class="empty-state">No members match “${escapeHtml(filterText)}”.</div>`;
        if (memberCountLabel) memberCountLabel.textContent = `0 / ${people.length} MEMBERS`;
        return;
    }

    membersModalList.innerHTML = visible.map((person, index) => `
        <article class="all-member-card" style="--card-delay:${Math.min(index * 0.03, 0.6)}s" tabindex="0" role="button" aria-label="Flip card for ${escapeHtml(person.name)}">
            <div class="flip-card-inner">
                <div class="flip-card-front">
                    <div class="flip-card-media"><img src="${escapeHtml(person.img)}" alt="${escapeHtml(person.name)}" loading="lazy"><div class="front-number badge bg-black text-white">${String(index + 1).padStart(2, "0")}</div></div>
                    <div class="front-overlay-brutal"><div class="front-role">${escapeHtml(person.role)}</div><div class="front-name">${escapeHtml(person.name)}</div></div>
                </div>
                <div class="flip-card-back ${person.isHead ? "bg-lime" : "bg-white"}">
                    <div class="back-avatar"><img src="${escapeHtml(person.img)}" alt="${escapeHtml(person.name)}" loading="lazy"></div>
                    <div class="back-name">${escapeHtml(person.name)}</div><div class="back-role">${escapeHtml(person.group)}</div>
                    <div class="back-socials">${person.socials || '<span style="font-size:.75rem;font-weight:600;opacity:.6;">No links added yet</span>'}</div>
                </div>
            </div>
        </article>
    `).join("");

    if (memberCountLabel) memberCountLabel.textContent = query ? `${visible.length} / ${people.length} MEMBERS` : `${people.length} MEMBERS`;
    membersModalList.querySelectorAll("img").forEach(img => addImageFallback(img, "Member"));

    membersModalList.querySelectorAll(".all-member-card").forEach(card => {
        const flip = () => card.classList.toggle("flipped");
        card.addEventListener("click", event => { if (event.target.closest("a")) return; flip(); });
        card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); flip(); } });
    });
    requestAnimationFrame(() => { membersModalList.querySelectorAll(".all-member-card").forEach(card => card.classList.add("card-visible")); });
}

/* =====================================================================
   BOOT
   ===================================================================== */
function boot() {
    loadFromDataFile().then(data => {
        CLUB_DATA = data || normalizeData(FALLBACK_CLUB_DATA);
        renderTeamSlider();
    });

    const membersModal = document.getElementById("members-modal");
    const viewAllBtn = document.getElementById("view-all-members-btn");
    const closeMembersBtn = document.getElementById("close-members-modal");
    const memberSearch = document.getElementById("member-search");

    function openMembersModal() {
        if (!membersModal) return;
        if (memberSearch) memberSearch.value = "";
        buildMembersModal();
        membersModal.classList.add("open"); membersModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open"); lenis.stop();
    }

    function closeMembersModal() {
        if (!membersModal) return;
        membersModal.classList.remove("open"); membersModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open"); lenis.start();
    }

    if (viewAllBtn) viewAllBtn.addEventListener("click", openMembersModal);
    if (closeMembersBtn) closeMembersBtn.addEventListener("click", closeMembersModal);
    if (membersModal) membersModal.addEventListener("click", event => { if (event.target === membersModal) closeMembersModal(); });
    if (memberSearch) memberSearch.addEventListener("input", () => buildMembersModal(memberSearch.value));

    document.querySelectorAll("[data-event-link]").forEach(card => {
        card.addEventListener("click", event => {
            event.preventDefault();
            const key = card.getAttribute("data-event-link");
            const url = EVENT_LINKS[key];
            if (url && url !== "#" && !url.includes("PASTE_")) window.open(url, "_blank", "noopener");
        });
    });

    const ideathonCard = document.querySelector('[data-event-link="ideathon"]');
    if (ideathonCard && new Date() <= IDEATHON_LIVE_END) {
        ideathonCard.classList.add("bg-lime");
        const badge = document.createElement("span");
        badge.className = "badge bg-black text-white live-badge float-right";
        badge.innerHTML = `<span class="live-dot" style="background: var(--accent);"></span> LIVE NOW`;
        ideathonCard.prepend(badge);
    }

    const revealElements = document.querySelectorAll(".scroll-reveal");
    if ("IntersectionObserver" in window && !prefersReducedMotion) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
        revealElements.forEach(element => revealObserver.observe(element));
    } else {
        revealElements.forEach(element => element.classList.add("visible"));
    }

    const progressBar = document.getElementById("scroll-progress");
    const backToTop = document.getElementById("back-to-top");
    const mainNav = document.getElementById("main-nav");

    function onScroll(scrollTop) {
        const y = typeof scrollTop === "number" ? scrollTop : window.scrollY;
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const percent = height > 0 ? (y / height) * 100 : 0;
        if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        if (backToTop) backToTop.classList.toggle("show", y > 500);
        if (mainNav) mainNav.classList.toggle("nav-scrolled", y > 60);
    }
    lenis.on("scroll", event => onScroll(event.scroll));
    window.addEventListener("scroll", () => onScroll(), { passive: true });
    onScroll();

    if (backToTop) backToTop.addEventListener("click", () => lenis.scrollTo(0, { duration: prefersReducedMotion ? 0 : 1.2 }));

    const NAV_OFFSET = -90;
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", event => {
            const href = link.getAttribute("href");
            if (!href || href === "#") return;
            const target = document.querySelector(href);
            if (!target) return;
            event.preventDefault();
            lenis.scrollTo(target, { offset: NAV_OFFSET, duration: prefersReducedMotion ? 0 : 1.2 });
            history.replaceState(null, "", href);
        });
    });

    document.addEventListener("keydown", event => {
        if (document.body.classList.contains("modal-open")) return;
        const tag = (event.target.tagName || "").toLowerCase();
        if (["input", "textarea", "select"].includes(tag) || event.target.isContentEditable) return;
        const viewport = window.innerHeight;
        const current = lenis.scroll || window.scrollY;
        let destination = null;
        switch (event.key) {
            case "ArrowDown": destination = current + 90; break;
            case "ArrowUp": destination = current - 90; break;
            case "PageDown": destination = current + viewport * 0.9; break;
            case "PageUp": destination = current - viewport * 0.9; break;
            case " ": destination = current + viewport * (event.shiftKey ? -0.9 : 0.9); break;
            case "Home": destination = 0; break;
            case "End": destination = document.documentElement.scrollHeight; break;
            default: return;
        }
        event.preventDefault();
        lenis.scrollTo(destination, { duration: prefersReducedMotion ? 0 : 0.7 });
    });

    const slider = document.getElementById("team-slider");
    const leftBtn = document.getElementById("slide-left-btn");
    const rightBtn = document.getElementById("slide-right-btn");

    if (slider) {
        const scrollAmount = 370;
        if (leftBtn) leftBtn.addEventListener("click", () => slider.scrollBy({ left: -scrollAmount, behavior: "smooth" }));
        if (rightBtn) rightBtn.addEventListener("click", () => slider.scrollBy({ left: scrollAmount, behavior: "smooth" }));

        const updateSliderButtons = () => {
            if (!leftBtn || !rightBtn) return;
            const maxScroll = slider.scrollWidth - slider.clientWidth - 4;
            leftBtn.disabled = slider.scrollLeft <= 2;
            rightBtn.disabled = slider.scrollLeft >= maxScroll;
        };
        slider.addEventListener("scroll", updateSliderButtons, { passive: true });
        window.addEventListener("resize", updateSliderButtons);
        updateSliderButtons();

        let isDown = false, startX = 0, startScroll = 0, moved = false;
        slider.addEventListener("pointerdown", event => {
            if (event.pointerType === "touch") return;
            isDown = true; moved = false; startX = event.clientX; startScroll = slider.scrollLeft;
            slider.classList.add("dragging");
        });
        slider.addEventListener("pointermove", event => {
            if (!isDown) return;
            const delta = event.clientX - startX;
            if (Math.abs(delta) > 5) moved = true;
            slider.scrollLeft = startScroll - delta;
        });
        ["pointerup", "pointerleave", "pointercancel"].forEach(type => {
            slider.addEventListener(type, () => { isDown = false; slider.classList.remove("dragging"); });
        });
        slider.addEventListener("click", event => { if (moved) { event.preventDefault(); event.stopPropagation(); } }, true);
    }

    const sideDots = document.querySelectorAll(".side-dot");
    const spySections = Array.from(sideDots).map(dot => {
        const id = dot.getAttribute("href").replace("#", "");
        return { id, el: document.getElementById(id), dot };
    }).filter(section => section.el);

    if (spySections.length && "IntersectionObserver" in window) {
        const spyObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const match = spySections.find(section => section.el === entry.target);
                if (!match) return;
                sideDots.forEach(dot => dot.classList.remove("active"));
                match.dot.classList.add("active");
                document.querySelectorAll(".nav-pill").forEach(pill => {
                    pill.classList.toggle("active", pill.getAttribute("href") === `#${match.id}`);
                });
            });
        }, { threshold: 0.35 });
        spySections.forEach(section => spyObserver.observe(section.el));
    }

    const menuToggle = document.getElementById("menu-toggle");
    const allSectionsOverlay = document.getElementById("all-sections-overlay");
    const closeAllSections = document.getElementById("close-all-sections");

    function openNavigation() {
        if (!allSectionsOverlay) return;
        allSectionsOverlay.classList.add("open");
        if (menuToggle) { menuToggle.classList.add("menu-open"); menuToggle.setAttribute("aria-expanded", "true"); }
        document.body.classList.add("modal-open"); lenis.stop();
    }
    function closeNavigation() {
        if (!allSectionsOverlay) return;
        allSectionsOverlay.classList.remove("open");
        if (menuToggle) { menuToggle.classList.remove("menu-open"); menuToggle.setAttribute("aria-expanded", "false"); }
        document.body.classList.remove("modal-open"); lenis.start();
    }

    if (menuToggle) menuToggle.addEventListener("click", () => { allSectionsOverlay?.classList.contains("open") ? closeNavigation() : openNavigation(); });
    if (closeAllSections) closeAllSections.addEventListener("click", closeNavigation);
    if (allSectionsOverlay) {
        allSectionsOverlay.querySelectorAll(".all-sections-link").forEach(link => link.addEventListener("click", closeNavigation));
        allSectionsOverlay.addEventListener("click", event => { if (event.target === allSectionsOverlay) closeNavigation(); });
    }

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (membersModal?.classList.contains("open")) closeMembersModal();
        if (allSectionsOverlay?.classList.contains("open")) closeNavigation();
    });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

(function initRobotMascot() {
    const bot = document.getElementById("robot-mascot");
    const head = document.getElementById("robot-head");
    const eyeLSocket = document.getElementById("robot-eye-left");
    const eyeRSocket = document.getElementById("robot-eye-right");
    const pupilL = eyeLSocket ? eyeLSocket.querySelector(".robot-pupil") : null;
    const pupilR = eyeRSocket ? eyeRSocket.querySelector(".robot-pupil") : null;
    if (!bot || !head || !pupilL || !pupilR) return;

    let targetHeadRotate = 0, currentHeadRotate = 0;
    let targetPupilX = 0, targetPupilY = 0, currentPupilX = 0, currentPupilY = 0;

    function updateFromPointer(clientX, clientY) {
        const rect = bot.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height * 0.32;
        const dx = clientX - originX;
        const dy = clientY - originY;
        const angle = Math.atan2(dy, dx);
        targetHeadRotate = Math.max(-16, Math.min(16, (dx / window.innerWidth) * 32));
        const maxPupil = 2.6;
        targetPupilX = Math.cos(angle) * maxPupil;
        targetPupilY = Math.sin(angle) * maxPupil;
    }

    window.addEventListener("mousemove", e => updateFromPointer(e.clientX, e.clientY));
    window.addEventListener("touchmove", e => { if (e.touches && e.touches[0]) updateFromPointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

    function animateBot() {
        currentHeadRotate += (targetHeadRotate - currentHeadRotate) * 0.12;
        currentPupilX += (targetPupilX - currentPupilX) * 0.2;
        currentPupilY += (targetPupilY - currentPupilY) * 0.2;
        head.style.transform = `rotate(${currentHeadRotate.toFixed(2)}deg)`;
        pupilL.style.transform = `translate(-50%, -50%) translate(${currentPupilX.toFixed(2)}px, ${currentPupilY.toFixed(2)}px)`;
        pupilR.style.transform = `translate(-50%, -50%) translate(${currentPupilX.toFixed(2)}px, ${currentPupilY.toFixed(2)}px)`;
        requestAnimationFrame(animateBot);
    }
    animateBot();

    setInterval(() => {
        bot.classList.add("robot-blink");
        setTimeout(() => bot.classList.remove("robot-blink"), 180);
    }, 4000 + Math.random() * 3000);
})();

/* =====================================================================
   CLICK TO INAUGURATE — confetti burst + celebration overlay
   ===================================================================== */
(function initInaugurateButton() {
    const btn = document.getElementById("inaugurate-btn");
    const overlay = document.getElementById("inaugurate-overlay");
    const confettiField = document.getElementById("confetti-field");
    if (!btn || !overlay || !confettiField) return;

    const CONFETTI_COLORS = ["#7fd1c1", "#2f8d7c", "#ffffff", "#141414", "#e2f4f0"];
    let hideTimer = null;
    let launched = false;

    // Site starts blurred + locked (body already carries .pre-inaugurate from the HTML
    // so it's blurred from first paint, no flash of the un-blurred site).
    if (document.body.classList.contains("pre-inaugurate")) lenis.stop();

    function spawnConfetti(count) {
        confettiField.innerHTML = "";
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const piece = document.createElement("span");
            piece.className = "confetti-piece";
            const left = Math.random() * 100;
            const duration = 2.6 + Math.random() * 2.2;
            const delay = Math.random() * 0.6;
            const drift = (Math.random() - 0.5) * 220;
            const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
            const size = 6 + Math.random() * 8;
            piece.style.left = `${left}%`;
            piece.style.background = color;
            piece.style.width = `${size}px`;
            piece.style.height = `${size * 1.6}px`;
            piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
            piece.style.setProperty("--drift", `${drift}px`);
            piece.style.animationDuration = `${duration}s`;
            piece.style.animationDelay = `${delay}s`;
            fragment.appendChild(piece);
        }
        confettiField.appendChild(fragment);
    }

    // Ends the celebration and un-blurs the site (button is already gone by this point).
    function revealSite() {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
        document.body.classList.remove("pre-inaugurate");
        document.body.classList.add("inaugurated");
        lenis.start();

        setTimeout(() => { confettiField.innerHTML = ""; }, 500);
    }

    function openCelebration() {
        if (launched) return;
        launched = true;

        // Button disappears the instant it's clicked, before the celebration plays.
        btn.classList.add("inaugurate-btn-hide");
        setTimeout(() => { btn.style.display = "none"; }, 300);

        spawnConfetti(prefersReducedMotion ? 0 : 90);
        overlay.classList.add("open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");

        // Same celebration animation plays, then the site reveals itself automatically.
        hideTimer = setTimeout(revealSite, prefersReducedMotion ? 1200 : 4200);
    }

    btn.addEventListener("click", openCelebration);
    // Once launched, tapping the overlay (or Escape) skips straight to the reveal.
    overlay.addEventListener("click", () => { if (launched) revealSite(); });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && launched && overlay.classList.contains("open")) revealSite();
    });
})();