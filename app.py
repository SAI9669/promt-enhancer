from flask import Flask, request, render_template, jsonify
import os
import speech_recognition as sr
from googletrans import Translator
import pandas as pd
from transformers import pipeline
from pydub import AudioSegment
import subprocess
import requests  # To make HTTP requests to the Node.js server
import logging


# Set the path to FFmpeg
AudioSegment.ffmpeg = r'C:\Users\sailo\ffmpeg-2024-07-24-git-896c22ef00-full_build\bin\ffmpeg.exe'  # Adjust this path to where FFmpeg is installed

app = Flask(__name__)

# Load the CSV file with language mappings
language_df = pd.read_csv('languages.csv')

# Path for default audio file
DEFAULT_AUDIO_PATH = r'C:\Users\sailo\OneDrive\Desktop\s to t\recorded_audio.wav'

def get_language_code(language_name):
    try:
        language_code = language_df.loc[language_df['language'] == language_name, 'code'].values[0]
        return language_code
    except IndexError:
        return None

def recognize_from_audio_file(audio_file_path, language_code):
    recognizer = sr.Recognizer()
    try:
        with sr.AudioFile(audio_file_path) as source:
            audio_data = recognizer.record(source)
        text = recognizer.recognize_google(audio_data, language=language_code)
        return text
    except Exception as e:
        print(f"Error recognizing speech: {e}")
        return None

def translate_text(text, dest_language='en'):
    translator = Translator()
    try:
        translated = translator.translate(text, dest=dest_language)
        return translated.text
    except Exception as e:
        print(f"Error translating text: {e}")
        return None

def correct_text(text):
    corrector = load_model()
    if not corrector:
        return text
    try:
        corrected = corrector(text, max_new_tokens=512, num_beams=4, early_stopping=True)[0]['generated_text']
        return corrected
    except Exception as e:
        print(f"Error correcting text: {e}")
        return text

def load_model():
    try:
        corrector = pipeline("text2text-generation", model="grammarly/coedit-large")
        return corrector
    except Exception as e:
        print(f"Error loading model: {e}")
        return None

def convert_webm_to_wav(webm_path, wav_path):
    ffmpeg_path = r'C:\Users\sailo\ffmpeg-2024-07-24-git-896c22ef00-full_build\bin\ffmpeg.exe'  # Replace with the actual path to ffmpeg.exe
    command = [
        ffmpeg_path, '-y', '-i', webm_path, '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', wav_path
    ]
    subprocess.run(command, check=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    input_type = request.form.get('input_type')
    result = {'error': None, 'original_text': None, 'translated_text': None, 'corrected_text': None}

    if input_type == 'microphone':
        language_name = request.form.get('language')
        language_code = get_language_code(language_name)
        if language_code:
            audio_file = request.files.get('audio_file')
            if audio_file:
                webm_path = 'recorded_audio.webm'
                wav_path = 'recorded_audio.wav'
                audio_file.save(webm_path)
                convert_webm_to_wav(webm_path, wav_path)
                original_text = recognize_from_audio_file(wav_path, language_code)
                if original_text:
                    result['original_text'] = original_text
                    translated_text = translate_text(original_text, 'en')
                    if translated_text:
                        result['translated_text'] = translated_text
                        corrected_text = correct_text(translated_text)
                        result['corrected_text'] = corrected_text
                    else:
                        result['error'] = 'Translation failed.'
                else:
                    result['error'] = 'Speech recognition failed.'
            else:
                result['error'] = 'No audio file provided.'
        else:
            result['error'] = 'Language not found.'

    elif input_type == 'text':
        original_text = request.form.get('text_input')
        if original_text:
            translated_text = translate_text(original_text, 'en')
            if translated_text:
                corrected_text = correct_text(translated_text)
                result['original_text'] = original_text
                result['translated_text'] = translated_text
                result['corrected_text'] = corrected_text
            else:
                result['error'] = 'Translation failed.'
        else:
            result['error'] = 'No text input provided.'

    else:
        result['error'] = 'Invalid input type.'

    return jsonify(result)

@app.route('/enhance-prompt', methods=['POST'])
def enhance_prompt():
    data = request.get_json()
    corrected_text = data.get('corrected_text')
    
    if not corrected_text:
        return jsonify({'error': 'No corrected text provided.'}), 400
    
    try:
        response = requests.post('http://localhost:3001/enhance-prompt', json={'corrected_text': corrected_text})
        response.raise_for_status()
        enhanced_prompt = response.json().get('enhanced_prompt')
        return jsonify({'enhanced_prompt': enhanced_prompt})
    except requests.RequestException as e:
        return jsonify({'error': f'Failed to enhance prompt: {str(e)}'}), 500

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    app.run(debug=True, port=5010)
