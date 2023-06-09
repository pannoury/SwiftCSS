const fs = require('fs')
const path = require('path')
const cssnano = require('cssnano')
const postcss = require('postcss')
const litePreset = require('cssnano-preset-lite')
const autoprefixer = require('autoprefixer')
const preset = litePreset({ discardComments: false });
const parseClassNamesFromHTML = require('./parseClass');
const mediaStyling = require('./parsers/mediaQueries')
const pseudoStyling = require('./parsers/pseudo');
const createThemeStyles = require('./parsers/themes')


function runBuildCommand(command, styleCSS, config, classNames, dynamicClassNames, dynamicStyles, dynamicClasses, lightStyles, darkStyles, screenKeys, baseStyle) {
    const inputCSS = config.input ? fs.readFileSync(config.input, 'utf-8') : '';
    const filteredStyles = [];
    const finalStyles = [];
    const mediaQueries = []
    const pseudoClasses = []
    const pseudoElements = []
    const attributes = {};

    // Regex
    const specialChars = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/g;

    // Include input CSS styles (has to be appended in the beginning)
    finalStyles.push(inputCSS);

    function processFile(filePath) {
        const { classNames: fileClassNames, dynamicClassNames: fileDynamicClassNames, attributes, screenClasses: screenStyles, pseudoClasses: pseudoClass } = parseClassNamesFromHTML(config, filePath, screenKeys);

        fileClassNames.forEach(className => classNames.add(className));
        Object.entries(fileDynamicClassNames).forEach(([className, classProperties]) => {
            // className -> bg-[#000], classProprety -> { property: "fill", value: #bg }
            dynamicClasses[className] = classProperties;
        });
      
        Object.entries(attributes).forEach(([attributeName, attributeValues]) => {
            attributeValues.forEach(attributeValue => {
                if (attributeName === 'style-dark') {
                  if (!darkStyles[attributeValue]) {
                    darkStyles[attributeValue] = [];
                  }
                  if (!darkStyles[attributeValue].includes(attributeValue)) {
                    darkStyles[attributeValue].push(attributeValue);
                  }
                }

                if (attributeName === 'style-light') {
                  if (!lightStyles[attributeValue]) {
                    lightStyles[attributeValue] = [];
                  }
                  if (!lightStyles[attributeValue].includes(attributeValue)) {
                    lightStyles[attributeValue].push(attributeValue);
                  }
                }
            });
        });

        // Push pseudo classes of a specific file to the array of all pseudo classes
        pseudoClasses.push(...pseudoClass)

        const mediaObject = mediaStyling.generateMediaQuries(config.screens, screenStyles, finalStyles, styleCSS, baseStyle)
        mediaQueries.push(...mediaObject)
    };

    config.fileExtensions.forEach(extension => {
        config.directories.forEach(directory => {
            const files = getAllFilesInDir(directory, extension);
            // Process all files
            files.forEach(filePath => {
                processFile(filePath);
            });
        });
    });

    const pseduoClassStyling = pseudoStyling.parsePseudoClasses(pseudoClasses, baseStyle)
    const mediaStyles = mediaStyling.finalMediaQuery(mediaQueries, config.screens)
    
    // To retreive pre-defined classes
    styleCSS.split('}').forEach(styleBlock => {
        const trimmedStyleBlock = styleBlock.trim();
        const classNameMatch = trimmedStyleBlock.match(/\.([a-zA-Z0-9_-]+)\s*\{/);
        if (classNameMatch && classNameMatch[1]) {
            const className = classNameMatch[1];
            if (classNames.has(className)) {
                // Trim the style block and append '}' at the end
                finalStyles.push(trimmedStyleBlock + '}');
            }
        }
    });
  
    dynamicStyles.forEach(style => {
      filteredStyles.push(style);
    });

    // Create dynamic classes
    const dynamicClassStyles = [];
    Object.entries(dynamicClasses).forEach(([className, classProperties]) => {
        if(classProperties.pseudoClass){
            dynamicClassStyles.push(`.${classProperties.pseudoClass}\\:${className.replace(specialChars, "\\$&")}:${classProperties.pseudoClass} {\n\t${classProperties.property}: ${classProperties.value};\n}`);
        } else {
            //console.log(className, classProperties)
            dynamicClassStyles.push(`.${className.replace(specialChars, "\\$&")} {\n\t${classProperties.property}: ${classProperties.value};\n}`);
        }
    });
      
    // Generate dynamic class styles
    finalStyles.push(...dynamicClassStyles);
    finalStyles.push(...pseduoClassStyling)      
    
    createThemeStyles(lightStyles, 'light', finalStyles, dynamicClasses, styleCSS, baseStyle);
    createThemeStyles(darkStyles, 'dark', finalStyles, dynamicClasses, styleCSS, baseStyle);
    
    // Include media styles
    finalStyles.push(...mediaStyles);

    // Dark and light mode styles
    const darkModeStyles = generateDynamicStyles('dark', Array.from(dynamicClassNames), styleCSS);
    const lightModeStyles = generateDynamicStyles('light', Array.from(dynamicClassNames), styleCSS);

    // Append dark and light mode styles
    finalStyles.push(...darkModeStyles);
    finalStyles.push(...lightModeStyles);

    // Include screen styles
    //finalStyles.push(...Object.values(screenStyles).map(style => style.rules.join('\n')));

    writeOutputCSS(command, config.output, [...finalStyles, ...filteredStyles]);
}

function writeOutputCSS(command, outputFilePath, styles) {
    const uniqueStyles = [...new Set(styles)];
  
    if(command === "build"){
        postcss([cssnano])
        .process(uniqueStyles.join(''))
        .then(compressCSS => {
            fs.writeFileSync(outputFilePath, compressCSS.css);
        })
        .catch((err) => {
            console.error(err)
        })   
    } else {
        fs.writeFileSync(outputFilePath, uniqueStyles.join('\n'));
    }
    console.log('Output CSS file generated:', outputFilePath);
}

function generateDynamicStyles(themeClassName, classNames, styleCSS) {
    const dynamicStyles = [];
    classNames.forEach(className => {
      const dynamicStyleRegex = new RegExp(`\\.${className}-(?:\\[([\\w#-]+)\\])`, 'g');
      const dynamicStyleMatches = styleCSS.match(dynamicStyleRegex);
  
      if (dynamicStyleMatches) {
        dynamicStyleMatches.forEach(match => {
          const dynamicStyle = match.replace(`.${className}`, '').trim();
          const parsedStyle = parseDynamicStyles(dynamicStyle);
          dynamicStyles.push(`.${className}${parsedStyle}`);
        });
      }
    });
  
    return dynamicStyles;
}

function parseDynamicStyles(style) {
    const dynamicStyleRegex = /-(?:\[([^\]]+)\])/g;
    let match;
    let parsedStyle = style;
  
    while ((match = dynamicStyleRegex.exec(style))) {
      const dynamicValue = match[1];
      const dynamicClassName = match[0];
      let dynamicStyleValue;
  
      if (dynamicValue.startsWith('url')) {
        const urlRegex = /^url\((.*)\)$/;
        const urlMatch = dynamicValue.match(urlRegex);
        if (urlMatch) {
          dynamicStyleValue = `url(${urlMatch[1]})`;
        }
      } else if (dynamicValue.startsWith('#')) {
        const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
        const hexColorMatch = dynamicValue.match(hexColorRegex);
        if (hexColorMatch) {
          dynamicStyleValue = `#${hexColorMatch[1]}`;
        }
      }
  
      if (dynamicStyleValue) {
        parsedStyle = parsedStyle.replace(
          RegExp.escape(dynamicClassName),
          dynamicStyleValue
        );
      }
    }
  
    return parsedStyle;
}

function getAllFilesInDir(dir, ext, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            fileList = getAllFilesInDir(filePath, ext, fileList);
        } else {
            if (path.extname(file) === `.${ext}`) {
                fileList.push(filePath);
            }
        }
    });

    return fileList;
}

module.exports = runBuildCommand