import {EdgeKV} from "./edgekv.js";
import {httpRequest} from "http-request";
import {parseDash, replaceLevel} from "./parseDash.js";
import {logger} from 'log';
import URLSearchParams from "url-search-params";
import {replaceFeature} from "./paramUtils.js";
import {TextDecoderStream} from 'text-encode-transform';
import {WritableStream} from 'streams';

/***
 * get level from edgeKV
 * @param tvid video id
 * @param bid level id
 * @returns {Promise<Object|null>}
 */
async function getCache(tvid, bid)
{
    let key = tvid + "_" + bid;
    const edgeKv = new EdgeKV({namespace: "default", group: "levelCache"});
    try
    {
        let m3u8 = await edgeKv.getJson({item: key});
        if (m3u8)
        {
            if (m3u8.time)
            {
                if ((Date.now() - m3u8.time) < 86400000)
                {
                    return m3u8;
                }
                else
                {
                    logger.log("getCache error m3u8.time is expire : time " + m3u8.time);
                }
            }
            else
            {
                logger.log("getCache error m3u8.time is null");
            }
        }
        else
        {
            logger.log("getCache error m3u8 is null");
        }
        return null;
    } catch (error)
    {
        logger.log("getCache error : " + error.toString())
        return null;
    }
}

/***
 * put level to edgeKV {private method}
 * @param tvid
 * @param bid
 * @param level
 * @returns {Promise<*|null>}
 */
async function _setCache(tvid, bid, level)
{
    let key = tvid + "_" + bid;
    const edgeKv = new EdgeKV({namespace: "default", group: "levelCache"});
    try
    {
        level.time = Date.now();
        let result = await edgeKv.putJson({item: key, value: level});
        logger.log("setCache result : " + JSON.stringify(result));
        return result;
    } catch (error)
    {
        logger.log("_setCache error : " + error.toString())
        return null;
    }
}

/***
 * get dash from IQ
 * @param request
 * @returns {Promise<null>}
 */
async function getDash(request)
{
    const response = await httpRequest("https://cache-video.iq.com" + request.url);
    if (response.ok)
    {
        logger.log("get dash OK & start parse level");
        let dash = await streamText(response.body);
        dash = JSON.parse(dash);
        logger.log("get json complete");
        let level = parseDash(dash);// check dash body
        logger.log("parse level complete");
        if (level)
        {
            if (level.error)
            {
                logger.log("parse level error - " + level.error);
            }
            else
            {
                const params = new URLSearchParams(request.query);
                const tvid = params.get('tvid');
                const bid = params.get('bid');
                logger.log("parse level done & set to kv : [ " + tvid + ", " + bid + " ]");
                await _setCache(tvid, bid, level);
            }
        }
        else
        {
            logger.log("parse level error - empty");
        }
        return dash;
    }
    else
    {
        return null;
    }
}

async function streamText(response_body)
{
    let result = "";
    await response_body
        .pipeThrough(new TextDecoderStream())
        .pipeTo(new WritableStream({
            write(chunk)
            {
                result += chunk;
            }
        }), {preventAbort: true});
    return result;
}

/***
 * 请求简洁的Dash，替换M3U88
 * @param request
 * @param level
 * @returns {Promise<*|*>}
 */
async function createBody(request, level)
{
    let url = (request.path + "?" + replaceFeature(request));
    // logger.log("createBody httpRequest dash url: " + "http://cache-video.iq.com" + url);
    const response = await httpRequest("https://cache-video.iq.com" + url);
    if (response.ok)
    {
        logger.log("get dash OK & start parse level");
        let dash = await streamText(response.body);
        dash = JSON.parse(dash);
        const params = new URLSearchParams(request.query);
        const tvid = params.get('tvid');
        const bid = params.get('bid');
        const tm = params.get('tm');
        dash = replaceLevel(tvid, bid, tm, dash, level);
        dash.redirectfromurl = (request.scheme + "://" + request.host + request.url);
        dash.redirecttourl = ("https://cache-video.iq.com" + url);
        return dash;
    }
    else
    {
        return null;
    }
}

export {getCache, getDash, createBody};