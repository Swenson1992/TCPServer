/**
 * Created by songjian on 2016/9/22.
 */

var dbClient = require("./db_DataSource/db_index");
//var esClient = require("./es_DataSource/es_index");
//var jxClient = require("./jx_DataSource/jx_index");
//var lsClient = require("./ls_DataSource/ls_index");
//var oAClient = require("./oa_DataSource/oa_index");
//var dbPushClient = require("./push_DataSource/dbPush_index");

var server = require("./Server");

dbClient.dbClientStart();
//esClient.esClientStart();
//jxClient.jxClientStart();
//lsClient.lsClientStart();
//oAClient.oaClientStart();
//dbPushClient.dbPushClientStart();

server.serverStart();