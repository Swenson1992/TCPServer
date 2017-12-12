/**
 * Created by songjian on 2016/9/29.
 */
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');

/**
 * 加载ini格式配置文件
 * @param {*} file 
 */

if (process.env.PSGSM_HOME) {
    var config = require(process.env.PSGSM_HOME + "/uiserver/UIServer/ini-file-loader").load(process.env.PSGSM_HOME + "/conf/PSSSP.ini")["UIServer"];
    var ipConfig = require(process.env.PSGSM_HOME + "/uiserver/UIServer/ini-file-loader").load(process.env.PSGSM_HOME + "/conf/PSSSP.ini")["LOCAL"];
} else {
    var config = require("./ini-file-loader").load("./PSSSP.ini")["UIServer"];
    var ipConfig = require("./ini-file-loader").load("./PSSSP.ini")["UIServer"];
}

/**
 * 加载json格式配置文件
 * @param {*} file 
 */
/*
function loadJSONFile(file) {
    var json = fs.readFileSync(file).toString();
    return JSON.parse(stripJsonComments(json));
}

var config = loadJSONFile(process.env.PSGSM_HOME + '/uiserver/UIServer/ipconfig.json');
*/

var dbHOST = ipConfig["IP"];
var dbPORT = config["DataBase_Port"];

var esHOST = getArrayFromStr(config["ES_IP"], ",");
console.log("esHOST:", JSON.stringify(esHOST));
console.log("type esHOST:", typeof esHOST);
var esPORT = config["ES_PORT"];

var jxHOST = config["IP"];
var jxPORT = config["CVS_Port"];

var lsHOST = config["IP"];
var lsPORT = config["VBS_Port"];

function getArrayFromStr(fromStr, screenStr) {

    function getStr(fromStr) {
        if (fromStr.indexOf(screenStr) != -1) {
            var b = fromStr.substr(0, fromStr.indexOf(screenStr));
            var d = fromStr.substr(fromStr.indexOf(screenStr) + 1);
            c.push(b);
            // console.log("d : ", d);
            // console.log(d.indexOf(screenStr));
            if (d.indexOf(screenStr) != -1) {
                getStr(d);
            } else {
                c.push(d);
            }
        } else {
            c.push(fromStr);
        }
    }

    var c = [];
    getStr(fromStr);
    return c;
}

exports.dbHOST = dbHOST;
exports.dbPORT = dbPORT;
exports.esHOST = esHOST;
exports.esPORT = esPORT;
exports.jxHOST = jxHOST;
exports.jxPORT = jxPORT;
exports.lsHOST = lsHOST;
exports.lsPORT = lsPORT;



