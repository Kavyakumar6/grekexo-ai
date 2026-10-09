# Grekexo AI — phone-first prototype

A responsive, installable-style web app with a study-first assistant persona, OpenAI API connection, recent chat history, dark/light theme, optional voice input, and read-aloud.

## Files
- `index.html` — app layout and settings dialog.
- `styles.css` — responsive mobile/desktop design and dark/light themes.
- `app.js` — chat UI, local history, voice features, and OpenAI API request.
- `logo.svg` — original Grekexo mark.
- `manifest.json` — PWA metadata.
- `service-worker.js` — caches the app shell for repeat visits (API still needs internet).

## Run it on your phone
1. Extract the ZIP.
2. For a quick layout-only preview, open `index.html` in a browser. Some browser security rules can limit microphone/PWA features when opened as a local file.
3. For the full browser test, upload the extracted files to a **private** GitHub repository and use GitHub Pages, or use another static HTTPS host. GitHub Pages sites are public by default unless your plan/repository setup supports private Pages—do not put your API key in files or commits.
4. Open the HTTPS site in Chrome on your phone.
5. Tap ⚙ → paste your **new** OpenAI API key → Save settings. The key stays in the current tab's JavaScript memory and is not stored in project files or local storage. If you reload or close the tab, enter it again.
6. Send a test message such as “Explain electric current for Class 12 in Hinglish.”

## API and cost notes
- This prototype sends requests directly from the browser to `https://api.openai.com/v1/chat/completions`.
- This is **not safe for a public production app**: browser-based API calls expose the key to the browser session and can be inspected by someone using that device. A production app should use a backend/serverless function to protect the key and apply authentication, rate limits, and spending controls.
- ChatGPT subscription/free access does not automatically provide OpenAI API credits. Check API billing, usage, and limits in your OpenAI Platform account.
- The selected model must be available to your API project. If the model fails, check the API error shown in the chat and select a model enabled for your account.
- Do not reuse any key that was pasted into a chat or public repository. Revoke it and create a fresh one.

## Chat history and privacy
- Chat history is saved in the browser's local storage on that device. It is not synced between devices and may be lost if site data is cleared.
- Do not use this prototype for passwords, private documents, or highly sensitive information.
- The voice button uses browser speech recognition when supported and requires microphone permission. Read-aloud uses the phone's speech engine.

## Convert to APK
This ZIP is a web app, **not an APK**. The easiest test is the HTTPS web app in Chrome. To create a real Android APK later, wrap the web app using a trusted Android WebView/Capacitor workflow, build it with Android tooling, and keep the API key protected by a backend. A proper APK build generally requires a computer or a cloud build workflow; avoid random “HTML to APK” sites that ask for your API key.
