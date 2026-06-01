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
  
  const contextFirstPrompt = `Text: ${input}\n\nNews wire report:`;

  const result = await modelPipe(contextFirstPrompt, {
    max_new_tokens: 60, 
    num_beams: 1,
    do_sample: false,
    repetition_penalty: 1.5 
  });

  let summary = result[0]?.summary_text?.trim() || '';

  // Clean up any leaked trigger labels
  summary = summary.replace(/^News wire report:\s*/i, '');

  // 💡 FIX: Convert the verbalized word "hashtag" back into the sharp symbol "#"
  // This also eats up any accidental trailing spaces (e.g., "hashtag FutureOfWork" -> "#FutureOfWork")
  summary = summary.replace(/\bhashtag\s*/gi, '#');

  if (summary && !/[.!?]$/.test(summary)) {
    const lastPunctuation = Math.max(summary.lastIndexOf('.'), summary.lastIndexOf('!'), summary.lastIndexOf('?'));
    if (lastPunctuation > 0) {
      summary = summary.slice(0, lastPunctuation + 1);
    }
  }

  return summary;
}