function parsePseudoClasses(classes, baseStyle){
    const specialChars = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/g;
    const css = [];

    classes.forEach((element, index) => {
        try {
            const [selector, attribute] = element.split(':')

            if(pseudoClasses.includes(selector) && baseStyle[attribute]){
                const cssAttribute = baseStyle[attribute]
                const output = `.${selector}\\:${attribute}:${selector}{\n ${cssAttribute} \n}`
                css.push(output)
            } else if(pseudoElements.includes(selector) && baseStyle[attribute]){
                const cssAttribute = baseStyle[attribute]
                const output = `.${selector}\\:${attribute}::${selector}{\n ${cssAttribute} \n}`
                css.push(output)
            } else if(pseudoElements.includes(selector) && attribute.includes('content-')){
                console.log(attribute)
                const contentValue = attribute.split('-')[1].replace(/\[|\]/g, "")
                const output = `.${selector}\\:${attribute.replace(specialChars, "\\$&")}::${selector}{\n content: ${contentValue} \n}`
                css.push(output)
            }
        } catch (err) {}
    });

    return css
}

function parsePseudoElements(){

}

const pseudoClasses = [
    'active',
    'any',
    'any-link',
    'checked',
    'default',
    'defined',
    'dir',
    'disabled',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'focus',
    'focus-visible',
    'focus-within',
    'has',
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'lang',
    'last-child',
    'last-of-type',
    'link',
    'not',
    'nth-child',
    'nth-last-child',
    'nth-last-of-type',
    'nth-of-type',
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'placeholder-shown',
    'read-only',
    'read-write',
    'required',
    'root',
    'scope',
    'target',
    'target-within',
    'user-invalid',
    'valid',
    'visited',
    // Logical Combinations
    'is',
    'where',
];

const pseudoElements = [
    'after',
    'before',
    'first-line',
    'selection',
    'placeholder',
    'marker',
    'backdrop',
    'cue',
    'part',
    'slotted'
]

module.exports = { parsePseudoClasses, parsePseudoElements }