import localStorageManager from 'local-storage-manager';

function closeTips () {
    document.getElementById("tips").style.display = "none";
    localStorageManager.setItem('oTranscribe-visible-tips', 1);
}

export { closeTips };