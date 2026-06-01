# 📰 Defluff AI: The LinkedIn Edition

An on-device, deep-learning Chrome Extension designed to strip corporate hype, toxic positivity, "broetry," and algorithmic engagement traps from your LinkedIn feed—replacing them with dry, objective, 1990s broadsheet news wire clippings. 

Defluff AI completely disables the behavioral feedback loop of social networking. It intercepts incoming posts, extracts raw data using a sandboxed transformer pipeline, wipes out vanity metric counts, and hides all interaction bars.

---

## 🚀 Key Features

* **On-Device NLP Inference:** Powered by `@huggingface/transformers` (v4) running a quantized `flan-t5-small` model entirely inside a Manifest V3 Offscreen Document. No remote cloud servers, no API tokens, and 100% user data privacy.
* **Dopamine De-escalation CSS:** Utilizes native, declarative styling sheets injected at `document_start` to vaporize social reaction counters and engagement option panels (Like, Comment, Share, Send) before they can render or flash on screen.
* **1990s Broadside Aesthetic:** Replaces standard modern timeline typography with an off-white, wood-pulp aged newsprint look featuring text justification, Times New Roman typography, and iconic double-rule classified borders.
* **Dynamic Print Datelines:** Automatically scrapes LinkedIn's relative metadata identifiers (e.g., `2m`, `4h`, `1d`) and programmatically expands them into formal newspaper headers (`📰 DEFLUFFED | 2 mins ago`).
* **Thread-Safe Concurrency Lock:** Implements a global initialization promise state lock in the background service worker layer to securely serialize massive simultaneous stream loads without triggering single-frame offscreen constraint exceptions.
* **Local Content Archival Cache:** Hashes raw text payloads and reads/writes to `chrome.storage.local` to completely bypass redundant deep-learning compiler workloads on previously evaluated cards.

---

## 🏗️ Technical Architecture

The extension separates UI manipulation, routing logic, and machine learning computation to conform to strict Manifest V3 security rules:

```

[ LinkedIn DOM Feed ]
│
├─── (Injected at document_start) ───► [ hide-interact.css ] ──► (Vaporizes Action Elements)
│
└─── (Injected at document_idle)  ───► [ content.js ]
│
(Extracts Post Text & Date)
│
[ background.js ] (Service Worker)
│  ├──► Cache Hit? ──► Return Storage Copy
│  └──► Cache Miss? ──► Lock Creation Promise
▼
[ offscreen.bundle.js ] (ESBuild Compilation)
│
(ONNX Runtime Web - WebAssembly SIMD)
(graphOptimizationLevel: 'basic')
│
▼
[ Local NLP Summary Generated ]

```

### Why This Architecture Exists
1. **Chrome Extension Security Policies:** Chrome explicitly blocks runtime Import Maps and bare module specifiers (`import "@huggingface/transformers"`) inside extensions. We bypass this by compiling our offscreen layers into a unified bundle via `esbuild`.
2. **ONNX Graph Optimization Override:** Modern ONNX Runtime engines (v1.25+) feature a graph fusion pass (`TransposeDQWeightsForMatMulNBits`) that crashes when executing heavily shared scale initializers common in smaller quantized models. Defluff AI forces `graphOptimizationLevel: 'basic'` to suppress this bug while retaining full WebAssembly SIMD hardware acceleration.

---

## 📂 Project Structure

```text
defluff.ai/
├── manifest.json
├── background.js
├── content.js
├── styles.css
├── hide-interact.css
├── offscreen.html
├── offscreen.js
└── offscreen.bundle.js
```

---

## 🛠️ Local Development & Compilation

### Prerequisites

Make sure you have Node.js installed.

### 1. Project Setup

```bash
cd /path/to/your/documents/defluff.ai
npm install @huggingface/transformers onnxruntime-web
```

### 2. Configure the Build Pipeline

```json
"scripts": {
  "build": "mkdir -p transformers && cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded* transformers/ && npx esbuild offscreen.js --bundle --format=esm --outfile=offscreen.bundle.js"
}
```

### 3. Build the Bundle

```bash
npm run build
```

### 4. Install into Chrome

1. Open Chrome and go to chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select defluff.ai/
5. Refresh LinkedIn

---

## 🔒 Data Privacy Declaration

* Zero API Calls
* Zero Third-Party Tracking

---

## 📄 License

MIT License
