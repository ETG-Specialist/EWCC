import URLSearchParams from "url-search-params";
import {md5} from "./md5.js";

const dash_key = "secret_key_not_show";
/**
 * modify the dash request url for pass anti-stealing-link crypto
 * @param request
 * @returns {string}
 */
function replaceFeature(request)
{
    const params = new URLSearchParams(request.query);
    let k_ft1 = params.get("k_ft1"); //set 37(ft_h264_ts), 38(ft_no_local_server) true
    let hight = Math.floor(k_ft1 / 4294967295);
    hight = (hight ^ 48);
    let low = k_ft1 % 4294967295;
    k_ft1 = hight * 4294967295 + low;
    params.set("k_ft1", k_ft1.toString());
    params.set("src", "02020031010024000000");//usr mobile platform
    params.set("ori", "h5");
    params.delete("k_ft4");
    params.delete("vf");
    let url = params.toString();
    let vf = md5(request.path + "?" + url + dash_key);
    params.set("vf", vf);
    return params.toString();
}

export {replaceFeature};