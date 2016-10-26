/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var getMediaButton = document.querySelector('button#getMedia');
var connectButton = document.querySelector('button#connect');
var hangupButton = document.querySelector('button#hangup');

getMediaButton.onclick = getMedia;
connectButton.onclick = createPeerConnection;
hangupButton.onclick = hangup;

var widthInput = document.querySelector('div#width input');
var heightInput = document.querySelector('div#height input');
var framerateInput = document.querySelector('div#framerate input');

widthInput.onchange = heightInput.onchange =
    framerateInput.onchange = displayRangeValue;

var getUserMediaConstraintsDiv =
    document.querySelector('div#getUserMediaConstraints');
var bitrateDiv = document.querySelector('div#bitrate');
var fpsDiv = document.querySelector('div#fps');
var peerDiv = document.querySelector('div#peer');
var senderStatsDiv = document.querySelector('div#senderStats');
var receiverStatsDiv = document.querySelector('div#receiverStats');

var localVideo = document.querySelector('div#localVideo video');
var remoteVideo = document.querySelector('div#remoteVideo video');
var localVideoStatsDiv = document.querySelector('div#localVideo div');
var remoteVideoStatsDiv = document.querySelector('div#remoteVideo div');

var localPeerConnection;
var remotePeerConnection;
var localStream;
var bytesPrev;
var timestampPrev;

main();

function main() {
  displayGetUserMediaConstraints();
}

function hangup() {
  trace('Ending call');
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;

  localStream.getTracks().forEach(function(track) {
    track.stop();
  });
  localStream = null;

  hangupButton.disabled = true;
  getMediaButton.disabled = false;
}

function getMedia() {
  getMediaButton.disabled = true;
  if (localStream) {
    localStream.getTracks().forEach(function(track) {
      track.stop();
    });
    var videoTracks = localStream.getVideoTracks();
    for (var i = 0; i !== videoTracks.length; ++i) {
      videoTracks[i].stop();
    }
  }
  navigator.mediaDevices.getUserMedia(getUserMediaConstraints())
  .then(gotStream)
  .catch(function(e) {
    var message = 'getUserMedia error: ' + e.name + '\n' +
        'PermissionDeniedError may mean invalid constraints.';
    alert(message);
    console.log(message);
    getMediaButton.disabled = false;
  });
}

function gotStream(stream) {
  connectButton.disabled = false;
  console.log('GetUserMedia succeeded');
  localStream = stream;
  localVideo.srcObject = stream;
}

function getUserMediaConstraints() {
  var constraints = {};
  constraints.audio = false;
  constraints.video = {};
  constraints.video.chromeMediaSource = {exact: "screen"};
  
  if (widthInput.value !== '0') {
    constraints.video.width = {exact: parseInt(widthInput.value)};
  }

  if (heightInput.value !== '0') {
    constraints.video.height = {exact: parseInt(heightInput.value)};
  }

  if (framerateInput.value !== '0') {
    constraints.video.frameRate = {exact: parseInt(framerateInput.value)};
  }
  return constraints;
}

function displayGetUserMediaConstraints() {
  var constraints = getUserMediaConstraints();
  console.log('getUserMedia constraints', constraints);
  getUserMediaConstraintsDiv.textContent =
      JSON.stringify(constraints, null, '    ');
}

function createPeerConnection() {
  connectButton.disabled = true;
  hangupButton.disabled = false;

  bytesPrev = 0;
  timestampPrev = 0;
  localPeerConnection = new RTCPeerConnection(null);
  remotePeerConnection = new RTCPeerConnection(null);
  localPeerConnection.addStream(localStream);
  console.log('localPeerConnection creating offer');
  localPeerConnection.onnegotiationeeded = function() {
    console.log('Negotiation needed - localPeerConnection');
  };
  remotePeerConnection.onnegotiationeeded = function() {
    console.log('Negotiation needed - remotePeerConnection');
  };
  localPeerConnection.onicecandidate = function(e) {
    console.log('Candidate localPeerConnection');
    if (e.candidate) {
      remotePeerConnection.addIceCandidate(
        new RTCIceCandidate(e.candidate)
      ).then(
        onAddIceCandidateSuccess,
        onAddIceCandidateError
      );
    }
  };
  remotePeerConnection.onicecandidate = function(e) {
    console.log('Candidate remotePeerConnection');
    if (e.candidate) {
      var newCandidate = new RTCIceCandidate(e.candidate);
      localPeerConnection.addIceCandidate(
        newCandidate
      ).then(
        onAddIceCandidateSuccess,
        onAddIceCandidateError
      );
    }
  };
  remotePeerConnection.onaddstream = function(e) {
    console.log('remotePeerConnection got stream');
    remoteVideo.srcObject = e.stream;
  };
  localPeerConnection.createOffer().then(
    function(desc) {
      console.log('localPeerConnection offering');
      localPeerConnection.setLocalDescription(desc);
      remotePeerConnection.setRemoteDescription(desc);
      remotePeerConnection.createAnswer().then(
        function(desc2) {
          console.log('remotePeerConnection answering');
          remotePeerConnection.setLocalDescription(desc2);
          localPeerConnection.setRemoteDescription(desc2);
        },
        function(err) {
          console.log(err);
        }
      );
    },
    function(err) {
      console.log(err);
    }
  );
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

localVideo.addEventListener('loadedmetadata', function() {
  trace('Local video videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

localVideo.onresize = function() {
  trace('Local video size changed to ' +
    localVideo.videoWidth + 'x' + localVideo.videoHeight);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    var elapsedTime = window.performance.now() - startTime;
    trace('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
};

remoteVideo.addEventListener('loadedmetadata', function() {
  trace('Remote video videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.onresize = function() {
  trace('Remote video size changed to ' +
    remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    var elapsedTime = window.performance.now() - startTime;
    trace('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
};

// Display statistics
setInterval(function() {
  if (remotePeerConnection && remotePeerConnection.getRemoteStreams()[0]) {
    remotePeerConnection.getStats(null, function(results) {
      var statsString = dumpStats(results);
      receiverStatsDiv.innerHTML = '<h2>Receiver stats</h2>' + statsString;
      // calculate video bitrate
      Object.keys(results).forEach(function(result) {
        var report = results[result];
        var now = report.timestamp;

        var bitrate;
		var fps;
        if (report.type === 'inboundrtp' && report.mediaType === 'video') {
          // firefox calculates the bitrate for us
          // https://bugzilla.mozilla.org/show_bug.cgi?id=951496
          bitrate = Math.floor(report.bitrateMean / 1024);
		  fps = report.googFrameRateReceived;
        } else if (report.type === 'ssrc' && report.bytesReceived &&
             report.googFrameHeightReceived) {
          // chrome does not so we need to do it ourselves
          var bytes = report.bytesReceived;
          if (timestampPrev) {
            bitrate = 8 * (bytes - bytesPrev) / (now - timestampPrev);
            bitrate = Math.floor(bitrate);
          }
          bytesPrev = bytes;
          timestampPrev = now;
		  fps = report.googFrameRateReceived;
        }
        if (bitrate) {
          bitrate += ' kbits/sec';
          bitrateDiv.innerHTML = '<strong>Bitrate:</strong> ' + bitrate;
		  fpsDiv.innerHTML = '<strong>FPS:</strong> ' + fps;
        }
      });

      // figure out the peer's ip
      var activeCandidatePair = null;
      var remoteCandidate = null;

      // search for the candidate pair
      Object.keys(results).forEach(function(result) {
        var report = results[result];
        if (report.type === 'candidatepair' && report.selected ||
            report.type === 'googCandidatePair' &&
            report.googActiveConnection === 'true') {
          activeCandidatePair = report;
        }
      });
      if (activeCandidatePair && activeCandidatePair.remoteCandidateId) {
        Object.keys(results).forEach(function(result) {
          var report = results[result];
          if (report.type === 'remotecandidate' &&
              report.id === activeCandidatePair.remoteCandidateId) {
            remoteCandidate = report;
          }
        });
      }
      if (remoteCandidate && remoteCandidate.ipAddress &&
          remoteCandidate.portNumber) {
        peerDiv.innerHTML = '<strong>Connected to:</strong> ' +
            remoteCandidate.ipAddress +
            ':' + remoteCandidate.portNumber;
      }
    }, function(err) {
      console.log(err);
    });
    localPeerConnection.getStats(null, function(results) {
      var statsString = dumpStats(results);
      senderStatsDiv.innerHTML = '<h2>Sender stats</h2>' + statsString;
    }, function(err) {
      console.log(err);
    });
  } else {
    console.log('Not connected yet');
  }
  // Collect some stats from the video tags.
  if (localVideo.videoWidth) {
    localVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
      localVideo.videoWidth + 'x' + localVideo.videoHeight + 'px';
  }
  if (remoteVideo.videoWidth) {
    remoteVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
      remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px';
  }
}, 1000);

// Dumping a stats variable as a string.
// might be named toString?
function dumpStats(results) {
  var statsString = '';
  Object.keys(results).forEach(function(key, index) {
    var res = results[key];
    statsString += '<h3>Report ';
    statsString += index;
    statsString += '</h3>\n';
    statsString += 'time ' + res.timestamp + '<br>\n';
    statsString += 'type ' + res.type + '<br>\n';
    Object.keys(res).forEach(function(k) {
      if (k !== 'timestamp' && k !== 'type') {
        statsString += k + ': ' + res[k] + '<br>\n';
      }
    });
  });
  return statsString;
}

// Utility to show the value of a range in a sibling span element
function displayRangeValue(e) {
  var span = e.target.parentElement.querySelector('span');
  span.textContent = e.target.value;
  displayGetUserMediaConstraints();
}
