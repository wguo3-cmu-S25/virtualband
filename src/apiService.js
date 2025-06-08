const API_BASE_URL = 'https://api.piapi.ai';
const API_ENDPOINT = '/api/v1/task';
const API_KEY = '875abc55839ffb0af6be0d48fbbe067d3e35a64fdb50c10cb8c1252bcde6e924';

/**
 * Convert audio file to base64 string
 * @param {File} file - Audio file object
 * @returns {Promise<string>} Base64 encoded audio string
 */
export const convertAudioToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove the data URL prefix to get just the base64 string
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Convert audio blob to base64 string
 * @param {Blob} blob - Audio blob object
 * @returns {Promise<string>} Base64 encoded audio string
 */
export const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Generate audio using DiffRhythm API
 * @param {Object} params - API parameters
 * @param {string} params.lyrics - Timestamped lyrics
 * @param {string} params.stylePrompt - Style description (e.g., "pop", "rock")
 * @param {string} params.styleAudio - Base64 encoded reference audio (optional)
 * @param {string} params.taskType - "txt2audio-base" or "txt2audio-full"
 * @param {string} params.apiKey - Your API key
 * @param {Object} params.webhookConfig - Webhook configuration (optional)
 * @returns {Promise<Object>} API response
 */
export const generateAudio = async ({
    lyrics = '',
    stylePrompt = 'pop',
    styleAudio = '',
    taskType = 'txt2audio-base',
    webhookConfig = { endpoint: '', secret: '' }
}) => {
    try {
        const requestBody = {
            model: 'Qubico/diffrhythm',
            task_type: taskType,
            input: {
                lyrics: lyrics,
                style_prompt: stylePrompt,
                style_audio: styleAudio
            },
            config: {
                webhook_config: webhookConfig
            }
        };

        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        };

        console.log('Sending request to DiffRhythm API:', {
            url: `${API_BASE_URL}${API_ENDPOINT}`,
            body: requestBody,
            headers: headers
        });

        const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        return {
            success: true,
            data: data.data || data // Handle nested data structure
        };

    } catch (error) {
        console.error('Error calling DiffRhythm API:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Format lyrics with timestamps
 * @param {string} rawLyrics - Raw lyrics text
 * @returns {string} Formatted lyrics with timestamps
 */
export const formatLyricsWithTimestamps = (rawLyrics) => {
    if (!rawLyrics.trim()) return '';
    
    const lines = rawLyrics.split('\n').filter(line => line.trim());
    let formattedLyrics = '';
    
    lines.forEach((line, index) => {
        // Calculate timestamps (starting at 10 seconds, 7 seconds apart)
        const minutes = Math.floor((10 + index * 7) / 60);
        const seconds = (10 + index * 7) % 60;
        const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.00]`;
        formattedLyrics += `${timestamp} ${line.trim()}\n`;
    });
    
    return formattedLyrics.trim();
};

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} Whether the API key appears valid
 */
export const validateApiKey = (apiKey) => {
    return apiKey && apiKey.length > 10 && typeof apiKey === 'string';
};

/**
 * Get task status and results
 * @param {string} taskId - Task ID returned from generateAudio
 * @returns {Promise<Object>} Task status and results
 */
export const getTaskStatus = async (taskId) => {
    try {
        const headers = {
            'X-API-Key': API_KEY
        };

        console.log(`Checking task status for: ${taskId}`);

        const response = await fetch(`${API_BASE_URL}/api/v1/task/${taskId}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Task status request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Task Status Response:', data);
        
        return {
            success: true,
            data: data.data || data // Handle nested data structure
        };

    } catch (error) {
        console.error('Error checking task status:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Poll task status until completion or timeout
 * @param {string} taskId - Task ID to poll
 * @param {Function} onUpdate - Callback for status updates
 * @param {number} maxAttempts - Maximum polling attempts (default: 60)
 * @param {number} intervalMs - Polling interval in milliseconds (default: 5000)
 * @returns {Promise<Object>} Final task result
 */
export const pollTaskStatus = async (taskId, onUpdate = () => {}, maxAttempts = 60, intervalMs = 5000) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        
        try {
            const result = await getTaskStatus(taskId);
            
            if (!result.success) {
                onUpdate({
                    status: 'error',
                    message: `Error checking status: ${result.error}`,
                    attempts
                });
                return result;
            }

            const taskData = result.data;
            const status = taskData.status;
            
            console.log(`Polling attempt ${attempts}: Status = ${status}`, taskData);
            
            onUpdate({
                status: status,
                message: `Attempt ${attempts}/${maxAttempts} - Status: ${status}`,
                attempts,
                taskData
            });

            // Check if task is completed
            if (status === 'completed') {
                // Check for audio URL in output.audio_url (DiffRhythm format)
                if (taskData.output && taskData.output.audio_url) {
                    return {
                        success: true,
                        completed: true,
                        audioUrl: taskData.output.audio_url,
                        taskData: taskData
                    };
                }
                
                // Fallback: Extract the generated audio URL from works array (other APIs)
                const works = taskData.works || [];
                const audioWork = works.find(work => 
                    work.contentType === 'audio' || 
                    (work.resource && (work.resource.resource || work.resource.resourceWithoutWatermark))
                );
                
                if (audioWork && audioWork.resource) {
                    const audioUrl = audioWork.resource.resourceWithoutWatermark || audioWork.resource.resource;
                    return {
                        success: true,
                        completed: true,
                        audioUrl: audioUrl,
                        taskData: taskData
                    };
                }
                
                // Alternative: Check if there's an output field with direct audio URL string
                if (taskData.output && typeof taskData.output === 'string' && taskData.output.startsWith('http')) {
                    return {
                        success: true,
                        completed: true,
                        audioUrl: taskData.output,
                        taskData: taskData
                    };
                }
                
                return {
                    success: true,
                    completed: true,
                    message: 'Task completed but no audio URL found in response',
                    taskData: taskData
                };
            }
            
            // Check for failed status
            if (status === 'failed' || status === 'error') {
                return {
                    success: false,
                    completed: true,
                    error: taskData.error?.message || 'Task failed',
                    taskData: taskData
                };
            }

            // Wait before next poll
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
            
        } catch (error) {
            onUpdate({
                status: 'error',
                message: `Polling error: ${error.message}`,
                attempts
            });
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }
    
    // Timeout reached
    return {
        success: false,
        completed: false,
        error: 'Polling timeout - task may still be processing',
        timeout: true
    };
};

/**
 * Get estimated cost for generation
 * @param {string} taskType - Task type
 * @returns {Object} Cost and duration information
 */
export const getGenerationInfo = (taskType) => {
    const info = {
        'txt2audio-base': {
            duration: '1.35 min',
            cost: '$0.02'
        },
        'txt2audio-full': {
            duration: '4.45 min',
            cost: '$0.02'
        }
    };
    
    return info[taskType] || info['txt2audio-base'];
};

/**
 * Get estimated cost for image generation
 * @returns {Object} Cost information for Flux image generation
 */
export const getImageGenerationInfo = () => {
    return {
        model: 'Qubico/flux1-dev',
        cost: '$0.025',
        size: '1024x1024'
    };
};

/**
 * Generate album cover image using Flux API
 * @param {Object} params - API parameters
 * @param {string} params.musicStyle - Music style/genre
 * @param {string} params.lyrics - Song lyrics (optional)
 * @returns {Promise<Object>} API response with task_id
 */
export const generateAlbumCover = async ({
    musicStyle = 'pop',
    lyrics = ''
}) => {
    try {
        // Construct prompt for album cover generation
        let prompt = `Album cover for a ${musicStyle} song, artistic, professional, high quality, music cover art style.`;
        
        if (lyrics.trim()) {
            // Remove timestamps from lyrics for the prompt
            const cleanLyrics = lyrics.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '').trim();
            // Take first few lines to avoid too long prompt
            const shortLyrics = cleanLyrics.split('\n').slice(0, 3).join(' ').substring(0, 200);
            prompt += ` The song lyrics include: "${shortLyrics}". Reflect the mood and theme of these lyrics.`;
        } else {
            prompt += ` Capture the essence and mood of ${musicStyle} music.`;
        }

        prompt += ` Modern design, vibrant colors, ${musicStyle} aesthetic.`;

        const requestBody = {
            model: 'Qubico/flux1-dev',
            task_type: 'txt2img',
            input: {
                prompt: prompt,
                width: 1024,
                height: 1024,
                guidance_scale: 3.5
            }
        };

        const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        };

        console.log('Sending request to Flux API:', {
            url: `${API_BASE_URL}${API_ENDPOINT}`,
            body: requestBody,
            headers: headers
        });

        const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Flux API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Flux API Response:', data);
        
        // Extract task_id from the response
        const taskId = data.data?.task_id || data.task_id;
        
        return {
            success: true,
            taskId: taskId,
            data: data.data || data
        };

    } catch (error) {
        console.error('Error calling Flux API:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get image generation task status and results
 * @param {string} taskId - Task ID returned from generateAlbumCover
 * @returns {Promise<Object>} Task status and results
 */
export const getImageTaskStatus = async (taskId) => {
    try {
        const headers = {
            'x-api-key': API_KEY
        };

        console.log(`Checking image task status for: ${taskId}`);

        const response = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Image task status request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Image Task Status Response:', data);
        
        return {
            success: true,
            data: data.data || data
        };

    } catch (error) {
        console.error('Error checking image task status:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Poll image generation task status until completion or timeout
 * @param {string} taskId - Task ID to poll
 * @param {Function} onUpdate - Callback for status updates
 * @param {number} maxAttempts - Maximum polling attempts (default: 60)
 * @param {number} intervalMs - Polling interval in milliseconds (default: 5000)
 * @returns {Promise<Object>} Final task result
 */
export const pollImageTaskStatus = async (taskId, onUpdate = () => {}, maxAttempts = 60, intervalMs = 5000) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        
        try {
            const result = await getImageTaskStatus(taskId);
            
            if (!result.success) {
                onUpdate({
                    status: 'error',
                    message: `Error checking image status: ${result.error}`,
                    attempts
                });
                return result;
            }

            const taskData = result.data;
            const status = taskData.status?.toLowerCase() || 'pending';
            
            console.log(`Image polling attempt ${attempts}: Status = ${status}`, taskData);
            
            onUpdate({
                status: status,
                message: `Image attempt ${attempts}/${maxAttempts} - Status: ${status}`,
                attempts,
                taskData
            });

            // Check if task is completed (Flux API uses 'success' status)
            if (status === 'completed' || status === 'success') {
                // Look for image URL in Flux API response format
                let imageUrl = null;
                
                // Check in output field (Flux API format)
                if (taskData.output) {
                    if (typeof taskData.output === 'string' && taskData.output.startsWith('http')) {
                        imageUrl = taskData.output;
                    } else if (taskData.output.image_url) {
                        imageUrl = taskData.output.image_url;
                    } else if (taskData.output.image_urls && taskData.output.image_urls.length > 0) {
                        imageUrl = taskData.output.image_urls[0];
                    }
                }
                
                // Alternative: Check task_result format (some Flux responses)
                if (!imageUrl && taskData.task_result && taskData.task_result.task_output) {
                    if (taskData.task_result.task_output.image_url) {
                        imageUrl = taskData.task_result.task_output.image_url;
                    }
                }
                
                if (imageUrl) {
                    return {
                        success: true,
                        completed: true,
                        imageUrl: imageUrl,
                        taskData: taskData
                    };
                }
                
                return {
                    success: true,
                    completed: true,
                    message: 'Image generation completed but no image URL found in response',
                    taskData: taskData
                };
            }
            
            // Check for failed status
            if (status === 'failed' || status === 'error') {
                return {
                    success: false,
                    completed: true,
                    error: taskData.error?.message || 'Image generation failed',
                    taskData: taskData
                };
            }

            // Wait before next poll
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
            
        } catch (error) {
            onUpdate({
                status: 'error',
                message: `Image polling error: ${error.message}`,
                attempts
            });
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }
    
    // Timeout reached
    return {
        success: false,
        completed: false,
        error: 'Image polling timeout - task may still be processing',
        timeout: true
    };
}; 