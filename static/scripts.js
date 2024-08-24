document.addEventListener('DOMContentLoaded', () => {
    const startRecordingButton = document.getElementById('start-recording');
    const stopRecordingButton = document.getElementById('stop-recording');
    const languageInput = document.getElementById('language');
    const form = document.getElementById('form');
    const loadingDiv = document.getElementById('loading');
    const originalTextDiv = document.getElementById('original-text');
    const translatedTextDiv = document.getElementById('translated-text');
    const correctedTextDiv = document.getElementById('corrected-text');
    const enhancedPromptDiv = document.getElementById('enhanced-prompt');
    const langButtons = document.querySelectorAll('.lang-btn');
    const bottomTextInput = document.getElementById('bottom-text-input');

    let mediaRecorder;
    let audioChunks = [];

    // Language button click event
    langButtons.forEach(button => {
        button.addEventListener('click', () => {
            langButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            languageInput.value = button.getAttribute('data-lang');
        });
    });

    // Start recording button click event
    startRecordingButton.addEventListener('click', async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support audio recording.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.onstart = () => {
                audioChunks = [];
                startRecordingButton.disabled = true;
                stopRecordingButton.disabled = false;
            };

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio_file', audioBlob, 'audio.webm');
                formData.append('input_type', 'microphone');
                formData.append('language', languageInput.value);

                loadingDiv.style.display = 'block';
                originalTextDiv.innerHTML = '';
                translatedTextDiv.innerHTML = '';
                correctedTextDiv.innerHTML = '';
                enhancedPromptDiv.innerHTML = '';

                const response = await fetch('/process', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                loadingDiv.style.display = 'none';

                if (result.error) {
                    originalTextDiv.innerHTML = `<strong>Error:</strong> ${result.error}`;
                } else {
                    originalTextDiv.innerHTML = `<strong>Original Text:</strong> ${result.original_text}`;
                    translatedTextDiv.innerHTML = `<strong>Translated Text:</strong> ${result.translated_text}`;
                    correctedTextDiv.innerHTML = `<strong>Corrected Text:</strong> ${result.corrected_text}`;

                    const enhanceResponse = await fetch('/enhance-prompt', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ corrected_text: result.corrected_text })
                    });

                    const enhanceResult = await enhanceResponse.json();
                    if (enhanceResult.error) {
                        enhancedPromptDiv.innerHTML = `<strong>Error:</strong> ${enhanceResult.error}`;
                    } else {
                        enhancedPromptDiv.innerHTML = `<strong>Enhanced Prompt:</strong> ${enhanceResult.enhanced_prompt}`;
                    }
                }

                startRecordingButton.disabled = false;
                stopRecordingButton.disabled = true;
            };

            mediaRecorder.start();
        } catch (error) {
            console.error('Error accessing audio devices:', error);
        }
    });

    // Stop recording button click event
    stopRecordingButton.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        } else {
            alert('No recording in progress.');
        }
    });

    // Form submission event
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const formData = new FormData(form);
        const textInputValue = bottomTextInput.value.trim();

        if (textInputValue === '') {
            alert('Please enter some text.');
            return;
        }

        formData.append('input_type', 'text');
        formData.append('text_input', textInputValue);
        loadingDiv.style.display = 'block';
        originalTextDiv.innerHTML = '';
        translatedTextDiv.innerHTML = '';
        correctedTextDiv.innerHTML = '';
        enhancedPromptDiv.innerHTML = '';

        const response = await fetch('/process', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        loadingDiv.style.display = 'none';

        if (result.error) {
            originalTextDiv.innerHTML = `<strong>Error:</strong> ${result.error}`;
        } else {
            originalTextDiv.innerHTML = `<strong>Original Text:</strong> ${result.original_text}`;
            translatedTextDiv.innerHTML = `<strong>Translated Text:</strong> ${result.translated_text}`;
            correctedTextDiv.innerHTML = `<strong>Corrected Text:</strong> ${result.corrected_text}`;

            const enhanceResponse = await fetch('/enhance-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ corrected_text: result.corrected_text })
            });

            const enhanceResult = await enhanceResponse.json();
            if (enhanceResult.error) {
                enhancedPromptDiv.innerHTML = `<strong>Error:</strong> ${enhanceResult.error}`;
            } else {
                enhancedPromptDiv.innerHTML = `<strong>Enhanced Prompt:</strong> ${enhanceResult.enhanced_prompt}`;
            }
        }
    });
});
