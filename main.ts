#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import funnel from './src/cli/funnel';

// Types
import { BaseStyle, Config, DynamicClasses, modeStyle } from "types";

//const cpus = os.cpus()
//const numThreads = cpus.length;
//console.log(numThreads) 

const configFile = path.join(process.cwd(), 'swiftcss.config.js') as string

// Gets all available pre-defined styles/classes that can be used
export const styleCSS = fs.readFileSync(path.join(__dirname, 'src', 'style.css'), 'utf-8');
export const classNames = new Set();
export const dynamicClassNames = new Set() as Set<String>;
export const dynamicStyles = new Set() as Set<String>;
export const dynamicClasses = new Object as DynamicClasses;
export const lightStyles = new Object as modeStyle;
export const darkStyles = new Object as modeStyle;
export const screenKeys = new Array;
export const baseStyle = new Object as BaseStyle;
const defaultConfig = {
    fileExtensions: ['html', 'js', 'jsx', 'ts', 'tsx'],
    directories: ['./src'],
    input: [],
    output: './output.css',
    variables: {}
};

// Create a loading animation
let animationInterval: ReturnType<typeof setTimeout>;

// Have the init command recognition in the beginning to allow user to create the config file
// without triggering errors in the coming steps
if (process.argv[2] === "init") {
    const configContent = `module.exports = {
        fileExtensions: ["html","js","jsx","ts","tsx"],
        directories: ["./src"], // Specify directories to scan for style changes
        input: [], // Specify an input file to be appended into the output file
        output: "./output.css", // Specify the path to where the output file will be generated
        screens: { // specify media query cut-offs
            sd: {max: 600},
            md: {min: 600, max: 1200},
            ld: {min: 1200},
        },
        variables: { // Define variables here, variables have to start with "$"
            $green: "#0ce42c"
        } 
    };`;

    fs.writeFileSync(configFile, configContent);
    console.log(`Configuration file created at ${configFile}`);
    process.exit(0);
}

// Load configuration
let config: Config | null;
const directories = new Array;
const inputs = new Array;
if (fs.existsSync(configFile)) {
    // Since the file exists we assume the type to be of Config
    config = require(path.resolve(configFile)) as Config;

    if (config.directories.length === 0) {
        console.error('Configuration file is missing values in directories. Please specify a directory so the CLI can start scanning.');
        process.exit(1);
    } else if (!fs.existsSync(path.dirname(path.join(process.cwd(), config.output)))) {
        console.error('Please specify a valid directory path for your output file in swiftcss.config.js.');
        process.exit(1);
    } else if (config.output === "") {
        console.error('Please specify a valid path for your output file in swiftcss.config.js.');
        process.exit(1);
    }
} else {
    console.error('Configuration file not found. Run "init" command first.');
    process.exit(1);
}

let currentScreens = config.screens;


// Check if directories exist
for (const directory of config.directories) {
    if (!fs.existsSync(path.join(process.cwd(), directory))) {
        console.error(`Directory not found: ${directory}`);
        process.exit(1);
    } else {
        directories.push(path.join(process.cwd(), directory))
    }
}

if(config.input.length > 0 && Array.isArray(config.input)){
    // Check if directories exist
    for (const input of config.input) {
        if (!fs.existsSync(path.join(process.cwd(), input))) {
            console.error(`Input file not found: ${input}`);
            process.exit(1);
        } else {
            inputs.push(path.join(process.cwd(), input))
        }
    }
} else if(typeof config.input === "string" && config.input !== ''){
    if (!fs.existsSync(path.join(process.cwd(), config.input))) {
        console.error(`Input file not found: ${config.input}`);
        process.exit(1);
    } else {
        inputs.push(path.join(process.cwd(), config.input))
    }
}

// Update directories & output
config.directories = directories
config.output = path.join(process.cwd(), config.output)
config.input = inputs

export const _CONFIG = config;


// We define the commands here and the actions that occurrs for each command
if (process.argv[2] === 'watch') {
    console.log('Watching for file changes...');
    // Generate baseStyle
    generateBaseStyle(styleCSS, process);

    const watcher = chokidar.watch(config.directories, {
        ignored: /(^|[/\\])\../, // Ignore dotfiles
        persistent: true,
        // @ts-ignore
        depth: "infinity"
    });

    const inputWatcher = chokidar.watch(config.input, {
        ignored: /(^|[/\\])\../, // Ignore dotfiles
        persistent: true,
        // @ts-ignore
        depth: "infinity"
    });

    // Watch for changes in config file
    const configWatcher = chokidar.watch(configFile, { persistent: true });
    configWatcher.on('change', () => {
        const newConfig = require('./swiftcss.config.js');
        if (JSON.stringify(newConfig.screens) !== JSON.stringify(currentScreens)) {
            currentScreens = newConfig.screens;
            console.log(`Current Screens: ${currentScreens}`)
        }
        console.log('Compiler stopped due to changes to the config file, please rerun your command once you have finished editing the config file');
        process.exit();
    });

    screenKeys.push(...Object.keys(config.screens))

    watcher.on('change', (filePath: string) => {
        if(config?.fileExtensions.includes(filePath.substring(filePath.lastIndexOf('.'), filePath.length).replace('.', ''))){
            console.log(`File changed: ${filePath}`);
            funnel('watch', styleCSS, config as Config, baseStyle);
            console.log('Changes generated')
        }
    });

    inputWatcher.on('change', (filePath: string) => {
        console.log(`File changed: ${filePath}`);
        funnel('watch', styleCSS, config as Config, baseStyle);
        console.log('Changes generated')
    });

    process.on('SIGINT', () => {
        watcher.close();
        console.log('Watch process terminated.');
        process.exit();
    });

    funnel('watch', styleCSS, config, baseStyle);
} else if (process.argv[2] === 'build') {
    generateBaseStyle(styleCSS, process)
    screenKeys.push(...Object.keys(config.screens))

    funnel('build', styleCSS, config, baseStyle);
} else if (process.argv[2] === "dev") {

    generateBaseStyle(styleCSS, process);

    /********************** WATCHER CONFIG **********************/
    const watcher = chokidar.watch(config.directories, {
        ignored: /(^|[/\\])\../, // Ignore dotfiles
        persistent: true,
        // @ts-ignore
        depth: "infinity"
    });

    // Watch for changes in config file
    const configWatcher = chokidar.watch(configFile, { persistent: true });
    configWatcher.on('change', () => {
        const newConfig = require('./swiftcss.config.js');
        if (JSON.stringify(newConfig.screens) !== JSON.stringify(currentScreens)) {
            currentScreens = newConfig.screens;
            console.log(`Current Screens: ${currentScreens}`)
        }
        console.log('Compiler stopped due to changes to the config file, please rerun your command once you have finished editing the config file');
        process.exit();
    });

    screenKeys.push(...Object.keys(config.screens))

    watcher.on('change', (filePath: string) => {        
        console.log(`File changed: ${filePath}`);
        startLoadingAnimation()
        funnel('dev', styleCSS, config as Config, baseStyle);
        stopLoadingAnimation()
        console.log('Changes generated')
    });

    process.on('SIGINT', () => {
        watcher.close();
        console.log('Watch process terminated.');
        process.exit();
    });
    /********************** WATCHER CONFIG **********************/

    screenKeys.push(...Object.keys(config.screens))

    funnel('dev', styleCSS, config, baseStyle);
}

export function generateBaseStyle(styleCSS: string, process: NodeJS.Process){
    styleCSS.split('}').forEach((styleBlock: string, i: number) => {
        const trimmedStyleBlock = styleBlock.trim();
        try {
            const classNameMatch = trimmedStyleBlock.match(/\.([a-zA-Z0-9_-]+)\s*\{/); // Class Name without the leading "."
            if(classNameMatch){
                const classAttribute = trimmedStyleBlock
                    .replace(classNameMatch[0], '')
                    .trim()
                    .split('\n  ')

                const className = classNameMatch[1] as keyof BaseStyle

                // Append style to baseStyle
                baseStyle[className] = classAttribute
            }
        } catch (error) {
            console.error(`An error occurred when generating CSS backbone: ${error}`)
            process.exit()
        }
    });
}

export function startLoadingAnimation() {
    const loadingSymbols = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let animationIndex = 0;
    animationInterval = setInterval(() => {
        process.stdout.write('\r'); // Move cursor to the beginning of the line
        console.log(loadingSymbols[animationIndex]);
        animationIndex = (animationIndex + 1) % loadingSymbols.length;
    }, 100);
}

export function stopLoadingAnimation() {
    clearInterval(animationInterval);
    process.stdout.write('\n'); // Move to the next line
}