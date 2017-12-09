/**
 * Created by songjian on 2016/9/26.
 */
var log4js = require("log4js");
// var log4js_config = require(process.env.HOME + "/github/TCPServer/log4js.json");
log4js.configure({
  "appenders": [{
    "category": "console",
    "type": "console"
  }, {
    "category": "log_info",
    "type": "file",
    "filename": process.env.HOME + "/uiserver/UIServer/logs/log_info/info.log",
    "maxLogSize": 10485760,
    "backups": 2
  }, {
    "category": "log_response",
    "type": "file",
    "filename": process.env.HOME + "/uiserver/UIServer/logs/log_response/response.log",
    "maxLogSize": 10485760,
    "backups": 2
  }, {
    "category": "log_request",
    "type": "file",
    "filename": process.env.HOME + "/uiserver/UIServer/logs/log_request/request.log",
    "maxLogSize": 10485760,
    "backups": 2
  }, {
    "category": "log_error",
    "type": "file",
    "filename": process.env.HOME + "/uiserver/UIServer/logs/log_error/error.log",
    "maxLogSize": 10485760,
    "backups": 2
  },{
    "category": "log_client",
    "type": "file",
    "filename": process.env.HOME + "/uiserver/UIServer/logs/log_client/client.log",
    "maxLogSize": 10485760,
    "backups": 2
  }, {
    "category": "log_push",
    "type": "file",
    "filename": process.env.HOME + "/uiserver/UIServer/logs/log_push/push.log",
    "maxLogSize": 10485760,
    "backups": 2
  }],
  "replaceConsole": true,
  "levels": {
    "log_info": "ALL",
    "log_response": "ALL",
    "log_request": "ALL",
    "log_error": "ALL",
    "log_client": "ALL",
    "log_push": "ALL"
  }
});
/*
 * log4js的levels配置共分为8个等级(也就是日志等级),
 * 由低到高分别为:ALL TRACE DEBUG INFO WARN ERROR FATAL OFF.
 * 在配置文件中更改(log4j.json)
 * */
var clientLogFile = log4js.getLogger('log_client');
var infoLogFile = log4js.getLogger('log_info');
var responseLogFile = log4js.getLogger('log_response');
var PushResponseLogFile = log4js.getLogger('log_push');
var requestLogFile = log4js.getLogger('log_request');
var errorLogFile = log4js.getLogger('log_error');

exports.clientLogFile = clientLogFile;
exports.infoLogFile = infoLogFile;
exports.responseLogFile = responseLogFile;
exports.requestLogFile = requestLogFile;
exports.errorLogFile = errorLogFile;
exports.PushResponseLogFile = PushResponseLogFile;

var events = require("events");

var EventEmitter = new events.EventEmitter();
EventEmitter.setMaxListeners(0);

exports.EventEmitter = EventEmitter;



var dbStrArray = [],dbNameArray = [],dbReceiveStrArray = [],dbSN = [],dbRequestSN = [];
var gjStrArray = [],gjNameArray = [],gjReceiveStrArray = [],gjSN = [],gjRequestSN = [];
var esStrArray = [],esNameArray = [],esReceiveStrArray = [],esSN = [],esRequestSN = [];
var jxStrArray = [],jxNameArray = [],jxReceiveStrArray = [],jxSN = [],jxRequestSN = [];
var lsStrArray = [],lsNameArray = [],lsReceiveStrArray = [],lsSN = [],lsRequestSN = [];
var oaStrArray = [],oaNameArray = [],oaReceiveStrArray = [],oaSN = [],oaRequestSN = [];
var yxStrArray = [],yxNameArray = [],yxReceiveStrArray = [],yxSN = [],yxRequestSN = [];
var gjReceivePushArray = [];


/**
  存储db(gj、es、jx、ls、oa)的请求信息和客户端名
    exports.dbStrArray = dbStrArray;
    exports.dbNameArray = dbNameArray;
  存储后台返回的db(gj、es、jx、ls、oa)的消息
    exports.dbReceiveStrArray = dbReceiveStrArray;
  存储客户端请求时db(gj、es、jx、ls、oa)的SN值
    exports.dbSN = dbSN;
  存储向后台请求时db(gj、es、jx、ls、oa)的SN值
    exports.dbRequestSN = dbRequestSN;
  存储后台自动推送的db(gj、oa)的消息
    exports.gjReceivePushArray = gjReceivePushArray;
**/

/** 数据库 **/
exports.dbStrArray = dbStrArray;
exports.dbNameArray = dbNameArray;
exports.dbReceiveStrArray = dbReceiveStrArray;
exports.dbSN = dbSN;
exports.dbRequestSN = dbRequestSN;
/** 告警 **/
exports.gjStrArray = gjStrArray;
exports.gjNameArray = gjNameArray;
exports.gjReceiveStrArray = gjReceiveStrArray;
exports.gjSN = gjSN;
exports.gjRequestSN = gjRequestSN;
/** elasticsearch **/
exports.esStrArray = esStrArray;
exports.esNameArray = esNameArray;
exports.esReceiveStrArray = esReceiveStrArray;
exports.esSN = esSN;
exports.esRequestSN = esRequestSN;
/** 基线 **/
exports.jxStrArray = jxStrArray;
exports.jxNameArray = jxNameArray;
exports.jxReceiveStrArray = jxReceiveStrArray;
exports.jxSN = jxSN;
exports.jxRequestSN = jxRequestSN;
/** 漏扫 **/
exports.lsStrArray = lsStrArray;
exports.lsNameArray = lsNameArray;
exports.lsReceiveStrArray = lsReceiveStrArray;
exports.lsSN = lsSN;
exports.lsRequestSN = lsRequestSN;
/** 运维审计 **/
exports.oaStrArray = oaStrArray;
exports.oaNameArray = oaNameArray;
exports.oaReceiveStrArray = oaReceiveStrArray;
exports.oaSN = oaSN;
exports.oaRequestSN = oaRequestSN;
/** 运行状态 **/
exports.yxStrArray = yxStrArray;
exports.yxNameArray = yxNameArray;
exports.yxReceiveStrArray = yxReceiveStrArray;
exports.yxSN = yxSN;
exports.yxRequestSN = yxRequestSN;
/** 推送信息 **/
exports.gjReceivePushArray = gjReceivePushArray;