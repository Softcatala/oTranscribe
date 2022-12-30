import { localStorage } from "./input";

function closeTips () {
    document.getElementById("tips").style.display = "none";
    localStorage.setItem('oTranscribe-visible-tips', 1);
}

export { closeTips };