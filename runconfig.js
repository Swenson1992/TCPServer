/**
 * Created by songjian on 2016/9/29.
 */
var fs = require('fs');
var stripJsonComments = require('strip-json-comments');

function loadJSONFile(file) {
    var json = fs.readFileSync(file).toString();
    return JSON.parse(stripJsonComments(json));
}

var config = loadJSONFile('./ipconfig.json');

var dbHOST = config.dbIPconfig.HOST;
var dbPORT = config.dbIPconfig.PORT;

var esHOST = getArrayFromStr(config.esIPconfig.HOST, ",");
console.log("esHOST:",JSON.stringify(esHOST));
console.log("type esHOST:",typeof esHOST);
var esPORT = config.esIPconfig.PORT;

var jxHOST = config.jxIPconfig.HOST;
var jxPORT = config.jxIPconfig.PORT;

var lsHOST = config.lsIPconfig.HOST;
var lsPORT = config.lsIPconfig.PORT;


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



