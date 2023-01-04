/******************************************
             Initialisation
******************************************/

const $ = require('jquery');
let otrQueryParams = {};

import localStorageManager from 'local-storage-manager';

import { watchFormatting, watchWordCount, initAutoscroll } from './texteditor';
import { inputSetup, getQueryParams, hide as inputHide } from './input';
import oldBrowserCheck from './old-browsers';
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
import { VoskController } from './vosk-controller';

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
    window.voskController = new VoskController();
    
    keyboardShortcutSetup();

    viewController.set('about');

    $('.title').mousedown(() => {
        if (viewController.is('about')) {
            viewController.set('editor');
        } else {
            viewController.set('about');
        }
    });
    $('.settings-button').mousedown(() => {
        if (viewController.is('settings')) {
            viewController.set('editor');
        } else {
            viewController.set('settings');
        }
    });

    // Gather query parameters into an object
    otrQueryParams = getQueryParams();

    // If the ?v=<VIDEO_ID> parameter is found in the URL, auto load YouTube video
    if ( otrQueryParams['v'] ){
        $('.start').removeClass('ready');
        createPlayer({
            driver: playerDrivers.YOUTUBE,
            source: "https://www.youtube.com/watch?v=" + otrQueryParams.v
        }).then((player) => {
            inputHide();
            viewController.set('editor');
            bindPlayerToUI();
            let timestamp = otrQueryParams['t']; 
            if ( timestamp ){
                // Is the timestamp in HH:MM::SS format?
                if ( ~timestamp.indexOf(":") ){
                    timestamp = convertTimestampToSeconds(timestamp);
                } 
                player.driver._ytEl.seekTo(timestamp);
            }
        });

    } else if (otrQueryParams['uuid']) {
        const uuid = otrQueryParams['uuid'];
        localStorageManager.removeItem("oT-lastfile");
        localStorageManager.removeItem("autosave"); 

        patchUI();
        viewController.set('editor');
        document.getElementById('vosk-controls').style.display = "none";
        inputHide();
        closeTips();

        const text = await getTranscriptionText(uuid);
        document.getElementById('textbox').replaceChildren(text);

        try {
            const fileType = await getTranscriptionFileType(uuid);

            await createPlayer({
                driver: fileType.indexOf('video') > -1 ? playerDrivers.HTML5_VIDEO : playerDrivers.HTML5_AUDIO,
                source: getTranscriptionFileURL(uuid),
                name: uuid
            });
            bindPlayerToUI(uuid);
            activateTimestamps();
        } catch (error) {
            console.error(error);
        }
        inputHide();

    } else {

        if ( localStorageManager.getItem("oT-lastfile") ) {
            viewController.set('editor');
        }
        
    }

    let isVisible = localStorageManager.getItem('oTranscribe-visible-tips');
    isVisible = (isVisible === null) ? true : false; // it's an string
    if (!isVisible) closeTips();
}

// note: this function may run multiple times
function onLocalized() {
    const resetInput = inputSetup({
        create: file => {
            const driver = isVideoFormat(file) ? playerDrivers.HTML5_VIDEO : playerDrivers.HTML5_AUDIO;
		    createPlayer({
		        driver: driver,
		        source: window.URL.createObjectURL(file),
                name: file.name
		    }).then(() => {
                bindPlayerToUI(file.name);
		    });
        },
        createFromURL: url => {
		    createPlayer({
		        driver: playerDrivers.YOUTUBE,
		        source: url
		    }).then(() => {
                bindPlayerToUI();
		    });
        }
    });
    
    watchWordCount();

    var startText = document.webL10n.get('start-ready');
    $('.start')
        // .addClass('ready')
        .toggleClass('ready', !otrQueryParams.v)    // Show 'Loading...' text if a video is to be automatically initialized
        .off()
        .click(() => {
            viewController.set('editor');
        });
    
    $('.reset').off().on('click', () => {
        const player = getPlayer();
        resetInput();
        if (player) {
            player.destroy();
        }
    });
    
    oldBrowserCheck();
    // oT.input.loadPreviousFileDetails();
}

window.addEventListener('localized', onLocalized, false);

$(window).resize(function() {
    if (document.getElementById('media') ) {
        document.getElementById('media').style.width = oT.media.videoWidth();
    }
});


