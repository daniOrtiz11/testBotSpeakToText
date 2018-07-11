/*
********************* Módulo Parser.js
*/
var verbs_to_reserve = ["book","reserve"];
var verbs_to_consult = ["consult","query","see","check"];
var verbs_to_reminder = ["modify","change","alter","adjust"];
var verbs_to_recommend = ["recommend"];
var words_to_querycase1 = ["reserve","reservation","book","booking"];
var words_to_querycase2 = ["flight","flying"];
var words_to_querycase3 = ["reserves","reservations","books","stockpile","bookings"];
var words_to_querycase4 = ["flights"];
function parserEntities(dic){
    var entities = [];
    for(i = 0; i < dic.length; i++){
        var act = dic[i];
        if(act.type == "Location")
            entities.push(act.text);
    }
    return entities;
}


/*
Descripcion: obtiene los verbos de los resultados obtenidos por watson
*/
function parserVerbs(dic){
    var verbs = [];
    for(i = 0; i < dic.length; i++){
        var act = dic[i].action.verb;
        verbs.push(act.text);
    }
    return verbs;
}

/*
Descripcion: obtiene las palabras claves de los resultados obtenidos por watson
*/
function parserWords(dic){
    var keys = [];
    for(i = 0; i < dic.length; i++){
        var act = dic[i];
        keys.push(act.text);
    }
    return keys;
}

/*
Descripcion: determina si el usuario quiere realizar una consulta sobre sus reservas 
Deprecated: no hay diferencia si "caso" es >= 1
*/
function parserConsulta(words){
    var caso = -1;
    for(i = 0; i < words.length; i++){
        var act = words[i];
        if(words_to_querycase1.indexOf(act) != -1)
            caso = 1;
        else if(words_to_querycase2.indexOf(act) != -1)
            caso = 2;
        else if(words_to_querycase3.indexOf(act) != -1)
            caso = 3;
        else if(words_to_querycase4.indexOf(act) != -1)
            caso = 4;
    }
    return caso;
}


/*
Descripcion: determina a partir de verbos que accion quiere realizar el usuario
*/
function parserFunction(verbs,entities){
    var action = -1;
    if(verbs != null){
        for(i = 0; i < verbs.length && action == -1; i++){
            var verbact = verbs[i];
            if(verbs_to_reserve.indexOf(verbact) != -1){
                action = 1;
            }else if(verbs_to_consult.indexOf(verbact) != -1){
                action = 2;
            }else if(verbs_to_reminder.indexOf(verbact) != -1){
				action = 3;
			}
            else if(verbs_to_recommend.indexOf(verbact) != -1){
                action = 4;
            }
        }
    }

    return action;
}

function parserYesorNo(textsplit){
    var respuesta = -1;
    for(i = 0; i < textsplit.length; i++){
        var act = textsplit[i];
        var res = act.toLowerCase();
        if(res == "yes" || res == "Yes"){
            respuesta = 3;
        }
        else if(res == "no" || res =="No"){
            respuesta = 0;
        }
    }
    return respuesta;
}

/*
Descripción: función encargada de autocompletar la entrada del usuario en dos casos particulares
*/
function checkText(texto){
   if(texto == "I want to book" || texto== "I want to consult"){
	   texto += " a flight";
   } else if (texto == "I want to modify"){
	   texto += " a reminder";
   }
   return texto;
}

exports.checkText = checkText;
exports.parserYesorNo=parserYesorNo;
exports.parserEntities=parserEntities;
exports.parserVerbs=parserVerbs;
exports.parserWords=parserWords;
exports.parserFunction=parserFunction;
exports.parserConsulta=parserConsulta;