// Modules
var config = require('./config');
var IRC = require('irc-js');
var tropo_backend = require('./tropo-backend');


// Constants
var SERVER = config.SERVER;
var NICK = config.NICK;
var CHANNEL = config.CHANNEL;
var options = {
	server: SERVER,
	nick: NICK
};

var TRIGGER_REGEX = 
	new RegExp('^'+NICK+'[^ A-Za-z0-9] get ([^ ]*) (.*$)*', 'i');
var ADD_TRIGGER_REGEX = 
	new RegExp('^'+NICK+'[^ A-Za-z0-9] add ([^ ]*) ([0-9]{10}$)');
var NAME_NUMBER_MAPPING = config.NAME_NUMBER_MAPPING;

var DEBUGGING = config.DEBUGGING;
var dbg = config.dbg;


// Script
var tropoEventEmitter = tropo_backend.tropoEventEmitter;

var irc = new IRC(options);
irc.connect(function(){irc.join(CHANNEL);});

irc.on('privmsg', function(msg){
	parseMsgMore(msg);

	if(handlePossibleAdd(msg)){return;}

	var options = getOptions(msg);
	var tropoSMSOptions = getTropoSMSOptions(options);

	if (options) {
		tropo_backend.send(tropoSMSOptions, function(id){
			dbg('adding listener for id: "'+id+'"');
			tropoEventEmitter.on(String(id), function(replyMsg){
				irc.privmsg(
					CHANNEL, 
					options.to + ' says: ' + replyMsg
				);
			});
		});
	}
	
});


// Helper Functions
function parseMsgMore(msg){
	msg.sender = msg.person.nick;
	msg.receiver = msg.params[0];
	msg.content = msg.params[1];
}

function getOptions(msg){
	var match = msg.content.match( TRIGGER_REGEX );
	if (match){
		return {
			to: match[1],
			msg: match[2]
		};
	}
	return false;
}

function getTropoSMSOptions(options){
	return {
		to: (NAME_NUMBER_MAPPING[options.to] || null),
		network: 'SMS',
		say: (options.msg || null)
	};		
}

function handlePossibleAdd(msg){
	var match = msg.content.match( ADD_TRIGGER_REGEX );
	if(match){
		var key = match[1];
		var value = '1'+match[2];
		dbg('Mapping '+value+' to key '+key+' in NAME_NUMBER_MAPPING');
		NAME_NUMBER_MAPPING[key] = value;
		irc.privmsg(CHANNEL, key+' now mapped to '+value);
		return true;
	}
	return false;
}
