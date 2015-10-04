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

/* Background script runs from here */

console.log("Background runs!");

/* Remainder */
setReminder();

/* Add listener to every tabs */ 
chrome.tabs.onUpdated.addListener(checkForValidPage);

/* Declare to-reg array to do record while registering */
var to_reg = new Array();

/* retrieve the dining event list */
var diningList={}; 
diningList.error="No data Found!" //Default text to display if no dining event found in page

/* for items on other pages loaded */
var new_loaded={}; //{ready:true, lists:[{dlist:arr,page:pagenum},{dlist:arr,page:pagenum}]}

/* Add an message listener to handle all the messages from both content script and popup */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if (request.type=="GotDiningList") { 	//{type:"GotDiningList", dlist:arr, page:pagenum, name=username}
		console.log("Background received GotDiningList message");
		diningList = request; 
	}

	if (request.type=="LoadPages") {     //{type:"LoadPages", loaded:bool, page:currentpage, newitems:arr}
		console.log("Background received LoadPages message");
		if (!request.loaded) {
			/* Call content script for loading next pages */
			console.log("Loading pages...")
			for (var p=1;p<=maxpage;p++) {
				doPageLoad(page); /*	TODO  
				(send message to content script, 
				then content script redirect to "page"
				and send list back,
				*/
			}
			new_loaded.ready = true;
		}
		if (request.loaded) {
			console.log("Page "+request.page+" loaded, storing items in new_loaded");
			new_loaded.lists[request.page-1] = {dlist:request.newitems,page:request.page};
		}
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
		if (to_reg.length == 0) {
			chrome.storage.sync.set({'regged':true},function(){
				console.log("set regged to storage");
				alert("All finished!");
			});
		}
		
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


/*Reminder function. 
 *Remote date are start,ddl,end.
 *start: reg-open-day  ddl: last-all-available-day  end: reg-closed-day.
 *Remind interval depends on before/after ddl.
 */
function remindProcess(local,update) {
	startDate = new Date(update.start); 
	ddlDate = new Date(update.ddl);
	endDate = new Date(update.end)
	curDate = new Date();
	
	if (curDate < startDate || curDate >= endDate) return;
	
	//Remote updated
	if (update.start != local.newest) {
		chrome.storage.sync.remove(['regged','lastremind','newest'],function(){
			console.log('Remote updated to ' + update.start);
			chrome.storage.sync.set({'newest':update.start});
			doRemind('New dining events available. \nDo you want to register now?');
		});
		return;
	}
	
	//Remote not updated: check interval
	if (lastrem = local.lastremind) {
		diffsec = curDate-new Date(lastrem);
		diffday = diffsec / (1000*60*60*24);
		console.log("diff day = "+diffday);
	}
	
	if (!local.regged && curDate > startDate) {
		if (curDate < ddlDate && diffday >=7) {
			doRemind('You haven\'t registered new dinings yet.\nDo you want to register now?');
		}
		else if (curDate > ddlDate && diffday >= 5) {
			doRemind('It\s time to register this month\'s dinings.\nDo it now?',true);
		}
	}
}	


//Get reg-date and set reminder
function setReminder() {
	//Check reminder switch status
	chrome.storage.sync.get('reminder',function(result) {
		if (result.reminder == 'off') {
			console.log("Reminder OFF")
		}
		else {
			console.log("Reminder ON, prepare to remind");
			chrome.storage.sync.get(['regged','lastremind','newest'],function(result){
				//Get reg-date update from remote server
				$.get('http://cuhk.me/update.php?fetch=1', function(update) {
					remindProcess(result,update);
				}, 'json');
			});
		}
	});
}

function doRemind(words,offmsg) {
	ans = confirm(words);
	chrome.storage.sync.set({'lastremind':Date()});
	if (ans) {
		chrome.tabs.create({ url: "https://cloud.itsc.cuhk.edu.hk/wrs/public/Login.aspx?AppID=23" });
	}
	if (ans == false && offmsg == true) {
		go_option = confirm("If you NEVER want reminder again, you can switch it off in option page.\nOpen option page now?");
		if (go_option) chrome.tabs.create({url:'chrome://extensions/?options='+chrome.runtime.id});
	}
}
