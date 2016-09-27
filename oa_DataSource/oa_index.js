/**
 * Created by songjian on 2016/9/27.
 */
function start(){
  var net = require('net');
  
  var HOST = '192.100.10.28';
  var PORT = 9003;
  
  var lsSocket = new net.Socket();
  
  function connectServer() {
    var x = lsSocket.connect(PORT, HOST);
  }
  
  connectServer();
  
  lsSocket.on('error', function (error) {
    console.log("error : " + error.toString());
  });
  
  lsSocket.on('close', function () {
    var recentDate = new Date();
    console.log('connection closed on '+recentDate);
    connectServer();
  });
  
  lsSocket.on('connect', function () {
    console.log('connect Ok.');
  });
  lsSocket.on('data', function (data) {
    var receiveData = data.toString('utf8', 0);
    console.log(receiveData);
  });
}

exports.oaClientStart = start;
