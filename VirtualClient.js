/**
 * Created by songjian on 2016/9/26.
 */
var net = require('net');

var HOST = '192.100.10.28';
var PORT = 8999;

var virtualClient = new net.Socket();

function connectServer() {
  var x = virtualClient.connect(PORT, HOST);
}

connectServer();

virtualClient.on('error', function (error) {
  console.log("error : " + error.toString());
});

virtualClient.on('close', function () {
  var recentDate = new Date();
  console.log('connection closed on '+recentDate);
  connectServer();
});

virtualClient.on('connect', function () {
  console.log('virtualClient connect Ok.');
  var dbSource = {
    "resourceType":"db",
    "requestStr":"\u0000\u0001update jsqy set SHORTNAME = '平圩电厂new2' where REMARK = '平圩电厂new'"
  };
  var dbSourceStr = JSON.stringify(dbSource);
  var dbSource1 = {
    "resourceType":"db",
    "requestStr":"\u0000\u0001select * from jspt where REMARK = '平圩电厂new'"
  };
  var dbSourceStr1 = JSON.stringify(dbSource1);
  //setInterval(function(){
  //for(var index = 0;index < 5; index++){
  //
  //}
  sendData(dbSourceStr);
  sendData(dbSourceStr1);
  //},10000);
});
virtualClient.on('data', function (data) {
  var receiveData = data.toString('utf8', 0);
  console.log(receiveData);
});


function sendData(data,resolve,reject) {
  console.log("sendData : " + data);

  var len = Buffer.byteLength(data);

  var sendBuffer = new Buffer(len + 8);
  //console.log("len of send data : " + len);

  //写入2个字节特征码
  sendBuffer.writeUInt16BE(65534, 0);//0xfffe

  //写入2个字节编号
  var SN = getSN();
  sendBuffer.writeUInt16BE(SN, 2);

  //写入4个字节表示本次包长
  sendBuffer.writeUInt32BE(len, 4);

  //写入数据
  sendBuffer.write(data, 8);


  console.log("!!!!!!!!!!!!!!!!!!!! before send buffer !!!!!!!!!!!!!!!!!!!! ");
  console.log("             recent SN : "+   SN);
  console.log("             recent sendBuffer : "+   sendBuffer.length);
  console.log("             recent sendBuffer : "+   sendBuffer.toString('utf8', 0));


  virtualClient.write(sendBuffer);


  //sendDataResolveMap.set(SN,resolve);
  //sendDataRejectMap.set(SN,reject);

}

var SNMax = 0;
function getSN(){
  SNMax++;
  if(SNMax == 65534){
    SNMax = 0;
  }
  return SNMax;
}
