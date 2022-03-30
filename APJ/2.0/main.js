
import { logger } from 'log';
import { EdgeKV } from './edgekv.js';

export async function onClientRequest(request) {
  
  var dataObj = "";
  const edgeKv = new EdgeKV({namespace: "redirects", group: "fnp"});
  let url = request.url;
  let lookUpUrl = url.replaceAll("/", "_");
  try {
    var handle = 0;
    dataObj = await edgeKv.getText({ item : lookUpUrl });
    if(dataObj != null ){
      request.respondWith(302, {
        Location: [request.scheme + '://' + request.host + dataObj]
      }, '');
    }
  } catch (error) {
    var err_msg = error.toString();
    logger.log(err_msg);
  }  
}  

export function onClientResponse(request, response) {
  response.setHeader('X-Hello-World', 'From Akamai EdgeWorkers');
}