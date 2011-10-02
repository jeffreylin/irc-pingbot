// Modules
var config = require('./config');
var IRC = require('irc-js');
var tropo_backend = require('./tropo-backend');
var util = require('util');

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
			delete(lastMessageHash.id);
			tropoEventEmitter.on(String(id), function(replyMsg){
				if(isDuplicate(id, replyMsg)){return;}
				irc.privmsg(
					CHANNEL, 
					options.to + ' says: ' + replyMsg
				);
			});
		});
	}
	
});

irc.on('error', function(err){
	dbg('Got error: '+util.inspect(err));
	dbg('Restarting IRC client');
	try{
		irc.disconnect();
	}
	catch (err) {
		dbg('Disconnect error: '+err);
	}
	irc.connect(function(){irc.join(CHANNEL);});	
})

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
			msg: msg.sender+' in '+CHANNEL+' says: '+match[2]
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
		var value = '1'+match[2];	// make sure we add a 1 in front of the phone #
		dbg('Mapping '+value+' to key '+key+' in NAME_NUMBER_MAPPING');
		NAME_NUMBER_MAPPING[key] = value;
		var replyTo = (msg.receiver != NICK) ? msg.receiver : msg.sender;
		irc.privmsg(replyTo, key+' now mapped to '+value);
		return true;
	}
	return false;
}

var lastMessageHash = {};
function isDuplicate(sessionID, msg){
	if(lastMessageHash[sessionID] == msg){
		return true;
	}
	lastMessageHash[sessionID] = msg;
	return false;
}



