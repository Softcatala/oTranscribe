let model = null;
let recognizer = null;
let source = null;
var currentFile = null;
let lastTimestampedMin = 0;
var audioContext = null;

async function stop() {
    console.log("stopping");
    lastTimestampedMin = 0;
    if (model !== null) {
        model.terminate();
        model = null;
    }
    if (recognizer !== null) {
        recognizer.remove();
        recognizer = null;
    }
    /*
    if (source !== null) {
        source.disconnect();
        source = null;
    }
    if (audioContext !== null) {
        await audioContext.close();
        audioContext = null;
    }
    */
}

function autoTimestamp(second) {
    let currentMinute = Math.floor(second / 60);
    if ((currentMinute === 0) || (currentMinute === lastTimestampedMin)) {
        return null;
    }
    lastTimestampedMin = currentMinute;
    let time = {
        formatted: window.formatMilliseconds(second),
        raw: second
    };
    return window.createTimestampEl(time);
}

function onPartialResult(message) {
    const partialContainer = document.getElementById('partial');
    const partial = message.result.partial;
    partialContainer.textContent = partial;
    // console.log("Partial result:", partial);
}

function onResult(message) {
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

        timestamp = autoTimestamp(e["start"]);
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

async function readFromMicro() {  
    await stop();

    const partialContainer = document.getElementById('partial');         
    const modelName = document.getElementById("model").value;
    console.log("Loading model: ", modelName);

    partialContainer.textContent = document.webL10n.get('loadingModel');
    
    const channel = new MessageChannel();
    let modelUrl = new URL("/models/" + modelName, modelsPrefix || window.location);
    model = await Vosk.createModel(modelUrl.href);
    model.registerPort(channel.port1);

    const sampleRate = 48000;
    
    recognizer = new model.KaldiRecognizer(sampleRate);
    recognizer.setWords(true);
    recognizer.on("result", onResult);
    recognizer.on("partialresult", onPartialResult);

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
    
    audioContext = (audioContext === null) ? new AudioContext() : audioContext;
    await audioContext.audioWorklet.addModule('recognizer-processor.js')
    const recognizerProcessor = new AudioWorkletNode(audioContext, 'recognizer-processor', { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 });
    recognizerProcessor.port.postMessage({action: 'init', recognizerId: recognizer.id}, [ channel.port2 ])
    recognizerProcessor.connect(audioContext.destination);
    
    if (source !== null) source.disconnect();

    source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(recognizerProcessor);
}

async function readFromFile(e) {
    if (currentFile === null) {
        const fileNotFoundText = document.webL10n.get('fileNotFound');
        alert(fileNotFoundText);
        return;
    }

    stop();

    const file = currentFile; // e.target.files[0];
    const partialContainer = document.getElementById('partial');
    const audioRef = document.getElementById('audio-ref')
    const modelName = document.getElementById("model").value;
    console.log("Loading ", modelName);

    partialContainer.textContent = document.webL10n.get('loadingModel');
    
    const channel = new MessageChannel();
    let modelUrl = new URL("/models/" + modelName, modelsPrefix || window.location);
    model = await Vosk.createModel(modelUrl.href);
    model.registerPort(channel.port1);

    const sampleRate = 48000;
    recognizer = new model.KaldiRecognizer(sampleRate);
    recognizer.setWords(true);
    recognizer.on("result", onResult);
    recognizer.on("partialresult", onPartialResult);

    // const [audioSource, setAudioSource] = useState<MediaElementAudioSourceNode>();
    const fileUrl = URL.createObjectURL(file);
    const audioPlayer = audioRef; //.current;
    audioPlayer.src = fileUrl;

    audioContext = (audioContext === null) ? new AudioContext() : audioContext;
    const stream_dest = audioContext.createMediaStreamDestination();
    if (source !== null) source.disconnect();
    source = (source === null) ? audioContext.createMediaElementSource(audioPlayer) : source;
    
    await audioContext.audioWorklet.addModule('recognizer-processor.js')
    const recognizerProcessor = new AudioWorkletNode(audioContext, 'recognizer-processor', { channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1 });
    recognizerProcessor.port.postMessage({action: 'init', recognizerId: recognizer.id}, [ channel.port2 ])
    recognizerProcessor.connect(audioContext.destination);

    source.connect(recognizerProcessor);

    audioRef.addEventListener("ended", function() 
    {
        // This dynamically generates a silent sound and appends it at the end of the playing. With this we avoid
        // to abruptly stop the recognition, which was a bug on firefox. When it finishes we stop the recognition
        // process, which keeping it alive was a bug on Chrome.
        audioPlayer.src = createSilentAudio(1, 44100);
        audioPlayer.play();
        audioPlayer.addEventListener("ended", function() {
            recognizer.retrieveFinalResult();
            model.terminate();
        }, {once: true});
    }, { once: true });
}

export { readFromFile, readFromMicro };