/**
 * Created by songjian on 2016/9/22.
 */
var commonSourceServer = require("../commonSource");
var ipconfig = require("../runconfig");

var defaultBufferSize = 1024;
var receiveBufferSize = defaultBufferSize;
var receiveBuffer = new Buffer(defaultBufferSize);
var receiveOffset = 0;
var recentDate = new Date();

var net = require('net');

var RecentProcess = true;//确保一个进程
var jxSocket = new net.Socket();

var recentRequestStr;//记录当前的RequestStr，在发送时如果后台程序掉线，利用这里的记录值进行重发
var recentSN;//记录当前的SN，在发送时如果后台程序掉线，利用这里的记录值进行重发
var flagConnect = 0;

/**
 * 生成 SN 标记，返回 SN 的值
 **/
var SNMax = 0;
function getSN() {
    SNMax++;
    if (SNMax == 65534) {
        SNMax = 0;
    }
    return SNMax;
}
var reconnectFlag = false;

/**
 * 函数名：start
 * 功能：jx的客户端，用于向后台 jx 服务端发送请求信息
 * 目标源：高英健程序
 */
function start() {

    function connectServer() {
        var x;
        if (reconnectFlag) {
            jxSocket.end();
            x = jxSocket.connect(ipconfig.jxPORT, ipconfig.jxHOST);
        } else {
            x = jxSocket.connect(ipconfig.jxPORT, ipconfig.jxHOST);
        }
    }

    connectServer();

    jxSocket.on('error', function (error) {
        if (flagConnect == 0) {
            commonSourceServer.errorLogFile.error('jxSocket Error :' + error.toString());
            var connectError = {
                "TYPE": "604",
                "content": "与基线后台通信失败！"
            }
            var ErrorArray = [];
            ErrorArray.push(connectError);
            commonSourceServer.gjReceivePushArray.push(ErrorArray);
            commonSourceServer.EventEmitter.emit("receiveGJPushData");
            flagConnect = 1;
        }
    });
    var runInternal;
    jxSocket.on('close', function () {
        //var recentDate = new Date();
        commonSourceServer.errorLogFile.error('jxSocket connection closed on ' + recentDate);
        runInternal = setInterval(function(){
            connectServer();
        }, 30000);
        //console.log('jxSocket connection closed on ' + recentDate);
        reconnectFlag = true;
    });

    jxSocket.on('connect', function () {
        console.log('[jxSocket] connect Ok.');
        flagConnect = 0;
        clearInterval(runInternal);
        if(!RecentProcess){
            RecentProcess = false;
            sendData(recentRequestStr, recentSN);
	}
        commonSourceServer.EventEmitter.on("sendJXRequest", function () {
            if (!!commonSourceServer.jxStrArray[0]) {
                //console.log("jxStrArray :"+commonSourceServer.jxStrArray[0]);
                //console.log("count : "+RecentProcess);
                if (RecentProcess) {
                    console.log("jxStrArray :" + commonSourceServer.jxStrArray[0]);
                    /**
                     * 将请求信息重新做包发送给后台
                     **/
                    var RequestStr = commonSourceServer.jxStrArray.shift();
                    //console.log(recentDate+':'+"RequestStr :"+RequestStr);
                    var SN = getSN();
                    recentRequestStr = RequestStr;
                    recentSN = SN;
                    commonSourceServer.jxRequestSN.push(SN);
                    sendData(RequestStr, SN);
                    RecentProcess = false;
                }
            } else {
                //console.log('[else RecentProcess]:' + RecentProcess);
            }
        })
    });
    jxSocket.on('data', function (data) {
        try {
            bufferData(data);
        } catch (err) {
            commonSourceServer.errorLogFile.error("jx_index.js bufferData function err :" + err);
        }
    });
}

/**
 * 函数名：sendData
 * 功能 ：将前台请求信息传送给后台 jx 服务端
 * 参数 ：
 *   RequestStr ：前台请求信息
 *   SN ：向后台发送请求包的 SN 标识，暂时没用
 */
function sendData(RequestStr, SN) {
    commonSourceServer.requestLogFile.info("[jx_index sendData]client send Data to JX Server:" + RequestStr);
    //console.log("[jx_index sendData]client send Data to JX Server:"+RequestStr);
    var len = Buffer.byteLength(RequestStr);

    var sendJxBuffer = new Buffer(len + 8);
    //console.log("len of send data : " + len);

    //写入2个字节特征码
    sendJxBuffer.writeUInt16BE(65534, 0);//0xfffe

    //写入2个字节编号
    sendJxBuffer.writeUInt16BE(SN, 2);

    //写入4个字节表示本次包长
    sendJxBuffer.writeUInt32BE(len, 4);

    //写入数据
    try {
        sendJxBuffer.write(RequestStr, 8);
        jxSocket.write(sendJxBuffer);
    } catch (err) {
        commonSourceServer.errorLogFile.error("jx_index.js sendData function sendDbBuffer.write(RequestStr, 8) err :" + err);
    }

}

/**
 * 函数名：bufferData
 * 功能：用于接收后台返回请求的数据包
 * 参数：
 *   data ：返回的数据包信息
 */
function bufferData(data) {
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
                receiveBuffer.copy(dealDataBuffer, 0, 8, 8 + len);
                dealReceiveDataSJ(dealDataBuffer, SN);
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
    commonSourceServer.responseLogFile.info(" JX Server response data :" + receiveDataString);
    //console.log(" JX Server response data :"+receiveDataString);
    // String 转换成 JSON
    var receiveDataJSON;
    try {
        receiveDataJSON = JSON.parse(receiveDataString);
    } catch (err) {
        receiveDataJSON = receiveDataString;
        commonSourceServer.errorLogFile.error("jx_index.js dealReceiveData function receiveDataJSON = JSON.parse(receiveDataString) err :" + err);
    }
    //console.log(" JX Server response receiveDataJSON:"+receiveDataJSON);
    commonSourceServer.jxReceiveStrArray.push(receiveDataJSON);
    //console.log('commonSourceServer.jxReceiveStrArray.push(receiveDataJSON):'+commonSourceServer.jxReceiveStrArray[0]);
    RecentProcess = true;
    commonSourceServer.EventEmitter.emit("receiveJXData");
    commonSourceServer.EventEmitter.emit("sendJXRequest");
}

exports.jxClientStart = start;