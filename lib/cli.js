/*
 * cli.j
 *
 * Created by Aparajita Fishman.
 * Copyright 2014, Aparajita Fishman.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the MIT license (http://opensource.org/licenses/MIT).
 */

"use strict";

var acorn = require("objj-acorn"),
    chalk = require("chalk"),
    compiler = require("../lib/compiler.js"),
    formats = require("../lib/formats.js"),
    fs = require("fs"),
    optionator = require("optionator"),
    path = require("path");

var inputFiles = [],
    options = {},
    acornOptions = { objj: true },
    silent = false,
    generateCode = true,
    outputPath = null,
    formatPath = null,
    useStdin = false;

var optionDefinitions = [
    { heading: chalk.cyan("Parser options") },
    {
        option: "macro",
        type: "String | [String]",
        description: "Defines a macro. The argument should be in the form <name>[(arg[, argN])]=<definition>. A name with no args and no definition will be defined with the value 1. To be safe from shell expansion, the argument should be enclosed in single quotes. To define multiple macros, enclose multiple comma-delimited, single-quoted strings in square brackets, all enclosed by double-quotes. \n\n" + chalk.cyan("Examples") + ":\n--macro 'PLUS_ONE(arg)=arg + 1'\n--macro \"['FOO(arg)=arg + 1', 'BAR(s)=\"\\\"foo\\\"\" + s', 'DEBUG']\""
    },
    {
        option: "prefix",
        type: "String",
        description: "Macro definitions are read from the file as this path and applied to all compiled files."
    },
    {
        option: "ecma3",
        type: "Boolean",
        description: "Tells the parser to parse ECMAScript 3."
    },
    {
        option: "ecma5",
        type: "Boolean",
        description: "Tells the parser to parse ECMAScript 5."
    },
    {
        option: "strict-semicolons",
        type: "Boolean",
        description: "Prevents the parser from doing automatic semicolon insertion (the default). Statements that do not end in semicolons will generate an error."
    },
    {
        option: "no-objj",
        type: "Boolean",
        description: "Turns off Objective-J syntax parsing and disables Objective-J code generation."
    },
    {
        option: "no-preprocess",
        type: "Boolean",
        description: "Turns off the preprocessor."
    },

    { heading: chalk.cyan("Code generation options") },
    {
        option: "output",
        type: "String",
        description: "Writes generated code to the given directory (if not using stdin) or file (if using stdin) instead of the console. When not using stdin, the output filenames are based on the input filename (excluding the extension)."
    },
    {
        option: "tab-indent",
        type: "String",
        description: "Tabs are used to indent code."
    },
    {
        option: "space-indent",
        type: "String",
        description: "Spaces (4 by default) are used to indent code. This is the default."
    },
    {
        option: "indent-width",
        type: "Int",
        description: "Sets the number of spaces to use for indenting. May not be used with --tab-indent."
    },
    {
        option: "source-map",
        type: "Boolean",
        description: "Generates a source map for use with browsers that support them."
    },
    {
        option: "source-map-only",
        type: "Boolean",
        description: "Only generates a source map for use with browsers that support them."
    },
    {
        option: "format",
        type: "String",
        description: "Format the generated code according to the given named format. If the name contains no path separators, then the named standard format is used. The .json extension may be omitted in this case. Otherwise the format file at the given path is used."
    },
    {
        option: "include-comments",
        type: "Boolean",
        description: "Comments in the source are included in the compiled code. May only be used in conjunction with --format."
    },
    {
        option: "include-comment-line-breaks",
        type: "Boolean",
        description: "Line breaks before comments are included in the compiled code. May only be used in conjunction with --format."
    },
    {
        option: "generate-objj",
        type: "Boolean",
        description: "By default, Objective-J source is converted into plain JavaScript code. Passing this option causes Objective-J code to be generated, which is useful if you want to beautify the original Objective-J source code. May only be used in conjunction with --format."
    },
    {
        option: "silent",
        type: "Boolean",
        description: "Suppress normal output. Error messages will still be output."
    },

    { heading: chalk.cyan("General options") },
    {
        option: "version",
        type: "Boolean",
        description: "Show the current version and exit."
    },
    {
        option: "help",
        type: "Boolean",
        description: "Show this help."
    },
    {
        option: "debug",
        type: "Boolean",
        description: "If set, a stack trace is displayed if the compiler throws."
    }
];

function formatErrorMessage(message)
{
    message = message.replace(
        /--\w[\w-]+/g, function(match)
        {
            return chalk.gray(match);
        }
    );

    return chalk.red("Error: ") + message;
}

function failWithMessage(message)
{
    throw new Error(formatErrorMessage(message));
}

function help(exitCode)
{
    var text = optionator.generateHelp({interpolate: {version: compiler.version}});

    text = text.replace(/--\w[\w-]+/g, function(match)
    {
        return chalk.gray(match);
    });

    console.log(text);
    process.exit(exitCode);
}

/*eslint-disable complexity */

function parseOptions()
{
    optionator = optionator({
        prepend: chalk.cyan("objjc v{{version}}") + "\n" + chalk.cyan("Usage") + ": objjc [options] file ...\n\nCompiles one or more files and outputs source code and/or a source map. If " + chalk.gray("file") + " is '-', reads from stdin.",

        helpStyle: {
            maxPadFactor: 2  // Give a little more padding to the name column
        },

        options: optionDefinitions,

        mutuallyExclusive: [
            ["ecma3", "ecma5"],
            ["tab-indent", "space-indent"],
            ["tab-indent", "indent-width"],
            ["source-map", "source-map-only"]
        ]
    });

    options = optionator.parse(process.argv);

    if (options.version)
    {
        console.log("objjc v" + compiler.version);
        process.exit(0);
    }
    else if (options.help)
        help(0);

    inputFiles = options._;

    if (options.ecma3)
        acornOptions.ecmaVersion = 3;
    else if (options.ecma5)
        acornOptions.ecmaVersion = 5;

    if (options.strictSemicolons)
        acornOptions.strictSemicolons = true;

    if (options.macro)
    {
        if (Array.isArray(options.macro))
            acornOptions.macros = options.macro;
        else
            acornOptions.macros = [options.macro];
    }
    else
        acornOptions.macros = [];

    if (options.noObjj)
        acornOptions.objj = false;

    if (options.noPreprocess)
        acornOptions.preprocess = false;

    if (options.output)
        outputPath = options.output;

    if (options.tabIndent)
    {
        options.indentString = "\t";
        options.indentWidth = 1;
    }
    else
        options.indentString = " ";

    if (options.sourceMapOnly)
        generateCode = false;

    if (options.format)
        formatPath = options.format;

    if (options.includeComments)
        acornOptions.trackComments = true;

    if (options.includeCommentLineBreaks)
        acornOptions.trackCommentsIncludeLineBreak = true;

    options.generateObjJ = !!options.generateObjj;
    silent = !!options.silent;

    if (inputFiles.indexOf("-") >= 0)
    {
        useStdin = true;
        inputFiles = [];
    }

    if (inputFiles.length === 0 && !useStdin)
        failWithMessage("One or more input files must be specified.");

    if (options.includeComments && !options.format)
        failWithMessage("--include-comments may only be used in conjunction with --format.");

    if (options.generateObjJ && !formatPath)
        failWithMessage("--generate-objj may only be used in conjunction with --format.");

    if (acornOptions.trackCommentsIncludeLineBreak && (!options.format || !options.includeComments))
        failWithMessage("--include-comment-line-breaks may only be used in conjunction with --include-line-breaks and --format.\n");

    if (options.sourceMap && useStdin)
        failWithMessage("--sourceMap may not be used with stdin.");

    options.acornOptions = acornOptions;
}

/*eslint-enable complexity */

function makeOutputDir()
{
    outputPath = path.resolve(outputPath);

    var targetDir = useStdin ? path.dirname(outputPath) : outputPath;

    if (!fs.existsSync(targetDir))
        fs.mkdir(targetDir);
    else if (!fs.statSync(targetDir).isDirectory())
        throw new Error("'" + targetDir + "' is not a directory");
}

function readPrefix(options)
{
    var prefixPath = path.resolve(options.prefix);

    if (!fs.existsSync(prefixPath) || !fs.statSync(prefixPath).isFile())
        throw new Error("No such prefix file: '" + options.prefix + "'");

    var prefix = fs.readFileSync(prefixPath, "utf8"),
        prefixOptions = {objj: true};

    prefixOptions.sourceFile = path;

    if (options.sourceMap)
        prefixOptions.locations = true;

    // We never want (line:column) in the error messages
    prefixOptions.lineNoInErrorMessage = false;

    acorn.parse(prefix, prefixOptions);
    options.acornOptions.macros.push.apply(options.acornOptions.macros, acorn.getMacros());
}

function generate(sourceFile, compiled)
{
    if (!silent && !outputPath)
    {
        if (generateCode)
            console.log(compiled.code());

        if (options.sourceMap)
            console.log(compiled.map());
    }
    else if (outputPath)
    {
        if (useStdin)
            sourceFile = outputPath;

        var baseFilename = path.basename(sourceFile, path.extname(sourceFile)),
            targetPath;

        if (useStdin)
            targetPath = path.join(path.dirname(outputPath), baseFilename);
        else
            targetPath = path.join(outputPath, baseFilename);

        var filePath = targetPath + ".js";

        if (generateCode)
            fs.writeFileSync(filePath, compiled.code());

        if (options.sourceMap)
            fs.writeFileSync(targetPath + ".map", compiled.map());
    }
}

function showWarnings(warnings)
{
    for (var i = 0; i < warnings.length; i++)
        console.warn(warnings[i].message);
}

function main(source)
{
    if (formatPath)
        options.format = formats.load(formatPath);

    if (outputPath)
        makeOutputDir();

    if (options.prefix)
        readPrefix(options);

    var count = inputFiles.length || 1;

    for (var i = 0; i < count; i++)
    {
        var sourcePath;

        if (source === null)
        {
            sourcePath = path.resolve(inputFiles[i]);
            source = fs.readFileSync(sourcePath, "utf8");
        }
        else
            sourcePath = "<stdin>";

        var compiled = compiler.compile(source, sourcePath, options);
        generate(sourcePath, compiled);
        showWarnings(compiled.warnings, source);
        source = null;
    }
}

exports.run = function()
{
    try
    {
        parseOptions();

        if (useStdin)
        {
            var source = "";

            process.stdin.resume();
            process.stdin.setEncoding("utf8");

            process.stdin.on(
                "data", function (chunk)
                {
                    source += chunk;
                }
            );

            process.stdin.on(
                "end", function ()
                {
                    main(source);
                }
            );
        }
        else
            main(null);
    }
    catch (ex)
    {
        console.log(formatErrorMessage(ex.message));

        if (options.debug)
            throw ex;

        process.exit(1);
    }
};