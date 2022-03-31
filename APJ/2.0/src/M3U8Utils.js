import {md5} from "./md5.js"

const URLReg = new RegExp([
    /#EXTINF:\s*(\d*(?:\.\d+)?)(?:,(.*)\s+)?/.source, // duration (#EXTINF:<duration>,<title>), group 1 => duration, group 2 => title
    /|(?!#)([\S+ ?]+)/.source, // segment URI, group 3 => the URI (note newline is not eaten)
    /|#EXT-X-BYTERANGE:*(.+)/.source, // next segment's byterange, group 4 => range spec (x@y)
    /|#EXT-X-PROGRAM-DATE-TIME:(.+)/.source, // next segment's program date/time group 5 => the datetime spec
    /|#.*/.source // All other non-segment oriented tags will match with all groups empty
].join(''), 'g');

const KVReg = /(?:(?:#(EXTM3U))|(?:#EXT-X-(PLAYLIST-TYPE):(.+))|(?:#EXT-X-(MEDIA-SEQUENCE): *(\d+))|(?:#EXT-X-(TARGETDURATION): *(\d+))|(?:#EXT-X-(KEY):(.+))|(?:#EXT-X-(START):(.+))|(?:#EXT-X-(ENDLIST))|(?:#EXT-X-(DISCONTINUITY-SEQ)UENCE:(\d+))|(?:#EXT-X-(DIS)CONTINUITY))|(?:#EXT-X-(VERSION):(\d+))|(?:#EXT-X-(MAP):(.+))|(?:(#)([^:]*):(.*))|(?:(#)(.*))(?:.*)\r?\n?/;

/**
 * parse level form m3u8 data
 * @param m3u8Data
 * @returns {{}}
 */
function parseM3U8(m3u8Data)
{
    let chunkDuration = -1;
    let level = {};
    level.segmnetList = [];
    let segment;

    URLReg.lastIndex = 0;
    let urlItem = null;
    while ((urlItem = URLReg.exec(m3u8Data)) !== null)
    {
        if (urlItem[1] != null)
        {
            try
            {
                chunkDuration = (parseFloat(urlItem[1]) * 1000);
            } catch (nfe)
            {
                chunkDuration = -1;
            }
        }
        else if (urlItem[3] != null)
        {
            const segmentName = getSegmentName(urlItem[3]);
            if (!segment || (segment.name !== (segmentName)))
            {
                segment = {};
                segment.name = segmentName;
                segment.url = "";
                segment.query = "";
                segment.chunkList = [];
                level.segmnetList.push(segment);
            }

            if (chunkDuration > 0)
            {
                let url = urlItem[3];
                let qdv = getKeyValueInt(url, ("&qdv="), ("?qdv="), ("&"));
                if (qdv !== 1)
                {
                    console.warn("not support encode algorithm");
                }
                if (segment.url === "")
                {
                    segment.url = url.split("?")[0];
                    segment.url = segment.url.replace("http://", "https://");
                    segment.query = "&" + url.split("?")[1];
                    segment.query = segment.query.replace(/&+[start,end,contentlength,hsize,sd]+=[^&]+/g, "");
                }
                let chunk = {};
                chunk.start = getKeyValueInt(url, ("&start="), ("?start="), ("&"));
                chunk.end = getKeyValueInt(url, ("&end="), ("?end="), ("&"));
                chunk.contentlength = getKeyValueInt(url, ("&contentlength="), ("?contentlength="), ("&"));
                chunk.hsize = getKeyValueString(url, ("&hsize="), ("?hsize="), ("&"));
                chunk.sd = getKeyValueInt(url, ("&sd="), ("?sd="), ("&"));
                chunk.EXTINF = chunkDuration;


                segment.chunkList.push(chunk);
                chunkDuration = -1;
            }
        }
        else
        {
            if ((urlItem[4] == null) && (urlItem[5] == null) && (urlItem[2] == null))
            {
                let profileItem;
                if ((profileItem = KVReg.exec(urlItem[0])) !== null)
                {
                    let groupIndex;
                    for (groupIndex = 1; groupIndex <= profileItem.length; groupIndex++)
                    {
                        if (profileItem[groupIndex] != null)
                        {
                            break;
                        }
                    }
                    try
                    {
                        let keyStr = profileItem[groupIndex];
                        let valueStr = profileItem[groupIndex + 1];
                        switch (keyStr)
                        {
                            case "#":
                                break;
                            case "PLAYLIST-TYPE":
                                level.streamType = valueStr.toUpperCase();
                                break;
                            case "MEDIA-SEQUENCE":
                                break;
                            case "TARGETDURATION":
                                level.targetDuration = parseFloat(valueStr) * 1000;
                                break;
                            case "VERSION":
                                level.version = parseInt(valueStr);
                                break;
                            case "EXTM3U":
                                break;
                            case "ENDLIST":
                                level.isLive = false;
                                break;
                            case "DIS":
                                break;
                            case "DISCONTINUITY-SEQ":
                                console.log("DISCONTINUITY-SEQ - " + parseInt(valueStr));
                                break;
                            case "START":
                                break;
                            case "MAP":
                                break;
                            case "KEY":
                                console.warn("not support DRM");
                                break;
                            case "EM":
                                console.warn("not support DRM");
                                break;
                            default:
                                console.warn("Line parsed but not handled:" + keyStr);
                                break;
                        }
                    } catch (err)
                    {
                    }
                }
            }
        }
    }
    return level;
}

/**
 * packet m3u8 text form level(edgeKV)
 * @param time
 * @param level
 * @returns {string}
 */
function packetM3U8(time, level)
{
    const dispatch_key = "secret_key_not_show";
    if (!level || !level.segmnetList) return "";
    let m3u8 = "#EXTM3U\n" +
        "#EXT-X-TARGETDURATION:" + level.targetDuration + "\n";
    for (const key in level.segmnetList)
    {
        let segment = level.segmnetList[key];
        let qd_uid = getKeyValueInt(segment.query, ("&qd_uid="), ("?qd_uid="), ("&"));
        let qd_vip = getKeyValueInt(segment.query, ("&qd_vip="), ("?qd_vip="), ("&"));
        let qd_src = getKeyValueInt(segment.query, ("&qd_src="), ("?qd_src="), ("&"));
        let qd_tm = time;
        let filename = segment.name;
        let qd_ip = getKeyValueInt(segment.query, ("&qd_ip="), ("?qd_ip="), ("&"));
        let qd_k = getKeyValueInt(segment.query, ("&qd_k="), ("?qd_k="), ("&"));
        let qd_sc = md5(qd_uid + qd_vip + qd_src + qd_tm + filename + qd_ip + qd_k + dispatch_key);
        let query = segment.query;
        if (segment.query.indexOf("&") === 0) query = query.substring(1);
        let url = segment.url + "?" + segment.query + "&qd_sc=" + qd_sc;

        for (const key in segment.chunkList)
        {
            let chunk = segment.chunkList[key];
            let chunkUrl = url + "&start=" + chunk.start + "&end=" + chunk.end + "&contentlength=" + chunk.contentlength + "&hsize=" + chunk.hsize + "&sd=" + chunk.sd;
            m3u8 += "#EXTINF:" + (chunk.EXTINF / 1000) + "," + chunkUrl + "&akamailevelcache=1" + "\n";
        }
    }

    m3u8 += "#EXT-X-ENDLIST";
    return m3u8;
}

function getSegmentName(url)
{
    let tsSplitIndex = url.indexOf("ts?");
    if (tsSplitIndex === -1)
    {
        console.log("not support m3u8 can`t find chars ts");
        return "";
    }

    let pointSplitIndex = url.lastIndexOf(".", tsSplitIndex);
    if (pointSplitIndex === -1)
    {
        console.log("not support m3u8 can`t find symbol . ");
        return "";
    }

    let startSplitIndex = url.lastIndexOf("/", pointSplitIndex);
    if (startSplitIndex === -1)
    {
        console.log("not support m3u8 can`t find symbol / ");
        return "";
    }

    return url.substring(startSplitIndex + 1, pointSplitIndex);
}

function getKeyValueInt(oriString, startFlag1, startFlag2, endFlag)
{
    let startIndex = oriString.indexOf(startFlag1);
    if (startIndex !== -1)
    {
        let endIndex = oriString.indexOf(endFlag, startIndex + startFlag1.length);
        if (endIndex !== -1)
        {
            return parseInt(oriString.substring(startIndex + startFlag1.length, endIndex));
        }
        else
        {
            return parseInt(oriString.substring(startIndex + startFlag1.length));
        }
    }
    else
    {
        startIndex = oriString.indexOf(startFlag2);
        if (startIndex !== -1)
        {
            let endIndex = oriString.indexOf(endFlag, startIndex + startFlag2.length);
            if (endIndex !== -1)
            {
                return parseInt(oriString.substring(startIndex + startFlag2.length, endIndex));
            }
            else
            {
                return parseInt(oriString.substring(startIndex + startFlag2.length));
            }
        }
        else
        {
            return 0;
        }
    }
}

function getKeyValueString(oriString, startFlag1, startFlag2, endFlag)
{
    let startIndex = oriString.indexOf(startFlag1);
    if (startIndex !== -1)
    {
        let endIndex = oriString.indexOf(endFlag, startIndex + startFlag1.length);
        if (endIndex !== -1)
        {
            return (oriString.substring(startIndex + startFlag1.length, endIndex));
        }
        else
        {
            return (oriString.substring(startIndex + startFlag1.length));
        }
    }
    else
    {
        startIndex = oriString.indexOf(startFlag2);
        if (startIndex !== -1)
        {
            let endIndex = oriString.indexOf(endFlag, startIndex + startFlag2.length);
            if (endIndex !== -1)
            {
                return (oriString.substring(startIndex + startFlag2.length, endIndex));
            }
            else
            {
                return (oriString.substring(startIndex + startFlag2.length));
            }
        }
        else
        {
            return "";
        }
    }
}

export {parseM3U8, getKeyValueInt, getKeyValueString, packetM3U8};