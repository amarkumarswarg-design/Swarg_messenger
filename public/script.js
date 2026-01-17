const socket = io();
const GEMINI_API_KEY = "AIzaSyDUVk7aSZ9TvsI9YsyuUXTarSMbhHReurk";
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const subtitleArea = document.getElementById('subtitle-area');

let myStream;
let peerConnection;
let myLang, friendLang;

// --- WebRTC Configuration (Google's Free Servers) ---
const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// 1. Get Room ID from URL
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');

if (!roomId) {
    roomId = Math.random().toString(36).substring(7);
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
    document.getElementById('roomLink').innerText = newUrl;
    document.getElementById('link-box').style.display = 'block';
} else {
    document.getElementById('link-box').innerHTML = "<p style='color:#00f3ff'>Dost ka intezar ho raha hai...</p>";
    document.getElementById('link-box').style.display = 'block';
}

// 2. Start Call Function
async function initCall() {
    myLang = document.getElementById('myLang').value;
    friendLang = document.getElementById('friendLang').value;
    document.getElementById('setup').style.display = 'none';
    document.getElementById('main-stage').style.display = 'flex';

    try {
        myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = myStream;
        
        socket.emit('join-room', roomId, socket.id);
        startRecognition();
    } catch (err) {
        alert("Camera aur Mic on kijiye bhai!");
    }
}

// 3. WebRTC Signaling Logic (Real Connection)
socket.on('user-connected', async (userId) => {
    console.log("Naya dost jud gaya: " + userId);
    createPeerConnection(userId, true);
});

socket.on('signal', async (data) => {
    if (!peerConnection) createPeerConnection(data.from, false);
    
    if (data.signal.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { to: data.from, signal: answer });
    } else if (data.signal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    } else if (data.signal.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
    }
});

function createPeerConnection(userId, isOffer) {
    peerConnection = new RTCPeerConnection(config);

    // Add local stream
    myStream.getTracks().forEach(track => peerConnection.addTrack(track, myStream));

    // Receive remote stream
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // ICE Candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { to: userId, signal: event.candidate });
        }
    };

    if (isOffer) {
        peerConnection.onnegotiationneeded = async () => {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('signal', { to: userId, signal: offer });
        };
    }
}

// 4. AI Translation Engine (Gemini)
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
                contents: [{ parts: [{ text: `Translate the following text to ${friendLang}. Only provide the translation, nothing else: "${text}"` }] }]
            })
        });
        const data = await response.json();
        const translatedText = data.candidates[0].content.parts[0].text;
        
        subtitleArea.innerText = `Me: ${text} \n AI (${friendLang}): ${translatedText}`;
        
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = friendLang;
        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.error("AI Link Error");
    }
                        }
