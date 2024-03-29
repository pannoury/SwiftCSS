import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnanoPlugin from 'cssnano';

import { BaseStyle, Config } from "types"
import classCSS from './utilities/base';
import themeCSS from './utilities/theme';
import mediaCSS from './utilities/media';
import buildOptimisiation from '../../src/misc/buildOptimisiation';
import getAllFilesInDir from "../../src/misc/getAllFilesInDir"

type Command = "watch" | "build" | "dev"
export interface Funnel {
    command: Command
    styleCSS: BaseStyle
    config: Config
}

type AttributeSet = Set<{
    attribute: string,
    cssAttributes: string[]
}>
export type AttributeObject = { // This object is for style-<dark, light & mediaQueries>
    [key: string]: Set<{
        attribute: string,
        cssAttributes: string[]
    }>
}

export default function funnel(command: Command, styleCSS: string, config: Config, baseStyle: BaseStyle, triggered: boolean = false) {
    const classArray = new Array;
    const mediaObject = new Object;
    const themeObject = new Object;
    const CSS = new Array;
    
    // Regex
    const classRegex = /(?:className|class)\s*=\s*['"`]([^'`"]+)['"`]/g;
    const themeRegex = /\s+(style-(?:dark|light))\s*=\s*['"`]([^'`"]+)['"`]/g;

    // Dynamically create Regex for mediaQuery Regex
    // Create a regular expression pattern dynamically
    const pattern = `\\s+(style-${Object.keys(config.screens).join('|style-')})\\s*=['"\`]([^'"\`]+)['"\`]`;

    // Create a RegExp object with the pattern and 'g' flag
    const mediaRegex = new RegExp(pattern, 'g');

    /*
        We get all file extensions that are specified in the config file
        and we then go through each directory and look for files endind with the
        extensions that was provided in the config file.
    */
    config.fileExtensions.forEach((extension: string) => {
        config.directories.forEach((directory: string) => {
            const files = getAllFilesInDir(directory, extension);
            // Process all files
            files.forEach(filePath => {
                processFile(filePath);
            });
        });
    });

    function processFile(filePath: string){
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        const classMatches = fileContent.matchAll(classRegex);
        const themeMatches = fileContent.matchAll(themeRegex);
        const mediaMatches = fileContent.matchAll(mediaRegex);

        // Fetch classes from class or className element attributes
        if(classMatches){
            classArray.push([...classMatches].map((match) => match[1].split(' ')).flat())
        }

        // Fetch matches for style-light & style-dark element attributes
        if(themeMatches){
            // match[1] --> style-light/style-dark
            // match[2] --> string followed by attributeName --> "max-w-100 bg-[#000]"
            for(const match of themeMatches){
                const styleObject = {
                    attribute: match[2],
                    cssAttributes: [...match[2].split(' ')]
                }
                
                //@ts-ignore
                if(!themeObject[match[1]]){
                    //@ts-ignore
                    themeObject[match[1]] = new Set()
                    //@ts-ignore
                    themeObject[match[1]].add(styleObject)
                } else {
                    //@ts-ignore
                    themeObject[match[1]].add(styleObject)
                }
            };
        }

        // Fetch mediaQuery
        if(mediaMatches){
            // match[1] --> style-sd/style-ld
            //console.log([...mediaMatches])
            for(const match of mediaMatches){
                const styleObject = {
                    attribute: match[2],
                    cssAttributes: [...match[2].split(' ')]
                }
                
                //@ts-ignore
                if(!mediaObject[match[1]]){
                    //@ts-ignore
                    mediaObject[match[1]] = new Set()
                    //@ts-ignore
                    mediaObject[match[1]].add(styleObject)
                } else {
                    //@ts-ignore
                    mediaObject[match[1]].add(styleObject)
                }
            };
        }
    }

    /*
        Once we have parsed all attributes that we accept,
        we will process each sort of attribute to their corresponding
        processor.

        classCSS -> classes defined in class="" or className=""
        themeCSS -> classes defined in style-dark="" or style-light=""
        mediaCSS -> classes defined in style-<size> attributes defined in the
        config file.

        Also include input file (files, in the future we need to add support for multifile support)
    */

    // Fetch input file
    if(config.input.length > 0){
        for (const input of config.input) {
            const inputCSS = fs.readFileSync(input).toString();
            CSS.push(inputCSS);
            CSS.push(`/************* Inserted from input file ${input} [Above] *************/`)
        }        
    }
    
    if(command === "watch"){
        CSS.push(classCSS([...new Set(classArray.flat())], baseStyle, config));
        CSS.push(themeCSS(themeObject as AttributeObject, baseStyle, config));
        CSS.push(mediaCSS(mediaObject as AttributeObject, baseStyle, config))
        fs.writeFileSync(config.output, CSS.join('\n'));
    } else if (command === "build" && !triggered){
        
        // Optimise code for themes and media classes
        buildOptimisiation(themeObject as AttributeObject, config)
        buildOptimisiation(mediaObject as AttributeObject, config)
        
        funnel(command, styleCSS, config, baseStyle, true)
    } else if(command === 'build' && triggered){
        CSS.push(classCSS([...new Set(classArray.flat())], baseStyle, config));
        CSS.push(themeCSS(themeObject as AttributeObject, baseStyle, config));
        CSS.push(mediaCSS(mediaObject as AttributeObject, baseStyle, config))
        
        fs.writeFileSync(config.output, CSS.join('\n'));
        /*
        postcss([autoprefixer, cssnanoPlugin])
        .process(CSS.join('\n'))
        .then(result => {
            fs.writeFileSync(config.output, result.css);
        })
        */
    }
}