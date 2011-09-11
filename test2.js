var http = require('http');
var tropo_webapi = require('tropo-webapi');

// constants
var PORT = 8767;
var HOST = 'localhost';

http.createServer(function(req,res){
	var buf = '';
	req.on('data', function(data){
		buf += data;
	}

	req.on('end', function(){
		var options = parseOptions(buf);
		var tropo = new TropoWebAPI();
		tropoCallWrapper( tropo, options );
		res.end(TropoJSON(tropo));
	});

	function parseOptions(input){
		var json = JSON.parse(input);
		return {
			to: json.to,
			
		};
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

	console.log(req);
	var tropo = new TropoWebAPI();
	tropo.call("+16508393710", null, null, null, null, null, "SMS", null, null, null);
	tropo.say('test @'+String(new Date()));
	res.end(TropoJSON(tropo));
}).listen(PORT);
