/**
 * Created by songjian on 2016/9/22.
 */
function start(){
  var net = require('net');
  
  var HOST = '192.100.10.28';
  var PORT = 9001;
  
  var esSocket = new net.Socket();
  
  function connectServer() {
    var x = esSocket.connect(PORT, HOST);
  }
  
  connectServer();
  
  esSocket.on('error', function (error) {
    console.log("error : " + error.toString());
  });
  
  esSocket.on('close', function () {
    var recentDate = new Date();
    console.log('connection closed on '+recentDate);
    connectServer();
  });
  
  esSocket.on('connect', function () {
    console.log('connect Ok.');
  });
  esSocket.on('data', function (data) {
    var receiveData = data.toString('utf8', 0);
    console.log(receiveData);
  });
}

exports.esClientStart = start;