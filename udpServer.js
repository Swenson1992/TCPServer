/**
 * Created by songjian on 2016/12/28 0028.
 */
var dgram = require("dgram");
var server = dgram.createSocket("udp4");

server.on('message',function(msg,rinfo){
    //第二个参数签名为
    console.log(rinfo);
    console.log('server got:'+msg+" from "+rinfo.address+":"+rinfo.port);
})
server.on('listening',function(){
    //server对象的签名为
    var address=server.address();
    console.log('server listening '+address.address+":"+address.port);
});
//下面让UDP套接字接受网络消息,这个套接字接受所有网卡上6666端口号的消息，在绑定完成之后触发listening事件
server.bind(6666);