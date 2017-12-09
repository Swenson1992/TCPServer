/**
 * Created by songjian on 2016/9/22.
 */

//const memeye = require('memeye');
//memeye();

var dbClient = require(process.env.PSSSP_HOME + "/uiserver/UIServer/db_DataSource/db_index");
//var gjClient = require("./gj_DataSource/gj_index");
//var esClient = require("./es_DataSource/es_index");
var jxClient = require(process.env.PSSSP_HOME + "/uiserver/UIServer/jx_DataSource/jx_index");
var lsClient = require(process.env.PSSSP_HOME + "/uiserver/UIServer/ls_DataSource/ls_index");

var server = require(process.env.PSSSP_HOME + "/uiserver/UIServer//Server");

dbClient.dbClientStart();
//gjClient.gjClientStart();
//esClient.esClientStart();
jxClient.jxClientStart();
lsClient.lsClientStart();

server.serverStart();
