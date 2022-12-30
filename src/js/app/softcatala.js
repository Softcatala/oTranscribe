import { convertTimestampToSeconds, createTimestampEl } from "./timestamps";

const SC_BASE_URL = "https://api.softcatala.org/transcribe-service/v1/get_file/"

function parseSubtitleFormat(rawSrt) {
    let parsedSrt = document.createElement('p');
    const entries = rawSrt.split("\n\n");
    for (const entry of entries) {
        const data = entry.split("\n");
        if (!entry || data.length < 3) {
            continue;
        }
        const startTime = data[1].substring(0,8);
        const startTimeSeconds = convertTimestampToSeconds(startTime);
        const timestampEl = createTimestampEl({
            formatted: startTime,
            raw: startTimeSeconds
        });
        parsedSrt.appendChild(timestampEl);
        const textEl = document.createElement('span');
        textEl.innerText = data[2];
        parsedSrt.appendChild(textEl);
        parsedSrt.appendChild(document.createElement('br'));
    }
    return parsedSrt;
}

async function getTranscriptionText(uuid) {
    const response = await fetch( `${SC_BASE_URL}?uuid=${uuid}&ext=srt` , {
        method: 'GET'
    });
    const text = await response.text();
    return parseSubtitleFormat(text);
}

async function getTranscriptionFile(uuid) {
    const response = await fetch( `${SC_BASE_URL}?uuid=${uuid}&ext=bin` , {
        method: 'GET'
    });
    const fileBlob = await response.arrayBuffer();

    const contentDisposition = response.headers['content-disposition'];
    const fileExtensionRegexResult = /file\.(\w{3})/.exec(contentDisposition);
    let fileExtension = undefined;
    let fileType = "audio/mp3";

    if (fileExtensionRegexResult && fileExtensionRegexResult.length > 1) {
        fileExtension = fileExtensionRegexResult[1];
    }

    if (["mp3", "ogg", "wav"].includes(fileExtension)) {
        fileType = "audio/" + fileExtension;
    } else if (fileExtension == "mp4") {
        fileType = "video/mp4";
    } else {
        fileType = "unknown";
    }

    const loadedFile = new File([fileBlob], `${uuid}.${fileExtension}`, { type: fileType});
    return loadedFile;
}

export { getTranscriptionFile, getTranscriptionText };