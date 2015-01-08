'use strict';

if (typeof window === 'undefined') {
  var eve = require('evejs');
  var GenericAgent = require('./GenericAgent')
}

function EventGenerator(id) {
  // execute super constructor
  eve.Agent.call(this, id);
  this.rpc = this.loadModule('rpc', this.rpcFunctions);
  this.connect(eve.system.transports.getAll());
  this.eventCounter = 0;
  this.events = [
    {
      "jobId": "100",
      "time": "2014-09-16T09:25:00.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "7",
      "operation": "start"
    },
    {
      "jobId": "101",
      "time": "2014-09-16T09:25:00.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "7",
      "operation": "start"
    },
    {
      "jobId": "101",
      "time": "2014-09-16T10:49:03.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "7",
      "operation": "finish"
    },
    {
      "jobId": "102",
      "time": "2014-09-16T10:52:13.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "7",
      "operation": "start"
    },
    {
      "jobId": "999",
      "time": "2014-09-16T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-17T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "81",
      "time": "2014-09-17T09:23:00.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "82",
      "time": "2014-09-17T09:23:00.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "111",
      "time": "2014-09-17T09:25:00.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "8",
      "operation": "start"
    },
    {
      "jobId": "112",
      "time": "2014-09-17T09:25:00.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "8",
      "operation": "start"
    },
    {
      "jobId": "82",
      "time": "2014-09-17T10:29:03.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "83",
      "time": "2014-09-17T10:32:12.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "112",
      "time": "2014-09-17T11:16:03.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "8",
      "operation": "finish"
    },
    {
      "jobId": "113",
      "time": "2014-09-17T11:18:03.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "8",
      "operation": "start"
    },
    {
      "jobId": "113",
      "time": "2014-09-17T11:23:56.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "8",
      "operation": "pause"
    },
    {
      "jobId": "114",
      "time": "2014-09-17T11:23:56.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "8",
      "operation": "start"
    },
    {
      "jobId": "114",
      "time": "2014-09-17T11:28:16.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "8",
      "operation": "finish"
    },
    {
      "jobId": "115",
      "time": "2014-09-17T11:28:19.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "8",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "115",
      "time": "2014-09-17T11:43:21.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "8",
      "operation": "finish"
    },
    {
      "jobId": "113",
      "time": "2014-09-17T11:44:21.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "8",
      "operation": "resume"
    },
    {
      "jobId": "102",
      "time": "2014-09-17T12:14:39.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "7",
      "operation": "finish"
    },
    {
      "jobId": "103",
      "time": "2014-09-17T12:14:42.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "7",
      "operation": "start"
    },
    {
      "jobId": "103",
      "time": "2014-09-17T12:24:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "7",
      "operation": "finish"
    },
    {
      "jobId": "104",
      "time": "2014-09-17T12:24:45.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "7",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "104",
      "time": "2014-09-17T14:40:01.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "7",
      "operation": "finish"
    },
    {
      "jobId": "105",
      "time": "2014-09-17T14:41:01.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "7",
      "operation": "start"
    },
    {
      "jobId": "105",
      "time": "2014-09-17T15:12:12.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "7",
      "operation": "finish"
    },
    {
      "jobId": "100",
      "time": "2014-09-17T15:12:12.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "7",
      "operation": "finish"
    },
    {
      "jobId": "83",
      "time": "2014-09-17T15:45:21.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "6",
      "operation": "pause"
    },
    {
      "jobId": "84",
      "time": "2014-09-17T15:45:21.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "84",
      "time": "2014-09-17T15:55:11.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "85",
      "time": "2014-09-17T15:58:11.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "6",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "85",
      "time": "2014-09-17T16:11:12.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "86",
      "time": "2014-09-17T16:11:12.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to station",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "86",
      "time": "2014-09-17T16:51:12.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to station",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "87",
      "time": "2014-09-17T16:52:12.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Discuss potential NC",
      "productId": "6",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Marcelo"
        }
      ]
    },
    {
      "jobId": "87",
      "time": "2014-09-17T17:12:12.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Discuss potential NC",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "88",
      "time": "2014-09-17T17:12:12.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to NC meeting",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "89",
      "time": "2014-09-17T17:12:12.000+02:00",
      "performedBy": "Giovanni",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "90",
      "time": "2014-09-17T17:12:12.000+02:00",
      "performedBy": "Cristiana",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "91",
      "time": "2014-09-17T17:12:12.000+02:00",
      "performedBy": "Claudio",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "999",
      "time": "2014-09-17T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-18T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "41",
      "time": "2014-09-18T09:25:00.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "5",
      "operation": "start"
    },
    {
      "jobId": "42",
      "time": "2014-09-18T09:25:00.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "5",
      "operation": "start"
    },
    {
      "jobId": "42",
      "time": "2014-09-18T10:49:03.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "5",
      "operation": "finish"
    },
    {
      "jobId": "43",
      "time": "2014-09-18T10:52:13.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "5",
      "operation": "start"
    },
    {
      "jobId": "113",
      "time": "2014-09-18T12:10:29.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "8",
      "operation": "finish"
    },
    {
      "jobId": "116",
      "time": "2014-09-18T12:10:29.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "8",
      "operation": "start"
    },
    {
      "jobId": "116",
      "time": "2014-09-18T12:28:29.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "8",
      "operation": "finish"
    },
    {
      "jobId": "117",
      "time": "2014-09-18T12:35:29.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "8",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "117",
      "time": "2014-09-18T15:12:01.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "8",
      "operation": "finish"
    },
    {
      "jobId": "118",
      "time": "2014-09-18T15:14:01.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "8",
      "operation": "start"
    },
    {
      "jobId": "118",
      "time": "2014-09-18T15:31:01.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "8",
      "operation": "finish"
    },
    {
      "jobId": "111",
      "time": "2014-09-18T15:31:01.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "8",
      "operation": "finish"
    },
    {
      "jobId": "999",
      "time": "2014-09-18T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-19T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "88",
      "time": "2014-09-19T09:56:00.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to NC meeting",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "89",
      "time": "2014-09-19T09:56:00.000+02:00",
      "performedBy": "Giovanni",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "90",
      "time": "2014-09-19T09:56:00.000+02:00",
      "performedBy": "Cristiana",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "91",
      "time": "2014-09-19T09:56:00.000+02:00",
      "performedBy": "Claudio",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "92",
      "time": "2014-09-19T10:01:00.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "NC Meeting",
      "productId": "6",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "93",
      "time": "2014-09-19T10:01:00.000+02:00",
      "performedBy": "Giovanni",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "6",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "94",
      "time": "2014-09-19T10:01:00.000+02:00",
      "performedBy": "Cristiana",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "6",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "95",
      "time": "2014-09-19T10:01:00.000+02:00",
      "performedBy": "Claudio",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "6",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "44",
      "time": "2014-09-19T12:10:32.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "5",
      "operation": "start"
    },
    {
      "jobId": "43",
      "time": "2014-09-19T12:10:39.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "5",
      "operation": "finish"
    },
    {
      "jobId": "44",
      "time": "2014-09-19T12:24:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "5",
      "operation": "finish"
    },
    {
      "jobId": "45",
      "time": "2014-09-19T12:24:45.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "5",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "92",
      "time": "2014-09-19T13:14:00.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "NC Meeting",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "93",
      "time": "2014-09-19T13:14:00.000+02:00",
      "performedBy": "Giovanni",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "94",
      "time": "2014-09-19T13:14:00.000+02:00",
      "performedBy": "Cristiana",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "95",
      "time": "2014-09-19T13:14:00.000+02:00",
      "performedBy": "Claudio",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "45",
      "time": "2014-09-19T14:43:01.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "5",
      "operation": "finish"
    },
    {
      "jobId": "46",
      "time": "2014-09-19T14:43:01.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "5",
      "operation": "start"
    },
    {
      "jobId": "46",
      "time": "2014-09-19T14:59:12.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "5",
      "operation": "finish"
    },
    {
      "jobId": "41",
      "time": "2014-09-19T14:59:12.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "5",
      "operation": "finish"
    },
    {
      "jobId": "999",
      "time": "2014-09-19T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-22T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "83",
      "time": "2014-09-22T09:04:39.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "6",
      "operation": "resume"
    },
    {
      "jobId": "31",
      "time": "2014-09-22T09:08:00.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "3",
      "operation": "start"
    },
    {
      "jobId": "32",
      "time": "2014-09-22T09:08:00.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "3",
      "operation": "start"
    },
    {
      "jobId": "32",
      "time": "2014-09-22T10:36:03.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "3",
      "operation": "finish"
    },
    {
      "jobId": "33",
      "time": "2014-09-22T10:38:32.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "3",
      "operation": "start"
    },
    {
      "jobId": "83",
      "time": "2014-09-22T14:42:39.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "96",
      "time": "2014-09-22T14:42:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "96",
      "time": "2014-09-22T14:52:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "97",
      "time": "2014-09-22T14:54:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "6",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "97",
      "time": "2014-09-22T17:27:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "98",
      "time": "2014-09-22T17:29:39.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "6",
      "operation": "start"
    },
    {
      "jobId": "98",
      "time": "2014-09-22T17:47:39.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "81",
      "time": "2014-09-22T17:47:39.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "6",
      "operation": "finish"
    },
    {
      "jobId": "999",
      "time": "2014-09-22T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-23T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "51",
      "time": "2014-09-23T09:25:00.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "52",
      "time": "2014-09-23T09:25:00.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "52",
      "time": "2014-09-23T10:49:03.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "53",
      "time": "2014-09-23T10:52:13.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "53",
      "time": "2014-09-23T11:45:21.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "4",
      "operation": "pause"
    },
    {
      "jobId": "54",
      "time": "2014-09-23T11:45:21.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "54",
      "time": "2014-09-23T12:03:21.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "55",
      "time": "2014-09-23T12:03:56.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "4",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "55",
      "time": "2014-09-23T14:01:02.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "56",
      "time": "2014-09-23T14:01:02.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to station",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "33",
      "time": "2014-09-23T14:10:29.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "3",
      "operation": "finish"
    },
    {
      "jobId": "34",
      "time": "2014-09-23T14:10:29.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "3",
      "operation": "start"
    },
    {
      "jobId": "34",
      "time": "2014-09-23T14:12:29.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "3",
      "operation": "finish"
    },
    {
      "jobId": "35",
      "time": "2014-09-23T14:12:34.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "3",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "56",
      "time": "2014-09-23T14:25:12.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to station",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "57",
      "time": "2014-09-23T14:25:32.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Discuss potential NC",
      "productId": "4",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Marcelo"
        }
      ]
    },
    {
      "jobId": "57",
      "time": "2014-09-23T15:05:12.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Discuss potential NC",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "58",
      "time": "2014-09-23T15:05:15.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "59",
      "time": "2014-09-23T15:05:15.000+02:00",
      "performedBy": "Pascale",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "60",
      "time": "2014-09-23T15:05:15.000+02:00",
      "performedBy": "Giovanni",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "61",
      "time": "2014-09-23T15:05:15.000+02:00",
      "performedBy": "Cristiana",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "62",
      "time": "2014-09-23T15:05:15.000+02:00",
      "performedBy": "Claudio",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "35",
      "time": "2014-09-23T15:32:01.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "3",
      "operation": "finish"
    },
    {
      "jobId": "36",
      "time": "2014-09-23T15:32:01.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "3",
      "operation": "start"
    },
    {
      "jobId": "36",
      "time": "2014-09-23T15:49:12.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "3",
      "operation": "finish"
    },
    {
      "jobId": "31",
      "time": "2014-09-23T15:49:12.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "3",
      "operation": "finish"
    },
    {
      "jobId": "999",
      "time": "2014-09-23T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-24T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "21",
      "time": "2014-09-24T09:08:00.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "2",
      "operation": "start"
    },
    {
      "jobId": "22",
      "time": "2014-09-24T09:08:00.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "2",
      "operation": "start"
    },
    {
      "jobId": "22",
      "time": "2014-09-24T10:36:03.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "2",
      "operation": "finish"
    },
    {
      "jobId": "23",
      "time": "2014-09-24T10:38:32.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "2",
      "operation": "start"
    },
    {
      "jobId": "23",
      "time": "2014-09-24T11:03:56.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "2",
      "operation": "pause"
    },
    {
      "jobId": "24",
      "time": "2014-09-24T11:03:56.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "2",
      "operation": "start"
    },
    {
      "jobId": "24",
      "time": "2014-09-24T11:28:16.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "2",
      "operation": "finish"
    },
    {
      "jobId": "25",
      "time": "2014-09-24T11:28:19.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "2",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "25",
      "time": "2014-09-24T11:35:21.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "2",
      "operation": "finish"
    },
    {
      "jobId": "23",
      "time": "2014-09-24T11:35:21.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "2",
      "operation": "resume"
    },
    {
      "jobId": "61",
      "time": "2014-09-24T15:51:00.000+02:00",
      "performedBy": "Cristiana",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "62",
      "time": "2014-09-24T15:56:00.000+02:00",
      "performedBy": "Claudio",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "58",
      "time": "2014-09-24T15:57:00.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "59",
      "time": "2014-09-24T15:58:00.000+02:00",
      "performedBy": "Pascale",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "60",
      "time": "2014-09-24T15:59:00.000+02:00",
      "performedBy": "Giovanni",
      "type": "mt",
      "assignment": "Go to NC meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "64",
      "time": "2014-09-24T16:00:01.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "65",
      "time": "2014-09-24T16:00:01.000+02:00",
      "performedBy": "Pascale",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "66",
      "time": "2014-09-24T16:00:01.000+02:00",
      "performedBy": "Giovanni",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "67",
      "time": "2014-09-24T16:00:01.000+02:00",
      "performedBy": "Cristiana",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "68",
      "time": "2014-09-24T16:00:01.000+02:00",
      "performedBy": "Claudio",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to NC meeting"
        }
      ]
    },
    {
      "jobId": "66",
      "time": "2014-09-24T17:24:30.000+02:00",
      "performedBy": "Giovanni",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "67",
      "time": "2014-09-24T17:24:30.000+02:00",
      "performedBy": "Cristiana",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "64",
      "time": "2014-09-24T17:49:30.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "65",
      "time": "2014-09-24T17:49:30.000+02:00",
      "performedBy": "Pascale",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "68",
      "time": "2014-09-24T17:49:30.000+02:00",
      "performedBy": "Claudio",
      "type": "mt",
      "assignment": "NC Meeting",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "999",
      "time": "2014-09-24T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-25T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "1",
      "time": "2014-09-25T09:05:23.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "1",
      "operation": "start"
    },
    {
      "jobId": "2",
      "time": "2014-09-25T09:05:23.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "1",
      "operation": "start"
    },
    {
      "jobId": "2",
      "time": "2014-09-25T10:44:23.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Kitting Coffeemaker",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "3",
      "time": "2014-09-25T10:44:56.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "1",
      "operation": "start"
    },
    {
      "jobId": "23",
      "time": "2014-09-25T13:10:29.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "2",
      "operation": "finish"
    },
    {
      "jobId": "28",
      "time": "2014-09-25T13:10:29.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "2",
      "operation": "start"
    },
    {
      "jobId": "28",
      "time": "2014-09-25T13:12:29.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "2",
      "operation": "finish"
    },
    {
      "jobId": "26",
      "time": "2014-09-25T13:12:32.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "2",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "3",
      "time": "2014-09-25T13:45:21.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "1",
      "operation": "pause"
    },
    {
      "jobId": "4",
      "time": "2014-09-25T13:45:21.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "1",
      "operation": "start"
    },
    {
      "jobId": "26",
      "time": "2014-09-25T13:47:37.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "2",
      "operation": "pause",
      "prerequisites": [
        {
          "type": "Inspect potential NC",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "4",
      "time": "2014-09-25T13:54:02.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "5",
      "time": "2014-09-25T13:54:03.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "1",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "5",
      "time": "2014-09-25T14:01:02.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "3",
      "time": "2014-09-25T14:01:23.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "1",
      "operation": "resume"
    },
    {
      "jobId": "26",
      "time": "2014-09-25T14:12:02.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "2",
      "operation": "resume"
    },
    {
      "jobId": "26",
      "time": "2014-09-25T14:32:01.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "2",
      "operation": "finish"
    },
    {
      "jobId": "27",
      "time": "2014-09-25T14:32:01.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "2",
      "operation": "start"
    },
    {
      "jobId": "27",
      "time": "2014-09-25T14:49:12.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "2",
      "operation": "finish"
    },
    {
      "jobId": "21",
      "time": "2014-09-25T14:49:12.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "2",
      "operation": "finish"
    },
    {
      "jobId": "999",
      "time": "2014-09-25T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-26T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "53",
      "time": "2014-09-26T09:10:39.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "4",
      "operation": "resume"
    },
    {
      "jobId": "3",
      "time": "2014-09-26T10:13:49.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "1",
      "operation": "pause"
    },
    {
      "jobId": "6",
      "time": "2014-09-26T10:13:49.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "1",
      "operation": "start"
    },
    {
      "jobId": "6",
      "time": "2014-09-26T10:25:23.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "7",
      "time": "2014-09-26T10:25:24.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "1",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "7",
      "time": "2014-09-26T10:32:42.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect potential NC",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "9",
      "time": "2014-09-26T10:32:42.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to station",
      "productId": "1",
      "operation": "start"
    },
    {
      "jobId": "9",
      "time": "2014-09-26T10:58:32.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Go to station",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "10",
      "time": "2014-09-26T10:58:33.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Discuss potential NC",
      "productId": "1",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Marcelo"
        }
      ]
    },
    {
      "jobId": "10",
      "time": "2014-09-26T11:05:12.000+02:00",
      "performedBy": "Marcelo",
      "type": "pm",
      "assignment": "Discuss potential NC",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "11",
      "time": "2014-09-26T11:05:12.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Organise drilling rework",
      "productId": "1",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Discuss potential NC"
        }
      ]
    },
    {
      "jobId": "11",
      "time": "2014-09-26T13:25:18.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Organise drilling rework",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "8",
      "time": "2014-09-26T13:27:58.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Drilling rework",
      "productId": "1",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Organise drilling rework"
        }
      ]
    },
    {
      "jobId": "53",
      "time": "2014-09-26T14:13:39.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "69",
      "time": "2014-09-26T14:13:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "69",
      "time": "2014-09-26T14:19:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "70",
      "time": "2014-09-26T14:19:56.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "4",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "70",
      "time": "2014-09-26T17:13:39.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "71",
      "time": "2014-09-26T17:13:39.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "4",
      "operation": "start"
    },
    {
      "jobId": "71",
      "time": "2014-09-26T17:29:39.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "51",
      "time": "2014-09-26T17:29:39.000+02:00",
      "performedBy": "Francesco",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "4",
      "operation": "finish"
    },
    {
      "jobId": "8",
      "time": "2014-09-26T17:45:21.000+02:00",
      "performedBy": "Fredrico",
      "type": "worker",
      "assignment": "Drilling rework",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "999",
      "time": "2014-09-26T18:00:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "endOfDay"
    },
    {
      "jobId": "999",
      "time": "2014-09-29T08:30:00.000+02:00",
      "performedBy": "global",
      "type": "global",
      "assignment": "",
      "productId": "",
      "operation": "startOfDay"
    },
    {
      "jobId": "3",
      "time": "2014-09-29T09:01:23.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "1",
      "operation": "resume"
    },
    {
      "jobId": "3",
      "time": "2014-09-29T12:11:34.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Assemble Coffeemaker",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "12",
      "time": "2014-09-29T12:11:34.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "1",
      "operation": "start"
    },
    {
      "jobId": "12",
      "time": "2014-09-29T12:12:34.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Go to station",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "13",
      "time": "2014-09-29T12:12:35.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "1",
      "operation": "start",
      "prerequisites": [
        {
          "type": "Go to station",
          "agentId": "Paolo"
        }
      ]
    },
    {
      "jobId": "13",
      "time": "2014-09-29T14:01:32.000+02:00",
      "performedBy": "Paolo",
      "type": "rao",
      "assignment": "Inspect finished Coffeemaker",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "14",
      "time": "2014-09-29T14:01:32.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "1",
      "operation": "start"
    },
    {
      "jobId": "14",
      "time": "2014-09-29T15:34:10.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Transport to delivery",
      "productId": "1",
      "operation": "finish"
    },
    {
      "jobId": "1",
      "time": "2014-09-29T15:34:11.000+02:00",
      "performedBy": "Biagio",
      "type": "worker",
      "assignment": "Produce Coffeemaker",
      "productId": "1",
      "operation": "finish"
    }
  ];

}

// extend the eve.Agent prototype
EventGenerator.prototype = Object.create(eve.Agent.prototype);
EventGenerator.prototype.constructor = EventGenerator;

// define RPC functions, preferably in a separated object to clearly distinct
// exposed functions from local functions.
EventGenerator.prototype.rpcFunctions = {};

EventGenerator.prototype.rpcFunctions.loadEvents = function() {
  return this.events.length - 1;
}

EventGenerator.prototype.rpcFunctions.nextEvent = function() {
  this.rpc.request("agentGenerator",{method:'receiveEvent', params:this.events[this.eventCounter]}).done();
  this.eventCounter += 1;
}

if (typeof window === 'undefined') {
  module.exports = EventGenerator;
}