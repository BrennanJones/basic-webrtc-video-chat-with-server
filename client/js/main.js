/**
 *
 * main.js
 * Main JavaScript code
 *
 */


'use strict';

jQuery(function()
{
  var url = "https://" + window.location.hostname + ":8082";
  
  var socket = io.connect(url);
  
  var doc = jQuery(document),
      win = jQuery(window);

  var callStartTime;

  var callTakerClientPeerID;

  var facingMode = "user";


  /**
   * SOCKET MESSAGE HANDLERS
   */

  /* CONNECTION */

  socket.on('connect', function()
  {
    console.log('socket.io connected');

    if (window.clientType == 'CallTaker')
    {
      socket.emit('CallTakerClientConnect', null);
    }
    else if (window.clientType == 'Caller')
    {
      socket.emit('CallerClientConnect', null);
    }
  });

  socket.on('disconnect', function()
  {
    console.log('socket.io disconnected');

    alert("Connection with server failed.")
  });

  /* PEER */

  socket.on('StartCall', function(data)
  {
    if (window.clientType == 'Caller')
    {
      console.log('StartCall command received');

      callStartTime = data.currentServerTime;
      callTakerClientPeerID = data.callTakerClientPeerID;

      var call = peer.call(callTakerClientPeerID, window.localStream);
      step3(call);
    }
  });

  socket.on('EndCall', function(callTakerClientPeerID)
  {
    if (window.clientType == 'Caller')
    {
      console.log('EndCall command received');

      if (window.existingCall)
      {
        window.existingCall.close();
      }
    }
  });

  /* OTHER */

  socket.on('ClientDisconnect', function(clientType)
  {
    console.log('ClientDisconnect: ' + clientType);

    if (clientType == 'Caller' || clientType == 'CallTaker')
    {
      if (window.existingCall)
      {
        window.existingCall.close();
      }
    }
  });


  /**
   * PEER VIDEO CHAT
   */

  // Compatibility shim
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  // PeerJS object
  var peer = new Peer(
    { host: window.location.hostname, port: 8055, path: '/peer', secure: true, debug: 3 },
    //{ key: 's51s84ud22jwz5mi' },
    { config: {'iceServers': [
      {
        url: 'turn:numb.viagenie.ca',
        credential: 'dvc',
        username: 'brennandgj@gmail.com',
        password: 'dvcchat'
      }
    ]}});

  peer.on('open', function()
  {
    console.log('open');
    step1();
  });

  // Receiving a call
  peer.on('call', function(call)
  {
    console.log('call');

    call.answer(window.localStream);
    step3(call);
  });

  peer.on('error', function(err)
  {
    console.log("error");
    
    //alert(err.message);
    step2();
  });

  function step1()
  {
    // Get audio/video stream
    var constraints;
    if (window.clientType == "Caller")
    {
      constraints = {
        audio: true,
        video: { facingMode: { exact: facingMode } }
      };
    }
    else if (window.clientType == "CallTaker")
    {
      constraints = {
        audio: true,
        video: true
      };
    }

    navigator.getUserMedia(constraints, function(stream)
    {
      window.localStream = stream;
      $('#localVideo').prop('src', URL.createObjectURL(stream));

      if (window.clientType == 'CallTaker')
      {
        socket.emit('CallTakerClientPeerID', peer.id);
      }
      else if (window.clientType == 'Caller')
      {
        socket.emit('CallerClientPeerID', peer.id);
      }
    },
    function()
    {
      console.log("step 1 error");
    });
  }

  function step2()
  {
    if (window.clientType == 'Caller')
    {
      socket.emit('CallOffline');
    }
  }

  function step3(call)
  {
    // Hang up on an existing call if present
    if (window.existingCall)
    {
      window.existingCall.close();
    }

    if (window.clientType == 'Caller')
    {
      socket.emit('CallOnline');
    }

    // Wait for stream on the call, then set peer video display
    call.on('stream', function(stream)
    {
      console.log('stream');

      $('#remoteVideo').prop('src', URL.createObjectURL(stream));
    });

    window.existingCall = call;
    call.on('close', step2);
  }

  $('#swapCameraButton').on('click', function()
  {
    console.log("here");

    if (facingMode == "user")
    {
      facingMode = "environment";
    }
    else
    {
      facingMode = "user";
    }

    if (window.existingCall)
    {
      window.existingCall.close();
    }

    step1();
    var call = peer.call(callTakerClientPeerID, window.localStream);
    step3(call);
  });
});
