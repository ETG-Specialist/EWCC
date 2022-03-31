import {logger} from "log";
import {parseM3U8, packetM3U8} from "./M3U8Utils.js";

/**
 * Check the data valid
 * @param vrsData
 * @returns {{error: string}|{}}
 */
function parseDash(vrsData)
{
    if(!vrsData.data)
    {
        return {error:"miss field 'data'"};
    }

    if(vrsData.data.st)
    {
        let st = vrsData.data.st;  // error code change to json string.
        if(st >= 100 && st <= 200)
        {
            if(st === 110)
            {
                return {error:"fee movie"};
            }
            if(st === 109)
            {
                return {error:"Invalid region"};
            }
            if(st === 101)console.log("ok VP");
            if(st === 200)console.log("ok VI");
        }
        else
        {
            let msg = "";
            if(st >= 303 && st <= 393){msg = "can`t find video"; console.error(msg);}

            if(st >= 401 && st <= 493){msg = "invalid video"; console.error(msg);}

            if(st >= 501 && st <= 514){msg = "restricted video"; console.error(msg);}

            if(st === 602){msg = "need set drm feature"; console.error(msg);}

            if(st >= 701 && st <= 799){msg = "drm error"; console.error(msg);}

            if(st === 800){msg = "boss ck service is invalid"; console.error(msg);}
            if(st === 801){msg = "mus service is invalid"; console.error(msg);}
            if(st === 802){msg = "drm service is invalid"; console.error(msg);}
            if(st === 803){msg = "vp service is invalid"; console.error(msg);}
            if(st === 804){msg = "boss unlock"; console.error(msg);}

            return {error:msg};
        }
    }
    else
    {
        return {error:"miss field st"};
    }

    if(!vrsData.data.program)
    {
        return {error:"miss field data.program"};
    }

    if(!vrsData.data.program.video)
    {
        return {error:"miss field data.program.video"};
    }

    let data = vrsData.data;
    if (data.boss_ts)
    {
        let bossTsObj = data.boss_ts;
        if (bossTsObj.data.prv !== 0)
        {
            return {error:"Taste video"};
        }
    }

    let program = data.program;
    if(program.video)
    {
        let videos = program.video;  // many video codecs.
        for (let i = 0; i < videos.length; i++)
        {
            let videoJson = videos[i];
            if (videoJson.drmType !== 1)
            {
                return {error:"DRM movie, do not support"};
            }

            if (videoJson._selected && videoJson.m3u8)
            {
                logger.log("parse m3u8 start");
                let level = parseM3U8(videoJson.m3u8);  // parse m3u8 text.
                if(level)
                {
                    return level;
                }
                else
                {
                    return {error:"parse meu8 level error"};
                }
            }
        }
    }
}

/***
 * replace the dash`level
 * @param tvid video id
 * @param bid level id
 * @param time The time of the dash request
 * @param vrsData dash data
 * @param level level cache from edgeKV
 * @returns {{data}|*}
 */
function replaceLevel(tvid, bid, time, vrsData, level)
{
    if(vrsData && vrsData.data && vrsData.data.tvid && tvid === vrsData.data.tvid.toString() && vrsData.data.program && vrsData.data.program.video)
    {
        logger.log("replaceLevel start");
        let videos = vrsData.data.program.video;
        for (let i = 0; i < videos.length; i++)
        {
            let videoJson = videos[i];
            if (videoJson.drmType !== 1)
            {
                logger.log("is DRM movie can`t use cache")
            }

            if (videoJson.bid.toString() === bid)
            {
                logger.log("start packetM3U8 time: " + time);
                videoJson.m3u8 = packetM3U8(time, level);  // packet level m3u8 text.
                return vrsData;
            }
        }
        logger.log("replaceLevel fail no bid: " + bid + " in response");
    }
    else
    {
        logger.log("replaceLevel error tvid difference: " + tvid + ", " + vrsData.data.tvid);
    }
    return vrsData;
}

export {parseDash, replaceLevel};
