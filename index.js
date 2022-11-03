var express = require('express');
var app = express();
app.use(express.json())    // <==== parse request body as JSON
var mysql = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'password',
  database : 'coaches'
});

app.get('/coach', function(request,response){   
    connection.query('SELECT a.id As userid, a.name, b.id AS availabilityid, b.dayid from user a LEFT JOIN availability b ON a.id = b.userid', function (error, results, fields) {
        if (error){
            console.error(error);
            response.status(500);
        }else{
            console.log('The coaches list is: ', results);            
            response.send(results).status(200);
        }         
    });   
});

app.get('/coach/:userId/day/:dayId/availability/:availabilityId', function(request,response){   
    let userId = request.params.userId;
    let dayId = request.params.dayId;
    let availabilityId = request.params.availabilityId;
    connection.query(`SELECT * FROM availability WHERE userid = ${userId} AND dayid = ${dayId} `, function (error, results, fields) {
        if (error){
            console.error(error);
            response.status(500);
        }else{            
            let resultList = results[0];
            let available_start = resultList['available-start'];
            let available_end = resultList['available-end'];
            console.log("available_start ", available_start);
            console.log("available_end ", available_end);
            //30 min slots for every day
            let min_30_interval = ["6:00AM","6:30AM","7:00AM","7:30AM","8:00AM","8:30AM","9:00AM","9:30AM","10:00AM","10:30AM","11:00AM","11:30AM","12:00PM","12:30PM",
            "1:00PM","1:30PM","2:00PM","2:30PM","3:00PM","3:30PM","4:00PM","4:30PM","5:00PM","5:30PM","6:00PM","6:30PM","7:00PM","7:30PM","8:00PM","8:30PM","9:00PM","9:00PM",
            "10:00PM","10:30PM"];
            let available_slots_p_day = [];
            let slot_add = false;
            for(let i=0;i<min_30_interval.length;i++){
                let slot_time = min_30_interval[i];
                //user available start time
                if(slot_time === available_start){
                    slot_add = true;                    
                }
                //user available end time
                if(slot_time === available_end){
                    slot_add = false;
                }
                //add slots with user avaible start and end time
                if(slot_add){
                    available_slots_p_day.push(slot_time);
                }                
            }
                        
            //Removing already booked slots from complete list of available slots of the day
            connection.query(`SELECT * FROM booking WHERE userid =  ${userId} And availabilityid = ${availabilityId} AND dayid = ${dayId}`, function (error, results, fields) {
                if (error){
                    console.error(error);
                    response.status(500);
                }else{                    
                    let bookedSlots = results;
                    console.log('bookedSlots: ', bookedSlots);
                    let filtered_slots;
                    for(let i=0;i<bookedSlots.length;i++){
                        let _bookedSlots = bookedSlots[i];
                        let bookedSlot = _bookedSlots['bookingstart'];
                        available_slots_p_day = available_slots_p_day.filter(function(e) { return e !== bookedSlot })
                    }
                    //check if any slots is available or not after booking
                    if(available_slots_p_day && !available_slots_p_day.length > 0){
                        response.send({"message":"No slots available"}).status(200);
                    }else{
                        response.send(available_slots_p_day).status(200);
                    }                    
                } 
            }); 
        } 
    });       
});

app.post('/bookslot',function(request,response){
    let reqBody = request.body;
    let userId = reqBody.userId;
    let availabilityId = reqBody.availabilityId;
    let dayId = reqBody.dayId;
    let bookingStart = reqBody.bookingStart;
    connection.query(`INSERT INTO booking (userid, availabilityid, dayid, bookingstart) VALUES (${userId},${availabilityId},${dayId},'${bookingStart}')`, function (error, results, fields) {
        if (error){
            console.error(error);
            response.status(500);
        }else{
            console.log('Booking is done: ', results);
            response.send(results).status(200);
        }
    });   
})

app.listen(8080, function(){
    console.log("Server is running");
})