/******************************************
             Initialisation
******************************************/

const $ = require('jquery');
let otrQueryParams = {};

import localStorageManager from 'local-storage-manager';

import { watchFormatting, watchWordCount, initAutoscroll } from './texteditor';
import { inputSetup, getQueryParams, hide as inputHide } from './input';
import languageSetup from './languages';
import { createPlayer, playerDrivers, getPlayer, isVideoFormat } from './player/player';
import { bindPlayerToUI, keyboardShortcutSetup } from './ui';
import { activateTimestamps, insertTimestamp, convertTimestampToSeconds, formatMilliseconds, createTimestampEl } from './timestamps';
import { initBackup } from './backup';
import { exportSetup } from './export';
import importSetup from './import';
import viewController from './view-controller';
import { createSilentAudio } from './silent-audio';
import { getTranscriptionFileType, getTranscriptionFileURL, getTranscriptionText, patchUI } from './softcatala'
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
            const fileType = await getTranscriptionFileType(uuid);
            console.log(fileType);
            await createPlayer({
                driver: fileType.indexOf('video') > -1 ? playerDrivers.HTML5_VIDEO : playerDrivers.HTML5_AUDIO,
                source: getTranscriptionFileURL(uuid),
                name: uuid
            });
            $('.topbar').removeClass('inputting');
            bindPlayerToUI(uuid);
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


