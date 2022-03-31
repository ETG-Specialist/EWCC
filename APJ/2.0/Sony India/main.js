import { createResponse } from 'create-response';
import { httpRequest } from 'http-request';
import { ReadableStream, WritableStream } from 'streams';
import { TextEncoderStream, TextDecoderStream } from 'text-encode-transform';
import { EdgeKV } from './edgekv.js';

var evkey;
var evReply1;
var evReplyStr;

class manipulateResp {
  constructor () {
    let readController = null;
    this.readable = new ReadableStream({
      start (controller) {
        readController = controller;
      }
    });
    this.writable = new WritableStream({
      write (text) {
        var manifestLines = text.split('\n');
        evReply1 = evReplyStr.split(',');

        var removeLines = [];
        //function to remove resolution
        if (evReply1[0].includes('remove-resolution')) {
          for (var i = 0; i < manifestLines.length; i++) {
            for (var j = 1; j < evReply1.length; j++) {
              if (manifestLines[i].search('RESOLUTION') != -1) {
                if (manifestLines[i].search(evReply1[j]) != -1) {
                  removeLines.push(i);
                  removeLines.push(i+1);
                }
              }
            }
          }
        }

        var tobeRemoved = 1;
        if (evReply1[0].includes('keep-resolution')) {
          for (var i = 0; i < manifestLines.length; i++) {
            if (manifestLines[i].search('RESOLUTION') != -1) {
              //found line which has resolution
              //check if this needs to be removed
              tobeRemoved = 1;
              for (var j = 1; j < evReply1.length; j++) {
                if (manifestLines[i].search(evReply1[j]) != -1) {
                  tobeRemoved = 0;
                }
              }
              if (tobeRemoved == 1){
                removeLines.push(i);
                removeLines.push(i+1);
              }
            }
          }
        }

        //keep subtitle logic
        if (evReply1[0].includes('keep-subtitle')) {
          for (var i = 0; i < manifestLines.length; i++) {
          if (manifestLines[i].search('TYPE=SUBTITLES') != -1) {
            //found line which has subtitles
            //check if this needs to be removed
            tobeRemoved = 1;
            for (var j = 1; j < evReply1.length; j++) {
            if (manifestLines[i].search(evReply1[j]) != -1) {
              tobeRemoved = 0;
            }
            }
            if (tobeRemoved == 1){
            removeLines.push(i);
            }
          }
          }
        }

        //keep audio logic
        if (evReply1[0].includes('keep-audio')) {
          for (var i = 0; i < manifestLines.length; i++) {
          if (manifestLines[i].search('TYPE=AUDIO') != -1) {
            //found line which has audio
            //check if this needs to be removed
            tobeRemoved = 1;
            for (var j = 1; j < evReply1.length; j++) {
            if (manifestLines[i].search(evReply1[j]) != -1) {
              tobeRemoved = 0;
            }
            }
            if (tobeRemoved == 1){
            removeLines.push(i);
            }
          }
          }
        }
        for (var i = 0; i < manifestLines.length; i++) {
	        if (removeLines.includes(i) == false) {
            readController.enqueue(manifestLines[i]);
            readController.enqueue('\n');
          }
        }
      },
      close (controller) {
        readController.close();
      }
    });
  }
}
export async function responseProvider (request) {
  const options = {}
 
  options.method = request.method
  options.headers = request.getHeaders();
  var qs = request.query;
  var qsarr = [];
  qsarr = qs.split("=");
  evkey = qsarr[1];

  const edgeKv = new EdgeKV({namespace: "ekvdemo", group: "test"});

  try {
    evReplyStr = await edgeKv.getText({ item: evkey, 
                                      default_value: "" });
  } catch (error) {
    err_msg = error.toString();
    evReplyStr = "";
  }

  const response = await httpRequest(`${request.scheme}://${request.host}${request.path}`, options);
  
  let respHeaders = response.getHeaders();
  delete respHeaders["content-encoding"];
  delete respHeaders["content-length"];

  return createResponse(
    response.status,
    respHeaders,
    response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new manipulateResp())
      .pipeThrough(new TextEncoderStream())
  );
}