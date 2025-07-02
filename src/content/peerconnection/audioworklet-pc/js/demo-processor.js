class DemoProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0]; // Assuming one input from PeerConnection
    const output = outputs[0];
    if (input.length === 0 || output.length === 0) {
      return true; // No input, no output
    }
  
    for (let channel = 0; channel < output.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < inputChannel.length; ++i) {
        outputChannel[i] = channel == 0? (Math.random() * 2 - 1) * 0.1 : inputChannel[i]; // Example: pass-through audio
      }
    }

    return true;
  }
}

registerProcessor("demo-processor", DemoProcessor);