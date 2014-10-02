/*
 * code.js
 *
 * Created by Aparajita Fishman.
 * Copyright 2014, Aparajita Fishman.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the MIT license (http://opensource.org/licenses/MIT).
 */

"use strict";

/* global describe */

var utils = require("./lib/utils");

var data = [
    ["@[] array literal", "should generate Objective-J code", "array-literal"],
    ["@protocol", "should generate objj_getProtocol calls", "@protocol"],
    ["@ref / @deref", "should generate a function for @ref, function calls for @deref, and correctly deal with pre- or post-increment/decrement", "reference"],
    ["@selector", "should generate sel_getUid calls", "@selector"],
    ["accessors", "should be generated according to attributes", "accessers"],
    ["class declaration", "should generate well-formatted and commented code for ivars, instance methods and class methods", "class-declaration"],
    ["message send", "should generate msgSend[N] calls and receiver temp vars in the proper scope", "message-send"],
    ["protocols", "should generate well-formatted and commented code", "protocols"],
];

describe("Code generation", function() {
    utils.makeDescribes(data, "code");
});