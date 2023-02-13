import { convertTimestampToSeconds, createTimestampEl } from "./timestamps";

const $ = require('jquery');

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
        parsedSrt.insertAdjacentText('beforeend', ' ')
        parsedSrt.insertAdjacentText('beforeend', data[2])
        parsedSrt.appendChild(document.createElement('br'));
    }
    return parsedSrt;
}

export async function getTranscriptionText(uuid) {
    const response = await fetch( `${SC_BASE_URL}?uuid=${uuid}&ext=srt` , {
        method: 'GET'
    });
    
    if (response.status !== 200) {
        return "Error carregant l'arxiu";
    }

    const text = await response.text();
    
    return parseSubtitleFormat(text);
}

export function getTranscriptionFileURL(uuid) {
    return `${SC_BASE_URL}?uuid=${uuid}&ext=bin`;
}

function getFilename(contentDisposition) {
    const filenameRegexResult = /filename=(.*)$/.exec(contentDisposition);
    let filename = undefined;

    if (filenameRegexResult && filenameRegexResult.length > 1) {
        filename = filenameRegexResult[1];
    }

    return filename;
}

export async function getTranscriptionFileMeta(uuid) {
    const response = await fetch( getTranscriptionFileURL(uuid) , {
        method: 'HEAD'
    });

    const contentDisposition = response.headers.get('content-disposition');
    const contentType = response.headers.get('content-type');
    
    return {
        "type": contentType,
        "name": getFilename(contentDisposition)
    }
}

export async function getTranscriptionFile(uuid) {
    const response = await fetch( getTranscriptionFileURL(uuid) , {
        method: 'GET'
    });
    const fileBlob = await response.arrayBuffer();

    const contentDisposition = response.headers['content-disposition'];
    
    const fileType = getFileType(contentDisposition);

    const loadedFile = new File([fileBlob], `${uuid}`, { type: fileType});
    return loadedFile;
}

export function patchUI() {
    $('.help-title').hide();
    $('.language-title').hide();
    document.getElementsByClassName('title')[0].outerHTML = document.getElementsByClassName('title')[0].outerHTML;
}