// pcm-processor.js
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const float32Data = input[0];
      // Convert Float32 → Int16 PCM
      const pcm = new Int16Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      // Send to main thread
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true; // keep processor alive
  }
}

registerProcessor("pcm-processor", PCMProcessor);
