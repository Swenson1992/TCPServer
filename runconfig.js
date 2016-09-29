/**
 * Created by songjian on 2016/9/29.
 */
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');

function loadJSONFile(file){
  var json = fs.readFileSync(file).toString();
  return JSON.parse(stripJsonComments(json));
}

var config = loadJSONFile('./ipconfig.json');

var dbHOST = config.dbIPconfig.HOST;
var dbPORT = config.dbIPconfig.PORT;

var esHOST = config.esIPconfig.HOST;
var esPORT = config.esIPconfig.PORT;

var jxHOST = config.jxIPconfig.HOST;
var jxPORT = config.jxIPconfig.PORT;

var lsHOST = config.lsIPconfig.HOST;
var lsPORT = config.lsIPconfig.PORT;

var oaHOST = config.oaIPconfig.HOST;
var oaPORT = config.oaIPconfig.PORT;

var dbPushHOST = config.dbPushIPconfig.HOST;
var dbPushPORT = config.dbPushIPconfig.PORT;

var oaPushHOST = config.oaPushIPconfig.HOST;
var oaPushPORT = config.oaPushIPconfig.PORT;


exports.dbHOST = dbHOST;
exports.dbPORT = dbPORT;
exports.esHOST = esHOST;
exports.esPORT = esPORT;
exports.jxHOST = jxHOST;
exports.jxPORT = jxPORT;
exports.lsHOST = lsHOST;
exports.lsPORT = lsPORT;
exports.oaHOST = oaHOST;
exports.oaPORT = oaPORT;
exports.dbPushHOST = dbPushHOST;
exports.dbPushPORT = dbPushPORT;
exports.oaPushHOST = oaPushHOST;
exports.oaPushPORT = oaPushPORT;