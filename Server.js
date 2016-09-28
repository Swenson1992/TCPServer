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
/**
 * 该服务端用于接收前台传过来的请求命令，是db、es、jx、ls、oa的总服务端，
 */
function start(){
  var net = require('net');//引入net模块
  var chatServer = net.createServer();//创建net服务器
  var clientList = [];//保存多个客户端的数组

  /**
   * 遍历客户端列表的客户端名称，找到返回的client
   * clientName : commonSourceServer.dbNameArray 的第一个client
   * retrun client
   */
  function getClientByClientName(clientName){
    //console.log(clientList[0].name.remoteAddress);
    for(var index = 0;index < clientList.length;index++) {
      var client = clientList[index];
      client.name = {
        remoteAddress: client.remoteAddress.slice(7),//remoteAddress = ::ffff:192.1100.10.28 截取后面的IP
        remotePort: client.remotePort
      };
      //console.log('getClientByClientName client:' + client.name.remoteAddress);
      if (client.name.remoteAddress == clientName.remoteAddress &&
        client.name.remotePort == clientName.remotePort) {
        //console.log('getClientByClientName client:' + client.name.remoteAddress);
        return client;
      }
    }
  }

  /**
   *请求式：每间隔2秒对后台返回的消息数组轮询，如果有消息返回，存储clientName、ReceiveStr，
   *       删除 NameArray 的顶部 client 和收到消息的数组顶部消息，获取SN做包传回给前台
   *推送式: 如果有推送信息，则推送给每一个客户端
   */
  setInterval(function(){
    /** 数据库 **/
    if(!!commonSourceServer.dbReceiveStrArray[0]){
      //console.log('commonSourceServer.dbReceiveStrArray[0]:'+commonSourceServer.dbReceiveStrArray[0]);
      var clientName = commonSourceServer.dbNameArray.shift();//客户端名
      var receiveStr = commonSourceServer.dbReceiveStrArray.shift();

      var client = getClientByClientName(clientName);
      //console.log('client:'+client);
      var SN = commonSourceServer.dbSN.shift();
      sendRequestData(receiveStr,SN,client);
    }else{
      //console.log("dbReceiveStrArray is empty");
      //console.log('【commonSourceServer.dbNameArray】='+commonSourceServer.dbNameArray);
      //console.log('【commonSourceServer.dbStrArray】='+commonSourceServer.dbStrArray);
    }
    /** elasticsearch **/
    if(!!commonSourceServer.esReceiveStrArray[0]){
      //console.log('commonSourceServer.dbReceiveStrArray[0]:'+commonSourceServer.dbReceiveStrArray[0]);
      var clientName = commonSourceServer.esNameArray.shift();//客户端名
      var receiveStr = commonSourceServer.esReceiveStrArray.shift();

      var client = getClientByClientName(clientName);
      //console.log('client:'+client);
      var SN = commonSourceServer.esSN.shift();
      sendRequestData(receiveStr,SN,client);
    }else{

    }
    /** 基线 **/
    if(!!commonSourceServer.jxReceiveStrArray[0]){
      //console.log('commonSourceServer.dbReceiveStrArray[0]:'+commonSourceServer.dbReceiveStrArray[0]);
      var clientName = commonSourceServer.jxNameArray.shift();//客户端名
      var receiveStr = commonSourceServer.jxReceiveStrArray.shift();

      var client = getClientByClientName(clientName);
      //console.log('client:'+client);
      var SN = commonSourceServer.jxSN.shift();
      sendRequestData(receiveStr,SN,client);
    }else{

    }
    /** 漏扫 **/
    if(!!commonSourceServer.lsReceiveStrArray[0]){
      //console.log('commonSourceServer.dbReceiveStrArray[0]:'+commonSourceServer.dbReceiveStrArray[0]);
      var clientName = commonSourceServer.lsNameArray.shift();//客户端名
      var receiveStr = commonSourceServer.lsReceiveStrArray.shift();

      var client = getClientByClientName(clientName);
      //console.log('client:'+client);
      var SN = commonSourceServer.lsSN.shift();
      sendRequestData(receiveStr,SN,client);
    }else{

    }
    /** 运维审计 **/
    if(!!commonSourceServer.oaReceiveStrArray[0]){
      //console.log('commonSourceServer.dbReceiveStrArray[0]:'+commonSourceServer.dbReceiveStrArray[0]);
      var clientName = commonSourceServer.oaNameArray.shift();//客户端名
      var receiveStr = commonSourceServer.oaReceiveStrArray.shift();

      var client = getClientByClientName(clientName);
      //console.log('client:'+client);
      var SN = commonSourceServer.oaSN.shift();
      sendRequestData(receiveStr,SN,client);
    }else{

    }
    /**
     * 检测是否有数据库后台推送告警信息 ，推送至所有连接的客户端client
     */
    if(!!commonSourceServer.dbReceivePushArray[0]){
      var receivePushStr = commonSourceServer.dbReceivePushArray.shift();
      for(var tag = 0; tag < clientList.length; tag++){
        sendPushData(receivePushStr,clientList[tag],0);
      }
    }else{

    }
  },2000);

  chatServer.on('connection', function (client) {//服务器连接客户端

    /*增加name属性*/
    client.name ={
      remoteAddress: client.remoteAddress.slice(7),
      remotePort: client.remotePort
    };

    console.log('client name :' + client.name.remoteAddress+':'+client.name.remotePort);

    clientList.push(client);

    client.on('data', function (data) {
      //console.log('收到的客户端侧请求信息：'+data.toString('utf8',0));
      /*添加事件监听器，这样就可以访问到连接事件所对应的client对象，当client发送数据给服务器时，这一事件就会触发*/
      bufferData(data,client.name);
    });
    //监听客户端终止
    client.on('end',function(){
      var recentEndDate = new Date();
      console.log('Trigger End : '+client.name.remoteAddress+':'+client.name.remotePort+' is quit by '+recentEndDate);
      //如果某个客户端断开连接，node控制台就会打印出来
      clientList.splice(clientList.indexOf(client),1);
    });
    /*记录错误*/
    client.on('error',function(e){
      console.log('Client Error :'+e);
    });
    //监听客户端关闭
    client.on('close', function () {
      var recentDate = new Date();
      console.log('Trigger close :'+client.name.remoteAddress+':'+client.name.remotePort+' is close by '+ recentDate);
      //如果某个客户端关闭，node控制台就会打印出来
      clientList.splice(clientList.indexOf(client),1);
    });
  });
  //服务器端口
  chatServer.listen(8999, function(){
    console.log("server bound : 8999");
  });
}

/**
 * 函数名：sendRequestData
 * 功能 ：将后台返回信息传送给前端客户端
 * 参数 ：
 *   ReceiveStr ：后台返回的数据
 *   SN ：客户端请求包的 SN 标识
 *   client : 客户端名称
 */
function sendRequestData(ReceiveStr,SN,client){
  var dbReceiveStr = JSON.stringify(ReceiveStr);
  //console.log('dbReceiveStr :'+dbReceiveStr);
  var len = Buffer.byteLength(dbReceiveStr);

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
}

/**
 * 函数名：sendPushData
 * 功能 ：将后台返回信息传送给前端客户端,这里特征码为 fffd 表示后台推送的数据
 * 参数 ：
 *   ReceiveStr ：后台返回的数据
 *   SN ：标记(推送的SN暂时为0)
 *   client : 客户端名称
 */
function sendPushData(ReceivePushStr, client, SN){
  var dbReceivePushStr = JSON.stringify(ReceivePushStr);
  //console.log('dbReceiveStr :'+dbReceiveStr);
  var len = Buffer.byteLength(dbReceiveStr);
  var sendDbPushBuffer = new Buffer(len + 8);
  //console.log("len of send data : " + len);

  //写入2个字节特征码
  sendDbPushBuffer.writeUInt16BE(65533, 0);//0xfffd

  //写入2个字节编号
  sendDbPushBuffer.writeUInt16BE(SN, 2);

  //写入4个字节表示本次包长
  sendDbPushBuffer.writeUInt32BE(len, 4);

  //写入数据
  sendDbPushBuffer.write(dbReceivePushStr, 8);
  client.write(sendDbPushBuffer);
}

/**
 * 函数名：bufferData
 * 功能：用于接收数据包
 * 参数：
 *   data ：数据包信息
 *   clientName ：客户端名称
 */
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
  //console.log("receiveOffset : " + receiveOffset);


  while (receiveOffset > 8) {//已收数据超过包头大小，开始处理数据
    // console.log("0xfffe : " + receiveBuffer.readUInt16BE(0));
    if (receiveBuffer.readUInt16BE(0) == 65534) {
      var SN = receiveBuffer.readUInt16BE(2);
      //console.log("SN : "+SN);
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

/**
 * 函数名：dealReceiveDataSJ
 * 功能：用于处理从前台所接收的数据包
 * 参数 ：
 *   dealDataBuffer ：数据包信息
 *   clientName ：客户端名称
 *   SN ：数据包标记
 */
function dealReceiveDataSJ(dealDataBuffer,clientName,SN) {

  receiveDataString = dealDataBuffer.toString('utf8', 0);

  // String 转换成 JSON
  receiveData = JSON.parse(receiveDataString);
  console.log('处理收到的请求：'+receiveDataString);
  switch (receiveData.resourceType){
    case 'db':
      commonSourceServer.dbStrArray.push(receiveData.requestStr);
      commonSourceServer.dbNameArray.push(clientName);
      commonSourceServer.dbSN.push(SN);
      //输出log
      //console.log('最顶部的 SN[0] :'+commonSourceServer.dbSN[0]);
      //console.log('commonSourceServer.dbStrArray.length = '+commonSourceServer.dbStrArray.length);
      //console.log('commonSourceServer.dbNameArray.length = '+commonSourceServer.dbNameArray.length);
      //console.log('【server】commonSourceServer.dbStrArray :'+commonSourceServer.dbStrArray);
      //console.log('commonSourceServer.dbNameArray :'+commonSourceServer.dbNameArray);
      break;
    case 'es':
      commonSourceServer.esStrArray.push(receiveData.requestStr);
      commonSourceServer.esNameArray.push(clientName);
      commonSourceServer.esSN.push(SN);
      break;
    case 'jx':
      commonSourceServer.jxStrArray.push(receiveData.requestStr);
      commonSourceServer.jxNameArray.push(clientName);
      commonSourceServer.jxSN.push(SN);
      break;
    case 'ls':
      commonSourceServer.lsStrArray.push(receiveData.requestStr);
      commonSourceServer.lsNameArray.push(clientName);
      commonSourceServer.lsSN.push(SN);
      break;
    case 'oa':
      commonSourceServer.oaStrArray.push(receiveData.requestStr);
      commonSourceServer.oaNameArray.push(clientName);
      commonSourceServer.oaSN.push(SN);
      break;
    default :
      throw new TypeError('unknown receiveData resourceType : ' + receiveData.resourceType);
  }

}

exports.serverStart = start;