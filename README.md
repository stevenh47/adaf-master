This is originally from https://github.com/michaelbeyhs/adaf, I updated some codes and used in April, 2018

# ADAF

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


    How to use:
    - download and install npm: https://www.npmjs.com/get-npm
    - get to this folder in command line and run:
    - npm install
    - npm start

    Dependencies:
    - require('twilio');
	- require("zombie");

    This works for the California DMV site at the time of writing (05.04.2017)


    Copyright: None, use for whatever you want!

    -- Michael Beyhs --