/**
 * Created by songjian on 2016/9/27.
 */
function start(){
  var net = require('net');
  
  var HOST = '192.100.10.28';
  var PORT = 9003;
  
  var oaSocket = new net.Socket();
  
  function connectServer() {
    var x = oaSocket.connect(PORT, HOST);
  }
  
  connectServer();
  
  oaSocket.on('error', function (error) {
    console.log("error : " + error.toString());
  });
  
  oaSocket.on('close', function () {
    var recentDate = new Date();
    console.log('connection closed on '+recentDate);
    connectServer();
  });
  
  oaSocket.on('connect', function () {
    console.log('connect Ok.');
  });
  oaSocket.on('data', function (data) {
    var receiveData = data.toString('utf8', 0);
    console.log(receiveData);
  });
}

exports.oaClientStart = start;
