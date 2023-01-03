
export class VoskController {
    model = null;
    recognizer = null;
    source = null;
    currentFile = null;
    lastTimestampedMin = 0;
    audioContext = null;
    

    stop() {
        console.log("stopping");
        this.lastTimestampedMin = 0;
        if (this.model !== null) {
            this.model.terminate();
            this.model = null;
        }
        if (this.recognizer !== null) {
            this.recognizer.remove();
            this.recognizer = null;
        }
    }

    autoTimestamp(second) {
        let currentMinute = Math.floor(second / 60);
        if ((currentMinute === 0) || (currentMinute === this.lastTimestampedMin)) {
            return null;
        }
        this.lastTimestampedMin = currentMinute;
        let time = {
            formatted: window.formatMilliseconds(second),
            raw: second
        };
        return window.createTimestampEl(time);
    }

    onPartialResult(message) {
        const partialContainer = document.getElementById('partial');
        const partial = message.result.partial;
        partialContainer.textContent = partial;
        // console.log("Partial result:", partial);
    }

    onResult(message) {
        const partialContainer = document.getElementById('partial');
        const resultsContainer = document.getElementById('textbox');
        const grayValues = "0123456789ABCDEF";
        const space = document.createTextNode("\u00A0");
        let timestamp = null;
        
        const result = message.result;
        if (result.text === "") {
            return;
        }
        // console.log("Result:", message.result);
        result.result.forEach( (e) => {
            var idx = (14 - Math.round(e.conf * 14)) + 2;
            var chr = grayValues[idx];
            const newSpan = document.createElement('span');
            newSpan.textContent = e.word + " ";
            newSpan.title = e.conf;
            newSpan.style.cssText = `color: #${chr}${chr}${chr};`
            newSpan.dataset.meta = JSON.stringify(e);

            timestamp = this.autoTimestamp(e["start"]);
            if (timestamp !== null) {
                const newParagraph = document.createElement('p');
                newParagraph.append(document.createElement('br'));
                newParagraph.append(timestamp);
                resultsContainer.insertAdjacentElement("beforeend", newParagraph);
                activateTimestamps();
            }

            resultsContainer.insertAdjacentElement("beforeend", newSpan);
        });
        partialContainer.textContent = "";
    }

    async readFromMicro() {  
        await this.stop();

        const partialContainer = document.getElementById('partial');         
        const modelName = document.getElementById("model").value;
        console.log("Loading model: ", modelName);

        partialContainer.textContent = document.webL10n.get('loadingModel');
        
        const channel = new MessageChannel();
        let modelUrl = new URL("/models/" + modelName, modelsPrefix || window.location);
        model = await Vosk.createModel(modelUrl.href);
        model.registerPort(channel.port1);

        const sampleRate = 48000;
        
        this.recognizer = new model.KaldiRecognizer(sampleRate);
        this.recognizer.setWords(true);
        this.recognizer.on("result", this.onResult.bind(this));
        this.recognizer.on("partialresult", this.onPartialResult.bind(this));

        partialContainer.textContent = "Ready";
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                channelCount: 1,
                sampleRate
            },
        });
        
        this.audioContext = (this.audioContext === null) ? new AudioContext() : this.audioContext;
        await this.audioContext.audioWorklet.addModule('recognizer-processor.js')
        const recognizerProcessor = new AudioWorkletNode(this.audioContext, 'recognizer-processor', { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 });
        recognizerProcessor.port.postMessage({action: 'init', recognizerId: this.recognizer.id}, [ channel.port2 ])
        recognizerProcessor.connect(this.audioContext.destination);
        
        if (this.source !== null) this.source.disconnect();

        this.source = this.audioContext.createMediaStreamSource(mediaStream);
        this.source.connect(recognizerProcessor);
    }

    async readFromFile() {

        if (this.currentFile === null) {
            const fileNotFoundText = document.webL10n.get('fileNotFound');
            alert(fileNotFoundText);
            return;
        }

        this.stop();

        const partialContainer = document.getElementById('partial');
        const audioRef = document.getElementById('audio-ref')
        const modelName = document.getElementById("model").value;
        console.log("Loading ", modelName);

        partialContainer.textContent = document.webL10n.get('loadingModel');
        
        const channel = new MessageChannel();
        let modelUrl = new URL("/models/" + modelName, modelsPrefix || window.location);
        this.model = await Vosk.createModel(modelUrl.href);
        this.model.registerPort(channel.port1);

        const sampleRate = 48000;
        this.recognizer = new this.model.KaldiRecognizer(sampleRate);
        this.recognizer.setWords(true);
        this.recognizer.on("result", this.onResult.bind(this));
        this.recognizer.on("partialresult", this.onPartialResult.bind(this));

        // const [audioSource, setAudioSource] = useState<MediaElementAudioSourceNode>();
        const fileUrl = URL.createObjectURL(this.currentFile);
        const audioPlayer = audioRef; //.current;
        audioPlayer.src = fileUrl;

        this.audioContext = (this.audioContext === null) ? new AudioContext() : this.audioContext;
        const stream_dest = this.audioContext.createMediaStreamDestination();
        if (this.source !== null) this.source.disconnect();
        this.source = (this.source === null) ? this.audioContext.createMediaElementSource(audioPlayer) : this.source;
        
        await this.audioContext.audioWorklet.addModule('recognizer-processor.js')
        const recognizerProcessor = new AudioWorkletNode(this.audioContext, 'recognizer-processor', { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 });
        recognizerProcessor.port.postMessage({action: 'init', recognizerId: this.recognizer.id}, [ channel.port2 ])
        recognizerProcessor.connect(this.audioContext.destination);

        this.source.connect(recognizerProcessor);

        audioRef.addEventListener("ended", () => 
        {
            // This dynamically generates a silent sound and appends it at the end of the playing. With this we avoid
            // to abruptly stop the recognition, which was a bug on firefox. When it finishes we stop the recognition
            // process, which keeping it alive was a bug on Chrome.
            audioPlayer.src = createSilentAudio(1, 44100);
            audioPlayer.play();
            audioPlayer.addEventListener("ended", () => {
                this.recognizer.retrieveFinalResult();
                this.model.terminate();
            }, {once: true});
        }, { once: true });
    }

    setFile(file) {
        this.currentFile = new File([file], "voskaudio", { type: file.type });
    }

}