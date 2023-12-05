# word-level-audio-alignment
 Use a speech to text API to synchronize at the word level


## File structure

* `audio analysis`  
    Audacity project to break up the original audio into chunks, due to google's speech api upload constraints.  
    The google speech data's timing is then wrong but the script below (gglspch-to-vtt) readjusts it according to audio-offsets in rules.json. 

* `gglspch-to-vtt`  
    Javascript program which combines an html file and a series of google speech data files into some webvtt tracks.  
    There are lots of caveats about using it. It originated as a demo-creation helper script and is not production ready.

* `gspeech-data`  
    The output from google speech, which had to be cleaned up before it could be used. 

* `docs/raven`  
    This working demo was created using the scripts above. The contents are synchronized text and audio narration for the poem "The Raven". 
    Features user-controllable stanza-, line-, and word-level synchronization. 
    No special player is required as it uses browser-friendly formats: **HTML**, **webvtt**, the **CSS highlights API**, and a little **javascript**.  
    
  