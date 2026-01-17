/**
 * VISHWA-SETU ULTIMATE ENGINE V6
 * DEVELOPED BY: AMAR KUMAR
 * FEATURE: REAL-TIME WEBRTC + GEMINI AI TRANSLATION
 */

const socket = io();
const GEMINI_API_KEY = "AIzaSyDUVk7aSZ9TvsI9YsyuUXTarSMbhHReurk";
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const subtitleArea = document.getElementById('subtitle-area');

let myStream;
let peerConnection;
let myLang, friendLang;
let isCallStarted = false;

// 1. Google's Global STUN Servers (Free & Strong)
const iceConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
    ]
};

// 2. Room ID Management (URL Based)
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');

if (!roomId) {
    // Agar koi link nahi hai, toh naya link banao
    roomId = Math.random().toString(36).substring(2, 9);
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
    document.getElementById('roomLink').innerText = newUrl;
    document.getElementById('link-box').style.display = 'block';
} else {
    // Agar link se aaya hai, toh message dikhao
    document.getElementById('link-box').innerHTML = "<p style='color:#00f3ff; font-weight:bold;'>SYNCING WITH AMAR'S NEURAL GRID...</p>";
    document.getElementById('link-box').style.display = 'block';
}

// 3. Start Call Function
async function initCall() {
    myLang = document.getElementById('myLang').value;
    friendLang = document.getElementById('friendLang').value;
    document.getElementById('setup').style.display = 'none';
    document.getElementById('main-stage').style.display = 'flex';

    try {
        console.log(">>> [LOG]: Camera/Mic setup shuru ho raha hai...");
        myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = myStream;
        
        // Server ko batana ki hum ready hain
        socket.emit('join-room', roomId, socket.id);
        
        // AI Translation chalu karna
        startAIEngine();
        isCallStarted = true;
    } catch (err) {
        console.error(err);
        alert("Bhai, Camera aur Mic ki permission ke bina ye nahi chalega!");
    }
}

// 4. WebRTC Signaling (The Handshake)
socket.on('user-connected', async (userId) => {
    console.log(">>> [LOG]: Naya user connect hua: " + userId);
    setupPeer(userId, true);
});

socket.on('signal', async (data) => {
    if (!peerConnection) setupPeer(data.from, false);
    
    if (data.signal.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { to: data.from, signal: answer });
    } else if (data.signal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    } else if (data.signal.candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
        } catch (e) { console.warn("ICE Candidate failed, ignoring..."); }
    }
});

function setupPeer(userId, isInitiator) {
    peerConnection = new RTCPeerConnection(iceConfig);

    // Apne Video Tracks add karna
    myStream.getTracks().forEach(track => peerConnection.addTrack(track, myStream));

    // Saamne wale ka Video receive karna
    peerConnection.ontrack = (event) => {
        console.log(">>> [LOG]: Dost ka video mil gaya!");
        remoteVideo.srcObject = event.streams[0];
    };

    // Network paths dhoondhna
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { to: userId, signal: event.candidate });
        }
    };

    if (isInitiator) {
        peerConnection.onnegotiationneeded = async () => {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('signal', { to: userId, signal: offer });
        };
    }
}

// 5. AI Voice Engine (Gemini Translation)
function startAIEngine() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        subtitleArea.innerText = "Error: Browser Speech Support Missing.";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = myLang;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
        const lastIndex = event.results.length - 1;
        const speechText = event.results[lastIndex][0].transcript;
        console.log(">>> [SPEECH]: " + speechText);
        
        processTranslation(speechText);
    };

    recognition.onerror = (e) => console.error("Speech Error: ", e);
    recognition.onend = () => { if(isCallStarted) recognition.start(); }; // Auto restart
    
    recognition.start();
}

async function processTranslation(text) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Translate this text to the language code ${friendLang}. Provide ONLY the translated text: "${text}"` }] }]
            })
        });

        const data = await response.json();
        const translated = data.candidates[0].content.parts[0].text;
        
        // Subtitles dikhana
        subtitleArea.innerHTML = `<span style="color:var(--gold)">Me:</span> ${text} <br> <span style="color:var(--neon)">AI:</span> ${translated}`;
        
        // Bol kar batana (AI Voice)
        const speech = new SpeechSynthesisUtterance(translated);
        speech.lang = friendLang;
        window.speechSynthesis.speak(speech);

    } catch (err) {
        console.error("Gemini API Error: ", err);
        subtitleArea.innerText = "AI Translation Link Error. Check API Key.";
    }
                    }
    
