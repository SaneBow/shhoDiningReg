// Saves options to chrome.storage.sync.
function save_options() {
  var switchOn = document.getElementById('switch').checked;
  var switchStatus = switchOn ? 'on' : 'off';
  chrome.storage.sync.set({
    reminder: switchStatus
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({reminder:'on'}, function(r) {
    document.getElementById('switch').checked = (r.reminder == 'on');
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',save_options);