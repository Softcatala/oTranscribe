/******************************************
             Initialisation
******************************************/

const $ = require('jquery');
let otrQueryParams = {};

import localStorageManager from 'local-storage-manager';

import { watchFormatting, watchWordCount, initAutoscroll } from './texteditor';
import { getQueryParams } from './input';
import languageSetup from './languages';
import { createPlayer, playerDrivers } from './player/player';
import { bindPlayerToUI, keyboardShortcutSetup } from './ui';
import { activateTimestamps, insertTimestamp, formatMilliseconds, createTimestampEl } from './timestamps';
import { initBackup } from './backup';
import { exportSetup } from './export';
import importSetup from './import';
import viewController from './view-controller';
import { createSilentAudio } from './silent-audio';
import { getTranscriptionFileMeta, getTranscriptionFileURL, getTranscriptionText } from './softcatala'
import { closeTips } from './utils';

export default async function init(){
    initBackup();
    watchFormatting();
    languageSetup();
    activateTimestamps();
    exportSetup();
    importSetup();
    initAutoscroll();

    // this is necessary due to execCommand restrictions
    // see: http://stackoverflow.com/a/33321235
    window.insertTimestamp = insertTimestamp;

    window.formatMilliseconds = formatMilliseconds;
    window.createTimestampEl = createTimestampEl;
    window.activateTimestamps = activateTimestamps;
    window.createSilentAudio = createSilentAudio;
    window.closeTips = closeTips;
    
    keyboardShortcutSetup();

    viewController.set('editor');

    $('.settings-button').on('click', () => {
        if (viewController.is('settings')) {
            viewController.set('editor');
        } else {
            viewController.set('settings');
        }
    });

    $('.fullscreen-button').on('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            $('#otranscribe-panel').get(0).requestFullscreen();
        }
    });


    // Gather query parameters into an object
    otrQueryParams = getQueryParams();
    if (otrQueryParams['uuid']) {
        const uuid = otrQueryParams['uuid'];
        
        let text = "";
        try {
            text = await getTranscriptionText(uuid);
        } catch (e) {
            console.log("error")
            return;
        }
        localStorageManager.removeItem("oT-lastfile");
        localStorageManager.removeItem("autosave"); 

        document.getElementById('textbox').replaceChildren(text);
        watchWordCount();

        try {
            const fileMeta = await getTranscriptionFileMeta(uuid);
            const fileName = fileMeta.name || uuid;
            window.transcribedFileName = fileName.replace(/\.[^/.]+$/, "");
            await createPlayer({
                driver: fileMeta.type.indexOf('video') > -1 ? playerDrivers.HTML5_VIDEO : playerDrivers.HTML5_AUDIO,
                source: getTranscriptionFileURL(uuid),
                name: fileName
            });
            $('.topbar').removeClass('inputting');
            bindPlayerToUI(fileName);
            activateTimestamps();
        } catch (error) {
            console.error(error);
        }
    }
}

$(window).resize(function() {
    if (document.getElementById('media') ) {
        document.getElementById('media').style.width = oT.media.videoWidth();
    }
});

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        document.getElementById('fullscreen-icon').className = "fa fa-compress";
    } else {
        document.getElementById('fullscreen-icon').className = "fa fa-expand";
    }
}, false);


