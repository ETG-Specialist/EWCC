### HLS master manifest customizer
(keep or remove resolutions, audio, subtitles)

This EW customizes HLS master manifest using EKV. The EKV key is passed in the query string parameter "customize" and what action needs to take place is in EKV value. It can do the following: -

1. Remove listed resolution streams
2. Keep only listed resolution streams and remove rest
3. Keep only listed subtitle language
4. Keep only listed audio streams
It can also combine few of the above actions, like remove resolution and keep audio stream (tvandenaudio and kaiosand128kaudio)

With this EW, we can have a single stream that can be used with multiple devices(tv, phone) by removing/keeping resolutions that suits the device. It can also customize the stream based on the user by removing or keeping audio languages/subtitles.

key - value
tv - remove-resolution,422x180,638x272
phone - remove-resolution,4096x1744
kaios - keep-resolution,422x180
engsubs - keep-subtitle,English
deustchsubs - keep-subtitle,Deutsch
enaudio - keep-audio,en
dubbedaudio - keep-audio,dubbing
128kaudio - keep-audio,128kbit
tvandenaudio - remove-resolution&keep-audio,422x180,638x272,en
kaiosand128kaudio - keep-resolution&keep-audio,422x180,128kbit

Structure of values in EKV

It is stored as a string, after fetching it in EW, it is converted as a list/array. The first index is always what action to perform, subsequent items tells which resolution, audio, subtitle to keep/remove.

Logic - 
1. Trigger EW for master manifest request when "customize" query string parameter is present
2. Get value of "customize" para(key for EKV), fetch value of the key
3. Convert fetched value from EKV into a list/array
4. Identify the action to perform
5. Parse the manifest, identify lines to be removed. This is done by searching for a string in the manifest
6. Send the response from EW excluding the lines

Test URL - curl -ik "http://sonyliv-ew-demo.sonyliv.com/content/sintel/hls/playlist.m3u8?customize=<ekv-key>" --connect-to ::<stagingIP>
Original manifest - curl -ik "http://sonyliv-ew-demo.sonyliv.com/content/sintel/hls/playlist.m3u8" --connect-to ::<stagingIP>
