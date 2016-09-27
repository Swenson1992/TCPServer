/**
 * Created by songjian on 2016/9/22.
 */
var commonSourceServer = require("./commonSource");
var defaultBufferSize = 1024;
var receiveBufferSize = defaultBufferSize;
var receiveBuffer = new Buffer(defaultBufferSize);
var receiveData = "";
var receiveOffset = 0;
var receiveDataString = "";
var recentDbName = "";
//服务器模块
function start(){
  var net = require('net');//1 引入net模块
  var chatServer = net.createServer();//创建net服务器
  var clientList = [];//保存多个客户端的数组

  function getClientByClientName(clientName){
    //console.log(clientList[0].name.remoteAddress);
    for(var index = 0;index < clientList.length;index++) {
      var client = clientList[index];
      client.name = {
        remoteAddress: client.remoteAddress.match(/(\d+.){3}\d+/g),
        remotePort: client.remotePort
      };
      if (client.name.remoteAddress[0] == clientName.remoteAddress[0] &&
        client.name.remotePort[0] == clientName.remotePort[0]) {
        //console.log('getClientByClientName client:' + client.name.remoteAddress);
        return client;
      }
    }
  }

  setInterval(function(){
    if(!!commonSourceServer.dbReceiveStrArray[0]){
      //console.log('commonSourceServer.dbReceiveStrArray[0]:'+commonSourceServer.dbReceiveStrArray[0]);
      var clientName = commonSourceServer.dbNameArray.shift();
      var ReceiveStr = commonSourceServer.dbReceiveStrArray.shift();
      var dbReceiveStr = JSON.stringify(ReceiveStr);
      var client = getClientByClientName(clientName);
      //console.log('client:'+client);
      var SN = commonSourceServer.dbSN[0];
      var len = Buffer.byteLength(ReceiveStr);

      var sendDbBuffer = new Buffer(len + 8);
      //console.log("len of send data : " + len);

      //写入2个字节特征码
      sendDbBuffer.writeUInt16BE(65534, 0);//0xfffe

      //写入2个字节编号
      sendDbBuffer.writeUInt16BE(SN, 2);

      //写入4个字节表示本次包长
      sendDbBuffer.writeUInt32BE(len, 4);

      //写入数据
      sendDbBuffer.write(dbReceiveStr, 8);
      client.write(sendDbBuffer);
    }else{
      console.log("dbReceiveStrArray is empty");
      console.log('【commonSourceServer.dbNameArray】='+commonSourceServer.dbNameArray);
      console.log('【commonSourceServer.dbStrArray】='+commonSourceServer.dbStrArray);
    }
  },2000);

  chatServer.on('connection', function (client) {//服务器连接客户端

    client.name ={
      remoteAddress: client.remoteAddress.match(/(\d+.){3}\d+/g),
      remotePort: client.remotePort
    };

    /*增加name属性*/
    client.write('Hi' + client.name + '!\n');

    console.log('client name remoteAddress :' + client.name.remoteAddress);
    clientList.push(client);
    client.on('data', function (data) {
      /*添加事件监听器，这样就可以访问到连接事件所对应的client对象，当client发送数据给服务器时，这一事件就会触发*/
      bufferData(data,client.name);
      //广播消息给其他客户端
      //broadcast(data,client);
    });
    //监听客户端终止
    client.on('end',function(){
      var recentEndDate = new Date();
      console.log('Trigger End : '+client.name+' is quit by '+recentEndDate);//如果某个客户端断开连接，node控制台就会打印出来
      clientList.splice(clientList.indexOf(client),1);
    });
    /*记录错误*/
    client.on('error',function(e){
      console.log('Client Error :'+e);
    });
    //监听客户端关闭
    client.on('close', function () {
      var recentDate = new Date();
      console.log('Trigger close :'+client.name+' is close by '+ recentDate);//如果某个客户端关闭，node控制台就会打印出来
      clientList.splice(clientList.indexOf(client),1);
    });

    function broadcast(message,client){
      var cleanup=[];//断开了的客户端们
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i] !== client) {
          //检查socket的可写状态
          if (clientList[i].writable) {
            // 把数据发送给其他客户端
            clientList[i].write(client.name + "says " + message);
          }else{
            /*socket不可写，则将其从列表中移除*/
            cleanup.push(clientList[i]);
            clientList[i].destroy();
          }
        }
      }
      /*删除掉服务器的客户端数组中，已断开的客户端*/
      for(var i=0;i<cleanup.length;i++){
        clientList.splice(clientList.indexOf(cleanup[i]),1);
      }
    }
  });
  //服务器端口
  chatServer.listen(8999, function(){
    console.log("server bound : 9001");
  });
}

function bufferData(data,clientName){
  //如果当前数据包data的长度大于可用的receiveBuffer，new一个新的receiveData，之后进行旧有数据的拷贝。
  while (data.length > receiveBufferSize - receiveOffset) {
    var dataNeedBufferSize = data.length - (receiveBufferSize - receiveOffset);//本次data需要的buffer大小为本data长度减去receiveBuffer中空闲buffer的大小。
    receiveBufferSize += dataNeedBufferSize > defaultBufferSize ? dataNeedBufferSize : defaultBufferSize;//如果需要的buffer大小（dataNeedBufferSize）大于defaultBufferSize，则增加dataNeedBufferSize，否则增加dataNeedBufferSize，避免多个小包一起过来，导致多次扩大buffer。
    //console.log("receiveBufferSize : " + receiveBufferSize);
    var tmpReceiveBuffer = new Buffer(receiveBufferSize);
    receiveBuffer.copy(tmpReceiveBuffer);
    receiveBuffer = tmpReceiveBuffer;
  }

  //将当前数据包data拷贝进receiveBuffer，并修改偏移量receiveOffset
  data.copy(receiveBuffer, receiveOffset);
  receiveOffset += data.length;
//  console.log("receiveOffset : " + receiveOffset);


  while (receiveOffset > 8) {//已收数据超过包头大小，开始处理数据
    // console.log("0xfffe : " + receiveBuffer.readUInt16BE(0));
    if (receiveBuffer.readUInt16BE(0) == 65534) {
      var SN = receiveBuffer.readUInt16BE(2);
      console.log("SN : "+SN);
      var len = receiveBuffer.readUInt32BE(4);
      // console.log("len : " + len);
      if (len <= receiveOffset - 8) {//本条信息已经接收完成
        //根据len取出本次要处理的数据到dealDataBuffer，然后交由dealReceiveData函数处理
        var dealDataBuffer = new Buffer(len);
        receiveBuffer.copy(dealDataBuffer,0,8,8+len);
        dealReceiveDataSJ(dealDataBuffer,clientName,SN);
        //计算出剩余的buffer的大小，从receiveBuffer中拷贝出剩余数据到leftReceiveBuffer，再将leftReceiveBuffer重新赋给receiveBuffer。
        var leftBufferSize = receiveOffset - (8 + len);
        var leftReceiveBuffer = new Buffer(leftBufferSize);
        receiveBufferSize = leftBufferSize;
        receiveBuffer.copy(leftReceiveBuffer, 0, 8 + len, receiveOffset);
        receiveBuffer = leftReceiveBuffer;
        receiveOffset -= (8 + len);
      }
      else {//没接完，跳出去，进行下一次data事件的监听
        break;
      }
    }
    else {//报文异常，执行初始化，退出
      receiveBufferSize = defaultBufferSize;
      receiveBuffer = new Buffer(receiveBufferSize);
      receiveOffset = 0;
    }
  }
}

function dealReceiveDataSJ(dealDataBuffer,clientName,SN) {

  receiveDataString = dealDataBuffer.toString('utf8', 0);

  // String 转换成 JSON
  receiveData = JSON.parse(receiveDataString);
  switch (receiveData.resourceType){
    case 'db':
      commonSourceServer.dbStrArray.push(receiveData.requestStr);
      commonSourceServer.dbNameArray.push(clientName);
      commonSourceServer.dbSN.push(SN);
      //输出log
      console.log('最顶部的 SN[0] :'+commonSourceServer.dbSN[0]);
      console.log('commonSourceServer.dbStrArray.length = '+commonSourceServer.dbStrArray.length);
      console.log('commonSourceServer.dbNameArray.length = '+commonSourceServer.dbNameArray.length);
      console.log('commonSourceServer.dbStrArray :'+commonSourceServer.dbStrArray);
      console.log('commonSourceServer.dbNameArray :'+commonSourceServer.dbNameArray);
      //最近的一个客户端
      recentDbName = commonSourceServer.dbNameArray[0];
      console.log('最近的一个客户端:'+commonSourceServer.dbNameArray[0].remoteAddress);
      break;
    case 'es':
      esStrArray.push(receiveData.requestStr);
      esNameArray.push(client.name);
      break;
    case jx:
      jxStrArray.push(receiveData.requestStr);
      jxNameArray.push(client.name);
      break;
    case ls:
      lsStrArray.push(receiveData.requestStr);
      lsNameArray.push(client.name);
      break;
    case oa:
      oaStrArray.push(receiveData.requestStr);
      oaNameArray.push(client.name);
      break;
    default :
      throw new TypeError('unknown receiveData resourceType : ' + receiveData.resourceType);
  }

}

exports.serverStart = start;