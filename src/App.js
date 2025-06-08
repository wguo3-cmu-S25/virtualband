import "./App.css";
import React, { useRef, useState } from "react";
import { generateAudio, convertAudioToBase64, convertBlobToBase64, formatLyricsWithTimestamps, validateApiKey, getGenerationInfo, pollTaskStatus } from './apiService';


function App() {
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [recordedBlob, setRecordedBlob] = useState(null);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setUploadedFile(file);
            setAudioURL(URL.createObjectURL(file));
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
                    setRecordedBlob(blob);
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
                        Virtual Band AI
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
                            <p className="text-sm text-gray-400 mt-2">
                                {uploadedFile ? `Uploaded: ${uploadedFile.name}` : recordedBlob ? 'Recorded audio ready' : ''}
                            </p>
                        </div>
                    )}
                    
                    {/* Chatbox */}
                    <ChatBox 
                        uploadedFile={uploadedFile}
                        recordedBlob={recordedBlob}
                    />

                </header>
            </div>
        </div >
    );
}

// ChatBox component
function ChatBox({ uploadedFile, recordedBlob }) {
    const [input, setInput] = useState("");
    const [stylePrompt, setStylePrompt] = useState("pop");
    const [taskType, setTaskType] = useState("txt2audio-base");
    const [isLoading, setIsLoading] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState(null);
    const [pollingActive, setPollingActive] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi there! I can help you generate music! 🎵\n\nProvide lyrics and I'll create audio for you. Upload reference audio or record yourself singing for style reference.\n\n💡 The system will automatically add timestamps to your lyrics and poll for results until your music is ready!", sender: "bot" },
    ]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Add user message
        const userMessage = input;
        setMessages(prev => [...prev, { text: userMessage, sender: "user" }]);
        setInput("");
        setIsLoading(true);

        try {
            // Format lyrics with timestamps
            const formattedLyrics = formatLyricsWithTimestamps(userMessage);
            
            // Convert audio to base64 if available
            let styleAudio = '';
            if (uploadedFile) {
                styleAudio = await convertAudioToBase64(uploadedFile);
            } else if (recordedBlob) {
                styleAudio = await convertBlobToBase64(recordedBlob);
            }

            // Get generation info
            const genInfo = getGenerationInfo(taskType);
            
            // Show processing message
            setMessages(prev => [...prev, { 
                text: `🎵 Generating ${genInfo.duration} of audio...\nStyle: ${stylePrompt}\nTask: ${taskType}\nCost: ${genInfo.cost}\n\nThis may take a few moments...`, 
                sender: "bot" 
            }]);

            // Call API
            const result = await generateAudio({
                lyrics: formattedLyrics,
                stylePrompt: stylePrompt,
                styleAudio: styleAudio,
                taskType: taskType
            });

            if (result.success) {
                const taskId = result.data.task_id;
                setCurrentTaskId(taskId);
                
                setMessages(prev => [...prev, { 
                    text: `✅ Audio generation started!\n\nTask ID: ${taskId}\n\n🔄 Now polling for results... This usually takes about 20 seconds.`, 
                    sender: "bot" 
                }]);

                // Start polling for results
                setPollingActive(true);
                
                const pollResult = await pollTaskStatus(
                    taskId,
                    (update) => {
                        // Update messages with polling progress
                        if (update.status === 'pending' || update.status === 'processing') {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                // Update the last bot message with polling status
                                const lastBotIndex = newMessages.map(m => m.sender).lastIndexOf('bot');
                                if (lastBotIndex !== -1) {
                                    newMessages[lastBotIndex] = {
                                        ...newMessages[lastBotIndex],
                                        text: `✅ Audio generation started!\n\nTask ID: ${taskId}\n\n🔄 ${update.message}\nStatus: ${update.status}`
                                    };
                                }
                                return newMessages;
                            });
                        }
                    },
                    60, // max attempts
                    5000 // 5 second intervals
                );

                setPollingActive(false);
                
                if (pollResult.success && pollResult.completed) {
                    if (pollResult.audioUrl) {
                        setMessages(prev => [...prev, { 
                            text: `🎉 Music generation completed!\n\n🎵 Your audio is ready!\n\nYou can listen to it below:`,
                            sender: "bot" 
                        }, {
                            text: pollResult.audioUrl,
                            sender: "bot",
                            type: "audio"
                        }]);
                    } else {
                        setMessages(prev => [...prev, { 
                            text: `✅ Generation completed!\n\n${pollResult.message || 'Task finished successfully.'}`,
                            sender: "bot" 
                        }]);
                    }
                } else {
                    const errorMsg = pollResult.timeout ? 
                        `⏰ Polling timeout reached.\n\nYour music is still being generated. You can check the status manually with Task ID: ${taskId}` :
                        `❌ Generation failed:\n${pollResult.error}`;
                        
                    setMessages(prev => [...prev, { 
                        text: errorMsg,
                        sender: "bot" 
                    }]);
                }
                
            } else {
                setMessages(prev => [...prev, { 
                    text: `❌ Error starting generation:\n${result.error}\n\nPlease try again.`, 
                    sender: "bot" 
                }]);
            }

        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, { 
                text: `❌ Error: ${error.message}`, 
                sender: "bot" 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto bg-gray-900 p-4 rounded-xl shadow-lg text-white flex flex-col h-[600px] mt-10 w-full">
            <h2 className="text-xl font-semibold mb-4">Let's make music!</h2>

            {/* Status Indicator */}
            {(currentTaskId || pollingActive) && (
                <div className="mb-3 p-2 bg-blue-900 bg-opacity-50 rounded-lg text-xs">
                    <div className="flex items-center justify-between">
                        <span>Task: {currentTaskId?.substring(0, 8)}...</span>
                        {pollingActive && <span className="animate-pulse">🔄 Polling...</span>}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="mb-4 space-y-2">
                <div>
                    <label className="block text-xs font-medium mb-1">Music Style</label>
                    <select 
                        value={stylePrompt} 
                        onChange={(e) => setStylePrompt(e.target.value)}
                        className="w-full bg-gray-700 text-white text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="pop">Pop</option>
                        <option value="rock">Rock</option>
                        <option value="jazz">Jazz</option>
                        <option value="classical">Classical</option>
                        <option value="electronic">Electronic</option>
                        <option value="hip-hop">Hip-Hop</option>
                        <option value="country">Country</option>
                        <option value="r&b">R&B</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1">Duration</label>
                    <select 
                        value={taskType} 
                        onChange={(e) => setTaskType(e.target.value)}
                        className="w-full bg-gray-700 text-white text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="txt2audio-base">Short (1.35 min) - $0.02</option>
                        <option value="txt2audio-full">Full (4.45 min) - $0.02</option>
                    </select>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div className={`p-3 text-sm rounded-xl max-w-xs ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-700"}`}>
                            {msg.type === "audio" ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-300">🎵 Generated Audio:</p>
                                    <audio controls className="w-full">
                                        <source src={msg.text} type="audio/mpeg" />
                                        <source src={msg.text} type="audio/wav" />
                                        <source src={msg.text} type="audio/webm" />
                                        Your browser does not support the audio element.
                                    </audio>
                                    <a 
                                        href={msg.text} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-300 hover:text-blue-200 text-xs underline block"
                                    >
                                        🔗 Open in new tab
                                    </a>
                                </div>
                            ) : (
                                <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter your lyrics here... (auto-timestamped + style from uploaded audio)"
                    className="w-full bg-gray-700 text-sm text-white placeholder-gray-400 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="3"
                    disabled={isLoading || pollingActive}
                />
                <div className="flex items-center space-x-2">
                    <button
                        type="submit"
                        disabled={isLoading || pollingActive || !input.trim()}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-5 py-2 rounded-lg transition"
                    >
                        {pollingActive ? "🔄 Waiting for results..." : isLoading ? "🎵 Generating..." : "🎤 Generate Music"}
                    </button>
                </div>
            </form>
        </div>
    );
}
export default App;
