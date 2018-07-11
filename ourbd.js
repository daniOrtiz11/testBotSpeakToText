/*
********************* Módulo Ourbd.js
*/
/*
Funciones relacionadas con las operaciones con la base de datos
*/
// Conexion con base de datos
var mysql = require('mysql');
//Clasificador bayesiano
var bayes = require('node-bayes');
var i = 0;

//atributos del algoritmo de clasificacion
var TRAINING_COLUMNS = ['mesReserva', 'mesVuelo', 'tickets', 'destino'];
//conjunto de entrenamiento del algoritmo bayesiano
var TRAINING_DATA = [
['Marzo', 'Octubre', '1', 'Poznan'],
['Mayo', 'Julio', '4', 'Londres'],
['Abril', 'Mayo', '3', 'Barcelona'],
['Noviembre', 'Febrero', '2', 'París'],
['Enero', 'Febrero', '2', 'Roma'],
['Febrero', 'Octubre', '1', 'Bangkok'],
['Septiembre', 'Enero', '2', 'Dubái'],
['Junio', 'Octubre', '1', 'Tokio'],
['Febrero', 'Marzo', '5', 'Seúl'],
['Junio', 'Julio', '2', 'Nueva York'],
['Noviembre', 'Enero', '5', 'Kuala Lumpur'],
['Octubre', 'Enero', '5', 'Hong Kong'],
['Enero', 'Marzo', '2', 'Estambul'],
['Septiembre', 'Diciembre', '5', 'Ámsterdam'],
['Octubre', 'Noviembre', '3', 'Milán'],
['Octubre', 'Octubre', '1', 'Taipei'],
['Junio', 'Diciembre', '1', 'Shanghai'],
['Diciembre', 'Febrero', '3', 'Viena'],
['Agosto', 'Diciembre', '3', 'Praga'],
['Junio', 'Julio', '4', 'Miami'],
['Agosto', 'Octubre', '1', 'Dublín'],
['Septiembre', 'Septiembre', '3', 'Munich'],
['Mayo', 'Septiembre', '1', 'Toronto'],
['Junio', 'Agosto', '5', 'Berlín'],
['Octubre', 'Noviembre', '4', 'Johannesburgo'],
['Agosto', 'Agosto', '3', 'Los Angeles']
];

var connection = mysql.createConnection({ 
   host: 'localhost',
   user: 'root',
   password: '',
   database: 'airbot',
});

function startConnection(){
    connection.connect(function(error){
   if(error){
      throw error;
   }else{
      console.log('Conexion correcta con con base de datos');
   }
});
}


//Consultas bd
function insertarUsuarioBD(id){
	
   connection.query('SELECT COUNT(*) as usersCount FROM usuarios WHERE id=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   if(rows[0].usersCount < 1){
			    connection.query('INSERT INTO usuarios(id) VALUES(?)', [id], function(error, result){
				   if(error){
					  throw error;
				   }else{
					  console.log('ID introducido correctamente.');
				   }
			})
		   } else{
			   console.log('El ID ya está dado de alta en la BD.');
		   }
	   }
   });
}

var flight = function consultaVueloByOrigenDestino(origen,destino,callback){
    var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1;
	var yyyy = today.getFullYear();
	
	if(dd<10) {
		dd='0'+dd
	} 

	if(mm<10) {
		mm='0'+mm
	} 
	today = yyyy+'/'+mm+'/'+dd;
	
	connection.query('SELECT * FROM vuelos WHERE origen=? and destino=? and fecha>? and plazas > 0', [origen,destino,today],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		  callback(null, rows[0]);
	   }
	});
}

function confirmBooking(vuelo, idUser, nTickets,reminder){
	var hora = new Date();
	hora = hora.getHours()+":"+hora.getMinutes();
	
	//Insert en reservas
	connection.query('INSERT INTO reservas(id,idvueloida,idvueloretorno,idusuario,fechareserva,horareserva,npersonas,expirado)'+
					 'VALUES(?,?,?,?,?,?,?,?)', [null,vuelo.id,null,idUser,vuelo.fecha,hora,nTickets,0], function(error, result){
		if(error){
			throw error;
		}else{
			nPlazas = vuelo.plazas - 1;
			connection.query('UPDATE vuelos SET plazas=? WHERE id=?',[nPlazas,vuelo.id], function(error, result){
				if(error){
					  throw error;
				   }else{
					  console.log('Actualizado nº de plazas del vuelo ' + vuelo.id);
				   }
			});
			console.log('Reserva realizada correctamente.');
			if(reminder > 0){
				connection.query('SELECT r.id FROM reservas r WHERE idusuario=? and fechareserva=? and horareserva=?', [idUser,vuelo.fecha,hora],function(err, rows, fields){
					if (err){
						throw err;
					}else{
						vuelo.fecha.setDate(vuelo.fecha.getDate() - reminder);
						var fecha = vuelo.fecha;
						idR = rows[0].id
						connection.query('INSERT INTO recordatorios(idreserva,idusuario,fechaRecordatorio,numeroDias)'+
										 'VALUES(?,?,?,?)',[idR, idUser, fecha, reminder],function(error,result){
								if(error){
									throw error;
								} else {
									console.log("Recordatorio actualizado");		 
								}
											 
						});
					}
				});
			}
		}
	})
}

var consultFlight = function consultaVuelo(id,callback){
	connection.query('SELECT * FROM vuelos WHERE id=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		    callback(null, rows[0]);
	   }
	});
}

var consultBooking = function consultaReserva(id,callback){
	
	connection.query('SELECT * FROM reservas WHERE id=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows[0]);
	   }
	});
}

var consultReservasbyUser = function queryReservasbyUser(id, callback){
   connection.query('SELECT r.npersonas, v.origen, v.destino, v.fecha, v.hora, v.precio FROM `reservas` as r INNER JOIN `vuelos` as v on v.id = r.idvueloida WHERE idusuario=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
            callback(null, rows);
	   }
   });
}

var reminders = function reminders(id, callback){
	
	connection.query('SELECT * FROM recordatorios WHERE idusuario=?', [id],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows);
	   }
	});
}

var consReminder = function consReminder(idR, idU, callback){
	
	connection.query('SELECT * FROM recordatorios WHERE idreserva=? and idusuario=?', [idR,idU],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows);
	   }
	});
}

var modifyReminder = function modifyReminder(idR, idU, date, days, callback){

	date.setDate(date.getDate() - days);
	var fecha = date;
	connection.query('UPDATE recordatorios SET fechaRecordatorio=?,numeroDias=? WHERE idreserva=? and idusuario=?', [fecha,days,idR,idU],function(err, rows, fields){
		   if (err){
			   throw err;
		   }else{
			   callback(null, rows);
		   }
	});
}

var consultDateReminder=function consultDateReminder(idR, idU, callback){
	connection.query('SELECT fechaRecordatorio FROM recordatorios WHERE idreserva=? and idusuario=?', [idR,idU],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows);
	   }
	});
}

var consultaOrigenTipico = function consultaOrigenTipico(idU, callback){
    //idU = 140760980;
    
    connection.query('SELECT origen, COUNT( origen ) AS origenComun FROM reservas INNER JOIN vuelos ON reservas.idvueloida = vuelos.id WHERE idusuario =? GROUP BY origen ORDER BY COUNT( origen ) ', [idU],function(err, rows, fields){
	   if (err){
		   throw err;
	   }else{
		   callback(null, rows[0].origen);
	   }
	});
}

var predecirDestino = function predecirDestino(idU, mesact, origen, callback){
    var ticketscomun;
    var dicmeses = {"01":0, "02":0, "03":0, "04":0, "05":0, "06":0, "07":0, "08":0, "09":0, "10":0, "11":0, "12":0};
    var mesmax = "01";
    var varmax = dicmeses["01"];
   connection.query('SELECT npersonas, COUNT( npersonas ) FROM reservas WHERE IDUSUARIO =? GROUP BY npersonas ORDER BY COUNT( npersonas ) DESC ', [idU],function(err, rows, fields){
   if (err){
       throw err;
   }else{
       if(rows.length > 0){
           ticketscomun = rows[0].npersonas;
            connection.query('SELECT fechaReserva FROM reservas WHERE IDUSUARIO =?', [idU],function(err, rows, fields){
               if (err){
                   throw err;
               }else{
                   for(i = 0; i < rows.length; i++){
                       var fact = rows[0].fechaReserva;
                       var aux = fact.split("-");
                       var mes = aux[1];
                       dicmeses[mes] = dicmeses[mes] + 1;
                   }
                   mesmax = "01";
                   varmax = dicmeses["01"];
                    for (var mes in dicmeses){
                        if(dicmeses[mes] > varmax)
                            {
                                mesmax = mes;
                                varmax = dicmeses[mes];
                            }
                    }
                   var destino = predictDestino(mesact,mesmax,ticketscomun);
                   connection.query('SELECT COUNT(*) FROM VUELOS WHERE origen=? and destino=?', [origen,destino],function(err,rows,fields){
                       if(err){
                           
                       }
                       else{
                           var num = rows[0]["COUNT(*)"];
                           if(num > 0){
                               callback(null, destino);
                           }
                           else{
                               callback(null, " ");
                           }
                       }
                   });   
               }
            }); 
        }
    }
   }); 
}
/*
Funcion de predicción de destino a partir de:
- de mes en el que estamos
- de fecha en la que mas suele viajar el usuario
- numero de billetes que mas suele reservar el usuario
*/
function predictDestino(mesact, mesdestino, ticketscomun){
    var messtring = "Enero";
if(mesdestino == "02"){
    messtring = "Febrero";
}
else if(mesdestino == "03"){
    messtring = "Marzo";
}
    else if(mesdestino == "04"){
    messtring = "Abril";
}
    else if(mesdestino == "05"){
    messtring = "Mayo";
}
    else if(mesdestino == "06"){
    messtring = "Junio";
}
    else if(mesdestino == "07"){
    messtring = "Julio";
}
    else if(mesdestino == "08"){
    messtring = "Agosto";
}
    else if(mesdestino == "09"){
    messtring = "Septiembre";
}
    else if(mesdestino == "10"){
    messtring = "Octubre";
}
    else if(mesdestino == "11"){
    messtring = "Noviembre";
}
    else if(mesdestino == "12"){
    messtring = "Diciembre";
}
var cls = new bayes.NaiveBayes({
  columns: TRAINING_COLUMNS,
  data: TRAINING_DATA,
  verbose: true
});
cls.train();
var answer = cls.predict([mesact, messtring, ticketscomun]);
return answer.answer;
}




//exports.consultaVueloByOrigenDestino=consultaVueloByOrigenDestino;
exports.connection=connection;
exports.startConnection=startConnection;
exports.insertarUsuarioBD=insertarUsuarioBD;
exports.consultFlight=consultFlight;
exports.consultBooking=consultBooking;
exports.confirmBooking=confirmBooking;
exports.flight = flight;
exports.consultReservasbyUser=consultReservasbyUser;
exports.consReminder=consReminder;
exports.reminders=reminders;
exports.modifyReminder=modifyReminder;
exports.consultDateReminder=consultDateReminder;
exports.consultaOrigenTipico = consultaOrigenTipico;
exports.predecirDestino = predecirDestino;