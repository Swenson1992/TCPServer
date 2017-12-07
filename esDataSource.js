/**
 * Created by hejicheng on 2016/1/26.
 */
var elasticsearch = require('elasticsearch');
var utils = require('./utils');
var ipconfig = require("./runconfig");
var esClient = getEsClient(ipconfig);



function getEsClient(ipconfig) {
	var esClientArray = [];
    ipconfig.esHOST.forEach(function (ipStr) {
        esClientArray.push({
            host: ipStr,
            auth: 'admin:admin',
            protocol: 'https',
            port: ipconfig.esPORT
        })
    });
    return esClientArray;
}

// 使用默认配置连接到 localhost:9200
//var client = new elasticsearch.Client();

// 连接两个节点，负载均衡使用round-robin算法



var client = elasticsearch.Client({
	hosts: esClient
	, log: 'trace'
});

var defaultDeviceCount = 1000;
var netTestCount = 10000;


function isDate(dateString){
	if(dateString.trim()=="")return false;
	var r=dateString.match(/^(\d{1,4})(-|\/)(\d{1,2})\2(\d{1,2})$/);
	if (r == null) {
		return false;
	}
	var d=new Date(r[1],r[3]-1,r[4]);
	var num = (d.getFullYear()==r[1]&&(d.getMonth()+1)==r[3]&&d.getDate()==r[4]);
	return num != 0;
}
/*
var dateValue = '2010-01-01';
console.log(isDate(dateValue));
//var newDateValue = dateValue + ' '+'00:00:00';
var newDate = utils.addDate(dateValue,1);
console.log(JSON.stringify(dateValue));
console.log(newDate);
*/
function successProcessLocalTest(values){
	//console.log(values);
}
function errorProcessLocalTest(error){
//	console.log(error);
}


function getVeadTwoStatusInfo(successProcess,errorProcess){
	var deviceidValue = arguments[2],
		alarmDate = arguments[3],
		alarmtypeValue = arguments[4];
	console.log("arguments : " , arguments);
/*
	deviceidValue = 'hb372';
	alarmtypeValue = '15';
*/

	client.search({
		index:'alarmtwostatus',
		// type:'alarmreason',
		body:{
			"query": {
				"filtered": {
					"filter": {
						'bool': {
							must: [
								{
									term:{
										deviceip:deviceidValue
									}
								},{
									term:{
										alarmtype:alarmtypeValue
									}
								},{
									term:{
										date:alarmDate
									}
								}
							]
						}
					}
				}
			},
			size: defaultDeviceCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var outputArray = [];
			response.hits.hits.forEach(function (record) {
				//record._source.time = utils.formatDate(record._source.time);
				outputArray.push(record._source);
			});
			console.log("arr :" + JSON.stringify(outputArray));
			successProcess(outputArray);
		}
	})
}
//getVeadTwoStatusInfo(successProcessLocalTest,errorProcessLocalTest);
function getNewVeadTwoStatusInfo(successProcess,errorProcess){
	var deviceidValue = arguments[2],
		alarmDate = arguments[3],
		alarmtypeValue = arguments[4],
		srcIp = arguments[5],
		dstIp = arguments[6];
/*
	deviceidValue = '10.10.82.137';
	alarmDate='2016-10-14';
	alarmtypeValue = 19;
	srcIp = '18.10.10.12';
	dstIp = '10.10.82.146';
*/

	client.search({
		index:'alarmtwostatus',
		// type:'alarmreason',
		body:{
			"query": {
				"filtered": {
					"filter": {
						'bool': {
							must: [
								{
									term:{
										deviceip:deviceidValue
									}
								},{
									term:{
										alarmtype:alarmtypeValue
									}
								},{
									term:{
										date:alarmDate
									}
								},{
									term:{
										srcip:srcIp
									}
								},{
									term:{
										dstip:dstIp
									}
								}
							]
						}
					}
				}
			},
			size: defaultDeviceCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var outputArray = [];
			response.hits.hits.forEach(function (record) {
				//record._source.time = utils.formatDate(record._source.time);
				outputArray.push(record._source);
			});
			console.log("arr :" + JSON.stringify(outputArray));
			successProcess(outputArray);
		}
	})
}
//getNewVeadTwoStatusInfo(successProcessLocalTest,errorProcessLocalTest);
function getVeadThreeStatusInfo(successProcess,errorProcess){
	var deviceidValue = arguments[2],
		alarmDate = arguments[3],
		alarmtypeValue = arguments[6],
		srcipValue = arguments[4],
		dstipValue = arguments[5],
		alarmSubType = arguments[7];



	console.log("alarmSubtype:" +alarmSubType);


/*
	 deviceidValue = 'hb372';
	 alarmtypeValue = '15';
	 srcipValue = '20.20.20.8';
	 dstipValue = '20.20.20.255';
*/

	client.search({
		index:'alarmthreestatus',
		// type:'sourcedata',
		body:{
			"query": {
				"filtered": {
					"filter": {
						'bool': {
							must: [
								{
									term:{
										deviceip:deviceidValue
									}
								},{
									term:{
										alarmtype:alarmtypeValue
									}
								},{
									term:{
										srcip:srcipValue
									}
								},{
									term:{
										dstip:dstipValue
									}
								},{
									term:{
										date:alarmDate
									}
								},{
									term:{
										alarmsubtype:alarmSubType
									}
								}
							]
						}
					}
				}
			},
			size: netTestCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var outputArray = [];
			response.hits.hits.forEach(function (record) {
				//record._source.time = utils.formatDate(record._source.time);
				outputArray.push(record._source);
			});
			//console.log("arr :" + JSON.stringify(outputArray));
			successProcess(outputArray);
		}
	})
}
//getVeadThreeStatusInfo(successProcessLocalTest,errorProcessLocalTest);








exports.getVeadTwoStatusInfo = getVeadTwoStatusInfo;
exports.getVeadThreeStatusInfo = getVeadThreeStatusInfo;
exports.getNewVeadTwoStatusInfo = getNewVeadTwoStatusInfo;



exports.client = client;
