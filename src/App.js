import logo from "./logo.svg";
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
        <div className="App">
            <header className="App-header">
                <h1>
                    Would you like to upload a recording or record yourself?
                </h1>
                <div style={{ margin: "20px" }}>
                    <button
                        onClick={handleUploadClick}
                        style={{ marginRight: "10px" }}
                    >
                        Upload a Recording
                    </button>
                    <input
                        type="file"
                        accept="audio/*"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                    <button onClick={handleRecordClick}>
                        {isRecording ? "Stop Recording" : "Record Yourself"}
                    </button>
                </div>
                {audioURL && (
                    <div style={{ marginTop: "20px" }}>
                        <h3>Playback:</h3>
                        <audio controls src={audioURL}></audio>
                    </div>
                )}
                {/* Chatbox */}
                <ChatBox />
            </header>
        </div>
    );
}

// ChatBox component
function ChatBox() {
    const [input, setInput] = useState("");
    const [submittedPrompt, setSubmittedPrompt] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            setSubmittedPrompt(input);
            setInput("");
        }
    };

    return (
        <div style={{ marginTop: "40px", width: "100%", maxWidth: "400px" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex" }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter your prompt..."
                    style={{ flex: 1, padding: "8px" }}
                />
                <button type="submit" style={{ marginLeft: "8px" }}>
                    Submit
                </button>
            </form>
            {submittedPrompt && (
                <div style={{ marginTop: "16px", textAlign: "left" }}>
                    <strong>Your prompt:</strong>
                    <div>{submittedPrompt}</div>
                </div>
            )}
        </div>
    );
}

export default App;
