#!/usr/bin/env python3
"""
Example usage of the audio_to_base64 module for API calls.
"""

import json
import requests
from audio_to_base64 import audio_to_base64, get_file_info, create_json_payload


def example_api_call(audio_file_path, api_endpoint):
    """
    Example function showing how to use the base64 encoded audio in an API call.
    
    Args:
        audio_file_path (str): Path to the audio file
        api_endpoint (str): API endpoint URL
    """
    try:
        # Convert audio to base64
        print(f"Converting {audio_file_path} to base64...")
        base64_data = audio_to_base64(audio_file_path)
        
        # Get file info
        file_info = get_file_info(audio_file_path)
        
        # Create JSON payload
        payload = create_json_payload(base64_data, file_info)
        
        # Example API call (uncomment and modify for actual use)
        # headers = {
        #     'Content-Type': 'application/json',
        #     'Authorization': 'Bearer YOUR_API_KEY'
        # }
        # 
        # response = requests.post(api_endpoint, json=payload, headers=headers)
        # 
        # if response.status_code == 200:
        #     print("API call successful!")
        #     return response.json()
        # else:
        #     print(f"API call failed: {response.status_code}")
        #     return None
        
        # For demonstration, just print the payload structure
        print("JSON Payload structure:")
        print(json.dumps({
            'audio_data': f"<base64_string_{len(base64_data)}_chars>",
            'encoding': payload['encoding'],
            'metadata': payload['metadata']
        }, indent=2))
        
        return payload
        
    except Exception as e:
        print(f"Error: {e}")
        return None


def example_streaming_api():
    """
    Example for streaming APIs that might need chunked base64 data.
    """
    audio_file = "example_audio.mp3"  # Replace with your audio file
    
    try:
        base64_data = audio_to_base64(audio_file)
        
        # For large files, you might want to chunk the base64 data
        chunk_size = 1000  # Adjust based on API limits
        chunks = [base64_data[i:i+chunk_size] for i in range(0, len(base64_data), chunk_size)]
        
        print(f"Audio file split into {len(chunks)} chunks of {chunk_size} characters each")
        
        # Example of sending chunks (modify for your specific API)
        for i, chunk in enumerate(chunks):
            payload = {
                'chunk_id': i,
                'total_chunks': len(chunks),
                'audio_chunk': chunk,
                'is_final': i == len(chunks) - 1
            }
            
            print(f"Chunk {i+1}/{len(chunks)}: {len(chunk)} characters")
            # Make API call here
            
    except Exception as e:
        print(f"Error: {e}")


def example_direct_usage():
    """
    Example of using the converter directly in your code.
    """
    audio_file = "example_audio.wav"  # Replace with your audio file
    
    try:
        # Simple conversion
        base64_string = audio_to_base64(audio_file)
        
        # Use in your application
        api_data = {
            'user_id': 'user123',
            'audio': base64_string,
            'format': 'wav',
            'action': 'transcribe'
        }
        
        print("Ready for API call with audio data embedded")
        print(f"Payload size: {len(json.dumps(api_data))} characters")
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == '__main__':
    print("Audio to Base64 API Examples")
    print("=" * 40)
    
    # Replace with actual audio file paths for testing
    print("\n1. Basic API Call Example:")
    # example_api_call("your_audio.mp3", "https://api.example.com/audio")
    
    print("\n2. Streaming/Chunked Example:")
    # example_streaming_api()
    
    print("\n3. Direct Usage Example:")
    # example_direct_usage()
    
    print("\nTo run these examples, uncomment the function calls and provide valid audio file paths.") 