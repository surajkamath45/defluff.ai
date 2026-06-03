import { pipeline, env } from '@huggingface/transformers';

// Model ONNX + tokenizer are hosted at the repo root on GitHub.
const MODEL_ID = 'defluff/flan-t5-small';
const MAX_INPUT_CHARS = 2000;

env.allowLocalModels = false;
env.remoteHost = 'https://raw.githubusercontent.com/surajkamath45/brainwash-models/main';
env.remotePathTemplate = '/';

const onnxWasm = env.backends?.onnx?.wasm;
if (onnxWasm) {
  onnxWasm.numThreads = 1;
  onnxWasm.proxy = false;
  onnxWasm.simd = true; 

  const wasmBase = chrome.runtime.getURL('transformers/');
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    onnxWasm.wasmPaths = {
      mjs: wasmBase + 'ort-wasm-simd-threaded.mjs',
      wasm: wasmBase + 'ort-wasm-simd-threaded.wasm',
    };
  } else {
    onnxWasm.wasmPaths = {
      mjs: wasmBase + 'ort-wasm-simd-threaded.asyncify.mjs',
      wasm: wasmBase + 'ort-wasm-simd-threaded.asyncify.wasm',
    };
  }
}

let summarizerPipeline = null;

async function getOrCreatePipeline() {
  if (!summarizerPipeline) {
    console.log('[Offscreen AI] Loading flan-t5-small from GitHub...');
    
    summarizerPipeline = await pipeline('summarization', MODEL_ID, {
      quantized: true,
      device: 'wasm',
      // 💡 CRITICAL FIX: Tell ONNX Runtime to drop down to basic graph optimizations.
      // This stops the engine from executing the broken TransposeDQWeights optimization pass.
      session_options: {
        graphOptimizationLevel: 'basic'
      }
    });
    
    console.log('[Offscreen AI] Local NLP engine ready.');
  }
  return summarizerPipeline;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target === 'offscreen' && request.action === 'summarizeText') {
    executeLocalT5(request.text)
      .then(summary => sendResponse({ success: true, summary }))
      .catch(error => {
        console.error('[Offscreen AI] Compilation failure:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; 
  }
});

async function executeLocalT5(text) {
  const modelPipe = await getOrCreatePipeline();
  const input = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
  
  // 💡 FIX 1: Pre-process the text to detect perspective via JavaScript.
  // This keeps the prompt short and natively aligned to Flan-T5's training data.
  const isFirstPerson = /\b(I|me|my|myself|we|our|us)\b/i.test(input);
  
  const promptPrefix = isFirstPerson 
    ? "Write a first-person summary of this announcement: "
    : "Write a summary of this announcement: ";
    
  const contextFirstPrompt = `${promptPrefix}${input}`;

  const result = await modelPipe(contextFirstPrompt, {
    max_new_tokens: 120, 
    num_beams: 1,
    do_sample: false,
    repetition_penalty: 1.6 
  });

  let summary = result[0]?.summary_text?.trim() || '';

  // 💡 FIX 2: THE EXPANDED ANTI-ECHO SANITIZER SHIELD
  // Dynamically scrubs away whichever prompt prefix wrapper was used.
  const promptLeakPatterns = [
    /^write a first-person summary of this announcement:\s*/i,
    /^write a summary of this announcement:\s*/i,
    /^instruction:\s*/i,
    /^task:\s*/i,
    /^text:\s*/i,
    /^summary:\s*/i,
    /^news wire report:\s*/i
  ];
  
  for (const pattern of promptLeakPatterns) {
    summary = summary.replace(pattern, '');
  }

  // Convert verbalized words back to symbols
  summary = summary.replace(/\bhashtag\s*/gi, '#');

  // Clean sentence endings
  if (summary && !/[.!?]$/.test(summary)) {
    const lastPunctuation = Math.max(summary.lastIndexOf('.'), summary.lastIndexOf('!'), summary.lastIndexOf('?'));
    if (lastPunctuation > 0) {
      summary = summary.slice(0, lastPunctuation + 1);
    }
  }

  return summary.trim();
}