// create a basic WebVTT file with an incomplete metadata payload (missing selectors)
// input is audacity labels text file (export -> label track)

import fs from 'fs-extra';
import { Command } from 'commander';
import path from 'path';
import Vtt from 'vtt-creator';

async function  main() {
    let program = new Command();
    program
    .argument('input', "Input text file")
    .argument('output', "Output VTT file")
    .action(async(input, output, options) => {
        let input_ = path.resolve(process.cwd(), input)
        let output_ = path.resolve(process.cwd(), output)

        if (!fs.existsSync(input_)) {
            console.log(`Error\nFile ${input_} does not exist`)
        }
        
        let cues = await parseAudacityTextFile(input_)
        await createVtt(cues, output_)

    });
    
    program.parse(process.argv);

}

// audacity label files have 3 parts per line
// eg
// 1.153193	2.198274	1
async function parseAudacityTextFile(input) {
    let fileContents = await fs.readFile(input, { encoding: 'utf-8'})
    let cues = fileContents
    .split(/\r?\n/)
    .filter(line => line.trim() != '')
    .map(line =>  {
        let parts = line.split('\t')    
        return {
            start: parts[0]?.trim(),
            end: parts[1]?.trim(),
            label: parts[2]?.trim()
        }
    })

    console.log(JSON.stringify(cues, null, '  '))
    return cues
}

/* cues are 
{
    start: timestamp
    end: timestamp
    label: string
}
*/
async function createVtt(cues, outFilename) {
    console.log(`Generating vtt`);
    var v = new Vtt();
    cues.map(cue => {
        let metadata = {
            action: {
                name: "addCssClass",
                data: "sync-highlight"
            },
            selector: {
                
            }
        };
        v.add(parseFloat(cue.start), parseFloat(cue.end), JSON.stringify(metadata));
    });

    await fs.writeFile(outFilename, v.toString());
}

(async() => await main())()