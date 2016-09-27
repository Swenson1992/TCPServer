/**
 * Created by songjian on 2016/9/26.
 */

var net = require('net');//1 引入net模块
var dbServer = net.createServer();//创建net服务器

dbServer.on('connection', function (socket) {//服务器连接客户端
  socket.name ={
    remoteAddress:socket.remoteAddress.match(/(\d+.){3}\d+/g),
    remotePort:socket.remotePort
  };
  socket.on('data', function (data) {
    console.log("Virtual Server :"+data);
    var dbSourceResult = {
      "resourceType":"db",
      "result":{
        "songjian" :"1122",
        "count" : "123"
      }
    };
    var dbSourceStr = JSON.stringify(dbSourceResult);
    console.log("dbSourceStr : " + dbSourceStr);

    var len = Buffer.byteLength(dbSourceStr);

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
    sendBuffer.write(dbSourceStr, 8);

    socket.write(sendBuffer);
  });
  //监听客户端终止
  socket.on('end',function(){
    console.log(''+socket.name.remoteAddress+'quit');//如果某个客户端断开连接，node控制台就会打印出来
  });
  /*记录错误*/
  socket.on('error',function(e){
    console.log(socket.name.remoteAddress+':'+socket.name.remotePort+' Error :'+e);
  });
  socket.on('close', function () {
    console.log('Trriger close :socket【'+socket.name.remoteAddress+':'+socket.name.remotePort+'】 is close');
  });
});
//服务器端口
dbServer.listen(9000, function(){
  console.log("Db Server : 9000");
});

var SNMax = 0;
function getSN(){
  SNMax++;
  if(SNMax == 65534){
    SNMax = 0;
  }
  return SNMax;
}
