/*! The MIT License (MIT)
 *
 *Copyright (c) [2014] [WANG Xianbo]
 *
 *Permission is hereby granted, free of charge, to any person obtaining a copy
 *of this software and associated documentation files (the "Software"), to deal
 *in the Software without restriction, including without limitation the rights
 *to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *copies of the Software, and to permit persons to whom the Software is
 *furnished to do so, subject to the following conditions:
 *
 *The above copyright notice and this permission notice shall be included in all
 *copies or substantial portions of the Software.
 *
 *THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *SOFTWARE.
 * 
 */

/* Script for content page (page in browser)
 * Only communicate with background page */

var imgsrc = $("#ctl00_imgAppBanner").prop("src");
var pagenum = getPage();
var username = getName();

if (imgsrc && imgsrc.indexOf("23.jpg") > 0) {
    /* On the first-step page */
    var links = $("#ctl00_ContentPlaceHolder1_gvEventList").find(".textwrap").find("a");
    if (links.length != 0) {
        console.log("It's on the first-step page");
        getNextReg();
    }
    /* On the second page */
    var btnReg = $("#ctl00_ContentPlaceHolder1_btnRegister");
    if (btnReg.length == 1) {
        console.log("It's on the second-step page");
        secondStep();
    }
    /* On the third page */
    var btnNext = $("#ctl00_ContentPlaceHolder1_btnNext");
    if (btnNext.length == 1) {
        console.log("It's on the third-step page");
        thirdStep();
    }
    /* On the fourth page */
    var btnHome = $("#ctl00_ContentPlaceHolder1_btnHome");
    if (btnHome.length == 1) {
        console.log("It's on the last-step page");
        lastStep();
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendRequest) {
    if (request.type == "BeginReg") {      //{type:"BeginReg", index:item}
        var index = request.index;
        console.log("Begin reg process, start with item: " + index);
        firstStep(index);
    }
});

/* Get current page number */
function getPage() {
    var pagenum = $("[style='color:#507CD1;background-color:White;']").find("span").text();
	if (!pagenum) pagenum = 1;
    return pagenum;
}

/* Get user name, to prevent duplicate stats */
function getName() {
	var username = $("#ctl00_lblHelloMsg").text().substr(9);
	return username;
}

/* Inject code into the original page */
function injectCode(code) {
    var actualCode = code;
    var script = document.createElement('script');
    script.textContent = actualCode;
    (document.head || document.documentElement).appendChild(script);
}

function firstStep(index) {
    var page = Math.floor(index / 100);
    if (page != pagenum) {
        console.log("current at page "+pagenum+", redirect to page "+page);
        injectCode("__doPostBack('ctl00$ContentPlaceHolder1$gvEventList','Page$"+page+"')");
    }
    else {
        console.log("Do first step clicking");
        injectCode("__doPostBack('ctl00$ContentPlaceHolder1$gvEventList$ctl"+(index+2).toString().substring(1,3)+"$lnkWorkshop','')");
    }
}

function secondStep() {
	if ($("#ctl00_ContentPlaceHolder1_lblPageMsg").text() == "You have already registered this class.") {
		console.log("Already registered. Stop at second step.");
		chrome.runtime.sendMessage({type:"RegSucceed"},function(response) {
			if (response.confirmed == true) {
				console.log("btnBack clicked");
				injectCode('document.getElementById("ctl00_ContentPlaceHolder1_btnBack").click()');
			}
		});
	}
	else {
		console.log("btnRegister clicked");
		injectCode('document.getElementById("ctl00_ContentPlaceHolder1_btnRegister").click()');
	}
}

function thirdStep() {
    console.log("btnNext clicked");
	/* This part of code use the brilliant idea from https://github.com/sheepfriend/reg_dining_javascript */
    injectCode(['temp=document.getElementById("ctl00_ContentPlaceHolder1_btnCancel");',
				'temp.id="ctl00_ContentPlaceHolder1_btnNext";',
				'temp.name="ctl00$ContentPlaceHolder1$btnNext";',
				'temp.click();'].join('\n'));	
}

function lastStep() {
    console.log("Reg done. Send success message to background...");
    chrome.runtime.sendMessage({type:"RegSucceed"},function(response) {
        if (response.confirmed == true) {
            console.log("btnHome clicked");
            injectCode('document.getElementById("ctl00_ContentPlaceHolder1_btnHome").click()');
		}
    });
}

function getNextReg() {
    var nextone = "Error";
    chrome.runtime.sendMessage({type:"GetNextReg"},function(response) {
        nextone = response.nextone;
        console.log("Response of next reg item: " + nextone);
        /* If to-reg list is empty */
        if (nextone == undefined) {
            console.log("Reg has never begun. Sending dining list to background...");
            var arr = new Array();
            for (var i=0;i<links.length;i++) {
                arr[i]=links[i].text;
            }
            console.log("current at page " + pagenum);
            chrome.runtime.sendMessage({type:"GotDiningList", dlist:arr, page:pagenum, name:username});
        }
        /* If error */
        else if (nextone == "Error") {
            console.log("Error occurred when getting next item!!!");
        }
        /* If to-reg list is not empty */
        else {
            console.log("In reg process...Do next reg: " + nextone);
            firstStep(nextone);
        }
        
        return nextone;
    });
}