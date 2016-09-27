/**
 * Created by songjian on 2016/9/22.
 */
function start(){
  var net = require('net');
  
  var HOST = '192.100.10.28';
  var PORT = 9002;
  
  var jxSocket = new net.Socket();
  
  function connectServer() {
    var x = jxSocket.connect(PORT, HOST);
  }
  
  connectServer();
  
  jxSocket.on('error', function (error) {
    console.log("error : " + error.toString());
  });
  
  jxSocket.on('close', function () {
    var recentDate = new Date();
    console.log('connection closed on '+recentDate);
    connectServer();
  });
  
  jxSocket.on('connect', function () {
    console.log('connect Ok.');
  });
  jxSocket.on('data', function (data) {
    var receiveData = data.toString('utf8', 0);
    console.log(receiveData);
  });
}

exports.jxClientStart = start;