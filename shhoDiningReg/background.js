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

/*Background script runs from here */

console.log("Background runs!");
 
/* Add listener to every tabs */ 
chrome.tabs.onUpdated.addListener(checkForValidPage);

/* Declare to-reg array to do record while registering */
var to_reg = new Array();

/* retrieve the dining event list */
var diningList={}; 
diningList.error="No data Found!" //Default text to display if no dining event found in page

/* Add an message listener to handle all the messages from both content script and popup */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if (request.type=="GotDiningList") { 	//{type:"GotDiningList", dlist:arr, page:pagenum}
		console.log("Background received GotDiningList message");
		diningList = request; 
	}
	
	if (request.type=="DoReg") { 	//{type:"DoReg", chklist:getchklist(), page:data.page}
		/* Add items into to-reg array */
		console.log("Background receiving to reg list");
		console.log("Page:"+request.page+" Indexed:"+request.chklist);
		//Convert page and chklist into array with value page*100+chklist[i]
		var page=request.page;
		var chklist=request.chklist;
		for (var i=0;i<chklist.length;i++) {
			var newindex = parseInt(page*100)+parseInt(chklist[i]);
			if (to_reg.indexOf(newindex)== -1) to_reg.push(newindex);
			console.log("Pushed "+newindex+" into ro-reg array");
		}
		doReg(); //Proceed to registration
	}
	
	if (request.type=="GetNextReg") {
		console.log("Listener catch getnextreg event, and to_reg is: "+to_reg);
		sendResponse({'nextone':to_reg[to_reg.length-1]});
	}
	
	if (request.type=="RegSucceed") {
		console.log("Received succeed message. Delete first to_reg item: "+to_reg[to_reg.length-1]);
		to_reg.pop();
		sendResponse({'confirmed':true});
		if (to_reg.length == 0) alert("All done! Congratulations.");
	}
});


/*
 * Functions declaration field
 *
 */

function getDomainFromUrl(url){
     var host = "null";
     if(typeof url == "undefined" || null == url)
          url = window.location.href;
     var regex = /.*\:\/\/([^\/]*).*/;
     var match = url.match(regex);
     if(typeof match != "undefined" && null != match)
          host = match[1];
     return host;
}

/* show pageAction level icon if the page is in specific url */
function checkForValidPage(tabId, changeInfo, tab) {
     if (getDomainFromUrl(tab.url).toLowerCase()=="cloud.itsc.cuhk.edu.hk"){
			console.log("In itsc cloud page, show icon.");
			chrome.pageAction.show(tabId);
     }
}

/* The core function. Process registration. */
function doReg() {
	/* read dining list from to-reg array */
	var item = to_reg[to_reg.length-1];
	chrome.tabs.query({url:'*://cloud.itsc.cuhk.edu.hk/*'}, function(tabs){
		var message = {type:"BeginReg", index:item};
		for (var i=0; i<tabs.length; ++i) {
			chrome.tabs.sendMessage(tabs[i].id, message);
		}  
	});
}
