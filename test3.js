// Demo test endpoint:
// http://api.tropo.com/1.0/sessions?action=create&token=<YOUR_TROPO_VOICE_TOKEN>&to=<PHONE_NUMBER>&network=SMS&say=hi2u

// Modules
var express = require('express');
var tropo_webapi = require('tropo-webapi');
var u = require('underscore');

// Constants
var PORT = 8767;
var TXT_REPLY_TIMEOUT = 60;	//in seconds

// Script
var app = express.createServer();

app.configure(function(){
	app.use(express.bodyParser());
});

app.all('/', function(req,res){
	var tropo = new TropoWebAPI();

	var options = req.body.session.parameters;
	console.log(options);
	tropoCallWrapper( tropo, options );

	var say = tropoSayWrapper( options );
	var choices = new Choices(null, null, '[ANY]');
	tropoAskWrapper( tropo, u(options).extend({
		name: 'usrTxtReply',
		say: say,
		choices: choices,
		timeout: TXT_REPLY_TIMEOUT
	}));

	tropo.on('continue', null, '/continue', true);

	console.log(TropoJSON(tropo));
	res.send(TropoJSON(tropo));

});

app.all('/continue', function(req,res){
	var tropo = new TropoWebAPI();
	console.log(req.body);
	var answer = req.body['result']['actions']['value'];
	console.log('GOT SMS ANSWER: '+answer);

});

app.listen(8767);

// Helper functions
function tropoCallWrapper( tropo, options ){
//note: the tropo.call method actually differs from the WebAPI docs
//the actual arguments are:
//to, answerOnMedia, channel, from, headers, name, network, recording, required, timeout
        tropo.call(
                options.to || null,
                options.answerOnMedia || null,
                options.channel || null,
                options.from || null,
                options.headers|| null,
                options.name || null,
                options.network || null,
                options.recording || null,
                options.required || null,
                options.timeout || null
        );
}

function tropoAskWrapper( tropo, options ){
//note: the tropo.ask method actually differs from the WebAPI docs
//the actual arguments are:
// (choices, attempts, bargein, minConfidence, name, recognizer, required, say, timeout, voice);
        tropo.ask(
                options.choices || null,
                options.attempts || null,
                options.bargein || null,
                options.minConfidence || null,
                options.name || null,
                options.recognizer || null,
                options.required || null,
                options.say || null,
                options.timeout || null,
                options.voice || null
        );
}

function tropoSayWrapper( options ){
	return new Say( options.say || null );
}
