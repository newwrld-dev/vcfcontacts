import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, getCountFromServer, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBp63fNtZKWKp9eG6lmVDORPYAqBxf3tfU",
    authDomain: "popkidvcf.firebaseapp.com",
    projectId: "popkidvcf",
    storageBucket: "popkidvcf.firebasestorage.app",
    messagingSenderId: "189477180127",
    appId: "1:189477180127:web:474daf37c233c61ec78f6a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Phone Input
const phoneInput = window.intlTelInput(document.querySelector("#userPhone"), {
    initialCountry: "ke",
    separateDialCode: true,
    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
});

// Admin View Toggle
if (new URLSearchParams(window.location.search).has('admin')) {
    document.getElementById('user-view').classList.add('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
}

// Live Progress
async function updateProgress() {
    try {
        const snap = await getCountFromServer(collection(db, "contacts"));
        const count = snap.data().count;
        const goal = 500;
        const perc = Math.min((count/goal*100), 100);
        document.getElementById('progress-bar').style.width = perc + "%";
        document.getElementById('percent-text').innerText = Math.round(perc) + "%";
        document.getElementById('stats-text').innerText = `${count} / ${goal} Members`;
    } catch (e) { document.getElementById('stats-text').innerText = "Live Server Ready"; }
}
updateProgress();

// Registration Logic
document.getElementById('regBtn').addEventListener('click', async function() {
    const name = document.getElementById('userName').value.trim();
    const phone = phoneInput.getNumber();
    const btn = this;

    if(!name || !phone) return alert("⚠️ Please enter Name and Number");
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Securing...';

    try {
        const q = query(collection(db, "contacts"), where("phone", "==", phone));
        const check = await getDocs(q);
        if(!check.empty) {
            alert("❌ You are already registered!");
            btn.disabled = false;
            btn.innerText = "Join Project";
            return;
        }

        await addDoc(collection(db, "contacts"), { name, phone, date: new Date() });
        
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
        audio.play();

        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#007AFF', '#ffffff', '#5856D6']
        });

        btn.innerHTML = "🎉 Registered!";
        btn.style.background = "#34C759";
        btn.style.color = "#fff";

        setTimeout(() => {
            alert("🎊 CONGRATULATIONS! 🎊\nYou have been successfully added to Popkid VCF!");
            location.reload();
        }, 1000);

    } catch (e) {
        alert("Database Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Join Project";
    }
});

// Admin Authentication
document.getElementById('loginBtn').addEventListener('click', async () => {
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('admEmail').value, document.getElementById('admPass').value);
        document.getElementById('admin-login').classList.add('hidden');
        document.getElementById('admin-dash').classList.remove('hidden');
        loadContacts();
    } catch (e) { alert("Access Denied"); }
});

// Admin Functions
async function loadContacts() {
    const snap = await getDocs(collection(db, "contacts"));
    const tbody = document.getElementById('contact-list');
    tbody.innerHTML = "";
    snap.forEach(d => {
        tbody.innerHTML += `<tr><td>${d.data().name}</td><td>${d.data().phone}</td><td><i class="fas fa-trash" style="color:#FF3B30;cursor:pointer" onclick="window.del('${d.id}')"></i></td></tr>`;
    });
}

window.del = async (id) => { if(confirm("Delete?")) { await deleteDoc(doc(db,"contacts",id)); loadContacts(); } };

document.getElementById('vcfBtn').addEventListener('click', async () => {
    const snap = await getDocs(collection(db, "contacts"));
    let vcf = "";
    snap.forEach(d => vcf += `BEGIN:VCARD\nVERSION:3.0\nFN:${d.data().name}\nTEL:${d.data().phone}\nEND:VCARD\n`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([vcf], {type: "text/vcf"}));
    a.download = "Popkid_List.vcf"; a.click();
});

document.getElementById('resetBtn').addEventListener('click', async () => {
    if(confirm("WIPE ALL DATA?")) {
        const snap = await getDocs(collection(db, "contacts"));
        snap.forEach(async d => await deleteDoc(doc(db, "contacts", d.id)));
        alert("Wiped!"); loadContacts();
    }
});
