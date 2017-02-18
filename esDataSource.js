/**
 * Created by hejicheng on 2016/1/26.
 */
var elasticsearch = require('elasticsearch');
var utils = require('./utils');


// 使用默认配置连接到 localhost:9200
//var client = new elasticsearch.Client();

// 连接两个节点，负载均衡使用round-robin算法

var client = elasticsearch.Client({
    hosts: [
        //'192.168.2.111:9200'
        //'192.100.20.13:9200'
        '192.100.20.102:9200'
        // '192.168.1.233:9200'
    ]
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

function getDataTest(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		// Set to 30 seconds because we are calling right back
		scroll: '30s',
		search_type: 'scroll',
		fields: ['cpu'],
		q: 'title:test'
	},function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			var ipAggsArray = response.aggregations.ipAggs.buckets;
			var maxArray = response.aggregations.max_price.value;
			//	console.log(maxArray);
			ipAggsArray.forEach(function(result){
				cpuInfos.push(result.topHitAggs.hits.hits[0]._source);
			});
			cpuInfos.push(maxArray);
			successProcess(cpuInfos);
		}
	});
}
//getDataTest(successProcessLocalTest,errorProcessLocalTest);

function getRecentCpuInfo(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		type: 'top',
		body: {
			size: 0,
			"aggs": {
				"ipAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					},
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"cpu", "time", "ip","hostname"
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			var ipAggsArray = response.aggregations.ipAggs.buckets;
			//console.log("response : "+JSON.stringify(ipAggsArray));
			ipAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				cpuInfos.push(result.topHitAggs.hits.hits[0]._source);
			});
			cpuInfos.sort(function (a,b) {
				if(a.cpu.us + a.cpu.sy < b.cpu.us + b.cpu.sy){
					return 1;
				}else if(a.cpu.us + a.cpu.sy > b.cpu.us + b.cpu.sy){
					return -1;
				}
				return 0;
			});
			//console.log("cpuInfos:" + JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	});
}
//getRecentCpuInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentMemoryInfo(successProcess,errorProcess) {
    client.search({
        index: 'ilogcaptureall',
        type: 'top',
        body: {
            size: 0,
            "aggs": {
                "memoryAggs": {
                    terms: {
                        field: "ip",
	                    "size" : defaultDeviceCount
                    }
                    ,
                    aggs: {
                        topHitAggs: {
                            top_hits: {
                                "sort": [
                                    {
                                        "time": {
                                            "order": "desc"
                                        }
                                    }
                                ],
                                "_source": {
                                    "include": [
                                        "memory", "time", "ip","hostname"
                                    ]
                                },
                                "size": 1
                            }
                        }
                    }
                }
            }
        }
    }, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var memoryInfos = [];
			var memoryAggsArray = response.aggregations.memoryAggs.buckets;
			console.log(response);

			memoryAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				memoryInfos.push(result.topHitAggs.hits.hits[0]._source);
			});
			memoryInfos.sort(function (a,b) {
				if(a.memory.used/ a.memory.total < b.memory.used/ b.memory.total){
					return 1;
				}else if(a.memory.used/ a.memory.total > b.memory.used/ b.memory.total){
					return -1;
				}
				return 0;
			});

			console.log(memoryInfos);
		//	console.log(memoryInfos[0]);

			successProcess(memoryInfos)
		}

    });
}
//getRecentMemoryInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentDiskIOInfo(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		type: 'iostat',
		body: {
			size: 0,
			"aggs": {
				"diskIOAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					}
					,
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"device", "time", "ip","hostname"
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var memoryInfos = [];
			var pushoutArray = [];
			var memoryAggsArray = response.aggregations.diskIOAggs.buckets;
			memoryAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				memoryInfos.push(result.topHitAggs.hits.hits[0]._source);
			});

			memoryInfos.forEach(function (record) {
				var deviceValue;
				var deviceValueArray = [];
				//console.log('!' + JSON.stringify(record.device));

				record.device.forEach(function (devicedata) {
					deviceValue = devicedata.writes +devicedata.reads;
					deviceValueArray.push(deviceValue);
				});

				var detailArray = {
					'time':record.time,
					'diskvalue':utils.sum(deviceValueArray),
					'ip':record.ip,
					'hostname':record.hostname
				};
				pushoutArray.push(detailArray);
				//barDataArray.push(record.devive[0].writes + record.devive[0].reads);
			});
			pushoutArray.sort(function (a,b) {
				if(a.diskvalue< b.diskvalue){
					return 1;
				}else if(a.diskvalue > b.diskvalue){
					return -1;
				}
				return 0;
			});
			console.log('!' + JSON.stringify(pushoutArray));
			console.log(pushoutArray);

			successProcess(pushoutArray)
		}

	});
}
//getRecentDiskIOInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentNetethInfo(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		type: 'neteth',
		body: {
			size: 0,
			"aggs": {
				"netAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					}
					,
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"eth", "time", "ip","hostname"
									]
								},
								"size": 1
							}
						}
					}
				},
				"max_rxbytes":{"max":{"field":"eth.rxbytes"}},
				"max_txbytes":{"max":{"field":"eth.txbytes"}}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var memoryInfos = [];
			var memoryAggsArray = response.aggregations.netAggs.buckets;
			var maxReads = response.aggregations.max_rxbytes;
			var maxWrites =  response.aggregations.max_txbytes;
			var maxArray = [];
			var netEthOutputArray = [];
			if (maxReads.value > maxWrites.value){
				maxArray.push(maxReads)
			} else {
				maxArray.push(maxWrites)

			}
			//console.log(JSON.stringify(response));
			memoryAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				memoryInfos.push(result.topHitAggs.hits.hits[0]._source);
			});
			/*memoryInfos.sort(function(a,b){
				var SumEtha = 0;
				var SumEthb = 0;
				a.eth.forEach(function(record){
					SumEtha += (record.rxbytes + record.txbytes)
				});
				//console.log(SumEtha);
				b.eth.forEach(function(record){
					SumEthb += (record.rxbytes + record.txbytes)
				});
				//console.log(SumEthb);
				if(SumEtha < SumEthb){
					return -1;
				}else if(SumEtha > SumEthb){
					return 1;
				}
				return 0;
			});*/
			netEthOutputArray = [memoryInfos,maxArray];
			console.log(memoryInfos);
			successProcess(netEthOutputArray)
		}

	});
}
//getRecentNetethInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentLinkCountInfo(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		type: 'tcplink',
		body: {
			size: 0,
			"aggs": {
				"ipAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					},
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"tcplink", "time", "ip","hostname"
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var tcpLinksInfo = [];
			var udpLinksInfo = [];
			var ipAggsArray = response.aggregations.ipAggs.buckets;
			//console.log("response : "+JSON.stringify(ipAggsArray));
			ipAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				tcpLinksInfo.push(result.topHitAggs.hits.hits[0]._source);
			});
			client.search({
				index: 'ilogcaptureall',
				type: 'udplink',
				body: {
					size: 0,
					"aggs": {
						"ipAggs": {
							terms: {
								field: "ip",
								"size" : defaultDeviceCount
							},
							aggs: {
								topHitAggs: {
									top_hits: {
										"sort": [
											{
												"time": {
													"order": "desc"
												}
											}
										],
										"_source": {
											"include": [
												"udplink", "time", "ip","hostname"
											]
										},
										"size": 1
									}
								}
							}
						}
					}
				}
			}, function (error, response) {
				if(typeof error == "object"){
					errorProcess(error);
				}else {
					var ipAggsArray = response.aggregations.ipAggs.buckets;
					//console.log("response : "+JSON.stringify(ipAggsArray));
					ipAggsArray.forEach(function (result) {
						result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
						udpLinksInfo.push(result.topHitAggs.hits.hits[0]._source);
					});
					var newLinkCountArray = [];
					tcpLinksInfo.forEach(function(tcpObj){
						udpLinksInfo.forEach(function (udpObj) {
							if (udpObj.ip == tcpObj.ip){
								var newLinkCountObj = {
									"tcptime":tcpObj.time,
									"udptime":udpObj.time,
									"hostname":tcpObj.hostname,
									"ip":tcpObj.ip,
									"tcplink":tcpObj.tcplink,
									"udplink":udpObj.udplink
								};
								newLinkCountArray.push(newLinkCountObj);
							}
						})
					});
					// console.log("newLinkCountArray:" + JSON.stringify(newLinkCountArray));

					newLinkCountArray.sort(function (a,b) {
					 if(a.tcplink + a.udplink < b.tcplink +  + b.udplink){
					 return 1;
					 }else if(a.tcplink + a.udplink > b.tcplink +  + b.udplink){
					 return -1;
					 }
					 return 0;
					 });
					// console.log("newLinkCountArray new:" + JSON.stringify(newLinkCountArray));

					successProcess(newLinkCountArray);
				}
			})
		}
	});
}
// getRecentLinkCountInfo(successProcessLocalTest,errorProcessLocalTest);


function getSpantimeMemoryInfo(successProcess,errorProcess) {
	var ip =arguments[2];
	var date = arguments[3];
	//var date1 = new Date(date);
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

/*
	console.log(" formatDate :"+formatDate);
	console.log(" beginDate :"+ISObeginDate);
	console.log(" Date :"+date);




	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);*/
	//ip = '100.10.100.102';
	//formatDate = '2016-05-12 14:21:17';
	//ISObeginDate = '2016-05-11 14:21:17';

    client.search({
        index: 'ilogcaptureall',
        type: 'top',
        body: {
            "query": {
                "filtered": {
                    "filter": {
                        "bool": {
                            "must": [
                                {
                                    term: {
                                        'hostname':ip
                                    }
                                }
                                ,
                                {
                                    "range": {
										"time": {
											"gte":ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
                                    }
                                }
                            ]
                        }

                    }
                }
            },
            "fields": ["memory.used", "swap.cached", "memory.buffers", "swap.used", "time", "ip","memory.total","swap.total"],
            "sort": {
                "time": {"order": "asc"}
            },
			size:netTestCount


		}
    }, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var memoryInfos = [];
			var memoryAggsArray = response.hits.hits;
			//console.log(response);
			memoryAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				memoryInfos.push(result.fields);
			});
			//console.log(memoryInfos);
			successProcess(memoryInfos);
		}

    });

}
//getSpantimeMemoryInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeDiskIOInfo(successProcess,errorProcess) {


	var ip =arguments[2];
	//ip = '100.10.60.6';
	var date = arguments[3];
	//date = '2016-06-22 16:44:08';
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);


	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" ip :"+ip);
	console.log(" formatDate :"+formatDate);
	console.log(" beginDate :"+ISObeginDate);
	console.log(" Date :"+date);

	//formatDate = '2016-05-12 14:21:17';
	//ISObeginDate = '2016-05-11 14:21:17';
	client.search({
		index: 'ilogcaptureall',
		type: 'iostat',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}

					}
				}
			},
			"fields": ["device.reads","time","device.writes"],
			"sort": {
				"time": {"order": "asc"}
			},
			size:netTestCount,
			aggs:{
				"max_reads":{"max":{"field":"device.reads"}},
				"max_writes":{"max":{"field":"device.writes"}}
			}

		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var memoryInfos = [];
			var memoryAggsArray = response.hits.hits;
			var maxReads = response.aggregations.max_reads;
			var maxWrites =  response.aggregations.max_writes;
			var maxArray = [];
			var memoryOutputArray = [];
			if (maxReads.value > maxWrites.value){
				maxArray.push(maxReads)
			} else {
				maxArray.push(maxWrites)
			}
			//console.log(maxArray);
			memoryAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				memoryInfos.push(result.fields);
			});
			memoryOutputArray = [memoryInfos,maxArray];
			//console.log(memoryOutputArray);
			successProcess(memoryOutputArray);
		}

	});

}
//getSpantimeDiskIOInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeCpuInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);


	client.search({
        index: 'ilogcaptureall',
        type: 'top',
        body: {
            "query": {
                "filtered": {
                    "filter": {
                        "bool": {
                            "must": [
                                {
                                    term: {
                                        'hostname': ip
                                    }
                                }
                                ,
                                {
                                    "range": {
                                        "time": {
                                            "gte": ISObeginDate,
                                            "lte": formatDate,
                                            //	"format": "dd/MM/yyyy||yyyy",
                                            "format": "yyyy-MM-dd HH:mm:ss"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            },
            "fields": ["cpu.us", "cpu.sy", "cpu.ni",
                "cpu.id", "cpu.wa", "cpu.hi",
                "cpu.si", "cpu.st", "time", "ip"],
            "sort": {"time": {"order": "asc"}},
            size: netTestCount

        }
    }, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			//console.log('1'+JSON.stringify(ScpuAggsArray));
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				SpantimeCpuInfos.push(result.fields);
			});
			successProcess(SpantimeCpuInfos);
		}
    })
}
//getSpantimeCpuInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeNetethInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);
/*
	ip = '100.10.100.102';
	formatDate = '2016-05-12 14:21:17';
	ISObeginDate = '2016-05-11 14:21:17';*/
	client.search({
		index: 'ilogcaptureall',
		type: 'neteth',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'eth.rxpackets','eth.txpackets','time'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount,
			aggs:{
				"max_rxpackets":{"max":{"field":"eth.rxpackets"}},
				"max_txpackets":{"max":{"field":"eth.txpackets"}}
			}

		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxReads = response.aggregations.max_rxpackets;
			var maxWrites =  response.aggregations.max_txpackets;
			var maxArray = [];
			var netEthOutputArray = [];
			if (maxReads.value > maxWrites.value){
				maxArray.push(maxReads)
			} else {
				maxArray.push(maxWrites)
			}
			//console.log('1'+JSON.stringify(ScpuAggsArray));
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				SpantimeCpuInfos.push(result.fields);
			});
			netEthOutputArray = [SpantimeCpuInfos,maxArray];
			successProcess(netEthOutputArray);
		}
	})
}
//getSpantimeNetethInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeTcpLinksInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	client.search({
		index: 'ilogcaptureall',
		type: 'tcplink',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'tcplink','time'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxArray = [];
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				SpantimeCpuInfos.push(result.fields);
			});
			successProcess(SpantimeCpuInfos);
		}
	})
}
//getSpantimeTcpLinksInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeUdpLinksInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	//date = '2016-11-30 23:52:26';
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);
	//ip = "swc_ops4";
	/*
	 ip = '100.10.100.102';
	 formatDate = '2016-05-12 14:21:17';
	 ISObeginDate = '2016-05-11 14:21:17';*/
	client.search({
		index: 'ilogcaptureall',
		type: 'udplink',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'udplink','time'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxArray = [];
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				SpantimeCpuInfos.push(result.fields);
			});
			successProcess(SpantimeCpuInfos);
		}
	})
}
//getSpantimeUdpLinksInfo(successProcessLocalTest,errorProcessLocalTest);


function getSpantimeNetTCPInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	//ip = '100.10.60.12';

	//formatDate = '2016-06-07 15:00:00';
	//ISObeginDate = '2016-06-07 13:00:00';
	client.search({
		index: 'ilogcaptureall',
		type: 'nettcp',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'tcp.received','tcp.send','time'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount,
			aggs:{
				"max_received":{"max":{"field":"tcp.received"}},
				"max_send":{"max":{"field":"tcp.send"}}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxReads = response.aggregations.max_received;
			var maxWrites =  response.aggregations.max_send;
			var maxArray = [];
			var netTcpOutputArray = [];
			if (maxReads.value > maxWrites.value){
				maxArray.push(maxReads)
			} else {
				maxArray.push(maxWrites)

			}
			//console.log('1'+JSON.stringify(ScpuAggsArray));
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				SpantimeCpuInfos.push(result.fields);
			});
			netTcpOutputArray = [SpantimeCpuInfos,maxArray];
			successProcess(netTcpOutputArray);
		}
	})
}
//getSpantimeNetTCPInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeNetUDPInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	/* ip = '100.10.100.102';
	 formatDate = '2016-05-12 14:21:17';
	 ISObeginDate = '2016-05-11 14:21:17';
	 */
	client.search({
		index: 'ilogcaptureall',
		type: 'netudp',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'udp.received','udp.sent','time'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount,
			aggs:{
				"max_received":{"max":{"field":"udp.received"}},
				"max_send":{"max":{"field":"udp.send"}}
			}

		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxReads = response.aggregations.max_received;
			var maxWrites =  response.aggregations.max_send;
			var maxArray = [];
			var netUdpOutputArray = [];
			if (maxReads.value > maxWrites.value){
				maxArray.push(maxReads)
			} else {
				maxArray.push(maxWrites)

			}
			//console.log('1'+JSON.stringify(ScpuAggsArray));
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				SpantimeCpuInfos.push(result.fields);
			});
			netUdpOutputArray = [SpantimeCpuInfos,maxArray];
			successProcess(netUdpOutputArray);
		}
	})
}
//getSpantimeNetUDPInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeNetICMPInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	/* ip = '100.10.100.102';
	 formatDate = '2016-05-12 14:21:17';
	 ISObeginDate = '2016-05-11 14:21:17';*/

	client.search({
		index: 'ilogcaptureall',
		type: 'neticmp',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'icmp.received','icmp.sent','time'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount,
			aggs:{
				"max_received":{"max":{"field":"icmp.received"}},
				"max_send":{"max":{"field":"icmp.sent"}}
			}

		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxReads = response.aggregations.max_received;
			var maxWrites =  response.aggregations.max_send;
			var maxArray = [];
			var netIcmpOutputArray = [];
			if (maxReads.value > maxWrites.value){
				maxArray.push(maxReads)
			} else {
				maxArray.push(maxWrites)

			}
			//console.log('1'+JSON.stringify(ScpuAggsArray));
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				SpantimeCpuInfos.push(result.fields);
			});
			netIcmpOutputArray = [SpantimeCpuInfos,maxArray];
			successProcess(netIcmpOutputArray);
		}
	})
}
//getSpantimeNetICMPInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeNetIPInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	/*ip = '100.10.100.102';
	formatDate = '2016-05-12 14:21:17';
	ISObeginDate = '2016-05-11 14:21:17';*/

	client.search({
		index: 'ilogcaptureall',
		type: 'netip',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'ippacket.total','ippacket.forwarded','ippacket.delivered','time'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount,
			aggs:{
				"max_total":{"max":{"field":"ippacket.total"}},
				"max_forwarded":{"max":{"field":"ippacket.forwarded"}},
				"max_delivered":{"max":{"field":"ippacket.delivered"}}
			}


		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxReads = response.aggregations.max_total;
			var maxWrites =  response.aggregations.max_forwarded;
			var maxWrites2 =  response.aggregations.max_delivered;
			var maxArray = [];
			var netIpOutputArray = [];
			if (maxReads.value > maxWrites.value){
				maxArray.push(maxReads)
			} else {
				maxArray.push(maxWrites)
			}
			if (maxArray.value < maxWrites2){
				maxArray.push(maxWrites2)
			}
			//console.log('1'+JSON.stringify(ScpuAggsArray));
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				SpantimeCpuInfos.push(result.fields);
			});
			netIpOutputArray = [SpantimeCpuInfos,maxArray];
			successProcess(netIpOutputArray);
		}
	})
}
//getSpantimeNetIPInfo(successProcessLocalTest,errorProcessLocalTest);



function getSettimeCpuInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var date = arguments[3];
	//var date1 = new Date(date);
	var formatDate = utils.ISOformatdate(date);
	//formatDate = '2016-05-12T14:21:57Z';
	//var begenDate = utils.addSeconds(formatDate,10);
	client.search({
		index:'ilogcaptureall',
		type:'top',
		body:{
			"query":{
				"filtered":{
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								},{
									term:{
										'time':formatDate
									}
								}]
						}
					}
				}
			}
		},
		//sort:{"cpu":{"order":"desc"}},
		size:8
	}, function (error, response) {
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = response.hits.hits[0]._source.process;

			cpuInfos.sort(function(a,b){
				return b.cpu-a.cpu
			});
			cpuInfos.length = 8;

			//console.log(cpuInfos);
			successProcess(cpuInfos);
		}
	})
}
//getSettimeCpuInfo(successProcessLocalTest,errorProcessLocalTest);
function getSettimeMemInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var date = arguments[3];
	//var date1 = new Date(date);
	var formatDate = utils.ISOformatdate(date);
	//formatDate = '2016-05-12T14:21:57Z';
	var begenDate = utils.addSeconds(formatDate,10);
	console.log(" formatDate :"+formatDate);
//	console.log(" Date :"+date1);
	console.log(" bgDate :"+begenDate);



	console.log(" ip :"+ip);
	//ip = '100.10.100.102';
	//formatDate = '2016-05-12T14:21:17Z';
	client.search({
		index:'ilogcaptureall',
		type:'top',
		body:{
			"query":{
				"filtered":{
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								},{
									term:{
										'time':formatDate
									}
								}]
						}
					}
				}
			}
		},
		//sort:{"cpu":{"order":"desc"}},
		size:8
	}, function (error, response) {
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = response.hits.hits[0]._source.process;

			cpuInfos.sort(function(a,b){
				return b.mem-a.mem
			});
			cpuInfos.length = 8;

			//console.log(cpuInfos);
			successProcess(cpuInfos);
		}
	})
}
//getSettimeMemInfo(successProcessLocalTest,errorProcessLocalTest)


function getRsyslogEmergNumInfo(successProcess,errorProcess){
	var date = new Date();
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);
/*
	console.log(date);
	console.log(formatDate);
	console.log(beginDate);
	console.log(ISObeginDate);
*/


	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'syslogseverity-text': 'emerg'
									}
								}
							/*	,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}*/
							]
						}
					}
				}
			},
			size: defaultDeviceCount
		}
	}, function (error, response) {
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			cpuInfos.push(response.hits);
			cpuInfos[0].hits.forEach(function(record){
				record._source.time = utils.ISOdate(record._source.time);
			});
			//console.log(response.hits.hits[0]);
			console.log(JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	})
}
//getRsyslogEmergNumInfo(successProcessLocalTest,errorProcessLocalTest);

function getRsyslogAlertNumInfo(successProcess,errorProcess){
	var date = new Date();
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);
/*
	console.log(date);
	console.log(formatDate);
	console.log(beginDate);
	console.log(ISObeginDate);
*/


	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'syslogseverity-text': 'alert'
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
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
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			cpuInfos.push(response.hits);
			cpuInfos[0].hits.forEach(function(record){
				record._source.time = utils.ISOdate(record._source.time);
			});
			//console.log(response.hits.hits[0]);
			console.log("!:" + JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	})
}
//getRsyslogAlertNumInfo(successProcessLocalTest,errorProcessLocalTest);

function getRsyslogCritNumInfo(successProcess,errorProcess){
	var date = new Date();
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);
/*
	console.log(date);
	console.log(date);
	console.log(date);
	console.log(date);
	console.log(formatDate);
	console.log(beginDate);
	console.log(ISObeginDate);
*/


	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'syslogseverity-text': 'crit'
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
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
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			cpuInfos.push(response.hits);
			//console.log(response.hits.hits[0]);
			//console.log(cpuInfos);
			successProcess(cpuInfos);
		}
	})
}
//getRsyslogCritNumInfo(successProcessLocalTest,errorProcessLocalTest);
function getRsyslogErrNumInfo(successProcess,errorProcess){
	var date = new Date();
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

/*	console.log(date);
	console.log(formatDate);
	console.log(beginDate);
	console.log(ISObeginDate);*/



	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'syslogseverity-text': 'err'
									}
								}
							,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
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
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			cpuInfos.push(response.hits);
			cpuInfos[0].hits.forEach(function(record){
				record._source.time = utils.ISOdate(record._source.time);
			});
			//console.log(response.hits.hits[0]);
			//console.log(cpuInfos);
			successProcess(cpuInfos);
		}
	})
}
//getRsyslogErrNumInfo(successProcessLocalTest,errorProcessLocalTest);


function getRsyslogFourTypeTestInfo(successProcess,errorProcess){

	var searchArray = 'alert realtime';
	var date = new Date();
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);
	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
						'match':{
							'_all': searchArray
						}
			},
			size: 10
		}

	}, function (error, response) {
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			cpuInfos.push(response.hits);
			cpuInfos[0].hits.forEach(function(record){
				record._source.time = utils.formatDate(record._source.time);
			});
			//console.log(response.hits.hits[0]);
			console.log(JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	})
}
//getRsyslogFourTypeTestInfo(successProcessLocalTest,errorProcessLocalTest);


function getRecentCpuTimeOldInfo(successProcess,errorProcess) {
	var date = new Date();
	var formateDate = utils.formatZeroHour(date);
	var ISOdate = utils.ISOdate(formateDate);
	ISOdate = '2016-06-07 15:26:07';
	console.log("date:" + date);
	console.log("date:" + ISOdate);

	client.search({
		index: 'dmdbmon',
		type: 'dmsession',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"range": {
										"time": {
											"gte": ISOdate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "session.userip",
						size:0
					},
					'aggs': {
						"cputime": {
							"sum": {
								"field": "session.cputime"
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
				//console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getRecentCpuTimeInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentlogicreadsTimeOldInfo(successProcess,errorProcess) {
	var date = new Date();
	var formateDate = utils.formatZeroHour(date);
	var ISOdate = utils.ISOdate(formateDate);
	ISOdate = '2016-05-01 15:26:07';
	console.log("date:" + date);
	console.log("date:" + ISOdate);

	client.search({
		index: 'dmdbmon',
		type: 'dmsession',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"range": {
										"time": {
											"gte": ISOdate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "session.userip",
						size:0
					},
					'aggs': {
						"cputime": {
							"sum": {
								"field": "session.logicreadscall"
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getRecentlogicreadsTimeInfo(successProcessLocalTest,errorProcessLocalTest);


function getRecentUserIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmon',
		type: 'dmsession',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "session.userip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			//console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getRecentUserIpInfo(successProcessLocalTest,errorProcessLocalTest);


function getAnomalNumTestInfo(successProcess,errorProcess) {

	client.search({
		index: 'hoststatusall',
		type: 'anomaly'
			/*
			body:{
			'aggs':{
				ipArray:{
					'terms':{
						field: "ip"
					},
					'aggs':{
						type:{
							'terms':{
								field: "anomalytype"
							}
						}
					}
				}
			}
		}*/
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var anomalTimes = [];
			var anomalId = [];
			var ScpuAggsArray = response.hits.hits;
			//console.log('1'+JSON.stringify(ScpuAggsArray));

			ScpuAggsArray.forEach(function (result) {
				anomalTimes.push(result._source.anomalytimes);
				anomalId.push(result._id)
			});
			var anomalDataArray = [anomalId,anomalTimes, ScpuAggsArray];
			//console.log('1'+JSON.stringify(anomalTimes));
			successProcess(anomalDataArray);
		}
	})
}
// getAnomalNumTestInfo(successProcessLocalTest,errorProcessLocalTest);

function getAnomalDataInfo(successProcess,errorProcess) {
	var ip = arguments[2];
	var anomalyReason = arguments[3];
	var fieldsData = "";
	var Reason = '';
	//ip = '100.10.60.8';
	//anomalyReason = '内存';


	if (anomalyReason == '内存'){
		fieldsData ="process.mem";
		Reason = 'memory'
	}else{
		fieldsData ="process.cpu";
		Reason = 'cpu'
	}
	client.search({
			index: 'hoststatusall',
			type: 'anomaly',
			body:{
				"query":{
					"filtered":{
						"filter": {
							"bool": {
								"must": [
									{
										term: {
											'ip': ip
										}
									},{
										term:{
											'alarmreason':Reason
										}
									}]
							}
						}
					}
				}
			},
			"fields": [fieldsData,"process.pid"]
		},

		function (error, response) {
			if (typeof error == "object") {
				errorProcess(error);
			}
			else {
				var anomalId = [];
				var PidArray = response.hits.hits[0].fields['process.pid'];
				var MemArray = response.hits.hits[0].fields[fieldsData];

				for (var i = 0; i < MemArray.length;i ++){
					var dataOne = {
						name:PidArray[i],
						value:MemArray[i]
					};
					anomalId.push(dataOne);
				}
				anomalId.sort(function(a,b){
					if(a.value<b.value){
						return 1;
					}else if(a.value>b.value){
						return -1;
					}
					return 0;
				});
				anomalTimes = anomalId.slice(0,5);
				// console.log('1'+JSON.stringify(anomalTimes));
				successProcess(anomalTimes);
			}
		});
}
// getAnomalDataInfo(successProcessLocalTest,errorProcessLocalTest);

function getAnomalIpInfo(successProcess,errorProcess) {
	client.search({
			index: 'hoststatusall',
			type: 'anomaly',
			body: {
				"aggs": {
					dmsession: {
						"terms": {
							"field": "ip"
						},
						'aggs': {
							"mem": {
								"sum": {
									"field": "process.mem"
								}
							},
							'cpu':{
								"sum" : { "field" : "process.cpu" }
							}
						}
					}
				}
			}
		},
		function (error, response) {
				if (typeof error == "object") {
					errorProcess(error);
				}
				else {
					var cpuInfos = [];
					var memInfos = [];
					var ipInfos = [];
					var ipAggsArray = response.aggregations.dmsession.buckets;
					//	console.log("response : "+response);
					ipAggsArray.sort(function (a,b) {
						if(a.cpu.value + a.mem.value> b.cpu.value + b.mem.value){
							return 1;
						}else if(a.cpu.value + a.mem.value< b.cpu.value + b.mem.value){
							return -1;
						}
						return 0;
					});
					var cutAggsArray = ipAggsArray.slice(0,5);
					cutAggsArray.forEach(function (result) {
						cpuInfos.push(result.cpu.value);
						memInfos.push(result.mem.value);
						ipInfos.push(result.key)
					});
					var OutputInfos = [ipInfos,cpuInfos,memInfos];
					// console.log('3'+JSON.stringify(OutputInfos));
					successProcess(OutputInfos);
				}
			})
}
// getAnomalIpInfo(successProcessLocalTest,errorProcessLocalTest);

function getAnomalNumInfo(successProcess,errorProcess) {

	client.search({
		index: 'hoststatusall',
		type: 'anomaly',
		body: {
			'aggs': {
				ipArray: {
					'terms': {
						field: "ip"
					},
						'aggs':{
							'tophitsArray':{
								top_hits: {
									"sort": [
										{
											"alarmtype": {
												"order": "desc"
											}
										}
									],
									"_source": {
										"include": [
											"alarmtype", "anomalytimes", "ip",'anomalyreason'
										]
									},
									"size": 2
								}
							}
						}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var anomalTimesTypeOne = [];
			var anomalTimesTypeTwo = [];
			var hitsArray = [];
			var anomalIp = [];
			var ScpuAggsArray = response.aggregations.ipArray.buckets;
			//console.log('1'+JSON.stringify(ScpuAggsArray));
			ScpuAggsArray.forEach(function (result) {
				anomalIp.push(result.key);
				hitsArray = result.tophitsArray.hits.hits;
				var resultCount = result.doc_count;
				//console.log('resultCount:'+JSON.stringify(resultCount));
				if (resultCount == 2 ){
					//console.log('hitsArray:'+JSON.stringify(hitsArray));
					anomalTimesTypeTwo.push(hitsArray[0]._source.anomalytimes);
						anomalTimesTypeOne.push(hitsArray[1]._source.anomalytimes);
				} else{
					var anomalyTypeOne = result.tophitsArray.hits.hits[0]._source.anomalytype;
					//console.log('anomalyTypeOne:'+JSON.stringify(anomalyTypeOne));

					if (anomalyTypeOne == '1'){
						anomalTimesTypeTwo.push('');
						anomalTimesTypeOne.push(hitsArray[0]._source.anomalytimes);
						//console.log('3'+JSON.stringify(anomalTimesTypeTwo));
					}else{
						anomalTimesTypeOne.push('');
						anomalTimesTypeTwo.push(hitsArray[0]._source.anomalytimes);
					}
				}
			});
			var anomalDataArray = [anomalIp, anomalTimesTypeOne,anomalTimesTypeTwo];
			console.log('2'+JSON.stringify(anomalDataArray));
			successProcess(anomalDataArray);
		}
	})
}
// getAnomalNumInfo(successProcessLocalTest,errorProcessLocalTest);

function getNetAlarmInfo(successProcess,errorProcess){
	client.search({
		index: 'h3cmon',
		type: 'alarmdetail',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"range": {
							"alarmLevel": {
								"gte": 2
							}
						}
					}
				}
			},
			"fields": ["deviceIp", "deviceName", "faultTimeDesc", "suggestion","reason"],
			size:defaultDeviceCount
		}
	}, function (error, response) {
		if (typeof error == "object") {
			errorProcess(error);
		} else {
			var netAlarmSearchArray = [];
			netAlarmSearchArray.push(response.hits);
			netAlarmSearchArray[0].hits.forEach(function (record) {
				//record.fields.faultTimeDesc[0] = utils.formatDate(record.fields.faultTimeDesc[0]);
			});
			console.log("arr :" + JSON.stringify(netAlarmSearchArray));
			successProcess(netAlarmSearchArray);
		}
	})
}
//getNetAlarmInfo(successProcessLocalTest,errorProcessLocalTest);
function getSearchRsysDetailInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	var warningLevels = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var mustArray = [];
	var warningLevel = '';
	var matchValue = '';

/*
	sortName = 'syslogseverity-text';
	sortOrder = 'asc';
	ip = '全部';
	warningLevels = '全部';
	startdate = '';
	endDate = '';
	searchDetails = '';
	fromValue = 1;
	sizeValue = 5;*/
	console.log('sortName:' + sortName);
	console.log('sortOrder:' + sortOrder);


	var filteredArray = {};
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'ip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}

	if(startdate != ''&& endDate !=''){
		if (startdate != ''){
			startdate = utils.ISOdate(startdate);
		}
		if (endDate != ''){
			endDate = utils.ISOdate(endDate);
		}
		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}


	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	if (warningLevels!= '全部') {
		if (warningLevels == 'Alert') {
			warningLevel = 'alert'
		}
		if (warningLevels == 'Error') {
			warningLevel = 'err'
		}
		if (warningLevels == 'Emerg') {
			warningLevel = 'Emerg'
		}
		if (warningLevels == 'Crit') {
			warningLevel = 'crit'
		}
		var warningLevelsArray = {
			term: {
				'syslogseverity-text': warningLevel
			}
		};
		mustArray.push(warningLevelsArray);
		filteredArray = {
			"filter": {
				'bool': {
					must: mustArray
				}
			}
		};
	}else{
		filteredArray = {
			"query":  { "match": { 'syslogseverity-text': 'alert err crit emerg' }},
			"filter": {
				'bool': {
					must: mustArray
				}
			}
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];

//	sortArray=eval('(' + sortOutArray + ')');
	sortArray=JSON.parse(sortOutArray);

	//console.log(sortArray);


	/*ip = '100.10.100.102';
	 formatDate = '2016-05-12 14:21:17';
	 ISObeginDate = '2016-05-11 14:21:17';*/

	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
				"filtered": filteredArray
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var rsysArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				rsysArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:rsysArray
			};
			//console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchRsysDetailInfo(successProcessLocalTest,errorProcessLocalTest);
function getRsysIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "ip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getRsysIpInfo(successProcessLocalTest,errorProcessLocalTest);
function getNetIpInof(successProcess,errorProcess) {
	client.search({
		index: 'h3cmon',
		type: 'alarmdetail',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "deviceIp",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getNetIpInof(successProcessLocalTest,errorProcessLocalTest);
function getNetdeviceNameInof(successProcess,errorProcess) {
	client.search({
		index: 'h3cmon',
		type: 'alarmdetail',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "deviceName",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getNetdeviceNameInof(successProcessLocalTest,errorProcessLocalTest);


function getSearchNetTestInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	var searchReason = arguments[5];
	var searchSuggestion = arguments[6];
	var mustArray = [];
	var warningLevel = '';
/*
	 ip = '全部';
	searchSuggestion = '';
	 startdate =utils.ISOdate( '2016-05-26 09:03:00');
	 endDate = utils.ISOdate('2016-05-26 21:05:00');
	searchReason = '';
	console.log(startdate);
	console.log(endDate);
*/

	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'deviceIp': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){
		var dateSearchArray = {
			"range": {
				"faultTime": {
					"gte": startdate,
					"lte": endDate
					//	"format": "dd/MM/yyyy||yyyy",
					//"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}



	client.search({
		index: 'h3cmon',
		type: 'alarmdetail',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			"fields": [
				"deviceIp", "deviceName", "faultTimeDesc", "suggestion","reason"
			],
			size: defaultDeviceCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record.fields.faultTimeDesc[0] = utils.ISOdate(record.fields.faultTimeDesc[0])
			});
			//console.log('11 :' + JSON.stringify(response));
			successProcess(searchDataArry);
		}
	})
}
//getSearchNetInfo(successProcessLocalTest,errorProcessLocalTest);


function getVeadDetailInfo(successProcess,errorProcess){
	client.search({
		index: 'secdevalarmstatus',
		type: 'vead278',
		size:defaultDeviceCount

	}, function (error, response) {
		if(typeof error == "object"){
		errorProcess(error);
	}else {
		var netAlarmSearchArray = [];
		netAlarmSearchArray = response.hits.hits;

		netAlarmSearchArray.forEach(function (record) {
			record._source.time = utils.ISOdate(record._source.time );
		});
		//console.log("arr :" + JSON.stringify(netAlarmSearchArray));
		successProcess(netAlarmSearchArray);
		}
	});

}
//getVeadDetailInfo(successProcessLocalTest,errorProcessLocalTest);
function getVeadTwoStatusInfo(successProcess,errorProcess){
	var deviceidValue = arguments[2],
		alarmDate = arguments[3],
		alarmtypeValue = arguments[4];
/*
	deviceidValue = 'hb372';
	alarmtypeValue = '15';
*/

	client.search({
		index:'alarmtwostatus',
		type:'alarmreason',
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
		type:'alarmreason',
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
		type:'sourcedata',
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

function getSearchVeadInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[11];
	var mustArray = [];
	var warningLevel = '';

/*
	id = '全部';
	alarmType = '';
	 startdate = '';
	 endDate = '';
	fromValue = 40;
	sizeValue = 10;
	sortName = 'time';
	sortOrder = 'desc';
	searchDetails = '畸形';
*/
	if (id != '全部'){
		var idSearchArray = {
			term: {
				'deviceid': id
			}
		};
		mustArray.push(idSearchArray);
	}
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'deviceip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(alarmType != ''){
		var warningLevelsArray = {
			term: {
				'alarmtype': alarmType
			}
		};
		mustArray.push(warningLevelsArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'secdevalarmstatus',
		type: 'vead278',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchVeadInfo(successProcessLocalTest,errorProcessLocalTest);


function getSearchIdInfo (successProcess,errorProcess) {
	var indexValue = arguments[2];
	var typeValue = arguments[3];
	var searchValue = arguments[4];
	var searchDetail = arguments[5];


	/*
	indexValue = 'secdevalarmstatus';
	typeValue = 'vead278';
	searchValue = 'alarmtype';
*/



	client.search({
		index: indexValue,
		type: typeValue,
		body: {
			size:0,
			"aggs": {
				dmsession: {
					"terms": {
						"field": searchValue,
						"size": 10000
					},
					'aggs': {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										searchDetail
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			//console.log("getSearchIdInfo error : "+error);
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(JSON.stringify(ipAggsArray));
			successProcess(ipAggsArray);
		}
	});
}
//getSearchIdInfo(successProcessLocalTest,errorProcessLocalTest);


function getRsyslogTest(successProcess,errorProcess){

	var date = new Date();
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);
		client.search({
			index: 'rsyslog',
			type: 'rsyslog',
			body: {

				"query": {
					"filtered": {
						"query":  { "match_phrase": { '_all': '2016 06 07'}},
						"filter": {
							'bool': {
								must: []
							}
						}
					}
				},
				from:1,
				size: 10
			}

	}, function (error, response) {
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			cpuInfos.push(response.hits);
			cpuInfos[0].hits.forEach(function(record){
				record._source.time = utils.ISOdate(record._source.time);
			});
			//console.log(response.hits.hits[0]);
			//console.log(JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	})
}
//getRsyslogTest(successProcessLocalTest,errorProcessLocalTest);

function getNetAlarmTestInfo(successProcess,errorProcess){
	client.search({
		index: 'h3cmon',
		type: 'alarmdetail',
		body: {
			"aggs": {
				"ipAggs": {
					terms: {
						field: "time",
						size:0
					}
				}
			},
			"sort": [
				{
					"time": {
						"order": "desc"
					}
				}
			],
		'_score':{
			"include": [
				"deviceIp", "deviceName", "faultTimeDesc", "suggestion","reason"
			]
		},
			size:1


			/*,
			 aggs:{
			 "max_price":{"max":{"field":"cpu.us"}}
			 }*/


		}
	}, function (error, response) {
		if (typeof error == "object") {
			errorProcess(error);
		} else {
			var netAlarmSearchArray = [];
			netAlarmSearchArray.push(response.hits);
			netAlarmSearchArray[0].hits.forEach(function (record) {
				//record.fields.faultTimeDesc[0] = utils.formatDate(record.fields.faultTimeDesc[0]);
			});
			//console.log("arr :" + JSON.stringify(netAlarmSearchArray));
			successProcess(netAlarmSearchArray);
		}
	})
}
//getNetAlarmTestInfo(successProcessLocalTest,errorProcessLocalTest);

function getRsyslogFourTypeInfo2(successProcess,errorProcess){

	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
				"filtered": {
					"filter": [{
						'match':{
							'syslogseverity-text': 'alert err crit emerg'
						}
					}]
				}
			},
			//from:fromValue,
			size: defaultDeviceCount
		}

	}, function (error, response) {
		if (typeof error == 'object'){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			var warningArray = [];
			cpuInfos = response.hits.hits;
			//console.log(JSON.stringify(cpuInfos));

			cpuInfos.forEach(function(record){
				record._source.time = utils.ISOdate(record._source.time);
				warningArray.push(record._source);
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:warningArray
			};
			//console.log(response.hits.hits[0]);
			//console.log('1' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getRsyslogFourTypeInfo(successProcessLocalTest,errorProcessLocalTest);
function getRsyslogFourTypeInfo(successProcess,errorProcess) {
	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
				"filtered": {
					"filter": [{
						'match':{
							'syslogseverity-text': 'alert err crit emerg'
						}
					}]
				}
			},
			"aggs": {
				"ipAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					}
				}
			},
			"sort": [
					{
						"ip": {
							"order": "asc"
						}
					}
				]
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var outPutValue = [];
			var outPutDetailArray = [];
			var outPutDetial = response.hits.hits;
			var outPutArray = response.aggregations.ipAggs.buckets;
			outPutDetial.forEach(function (record) {
				outPutDetailArray.push(record._source);
			});
			outPutArray.forEach(function(record){
				if (record.key == '192.168.1.212'|| record.key == '192.168.1.211'){
				}else{
					outPutValue.push(record)
				}
			});
			//console.log("cpuInfos:" + JSON.stringify(outPutDetailArray));
			successProcess(outPutValue);
		}
	});
}
//getRsyslogFourTypeInfo(successProcessLocalTest,errorProcessLocalTest);
function getSetIpRsyslogTypeInfo(successProcess,errorProcess) {


	var ipValue = arguments[2],
		fromValue = arguments[7],
		sizeValue = arguments[8];
	//ipValue = 'swc_tmrap1';
	//fromValue = 1;
	//sizeValue = 10;
	client.search({
		index: 'rsyslog',
		type: 'rsyslog',
		body: {
			"query": {
				"filtered":  {
					"query":  { "match": { 'syslogseverity-text': 'alert err crit emerg' }},
					"filter": {
						'bool': {
							must: {
								term:{
									hostname:ipValue
								}
							}
						}
					}
				}
			},
			from:fromValue,
			size:sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var outPutValue = [];
			var outPutDetailArray = [];
			var outPutHits = response.hits.hits;
			outPutHits.forEach(function (record) {
				record._source.time = utils.ISOdate(record._source.time);
				outPutValue.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:outPutValue
			};
			successProcess(outPutArray);
		}
	});
}
//getSetIpRsyslogTypeInfo(successProcessLocalTest,errorProcessLocalTest);


function getVeadDetailTestInfo(successProcess,errorProcess)	{
	var fromValue = arguments[6];
	var sizeValue = arguments[7];
	client.search({
		index: 'secdevalarmstatus',
		type: 'vead278',
		from:fromValue,
		size:sizeValue

	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var netAlarmSearchArray = [];
			var veadSearchArray = [];
			netAlarmSearchArray = response.hits.hits;

			netAlarmSearchArray.forEach(function (record) {
				record._source.time = utils.ISOdate(record._source.time );
				veadSearchArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadSearchArray
			};
			//console.log("arr :" + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	});

}
//getVeadDetailTestInfo(successProcessLocalTest,errorProcessLocalTest);


function getRecentCpuTimeInfo(successProcess,errorProcess){
	client.search({
		index: 'dmdbmon',
		type: 'dmsession',
		body: {
			sort:{
				time:{
					order:'desc'
				}
			},
			size:1
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var dateArray = response.hits.hits[0]._source.time;
			//var ISOdateValue = utils.ISOdate(dateArray);
			//console.log("arr :" + JSON.stringify(ISOdateValue));
			client.search({
				index: 'dmdbmon',
				type: 'dmsession',
				body: {
					"query": {
						"filtered": {
							"filter": {
								"bool": {
									"must": [
										{
											"term": {
												"time":dateArray
													//	"format": "dd/MM/yyyy||yyyy"
											}
										}
									]
								}
							}
						}
					},
					"aggs": {
						dmsession: {
							"terms": {
								"field": "session.userip",
								size:0
							},
							'aggs': {
								"cputime": {
									"sum": {
										"field": "session.cputime"
									}
								}
							}
						}
					}
				}
			}, function (error, response) {
				if(typeof error == "object"){
					errorProcess(error);
				}else {

					var ipAggsArray = response.aggregations.dmsession.buckets;
					//console.log("response : "+response);
					var outPutArary = [ipAggsArray,dateArray];
					//console.log(outPutArary);
					successProcess(outPutArary);
				}
			});
		}
	})
}
//getRecentCpuTimeInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentlogicreadsTimeInfo(successProcess,errorProcess){
	client.search({
		index: 'dmdbmon',
		type: 'dmsession',
		body: {
			sort:{
				time:{
					order:'desc'
				}
			},
			size:1
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var dateArray = response.hits.hits[0]._source.time;
			//var ISOdateValue = utils.ISOdate(dateArray);
			//console.log("arr :" + JSON.stringify(ISOdateValue));
			//dateArray = "2016-06-06T18:04:52Z";
			client.search({
				index: 'dmdbmon',
				type: 'dmsession',
				body: {
					"query": {
						"filtered": {
							"filter": {
								"bool": {
									"must": [
										{
											"term": {
												"time":dateArray
												//	"format": "dd/MM/yyyy||yyyy"
											}
										}
									]
								}
							}
						}
					},
					"aggs": {
						dmsession: {
							"terms": {
								"field": "session.userip",
								size:0
							},
							'aggs': {
								"cputime": {
									"sum": {
										"field": "session.logicreadscall"
									}
								}
							}
						}
					}
				}
			}, function (error, response) {
				if(typeof error == "object"){
					errorProcess(error);
				}else {

					var ipAggsArray = response.aggregations.dmsession.buckets;
					//console.log("response : "+response);

					var outPutArary = [ipAggsArray,dateArray];
					console.log(outPutArary);
					successProcess(outPutArary);
				}
			});
		}
	})
}
//getRecentlogicreadsTimeInfo(successProcessLocalTest,errorProcessLocalTest);
function getSetIpCpuTimeInfo(successProcess,errorProcess) {
	var date = new Date();
	var ipArray = arguments[2];
	var dateValue = arguments[3];
	var formateDate = utils.formatZeroHour(date);
	var ISOdate = utils.ISOdate(formateDate);
	//ISOdate = '2016-05-01 15:26:07';
	//ipArray = '100.10.60.151';
	//dateValue = '2016-06-07T15:26:07Z';
	console.log("date:" + date);
	console.log("date:" + ISOdate);

	client.search({
		index: 'dmdbmon',
		type: 'dmsession',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"time": dateValue
									}
								},
								{
									term:{
										'session.userip':ipArray
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "session.appname",
						size:0
					},
					'aggs': {
						"cputime": {
							"sum": {
								"field": "session.cputime"
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getSetIpCpuTimeInfo(successProcessLocalTest,errorProcessLocalTest);
function getSetIplogicreadsTimeInfo(successProcess,errorProcess) {

	var ipArray = arguments[2];
	var dateValue = arguments[3];

	//ISOdate = '2016-05-01 15:26:07';
	//ipArray = '100.10.60.61';
	//dateValue = '2016-06-06T18:04:52Z';
	//console.log("date:" + date);
	//console.log("date:" + ISOdate);

	client.search({
		index: 'dmdbmon',
		type: 'dmsession',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"time": dateValue
									}
								},
								{
									term:{
										'session.userip':ipArray
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "session.appname",
						size:0
					},
					'aggs': {
						"cputime": {
							"sum": {
								"field": "session.logicreadscall"
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getSetIplogicreadsTimeInfo(successProcessLocalTest,errorProcessLocalTest);


function getTuopuCMDataInfo(successProcess,errorProcess){
	client.search({
		index: 'ilogcaptureall',
		type: 'top',
		body: {
			size: 0,
			"aggs": {
				"ipAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					},
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"cpu", "time", "ip","hostname","memory"
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			var ipAggsArray = response.aggregations.ipAggs.buckets;
			var sourceValue;
			console.log("response : "+JSON.stringify(ipAggsArray));
			ipAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.ISOdate(result.topHitAggs.hits.hits[0]._source.time);
				sourceValue = result.topHitAggs.hits.hits[0]._source;
				var cpuValue = Math.round((sourceValue.cpu.us + sourceValue.cpu.sy)*1000)/1000;
				var memoryValue = Math.round(sourceValue.memory.used * 100 / sourceValue.memory.total) / 100;
				var outputValue = {
					ip:sourceValue.ip,
					cpu:cpuValue,
					memory:memoryValue,
					hostname:sourceValue.hostname
				};
				cpuInfos.push(outputValue);
			});
			console.log("cpuInfos : "+JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	})
}
//getTuopuCMDataInfo(successProcessLocalTest,errorProcessLocalTest);

function getRecentCpuTempInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmiall',
		type: 'cputemp',
		body: {
			size: 0,
			"aggs": {
				"ipAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					},
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"cputemp", "time", "ip","hostname"
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			var ipAggsArray = response.aggregations.ipAggs.buckets;
			ipAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				cpuInfos.push(result.topHitAggs.hits.hits[0]._source);
			});
			cpuInfos.sort(function (a,b) {
				var sumAcpuTemp = 0;
				var sumBcpuTemp = 0;
				a.cputemp.forEach(function(cputemp){
					sumAcpuTemp += Number(cputemp.value);
				});
				a.sumTemp = sumAcpuTemp;
				b.cputemp.forEach(function(cputemp){
					sumBcpuTemp += Number(cputemp.value);
				});
				b.sumTemp = sumBcpuTemp;

				if(sumAcpuTemp < sumBcpuTemp){
					return 1;
				}else if(sumAcpuTemp > sumBcpuTemp){
					return -1;
				}
				return 0;
			});
			if (cpuInfos.length > 40){
				cpuInfos.length = 40;
			}
			cpuInfos.sort(function (a,b) {
				if(a.cputemp.length < b.cputemp.length){
					return 1;
				}else if(a.cputemp.length > b.cputemp.length){
					return -1;
				}
				return 0;
			});

			//console.log("cpuInfos:" + JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	});
}
//getRecentCpuTempInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeCpuTempInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	/*ip = "swc_2_psgsmfes";
	 date = '2016-11-30 23:45:35';*/
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	client.search({
		index: 'ipmiall',
		type: 'cputemp',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'cputemp.value','time','cputemp.name'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxArray = [];
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				result.fields['cputemp.name'].forEach(function(cpuTemp,index){
					result.fields[cpuTemp] = result.fields['cputemp.value'][index];
				});
				SpantimeCpuInfos.push(result.fields);
				console.log(result.fields['cputemp.name']);
			});
			successProcess(SpantimeCpuInfos);
		}
	})
}
//getSpantimeCpuTempInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentCpuFanInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmiall',
		type: 'sysfan',
		body: {
			size: 0,
			"aggs": {
				"ipAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					},
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"sysfan", "time", "ip","hostname"
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			var ipAggsArray = response.aggregations.ipAggs.buckets;
			ipAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				cpuInfos.push(result.topHitAggs.hits.hits[0]._source);
			});
			cpuInfos.sort(function (a,b) {
				var sumAsysfan = 0;
				var sumBsysfan = 0;
				a.sysfan.forEach(function(sysfan){
					sumAsysfan += Number(sysfan.value);
				});
				a.sumFan = sumAsysfan;
				b.sysfan.forEach(function(sysfan){
					sumBsysfan += Number(sysfan.value);
				});
				b.sumFan = sumBsysfan;

				if(sumAsysfan < sumBsysfan){
					return 1;
				}else if(sumAsysfan > sumBsysfan){
					return -1;
				}
				return 0;
			});
			console.log(cpuInfos.length);
			if (cpuInfos.length > 20){
				cpuInfos.length = 20;
			}
			/*cpuInfos.sort(function (a,b) {
				if(a.sysfan.length < b.sysfan.length){
					return 1;
				}else if(a.sysfan.length > b.sysfan.length){
					return -1;
				}
				return 0;
			});*/

			//console.log("cpuInfos:" + JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	});
}
//getRecentCpuFanInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimeCpuFanInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	/*ip = "swc_2_psgsmfes";
	 date = '2016-11-30 23:45:35';*/
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	client.search({
		index: 'ipmiall',
		type: 'sysfan',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'sysfan.value','time','sysfan.name'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				result.fields['sysfan.name'].forEach(function(cpuTemp,index){
					result.fields[cpuTemp] = result.fields['sysfan.value'][index];
				});
				SpantimeCpuInfos.push(result.fields);
			});
			successProcess(SpantimeCpuInfos);
		}
	})
}
//getSpantimeCpuFanInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentPsuTempInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmiall',
		type: 'psutemp',
		body: {
			size: 0,
			"aggs": {
				"ipAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					},
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"psutemp", "time", "ip","hostname"
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			var ipAggsArray = response.aggregations.ipAggs.buckets;
			ipAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				cpuInfos.push(result.topHitAggs.hits.hits[0]._source);
			});
			cpuInfos.sort(function (a,b) {
				var sumApsutemp = 0;
				var sumBpsutemp = 0;
				a.psutemp.forEach(function(psutemp){
					sumApsutemp += Number(psutemp.value);
				});
				a.sumTemp = sumApsutemp;
				b.psutemp.forEach(function(psutemp){
					sumBpsutemp += Number(psutemp.value);
				});
				b.sumTemp = sumBpsutemp;

				if(sumApsutemp < sumBpsutemp){
					return 1;
				}else if(sumApsutemp > sumBpsutemp){
					return -1;
				}
				return 0;
			});
			if (cpuInfos.length > 40){
				cpuInfos.length = 40;
			}
			/*cpuInfos.sort(function (a,b) {
				if(a.psutemp.length < b.psutemp.length){
					return 1;
				}else if(a.psutemp.length > b.psutemp.length){
					return -1;
				}
				return 0;
			});*/

			//console.log("cpuInfos:" + JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	});
}
//getRecentPsuTempInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimePsuTempInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	/*ip = "ilogagent1";
	 date = '2016-03-30 23:45:35';*/
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	client.search({
		index: 'ipmiall',
		type: 'psutemp',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'psutemp.value','time','psutemp.name'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimePsuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			var maxArray = [];
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				result.fields['psutemp.name'].forEach(function(psutemp,index){
					result.fields[psutemp] = result.fields['psutemp.value'][index];
				});
				SpantimePsuInfos.push(result.fields);
				console.log(result.fields['psutemp.name']);
			});
			successProcess(SpantimePsuInfos);
		}
	})
}
//getSpantimePsuTempInfo(successProcessLocalTest,errorProcessLocalTest);
function getRecentPsuFanInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmiall',
		type: 'psufan',
		body: {
			size: 0,
			"aggs": {
				"ipAggs": {
					terms: {
						field: "ip",
						"size" : defaultDeviceCount
					},
					aggs: {
						topHitAggs: {
							top_hits: {
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"psufan", "time", "ip","hostname"
									]
								},
								"size": 1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var cpuInfos = [];
			var ipAggsArray = response.aggregations.ipAggs.buckets;
			ipAggsArray.forEach(function (result) {
				result.topHitAggs.hits.hits[0]._source.time = utils.formatDate(result.topHitAggs.hits.hits[0]._source.time);
				cpuInfos.push(result.topHitAggs.hits.hits[0]._source);
			});
			cpuInfos.sort(function (a,b) {
				var sumApsufan = 0;
				var sumBpsufan = 0;
				a.psufan.forEach(function(psufan){
					sumApsufan += Number(psufan.value);
				});
				a.sumFan = sumApsufan;
				b.psufan.forEach(function(psufan){
					sumBpsufan += Number(psufan.value);
				});
				b.sumFan = sumBpsufan;

				if(sumApsufan < sumBpsufan){
					return 1;
				}else if(sumApsufan > sumBpsufan){
					return -1;
				}
				return 0;
			});
			console.log(cpuInfos.length);
			if (cpuInfos.length > 20){
				cpuInfos.length = 20;
			}
			/*cpuInfos.sort(function (a,b) {
			 if(a.sysfan.length < b.sysfan.length){
			 return 1;
			 }else if(a.sysfan.length > b.sysfan.length){
			 return -1;
			 }
			 return 0;
			 });*/

			//console.log("cpuInfos:" + JSON.stringify(cpuInfos));
			successProcess(cpuInfos);
		}
	});
}
//getRecentPsuFanInfo(successProcessLocalTest,errorProcessLocalTest);
function getSpantimePsuFanInfo(successProcess,errorProcess) {

	var ip =arguments[2];
	var date = arguments[3];
	ip = "ilogagent1";
	date = '2016-3-30 23:45:35';
	var formatDate = utils.ISOdate(date);
	var beginDate = utils.addDate(date,-1);
	var ISObeginDate = utils.ISOdate(beginDate);

	client.search({
		index: 'ipmiall',
		type: 'psufan',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									term: {
										'hostname': ip
									}
								}
								,
								{
									"range": {
										"time": {
											"gte": ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}
					}
				}
			},
			"fields": [
				'psufan.value','time','psufan.name'
			],
			"sort": {"time": {"order": "asc"}},
			size: netTestCount
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var SpantimeCpuInfos = [];
			var ScpuAggsArray = response.hits.hits;
			ScpuAggsArray.forEach(function (result) {
				result.fields.time[0] = utils.ISOdate(result.fields.time[0]);
				result.fields['psufan.name'].forEach(function(cpuTemp,index){
					result.fields[cpuTemp] = result.fields['psufan.value'][index];
				});
				SpantimeCpuInfos.push(result.fields);
			});
			successProcess(SpantimeCpuInfos);
		}
	})
}
//getSpantimePsuFanInfo(successProcessLocalTest,errorProcessLocalTest);

function getSearchVisitAlarmInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [];
	var warningLevel = '';
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));
	/*id = '全部';
	ip = '全部';

	//alarmType = '';
	startdate = '';
	endDate = '';
	fromValue = 0;
	sizeValue = 10;
	sortName = 'time';
	sortOrder = 'desc';
	searchDetails = '';*/
	if (id != '全部'){
		var idSearchArray = {
			term: {
				'hostname': id
			}
		};
		mustArray.push(idSearchArray);
	}
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'ip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	/*if(alarmType != ''){
		var warningLevelsArray = {
			term: {
				'alarmtype': alarmType
			}
		};
		mustArray.push(warningLevelsArray);
	}*/
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'ilogcaptureall',
		type: 'who',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			//console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchVisitAlarmInfo(successProcessLocalTest,errorProcessLocalTest);
function getVistiAlarmIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		type: 'who',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "ip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getVistiAlarmIpInfo(successProcessLocalTest,errorProcessLocalTest);
function getVistiAlarmUserIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		type: 'who',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "hosts.userip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getVistiAlarmUserIpInfo(successProcessLocalTest,errorProcessLocalTest);

/*
* 时间误差
* */
function getSearchErrotimeInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [];
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));

/*
	id = '全部';
	 ip = '全部';
	 startdate = '';
	 endDate = '';
	 fromValue = 0;
	 sizeValue = 10;
	 sortName = 'time';
	 sortOrder = 'desc';
	 searchDetails = '1886';*/


	if (id != '全部'){
		var idSearchArray = {
			term: {
				'hostname': id
			}
		};
		mustArray.push(idSearchArray);
	}
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'ip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'hoststatusall',
		type: 'errortime',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchErrotimeInfo(successProcessLocalTest,errorProcessLocalTest);
function getErrotimeIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'hoststatusall',
		type: 'errortime',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "ip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getErrotimeIpInfo(successProcessLocalTest,errorProcessLocalTest);
function getErrotimeHostnameInfo(successProcess,errorProcess) {
	client.search({
		index: 'hoststatusall',
		type: 'errortime',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "hostname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getErrotimeHostnameInfo(successProcessLocalTest,errorProcessLocalTest);
/*
 * 流量异常
 * */
function getSearchNettrafficInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [];
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));

	/* id = '全部';
	 ip = '全部';
	 startdate = '';
	 endDate = '';
	 fromValue = 0;
	 sizeValue = 10;
	 sortName = 'time';
	 sortOrder = 'desc';
	 searchDetails = '';*/


	if (id != '全部'){
		var idSearchArray = {
			term: {
				'hostname': id
			}
		};
		mustArray.push(idSearchArray);
	}
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'alarmreason': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'hoststatusall',
		type: 'nettraffic',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				record._source.starttime  = utils.ISOdate(record._source.starttime );
				record._source.updatetime  = utils.ISOdate(record._source.updatetime );

				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchNettrafficInfo(successProcessLocalTest,errorProcessLocalTest);
function getNettrafficAnomalyReasonInfo(successProcess,errorProcess) {
	client.search({
		index: 'hoststatusall',
		type: 'nettraffic',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "alarmreason",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getNettrafficAnomalyReasonInfo(successProcessLocalTest,errorProcessLocalTest);
function getNettrafficHostnameInfo(successProcess,errorProcess) {
	client.search({
		index: 'hoststatusall',
		type: 'nettraffic',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "hostname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getNettrafficHostnameInfo(successProcessLocalTest,errorProcessLocalTest);
/*
* CPU 温度异常
* */
function getSearchCpuTempAlarmInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [{
		term: {
			'alarmtype': '1'
		}
	}];
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));

	/* id = '全部';
	 ip = '全部';
	 startdate = '';
	 endDate = '';
	 fromValue = 0;
	 sizeValue = 10;
	 sortName = 'time';
	 sortOrder = 'desc';
	 searchDetails = '';*/


	if (id != '全部'){
		var idSearchArray = {
			term: {
				'hostname': id
			}
		};
		mustArray.push(idSearchArray);
	}
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'alarmdevice': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			if (!isNaN(searchDetails)){
				searchDetails += '.000';
			}
			if(searchDetails.indexOf("℃") > -1 ){
				searchDetails = searchDetails.replace("℃",'');
				searchDetails += '.000';
			}
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'ipmistatusall',
		type: 'ipmialarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				record._source.alarmvalue = Number(record._source.alarmvalue).toFixed(0) + '℃';
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			//console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchCpuTempAlarmInfo(successProcessLocalTest,errorProcessLocalTest);
function getCpuTempAlarmDeviceInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmistatusall',
		type: 'ipmialarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"alarmtype": "1"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "alarmdevice",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getCpuTempAlarmDeviceInfo(successProcessLocalTest,errorProcessLocalTest);
function getCpuTempAlarmHostnameInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmistatusall',
		type: 'ipmialarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"alarmtype": "1"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "hostname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getCpuTempAlarmHostnameInfo(successProcessLocalTest,errorProcessLocalTest);
/*
 * CPU 风扇异常   由于CPU 风扇异常无数据，暂用电源风扇数据代替测试。CPU 风扇alarmtype = 2
 * */
function getSearchCpuFanAlarmInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [{
		term: {
			'alarmtype': '2'
		}
	}];
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));

	/* id = '全部';
	 ip = '全部';
	 startdate = '';
	 endDate = '';
	 fromValue = 0;
	 sizeValue = 10;
	 sortName = 'time';
	 sortOrder = 'desc';
	 searchDetails = '';
*/

	if (id != '全部'){
		var idSearchArray = {
			term: {
				'hostname': id
			}
		};
		mustArray.push(idSearchArray);
	}
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'alarmdevice': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			if (!isNaN(searchDetails)){
				searchDetails += '.000';
			}
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'ipmistatusall',
		type: 'ipmialarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				record._source.alarmvalue = Number(record._source.alarmvalue).toFixed(0);
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchCpuFanAlarmInfo(successProcessLocalTest,errorProcessLocalTest);
function getCpuFanAlarmDeviceInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmistatusall',
		type: 'ipmialarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"alarmtype": "2"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "alarmdevice",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getCpuFanAlarmDeviceInfo(successProcessLocalTest,errorProcessLocalTest);
function getCpuFanAlarmHostnameInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmistatusall',
		type: 'ipmialarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"alarmtype": "2"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "hostname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getCpuFanAlarmHostnameInfo(successProcessLocalTest,errorProcessLocalTest);
/*
* 数据库告警 长时间占用cpu
* */
function getSearchDmalarmCpuInfo (successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [{
		term: {
			'alarmtype': '1'
		}
	}];
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));

	/* id = '全部';
	 ip = '全部';
	 startdate = '';
	 endDate = '';
	 fromValue = 0;
	 sizeValue = 10;
	 sortName = 'time';
	 sortOrder = 'desc';
	 searchDetails = '';*/

	if (id != '全部'){
		var idSearchArray = {
			term: {
				'appname': id
			}
		};
		mustArray.push(idSearchArray);
	}
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'userip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchDmalarmCpuInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmalarmCpuIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"alarmtype": "1"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "userip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getDmalarmCpuIpInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmalarmCpuAppnameInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"alarmtype": "1"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "appname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getDmalarmCpuAppnameInfo(successProcessLocalTest,errorProcessLocalTest);
/*
 * 数据库告警 非法使用isql
 * */
function getSearchDmalarmIsqlInfo (successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [{
		term: {
			'appname': 'isql'
		}
	}];
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));

	/* id = '全部';
	 ip = '全部';
	 startdate = '';
	 endDate = '';
	 fromValue = 0;
	 sizeValue = 10;
	 sortName = 'time';
	 sortOrder = 'desc';
	 searchDetails = '';*/

	if (id != '全部'){
		var idSearchArray = {
			term: {
				'userip': id
			}
		};
		mustArray.push(idSearchArray);
	}
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'userip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchDmalarmIsqlInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmalarmIsqlIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"appname": "isql"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "userip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getDmalarmIsqlIpInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmalarmIsqlAppnameInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"appname": "isql"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "appname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getDmalarmIsqlAppnameInfo(successProcessLocalTest,errorProcessLocalTest);
/*
 * 数据库告警 连接数超限
 * */
function getSearchDmalarmLinkInfo (successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [{
		term: {
			'alarmtype': '4'
		}
	}];
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));
/*
	 id = '全部';
	 ip = '全部';
	 startdate = '';
	 endDate = '';
	 fromValue = 0;
	 sizeValue = 10;
	 sortName = 'time';
	 sortOrder = 'desc';
	 searchDetails = '';*/

	if (id != '全部'){
		var idSearchArray = {
			term: {
				'dbname': id
			}
		};
		mustArray.push(idSearchArray);
	}
	/*if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'userip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}*/
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			if (isNaN(searchDetails)) {
				var searchDetailArray = {
					match_phrase: {
						'_all': searchDetails
					}
				};
				mustArray.push(searchDetailArray);
			} else {
				var searchDetailArray = {
					term: {
						'dblink': searchDetails
					}
				};
				mustArray.push(searchDetailArray);
			}

		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchDmalarmLinkInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmalarmLinkIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"alarmtype": "4"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "dbname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getDmalarmLinkIpInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmalarmIsqlAppnameInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"appname": "isql"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "appname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getDmalarmIsqlAppnameInfo(successProcessLocalTest,errorProcessLocalTest);
/*
 * 数据库告警 长时间锁表
 * */
function getSearchDmalarmLockInfo (successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	//var alarmType = arguments[5];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var id = arguments[5];
	var mustArray = [{
		term: {
			'alarmtype': '5'
		}
	}];
	//console.log("~~~~~~~~~~~~~~~~~~~~~~" + JSON.stringify(arguments));
	/*
	 id = '全部';
	 ip = '全部';
	 startdate = '';
	 endDate = '';
	 fromValue = 0;
	 sizeValue = 10;
	 sortName = 'time';
	 sortOrder = 'desc';
	 searchDetails = '';*/

	if (id != '全部'){
		var idSearchArray = {
			term: {
				'dbname': id
			}
		};
		mustArray.push(idSearchArray);
	}
	/*if (ip != '全部'){
	 var ipSearchArray = {
	 term: {
	 'userip': ip
	 }
	 };
	 mustArray.push(ipSearchArray);
	 }*/
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			if (isNaN(searchDetails)) {
				var searchDetailArray = {
					match_phrase: {
						'_all': searchDetails
					}
				};
				mustArray.push(searchDetailArray);
			} else {
				var searchDetailArray = {
					term: {
						'dblink': searchDetails
					}
				};
				mustArray.push(searchDetailArray);
			}

		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];
	sortArray=JSON.parse(sortOutArray);
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var veadArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				veadArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:veadArray
			};
			console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchDmalarmLinkInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmalarmLockIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmalarm',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"term": {
										"alarmtype": "5"
									}
								}
							]
						}
					}
				}
			},
			"aggs": {
				dmsession: {
					"terms": {
						"field": "dbname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getDmalarmLinkIpInfo(successProcessLocalTest,errorProcessLocalTest);


/*
* 报表
* */
function getReportCpuInfo(successProcess,errorProcess) {
	var ISObeginDate = arguments[2];
	//ISObeginDate = '2016-11-22 00:00:00';
	var formatDate = arguments[3];
	//formatDate = '2016-11-24 00:00:00';
	client.search({
		index: 'ilogcaptureall',
		type: 'top',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"range": {
										"time": {
											"gte":ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}

					}
				}
			},
			"fields": ["cpu.us","time","cpu.sy"],
			//"sort": {
			//	"time": {"order": "asc"}
			//},
			aggs:{
				"ipAggs": {
					terms: {
						field: "hostname",
						size:10000
					}
					,
					aggs: {
						topHitAggs:{
							top_hits:{
								"sort": [
									{
										"cpu.id": {
											"order": "asc"
										}
									}
								],
								"_source": {
									"include": [
										"cpu","time", "ip",'hostname'
									]
								},
								"size":1
							}
						}

					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			//console.log("~~~~" + response.aggregations);
			var reportCpuInfos = [];
			var reportDataAggsArray = response.aggregations.ipAggs.buckets;
			reportDataAggsArray.forEach(function (result) {
				var reportDataObj = result.topHitAggs.hits.hits[0]._source;
				reportDataObj.time = utils.ISOdate(reportDataObj.time);
				var reportInfoObj = {
					hostname:reportDataObj.hostname,
					reportCpuInfo:(reportDataObj.cpu.us + reportDataObj.cpu.sy).toFixed(2)
				};
				reportCpuInfos.push(reportInfoObj);
			});
			//console.log(reportCpuInfos);
			successProcess(reportCpuInfos);
		}

	});
}
//getReportCpuInfo(successProcessLocalTest,errorProcessLocalTest);
function getReportMemInfo(successProcess,errorProcess) {
	var ISObeginDate = arguments[2];
	//ISObeginDate = '2016-11-22 00:00:00';
	var formatDate = arguments[3];
	//formatDate = '2016-11-24 00:00:00';
	client.search({
		index: 'ilogcaptureall',
		type: 'top',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"range": {
										"time": {
											"gte":ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}

					}
				}
			},
			"fields": ["time"],
			//"sort": {
			//	"time": {"order": "asc"}
			//},
			aggs:{
				"hostnameAggs": {
					terms: {
						field: "hostname",
						size:10000
					}
					,
					aggs: {
						topHitAggs:{
							top_hits:{
								"sort": [
									{
										"memory.used": {
											"order": "asc"
										}
									}
								],
								"_source": {
									"include": [
										"memory","time", "ip",'hostname'
									]
								},
								"size":1
							}
						}

					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			//console.log("~~~~" + response.aggregations);
			var reportMemInfos = [];
			var reportDataAggsArray = response.aggregations.hostnameAggs.buckets;
			reportDataAggsArray.forEach(function (result) {
				var reportDataObj = result.topHitAggs.hits.hits[0]._source;
				reportDataObj.time = utils.ISOdate(reportDataObj.time);
				var reportInfoObj = {
					hostname:reportDataObj.hostname,
					reportMemInfo:(reportDataObj.memory.used/reportDataObj.memory.total).toFixed(2)
				};
				reportMemInfos.push(reportInfoObj);
			});
			successProcess(reportMemInfos);
		}

	});
}
//getReportMemInfo(successProcessLocalTest,errorProcessLocalTest);
function getReportDiskInfo(successProcess,errorProcess) {
	var ISObeginDate = arguments[2];
	//ISObeginDate = '2016-11-22 00:00:00';
	var formatDate = arguments[3];
	//formatDate = '2016-11-24 00:00:00';
	client.search({
		index: 'ilogcaptureall',
		type: 'df',
		body: {
			"query": {
				"filtered": {
					"filter": {
						"bool": {
							"must": [
								{
									"range": {
										"time": {
											"gte":ISObeginDate,
											"lte": formatDate,
											//	"format": "dd/MM/yyyy||yyyy",
											"format": "yyyy-MM-dd HH:mm:ss"
										}
									}
								}
							]
						}

					}
				}
			},
			"fields": ["time"],
			//"sort": {
			//	"time": {"order": "asc"}
			//},
			aggs:{
				"ipAggs": {
					terms: {
						field: "hostname",
						size:10000
					}
					,
					aggs: {
						topHitAggs:{
							top_hits:{
								"sort": [
									{
										"time": {
											"order": "desc"
										}
									}
								],
								"_source": {
									"include": [
										"disk","time", "ip",'hostname'
									]
								},
								"size":1
							}
						}
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var reportMemInfos = [];
			var reportDataAggsArray = response.aggregations.ipAggs.buckets;
			//console.log("~~~~" + JSON.stringify(reportDataAggsArray));
			reportDataAggsArray.forEach(function (result) {
				var reportDataObj = result.topHitAggs.hits.hits[0]._source;
				reportDataObj.time = utils.ISOdate(reportDataObj.time);
				var diskUsed = 0,
					diskTotal = 0;
				reportDataObj.disk.forEach(function(diskData){
					diskUsed += Number(diskData.used);
					diskTotal += Number(diskData.total);
				});
				var reportInfoObj = {
					hostname:reportDataObj.hostname,
					diskUse:(diskUsed/diskTotal).toFixed(2)
				};
				reportMemInfos.push(reportInfoObj);
			});
			successProcess(reportMemInfos);
		}

	});
}
//getReportDiskInfo(successProcessLocalTest,errorProcessLocalTest);
function getReportHostnameInof(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		type: 'top',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "hostname",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			successProcess(ipAggsArray);
		}
	});
}
// getReportHostnameInof(successProcessLocalTest,errorProcessLocalTest);

/*
* 日志管理
* */
//主机信息
function getIlogcaptureLogInfo(successProcess,errorProcess) {
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var mustArray = [];
	var warningLevel = '';
	var matchValue = '';
	/*ip = '全部';
	 endDate = '';
	 startdate = '';
	 sortName = 'time';
	 sortOrder = 'desc';
	 fromValue = 1;
	 sizeValue = 100;
	 searchDetails = '';*/

	console.log('sizeValue:'+sizeValue);
	console.log('sortName:' + sortName);
	console.log('sortOrder:' + sortOrder);


	var filteredArray = {};
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'ip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];

//	sortArray=eval('(' + sortOutArray + ')');
	sortArray=JSON.parse(sortOutArray);

	//console.log(sortArray);




	client.search({
		index: 'ilogcaptureall',
		type: 'ilogcapturelog',
		body: {
			"query": {
				"filtered": {
					"filter": {
						'bool': {
							must: mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var rsysArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				rsysArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:rsysArray
			};
			//console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getIlogcaptureLogInfo(successProcessLocalTest,errorProcessLocalTest);
function getIlogIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'ilogcaptureall',
		type: 'ilogcapturelog',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "ip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getIlogIpInfo(successProcessLocalTest,errorProcessLocalTest);

//达梦数据库 日志
function getSearchDmLogInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var mustArray = [];
	var warningLevel = '';
	var matchValue = '';
	 /*ip = '全部';
	 endDate = '';
	 startdate = '';
	 sortName = 'time';
	 sortOrder = 'desc';
	 fromValue = 1;
	 sizeValue = 100;
	 searchDetails = '';*/

	console.log('sizeValue:'+sizeValue);
	console.log('sortName:' + sortName);
	console.log('sortOrder:' + sortOrder);


	var filteredArray = {};
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'ip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate
					//	"format": "dd/MM/yyyy||yyyy",
					//"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];

//	sortArray=eval('(' + sortOutArray + ')');
	sortArray=JSON.parse(sortOutArray);

	//console.log(sortArray);




	client.search({
		index: 'dmdbmonall',
		type: 'dmdbmonlog',
		body: {
			"query": {
				"filtered": {
					"filter": {
						'bool': {
							must: mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var rsysArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				rsysArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:rsysArray
			};
			//console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchDmLogInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmLogInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmdbmonlog',
		size:defaultDeviceCount
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var dmlogArray = response.hits.hits;
			//	console.log("response : "+response);
			var dmOutPutArray = [];
			dmlogArray.forEach(function (record) {
				record._source.time = utils.ISOdate(record._source.time);
				dmOutPutArray.push(record._source);
			});
			//console.log(ilogArray);
			successProcess(dmOutPutArray);
		}
	});
}
//getDmLogInfo(successProcessLocalTest,errorProcessLocalTest);
function getDmlogIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'dmdbmonall',
		type: 'dmdbmonlog',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "ip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getDmlogIpInfo(successProcessLocalTest,errorProcessLocalTest);
//IPMI 日志
function getSearchIpmiLogInfo(successProcess,errorProcess){
	var ip =arguments[2];
	var startdate = arguments[3];
	var endDate = arguments[4];
	var searchDetails = arguments[6];
	var fromValue = arguments[7];
	var sizeValue = arguments[8];
	var sortName = arguments[9];
	var sortOrder = arguments[10];
	var mustArray = [];
	var warningLevel = '';
	var matchValue = '';
	/*ip = '全部';
	 endDate = '';
	 startdate = '';
	 sortName = 'time';
	 sortOrder = 'desc';
	 fromValue = 1;
	 sizeValue = 100;
	 searchDetails = '';*/

	console.log('sizeValue:'+sizeValue);
	console.log('sortName:' + sortName);
	console.log('sortOrder:' + sortOrder);


	var filteredArray = {};
	if (ip != '全部'){
		var ipSearchArray = {
			term: {
				'ip': ip
			}
		};
		mustArray.push(ipSearchArray);
	}
	if(startdate != ''&& endDate !=''){

		var dateSearchArray = {
			"range": {
				"time": {
					"gte": startdate,
					"lte": endDate,
					//	"format": "dd/MM/yyyy||yyyy",
					"format": "yyyy-MM-dd HH:mm:ss"
				}
			}
		};
		mustArray.push(dateSearchArray);
	}
	if(searchDetails != ''){
		if (isDate(searchDetails) == true){
			var searchDateFrom = searchDetails + " " +"00:00:00";
			var searchDateTo = utils.addDate(searchDateFrom,1);
			var dateSearchNew = {
				"range": {
					"time": {
						"gte": searchDateFrom,
						"lt": searchDateTo,
						//	"format": "dd/MM/yyyy||yyyy",
						"format": "yyyy-MM-dd HH:mm:ss"
					}
				}
			};
			mustArray.push(dateSearchNew);
		}else{
			var searchDetailArray = {
				match_phrase: {
					'_all': searchDetails
				}
			};
			mustArray.push(searchDetailArray);
		}
	}
	var sortOutArray = "[{" +'"'+ sortName+'"' +" :{" + '"' + "order" + '"'+ ":" +'"'+ sortOrder +'"'+"}}]";
	var sortArray = [];

//	sortArray=eval('(' + sortOutArray + ')');
	sortArray=JSON.parse(sortOutArray);

	//console.log(sortArray);


	client.search({
		index: 'ipmiall',
		type: 'ipmilog',
		body: {
			"query": {
				"filtered": {
					"filter": {
						'bool': {
							must: mustArray
						}
					}
				}
			},
			sort:sortArray,
			from:fromValue,
			size: sizeValue
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {
			var rsysArray = [];
			var searchDataArry = response.hits.hits;
			searchDataArry.forEach(function(record){
				record._source.time  = utils.ISOdate(record._source.time );
				rsysArray.push(record._source)
			});
			var totalValue = response.hits.total;
			if (response.hits.total > 10000){
				totalValue = 10000;
			}
			var outPutArray = {
				total:totalValue,
				rows:rsysArray
			};
			//console.log('11 :' + JSON.stringify(outPutArray));
			successProcess(outPutArray);
		}
	})
}
//getSearchIpmiLogInfo(successProcessLocalTest,errorProcessLocalTest);
function getIpmilogIpInfo(successProcess,errorProcess) {
	client.search({
		index: 'ipmiall',
		type: 'ipmilog',
		body: {
			"aggs": {
				dmsession: {
					"terms": {
						"field": "ip",
						"size": 0
					}
				}
			}
		}
	}, function (error, response) {
		if(typeof error == "object"){
			errorProcess(error);
		}else {

			var ipAggsArray = response.aggregations.dmsession.buckets;
			//	console.log("response : "+response);
			console.log(ipAggsArray);
			successProcess(ipAggsArray);
		}
	});
}
//getIpmilogIpInfo(successProcessLocalTest,errorProcessLocalTest);


exports.getRecentCpuInfo = getRecentCpuInfo;
exports.getRecentMemoryInfo = getRecentMemoryInfo;
exports.getRecentDiskIOInfo = getRecentDiskIOInfo;
exports.getRecentNetethInfo = getRecentNetethInfo;
exports.getRecentLinkCountInfo = getRecentLinkCountInfo;
exports.getRecentCpuTempInfo = getRecentCpuTempInfo;
exports.getRecentCpuFanInfo = getRecentCpuFanInfo;
exports.getRecentPsuTempInfo = getRecentPsuTempInfo;
exports.getRecentPsuFanInfo = getRecentPsuFanInfo;


exports.getSpantimeMemoryInfo = getSpantimeMemoryInfo;
exports.getSpantimeCpuInfo = getSpantimeCpuInfo;
exports.getSpantimeDiskIOInfo = getSpantimeDiskIOInfo;
exports.getSpantimeNetethInfo = getSpantimeNetethInfo;
exports.getSpantimeNetTCPInfo = getSpantimeNetTCPInfo;
exports.getSpantimeNetUDPInfo = getSpantimeNetUDPInfo;
exports.getSpantimeNetICMPInfo = getSpantimeNetICMPInfo;
exports.getSpantimeNetIPInfo = getSpantimeNetIPInfo;
exports.getSpantimeTcpLinksInfo = getSpantimeTcpLinksInfo;
exports.getSpantimeUdpLinksInfo = getSpantimeUdpLinksInfo;
exports.getSpantimeCpuTempInfo = getSpantimeCpuTempInfo;
exports.getSpantimeCpuFanInfo = getSpantimeCpuFanInfo;
exports.getSpantimePsuTempInfo = getSpantimePsuTempInfo;
exports.getSpantimePsuFanInfo = getSpantimePsuFanInfo;



exports.getSettimeCpuInfo = getSettimeCpuInfo;
exports.getSettimeMemInfo = getSettimeMemInfo;

exports.getRsyslogEmergNumInfo = getRsyslogEmergNumInfo;
exports.getRsyslogAlertNumInfo = getRsyslogAlertNumInfo;
exports.getRsyslogCritNumInfo = getRsyslogCritNumInfo;
exports.getRsyslogErrNumInfo = getRsyslogErrNumInfo;

exports.getRecentUserIpInfo = getRecentUserIpInfo;

exports.getAnomalNumInfo = getAnomalNumInfo;
exports.getAnomalDataInfo = getAnomalDataInfo;
exports.getAnomalIpInfo = getAnomalIpInfo;

exports.getNetAlarmInfo = getNetAlarmInfo;
exports.getSearchRsysDetailInfo = getSearchRsysDetailInfo;
exports.getRsysIpInfo = getRsysIpInfo;
exports.getVeadDetailInfo = getVeadDetailInfo;
exports.getSearchIdInfo = getSearchIdInfo;
exports.getSearchVeadInfo = getSearchVeadInfo;
exports.getRsyslogTest = getRsyslogTest;
exports.getRsyslogFourTypeInfo = getRsyslogFourTypeInfo;
exports.getRsyslogFourTypeTestInfo = getRsyslogFourTypeTestInfo;
exports.getVeadDetailTestInfo = getVeadDetailTestInfo;
exports.getRecentCpuTimeInfo = getRecentCpuTimeInfo;
exports.getRecentlogicreadsTimeInfo = getRecentlogicreadsTimeInfo;
exports.getSetIpCpuTimeInfo = getSetIpCpuTimeInfo;
exports.getSetIplogicreadsTimeInfo = getSetIplogicreadsTimeInfo;
exports.getVeadTwoStatusInfo = getVeadTwoStatusInfo;
exports.getVeadThreeStatusInfo = getVeadThreeStatusInfo;
exports.getTuopuCMDataInfo = getTuopuCMDataInfo;
exports.getSetIpRsyslogTypeInfo = getSetIpRsyslogTypeInfo;
exports.getNewVeadTwoStatusInfo = getNewVeadTwoStatusInfo;
exports.getSearchVisitAlarmInfo = getSearchVisitAlarmInfo;
exports.getVistiAlarmIpInfo = getVistiAlarmIpInfo;
exports.getVistiAlarmUserIpInfo = getVistiAlarmUserIpInfo;

/*
* 时间误差
* */
exports.getSearchErrotimeInfo = getSearchErrotimeInfo;
exports.getErrotimeIpInfo = getErrotimeIpInfo;
exports.getErrotimeHostnameInfo = getErrotimeHostnameInfo;
/*
* 流量异常
* */
exports.getSearchNettrafficInfo = getSearchNettrafficInfo;
exports.getNettrafficAnomalyReasonInfo = getNettrafficAnomalyReasonInfo;
exports.getNettrafficHostnameInfo = getNettrafficHostnameInfo;
/*
 * CPU温度异常
 * */
exports.getSearchCpuTempAlarmInfo = getSearchCpuTempAlarmInfo;
exports.getCpuTempAlarmDeviceInfo = getCpuTempAlarmDeviceInfo;
exports.getCpuTempAlarmHostnameInfo = getCpuTempAlarmHostnameInfo;
/*
 * CPU风扇异常
 * */
exports.getSearchCpuFanAlarmInfo = getSearchCpuFanAlarmInfo;
exports.getCpuFanAlarmDeviceInfo = getCpuFanAlarmDeviceInfo;
exports.getCpuFanAlarmHostnameInfo = getCpuFanAlarmHostnameInfo;
/*
 * 数据库告警 长时间占用cpu
 * */
exports.getSearchDmalarmCpuInfo = getSearchDmalarmCpuInfo;
exports.getDmalarmCpuIpInfo = getDmalarmCpuIpInfo;
exports.getDmalarmCpuAppnameInfo = getDmalarmCpuAppnameInfo;
/*
 * 数据库告警 非法使用isql
 * */
exports.getSearchDmalarmIsqlInfo = getSearchDmalarmIsqlInfo;
exports.getDmalarmIsqlIpInfo = getDmalarmIsqlIpInfo;
//exports.getDmalarmCpuAppnameInfo = getDmalarmCpuAppnameInfo;
/*
* 数据库告警 连接数超限
* */
exports.getSearchDmalarmLinkInfo = getSearchDmalarmLinkInfo;
exports.getDmalarmLinkIpInfo = getDmalarmLinkIpInfo;
//exports.getDmalarmCpuAppnameInfo = getDmalarmCpuAppnameInfo;
/*
 * 数据库告警 长时间锁表
 * */
exports.getSearchDmalarmLockInfo = getSearchDmalarmLockInfo;
exports.getDmalarmLockIpInfo = getDmalarmLockIpInfo;


exports.getNetIpInof = getNetIpInof;
exports.getDataTest = getDataTest;

/*
* 报表导出
* */
exports.getReportCpuInfo = getReportCpuInfo;
exports.getReportMemInfo = getReportMemInfo;
exports.getReportDiskInfo = getReportDiskInfo;
exports.getReportHostnameInof = getReportHostnameInof;


/*
 * 日志管理
 * */
//主机信息
exports.getIlogcaptureLogInfo = getIlogcaptureLogInfo;
exports.getIlogIpInfo = getIlogIpInfo;

//达梦数据库 日志
exports.getSearchDmLogInfo = getSearchDmLogInfo;
exports.getDmlogIpInfo = getDmlogIpInfo;


//IPMI 日志
exports.getSearchIpmiLogInfo = getSearchIpmiLogInfo;
exports.getIpmilogIpInfo = getIpmilogIpInfo;



exports.client = client;