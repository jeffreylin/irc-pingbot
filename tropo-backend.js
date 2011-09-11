// Demo test endpoint:
// http://api.tropo.com/1.0/sessions?action=create&token=<YOUR_TROPO_VOICE_TOKEN>&to=<PHONE_NUMBER>&network=SMS&say=hi2u

// Modules
var config = require('./config');
var events = require('events');
var express = require('express');
var http = require('http');
var tropo_webapi = require('tropo-webapi');
var querystring = require('querystring');
var u = require('underscore');
var util = require('util');

// Constants
var PORT = 8767;
var TXT_REPLY_TIMEOUT = 60;	//in seconds
var DEBUGGING = true;
var dbg = function(msg){
	if (DEBUGGING) { console.log(msg); }
};
var ENDPOINT_TRIGGER_REQUEST_OPTIONS = {
	host: 'api.tropo.com',
	port: 80,
	method: 'POST',
	headers: {
		"Accept": 'application/json',
		"Content-Type": 'application/json'
	}
};
var TROPO_VOICE_TOKEN = config.TROPO_VOICE_TOKEN;

// Script
var app = express.createServer();
var answerCallback = function(){};

app.configure(function(){
	app.use(express.bodyParser());
});

app.all('/', function(req,res){
	var tropo = new TropoWebAPI();

	var options = req.body.session.parameters;
	dbg('Got options: '+util.inspect(options));
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

	dbg('Replying with Tropo JSON: '+TropoJSON(tropo));
	res.send(TropoJSON(tropo));
});

app.all('/continue', function(req,res){
	var tropo = new TropoWebAPI();
	dbg('Got /continue request body: '+util.inspect(req.body));
	var answer = req.body['result']['actions']['value'];
	dbg('GOT SMS ANSWER: '+answer);
	answerCallback( req.body );
});

app.listen( PORT );

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

// Exports for use as NodeJS module
var tropoEventEmitter = new events.EventEmitter();
exports.tropoEventEmitter = tropoEventEmitter;

tropoEventEmitter.on('newListenter', function(ev, li){console.log([ev, li]);});

answerCallback = function(reqBody){
	dbg('emitting event: "'+reqBody.result.sessionId+'"');

	tropoEventEmitter.on(reqBody.result.sessionId, function(val){
		console.log(val);
	});

	tropoEventEmitter.emit(
		String(reqBody.result.sessionId),
		reqBody.result.actions.value
	);
}

exports.send = function(options, cb){
	// accept a hash with properties 'to', 'network' and 'say'
	var qs = querystring.stringify( u(options).extend({
		action: 'create',
		token: TROPO_VOICE_TOKEN
	}) );

	var opts = 
		u(ENDPOINT_TRIGGER_REQUEST_OPTIONS).extend({
			path: '/1.0/sessions?' + qs
		});

	dbg('Send options: '+util.inspect(opts));

	http.request(
		opts,
		function(res){
			var buf = '';
			res.on('data', function(chunk){
				buf += chunk;
			});
			res.on('end', function(){
				dbg('Got buf '+buf);
				cb(querystring.parse(buf).id.trim());	//TODO: WTF trim hack??
			});
		}
	).on('error', function(err){
		dbg(String(err));
	}).end();
};

exports.setDebugging = function(debugging){
	DEBUGGING = debugging;
};

exports.setDbg = function(fn){
	dbg = fn;
};
