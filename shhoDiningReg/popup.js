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

/* Javascript for popup.html
 * Only communicate with background script */

/*Get check items from the page and return a array */
function getchklist(){
	console.log("Function getchklist() got called");
	var indexes = new Array();
	var i=0;
	$(":checked").each(function(){indexes[i]=this.id;i++});
	return indexes;
} 


/*Send stats information to server*/
function stats_send(info) {
	console.log("Sending stats info");
	var events_str = '';
	//Join event date (31-Mar) to a string
	for (var i in info) {
		events_str = events_str+dlist[i].substr(0,6)+',';
	}
	$("#stats").append("<img src='http://127.0.0.1/stats.php?count="+info.length+"&events="+events_str+"' style='display:none'>");
}
 
/*The function when register button clicked*/
function doRegister(){
	console.log("Register button clicked");
	var checked = getchklist();
	stats_send(checked);
	chrome.runtime.sendMessage({type:"DoReg", chklist:checked, page:data.page});
}


/*Load popup window*/
document.addEventListener('DOMContentLoaded', function () {
	 //get diningList variable from background script
	data = chrome.extension.getBackgroundPage().diningList; //{type:"GotDiningList", dlist:arr, page:pagenum}
	if(data.error){	
		$("#message").text(data.error);
		$("#content").hide();
		$("#btn").hide();
	}
	else if(data==undefined){
		$("#message").text("Error occurred! Please contact developer");
		$("#content").hide();
		$("#btn").hide();
	}
	else{
		console.log("Adding list to page...");
		//$("#message").hide();
		var table = $('#tbl');
		dlist=data.dlist;
		//dlist[id] is the text of specific dining event
		//ct102+id is the identifier of dining event, start from ct102 to ct(102+len(dlist)-1), we go through them.
		for (id=0,listcnt=dlist.length;id<listcnt;id++){
			table.append(
				$('<tr/>').append(
					$('<td/>').append(
						$('<input/>', { type: 'checkbox', id: id, value: 'ct'+(102+id), checked:"checked" })
					)
					.append(
						$('<lable/>', {'for': id, text: dlist[id]})
					)
				)
			)
		}
		//add page number at the low-left corner
		$("#page").text('Page ' + data.page);
	}
	/*Add event listener to the register button*/
	buttonobj = document.getElementById("regbtn");
    if(buttonobj.addEventListener){
         buttonobj.addEventListener("click", doRegister);
    }
});