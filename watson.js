/*
********************* Módulo Watson.js
*/

var SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var speechToText = new SpeechToTextV1({
    username: '8aa50bb8-f818-4dde-9aba-9d0a6ace546e',
    password: '6bp6VmyorxPj'
  });
var fs = require('fs');
var resultado = new Object();
var transcripciones;
var reconocido = false;

// Display events on the console.
function onEvent(name, event) {
    //console.log(event);
    console.log(name, JSON.stringify(event, null, 2));
};

function showResultado(){
    console.log(resultado.results);
    if(resultado.results[0] != undefined && resultado.results[0].hasOwnProperty("alternatives")){
        transcripciones = resultado.results[0].alternatives;
        reconocido = true;
        for(i = 0; i < transcripciones.length; i++){
            var indice = i + 1;
            console.log("Transcripción número "+indice + ": "+transcripciones[i].transcript);
        }
    }

}

function getTranscripciones(){
    if(reconocido == true)
        return transcripciones;
    else
        return undefined;
}
/*
Descripcion: llamada a la api de watson con los parametros de entidades, 
palabras clave y semantica de la frase (verbos, sujetos, objectos directos...)
*/
function getKeyWatson(file){
    console.log("in getKeyWatson");
    var params = {
        objectMode: true,
        'content_type': 'audio/ogg',
        model: 'es-ES_BroadbandModel',
        keywords: ['hola', 'variables', 'respuestas'],
        'keywords_threshold': 0.5,
        'max_alternatives': 3
    };
    reconocido = false;
    // Create the stream.
    var recognizeStream = speechToText.createRecognizeStream(params);
    // Pipe in the audio.
    fs.createReadStream(file).pipe(recognizeStream);
    // Listen for events.
    recognizeStream.on('data', function(event) { 
        resultado = event; 
        showResultado();
    });
    recognizeStream.on('error', function(event) { onEvent('Error:', event); });
    recognizeStream.on('close', function(event) { onEvent('Close:', event); });
}

exports.getKeyWatson=getKeyWatson;
exports.getTranscripciones=getTranscripciones;