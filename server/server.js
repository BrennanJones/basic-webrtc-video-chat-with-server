/**
 *
 * server.js
 * Node.js Server
 *
 */


"use strict";

var filesystem = require('fs');

var options = {
  key: filesystem.readFileSync('key.pem'),
  cert: filesystem.readFileSync('cert.pem')
};

var app = require('https').createServer(options, handler);
var io = require('socket.io', { rememberTransport: false, transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] })(app);
var node_static = require('node-static');
var fs = new node_static.Server('../client');
var PeerServer = require('peer').PeerServer;
var server = PeerServer(
	{
		port: 8055,
		path: '/peer',
		ssl:
		{
    		key: filesystem.readFileSync('key.pem'),
    		cert: filesystem.readFileSync('cert.pem')
    	}
    });

// If the URL of the server is opened in a browser.
function handler(request, response)
{
	request.addListener('end', function() {
		fs.serve(request, response);
	}).resume();
}

app.listen(8082);

console.log('Server started. [' + (new Date()).toString() + ']');


/* CLIENT SOCKET SESSION IDs */
var callerClientSocketSessionID = null;
var callTakerClientSocketSessionID = null;

/* PEER */
var callerClientPeerID;
var callTakerClientPeerID;
var callIsOnline = false;


io.sockets.on('connection', function(socket)
{
	var clientAddress = socket.request.connection.remoteAddress;

	console.log('A client (' + clientAddress + ') connected [' + (new Date()).toString() + ']');

	var clientType;

	socket.on('disconnect', function()
	{
		console.log(((clientType == 'Caller' || clientType == 'CallTaker') ? clientType : 'A') +
			' client (' + clientAddress + ') disconnected [' + (new Date()).toString() + ']');
		io.sockets.emit('ClientDisconnect', clientType);

		if (clientType == 'Caller')
		{
			callerClientSocketSessionID = null;
			callerClientPeerID = null;
		}
		else if (clientType == 'CallTaker')
		{
			callTakerClientSocketSessionID = null;
			callTakerClientPeerID = null;
		}
	});


	if (callerClientSocketSessionID != null)
	{
		socket.emit('ClientConnect', 'Caller');
	}
	else
	{
		socket.emit('ClientDisconnect', 'Caller');
	}

	if (callTakerClientSocketSessionID != null)
	{
		socket.emit('ClientConnect', 'CallTaker');
	}
	else
	{
		socket.emit('ClientDisconnect', 'CallTaker');
	}

	if (callIsOnline)
	{
		socket.emit('CallOnline');
	}
	else
	{
		socket.emit('CallOffline')
	}


	/**
	 * SOCKET MESSAGE HANDLERS
	 */
	
	/* DEBUGGING */
	
	socket.on('Echo', function(data)
	{
		console.log(data + '[' + (new Date()).toString() + ']');
	});


	/* CONNECTION */

	socket.on('CallerClientConnect', function(data)
	{
		if (callerClientSocketSessionID == null)
		{
			callerClientSocketSessionID = socket.id;
			console.log('Caller client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Caller';

			io.sockets.emit('ClientConnect', 'Caller');
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized caller client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});

	socket.on('CallTakerClientConnect', function(data)
	{
		if (callTakerClientSocketSessionID == null)
		{
			callTakerClientSocketSessionID = socket.id;
			console.log('Call-taker client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'CallTaker';
			
			io.sockets.emit('ClientConnect', 'CallTaker');
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized call-taker client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});
	

	/* PEER */

	socket.on('CallerClientPeerID', function(data)
	{
		console.log('CallerClientPeerID: ' + data + ' [' + (new Date()).toString() + ']');

		callerClientPeerID = data;
		trySendCallCommand();
	});
	
	socket.on('CallTakerClientPeerID', function(data)
	{
		console.log('CallTakerClientPeerID: ' + data + ' [' + (new Date()).toString() + ']');

		callTakerClientPeerID = data;
		trySendCallCommand();
	});

	socket.on('CallOnline', function(data)
	{
		console.log('CallOnline [' + (new Date()).toString() + ']');
		
		callIsOnline = true;
		io.sockets.emit('CallOnline');
	});

	socket.on('CallOffline', function(data)
	{
		console.log('CallOffline [' + (new Date()).toString() + ']');
		
		callIsOnline = false;
		io.sockets.emit('CallOffline');
	});

	// io.sockets.emit('EndCall');


	function trySendCallCommand()
	{
		if (callTakerClientPeerID && callerClientPeerID)
		{
			io.sockets.emit('StartCall', {
				callTakerClientPeerID: callTakerClientPeerID,
				currentServerTime: Date.now()
			});
		}
	}
});
