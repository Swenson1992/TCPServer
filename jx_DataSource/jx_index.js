/**
 * Created by songjian on 2016/9/22.
 */
var commonSourceServer = require("../commonSource");

var defaultBufferSize = 1024;
var receiveBufferSize = defaultBufferSize;
var receiveBuffer = new Buffer(defaultBufferSize);
var receiveOffset = 0;
var receiveDataStr = "";
var recentDate = new Date();

var net = require('net');
/**
 * jx 的 HOST 以及 PORT 连接
 */
var HOST = '192.100.10.28';
var PORT = 9000;
var RecentProcess = true;//确保一个进程
var dbSocket = new net.Socket();

/**
 * 生成 SN 标记，返回 SN 的值
 **/
var SNMax = 0;
function getSN(){
  SNMax++;
  if(SNMax == 65534){
    SNMax = 0;
  }
  return SNMax;
}

/**
 * 函数名：start
 * 功能：db的客户端，用于向后台 db 服务端发送请求信息，
 */
function start(){

  function connectServer() {
    var x = dbSocket.connect(PORT, HOST);
  }
  connectServer();

  dbSocket.on('error', function (error) {
    console.log("error : " + error.toString());
  });

  dbSocket.on('close', function () {
    //var recentDate = new Date();
    console.log('connection closed on '+recentDate);
    connectServer();
  });

  dbSocket.on('connect', function () {
    console.log('connect Ok.');
    setInterval(function(){
      if(!!commonSourceServer.dbStrArray[0]){
        //console.log("dbStrArray :"+commonSourceServer.dbStrArray[0]);
        //console.log("count : "+RecentProcess);
        if(RecentProcess){
          //console.log(recentDate+':'+"dbStrArray :"+commonSourceServer.dbStrArray[0]);
          /**
           * 将请求信息重新做包发送给后台
           **/
          var RequestStr = commonSourceServer.dbStrArray.shift();
          //console.log(recentDate+':'+"RequestStr :"+RequestStr);
          var SN = getSN();
          commonSourceServer.dbRequestSN.push(SN);
          sendData(RequestStr,SN);
          RecentProcess = false;
        }
      }else{
        //console.log('[else RecentProcess]:' + RecentProcess);
      }
    },1000);
  });
  dbSocket.on('data', function (data) {
    //var receiveData = data.toString('utf8', 0);
    //console.log(recentDate+':'+'receiveData :' +receiveData);
    bufferData(data);
    //console.log("Trigger data RecentProcess = "+ RecentProcess);
  });
}

/**
 * 函数名：sendData
 * 功能 ：将前台请求信息传送给后台 db 服务端
 * 参数 ：
 *   RequestStr ：前台请求信息
 *   SN ：向后台发送请求包的 SN 标识，暂时没用
 */
function sendData(RequestStr,SN){
  var dbReceiveStr = JSON.stringify(RequestStr);//转成字符串
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
  dbSocket.write(sendDbBuffer);
}

/**
 * 函数名：bufferData
 * 功能：用于接收后台返回请求的数据包
 * 参数：
 *   data ：返回的数据包信息
 */
function bufferData(data){
  //如果当前数据包data的长度大于可用的receiveBuffer，new一个新的receiveData，之后进行旧有数据的拷贝。
  while (data.length > receiveBufferSize - receiveOffset) {
    var dataNeedBufferSize = data.length - (receiveBufferSize - receiveOffset);//本次data需要的buffer大小为本data长度减去receiveBuffer中空闲buffer的大小。
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
 * 功能：用于处理所接收的数据包，在此处控制单进程
 * 参数 ：
 *   dealDataBuffer ：数据包信息
 */
function dealReceiveDataSJ(dealDataBuffer) {

  var receiveDataString = dealDataBuffer.toString('utf8', 0);
  // String 转换成 JSON
  receiveDataStr = JSON.parse(receiveDataString);
  console.log(recentDate+':'+'receiveDataString :' +receiveDataString);
  commonSourceServer.dbReceiveStrArray.push(receiveDataStr);
  //console.log(recentDate+':'+'dbReceiveStrArray[0] :' +commonSourceServer.dbReceiveStrArray[0].resourceType);
  //console.log(recentDate+':'+'dbReceiveStrArray[0] :' +commonSourceServer.dbReceiveStrArray[0].result.songjian);
  RecentProcess = true;
}

exports.jxClientStart = start;