import fs from 'fs-extra'
import { Command } from 'commander'
import path from 'path'
import Vtt from 'vtt-creator'
import puppeteer from 'puppeteer'; // puppeteer has better css selector support than jsdom

async function main() {

    /*****************************
     * this script was written to quickly produce a demo and is not meant to be used in production
     */
    
    /* 
    this script generates a "metadata" type of VTT file containing various granularities of sync points
    which correlate with an HTML document.
    
    the timing data gets filled in based on a google speech analysis of the pre-recorded audio.

    

    that aside... 

    to use it, provide these parameters

    inputdir: directory with one or more word-level timestamp json files from google's speech api v2
    htmlDoc: the HTML document
    outputdir: will contain resulting vtt files

    and edit rules.json, which is a required file with lots of important information in it


    challenges:

    - had to manually correct the google speech api data to at least have the right number of words. 
    - had to change the text to match the narration, which was wrong in places,
     and just completely different in others (there are several different versions of the text)
    - gspeech was challenged by 
     1. uncommon words
            e.g. the word was plutonian but it said plutonium
     2. utterances, 
     3. pairs of words that sound alike, 
            e.g. some unhappy -> "someone happy"
    - gspeech goes to tenth-second precision, which is imprecise
    */


    let program = new Command();
    program
    .argument('inputdir', "Input dir with google speech json files")
    .argument('html', "HTML file")
    .argument('outputdir', "Output dir")
    .action(async(inputdir, html, outputdir, options) => {
        await combineHtmlAndGoogleSpeechData(inputdir, html, outputdir)
    })
    
    program.parse(process.argv)

}
(async() => await main())()

async function combineHtmlAndGoogleSpeechData(inputdir, html, outputdir) {
    if (!fs.existsSync(html)) {
        console.log(`Error\nFile ${html} does not exist`)
        return
    }
    let inputdir_ = path.join(process.cwd(), inputdir)
    let inputs = await getFiles(inputdir_)
    await ensureDirectory(outputdir)
    
    let rulesFile = path.join(process.cwd(), 'rules.json')
    let rules_ = await fs.readFile(rulesFile, 'utf-8')
    let rules = JSON.parse(rules_)

    
    let htmlFile = await fs.readFile(html, 'utf-8')
    let browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: {
            width: 800,
            height: 800
        }
    })
    const browserPage = await browser.newPage();
    await browserPage.setContent(htmlFile);

    // assumption: everything we want to sync with in the html doc is in <main>
    // and each track's content selectors will add up to include everything in main
    // if they don't, it might be ok or could cause issues, depending on the content
    
    let main = await browserPage.$('main')
    const mainText = await main.evaluate(el => el.textContent);

    let htmlWords = splitIntoWords(mainText)
    
    
    // process the google speech data files (which have been manually edited in places)
    // make a giant flat list of words
    let gswords = inputs.map(input => {
        let f =  fs.readFileSync(input, 'utf-8')
        let speechdata = JSON.parse(f)
        let wordzdata = speechdata.results.map(result => result.alternatives[0].words).flat()
        let offset = parseFloat(rules['audio-offsets'][path.basename(input)])
        // apply the offset specified in rules.json
        // the demo was made with lots of chunked audio files because of api limits
        // so recalculate their timestamps based on their offsets into the file that's going to be used in the end (a single file)
        if (offset != 0) {
            wordzdata.map(wd => {
                let start = parseFloat(wd.startOffset.replace('s', '')) + offset
                let end = parseFloat(wd.endOffset.replace('s', '')) + offset
                wd.startOffset = `${start}s`
                wd.endOffset = `${end}s`
            })
        }
        return wordzdata
    }).flat()

    console.log(`Google speech found ${gswords.length} words`)
    console.log(`HTML doc has ${htmlWords.length} words`)

    // assumption: google speech picked up every word even if some of them are wrong
    
    // helper function to check
    // compare(htmlWords, gswords)
    
    // combine the data
    let words = htmlWords.map((word, idx) => {
        return {
            timing: {
                start: parseFloat(gswords[idx].startOffset.slice(0,-1)),
                end: parseFloat(gswords[idx].endOffset.slice(0,-1)),
            },
            charOffset: {
                start: 0,
                end: 0
            },
            word,
            selector: ''
        }
    })

    /*
    in rules.json's "tracks" property, one of the objects must have type="word".
    
    this gets processed differently - each selector is broken down into words and 
    the offsets get calculated here. 
    the word audio timing matches with the google speech timing because we made enough corrections
    so that the word count is the same (and the timing durations should be roughly the same as long as it
        heard a word that was close enough)
    */

   // find the word-level rule
   let wordRule = rules.tracks.find(t => t.type == 'word');
   if (!wordRule) {
        console.log("Track rule of type 'word' missing; exiting")
        return
   }
   // match up the google speech words with the words inside the selectors of the word-type track rule in rules.json
   let wordsIdx = 0
   for (let selector of wordRule.selectors) {
        let elm = await browserPage.$(selector)
        if (!elm) {
            console.log("element not found for", selector)
            return
        }
        const elmText = await elm.evaluate(el => el.textContent)
        let elmTextIdx = 0
        // we won't get all the way through the words array probably
        // but start looping anyway
        for (let i = wordsIdx; i<words.length; i++) {
            let wordStartIdx = elmText.slice(elmTextIdx).indexOf(words[wordsIdx].word)
            if (wordStartIdx == -1) {
                //console.log(`${words[wordsIdx].word} [${wordsIdx}] is not in *${elmText.slice(elmTextIdx)}* (${selector})`)
                break
            }
            wordStartIdx = wordStartIdx + elmTextIdx
            let wordEndIdx = wordStartIdx + words[wordsIdx].word.length - 1            
            words[wordsIdx].charOffset.start = wordStartIdx
            words[wordsIdx].charOffset.end = wordEndIdx
            
            words[wordsIdx].selector = selector

            // console.log(`*${words[wordsIdx].word}* is in \n*${elmText}*\n from ${words[wordsIdx].charOffset.start} to ${words[wordsIdx].charOffset.end}`)
            elmTextIdx = wordEndIdx
            wordsIdx++
        }
   }

   let selectorTiming = {}
   // process the element type rules and use the word-level timing that we already figured out to mark the start 
   // and end times for each element selector
   for (let track of rules.tracks) {
        if (track.type == 'element') {
            wordsIdx = 0
            for (let selector of track.selectors) {
                let elm = await browserPage.$(selector)
                if (!elm) {
                    console.log("element not found for", selector)
                    return
                }
                const elmText = await elm.evaluate(el => el.textContent)
                let elmTextIdx = 0
                // we won't get all the way through the words array probably
                // but start looping anyway
                for (let i = wordsIdx; i<words.length; i++) {
                    let found = elmText.slice(elmTextIdx).indexOf(words[wordsIdx].word)
                    if (found == -1) {
                        break
                    }
                    elmTextIdx = found + words[wordsIdx].word.length
                    if (!selectorTiming.hasOwnProperty(selector)) {
                        selectorTiming[selector] = {...words[wordsIdx].timing}
                    }
                    if (selectorTiming[selector].end <= words[wordsIdx].timing.end) {
                        selectorTiming[selector].end = words[wordsIdx].timing.end
                    }
                    else {
                        console.log("WEIRD")
                    }
                    
                    wordsIdx++
                }
            }
        }
   }

   // now make VTT cues from words and from each element selector

   // also make another VTT file but this time put all the cues in it (e.g. Stanza, Line, Word)
   // cues may overlap and the UA can base the style on the cue type, in this case given 
   // in the cue metadata's "label" property
   let compositeTrack = new Vtt()
   

   let newWordsTrack = new Vtt()
   words.map(word => {
        let cueMetadata = {
            "selector": `${word.selector}##${word.charOffset.start},${word.charOffset.end}`,
            "label": "Words"
        }
        newWordsTrack.add(
            word.timing.start, 
            word.timing.end, 
            JSON.stringify(cueMetadata)
        )
        compositeTrack.add(word.timing.start, word.timing.end, JSON.stringify(cueMetadata))
   })
   await fs.writeFile(path.join(outputdir, 'Words.vtt'), newWordsTrack.toString())

   for (let track of rules.tracks.filter(t => t.type == 'element')){
        let newTrack = new Vtt()
        for (let selector of track.selectors) {
            let cueMetadata = {
                selector,
                "label": track.label
            }
            newTrack.add(
                selectorTiming[selector].start, 
                selectorTiming[selector].end, 
                JSON.stringify(cueMetadata)
            )
            compositeTrack.add(
                selectorTiming[selector].start, 
                selectorTiming[selector].end, 
                JSON.stringify(cueMetadata)
            )
        }
        await fs.writeFile(path.join(outputdir, track.label + '.vtt'), newTrack.toString())
   }

   await fs.writeFile(path.join(outputdir, "composite.vtt"), compositeTrack.toString())
}

function compare(htmlWords, gswords) {
    // the results had to be manually adjusted
    // i used this loop to see what didn't match up (not looking for an exact match but the word parsing has to be the same)
    htmlWords.map((w, idx) => {
        let w1 = w.trim().toLowerCase()
        let w2 = gswords[idx]?.word.trim().toLowerCase()
        if (w1 != w2) {
            console.log(`${idx}: ${w1} <> ${w2}  (${gswords[idx].startOffset})`)
        }
    })
}
async function ensureDirectory(dir, ensureIsEmpty: boolean = false) {
    if (!fs.existsSync(dir)) {
        await fs.mkdir(dir);
    }
    if (ensureIsEmpty) {
        await fs.emptyDir(dir);
    }
}

async function getFiles(dir) {
    let files = await fs.readdir(dir)

    // don't bother to recurse directories, this is just going to be used for a flat list of files
    let files_ = files.filter(file => {
        let f = path.join(dir, file)
        let stat = fs.statSync(f)   
        return !stat.isDirectory()
    })
    .map(file => path.join(dir, file))

    return files_
}
function splitIntoWords(str) {
    // replace a fancy dash with a space
    return str.replaceAll('—', ' ').trim().split(' ').map(w => w.trim()).filter(w => w != '')
}

function toHHMMSS(secs) {
    var sec_num = parseInt(secs, 10)
    var hours = Math.floor(sec_num / 3600)
    var minutes = Math.floor(sec_num / 60) % 60
    var seconds = secs % 60

    return [hours, minutes, seconds.toFixed(3)]
    //@ts-ignore
        .map(v => v < 10 ? "0" + v : v)
        .filter((v, i) => v !== "00" || i > 0)
        .join(":")
}