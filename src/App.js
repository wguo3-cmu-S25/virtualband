import "./App.css";
import React, { useRef, useState } from "react";
import { generateAudio, convertAudioToBase64, convertBlobToBase64, formatLyricsWithTimestamps, validateApiKey, getGenerationInfo, pollTaskStatus, generateAlbumCover, pollImageTaskStatus, getImageGenerationInfo } from './apiService';


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
    const [currentImageTaskId, setCurrentImageTaskId] = useState(null);
    const [pollingActive, setPollingActive] = useState(false);
    const [imagePollingActive, setImagePollingActive] = useState(false);
    const [generatedAudioUrl, setGeneratedAudioUrl] = useState(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
    const [currentLyrics, setCurrentLyrics] = useState("");
    const [messages, setMessages] = useState([
        { text: "Hi there! I can help you generate music and album covers! 🎵🎨\n\nProvide lyrics and I'll create audio AND an album cover for you. Upload reference audio or record yourself singing for style reference.\n\n💡 The system will automatically add timestamps to your lyrics, generate music, then create a matching album cover!", sender: "bot" },
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
            setCurrentLyrics(formattedLyrics);
            
            // Reset previous generations
            setGeneratedAudioUrl(null);
            setGeneratedImageUrl(null);
            
            // Convert audio to base64 if available
            let styleAudio = '';
            if (uploadedFile) {
                styleAudio = await convertAudioToBase64(uploadedFile);
            } else if (recordedBlob) {
                styleAudio = await convertBlobToBase64(recordedBlob);
            }

            // Get generation info
            const genInfo = getGenerationInfo(taskType);
            const imageInfo = getImageGenerationInfo();
            
            // Show processing message
            setMessages(prev => [...prev, { 
                text: `🎵 Generating ${genInfo.duration} of audio + album cover...\nStyle: ${stylePrompt}\nTask: ${taskType}\nCost: ${genInfo.cost} + ${imageInfo.cost} for cover\n\n🔄 Starting both music and album cover generation in parallel...`, 
                sender: "bot" 
            }]);

            // Start both API calls in parallel
            const [musicResult, imageResult] = await Promise.all([
                generateAudio({
                    lyrics: formattedLyrics,
                    stylePrompt: stylePrompt,
                    styleAudio: styleAudio,
                    taskType: taskType
                }),
                generateAlbumCover({
                    musicStyle: stylePrompt,
                    lyrics: formattedLyrics
                })
            ]);

            // Check if both API calls started successfully
            if (musicResult.success && imageResult.success) {
                const musicTaskId = musicResult.data.task_id;
                const imageTaskId = imageResult.taskId;
                
                setCurrentTaskId(musicTaskId);
                setCurrentImageTaskId(imageTaskId);
                
                setMessages(prev => [...prev, { 
                    text: `✅ Both generations started!\n\n🔄 Generating music and album cover...`, 
                    sender: "bot" 
                }]);

                // Start polling both tasks in parallel
                setPollingActive(true);
                setImagePollingActive(true);
                
                const [musicPollResult, imagePollResult] = await Promise.all([
                    pollTaskStatus(
                        musicTaskId,
                        (update) => {
                            // Simple music status update
                            if (update.status === 'pending' || update.status === 'processing') {
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastBotIndex = newMessages.map(m => m.sender).lastIndexOf('bot');
                                    if (lastBotIndex !== -1) {
                                        newMessages[lastBotIndex] = {
                                            ...newMessages[lastBotIndex],
                                            text: `✅ Both generations started!\n\n🔄 Generating music and album cover...`
                                        };
                                    }
                                    return newMessages;
                                });
                            }
                        },
                        60, 5000
                    ),
                    pollImageTaskStatus(
                        imageTaskId,
                        () => {
                            // No detailed updates for image polling
                        },
                        60, 5000
                    )
                ]);

                setPollingActive(false);
                setImagePollingActive(false);
                
                // Handle results
                if (musicPollResult.success && musicPollResult.completed && 
                    imagePollResult.success && imagePollResult.completed) {
                    
                    if (musicPollResult.audioUrl && imagePollResult.imageUrl) {
                        // Both succeeded
                        setGeneratedAudioUrl(musicPollResult.audioUrl);
                        setGeneratedImageUrl(imagePollResult.imageUrl);
                        
                        setMessages(prev => [...prev, { 
                            text: `🎉 Complete! Your music and album cover are ready!\n\n🎵 Audio + 🎨 Album Cover:`,
                            sender: "bot" 
                        }, {
                            text: musicPollResult.audioUrl,
                            sender: "bot",
                            type: "audio"
                        }, {
                            text: imagePollResult.imageUrl,
                            sender: "bot",
                            type: "image"
                        }]);
                    } else if (musicPollResult.audioUrl) {
                        // Only music succeeded
                        setGeneratedAudioUrl(musicPollResult.audioUrl);
                        
                        setMessages(prev => [...prev, { 
                            text: `🎵 Music is ready!\n\n❌ Album cover generation failed.\n\nYou can still listen to your music:`,
                            sender: "bot" 
                        }, {
                            text: musicPollResult.audioUrl,
                            sender: "bot",
                            type: "audio"
                        }]);
                    } else {
                        // Both failed or no URLs
                        setMessages(prev => [...prev, { 
                            text: `❌ Generation completed but no results found.\n\nPlease try again.`,
                            sender: "bot" 
                        }]);
                    }
                } else {
                    // Handle partial failures
                    if (musicPollResult.success && musicPollResult.completed && musicPollResult.audioUrl) {
                        // Music succeeded, image failed
                        setGeneratedAudioUrl(musicPollResult.audioUrl);
                        
                        setMessages(prev => [...prev, { 
                            text: `🎵 Music is ready!\n\n❌ Album cover generation failed or timed out.\n\nYou can still listen to your music:`,
                            sender: "bot" 
                        }, {
                            text: musicPollResult.audioUrl,
                            sender: "bot",
                            type: "audio"
                        }]);
                    } else {
                        // Music failed
                        const errorMsg = musicPollResult.timeout ? 
                            `⏰ Generation timeout reached.` :
                            `❌ Generation failed: ${musicPollResult.error || imagePollResult.error}`;
                            
                        setMessages(prev => [...prev, { 
                            text: errorMsg,
                            sender: "bot" 
                        }]);
                    }
                }
                
            } else {
                // One or both API calls failed to start
                let errorMsg = `❌ Error starting generation:\n`;
                if (!musicResult.success) errorMsg += `Music: ${musicResult.error}\n`;
                if (!imageResult.success) errorMsg += `Image: ${imageResult.error}\n`;
                errorMsg += `\nPlease try again.`;
                
                setMessages(prev => [...prev, { 
                    text: errorMsg, 
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
            {(currentTaskId || currentImageTaskId || pollingActive || imagePollingActive) && (
                <div className="mb-3 p-2 bg-blue-900 bg-opacity-50 rounded-lg text-xs space-y-1">
                    {currentTaskId && (
                        <div className="flex items-center justify-between">
                            <span>🎵 Music: {currentTaskId?.substring(0, 8)}...</span>
                            {pollingActive && <span className="animate-pulse">🔄 Generating...</span>}
                        </div>
                    )}
                    {currentImageTaskId && (
                        <div className="flex items-center justify-between">
                            <span>🎨 Cover: {currentImageTaskId?.substring(0, 8)}...</span>
                            {imagePollingActive && <span className="animate-pulse">🔄 Creating...</span>}
                        </div>
                    )}
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
                            ) : msg.type === "image" ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-300">🎨 Album Cover:</p>
                                    <img 
                                        src={msg.text} 
                                        alt="Generated Album Cover" 
                                        className="w-full max-w-[200px] rounded-lg shadow-md"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                    <div style={{display: 'none'}} className="text-red-300 text-xs">
                                        ❌ Failed to load image
                                    </div>
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
                    placeholder="Enter your lyrics here... (auto-timestamped + matching album cover will be generated)"
                    className="w-full bg-gray-700 text-sm text-white placeholder-gray-400 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows="3"
                    disabled={isLoading || pollingActive || imagePollingActive}
                />
                <div className="flex items-center space-x-2">
                    <button
                        type="submit"
                        disabled={isLoading || pollingActive || imagePollingActive || !input.trim()}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-5 py-2 rounded-lg transition"
                    >
                        {imagePollingActive ? "🎨 Creating cover..." : pollingActive ? "🔄 Generating music..." : isLoading ? "🎵 Starting..." : "🎤 Generate Music + Cover"}
                    </button>
                </div>
            </form>
        </div>
    );
}
export default App;
