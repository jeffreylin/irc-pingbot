// Modules
var http = require('http');
var express = require('express');
var app = express.createServer();
var tropo_webapi = require('tropo-webapi');
var irc_js = require('irc-js');

// Constants
var SERVE_ON_PORT = 8767;
var IRC_SERVER = 'irc.rizon.net';
var IRC_NICK = 'wonted-pingbot';
var IRC_CHANNEL = '#wonted-test';
var IRC_OPTIONS = {
	server: IRC_SERVER,
	nick: IRC_NICK
}
var TRIGGER_REGEX = new RegExp( IRC_NICK + '[^a-zA-Z0-9]* get ([^ ]*) (.*$)', 'i' );
var TXT_REPLY_TIMEOUT = 60;

// Start the IRC client and join the desired channel
var irc = new irc_js( IRC_OPTIONS );
irc.connect(function(){
	irc.join( IRC_CHANNEL );
});

// IRC event handlers
irc.on('privmsg', function(msg){

	sanitizeMsgInput(msg);
	var trigger = checkTrigger(msg);
	if(trigger){
		sendAlert(trigger.nick, trigger.msg);
	}

	function checkTrigger(msg){
		var match = msg.content.match( TRIGGER_REGEX );
		if(match){
			return {
				nick: match[1],
				msg: {	//TODO: desuckify name confusion
					content: match[2],
					sender: msg.sender
				}
			};
		}
		return false;
	}

	function sanitizeMsgInput(msg){
		msg.sender = msg.person.nick;
		msg.reciever = msg.params[0];
		msg.content = msg.params[1];
	}

});

// Alert function
function sendAlert(nick, msg){
	var alertEndpoints = getAlertEndpoints(nick);
	if(alertEndpoints){
		for (endpoint in alertEndpoints){
			var option = alertEndpoints[endpoint];	//TODO: make options an obj?
			switch(endpoint){
				case 'txt':
					sendTxtAlert(option, msg);
					return;
				default:
					errMsg('DEV: I don\'t understand the endpoint "' + endpoint + '"');
			}
		}
	}
	errMsg('Can\'t alert ' + nick + ' - No handlers assigned to ' + nick + '!');

	function errMsg(msg){
		irc.privmsg(IRC_CHANNEL, msg);
	}
}

function getAlertEndpoints(nick){
	// TODO: all the things!

	var nickToEndpointMapping = {
		jeffrey: {
			txt: '6508393710'
		}
	}
	return nickToEndpointMapping[nick] || false;
}

function sendTxtAlert(phoneNumber, msg){
	var tropo = new TropoWebAPI();
	tropoCallWrapper( tropo, {
		to: phoneNumber,
		network: 'SMS',
	});

	var say = new Say(msg.sender + ': ' + msg.content);
//	var choices = new Choices('[ANY]');
	tropoAskWrapper( tropo, {
//		choices: choices,
		name: 'userTxtReply',
		say: say,
		timeout: TXT_REPLY_TIMEOUT
	});

	tropo.on('continue', null, '/continue', true);

	res.send(TropoJSON(tropo));
}

// Server event handlers - for Tropo
app.configure(function(){
	app.use(express.bodyParser());
});

app.post('/continue', function(req,res){
	console.log(answer);
	var answer = req.body['result']['actions']['value'];
	irc.privmsg( IRC_CHANNEL, 'lalalala reply' );
	
	var tropo = new TropoWebAPI();
	tropo.say('Your message to ' + IRC_CHANNEL + ' has been sent.');
	res.send(TropoJSON(tropo));
});

function tropoCallWrapper( tropo, options ){
	tropo.call(
		options.to || null,
		options.allowSignals || null,
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
	tropo.ask(
		options.choices || null,
		options.allowSignals || null,
		options.attempts || null,
		options.bargein || null,
		options.interdigitTimeout || null,
		options.minConfidence || null,
		options.name || null,
		options.recognizer || null,
		options.required || null,
		options.say || null,
		options.timeout || null,
		options.voice || null
	);
}

app.listen( SERVE_ON_PORT );
console.log('Server started on port ' + SERVE_ON_PORT + '. Enjoy! =D');

