const socket = io();
const GEMINI_API_KEY = "AIzaSyDUVk7aSZ9TvsI9YsyuUXTarSMbhHReurk";
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const subtitleArea = document.getElementById('subtitle-area');

let myStream;
let myLang, friendLang;

async function initCall() {
    myLang = document.getElementById('myLang').value;
    friendLang = document.getElementById('friendLang').value;
    document.getElementById('setup').style.display = 'none';

    try {
        myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = myStream;
        startRecognition();
    } catch (err) {
        alert("Camera/Mic access chahiye bhai!");
    }
}

// --- VOICE TO TRANSLATION ENGINE ---
function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = myLang;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
        const text = event.results[event.results.length - 1][0].transcript;
        translateAndSpeak(text);
    };

    recognition.start();
}

async function translateAndSpeak(text) {
    // GEMINI AI CALL
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
        
        subtitleArea.innerText = `Me: ${text} \n AI: ${translatedText}`;
        
        // Voice Synthesis (Bolega)
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = friendLang;
        window.speechSynthesis.speak(utterance);

    } catch (err) {
        console.error("AI Link Error");
    }
}
