/**
 * Created by songjian on 2016/9/22.
 */

var dbClient = require("./db_DataSource/db_index");
//var esClient = require("./es_DataSource/es_index");
//var jxClient = require("./jx_DataSource/jx_index");
//var lsClient = require("./ls_DataSource/ls_index");
//var oAClient = require("./oa_DataSource/oA_index");

var server = require("./Server");

dbClient.dbClientStart();
//esClient.esClientStart();
//jxClient.jxClientStart();
//lsClient.lsClientStart();
//oAClient.oAClientStart();

server.serverStart();