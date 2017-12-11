/**
 * Created by songjian on 2016/9/22.
 */

var url = require("url");
var utils = require(process.env.PSGSM_HOME + "/uiserver/UIServer/utils");
var es = require(process.env.PSGSM_HOME + "/uiserver/UIServer/esDataSource");

var commonSourceServer = require(process.env.PSGSM_HOME + "/uiserver/UIServer/commonSource");
//var oAClient = require("./oa_DataSource/oa_index");
//var fs = require();

var defaultBufferSize = 1024;
var receiveBufferSize = defaultBufferSize;
var receiveBuffer = new Buffer(defaultBufferSize);
var receiveData = "";
var receiveOffset = 0;
var receiveDataString = "";
var port = 8999;

/**
 * 该服务端用于接收前台传过来的请求命令，是db、es、jx、ls、oa的总服务端，
 */
function start() {
    var net = require('net');//引入net模块
    var chatServer = net.createServer();//创建net服务器
    var clientList = [];//保存多个客户端的数组
    var clientListName = [];

    /**
     * 遍历客户端列表的客户端名称，找到返回的client
     * clientName : commonSourceServer.dbNameArray 的第一个client
     * retrun client
     */
    function getClientByClientName(clientName) {
        for (var index = 0; index < clientList.length; index++) {
            var client = clientList[index];
            if (client.remoteAddress.substr(2, 4) == 'ffff') {
                /*增加凝思的name属性*/
                client.name = {
                    remoteAddress: client.remoteAddress.slice(7),
                    remotePort: client.remotePort,
                    connectState: "连接中",
                    "TYPE": "501"
                };
            } else {
                /*增加麒麟的name属性*/
                client.name = {
                    remoteAddress: client.remoteAddress,
                    remotePort: client.remotePort,
                    connectState: "连接中",
                    "TYPE": "501"
                };
            }
            console.warn('getClientByClientName client:' + client.name.remoteAddress);
            if (client.name.remoteAddress == clientName.remoteAddress &&
                client.name.remotePort == clientName.remotePort) {
                console.error('getClientByClientName client OK:' + client.name.remoteAddress);
                return client;
            }
        }
        return -1;
    }

    /**
     *请求式：触发式对后台返回的消息数组轮询，如果有消息返回，存储clientName、ReceiveStr，
     *       删除 NameArray 的顶部 client 和收到消息的数组顶部消息，获取SN做包传回给前台
     *推送式: 如果有推送信息，则推送给每一个客户端
     */
    commonSourceServer.EventEmitter.addListener("receiveDBData", function () {
        //console.log("into receiveDBData EventEmitter addListener!!!!");
        /** 数据库 **/
        if (!!commonSourceServer.dbReceiveStrArray[0]) {
            var Date1 = new Date();
            var dbClientName = commonSourceServer.dbNameArray.shift();//客户端名	   
            var dbReceiveStr = commonSourceServer.dbReceiveStrArray.shift();
            var dbClient = getClientByClientName(dbClientName);
            //console.log('dbClient Name:'+dbClient);
            var dbSN = commonSourceServer.dbSN.shift();
            console.log(Date1+"   SN: "+JSON.stringify(dbSN));
            // sendResponseData(dbReceiveStr, dbSN, dbClient);
            if (dbClient === -1) {
            } else {
                sendResponseData(dbReceiveStr, dbSN, dbClient);
            }
        } else {
            //console.log("-----dbReceiveStrArray is empty!-----");
        }
    })
    commonSourceServer.EventEmitter.addListener("receiveESData", function () {
        //console.log("into receiveESData EventEmitter addListener!!!!");
        /** elasticsearch **/
        if (!!commonSourceServer.esReceiveStrArray[0]) {
            //console.log('commonSourceServer.dbReceiveStrArray[0]:'+commonSourceServer.dbReceiveStrArray[0]);
            var esClientName = commonSourceServer.esNameArray.shift();//客户端名
            var esReceiveStr = commonSourceServer.esReceiveStrArray.shift();

            var esClient = getClientByClientName(esClientName);
            //console.log('dbClient Name:'+esClient);
            var esSN = commonSourceServer.esSN.shift();
            sendResponseData(esReceiveStr, esSN, esClient);
        } else {
            //console.log("-----esReceiveStrArray is empty!-----");
        }
    })
    commonSourceServer.EventEmitter.addListener("receiveGJData", function () {
        //console.log("into receiveGJData EventEmitter addListener!!!!");
        /** 告警 **/
        if (!!commonSourceServer.gjReceiveStrArray[0]) {
            console.log('commonSourceServer.gjReceiveStrArray[0]:' + commonSourceServer.gjReceiveStrArray[0]);
            var receivePushStr = commonSourceServer.gjReceiveStrArray.shift();
            for (var tag = 0; tag < clientList.length; tag++) {
                sendPushData(receivePushStr, 0, clientList[tag]);
                //console.log('gj sendPushData clientList[] = '+clientList[tag].name);
            }
        } else {

        }
    })
    commonSourceServer.EventEmitter.addListener("receiveJXData", function () {
        //console.log("into receiveJXData EventEmitter addListener!!!!");
        /** 基线 **/
        if (commonSourceServer.jxReceiveStrArray[0] === 0 || !!commonSourceServer.jxReceiveStrArray[0]) {
            //console.log('commonSourceServer.jxReceiveStrArray[0]:'+commonSourceServer.jxReceiveStrArray[0]);
            var jxClientName = commonSourceServer.jxNameArray.shift();//客户端名
            var jxReceiveStr = commonSourceServer.jxReceiveStrArray.shift();

            var jxClient = getClientByClientName(jxClientName);
            //console.log('client:'+client);
            var jxSN = commonSourceServer.jxSN.shift();
            sendJXResponseData(jxReceiveStr, jxSN, jxClient);
        } else {
            //console.log("-----jxReceiveStrArray is empty!-----::"+commonSourceServer.jxReceiveStrArray[0]);
        }
    })
    commonSourceServer.EventEmitter.addListener("receiveLSData", function () {
        console.log("into receiveLSData EventEmitter addListener!!!!");
        /** 漏扫 **/
        if (!!commonSourceServer.lsReceiveStrArray[0]) {
            //console.log('commonSourceServer.dbReceiveStrArray[0]:'+commonSourceServer.dbReceiveStrArray[0]);
            var lsClientName = commonSourceServer.lsNameArray.shift();//客户端名
            var lsReceiveStr = commonSourceServer.lsReceiveStrArray.shift();

            var lsClient = getClientByClientName(lsClientName);
            console.info('client:' + lsClient);
            var lsSN = commonSourceServer.lsSN.shift();
            sendResponseData(lsReceiveStr, lsSN, lsClient);
        } else {
            console.error("-----lsReceiveStrArray is empty!-----");
        }
    })
    commonSourceServer.EventEmitter.addListener("receiveGJPushData", function () {
        /**
         * 检测是否有数据库后台推送告警信息 ，推送至所有连接的客户端client
         */
        if (!!commonSourceServer.gjReceivePushArray[0]) {
            var receivePushStr = commonSourceServer.gjReceivePushArray.shift();
            //console.log(typeof receivePushStr);
            console.log("receivePushStr:", receivePushStr);
            for (var tag = 0; tag < clientList.length; tag++) {
                sendPushData(receivePushStr, 0, clientList[tag]);
                //console.log('gj sendPushData clientList[] = '+clientList[tag].name);
            }
        } else {
            //console.log("-----gjReceivePushArray is empty!-----");
        }
    })
    commonSourceServer.EventEmitter.addListener("returnClientName", function () {
        /**
         * 返回所连接的客户端 Name 和 remotePort
         */
        //console.log("into returnClientName EventEmitter addListener!!!!");
        if (!!clientListName) {

            var yxClientName = commonSourceServer.yxNameArray.shift();//客户端名

            var yxClient = getClientByClientName(yxClientName);
            //console.log('dbClient Name:'+dbClient);
            var yxSN = commonSourceServer.yxSN.shift();
            sendResponseData(clientListName, yxSN, yxClient);
        } else {
            //console.log("-----dbReceiveStrArray is empty!-----");
        }
    })

    chatServer.on('connection', function (client) {//服务器连接客户端

        /**
         * 增加麒麟和凝思的ip获取
         */
        if (client.remoteAddress.substr(2, 4) == 'ffff') {
            /*增加凝思的name属性*/
            client.name = {
                remoteAddress: client.remoteAddress.slice(7),
                remotePort: client.remotePort,
                connectState: "连接中",
                "TYPE": "501"
            };
        } else {
            /*增加麒麟的name属性*/
            client.name = {
                remoteAddress: client.remoteAddress,
                remotePort: client.remotePort,
                connectState: "连接中",
                "TYPE": "501"
            };
        }

        //var oaSocket = oAClient.oaClientStart(client);
        console.log('client name :' + client.name.remoteAddress + ':' + client.name.remotePort);
        commonSourceServer.clientLogFile.info('Client ' + client.name.remoteAddress + ':' + client.name.remotePort + ' connected');

        clientList.push(client);
        clientListName.push(client.name);
        commonSourceServer.gjReceivePushArray.push(clientListName);
        commonSourceServer.EventEmitter.emit("receiveGJPushData");

        client.on('data', function (data) {
            commonSourceServer.requestLogFile.info('收到【' + client.name.remoteAddress +":"+ client.name.remotePort + ' 】的客户端侧请求信息：' + data.toString('utf8', 0));
            /*添加事件监听器，这样就可以访问到连接事件所对应的client对象，当client发送数据给服务器时，这一事件就会触发*/
            //data1= bufferData(data,client.name);
            /*
             * 区分运维审计和其他数据源
             * 运维审计：多个socket；
             * */
            try {
                bufferData(data, client.name, client);
            }
            catch (err) {
                commonSourceServer.errorLogFile.error(client.name.remoteAddress +":"+client.name.remotePort+ "--> Server.js bufferData function err :" + err);
            }
        });
        //监听客户端终止
        client.on('end', function () {
            var recentEndDate = new Date();
            //console.log('end Client : ' + client.name.remoteAddress + ':' + client.name.remotePort + ' is quited in ' + recentEndDate);
            //如果某个客户端断开连接，node控制台就会打印出来
            var index = clientList.indexOf(client);
            if (index != -1) {
                clientList.splice(index, 1);
                for (var temp = 0; temp < clientListName.length; temp++) {
                    //console.log(clientListName.length);
                    //console.log(clientListName[temp]);
                    if (clientListName[temp].remotePort === client.name.remotePort) {
                        commonSourceServer.clientLogFile.info('Client ' + client.name.remoteAddress + ':' + client.name.remotePort + ' exited');
                        clientListName.splice(temp, 1);
                        break;
                    }
                }
            }
            //clientListName.splice(clientListName.indexOf(client.name.remotePort), 1);
            //console.log("clientListName:"+JSON.stringify(clientListName));
            commonSourceServer.gjReceivePushArray.push(clientListName);
            commonSourceServer.EventEmitter.emit("receiveGJPushData");
            //clientListName.splice(clientListName.indexOf(client.name.remotePort), 1);
        });
        /*记录错误*/
        client.on('error', function (e) {
            commonSourceServer.errorLogFile.error(client.name.remoteAddress + 'Client Error :' + e);
            //broadcast(client);
        });
        //监听客户端关闭
        client.on('close', function () {
            var recentDate = new Date();
            //console.log('close Client ' + client.name.remoteAddress + ':' + client.name.remotePort + ' is closed in ' + recentDate);
            //如果某个客户端关闭，node控制台就会打印出来
            //oaSocket.end();

            var index = clientList.indexOf(client);
            if (index != -1) {
                clientList.splice(index, 1);
                for (var temp = 0; temp < clientListName.length; temp++) {
                    //console.log(clientListName.length);
                    //console.log(clientListName[temp]);
                    if (clientListName[temp].remotePort === client.name.remotePort) {
                        commonSourceServer.clientLogFile.info('Client【' + client.name.remoteAddress + ':' + client.name.remotePort + '】exited');
                        clientListName.splice(temp, 1);
                        break;
                    }
                }
            }
            //clientListName.splice(clientListName.indexOf(client.name.remotePort), 1);
            //console.log("clientListName:" + JSON.stringify(clientListName));
            commonSourceServer.gjReceivePushArray.push(clientListName);
            commonSourceServer.EventEmitter.emit("receiveGJPushData");
        });
    });
    //服务器端口
    chatServer.listen(port, function () {
        console.log("listen port: " + port);
    });
}

/**
 * 函数名：sendResponseData
 * 功能 ：将后台返回信息传送给前端客户端
 * 参数 ：
 *   ReceiveStr ：后台返回的数据
 *   SN ：客户端请求包的 SN 标识
 *   client : 客户端名称
 */
function sendResponseData(ReceiveStr, SN, client) {
    var receiveStr = JSON.stringify(ReceiveStr);
    commonSourceServer.responseLogFile.info('sendResponseData To 【'+client.name.remoteAddress+':'+client.name.remotePort+'】');
    commonSourceServer.responseLogFile.info('sendResponseData ReceiveStr is:' + receiveStr);
    //console.log('sendResponseData ReceiveStr is:'+receiveStr);
    var len = Buffer.byteLength(receiveStr);

    var sendDbBuffer = new Buffer(len + 8);
    //console.log("len of send data : " + len);

    //写入2个字节特征码
    sendDbBuffer.writeUInt16BE(65534, 0);//0xfffe

    //写入2个字节编号
    sendDbBuffer.writeUInt16BE(SN, 2);
    //console.log("Server sendResponseData SN : " + SN);

    //写入4个字节表示本次包长
    sendDbBuffer.writeUInt32BE(len, 4);

    //写入数据
    sendDbBuffer.write(receiveStr, 8);
    try {
        client.write(sendDbBuffer);
    } catch (err) {
        commonSourceServer.errorLogFile.error("client.write(sendDbBuffer) err" + err);
    }
}

/**
 * 函数名：sendJXResponseData
 * 功能 ：将后台返回信息传送给JX前端客户端
 * 参数 ：
 *   ReceiveStr ：后台返回的数据
 *   SN ：客户端请求包的 SN 标识
 *   client : 客户端名称
 */
function sendJXResponseData(ReceiveStr, SN, client) {
    var receiveStr = JSON.stringify(ReceiveStr);
    commonSourceServer.responseLogFile.info('sendResponseData ReceiveStr is:' + receiveStr);
    //console.log('sendResponseData ReceiveStr is:' + receiveStr);
    var len = Buffer.byteLength(receiveStr);

    var sendDbBuffer = new Buffer(len + 8);
    //console.log("len of send data : " + len);

    //写入2个字节特征码
    sendDbBuffer.writeUInt16BE(65534, 0);//0xfffe

    //写入2个字节编号
    sendDbBuffer.writeUInt16BE(SN, 2);
    //console.log("Server sendResponseData SN : " + SN);

    //写入4个字节表示本次包长
    sendDbBuffer.writeUInt32BE(len, 4);

    //写入数据
    sendDbBuffer.write(receiveStr, 8);
    try {
        client.write(sendDbBuffer);
    } catch (err) {
        commonSourceServer.errorLogFile.error(" sendJXResponseData client.write(sendDbBuffer) err" + err);
    }
}

/**
 * 函数名：sendPushData
 * 功能 ：将后台返回信息传送给前端客户端,这里特征码为 fffd 表示后台推送的数据
 * 参数 ：
 *   ReceiveStr ：后台返回的数据
 *   SN ：标记(推送的SN暂时为0)
 *   client : 客户端名称
 */
function sendPushData(ReceivePushStr, SN, client) {
    var receivePushStr;
    try {
        receivePushStr = JSON.stringify(ReceivePushStr);
    } catch (err) {
        commonSourceServer.errorLogFile.error("Server.js sendPushData function dbReceivePushStr = JSON.stringify(ReceivePushStr) err :" + err);
    }
    commonSourceServer.PushResponseLogFile.info('sendPushData ReceivePushStr:' + receivePushStr);
    var len = Buffer.byteLength(receivePushStr);
    var sendDbPushBuffer = new Buffer(len + 8);
    //console.log("len of send data : " + len);

    //写入2个字节特征码
    sendDbPushBuffer.writeUInt16BE(65533, 0);//0xfffd

    //写入2个字节编号
    sendDbPushBuffer.writeUInt16BE(SN, 2);

    //写入4个字节表示本次包长
    sendDbPushBuffer.writeUInt32BE(len, 4);

    //写入数据
    try {
        sendDbPushBuffer.write(receivePushStr, 8);
    } catch (err) {
        commonSourceServer.errorLogFile.error(" sendPushData sendDbPushBuffer.write(receivePushStr, 8) err" + err);
    }
    try {
        client.write(sendDbPushBuffer);
    } catch (err) {
        commonSourceServer.errorLogFile.error(" sendPushData client.write(sendDbPushBuffer) err" + err);
    }

}

/**
 * 函数名：bufferData
 * 功能：用于接收数据包
 * 参数：
 *   data ：数据包信息
 *   clientName ：客户端名称
 */
function bufferData(data, clientName, client) {
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
        //console.log("0xfffe : " + receiveBuffer.readUInt16BE(0));
        if (receiveBuffer.readUInt16BE(0) == 65534) {
            var SN = receiveBuffer.readUInt16BE(2);
            //console.log("SN : "+SN);
            var len = receiveBuffer.readUInt32BE(4);
            //console.log("len : " + len);
            if (len <= receiveOffset - 8) {//本条信息已经接收完成
                //根据len取出本次要处理的数据到dealDataBuffer，然后交由dealRequestData函数处理
                var dealDataBuffer = new Buffer(len);
                receiveBuffer.copy(dealDataBuffer, 0, 8, 8 + len);
                dealRequestData(dealDataBuffer, clientName, SN, client);
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
 * 函数名：dealRequestData
 * 功能：用于处理从前台请求所接收的数据包
 * 参数 ：
 *   dealDataBuffer ：数据包信息
 *   clientName ：客户端名称
 *   SN ：数据包标记
 */
function dealRequestData(dealDataBuffer, clientName, SN, client) {
    receiveDataString = dealDataBuffer.toString('utf8', 0);
    // String 转换成 JSON
    try {
        receiveData = JSON.parse(receiveDataString);
    } catch (err) {
        commonSourceServer.errorLogFile.error(clientName.remoteAddress+":"+clientName.remotePort + "  :Server.js dealRequestData function receiveData = JSON.parse(receiveDataString) err :" + err);
    }
    commonSourceServer.requestLogFile.info("DataExchange 收到【"+clientName.remoteAddress+":"+clientName.remotePort + '】的【' + receiveData.resourceType + '】的请求');
    commonSourceServer.requestLogFile.info("请求消息 ：" + receiveDataString);
    var newDate = new Date();
    console.log(newDate.toDateString() + ':SN 【' + SN + '】:消息 ：' + receiveDataString);
    switch (receiveData.resourceType) {
        case 'db':
            commonSourceServer.dbStrArray.push(receiveData.requestStr);
            commonSourceServer.dbNameArray.push(clientName);
            commonSourceServer.dbSN.push(SN);
            commonSourceServer.EventEmitter.emit("sendDBRequest");
            break;
        case 'es':
            console.log("es query get : ", receiveData);
            commonSourceServer.esStrArray.push(receiveData.requestStr);
            commonSourceServer.esNameArray.push(clientName);
            commonSourceServer.esSN.push(SN);
            var query = decodeURI(url.parse(receiveData.url).query);

            var paraArray = [];
            paraArray.push(successProcess);
            paraArray.push(errorProcess);
            var queryType = "get" + utils.getUrlQueryString(query, 't');
            console.log("queryType : " + queryType);
            var ip = utils.getUrlQueryString(query, 'ip');
            if (ip != "") { paraArray.push(ip) }
            var date = utils.getUrlQueryString(query, 'date');
            paraArray.push(date);
            /*var endDate = utils.getUrlQueryString(query,'endDate');
            if (endDate != ''){
                paraArray.push(endDate);
            }*/

            var alarmtype = utils.getUrlQueryString(query, 'alarmtype');
            paraArray.push(alarmtype);
            var warningLevels = utils.getUrlQueryString(query, 'warningLevels');
            paraArray.push(warningLevels);
            var searchDetails = utils.getUrlQueryString(query, 'searchDetails');
            paraArray.push(searchDetails);
            var offSet = utils.getUrlQueryString(query, 'offset');
            paraArray.push(offSet);
            var limitValue = utils.getUrlQueryString(query, 'limit');
            paraArray.push(limitValue);
            var sortName = utils.getUrlQueryString(query, 'sortName');
            paraArray.push(sortName);
            var sortOrder = utils.getUrlQueryString(query, 'sortOrder');
            paraArray.push(sortOrder);
            var id = utils.getUrlQueryString(query, 'id');
            paraArray.push(id);


            es[queryType].apply(this, paraArray);



            function successProcess(returnData) {
                var receiveStr = returnData;
                sendResponseData(receiveStr, SN, client);
            }
            function errorProcess(error) {
                var receiveStr = error;
                sendResponseData(receiveStr, SN, client);
            }
            break;
        case 'jx':
            commonSourceServer.jxStrArray.push(receiveData.requestStr);
            commonSourceServer.jxNameArray.push(clientName);
            commonSourceServer.jxSN.push(SN);
            commonSourceServer.EventEmitter.emit("sendJXRequest");
            break;
        case 'ls':
            commonSourceServer.lsStrArray.push(receiveData.requestStr);
            commonSourceServer.lsNameArray.push(clientName);
            commonSourceServer.lsSN.push(SN);
            commonSourceServer.EventEmitter.emit("sendLSRequest");
            break;
        case 'sj':
            //oAClient.sendData(receiveData.requestStr, SN, oaSocket);
            break;
        case 'gj':
            commonSourceServer.gjStrArray.push(receiveData.requestStr);
            commonSourceServer.gjNameArray.push(clientName);
            commonSourceServer.gjSN.push(SN);
            //commonSourceServer.EventEmitter.emit("sendGJRequest");
            break;
        case 'yx':
            commonSourceServer.yxStrArray.push(receiveData.requestStr);
            commonSourceServer.yxNameArray.push(clientName);
            commonSourceServer.yxSN.push(SN);
            commonSourceServer.EventEmitter.emit("returnClientName");
            break;
        default:
            if (typeof receiveData.resourceType != undefined) {
                commonSourceServer.errorLogFile.error(clientName + ':Server.js resourceType error :' + receiveData.resourceType);
            }
    }
}

exports.serverStart = start;
exports.sendResponseData = sendResponseData;
exports.sendPushData = sendPushData;
