//
// 自动化截取刷卡资料
//

'use strict';	// Whole-script strict mode applied.

const http = require('http');               // a high-performing foundation for an HTTP stack 
const fs = require('fs');                   // fs模块提供对文件系统的访问
const querystring = require('querystring'); // The querystring module provides utilities for parsing and formatting URL query strings. 
const moment = require('moment');

//
// Step 1: Open login page to get cookie 'ASP.NET_SessionId' and hidden input '_ASPNetRecycleSession'.
//
var _ASPNET_SessionId;
var _ASPNetRecycleSession;
var Arr = [];

function openLoginPage() {

    function callback(response) {
        let chunks = [];
        response.addListener('data', (chunk) => {
            chunks.push(chunk);
        });
        response.on('end', () => {
            let buff = Buffer.concat(chunks);
            let html = buff.toString();
            if (response.statusCode===200) {
                let fo = fs.createWriteStream('tmp/step1-LoginPage.html');
                fo.write(html);
                fo.end();
                let cookie = response.headers['set-cookie'][0];
                let patc = new RegExp('ASP.NET_SessionId=(.*?);');
                let mc = patc.exec(cookie);
                if (mc) {
                    _ASPNET_SessionId = mc[1];
                    console.log(`Cookie ASP.NET_SessionId: ${_ASPNET_SessionId}`);
                }
                let patm =  new RegExp('<input type="hidden" name="_ASPNetRecycleSession" id="_ASPNetRecycleSession" value="(.*?)" />');
                let mm = patm.exec(html);
                if (mm) {
                    _ASPNetRecycleSession = mm[1];
                    console.log(`Element _ASPNetRecycleSession: ${_ASPNetRecycleSession}`);
                }
                console.log('Step1 login page got.\n');
                login();
            } else {
                let msg = `Step1 HTTP error: ${response.statusMessage}`;
                console.error(msg);
            }
        });
    }

    let req = http.request("http://twhratsql.whq.wistron/OGWeb/LoginForm.aspx", callback);

    req.on('error', e => {
        let msg = `Step1 Problem: ${e.message}`;
        console.error(msg);
    });

    req.end();
}

//
// Step 2: POST data to login to get cookie 'OGWeb'.
//
var OGWeb;

function login() {

    function callback(response) {
        let chunks = [];
        response.addListener('data', (chunk) => {
            chunks.push(chunk);
        });
        response.on('end', () => {
            let buff = Buffer.concat(chunks);
            let html = buff.toString();
            if (response.statusCode===302) {
                let fo = fs.createWriteStream('tmp/step2-login.html');
                fo.write(html);
                fo.end();
                let cookie = response.headers['set-cookie'][0];
                let patc = new RegExp('OGWeb=(.*?);');
                let mc = patc.exec(cookie);
                if (mc) {
                    OGWeb = mc[1];
                    console.log('Cookie OGWeb got.');
                }
                console.log('Step2 done.\n');
                step3();
            } else {
                let msg = `Step2 HTTP error: ${response.statusMessage}`;
                console.error(msg);
            }
        });
    }

    let postData = querystring.stringify({
        '__ctl07_Scroll': '0,0',
        '__VIEWSTATE': '/wEPDwULLTEyMTM0NTM5MDcPFCsAAmQUKwABZBYCAgMPFgIeBXN0eWxlBTFiZWhhdmlvcjp1cmwoL09HV2ViL3RxdWFya19jbGllbnQvZm9ybS9mb3JtLmh0Yyk7FhACCA8UKwAEZGRnaGQCCg8PFgIeDEVycm9yTWVzc2FnZQUZQWNjb3VudCBjYW4gbm90IGJlIGVtcHR5LmRkAgwPDxYCHwEFGlBhc3N3b3JkIGNhbiBub3QgYmUgZW1wdHkuZGQCDQ8PFgIeB1Zpc2libGVoZGQCDg8UKwAEZGRnaGQCEg8UKwADDxYCHgRUZXh0BSlXZWxjb21lIFRvIOe3r+WJteizh+mAmuiCoeS7veaciemZkOWFrOWPuGRkZ2QCFA8UKwADDxYCHwMFK0Jlc3QgUmVzb2x1dGlvbjoxMDI0IHggNzY4OyBJRSA2LjAgb3IgYWJvdmVkZGdkAhsPFCsAAmQoKWdTeXN0ZW0uRHJhd2luZy5Qb2ludCwgU3lzdGVtLkRyYXdpbmcsIFZlcnNpb249Mi4wLjAuMCwgQ3VsdHVyZT1uZXV0cmFsLCBQdWJsaWNLZXlUb2tlbj1iMDNmNWY3ZjExZDUwYTNhBDAsIDBkGAEFHl9fQ29udHJvbHNSZXF1aXJlUG9zdEJhY2tLZXlfXxYCBQVjdGwwNwUITG9naW5CdG6vo0TFNrmm9RKH7uSQ+NY2OXccyA==',
        '__VIEWSTATEGENERATOR': 'F163E3A2',
        '_PageInstance': '1',
        '__EVENTVALIDATION': '/wEWBAK20LBAAsiTss0OArOuiN0CArmtoJkDPmmwqug37xjPhGglEwK8JU9zleg=',
        'UserPassword': 'S0808001',
        'UserAccount': 'S0808001',
        'LoginBtn.x': '74',
        'LoginBtn.y': '10',
        '_ASPNetRecycleSession': _ASPNetRecycleSession
    });
    //console.log(postData);
    let req = http.request({
        hostname: "twhratsql.whq.wistron",
        path: "/OGWeb/LoginForm.aspx",
        method: "POST",
        headers: {
            'Cookie': 'ASP.NET_SessionId='+_ASPNET_SessionId,   // NOTED.
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, callback);

    req.on('error', e => {
        let msg = `Step2 Problem: ${e.message}`;
        console.error(msg);
    });

    req.write(postData);
    req.end();
}

//
// Step 3: Open EntryLogQueryForm.aspx page to get hidden input '_ASPNetRecycleSession', '__VIEWSTATE' and '__EVENTVALIDATION'.
//
var __VIEWSTATE = '';
var __EVENTVALIDATION = '';

function step3() {

    function callback(response) {
        let chunks = [];
        response.addListener('data', (chunk) => {
            chunks.push(chunk);
        });
        response.on('end', () => {
            let buff = Buffer.concat(chunks);
            let html = buff.toString();
            if (response.statusCode===200) {
                let fo = fs.createWriteStream('tmp/step3.html');
                fo.write(html);
                fo.end();
                let patm =  new RegExp('<input type="hidden" name="_ASPNetRecycleSession" id="_ASPNetRecycleSession" value="(.*?)" />');
                let mm = patm.exec(html);
                if (mm) {
                    _ASPNetRecycleSession = mm[1];
                    console.log(`Element _ASPNetRecycleSession: ${_ASPNetRecycleSession}`);
                }
                let patv =  new RegExp('<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="(.*?)"');
                let mv = patv.exec(html);
                if (mv) {
                    __VIEWSTATE = mv[1];
                    console.log('Element __VIEWSTATE got');
                }
                let pate =  new RegExp('<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="(.*?)"');
                let me = pate.exec(html);
                if (me) {
                    __EVENTVALIDATION = me[1];
                    console.log('Element __EVENTVALIDATION got');
                }
                console.log('Step3 done.\n');
                askAll();
            } else {
                let msg = `Step3 HTTP error: ${response.statusMessage}`;
                console.error(msg);
            }
        });
    }

    let req = http.request({
        hostname: "twhratsql.whq.wistron",
        path: "/OGWeb/OGWebReport/EntryLogQueryForm.aspx",
        //method: "GET",    // Default can be omitted.
        headers: {
            'Cookie': `ASP.NET_SessionId=${_ASPNET_SessionId}; OGWeb=${OGWeb}`  // important
        }
    }, callback);

    req.on('error', e => {
        let msg = `Step3 Problem: ${e.message}`;
        console.error(msg);
    });

    req.end();
}

//
// Step 4: POST data to inquire.
//
/**
 * 截取某人的刷卡资料。
 * @param {*} beginDate 开始日期
 * @param {*} endDate 截止日期
 * @param {*} employeeIdOrName 工号或名字
 * @param {*} nextPage if go to next page
 * @param {*} nextStep 完成后调用此function
 */
function inquire(beginDate, endDate, employeeIdOrName, nextPage, nextStep) {

    function callback(response) {
        let chunks = [];
        response.addListener('data', (chunk) => {
            chunks.push(chunk);
        });
        response.on('end', () => {
            let buff = Buffer.concat(chunks);
            let html = buff.toString();
            if ( response.statusCode === 200 ) {
                let result = parseKQ(html);
                let fo = fs.createWriteStream(`tmp/step4-inquire-${employeeIdOrName}-${result.curPage}.html`);
                fo.write(html);
                fo.end();
                if ( result.curPage < result.numPages ) {
                    inquire(beginDate, endDate, employeeIdOrName, true, nextStep);
                } else {
                    console.log(`Inquiry about ${employeeIdOrName} is done.`);
                    if ( nextStep ) {   // If provided.
                        nextStep();
                    }
                }
            } else {
                console.error(`Inquiry HTTP error: ${response.statusMessage}`);
            }
        });
    }

    var beginTime = '0:00';
    var endTime = '23:59';

    let postObj = {
        'TQuarkScriptManager1': 'QueryResultUpdatePanel|QueryBtn',
        'TQuarkScriptManager1_HiddenField': ';;AjaxControlToolkit, Version=1.0.20229.20821, Culture=neutral, PublicKeyToken=28f01b0e84b6d53e:en-US:c5c982cc-4942-4683-9b48-c2c58277700f:411fea1c:865923e8;;AjaxControlToolkit, Version=1.0.20229.20821, Culture=neutral, PublicKeyToken=28f01b0e84b6d53e:en-US:c5c982cc-4942-4683-9b48-c2c58277700f:91bd373d:d7d5263e:f8df1b50;;AjaxControlToolkit, Version=1.0.20229.20821, Culture=neutral, PublicKeyToken=28f01b0e84b6d53e:en-US:c5c982cc-4942-4683-9b48-c2c58277700f:e7c87f07:bbfda34c:30a78ec5;;AjaxControlToolkit, Version=1.0.20229.20821, Culture=neutral, PublicKeyToken=28f01b0e84b6d53e:en-US:c5c982cc-4942-4683-9b48-c2c58277700f:9b7907bc:9349f837:d4245214;;AjaxControlToolkit, Version=1.0.20229.20821, Culture=neutral, PublicKeyToken=28f01b0e84b6d53e:en-US:c5c982cc-4942-4683-9b48-c2c58277700f:e3d6b3ac;',
        '__ctl07_Scroll': '0,0',
        '__VIEWSTATEGENERATOR': 'A21EDEFC',
        '_ASPNetRecycleSession': _ASPNetRecycleSession,
        '__VIEWSTATE': __VIEWSTATE,
        '_PageInstance': 26,
        '__EVENTVALIDATION': __EVENTVALIDATION,
        'AttNoNameCtrl1$InputTB': '上海欽江路',
        'BeginDateTB$Editor': beginDate,
        'BeginDateTB$_TimeEdit': beginTime,
        'EndDateTB$Editor': endDate,
        'EndDateTB$_TimeEdit': endTime,
        'EmpNoNameCtrl1$InputTB': employeeIdOrName
    };
    if ( nextPage ) {
        postObj['GridPageNavigator1$NextBtn'] = 'Next Page';
    } else {
        postObj['QueryBtn'] = 'Inquire';
    }

    let postData = querystring.stringify(postObj);

    let req = http.request({
        hostname: "twhratsql.whq.wistron",
        path: "/OGWeb/OGWebReport/EntryLogQueryForm.aspx",
        method: "POST",
        headers: {
            'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; MAARJS)',	// mimic IE 11 // important
            'X-MicrosoftAjax': 'Delta=true',    // important
            'Cookie': `ASP.NET_SessionId=${_ASPNET_SessionId}; OGWeb=${OGWeb}`,  // important
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, callback);

    req.on('error', e => {
        console.error(`Step4 Problem: ${e.message}`);
    });

    req.end(postData);
}

/**
 * Parse the input html to get 刷卡 data.
 * @param {*} html 
 * @return number of current page and number of total pages.
 */
function parseKQ(html) {
    // Get number of pages.
    let curPage = 1;
    let numPages = 1;
    let rexTotal = new RegExp('<span id="GridPageNavigator1_CurrentPageLB">(.*?)</span>[^]*?<span id="GridPageNavigator1_TotalPageLB">(.*?)</span>');
    let match = rexTotal.exec(html);
    if ( match ) {
        curPage = parseInt(match[1]);
        numPages = parseInt(match[2]);
        console.log(`Page: ${curPage} / ${numPages}`);
    }

    // Update __VIEWSTATE __EVENTVALIDATION
    let rexVS = new RegExp("__VIEWSTATE[\|](.*?)[\|]");
    let matVS = rexVS.exec(html);
    if ( matVS ) {
        __VIEWSTATE = matVS[1];
    }
    let rexEV = new RegExp("__EVENTVALIDATION[\|](.*?)[\|]");
    let matEV = rexEV.exec(html);
    if ( matEV ) {
        __EVENTVALIDATION = matEV[1];
    }

    // Print 刷卡 data
    console.log(`/Department  /EID  /Name  /Clock Time`);
    while (true) {
        let rex =  new RegExp('<td>(.*?)</td><td>&nbsp;</td><td><.*?>(.*?)</a></td><td>(.*?)</td><td>.*?</td><td>(.*?)</td>',
            'g');   // NOTE: 'g' is important
        let m = rex.exec(html);
        if (m) {
            let checkDatetime = moment(m[4], 'MM/DD/YYYY H:mm:ss');                         // 打卡时间
            let dateArr = checkDatetime.toArray();

            let thisDate = `${dateArr[0]}-${dateArr[1] + 1}-${dateArr[2]}`;
            let thisTime = `${dateArr[3]}:${dateArr[4]}:${dateArr[5]}`;
            let person = `${m[1]} ${m[2]} ${m[3]}`;
            
            if(!Arr[person]){
                Arr[person] = [];
            }
            if(!Arr[person][thisDate])
                Arr[person][thisDate] = [];
            Arr[person][thisDate].push(thisTime);

            console.log(`${m[1]} ${m[2]} ${m[3]} ${m[4]}`);
            html = html.substr(rex.lastIndex);
        } else {
			break;
		}
    }
    return {curPage: curPage, numPages: numPages};
}

function report(Arr, startDate, endDate) {
    const ARRIVETIME = "08:50:59";
    const LEAVETIME = "16:50:00";
    let dateArr = getdiffdate(startDate,endDate);
    for (let personnel in Arr) {
        
        let val = Arr[personnel];
        console.log(personnel);
        let table = [];
        dateArr.forEach(date => {

            let punchTimeArr;
            let exceptionStr = '';
            let checkInStr = null;
            let checkOutStr = null;
            if(val[date] != undefined)
                punchTimeArr = Array.from(val[date]);
            else{
                punchTimeArr =[];
            }
            let todayArriveDateTime = moment(`${date} ${ARRIVETIME}`, "YYYY-MM-DD HH:mm:ss");
            let todayLeaveDateTime = moment(`${date} ${LEAVETIME}`, "YYYY-MM-DD HH:mm:ss");

            if(punchTimeArr.length == 0 ){
                if(moment(todayArriveDateTime).weekday() <= 5 && moment(todayArriveDateTime).weekday() >= 1)
                    exceptionStr += "请假";
                else{
                    exceptionStr += "周末";
                }
            } else if (punchTimeArr.length == 1) {                  // 当日只有一次刷卡记录
                exceptionStr += "只刷一次 ";
                checkInStr = punchTimeArr[0];

            } else if(punchTimeArr.length >= 2){
                checkOutStr = punchTimeArr[0];
                checkInStr = punchTimeArr.pop();
                let checkOut = moment(date + ' ' + checkOutStr, "YYYY-MM-DD HH:mm:ss");
                let checkIn = moment(date + ' ' + checkInStr, "YYYY-MM-DD HH:mm:ss");

                if (checkIn.isAfter(todayArriveDateTime))           // 当日第一次刷卡晚于8:50
                    exceptionStr += "迟到 ";
                if (checkOut.isBefore(todayLeaveDateTime))          // 当日最后一次刷卡早于16:50
                    exceptionStr += "早退 ";
                if (checkOut.diff(checkIn, 'hours', true) < 9)      // 当日工作时间小于9小时
                    exceptionStr += "工时不足 ";
            }
            exceptionStr = (exceptionStr == '')?'正常':exceptionStr;
            table.push({ '日期' : date, '进入时间' : checkInStr, '离开时间': checkOutStr, '状态': exceptionStr });
        });
        console.table(table);
        console.log('\n');
    }
}

//获取两日期之间日期列表函数
function getdiffdate(startDate,endDate){
    //初始化日期列表，数组
    var diffdate = new Array();
    var i=0;
    let m_startDate = moment(startDate,'YYYY-MM-DD');
    let m_endDate = moment(endDate,'YYYY-MM-DD');

    while(m_startDate.isBefore(m_endDate)){
        diffdate[i] = moment(m_startDate).format('YYYY-M-D');
        m_startDate = moment(m_startDate).add(1, 'days');
        i++;
    }
    diffdate[i] = moment(m_endDate).format('YYYY-M-D');
    return diffdate;
}

function askAll() {
    let startDate = '2021-01-01';
    let endDate = moment().format('YYYY-MM-DD');
    inquire(startDate, endDate, 'Ce Xian', false,
    ()=> inquire(startDate, endDate, 'Jack QP Zhang', false,
    ()=> inquire(startDate, endDate, 'Lance Li', false,
    ()=> inquire(startDate, endDate, 'Anne SQ Liu', false,
    ()=> inquire(startDate, endDate, 'Carlos Jiang', false,
    ()=> inquire(startDate, endDate, 'Xuqian Hu', false,
    ()=> inquire(startDate, endDate, 'Joy Yang', false,
    function() { console.log("All done."); report(Arr,startDate,endDate); } )))))));
}

openLoginPage();    // Where it all begins.
