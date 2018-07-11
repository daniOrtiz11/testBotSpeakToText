/*
********************* Módulo Watson.js
*/

//Creedenciales para el uso de watson
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
var natural_language_understanding = new NaturalLanguageUnderstandingV1({
  'username': "b8773c63-2d40-4449-96eb-5b077028323c",
  'password': "8a7Wr1i6VGEs",
  'version': '2018-03-16'
});
var keywords;

/*
Descripcion: llamada a la api de watson con los parametros de entidades, 
palabras clave y semantica de la frase (verbos, sujetos, objectos directos...)
*/
function getKeyWatson(conversation){
    var parameters = {
  'text': conversation,
  'features': {
    'entities': {
      'emotion': true,
      'sentiment': true,
      'limit': 2
    },
    'keywords': {
      'emotion': true,
      'sentiment': true,
      'limit': 2
    },
    'semantic_roles': {}
  }
}
natural_language_understanding.analyze(parameters, function(err, response) {
  if (err){
    console.log('error:', "watson no ha reconocido el texto");
      keywords = undefined;
  }
  else{
      keywords = response;
  }
});
   
}

function getKeys(){
    //console.log(keywords);
    return keywords;
}

exports.getKeys=getKeys;
exports.keywords=keywords;
exports.getKeyWatson=getKeyWatson;