import {logger} from 'log';
import URLSearchParams from 'url-search-params'
import {ReadableStream} from 'streams';
import {httpRequest} from "http-request";
import {createResponse} from 'create-response';
import {TextEncoderStream} from 'text-encode-transform';
import {getCache, getDash} from './vrsProxy.js';

export async function responseProvider(request)
{
    logger.log('responseProvider: ' + Date.now());

    const params = new URLSearchParams(request.query);
    const tvid = params.get('tvid');  // video id
    const bid = params.get('bid');  // 1080P,720P,480P
    const src = params.get('src');  // source platform id
    logger.log('[ ' + tvid + ', ' + bid + ' ]');

    if ((params.get("ps") !== "0") || (src !== "01010031010039000000") || !tvid || !bid)  // ps=0 is video play start, src is pcw in one country.
    {
        return httpRequest("https://cache-video.iq.com" + request.url).then(response =>
        {
            return Promise.resolve(createResponse(
                response.status,
                {'Content-Type': ['application/json']},
                response.body
            ));
        }).catch(error =>
        {
            return Promise.resolve(createResponse(
                200,
                {'Content-Type': ['application/json']},
                JSON.stringify({
                    msg: "This sign is not correct. " + error.toString(),
                    data: {ctl: {uip: "127.0.0.1", num: "1"}, p: {mt: 0}},
                    code: "A00001"
                })
            ));
        });
    }
    else
    {
        let level = await getCache(tvid, bid);// get level cache from edgeKV
        if (level)
        {
            logger.log("get level from kv OK");
            const dash = await createBody(request, level);// create dash by cached level
            if (dash) return createBody(dash);// create HTTP Response
            logger.log("createBody error");
        }
        else
        {
            logger.log("get level from kv Failure");
            let dash = await getDash(request);// get dash from IQ & parse and put level to edgeKV
            if (dash) if (dash) return createBody(dash);
            logger.log("get dash from IQ error");
        }
        return Promise.resolve(createResponse(
            200,
            {'Content-Type': ['application/json']},
            JSON.stringify({
                msg: "This sign is not correct.",
                data: {ctl: {uip: "127.0.0.1", num: "1"}, p: {mt: 0}},
                code: "A00001"
            })
        ));
    }
}

async function createBody(body)// packet response
{
    let bodyStr = JSON.stringify(body);
    return Promise.resolve(createResponse(
            200,
            {'Content-Type': ['application/json']},
            new ReadableStream({
                start(controller)
                {
                    logger.log('ReadableStream start bodyStr [ ' + bodyStr.length + ' ]');
                    controller.enqueue(bodyStr);
                    controller.close();
                },

                pull(controller)
                {
                    logger.log('ReadableStream pull');
                    /* … */
                },

                cancel(reason)
                {
                    logger.log('ReadableStream cancel ' + reason);
                    /* … */
                },

            }).pipeThrough(new TextEncoderStream())
        )
    );
}



