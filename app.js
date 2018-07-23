/*
********************* Módulo App.js
*/

var id;
var file;
var file_path;
var file_name = "voice.oga"
const TeleBot = require('telebot');
const watson =require('./watson');
var dw = require('download-file')
const bot = new TeleBot({
    token: '470818912:AAFwqxh-vvJZoH9IYHvdAURe4Zdn9OhXKEE',
    usePlugins: ['askUser', 'commandButton','namedButtons'],
    pluginFolder: '../plugins/',
    pluginConfig: {
        // Plugin configs
    }

});
var transcripciones = new Object();

function parserMessages(){
    bot.on('voice', (data, voice) => {
        console.log(voice);
        id = data.from.id;
        console.log("voice:");
        bot.sendMessage(id, "Mensaje de voz recibido!"); 
        var id_file = data.voice.file_id;
        file = bot.getFile(id_file);
        file.then(function(result) {
            file_path = result.fileLink;
            console.log(file_path);
            //dw.download(file_path, file_name, "audio/ogg");
            var options = {
                directory: "./",
                filename: file_name
            }
            dw(file_path, options, function(err){
                if (err) throw err
                setTimeout(function(){
                    watson.getKeyWatson(file_name);
                }, 500);
                setTimeout(function(){
                    transcripciones = watson.getTranscripciones(); console.log(transcripciones); sendTranscripciones();
                }, 4800);
            }); 
            //watson.getKeyWatson(file_name);
        });
        console.log("----");
    });
}

function sendTranscripciones(){
    if(transcripciones == undefined ||  transcripciones == null)
        bot.sendMessage(id, "No te he entendido bien, podrías repetirlo?");
    else
       bot.sendMessage(id, "Quizá has dicho algo como esto: \n"+transcripciones[0].transcript); 
}
function init(){
    parserMessages();
    bot.start();
}

init();
