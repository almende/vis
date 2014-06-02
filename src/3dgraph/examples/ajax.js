

/**
 * @class Ajax
 * 
 * Perform asynchronous call to the server.
 * 
 * documentation:
 * http://ajaxpatterns.org/HTTP_Streaming
 * http://ajaxpatterns.org/XMLHttpRequest_Call
 * http://www.skill-guru.com/blog/2011/02/04/adding-access-control-allow-origin-to-server-for-cross-domain-scripting/
 * 
 * @author Jos de Jong, Almende, 2011
 */ 
var Ajax = function() { 
  this.isBusy = true; 
  this.timer = undefined;
  this.req = undefined;
  this.callback = undefined;

  // for long poll
  this.pollCallback = undefined;
  this.pollInterval = 1000; // milliseconds
  this.lastResponseLength = 0;
}

/**
 * Make a request
 * @param {string} method    The call method: typically "GET" or "POST"
 * @param {string} url       The url to be called, for example "mydata.php"
 * @param {method} callback  The callback method, which will be called when
 *                           the response is received. The response is passed
 *                           as a plain text (string) parameter to this method:
 *                              callback(response);
 */ 
Ajax.prototype.request = function(method, url, callback) 
{ 
  var me = this;

  this.isBusy = true; 
  this.callback = callback; 
  this.req = (XMLHttpRequest)? new XMLHttpRequest(): new ActiveXObject("MSXML2.XMLHTTP"); 
  this.req.onreadystatechange = function() { me._checkReadyState(); }; 
  this.req.open(method, url, true); 
  this.req.send(null); 
} 

/**
 * Make a  long poll request.
 * This poll can be stopped via Ajax.abort();
 * @param {string} method    The call method: typically "GET" or "POST"
 * @param {string} url       The url to be called, for example "mydata.php"
 * @param {method} callback  The callback method, which will be called 
 *                           repeatedly, each time that new data is received.
 *                           The newly received data is passed
 *                           as a plain text (string) parameter to this method:
 *                              callback(response);
 */ 
Ajax.prototype.requestLongPoll = function(method, url, callback) 
{ 
  this.request(method, url);

  var me = this;
  this.pollCallback = callback;
  this.lastResponseLength = 0;
  this.timer = setInterval(function() {me._checkResponse();}, this.pollInterval);
} 

/**
 * Cancel a current request
 */ 
Ajax.prototype.abort = function() {
  this.isBusy = false; 
  if (this.timer) {
    clearInterval(this.timer)
    this.timer = undefined;
  }
  
  if (this.req) {
    this.req.abort();
    this.req = undefined;
  }
}

/**
 * The callback method which is called when a response is received.
 */ 
Ajax.prototype._checkReadyState = function() 
{ 
  switch(this.req.readyState) 
  { 
    case 1: break; 
    case 2: break; 
    case 3: break; 
    case 4: 
      if (this.callback) {
        this.callback(this.req.responseText); 
      }

      // reset all variables
      this.abort();
  } 
} 


/**
 * Callback function executed repeatedly during a long poll. 
 * The currently received response data is checked, and all new data is passed
 * to the callback function.
 */
Ajax.prototype._checkResponse = function() {
  var len = this.req.responseText.length;

  if (len > this.lastResponseLength) {
    var newData = this.req.responseText.substring(this.lastResponseLength);

    // TODO: clear the current responseText here, to prevent the response
    // from growing infinitely?

    if (this.pollCallback) {
      this.pollCallback(newData);
    }

    this.lastResponseLength = len;
  }
}

/**
 * Set the interval for long polling
 * @param {number} interval     Interval in milliseconds
 */ 
Ajax.prototype.setPollInterval = function(interval) {
  this.pollInterval = interval;
}

/**
 * get the poll interval
 */ 
Ajax.prototype.getPollInterval = function() {
  return this.pollInterval;
}
