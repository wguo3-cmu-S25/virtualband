import "./App.css";
import React, { useRef, useState } from "react";


function App() {
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const [recordedChunks, setRecordedChunks] = useState([]);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            alert(`Selected file: ${file.name}`);
            // You can handle the uploaded file here
        }
    };

    const handleRecordClick = async () => {
        if (isRecording) {
            // Stop recording
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });
                const mediaRecorder = new window.MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                setRecordedChunks([]);
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        setRecordedChunks((prev) => prev.concat(event.data));
                    }
                };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, {
                        type: "audio/webm"
                    });
                    setAudioURL(URL.createObjectURL(blob));
                };
                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                alert("Microphone access denied or not available.");
            }
        }
    };

    return (
        <div className="App min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 text-white flex items-center justify-center p-6">

            <div className="w-full max-w-3xl space-y-6">

                <header className="text-center space-y-4">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                        Would you like to upload a recording or record yourself?
                    </h1>
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                        <button
                            onClick={handleUploadClick}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg shadow transition-colors"
                        >
                            Upload a Recording
                        </button>
                        <input
                            type="file"
                            accept="audio/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={handleRecordClick}
                            className={`${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                                } text-white px-6 py-2 rounded-lg transition-shadow shadow-md`}
                        >
                            {isRecording ? "Stop Recording" : "Record Yourself"}
                        </button>
                    </div>
                    {audioURL && (
                        <div className="mt-6 text-center">
                            <h3 className="text-lg font-semibold mb-2">Playback</h3>
                            <audio controls src={audioURL} className="w-full max-w-md mx-auto" />
                        </div>
                    )}
                    {/* Chatbox */}
                    <ChatBox />

                </header>
            </div>
        </div >
    );
}

// ChatBox component
function ChatBox() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
        { text: "Hi there! How can I help you today?", sender: "bot" },
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            setMessages([...messages, { text: input, sender: "user" }]);
            setInput("");
        }
    };

    return (
        <div className="max-w-md mx-auto bg-gray-900 p-4 rounded-xl shadow-lg text-white flex flex-col h-[500px] mt-10 w-full">
            <h2 className="text-xl font-semibold mb-4">Virtual Band</h2>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div className={`p-3 text-sm rounded-xl max-w-xs ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-700"}`}>

                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="mt-4 flex items-center space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-sm text-white placeholder-gray-400 p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-full transition"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
export default App;
