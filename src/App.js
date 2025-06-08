import logo from "./logo.svg";
import "./App.css";
import React, { useRef } from "react";

function App() {
    const fileInputRef = useRef(null);

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

    const handleRecordClick = () => {
        alert("Record yourself feature coming soon!");
        // You can implement recording logic here
    };

    return (
        <div className="App">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <h2>
                    Would you like to upload a recording or record yourself?
                </h2>
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
                    <button onClick={handleRecordClick}>Record Yourself</button>
                </div>
            </header>
        </div>
    );
}

export default App;
