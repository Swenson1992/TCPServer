/**
 * Created by songjian on 2016/9/29.
 */
var commonSourceServer = require("../commonSource");
var config = requrie("../runconfig");

var net = require('net');
var defaultBufferSize = 1024;
var receiveBufferSize = defaultBufferSize;
var receiveBuffer = new Buffer(defaultBufferSize);
var receiveOffset = 0;
var recentDate = new Date();

var oaPushSocket = new net.Socket();

/**
 * 函数名：start
 * 功能：接收运维后台推送消息的客户端，用于向前台推送消息
 */
function start(){
  
  function connectServer() {
    //HOST和PORT 在ipconfig.json文件中配置
    var x = oaPushSocket.connect(ipconfig.oaPushPORT, ipconfig.oaPushHOST);
  }
  connectServer();
  
  oaPushSocket.on('error', function (error) {
    console.log("error : " + error.toString());
  });
  
  oaPushSocket.on('close', function () {
    //var recentDate = new Date();
    console.log('connection closed on '+recentDate);
    connectServer();
  });
  
  oaPushSocket.on('connect', function () {
    console.log('【oa push】connect Ok.');
  });
  oaPushSocket.on('data', function (data) {
    //收到 oa 推送的消息
    bufferData(data);
  });
}

/**
 * 函数名：bufferData
 * 功能：用于接收运维后台推送的消息的数据包
 * 参数：
 *   data ：推送的数据包信息
 */
function bufferData(data){
  //如果当前数据包data的长度大于可用的receiveBuffer，new一个新的receiveData，之后进行旧有数据的拷贝。
  while (data.length > receiveBufferSize - receiveOffset) {
    //本次data需要的buffer大小为本data长度减去receiveBuffer中空闲buffer的大小。
    var dataNeedBufferSize = data.length - (receiveBufferSize - receiveOffset);
    //如果需要的buffer大小（dataNeedBufferSize）大于defaultBufferSize，则增加dataNeedBufferSize，否则增加dataNeedBufferSize，避免多个小包一起过来，导致多次扩大buffer。
    receiveBufferSize += dataNeedBufferSize > defaultBufferSize ? dataNeedBufferSize : defaultBufferSize;
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
        dealReceiveDataSJ(dealDataBuffer,SN);
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
 * 功能：用于处理运维后台所接收后台推送的数据包
 * 参数 ：
 *   dealDataBuffer ：数据包信息
 */
function dealReceiveDataSJ(dealDataBuffer) {
  
  var receivePushDataString = dealDataBuffer.toString('utf8', 0);
  // String 转换成 JSON
  var receivePushDataJSON = JSON.parse(receivePushDataString);
  console.log(recentDate+':'+'receivePushDataString :' +receivePushDataString);
  commonSourceServer.dbReceivePushArray.push(receivePushDataJSON);
}

exports.oaPushClientStart = start();