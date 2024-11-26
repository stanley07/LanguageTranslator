document.addEventListener('DOMContentLoaded', () => {
  const translateButton = document.getElementById('translateButton');
  const inputText = document.getElementById('inputText');
  const outputText = document.getElementById('outputText');
  const statusMessage = document.getElementById('statusMessage');
  const resetButton = document.getElementById('resetButton');

  let sourceLanguage = 'auto';
  let targetLanguage = 'en';

  // Load saved preferences
  chrome.storage.sync.get(['sourceLanguage', 'targetLanguage'], (result) => {
    if (result.sourceLanguage) {
      sourceLanguage = result.sourceLanguage;
      // Update your UI to reflect the saved source language
    }
    if (result.targetLanguage) {
      targetLanguage = result.targetLanguage;
      // Update your UI to reflect the saved target language
    }
  });

  // Save preferences function
  function savePreferences() {
    chrome.storage.sync.set({ sourceLanguage, targetLanguage }, () => {
      console.log('Preferences saved.');
    });
  }

  // Source Language Dropdown
  const sourceLanguageButton = document.getElementById('sourceLanguageButton');
  const sourceLanguageDropdown = document.getElementById('sourceLanguageDropdown');
  const moreSourceLanguages = document.getElementById('moreSourceLanguages');
  const additionalSourceLanguages = document.getElementById('additionalSourceLanguages');

  sourceLanguageButton.addEventListener('click', () => {
    sourceLanguageDropdown.classList.toggle('show');
  });

  sourceLanguageDropdown.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && e.target !== moreSourceLanguages) {
      sourceLanguage = e.target.getAttribute('data-lang');
      sourceLanguageButton.textContent = e.target.textContent;
      sourceLanguageDropdown.classList.remove('show');
      savePreferences(); // Save preference
    }
  });

  moreSourceLanguages.addEventListener('click', () => {
    additionalSourceLanguages.style.display = 'block';
    moreSourceLanguages.style.display = 'none';
  });

  // Target Language Dropdown
  const targetLanguageButton = document.getElementById('targetLanguageButton');
  const targetLanguageDropdown = document.getElementById('targetLanguageDropdown');
  const moreTargetLanguages = document.getElementById('moreTargetLanguages');
  const additionalTargetLanguages = document.getElementById('additionalTargetLanguages');

  targetLanguageButton.addEventListener('click', () => {
    targetLanguageDropdown.classList.toggle('show');
  });

  targetLanguageDropdown.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' && e.target !== moreTargetLanguages) {
      targetLanguage = e.target.getAttribute('data-lang');
      targetLanguageButton.textContent = e.target.textContent;
      targetLanguageDropdown.classList.remove('show');
      savePreferences(); // Save preference
    }
  });

  moreTargetLanguages.addEventListener('click', () => {
    additionalTargetLanguages.style.display = 'block';
    moreTargetLanguages.style.display = 'none';
  });

  // Close dropdowns if clicked outside
  window.addEventListener('click', (e) => {
    if (!sourceLanguageButton.contains(e.target) && !sourceLanguageDropdown.contains(e.target)) {
      sourceLanguageDropdown.classList.remove('show');
    }
    if (!targetLanguageButton.contains(e.target) && !targetLanguageDropdown.contains(e.target)) {
      targetLanguageDropdown.classList.remove('show');
    }
  });

  translateButton.addEventListener('click', async () => {
    const textToTranslate = inputText.value.trim();

    if (textToTranslate) {
      try {
        statusMessage.textContent = 'Translating...';
        const translatedText = await translateText(textToTranslate, sourceLanguage, targetLanguage);
        outputText.textContent = translatedText;
        statusMessage.textContent = 'Translation successful.';
      } catch (error) {
        console.error('Translation error:', error);
        outputText.textContent = '';
        statusMessage.textContent = `Error: ${error.message}`;
      }
    } else {
      statusMessage.textContent = 'Please enter text to translate.';
      outputText.textContent = '';
    }
  });

  // Reset preferences to default
  resetButton.addEventListener('click', () => {
    sourceLanguage = 'auto';
    targetLanguage = 'en';
    chrome.storage.sync.clear(() => {
      console.log('Preferences reset to default.');
      // Update your UI to reflect the default settings
    });
  });
});

async function translateText(text, sourceLang, targetLang) {
  if ('translation' in self && 'createTranslator' in self.translation) {
    const parameters = {
      sourceLanguage: sourceLang === 'auto' ? await detectLanguage(text) : sourceLang,
      targetLanguage: targetLang
    };

    const modelState = await translation.canTranslate(parameters);
    if (modelState === 'no') {
      throw new Error('Translation model not available for this language pair.');
    }

    const translator = await translation.createTranslator(parameters);

    if (modelState === 'after-download') {
      translator.ondownloadprogress = (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percentage = (loaded / total) * 100;
        document.getElementById('statusMessage').textContent = `Downloading model: ${percentage.toFixed(2)}%`;
      };
      await translator.ready;
      document.getElementById('statusMessage').textContent = 'Model downloaded. Translating...';
    }

    const result = await translator.translate(text);
    if (!result) {
      throw new Error('Translation failed.');
    }
    return result;
  } else {
    throw new Error('Translation API not supported in this browser.');
  }
}

async function detectLanguage(text) {
  if ('languageDetector' in self && 'detect' in self.languageDetector) {
    const detector = await languageDetector.create();
    const detectedLanguages = await detector.detect(text);
    if (detectedLanguages.length > 0) {
      return detectedLanguages[0].language;
    } else {
      throw new Error('Unable to detect language.');
    }
  } else {
    throw new Error('Language Detection API not supported in this browser.');
  }
}
