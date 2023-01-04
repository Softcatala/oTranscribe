import localStorageManager from 'local-storage-manager';

window.$ = require('jquery');

import 'otinput';

export function inputSetup(opts) {
    
    var input = new oTinput({
        element: '.file-input-outer',
        onFileChange: function(file){
            voskController.setFile(file);
            opts.create(file);
            saveFileDetails(file.name);
            hide();
        },
        onFileError: function(err, file){
            var msg = document.webL10n.get('format-warn');
            msg = msg.replace('[file-format]',file.type.split("/")[1]);
            $('#formats').html(msg).addClass('warning');
        },
        onURLSubmit: function(url){
            input.showURLInput();
            opts.createFromURL(url);
            hide();
        },
        onURLError: function(error){
            var msg = document.webL10n.get('youtube-error');
            $('.ext-input-warning').text(msg).show();
        },
        onDragover: function(){
            $('.file-input-wrapper').addClass('hover');
        },
        onDragleave: function(){
            $('.file-input-wrapper').removeClass('hover');
        },
        text: {
            button: '<i class="fa fa-arrow-circle-o-up"></i>'+document.webL10n.get('choose-file'),
            altButton: document.webL10n.get('choose-youtube'),
            altInputText: document.webL10n.get('youtube-instrux'),
            closeAlt: '<i class="fa fa-times"></i>'
        }
    });    

    // this is a workaround for an iOS bug 
    if (is_iOS()) {
        document
            .querySelector('.file-input-outer input[type="file"]')
            .removeAttribute('accept');
    }
    setFormatsMessage( oTinput.getSupportedFormats() );
    
    
    return function reset() {
        loadPreviousFileDetails();
        show();
    }

}

function is_iOS() {
    return (
        window.navigator.userAgent.indexOf('iPad') > -1 ||
        window.navigator.userAgent.indexOf('iPhone') > -1
    );
}

function setFormatsMessage(formats){
    var text = document.webL10n.get('formats');
    text = text.replace("[xxx]", formats.audio.join('/') );
    text = text.replace("[yyy]", formats.video.join('/') );
    document.getElementById("formats").innerHTML = text;
}

function loadPreviousFileDetails(){
    if ( localStorageManager.getItem("oT-lastfile") ) {
        var lastFile = JSON.parse( localStorageManager.getItem("oT-lastfile") );
        var lastfileText = document.webL10n.get('last-file');
        if (lastFile.name === undefined) {
            document.getElementById("lastfile").innerHTML = lastfileText+' '+lastFile;
        } else if (lastFile.source === '') {
            document.getElementById("lastfile").innerHTML = lastfileText+' '+lastFile.name;
        } else {
            var el = document.getElementById("lastfile");
            el.innerHTML = lastfileText+' <span class="media-reload">'+lastFile.name+'</span>';
            el.addEventListener('click',function(){ 
                processYoutube( lastFile.source );
            });
        }
    }    
}

function saveFileDetails(fileDetails){
    var obj = fileDetails;
    if (typeof file === 'string') {
        obj = {
            name: fileDetails,
            source: ''
        }
    }
    localStorageManager.setItem("oT-lastfile", JSON.stringify( obj ));
}

function show(){
    $('.topbar').addClass('inputting');
    $('.input').addClass('active');
    $('.sbutton.time').removeClass('active');
    $('.text-panel').removeClass('editing');
    
}

export function getQueryParams(){

    return location.search
        .slice(1)
        .split('&')
        .reduce((acc,curr)=>{ 

            let [ key, value ] = curr.split("=");
            acc[key] = encodeURIComponent(value);
            return acc; 

        }, {});    

}

export function hide(){
    $('.topbar').removeClass('inputting');
    $('.input').removeClass('active');
    $('.sbutton.time').addClass('active');
    $('.text-panel').addClass('editing');
    $('.ext-input-field').hide();
    $('.file-input-outer').removeClass('ext-input-active');
};