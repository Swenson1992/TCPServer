/**
 * Created by songjian on 2016/9/27.
 */
var commonSourceServer = require("../commonSource");
var ipconfig = require("../runconfig");
var server = require("../Server");

var defaultBufferSize = 1024;
var receiveBufferSize = defaultBufferSize;
var receiveBuffer = new Buffer(defaultBufferSize);
var receiveOffset = 0;
var recentDate = new Date();

var net = require('net');

var flagConnect = 0;

/**
 * 函数名：start
 * 功能：oa的客户端，用于向后台 oa 服务端发送请求信息
 * 目标源：李靖峰程序
 */
function start(client) {
    var oaSocket = new net.Socket();

    function connectServer() {
        var x = oaSocket.connect(ipconfig.oaPORT, ipconfig.oaHOST);
    }

    connectServer();

    oaSocket.on('error', function (error) {
        if (flagConnect == 0) {
            commonSourceServer.errorLogFile.error(client.remoteAddress.slice(7) + ':' + client.remotePort + 'oaSocket Error :' + error.toString());
            var connectError = {
                "TYPE":"606",
                "content" : "与审计后台通信失败！"
            }
            var ErrorArray = [];
            ErrorArray.push(connectError);
            commonSourceServer.gjReceivePushArray.push(ErrorArray);
            commonSourceServer.EventEmitter.emit("receiveGJPushData");
            flagConnect = 1;
        }
        setTimeout(function(){
            connectServer();
        },5000)
    });

    oaSocket.on('close', function () {
        console.log(' oa connection closed on ' + recentDate);
        //connectServer();
    });

    oaSocket.on('connect', function () {
        console.log('[oaSocke] connect Ok.');
        flagConnect == 0;
    });
    oaSocket.on('data', function (data) {
        try {
            bufferData(data, client);
            //console.log('消息处理完成!!!!!');
        } catch (err) {
            commonSourceServer.errorLogFile.error(client.remoteAddress.slice(7) + ':' + client.remotePort + "oa_index.js bufferData function err :" + err);
        }
    });
    return oaSocket;
}

/**
 * 函数名：sendData
 * 功能 ：将前台请求信息传送给后台 oa 服务端
 * 参数 ：
 *   RequestStr ：前台请求信息
 *   SN ：向后台发送请求包的 SN 标识，暂时没用
 */
function sendData(RequestStr, SN, oaSocket) {
    commonSourceServer.requestLogFile.info("--[oa_index sendData]client send Data to OA Server:" + RequestStr);
    var len = Buffer.byteLength(RequestStr);

    var sendDbBuffer = new Buffer(len + 8);
    //console.log("len of send data : " + len);

    //写入2个字节特征码
    sendDbBuffer.writeUInt16BE(65534, 0);//0xfffe

    //写入2个字节编号
    sendDbBuffer.writeUInt16BE(SN, 2);
    //console.log("SN : " + SN);

    //写入4个字节表示本次包长
    sendDbBuffer.writeUInt32BE(len, 4);

    //写入数据
    try {
        sendDbBuffer.write(RequestStr, 8);
        oaSocket.write(sendDbBuffer);
    } catch (err) {
        commonSourceServer.errorLogFile.error("oa_index.js sendData function sendDbBuffer.write(RequestStr, 8) err :" + err);
    }
}

/**
 * 函数名：bufferData
 * 功能：用于接收后台返回请求的数据包
 * 参数：
 *   data ：返回的数据包信息
 */
function bufferData(data, client) {
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
        if (receiveBuffer.readUInt16BE(0) == 65534 || receiveBuffer.readUInt16BE(0) == 65533) {
            var SN = receiveBuffer.readUInt16BE(2);
            //console.log("SN : "+SN);
            var len = receiveBuffer.readUInt32BE(4);
            // console.log("len : " + len);
            if (len <= receiveOffset - 8) {//本条信息已经接收完成
                //根据len取出本次要处理的数据到dealDataBuffer，然后交由dealReceiveData函数处理
                var dealDataBuffer = new Buffer(len);
                receiveBuffer.copy(dealDataBuffer, 0, 8, 8 + len);
                if (receiveBuffer.readUInt16BE(0) == 65534) {
                    //处理运维审计返回的应答消息
                    //console.log('收到运维审计返回的消息');
                    dealReceiveDataSJ(dealDataBuffer, SN, client);
                }
                else if (receiveBuffer.readUInt16BE(0) == 65533) {
                    //处理运维审计推送过来的消息
                    dealReceivePushDataSJ(dealDataBuffer, SN, client);
                }
                else {
                }
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
 * 功能：用于处理所接收的数据包
 * 参数 ：
 *   dealDataBuffer ：数据包信息
 */
function dealReceiveDataSJ(dealDataBuffer, SN, client) {
    var receiveDataString = dealDataBuffer.toString('utf8', 0);
    commonSourceServer.responseLogFile.info(client.remoteAddress.slice(7) + ':' + client.remotePort + " OA Server response data :" + receiveDataString);
    // String 转换成 JSON
    var receiveDataJSON;
    try {
        receiveDataJSON = JSON.parse(receiveDataString);
    } catch (err) {
        commonSourceServer.errorLogFile.error(client.remoteAddress.slice(7) + ':' + client.remotePort + "oa_index.js dealReceiveData function receiveDataJSON = JSON.parse(receiveDataString) err :" + err);
    }
    server.sendResponseData(receiveDataJSON, SN, client);
}

/**
 * 函数名：dealReceivePushDataSJ
 * 功能：用于处理运维后台所接收后台推送的数据包
 * 参数 ：
 *   dealDataBuffer ：数据包信息
 *   SN : 后台推送数据包中的SN 暂时无效
 *   client ：跟后台连接的client
 */
function dealReceivePushDataSJ(dealDataBuffer, SN, client) {

    var receivePushDataString = dealDataBuffer.toString('utf8', 0);
    commonSourceServer.PushResponseLogFile.info(client.remoteAddress.slice(7) + ':' + client.remotePort + 'oa_index.js dealReceivePushData function receivePushDataString:' + receivePushDataString)
    // String 转换成 JSON
    var receivePushDataJSON;
    try {
        receivePushDataJSON = JSON.parse(receivePushDataString);
    } catch (err) {
        commonSourceServer.errorLogFile.error(client.remoteAddress.slice(7) + ':' + client.remotePort + "oa_index.js dealReceivePushData function receivePushDataJSON = JSON.parse(receivePushDataString) err :" + err);
    }
    server.sendPushData(receivePushDataJSON, SN, client);
}

exports.oaClientStart = start;
exports.sendData = sendData;
