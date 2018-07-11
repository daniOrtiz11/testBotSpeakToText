/*
********************* Módulo App.js
*/

const TeleBot = require('telebot');
const watson =require('./watson');
const bd = require('./ourbd');
const parser = require('./parser');
const bot = new TeleBot({
    token: '470818912:AAFwqxh-vvJZoH9IYHvdAURe4Zdn9OhXKEE',
    usePlugins: ['askUser', 'commandButton','namedButtons'],
    pluginFolder: '../plugins/',
    pluginConfig: {
        // Plugin configs
    }
});
var keywords;
var entities;
var verbs;
var words;
var id;
var action = -1;
var needwatson = true;
var reserva_origen = "";
var reserva_destino = "";
var reserva_fecha = "";
var reserva_plazas = 0;
var reserva_confirm = false;
var reserva_vuelo = false;
var running = false;
var isbooking = false;
var isconsulting = false;
var posiblevuelo = null;
var casoConsulta = -1;
var confRemind = false;
var confDays = false;
var origenTipico = "";
var destinoRecomendado = "";
var waitingAnswer = false;
var meses = new Array ("Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre");
//Mensajes predeterminados para salidas estandar
var helpmessages = [
                'Welcome to Airbot, your assistant 24/7 for flight reservations. What would you like to do?',
				'I hope we meet again soon. Have a nice day!',
				'Help message: type /start /hi or /hello to start Airbot!',
                'Airbot is already running!',
                'Airbot is already running and you are booking a fligth!',
                'Airbot is already running and you are consulting your fligths!',
                'I hope we meet again soon. I have not saved your booking. Have a nice day!',
                'I hope we meet again soon. I have not saved your query. Have a nice day!',
                'You are booking a flight, but you can type whatever you want',
                'You are consulting your flights, but you can type whatever you want',
                'You can type whatever you want, I try to help you',
                'Can I do something else for you?',
                'Sorry, I could not understand you, could you repeat it?',
                'Ok, maybe next time',
                'You can book and consult your flights or you can let me recommend you the perfect flight',
                "Ok, don't worry"
				];

/*
situation = 1 ->type /running and running = true

situation = 2 ->type /goodbye 
situation = 3 ->type /help and running = true
*/
function parserHelp(situation){
    if(situation == 1){
        if(action == 1){
            bot.sendMessage(id, helpmessages[4]);    
        }
        else if(action == 2){
            bot.sendMessage(id, helpmessages[5]);
        }
        else{
            bot.sendMessage(id, helpmessages[3]);   
        }
    }
    else if(situation == 2){
        if(action == 1){
            bot.sendMessage(id, helpmessages[6]);
        }
        else if(action == 2){
            bot.sendMessage(id, helpmessages[7]);
        }
        else{
          bot.sendMessage(id, helpmessages[1]);   
        }
    }
    else if(situation == 3){
        if(action == 1){
            bot.sendMessage(id, helpmessages[8]);
        }
        else if(action == 2){
            bot.sendMessage(id, helpmessages[9]);
        }
        else{
            bot.sendMessage(id, helpmessages[10]);
        }
    }
}


/*
Descripcion: funcion encargada de obtener las palabras claves y averiguar la accion que quiere 
realizar el usuario.
*/
function getkeys(texto){
   keywords = watson.getKeys();
    //watson ha sido capaz de reconocer el texto
    if (keywords != undefined){
        entities = parser.parserEntities(keywords.entities);
        verbs = parser.parserVerbs(keywords.semantic_roles);
        words = parser.parserWords(keywords.keywords);
    }
    else{
        entities = null;
        verbs = null;
        words = null;
    }
        //cambiar de una accion a otra o permanecer en una que se esta realizando
        var oldaction = action;
        var newaction = parser.parserFunction(verbs,entities);
        if(newaction == oldaction && (isbooking || isconsulting)){
            action = newaction;
        }
        else if(newaction != -1){
            action = newaction;
            if(oldaction == 1 && newaction == 2){
                restartReserva();
            }
        }
    if(action != -1)
        controlAcciones(texto);
    else{
        bot.sendMessage(id, helpmessages[12]);
        bot.sendMessage(id, helpmessages[14]);
    }
}

/*
Descripcion: funcion encargada especificamente de la logica de la accion de reservar
*/
function controlReserva(textsplit){
    //Fase donde aun se desconoce el destino y/o el origen del viaje
    if(reserva_fecha == "" && (reserva_origen == "" || reserva_destino == "")){
        
        //Caso done se ofrece recomendacion especifica para origen o destino si es necesario
        if(waitingAnswer == false){
        //Caso inicial: se comprueba si el usuario ha introducido el origen y/o el destino de a donde quiere viajar
            if(entities != null){
                for(i = 0; i < entities.length; i++){
                    var entact = entities[i];
                    var ind = textsplit.indexOf(entact);
                    var prepro = textsplit[ind-1];
                    if(prepro == "to" && reserva_destino == "")
                        reserva_destino = entact;
                    else if(prepro == "from" && reserva_origen == "")
                        reserva_origen = entact;
                }
            }

            //Caso de que no se haya encontrado el origen en el texto del usuario
            if(reserva_origen == ""){ 
                bd.consultaOrigenTipico(id,function(err,result){
                    if(err){
                        console.log(err);	
                    } else {
                        //El usuario ha hecho reservas anteriormente y se le ofrece el origen desde donde suele partir
                        if(result != null && result != undefined){
                            if(origenTipico == result){
                                bot.sendMessage(id,helpmessages[12]);
                                bot.sendMessage(id, "Where do you want to start your travel?");
                            }
                            else{
                                origenTipico = result;
                                bot.sendMessage(id, "Would you like to travel from "+origenTipico + " ?");   
                                waitingAnswer = true;
                            }

                        }
                        //No hay datos anteriores sobre reservas del usuario
                        else {
                            bot.sendMessage(id, "Where do you want to start your travel?");
                            restartReserva(); 
                        }
                    }
                });
            }
            //Caso de que no se haya encontrado el destino en el texto del usuario y se le ofrece un destino recomendado
            /*
            Solo se le devolverá un destino recomendado en caso de que para destino que el clasficador ha elegido el mejor para
            el usuario haya un vuelo en fechas y plazas disponibles.
            */
            else if(reserva_destino == ""){
                var f=new Date();    
                var mesact = meses[f.getMonth()];
                bd.predecirDestino(id, mesact, reserva_origen,function(err, result){
                    if(err){
                        console.log(err);	
                    } else {
                        if(result != null && result != undefined && result != " "){
                            waitingAnswer = true;
                            destinoRecomendado = result;
                            bot.sendMessage(id, "Would you like to travel to "+destinoRecomendado +  "?");      
                        }
                        else if(destinoRecomendado != "repeat"){
                            destinoRecomendado = "repeat";
                            bot.sendMessage(id, "Where do you want to travel?");
                        }
                        else{
                            bot.sendMessage(id,helpmessages[12]);
                            bot.sendMessage(id, "Where do you want to travel?");         
                        }
                    }
                });
            }
        }
        
        //Caso donde se comprueba si se han aceptado las recomendaciones para origen o destino
        else{
            if(reserva_origen == ""){
                var respuesta = parser.parserYesorNo(textsplit);
                if(respuesta == 3){
                    reserva_origen = origenTipico;
                    waitingAnswer = false;
                    controlAcciones(" ");
                }
                else if(respuesta == 0){
                    waitingAnswer = false;
                    bot.sendMessage(id, helpmessages[15]);
                    bot.sendMessage(id, "Where do you want to start your travel?");
                }
                else{
                    bot.sendMessage(id, helpmessages[12]);
                }
            }
            else if(reserva_destino == ""){
                var respuesta = parser.parserYesorNo(textsplit);
                if(respuesta == 3){
                    waitingAnswer = false;
                    reserva_destino = destinoRecomendado;
                }
                else if(respuesta == 0){
                    needwatson = true;
                    waitingAnswer = false;
                    bot.sendMessage(id, helpmessages[15]);
                    bot.sendMessage(id, "Where do you want to travel?");
                    
                }
                else{
                    bot.sendMessage(id, helpmessages[12]);
                }
            }
        }
        
        //Caso de que aun falte por saber el destino
       /* else if(reserva_destino == ""){
            bot.sendMessage(id, "Where do you want to travel?");
        }*/
    }
    //Caso donde ya se conoce el origen y el destino
    if(reserva_destino != "" && reserva_origen != ""){
        
        //Ultima fase de la reserva donde se comprueba si el usuario quiere recordatorio del vuelo
        if(reserva_confirm == true && reserva_plazas > 0 && reserva_vuelo == true){
            needwatson = false;
            var reminder = -1;
            reminder = parser.parserYesorNo(textsplit);
            if(reminder != -1){
                if(reminder == 3)
                    bot.sendMessage(id, "We have already set a reminder. We'll notify you 3 days before your flight.");
                else
                    bot.sendMessage(id, "Don't worry! You could set it later.");
                
                //Se confirma la reserva 
                bd.confirmBooking(posiblevuelo, id, reserva_plazas, reminder);
                bot.sendMessage(id, helpmessages[11]);
                restartReserva();
                restart();
            }
            else{
                bot.sendMessage(id, helpmessages[12]);
            }
        }
        
        //Fase donde se comprueba si el usuario ha confirmado el vuelo y se le pregunta sobre si quiere recordatorio del mismo
        else if(reserva_vuelo == true && reserva_confirm == false && reserva_plazas > 0){
            var repeat = true;
            var resul = parser.parserYesorNo(textsplit);
            if(resul == 3){
                repeat = false;
                reserva_confirm = true;
                bot.sendMessage(id, "Your flight has been booked successfully! Would you like to set a reminder?"); 
            }
            else if(resul == 0){
                reserva_confirm = false;
                repeat = false;
            }
            if(reserva_confirm == false && repeat == false){
                bot.sendMessage(id, helpmessages[13]);
                bot.sendMessage(id, helpmessages[11]);
                restartReserva();
                restart();
            }
        }
        
        //Fase donde se comprueban las plazas que ha indicado el usuario para la reserva
        else if(reserva_vuelo == true && reserva_confirm == false && reserva_plazas == 0){
            for(i = 0; i <textsplit.length; i++){
                var act = textsplit[i];
                var a = parseInt(act);
                if(Number.isInteger(a)){
                     reserva_plazas = a;
                }
            }
            
            //Comprobación de si existen plazas suficientes en el vuelo
            if(posiblevuelo.plazas > reserva_plazas && reserva_plazas > 0){
                    bot.sendMessage(id, "I have enough tickes for you! Do you want to confirm the booking?");
            }
            
            //En caso de que no haya plazas suficientes en el vuelo
            else if(posiblevuelo.plazas <= reserva_plazas && reserva_plazas > 0){
                bot.sendMessage(id, "Sorry I have not enough tickets for you... Try with another flight!");
                reserva_plazas = 0;
                bot.sendMessage(id,helpmessages[11]);
                restartReserva();
                restart();
            }
            
            //No se han entendido las plazas introducidas
            else{
                bot.sendMessage(id, helpmessages[12]);
            }
        }
        
        //Caso donde se comprueba si existe el vuelo especificado por el usuario 
        else if(reserva_vuelo == false && reserva_confirm == false){
            bd.flight(reserva_origen, reserva_destino,function(err, result){
                posiblevuelo = result;
                 if(posiblevuelo == undefined){
                bot.sendMessage(id, "Sorry, I could not find a flight to you, you could try again with others destinations");
                restart();
                restartReserva();
                }
                else{
                    var str = (posiblevuelo.fecha.toString().split("00:00")[0]) + "at " + posiblevuelo.hora;
                    bot.sendMessage(id, "The ticket's price is "+ posiblevuelo.precio + "€ ¿How many tickets do you want? ");
                    bot.sendMessage(id, "I have found a flight to you on the date: " + str);
                    reserva_vuelo = true;
                    needwatson = false;
                }
            });
        }

    }
}

/*
Descripcion:
Funcion encargada de controlar las acciones que realiza el usuario.
Dependiendo de que accion se esta realizando o se va a realizar se tomara un camino u otro.
*/
function controlAcciones(texto){
    if(action == 1){ //reserva
        isbooking = true;
        var textsplit = texto.split(" ");
        controlReserva(textsplit);
    } else if (action == 2){ //Consultas de vuelo o reserva
		isconsulting = true;
        var ok = false;
		var i = 0;
        //comienzo o no de la consulta
        if(casoConsulta == -1)
            casoConsulta = parser.parserConsulta(words);
        
        //es una consulta valida
        if(casoConsulta == 4 || casoConsulta == 3 || casoConsulta == 2 || casoConsuta == 1){
                bot.sendMessage(id, "Of course. These is yours flights reservations: ");
				bd.consultReservasbyUser(id,function(err, result){ 
					if(err){
						console.log(err);
					} else{
                        if(result.length > 0){
                            for (i = 0; i < result.length; i++){
                                var rw = result[i];
                                var ind = i+1;
                                //se muestran las reservas del usuario con un formato personalizado
                                var str = (rw.fecha.toString().split("00:00")[0]) + "at " + rw.hora;
                                bot.sendMessage(id,'This is your flight number '+ind+' \n'
										+ 'Flight from '+ rw.origen + ' to ' + rw.destino + '\n'
										+ 'Date: ' + str + '\n'
                                        + 'Tickets: ' + rw.npersonas + '\n'
										+ 'Price/ticket: ' + rw.precio);
                            }
                        }
                        else{
                            bot.sendMessage(id, "Sorry, you dont have fligths reservations but I can help you!");
                        }
                            bot.sendMessage(id, helpmessages[11]);
                            restartConsulta();
                            restartReserva();
                            restart();
                        
					}
				});
        }
        else{
            bot.sendMessage(id, helpmessages[12]);
            restartConsulta();
            restart();
        }
	} else if (action == 3){ //Recordatorio
        //se realiza un split del texto para posterior parseo
		var textsplit = texto.split(" ");
        //en caso de que no se hayan mostrado aun los recordatorios
		if(confRemind == false){
			bd.reminders(id,function(err, result){
				if(err){
					console.log(err);
				} else{
					 if(result.length > 0){
							for (i = 0; i < result.length; i++){
								var rw = result[i];
								var ind = i+1;
                                //se muestran los recordatorios con un formato personalizado
								var str = (rw.fechaRecordatorio.toString().split("00:00")[0]);	
								bot.sendMessage(id,'This is your reminder number ('+ind+') \n'
								+ 'Reservation ID: '+ rw.idreserva + '\n'
								+ 'Date: ' + str + '\n'
								+ 'Days reminder: ' + rw.numeroDias + '\n');
							}
							bot.sendMessage(id, "Would you like to change any of them? If so, introduce the reservation ID.")
							confRemind = true;
							needwatson = false;
					 }
					else{
						bot.sendMessage(id, "Sorry, you dont have reservations!");
                        bot.sendMessage(id, helpmessages[11]);
						action = -1;
                        restartReminder();
						restart();
					}
				}
			});
	} else {
		if(confDays == false){
			for(i = 0; i < textsplit.length; i++){
				var act = textsplit[i];
				var res = act.toLowerCase();
                //se determina el id del recordatorio que se quiere editar
				var a = parseInt(act);
				if(Number.isInteger(a)){
					idR = a;
					bd.consReminder(a,id,function(err, result){
						if(err){
							console.log(err);
						} else {
							if(result.length > 0){
								bot.sendMessage(id, "For how many days before do you want to set the reminder?");
								confDays = true;
								needwatson = false;
							} else {
								bot.sendMessage(id, "Sorry, you don´t have any reminders with that reservation ID");
								bot.sendMessage(id, helpmessages[11]);
								action = -1;
								restartReminder();
								restart();	
							}
						}		
					});		
				}
			}
		} else {
            var numok = false;
			for(i = 0; i < textsplit.length && numok == false; i++){
				var act = textsplit[i];
                //se obtienen a los dias que se quiere modificar los recordatorios
				var res = act.toLowerCase();
				var a = parseInt(act);
				if(Number.isInteger(a)){
                    numok = true;
					bd.consultDateReminder(idR,id,function(err,result){
						if(err){
							console.log(err);	
						} else {
							var date = result[0].fechaRecordatorio;
							bd.modifyReminder(idR,id,date,a,function(err, result){
							if(err){
								console.log(err);	
							} else {
								bot.sendMessage(id, "Your reminder has been set successfully!");
								bot.sendMessage(id, helpmessages[11]);
								action = -1;
								restartReminder();
								restart();
							}
							});
						}
					});
				}
			}
		}
	}
}
else if(action == 4){ //accion de recomendacion
    //el usuario decide si quiere o no el viaje recomendado
    if(waitingAnswer == true){
        var textsplit = texto.split(" ");
        var respuesta = parser.parserYesorNo(textsplit);
        if(respuesta == 3){
            reserva_vuelo = false;  reserva_confirm = false;
            action = 1;
            controlAcciones(" ");
        }
        else if(respuesta == 0){
            waitingAnswer = false;
            bot.sendMessage(id, helpmessages[13]);
            bot.sendMessage(id, helpmessages[11]);
            restartReserva();
        }
        else{
            bot.sendMessage(id, helpmessages[12]);
        }
    }
    //si es posible se le recomienda un viaje al usuario
    if(reserva_destino == "" && reserva_origen == ""){
              bd.consultaOrigenTipico(id,function(err,result){
        if(err){
            console.log(err);	
        } else {
            //El usuario ha hecho reservas anteriormente y se le ofrece el origen desde donde suele partir
            if(result != null && result != undefined){
                    reserva_origen = result;
                    var f=new Date(); 
                    var mesact = meses[f.getMonth()];
                    bd.predecirDestino(id, mesact, reserva_origen,function(err, result){
                        if(err){
                            console.log(err);	
                        } else {
                            if(result != null && result != undefined && result != " "){
                                reserva_destino = result;
                                bd.flight(reserva_origen, reserva_destino,function(err, result){
                                    posiblevuelo = result;
                                     if(posiblevuelo == undefined){
                                        
                                        bot.sendMessage(id, "It is too early to recommend a trip, maybe the next time");
                                        bot.sendMessage(id, helpmessages[11]); 
                                        restartReserva();
                                    }
                                    else{
                                        bot.sendMessage(id, "Would you like to travel from "+reserva_origen + " to "+ reserva_destino + " ?");
                                        waitingAnswer = true;
                                    }
                                });
                            }
                            else{
                                bot.sendMessage(id, "It is too early to recommend a trip, maybe the next time");
                                bot.sendMessage(id, helpmessages[11]);
                                restartReserva();        
                            }
                        }
                });
                }
            //No hay datos anteriores sobre reservas del usuario
            else {
                bot.sendMessage(id, "It is too early to recommend a trip, maybe the next time");
                bot.sendMessage(id, helpmessages[11]);
                restartReserva(); 
            }
        }
    });
    }
}
}

/*
Descripcion:
Parsear la conversación con el usuario y dirigir el comportamiento
*/
function parserMessages(){
    bot.on('text', (data) => {
    //obtención de texto e identificador de usuario
    var texto = data.text;
    id = data.from.id;
    if(texto != "" && texto != null && texto != undefined){
        if(texto == "/start" || texto == "/hi" || texto == "/hello"){
            if(running == true){
               parserHelp(1);
            }
            else{
                bot.sendMessage(id, helpmessages[0]);
                running = true;
                bd.insertarUsuarioBD(id);   
            }
        }
        else if(texto == "/stop" || texto == "/bye" || texto == "/goodbye"){
            parserHelp(2);
            restartReserva();
            restartConsulta();
            restartReminder();
            running = false;
        }
        else if(texto == "/help"){
            parserHelp(3);
        }
        else{
            if(running == false)
            bot.sendMessage(id, helpmessages[2]);
            else{
				texto = parser.checkText(texto);
                watson.getKeyWatson(texto);
                setTimeout(getkeys, 1800, texto);
            }
        }
    }
});
}

/*
Descripcion: función de reinicio de variables generales
*/
function restart(){
    keywords = null;
    entities = null;
    verbs = null;
    words = null;
    id = null;
    action = -1;
    needwatson = true;
    isbooking = false;
    isconsulting = false;
}

/*
Descripcion: función de reinicio de las variables de reserva
*/
function restartReserva(){
    reserva_origen = "";
    reserva_destino = "";
    reserva_fecha = "";
    reserva_plazas = 0;
    reserva_confirm = false;
    reserva_vuelo = false;
    //var running = false;
    posiblevuelo = null;
    needwatson = true;
    isbooking = false;
    origenTipico = "";
    destinoRecomendado = "";
}

/*
Descripcion: función de reinicio de las variables de consulta
*/
function restartConsulta(){
    casoConsulta = -1;
    isconsulting = false;
}


/*
Descripcion: función de reinicio de las variables de recordatorio
*/
function restartReminder(){
	confDays = false;
	confRemind = false;
}

/*
Descripcion: funcion de inicio que conecta con la base de datos, 
establece el comportamiento del bot y lo arranca.
*/
function init(){
    bd.startConnection();
    parserMessages();
    bot.start();
}

init();
