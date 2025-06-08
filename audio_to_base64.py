#!/usr/bin/env python3
"""
Audio to Base64 Converter
Converts audio files to base64 encoding for JSON API calls.
"""

import base64
import argparse
import json
import os
import sys
from pathlib import Path


def audio_to_base64(file_path):
    """
    Convert an audio file to base64 encoding.
    
    Args:
        file_path (str): Path to the audio file
        
    Returns:
        str: Base64 encoded string of the audio file
        
    Raises:
        FileNotFoundError: If the audio file doesn't exist
        Exception: If there's an error reading the file
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        
        with open(file_path, 'rb') as audio_file:
            audio_data = audio_file.read()
            base64_encoded = base64.b64encode(audio_data).decode('utf-8')
            return base64_encoded
    
    except Exception as e:
        raise Exception(f"Error processing audio file: {str(e)}")


def get_file_info(file_path):
    """Get basic file information."""
    file_size = os.path.getsize(file_path)
    file_ext = Path(file_path).suffix.lower()
    return {
        'filename': os.path.basename(file_path),
        'extension': file_ext,
        'size_bytes': file_size,
        'size_mb': round(file_size / (1024 * 1024), 2)
    }


def create_json_payload(base64_data, file_info, include_metadata=True):
    """
    Create a JSON payload with the base64 audio data.
    
    Args:
        base64_data (str): Base64 encoded audio data
        file_info (dict): File information
        include_metadata (bool): Whether to include file metadata
        
    Returns:
        dict: JSON payload ready for API calls
    """
    payload = {
        'audio_data': base64_data,
        'encoding': 'base64'
    }
    
    if include_metadata:
        payload['metadata'] = file_info
    
    return payload


def main():
    parser = argparse.ArgumentParser(
        description='Convert audio files to base64 for JSON API calls',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python audio_to_base64.py audio.mp3
  python audio_to_base64.py audio.wav --output json --save result.json
  python audio_to_base64.py audio.mp3 --output base64 --save encoded.txt
  python audio_to_base64.py audio.wav --no-metadata
        """
    )
    
    parser.add_argument('input_file', help='Path to the audio file')
    parser.add_argument('--output', '-o', choices=['base64', 'json'], default='base64',
                       help='Output format: base64 string only or full JSON payload (default: base64)')
    parser.add_argument('--save', '-s', help='Save output to file instead of printing to console')
    parser.add_argument('--no-metadata', action='store_true', 
                       help='Exclude metadata from JSON output')
    parser.add_argument('--pretty', action='store_true', 
                       help='Pretty print JSON output (only applies to JSON format)')
    
    args = parser.parse_args()
    
    try:
        # Validate input file
        if not os.path.exists(args.input_file):
            print(f"Error: File '{args.input_file}' not found.", file=sys.stderr)
            return 1
        
        # Get file info
        file_info = get_file_info(args.input_file)
        print(f"Processing: {file_info['filename']} ({file_info['size_mb']} MB)")
        
        # Convert to base64
        print("Converting to base64...")
        base64_data = audio_to_base64(args.input_file)
        
        # Prepare output
        if args.output == 'json':
            output_data = create_json_payload(
                base64_data, 
                file_info, 
                include_metadata=not args.no_metadata
            )
            
            if args.pretty:
                output_string = json.dumps(output_data, indent=2)
            else:
                output_string = json.dumps(output_data)
        else:
            output_string = base64_data
        
        # Save or print output
        if args.save:
            with open(args.save, 'w') as f:
                f.write(output_string)
            print(f"Output saved to: {args.save}")
        else:
            print("\n" + "="*50)
            print("BASE64 OUTPUT:")
            print("="*50)
            print(output_string)
        
        print(f"\nConversion completed successfully!")
        print(f"Base64 length: {len(base64_data):,} characters")
        
        return 0
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main()) 