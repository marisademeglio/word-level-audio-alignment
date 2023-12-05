# word-level-audio-alignment
Use a speech to text API to synchronize at the word level

See the [live demo](https://marisademeglio.github.io/word-level-audio-alignment/raven/) and be sure to view it with a browser that supports [CSS Highlights API](https://caniuse.com/mdn-api_highlight_has), such as Chrome.

## Demo features

* Features user-controllable stanza-, line-, and word-level synchronization.  
* No special player is required as it uses browser-friendly formats: **HTML**, **webvtt**, the **CSS highlights API**, and a little **javascript**.  
* In this case, content is in the public domain

## Challenges

* Had to manually correct the speech api data to at least have the right number of words. 
* Had to change the text to match the narration, as there wasn't a 100% match (there are several different versions of the text in existence)
* The speech-to-text API was challenged by uncommon words, short utterances, and pairs of words that sound alike (e.g. "some unhappy" was heard as "someone happy")
* The speech-to-text API uses tenth-second precision for the generated timestamps, which is not extremely accurate.


## File structure

* `audio analysis`  
    Audacity project to break up the original audio into chunks, due to google's speech api upload constraints.  
    The google speech data's timing is then wrong but the script below (gglspch-to-vtt) readjusts it according to audio-off sets in rules.json.  

* `gglspch-to-vtt`  
    Javascript program which combines an html file and a series of google speech data files into some webvtt tracks.  
    There are lots of caveats about using it. It originated as a demo-creation helper script and is not production ready.  

* `gspeech-data`  
    The output from google speech, which had to be cleaned up before it could be used.  

* `docs/raven`  
    This working demo was created using the scripts above. The contents are synchronized text and audio narration for the poem "The Raven".  
    
    
    
  