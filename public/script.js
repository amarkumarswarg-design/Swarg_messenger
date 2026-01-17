const socket = io();
const GEMINI_API_KEY = "AIzaSyDUVk7aSZ9TvsI9YsyuUXTarSMbhHReurk";
const localVideo = document.getElementById('localVideo');
const subtitleArea = document.getElementById('subtitle-area');

let myStream;
let myLang, friendLang;
let isMicOn = true;
let isCamOn = true;

// 1. Room Link Logic
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');

if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + roomId;
    document.getElementById('roomLink').innerText = newUrl;
    document.getElementById('link-box').style.display = 'block';
} else {
    document.getElementById('link-box').innerHTML = "<p style='color:var(--neon)'>Dost connect ho raha hai...</p>";
    document.getElementById('link-box').style.display = 'block';
}

async function initCall() {
    myLang = document.getElementById('myLang').value;
    friendLang = document.getElementById('friendLang').value;
    document.getElementById('setup').style.display = 'none';
    document.getElementById('main-stage').style.display = 'flex';

    try {
        myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = myStream;
        
        // Socket join room
        socket.emit('join-room', roomId, socket.id);
        
        startRecognition();
    } catch (err) {
        alert("Bhai, Camera aur Mic ki permission chahiye!");
    }
}

// 2. Mic/Cam Toggle Logic
function toggleMic() {
    isMicOn = !isMicOn;
    myStream.getAudioTracks()[0].enabled = isMicOn;
    document.getElementById('micBtn').classList.toggle('active');
}

function toggleCam() {
    isCamOn = !isCamOn;
    myStream.getVideoTracks()[0].enabled = isCamOn;
    document.getElementById('camBtn').classList.toggle('active');
}

// --- VOICE & TRANSLATION ENGINE ---
function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = myLang;
    recognition.continuous = true;
    recognition.onresult = async (event) => {
        const text = event.results[event.results.length - 1][0].transcript;
        translateAndSpeak(text);
    };
    recognition.start();
}

async function translateAndSpeak(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Translate this to ${friendLang}: "${text}"` }] }]
            })
        });
        const data = await response.json();
        const translatedText = data.candidates[0].content.parts[0].text;
        subtitleArea.innerText = `Me: ${text} \n AI (${friendLang}): ${translatedText}`;
        
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = friendLang;
        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.error("AI Error");
    }
                          }
