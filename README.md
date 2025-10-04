# Virtual Band AI 🎵

A React-based web application that generates AI music and album covers from lyrics. Upload reference audio or record yourself singing, and the AI will create a complete musical accompaniment with matching album artwork.

## ✨ Features

- **AI Music Generation**: Create music from lyrics using DiffRhythm AI
- **Album Cover Generation**: Automatically generate matching album artwork using Flux AI
- **Audio Input Options**: Upload audio files or record directly in the browser
- **Style Customization**: Choose from multiple music genres (pop, rock, jazz, classical, etc.)
- **Real-time Recording**: Built-in microphone recording with visual feedback
- **Instrument Configuration**: Specify instruments, BPM, and time signature
- **Cost Estimation**: See generation costs before processing
- **Responsive Design**: Modern UI with Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- Python 3.6+ (for audio processing utilities)
- Modern web browser with microphone access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd virtualband
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies** (optional)
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎯 How to Use

### 1. **Configure Music Settings**
- Select your preferred music style (pop, rock, jazz, etc.)
- Choose duration (short 1.35 min or full 4.45 min)
- Specify instruments (comma-separated: "piano, guitar, drums")
- Set BPM and time signature

### 2. **Provide Audio Reference** (Optional)
- **Upload**: Click "Upload a Recording" to select an audio file
- **Record**: Click "Record Yourself" to record directly in the browser
- The AI will use this as a style reference for generation

### 3. **Enter Lyrics**
- Type your lyrics in the chat interface
- Lyrics are automatically timestamped for proper synchronization
- The system will generate both music and album cover

### 4. **Generate & Enjoy**
- Click "Generate Music + Cover" to start the process
- Monitor progress with real-time status updates
- Download your generated audio and album cover

## 🛠️ Technical Details

### Frontend Architecture
- **React 19**: Modern React with hooks and functional components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Web Audio API**: Browser-based audio recording and playback
- **Responsive Design**: Mobile-friendly interface

### AI Integration
- **DiffRhythm API**: Music generation from text and audio
- **Flux API**: AI-powered album cover generation
- **Real-time Polling**: Status monitoring for long-running tasks
- **Error Handling**: Comprehensive error management and user feedback

### Audio Processing
- **Base64 Encoding**: Audio conversion for API compatibility
- **Multiple Formats**: Support for MP3, WAV, WebM, and more
- **Browser Recording**: MediaRecorder API for direct recording
- **File Upload**: Drag-and-drop audio file support

## 📁 Project Structure

```
virtualband/
├── src/
│   ├── App.js              # Main application component
│   ├── apiService.js       # AI API integration
│   ├── App.css            # Application styles
│   └── index.js           # React entry point
├── public/                # Static assets
├── audio_to_base64.py    # Python audio conversion utility
├── example_usage.py      # Python usage examples
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies
└── tailwind.config.js    # Tailwind configuration
```

## 🔧 API Configuration

The application uses the following AI services:

### DiffRhythm API (Music Generation)
- **Model**: `Qubico/diffrhythm`
- **Task Types**: `txt2audio-base`, `txt2audio-full`
- **Features**: Style transfer, instrument specification, BPM control

### Flux API (Image Generation)
- **Model**: `Qubico/flux1-dev`
- **Output**: 1024x1024 album covers
- **Features**: Style-aware generation, lyrics-based prompts

### API Key Setup
Update the API key in `src/apiService.js`:
```javascript
const API_KEY = 'your-api-key-here';
```

## 🎨 Customization

### Adding New Music Styles
Edit the style options in `src/App.js`:
```javascript
<option value="your-style">Your Style</option>
```

### Modifying Generation Parameters
Update the API request body in `src/apiService.js`:
```javascript
const requestBody = {
    model: 'Qubico/diffrhythm',
    task_type: taskType,
    input: {
        lyrics: lyrics,
        style_prompt: stylePrompt,
        style_audio: styleAudio
    }
};
```
