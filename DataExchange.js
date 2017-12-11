/**
 * Created by songjian on 2016/9/22.
 */

if (process.env.PSGSM_HOME) {
    var dbClient = require(process.env.PSGSM_HOME + "/uiserver/UIServer/db_DataSource/db_index");
    var jxClient = require(process.env.PSGSM_HOME + "/uiserver/UIServer/jx_DataSource/jx_index");
    var lsClient = require(process.env.PSGSM_HOME + "/uiserver/UIServer/ls_DataSource/ls_index");
    var server = require(process.env.PSGSM_HOME + "/uiserver/UIServer/Server");
} else {
    var dbClient = require("./db_DataSource/db_index");
    var jxClient = require("./jx_DataSource/jx_index");
    var lsClient = require("./ls_DataSource/ls_index");
    var server = require("./Server");
}

dbClient.dbClientStart();
if (process.env.PSGSM_HOME) {
    var config = require(process.env.PSGSM_HOME + "/uiserver/UIServer/ini-file-loader").load(process.env.PSGSM_HOME + "/conf/PSSSP.ini")["UIServer"];

} else {
    var config = require("./ini-file-loader").load("./conf.ini")["UIServer"];
}

if (config["OS"] == "Rocky") {
    jxClient.jxClientStart();
    lsClient.lsClientStart();
}

server.serverStart();
