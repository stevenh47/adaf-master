/* 
    ADAF - Automatic DMV Appointment Finder!
    Node script based on zombie to automagically find an appointment at the beloved DMV
    
    Appointments at the DMV become available sporadically. I believe this is due to people canceling or not 
    confirming their appointments. Those appointment are really hard to get. 
    This script will periodically check the DMVs specified for appointments up to a certain date. 
    If an appointment is found within the time frame a text-message is sent
    using Twilio. The found results are also logged in log.html and crudely formatted.
    There's a simple webserver serving up this static html.

    Check inside config.js for the necessary modifications:
    - Which DMVs to check (multiple are possible)
    - The date of an appointment up to wich you should be notified
    - Which type of appointment
    - Twilio credentials
    - Phone number to send text message to


    This works for the California DMV site at the time of writing (05.04.2017)


    Copyright: None, use for whatever you want!

    -- Michael Beyhs --

*/

///////////////// Includes /////////////////
var twilio = require('twilio');
var Browser = require("zombie");
var fs = require('fs');
var http = require('http')
var config = require('./config.js');
var beep = require('beepbeep');
////////////////////////////////////////////


client = new twilio.RestClient(config.twilio_id, config.twilio_secret); 

startIndex = -1    // start at -1 since we increment before the first call
dateLimitString = config.dateLimit.toISOString().replace(/T/, ' ').replace(/\..+/, '') // prettier string for printing
////////////////////////////////////////////////////////////////////


///////////////// MAIN /////////////////

// start web server to serve result log file
http.createServer(function(request, response) {  
    console.log("Server accessed. serving log.html")    
    html = fs.readFile('./log.html', function (err, html) {
        if (err) {
            throw err; 
        }

        response.writeHeader(200, {"Content-Type": "text/html"});
        response.write(html);  
        response.end();  
    });
}).listen(process.env.PORT || 8000);

// Start the search!
kickOff(startIndex)
////////////////////////////////////////////////////////////////////


///////////////// Functions /////////////////

// calling this kicks off the loop. It also acts as callback when one location has been handled 
function kickOff(locationIndex){
    locationIndex++
    if(locationIndex == 0){
        console.log("Searching for Appointments until " + dateLimitString)  // print header on first run of loop
    }
    if(locationIndex < config.locations.length){
        checkForAppointment(locationIndex,kickOff)                          // check this location
    } else {                                                                // checked all of them, run again in x minutes
        startIndex = -1
        console.log("============= Checking again in " + config.intervalMinutes + " Minutes =============");
        var currentTime = new Date();
        console.log("Current time:" + currentTime.getHours() + ":" + currentTime.getMinutes() + ":" + currentTime.getSeconds());
        setTimeout(kickOff, config.intervalMinutes * 60 * 1000, startIndex);
        //process.exit()
    }
}

// This function starts the zombie browser, goes to the website, fills out the form and submits it
// The returned site is then parsed and if and appointment id available a text message is sent.
function checkForAppointment(locIndex, callback)
{
	try {
	    browser = new Browser({waitDuration: 30*1000}); // 30 second timeout
	    location = config.locations[locIndex]
	    console.log("")
	    console.log("-----------------" + location[1] + "-----------------");
	    console.log("")
	    browser.visit(config.dmvUrl,{ debug: true }, function(err, browser2, status) {
	        // I found that these Errors can happen when there's connectivity issues
	        if (err != undefined) {
	        	if(err.message.includes("ENOTFOUND") || err.message.includes("Timeout" || err.message.includes("No open window"))){ 
	            	console.log("ERROR occured getting the site! Skipping...")
	            	console.log(err.message)
	            	callback(locIndex)
	           	 	return
	        	}
	        }
	    	if (browser.text("title") != 'Make Appointment') {
	    		console.log("Faild in loading initial page ... skipping...")
	            callback(locIndex)
	            return;
	    	}
	
	        //console.log(browser.text("title"));
	        browser.select("officeId",location[0]);     // fill out location ID
	        browser.check(config.taskID)                    
	        browser.choose("numberItems","1")
	        browser.fill("firstName",config.firstName)
	        browser.fill("lastName",config.lastName)
	
	        browser.fill("telArea",config.tel[0])
	        browser.fill("telPrefix",config.tel[1])
	        browser.fill("telSuffix",config.tel[2])
	        browser.pressButton("Continue", function(err) {
	
	            // make sure the correct site was loaded and not some weird error happened
	            if (browser.text("title") != 'Appointment'){
	                console.log("something went wrong after submiting form ... skipping...")
	                callback(locIndex)
	                return;
	            }
	            var result = browser.html('td[data-title="Appointment"]>p:nth-child(2)>strong')
	            result = result.replace('<strong>', '');
	            result = result.replace('</strong>', '');
	            availableDate = new Date(result.split('at'));
	            console.log("Appointment available in " + location[1] + " at:")
	            console.log(availableDate);
	            if(availableDate < config.dateLimit){       // If the appointment is within our limit 
	                console.log("Wohooo! It's before " + dateLimitString)
	                messageText = location[1] + " on\r\n" + availableDate
	                messageFile = location[1] + "<br>on<br>" + availableDate
	                // write to log file
	                writeFile(messageFile)
	                // send the Test-Message
	                sendText("DMV Appointment avialable in " + messageText, locIndex, callback)
	                callback(locIndex)
	            } else {
	                console.log("Ugh! that's far too out :/")
	                callback(locIndex)
	            }
	        });
	    });
	} catch (err) {
	  writeErrorLog(err.message);
	  callback(locIndex);
	}
}

// write appointment to filr
function writeFile(message){
	beep(3, 1000);
	var currentTime = new Date();
    now = currentTime.getHours() + ":" + currentTime.getMinutes() + ":" + currentTime.getSeconds(); // prettier string for printing

    messageFormatted = "<table>                                 \
                          <tr>                                  \
                            <th>"+now+"</th>             \
                            <th>&nbsp;&nbsp;&nbsp;&nbsp;</th>   \
                            <th><b>"+message+"</b></th>                \
                          </tr>                                 \
                          <tr><th>&nbsp;&nbsp;&nbsp;</th></tr>  \
                        </table> "      
    fs.appendFile('log.html', messageFormatted, function (err) {
        if (err){
            console.log("ERROR writing to file")
        }
        console.log('Saved to file!');
    });
}

// write appointment to filr
function writeErrorLog(message){
	var currentTime = new Date();
    now = currentTime.getHours() + ":" + currentTime.getMinutes() + ":" + currentTime.getSeconds(); // prettier string for printing
    fs.appendFile('error.txt', "========================================\r\n" + now + "\r\n" + message, function (err) {
        if (err){
            console.log("ERROR writing to file")
        }
        console.log('Saved to file!');
    });
}

// Sent message via Twilio
function sendText(message, locIndex, callback){
	return;
    //console.log("sending SMS:\r\n" + message)
    client.sms.messages.create({
        to:config.textMsgReceiver,
        from:config.textMsgSender,
        body:message
    }, function(error, message) {
    if (!error) {
        //console.log('Success! The SID for this SMS message is:');
        //console.log(message.sid);
        console.log('Message sent on:');
        console.log(message.dateCreated);
    } else {
        console.log('Oops! There was an error.');
        console.log(error)
    }
    //callback(locIndex)
});
}
////////////////////////////////////////////////////////////////////

// Done, nothing else is here...
